from __future__ import annotations

from contextlib import contextmanager

import httpx
import pytest

from byr_auth import AuthContext, AuthError, SessionInfo
from byr_threads.service import ThreadService


THREAD_HTML = """
<html>
  <body>
    <div class="b-head corner"><span class="n-left">文章主题:&ensp;测试帖子</span></div>
    <div class="t-pre">
      <div class="page">
        <ul class="pagination">
          <li class="page-pre">贴数:<i>1</i>&emsp;分页:</li>
          <li><ol class="page-main"><li class="page-select"><a title="当前页">1</a></li></ol></li>
        </ul>
      </div>
    </div>
    <div class="b-content">
      <table class="article">
        <tr class="a-head">
          <td class="a-left"><span class="a-u-name">IWhisper#3</span></td>
          <td>
            <ul class="a-func"><li><a class="a-post" href="/article/IWhisper/post/123">回复</a></li></ul>
            <span class="a-pos">楼主</span>
          </td>
        </tr>
        <tr class="a-body">
          <td></td>
          <td class="a-content"><div class="a-content-wrap">
发信人: IWhisper#3 (test), 信区: IWhisper
标  题: 测试帖子
发信站: 北邮人论坛 (Fri Apr 25 18:07:24 2026), 站内

正文
--
          </div></td>
        </tr>
      </table>
    </div>
  </body>
</html>
"""


class FakeAuthClient:
    def __init__(self, handler) -> None:
        self.last_force_relogin: bool | None = None
        self.client = httpx.Client(
            base_url="https://bbs.byr.cn",
            transport=httpx.MockTransport(handler),
        )
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


def test_fetch_page_rejects_empty_article_id() -> None:
    service = ThreadService()

    with pytest.raises(AuthError, match="Article ID must not be empty"):
        service.fetch_page(article_id="  ")


def test_fetch_page_rejects_invalid_page() -> None:
    service = ThreadService()

    with pytest.raises(AuthError, match="Page must be greater than or equal to 1"):
        service.fetch_page(article_id="123", page=0)


def test_fetch_page_uses_thread_endpoint_and_parses_response() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/article/IWhisper/123"
        assert request.url.params["p"] == "2"
        assert request.url.params["_uid"] == "42"
        return httpx.Response(
            200,
            content=THREAD_HTML.encode("gbk"),
            headers={"content-type": "text/html; charset=gbk"},
            request=request,
        )

    auth_client = FakeAuthClient(handler)
    service = ThreadService(auth_client)

    result = service.fetch_page(article_id="123", page=2, force_relogin=True)

    assert auth_client.last_force_relogin is True
    assert result.article_id == "123"
    assert result.page == 2
    assert result.user_id == "42"
    assert result.thread_title == "测试帖子"
    assert result.post_count == 1
    assert result.total_pages == 1
    assert len(result.posts) == 1
    assert result.posts[0].post_id == "123"
    assert result.posts[0].anonymous_id == 3
    assert result.posts[0].body == "正文"


def test_decode_text_respects_response_encoding() -> None:
    request = httpx.Request("GET", "https://bbs.byr.cn/article/IWhisper/123")
    response = httpx.Response(
        200,
        content="悄悄话".encode("gbk"),
        request=request,
    )
    response.encoding = "gbk"

    assert ThreadService._decode_text(response) == "悄悄话"


def test_decode_text_falls_back_when_response_encoding_is_wrong() -> None:
    request = httpx.Request("GET", "https://bbs.byr.cn/article/IWhisper/123")
    response = httpx.Response(
        200,
        content="悄悄话".encode("utf-8"),
        request=request,
    )
    response.encoding = "gbk"

    assert ThreadService._decode_text(response) == "悄悄话"


def test_decode_text_preserves_gbk_page_when_one_byte_is_invalid() -> None:
    request = httpx.Request("GET", "https://bbs.byr.cn/article/Xyq/23955")
    response = httpx.Response(
        200,
        content="楼主".encode("gbk") + b"\xa3 " + "正文".encode("gbk"),
        request=request,
    )
    response.encoding = "gbk"

    assert ThreadService._decode_text(response) == "楼主� 正文"
