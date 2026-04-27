from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
from dotenv import dotenv_values

BASE_URL = "https://bbs.byr.cn"
LOGIN_ENDPOINT = "/user/ajax_login.json"
SESSION_ENDPOINT = "/user/ajax_session.json"
DEFAULT_TIMEOUT = 20.0
DEFAULT_HEADERS = {
    "Referer": "https://bbs.byr.cn/#!login",
    "X-Requested-With": "XMLHttpRequest",
}


class AuthError(RuntimeError):
    """Raised when authentication state cannot be established."""


@dataclass(slots=True)
class SessionInfo:
    raw: dict[str, Any]

    @property
    def is_login(self) -> bool:
        return bool(self.raw.get("is_login"))

    @property
    def user_id(self) -> str:
        return str(self.raw.get("id") or "")

    def to_dict(self) -> dict[str, Any]:
        return dict(self.raw)


@dataclass(slots=True)
class LoginResult:
    reused_cookies: bool
    session: SessionInfo
    cookies: list[dict[str, Any]]
    cookie_file: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "reused_cookies": self.reused_cookies,
            "session": self.session.to_dict(),
            "cookies": self.cookies,
            "cookie_file": self.cookie_file,
        }


class CookieStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> httpx.Cookies:
        cookies = httpx.Cookies()
        if not self.path.exists():
            return cookies

        payload = json.loads(self.path.read_text(encoding="utf-8"))
        for item in payload.get("cookies", []):
            cookies.set(
                item["name"],
                item["value"],
                domain=item.get("domain"),
                path=item.get("path", "/"),
            )
        return cookies

    def save(self, cookies: httpx.Cookies) -> list[dict[str, Any]]:
        serialized = self.serialize(cookies)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps({"cookies": serialized}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return serialized

    @staticmethod
    def serialize(cookies: httpx.Cookies) -> list[dict[str, Any]]:
        serialized: list[dict[str, Any]] = []
        for cookie in cookies.jar:
            serialized.append(
                {
                    "name": cookie.name,
                    "value": cookie.value,
                    "domain": cookie.domain,
                    "path": cookie.path,
                    "secure": cookie.secure,
                    "expires": cookie.expires,
                }
            )
        return serialized


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
        with self._open_client() as client:
            session = self._fetch_session_info(client)
            if session.is_login and not force_relogin:
                cookies = self.cookie_store.save(client.cookies)
                return LoginResult(
                    reused_cookies=True,
                    session=session,
                    cookies=cookies,
                    cookie_file=str(self.cookie_path),
                )

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

            cookies = self.cookie_store.save(client.cookies)
            return LoginResult(
                reused_cookies=False,
                session=login_session,
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

    def _require_env(self, key: str) -> str:
        value = os.getenv(key) or self.env.get(key)
        if not value:
            raise AuthError(f"Missing required environment variable: {key}")
        return str(value)

    @staticmethod
    def _parse_json(response: httpx.Response) -> dict[str, Any]:
        encoding = response.encoding or "utf-8"
        return json.loads(response.content.decode(encoding))
