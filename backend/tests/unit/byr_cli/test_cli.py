from __future__ import annotations

import byr_cli


class FakeCache:
    def __init__(self, *, deleted_keys: int = 3, cleared_keys: int = 9) -> None:
        self.deleted_keys = deleted_keys
        self.cleared_keys = cleared_keys
        self.board_name: str | None = None
        self.clear_database_called = False

    def clear_thread_progress(self, *, board_name: str | None = None) -> int:
        self.board_name = board_name
        return self.deleted_keys

    def clear_database(self) -> int:
        self.clear_database_called = True
        return self.cleared_keys


def test_clear_sync_cache_returns_prefix_result() -> None:
    result = byr_cli.clear_sync_cache(cache=FakeCache())

    assert result == {
        "scope": "thread_progress",
        "pattern": "sync:thread:*",
        "deleted_keys": 3,
    }


def test_clear_sync_cache_can_scope_to_one_board() -> None:
    fake_cache = FakeCache()

    result = byr_cli.clear_sync_cache(
        cache=fake_cache,
        board_name="IWhisper",
    )

    assert result == {
        "scope": "thread_progress",
        "pattern": "sync:thread:IWhisper:*",
        "board_name": "IWhisper",
        "deleted_keys": 3,
    }
    assert fake_cache.board_name == "IWhisper"


def test_clear_sync_cache_can_flush_current_database() -> None:
    fake_cache = FakeCache()

    result = byr_cli.clear_sync_cache(
        cache=fake_cache,
        clear_all=True,
    )

    assert result == {
        "scope": "database",
        "deleted_keys": 9,
    }
    assert fake_cache.clear_database_called is True
