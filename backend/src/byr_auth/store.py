from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx


class CookieStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def load(self) -> httpx.Cookies:
        cookies = httpx.Cookies()
        if not self.path.exists():
            return cookies

        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return cookies
        if not isinstance(payload, dict):
            return cookies

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
