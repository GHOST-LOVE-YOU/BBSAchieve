from __future__ import annotations

from byr_sync import InMemorySyncCache, THREAD_TTL_SECONDS
from byr_sync.service import SyncService


class FakeBoardService:
    def __init__(self, threads: list[object]) -> None:
        self.threads = threads
        self.calls: list[dict[str, object]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> object:
        self.calls.append({"board_name": board_name, "page": page})
        return type("BoardPage", (), {"threads": self.threads})()


class FakeThreadService:
    pass


def test_save_thread_progress_sets_three_day_ttl() -> None:
    cache = InMemorySyncCache()
    recent_post_ids = ["p1", "p2"]

    progress = cache.save_thread_progress(
        board_name="test_board",
        article_id="123",
        reply_count=7,
        recent_post_ids=recent_post_ids,
    )

    assert progress.reply_count == 7
    assert progress.ttl_seconds == THREAD_TTL_SECONDS
    assert progress.article_id == "123"
    assert cache.thread_progress["test_board:123"] is progress
    assert progress.recent_post_ids == ["p1", "p2"]

    recent_post_ids.append("p3")

    assert progress.recent_post_ids == ["p1", "p2"]


def test_list_updates_returns_changed_threads() -> None:
    thread = type("Thread", (), {"article_id": "123", "title": "First thread", "reply_count": 4})()
    board_service = FakeBoardService([thread])
    cache = InMemorySyncCache()
    service = SyncService(
        board_service=board_service,
        thread_service=FakeThreadService(),
        cache=cache,
    )

    result = service.list_updates(board_name="test_board", limit=1)

    assert result.board_name == "test_board"
    assert result.threads[0].article_id == "123"
    assert result.threads[0].title == "First thread"
    assert result.threads[0].reply_count == 4
    assert cache.thread_progress["test_board:123"].reply_count == 4
    assert board_service.calls == [{"board_name": "test_board", "page": 1}]
