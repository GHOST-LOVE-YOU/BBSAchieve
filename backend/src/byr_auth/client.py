from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
import json
import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import dotenv_values

from .encoding import decode_response_text
from .models import AuthContext, AuthError, LoginResult, SessionInfo
from .store import CookieStore

BASE_URL = "https://bbs.byr.cn"
LOGIN_ENDPOINT = "/user/ajax_login.json"
SESSION_ENDPOINT = "/user/ajax_session.json"
DEFAULT_TIMEOUT = 20.0
DEFAULT_HEADERS = {
    "Referer": "https://bbs.byr.cn/#!login",
    "X-Requested-With": "XMLHttpRequest",
}


class ByrAuthClient:
    def __init__(
        self,
        *,
        root_dir: Path | None = None,
        env_path: Path | None = None,
        cookie_path: Path | None = None,
    ) -> None:
        self.root_dir = root_dir or Path(__file__).resolve().parents[2]
        self.env_path = env_path or self.root_dir / ".env"
        self.cookie_path = cookie_path or self.root_dir / ".state" / "byr_cookies.json"
        self.env = dotenv_values(self.env_path)
        self.cookie_store = CookieStore(self.cookie_path)

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
        session = self._fetch_session_info(client)
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
        return login_session, False

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
            raise AuthError(
                "Expected JSON response from "
                f"{response.request.url} "
                f"(status={response.status_code}, content_type={content_type}, body={preview!r})"
            ) from exc

    @staticmethod
    def _decode_text(response: httpx.Response) -> str:
        return decode_response_text(response)
