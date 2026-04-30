from __future__ import annotations

import httpx

from byr_auth.store import CookieStore


def test_save_and_load_round_trip(tmp_path) -> None:
    path = tmp_path / "state" / "cookies.json"
    store = CookieStore(path)
    cookies = httpx.Cookies()
    cookies.set("utmpkey", "value-1", domain="bbs.byr.cn", path="/")
    cookies.set("utmpnum", "value-2", domain="bbs.byr.cn", path="/user")

    serialized = store.save(cookies)
    loaded = store.load()

    assert path.exists()
    assert serialized == [
        {
            "name": "utmpkey",
            "value": "value-1",
            "domain": "bbs.byr.cn",
            "path": "/",
            "secure": False,
            "expires": None,
        },
        {
            "name": "utmpnum",
            "value": "value-2",
            "domain": "bbs.byr.cn",
            "path": "/user",
            "secure": False,
            "expires": None,
        },
    ]
    assert loaded.get("utmpkey", domain="bbs.byr.cn", path="/") == "value-1"
    assert loaded.get("utmpnum", domain="bbs.byr.cn", path="/user") == "value-2"


def test_load_returns_empty_when_file_is_missing(tmp_path) -> None:
    store = CookieStore(tmp_path / "missing.json")

    cookies = store.load()

    assert list(cookies.jar) == []

