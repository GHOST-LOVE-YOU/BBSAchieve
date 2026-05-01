from __future__ import annotations

from dataclasses import dataclass

from byr_sync import InMemorySyncCache, THREAD_TTL_SECONDS
from byr_sync.service import SyncService


@dataclass(slots=True)
class FakeThread:
    article_id: str
    title: str
    reply_count: int | None


@dataclass(slots=True)
class FakeBoardPage:
    threads: list[FakeThread]


class FakeBoardService:
    def __init__(self, threads: list[FakeThread]) -> None:
        self.threads = threads
        self.calls: list[tuple[str, int]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> FakeBoardPage:
        self.calls.append((board_name, page))
        return FakeBoardPage(threads=self.threads)


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
    assert cache.get_thread_progress(board_name="test_board", article_id="123") is progress
    assert progress.recent_post_ids == ["p1", "p2"]

    recent_post_ids.append("p3")

    assert progress.recent_post_ids == ["p1", "p2"]
    assert cache.get_thread_progress(board_name="test_board", article_id="123") is progress


def test_list_updates_returns_changed_threads() -> None:
    thread = FakeThread(article_id="123", title="First thread", reply_count=4)
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
    assert cache.get_thread_progress(board_name="test_board", article_id="123").reply_count == 4
    assert board_service.calls == [("test_board", 1)]


def test_list_updates_normalizes_missing_reply_count_to_zero() -> None:
    thread = FakeThread(article_id="123", title="Missing count", reply_count=None)
    board_service = FakeBoardService([thread])
    cache = InMemorySyncCache()
    service = SyncService(
        board_service=board_service,
        thread_service=FakeThreadService(),
        cache=cache,
    )

    result = service.list_updates(board_name="test_board", limit=1)

    assert result.threads[0].reply_count == 0
    assert cache.get_thread_progress(board_name="test_board", article_id="123").reply_count == 0
