from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


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


@dataclass(slots=True)
class AuthContext:
    client: httpx.Client
    session: SessionInfo
    reused_cookies: bool
