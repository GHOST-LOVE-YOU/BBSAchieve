from __future__ import annotations

import httpx
import pytest

from byr_auth.client import ByrAuthClient
from byr_auth.models import AuthError


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
