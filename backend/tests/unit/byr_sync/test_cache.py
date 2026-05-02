from __future__ import annotations

import fnmatch

from byr_sync.cache import RedisSyncCache, load_sync_redis_url


class FakeRedis:
    def __init__(self, keys: list[str]) -> None:
        self.data = {key: {} for key in keys}
        self.flushdb_called = False

    def scan_iter(self, *, match: str):
        for key in sorted(self.data):
            if fnmatch.fnmatch(key, match):
                yield key

    def delete(self, *keys: str) -> int:
        deleted = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                deleted += 1
        return deleted

    def dbsize(self) -> int:
        return len(self.data)

    def flushdb(self) -> bool:
        self.flushdb_called = True
        self.data.clear()
        return True


def test_load_sync_redis_url_reads_from_env_file(tmp_path, monkeypatch) -> None:
    monkeypatch.delenv("BYR_SYNC_REDIS_URL", raising=False)
    (tmp_path / ".env").write_text(
        "BYR_SYNC_REDIS_URL=redis://127.0.0.1:6380/3\n",
        encoding="utf-8",
    )

    assert load_sync_redis_url(root_dir=tmp_path) == "redis://127.0.0.1:6380/3"


def test_clear_thread_progress_deletes_only_sync_keys() -> None:
    redis_client = FakeRedis(
        [
            "sync:thread:IWhisper:1",
            "sync:thread:IWhisper:2",
            "other:key",
        ]
    )
    cache = RedisSyncCache(redis_client)

    deleted_keys = cache.clear_thread_progress()

    assert deleted_keys == 2
    assert sorted(redis_client.data) == ["other:key"]


def test_clear_thread_progress_can_scope_to_one_board() -> None:
    redis_client = FakeRedis(
        [
            "sync:thread:IWhisper:1",
            "sync:thread:Job:2",
            "sync:thread:Job:3",
        ]
    )
    cache = RedisSyncCache(redis_client)

    deleted_keys = cache.clear_thread_progress(board_name="Job")

    assert deleted_keys == 2
    assert sorted(redis_client.data) == ["sync:thread:IWhisper:1"]


def test_clear_database_flushes_current_db() -> None:
    redis_client = FakeRedis(
        [
            "sync:thread:IWhisper:1",
            "other:key",
        ]
    )
    cache = RedisSyncCache(redis_client)

    deleted_keys = cache.clear_database()

    assert deleted_keys == 2
    assert redis_client.flushdb_called is True
    assert redis_client.data == {}
