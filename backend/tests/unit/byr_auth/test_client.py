from __future__ import annotations

import httpx
import pytest

from byr_auth.client import ByrAuthClient
from byr_auth.models import AuthError, AuthRateLimitError


def make_response(
    *,
    content: bytes,
    encoding: str | None = "utf-8",
    url: str = "https://bbs.byr.cn/mock",
) -> httpx.Response:
    request = httpx.Request("GET", url)
    response = httpx.Response(200, content=content, request=request)
    response.encoding = encoding
    return response


def test_parse_json_uses_response_encoding() -> None:
    response = make_response(
        content='{"ajax_msg":"登录成功"}'.encode("gbk"),
        encoding="gbk",
    )

    payload = ByrAuthClient._parse_json(response)

    assert payload["ajax_msg"] == "登录成功"


def test_parse_json_falls_back_when_response_encoding_is_wrong() -> None:
    response = make_response(
        content='{"ajax_msg":"登录成功"}'.encode("gbk"),
        encoding="utf-8",
    )

    payload = ByrAuthClient._parse_json(response)

    assert payload["ajax_msg"] == "登录成功"


def test_parse_json_falls_back_when_response_encoding_is_invalid() -> None:
    response = make_response(
        content='{"ajax_msg":"登录成功"}'.encode("gbk"),
        encoding="definitely-not-a-real-codec",
    )

    payload = ByrAuthClient._parse_json(response)

    assert payload["ajax_msg"] == "登录成功"


def test_parse_json_raises_auth_error_for_non_json_response() -> None:
    response = make_response(
        content=b"<html><title>blocked</title></html>",
        url="https://bbs.byr.cn/user/ajax_session.json",
    )

    with pytest.raises(AuthError, match="Expected JSON response"):
        ByrAuthClient._parse_json(response)


def test_parse_json_raises_rate_limit_error_for_frequent_login_response() -> None:
    response = make_response(
        content="请勿频繁登录".encode("utf-8"),
        url="https://bbs.byr.cn/user/ajax_session.json",
    )

    with pytest.raises(AuthRateLimitError, match="BYR authentication is rate limited"):
        ByrAuthClient._parse_json(response)


def test_ensure_session_retries_after_auth_rate_limit(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    calls = 0
    sleeps: list[float] = []

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls == 1:
            return httpx.Response(
                200,
                content="请勿频繁登录".encode("utf-8"),
                headers={"content-type": "text/html; charset=UTF-8"},
                request=request,
            )
        return httpx.Response(
            200,
            json={"is_login": 1, "id": "test-user"},
            request=request,
        )

    client = ByrAuthClient(
        root_dir=tmp_path,
        env_path=tmp_path / ".env",
        cookie_path=tmp_path / "c.json",
        sleep=sleeps.append,
        auth_rate_limit_retry_seconds=7,
    )
    monkeypatch.setattr(
        client,
        "_open_client",
        lambda: httpx.Client(
            base_url="https://bbs.byr.cn",
            transport=httpx.MockTransport(handler),
        ),
    )

    result = client.ensure_login()

    assert result.session.is_login is True
    assert calls == 2
    assert sleeps == [7]


def test_auth_rate_limit_default_allows_many_retries(tmp_path) -> None:
    client = ByrAuthClient(
        root_dir=tmp_path,
        env_path=tmp_path / ".env",
        cookie_path=tmp_path / "c.json",
    )

    assert client.auth_rate_limit_max_retries == 100


def test_ensure_session_reuses_recent_session_without_checking_status(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    calls = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return httpx.Response(
            200,
            json={"is_login": 1, "id": "test-user"},
            request=request,
        )

    client = ByrAuthClient(
        root_dir=tmp_path,
        env_path=tmp_path / ".env",
        cookie_path=tmp_path / "c.json",
        session_check_cooldown_seconds=300,
    )
    monkeypatch.setattr(
        client,
        "_open_client",
        lambda: httpx.Client(
            base_url="https://bbs.byr.cn",
            transport=httpx.MockTransport(handler),
        ),
    )

    first = client.ensure_login()
    second = client.ensure_login()

    assert first.session.is_login is True
    assert second.session.is_login is True
    assert calls == 1


def test_require_env_reads_from_loaded_env(tmp_path) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text("BBS_USERNAME=test-user\n", encoding="utf-8")
    client = ByrAuthClient(
        root_dir=tmp_path,
        env_path=env_path,
        cookie_path=tmp_path / "c.json",
    )

    assert client._require_env("BBS_USERNAME") == "test-user"


def test_require_env_raises_when_missing(tmp_path) -> None:
    client = ByrAuthClient(
        root_dir=tmp_path,
        env_path=tmp_path / ".env",
        cookie_path=tmp_path / "c.json",
    )

    with pytest.raises(AuthError, match="Missing required environment variable: BBS_PASSWORD"):
        client._require_env("BBS_PASSWORD")
