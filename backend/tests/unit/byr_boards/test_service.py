from __future__ import annotations

from contextlib import contextmanager

import httpx
import pytest

from byr_auth import AuthContext, AuthError, SessionInfo
from byr_boards.service import BoardService


class FakeAuthClient:
    def __init__(self) -> None:
        self.last_force_relogin: bool | None = None
        self.client = httpx.Client()
        self.session = SessionInfo({"is_login": 1, "id": 42})

    @contextmanager
    def open_authenticated_client(self, *, force_relogin: bool = False):
        self.last_force_relogin = force_relogin
        try:
            yield AuthContext(
                client=self.client,
                session=self.session,
                reused_cookies=True,
            )
        finally:
            self.client.close()


def test_fetch_page_rejects_invalid_page() -> None:
    service = BoardService()

    with pytest.raises(AuthError, match="Page must be greater than or equal to 1"):
        service.fetch_page(page=0)


def test_decode_text_respects_response_encoding() -> None:
    request = httpx.Request("GET", "https://bbs.byr.cn/board/IWhisper")
    response = httpx.Response(
        200,
        content="悄悄话".encode("gbk"),
        request=request,
    )
    response.encoding = "gbk"

    assert BoardService._decode_text(response) == "悄悄话"
