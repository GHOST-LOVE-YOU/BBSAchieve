from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
import json
import os
from pathlib import Path
import time
from typing import Any

import httpx
from dotenv import dotenv_values

from .encoding import decode_response_text
from .models import AuthContext, AuthError, AuthRateLimitError, LoginResult, SessionInfo
from .store import CookieStore

BASE_URL = "https://bbs.byr.cn"
LOGIN_ENDPOINT = "/user/ajax_login.json"
SESSION_ENDPOINT = "/user/ajax_session.json"
DEFAULT_TIMEOUT = 20.0
DEFAULT_HEADERS = {
    "Referer": "https://bbs.byr.cn/#!login",
    "X-Requested-With": "XMLHttpRequest",
}
DEFAULT_SESSION_CHECK_COOLDOWN_SECONDS = 120.0
DEFAULT_AUTH_RATE_LIMIT_RETRY_SECONDS = 300.0
DEFAULT_AUTH_RATE_LIMIT_MAX_RETRIES = 100


class ByrAuthClient:
    def __init__(
        self,
        *,
        root_dir: Path | None = None,
        env_path: Path | None = None,
        cookie_path: Path | None = None,
        sleep: Any | None = None,
        session_check_cooldown_seconds: float | None = None,
        auth_rate_limit_retry_seconds: float | None = None,
        auth_rate_limit_max_retries: int | None = None,
    ) -> None:
        self.root_dir = root_dir or Path(__file__).resolve().parents[2]
        self.env_path = env_path or self.root_dir / ".env"
        self.cookie_path = cookie_path or self.root_dir / ".state" / "byr_cookies.json"
        self.env = dotenv_values(self.env_path)
        self.cookie_store = CookieStore(self.cookie_path)
        self.sleep = sleep or time.sleep
        self.session_check_cooldown_seconds = (
            DEFAULT_SESSION_CHECK_COOLDOWN_SECONDS
            if session_check_cooldown_seconds is None
            else session_check_cooldown_seconds
        )
        self.auth_rate_limit_retry_seconds = (
            DEFAULT_AUTH_RATE_LIMIT_RETRY_SECONDS
            if auth_rate_limit_retry_seconds is None
            else auth_rate_limit_retry_seconds
        )
        self.auth_rate_limit_max_retries = (
            DEFAULT_AUTH_RATE_LIMIT_MAX_RETRIES
            if auth_rate_limit_max_retries is None
            else auth_rate_limit_max_retries
        )
        self._cached_session: SessionInfo | None = None
        self._cached_session_checked_at: float | None = None

    def check_status(self) -> LoginResult:
        with self._open_client() as client:
            session = self._fetch_session_info(client)
            cookies = self.cookie_store.save(client.cookies)
            return LoginResult(
                reused_cookies=session.is_login,
                session=session,
                cookies=cookies,
                cookie_file=str(self.cookie_path),
            )

    def ensure_login(self, *, force_relogin: bool = False) -> LoginResult:
        with self.open_authenticated_client(
            force_relogin=force_relogin
        ) as auth_context:
            cookies = self.cookie_store.serialize(auth_context.client.cookies)
            return LoginResult(
                reused_cookies=auth_context.reused_cookies,
                session=auth_context.session,
                cookies=cookies,
                cookie_file=str(self.cookie_path),
            )

    def _open_client(self) -> httpx.Client:
        return httpx.Client(
            base_url=BASE_URL,
            timeout=DEFAULT_TIMEOUT,
            headers=DEFAULT_HEADERS,
            follow_redirects=True,
            cookies=self.cookie_store.load(),
        )

    def _fetch_session_info(self, client: httpx.Client) -> SessionInfo:
        response = client.get(SESSION_ENDPOINT)
        response.raise_for_status()
        payload = self._parse_json(response)
        if not isinstance(payload, dict):
            raise AuthError("Unexpected session payload")
        return SessionInfo(payload)

    @contextmanager
    def open_authenticated_client(
        self,
        *,
        force_relogin: bool = False,
    ) -> Iterator[AuthContext]:
        with self._open_client() as client:
            session, reused_cookies = self._ensure_session(
                client,
                force_relogin=force_relogin,
            )
            try:
                yield AuthContext(
                    client=client,
                    session=session,
                    reused_cookies=reused_cookies,
                )
            finally:
                self.cookie_store.save(client.cookies)

    def _ensure_session(
        self,
        client: httpx.Client,
        *,
        force_relogin: bool = False,
    ) -> tuple[SessionInfo, bool]:
        cached_session = self._get_recent_cached_session(force_relogin=force_relogin)
        if cached_session is not None:
            return cached_session, True

        session = self._fetch_session_info_with_retry(client)
        self._remember_session(session)
        if session.is_login and not force_relogin:
            return session, True

        username = self._require_env("BBS_USERNAME")
        password = self._require_env("BBS_PASSWORD")

        response = client.post(
            LOGIN_ENDPOINT,
            data={"id": username, "passwd": password, "CookieDate": "2"},
        )
        response.raise_for_status()

        payload = self._parse_json(response)
        login_session = SessionInfo(payload)
        if not login_session.is_login or int(payload.get("ajax_st", 0)) != 1:
            raise AuthError(payload.get("ajax_msg", "Login failed"))
        self._remember_session(login_session)
        return login_session, False

    def _fetch_session_info_with_retry(self, client: httpx.Client) -> SessionInfo:
        for attempt in range(self.auth_rate_limit_max_retries + 1):
            try:
                return self._fetch_session_info(client)
            except AuthRateLimitError:
                if attempt >= self.auth_rate_limit_max_retries:
                    raise
                self.sleep(self.auth_rate_limit_retry_seconds)
        raise AuthError("Unable to fetch session info")

    def _get_recent_cached_session(self, *, force_relogin: bool) -> SessionInfo | None:
        if force_relogin or self._cached_session is None or not self._cached_session.is_login:
            return None
        if self.session_check_cooldown_seconds <= 0:
            return None
        checked_at = self._cached_session_checked_at
        if checked_at is None:
            return None
        if time.monotonic() - checked_at > self.session_check_cooldown_seconds:
            return None
        return self._cached_session

    def _remember_session(self, session: SessionInfo) -> None:
        if session.is_login:
            self._cached_session = session
            self._cached_session_checked_at = time.monotonic()

    def _require_env(self, key: str) -> str:
        value = os.getenv(key) or self.env.get(key)
        if not value:
            raise AuthError(f"Missing required environment variable: {key}")
        return str(value)

    @staticmethod
    def _parse_json(response: httpx.Response) -> dict[str, Any]:
        text = ByrAuthClient._decode_text(response)
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            content_type = response.headers.get("content-type", "unknown")
            preview = text.strip().replace("\n", " ")[:120] or "<empty>"
            if "请勿频繁登录" in preview:
                raise AuthRateLimitError(
                    "BYR authentication is rate limited: 请勿频繁登录"
                ) from exc
            raise AuthError(
                "Expected JSON response from "
                f"{response.request.url} "
                f"(status={response.status_code}, content_type={content_type}, body={preview!r})"
            ) from exc

    @staticmethod
    def _decode_text(response: httpx.Response) -> str:
        return decode_response_text(response)
