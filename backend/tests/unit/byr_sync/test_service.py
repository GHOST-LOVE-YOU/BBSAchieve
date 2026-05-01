from __future__ import annotations

from dataclasses import dataclass

import pytest

from byr_sync import InMemorySyncCache, THREAD_TTL_SECONDS
from byr_sync.models import SyncPost
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


@dataclass(slots=True)
class FakeThreadPost:
    post_id: str
    floor_label: str
    author_display_name: str
    body: str


@dataclass(slots=True)
class FakeThreadPage:
    posts: list[FakeThreadPost]


class FakeThreadService:
    def __init__(self, thread_page: FakeThreadPage | None = None) -> None:
        self.thread_page = thread_page or FakeThreadPage(posts=[])
        self.calls: list[tuple[str, str, int]] = []

    def fetch_page(
        self,
        *,
        board_name: str,
        article_id: str,
        page: int = 1,
    ) -> FakeThreadPage:
        self.calls.append((board_name, article_id, page))
        return self.thread_page


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


def test_list_updates_includes_new_posts_after_cached_reply_count() -> None:
    thread = FakeThread(article_id="123", title="First thread", reply_count=24)
    thread_page = FakeThreadPage(
        posts=[
            FakeThreadPost(
                post_id="p24",
                floor_label="24楼",
                author_display_name="alice",
                body="new reply",
            )
        ]
    )
    board_service = FakeBoardService([thread])
    thread_service = FakeThreadService(thread_page=thread_page)
    cache = InMemorySyncCache()
    cache.save_thread_progress(
        board_name="test_board",
        article_id="123",
        reply_count=23,
    )
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
    )

    result = service.list_updates(board_name="test_board", limit=1)

    assert result.threads[0].posts[0].post_id == "p24"
    assert thread_service.calls == [("test_board", "123", 3)]
    assert cache.get_thread_progress(board_name="test_board", article_id="123").recent_post_ids == [
        "p24"
    ]


def test_list_updates_filters_old_posts_from_thread_page() -> None:
    thread = FakeThread(article_id="123", title="First thread", reply_count=24)
    thread_page = FakeThreadPage(
        posts=[
            FakeThreadPost(
                post_id="p20",
                floor_label="20楼",
                author_display_name="alice",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p21",
                floor_label="21楼",
                author_display_name="alice",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p22",
                floor_label="22楼",
                author_display_name="alice",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p23",
                floor_label="23楼",
                author_display_name="alice",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p24",
                floor_label="24楼",
                author_display_name="alice",
                body="new reply",
            ),
        ]
    )
    board_service = FakeBoardService([thread])
    thread_service = FakeThreadService(thread_page=thread_page)
    cache = InMemorySyncCache()
    cache.save_thread_progress(
        board_name="test_board",
        article_id="123",
        reply_count=23,
    )
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
    )

    result = service.list_updates(board_name="test_board", limit=1)

    assert [post.post_id for post in result.threads[0].posts] == ["p24"]
    assert cache.get_thread_progress(board_name="test_board", article_id="123").recent_post_ids == [
        "p24"
    ]


def test_list_updates_does_not_repeat_cached_boundary_floor() -> None:
    thread = FakeThread(article_id="123", title="First thread", reply_count=21)
    thread_page = FakeThreadPage(
        posts=[
            FakeThreadPost(
                post_id="p20",
                floor_label="20楼",
                author_display_name="alice",
                body="boundary reply",
            ),
            FakeThreadPost(
                post_id="p21",
                floor_label="21楼",
                author_display_name="alice",
                body="new reply",
            ),
        ]
    )
    board_service = FakeBoardService([thread])
    thread_service = FakeThreadService(thread_page=thread_page)
    cache = InMemorySyncCache()
    cache.save_thread_progress(
        board_name="test_board",
        article_id="123",
        reply_count=20,
    )
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
    )

    result = service.list_updates(board_name="test_board", limit=1)

    assert [post.post_id for post in result.threads[0].posts] == ["p21"]
    assert cache.get_thread_progress(board_name="test_board", article_id="123").recent_post_ids == [
        "p21"
    ]


def test_backfill_thread_rejects_rewind_beyond_limit() -> None:
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="p31",
                    floor_label="31楼",
                    author_display_name="alice",
                    body="new reply",
                )
            ]
        )
    )
    cache = InMemorySyncCache()
    cache.save_thread_progress(
        board_name="test_board",
        article_id="123",
        reply_count=50,
    )
    service = SyncService(
        board_service=FakeBoardService([]),
        thread_service=thread_service,
        cache=cache,
    )

    with pytest.raises(ValueError, match="Requested rewind exceeds max backfill window"):
        service.backfill_thread(
            board_name="test_board",
            article_id="123",
            start_floor=1,
            max_backfill_window=30,
        )


def test_backfill_thread_requires_thread_service() -> None:
    cache = InMemorySyncCache()
    service = SyncService(
        board_service=FakeBoardService([]),
        thread_service=None,
        cache=cache,
    )

    with pytest.raises(ValueError, match="Thread service is required for backfill"):
        service.backfill_thread(
            board_name="test_board",
            article_id="123",
            start_floor=22,
            max_backfill_window=30,
        )


def test_backfill_thread_allows_cache_miss() -> None:
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="p22",
                    floor_label="22楼",
                    author_display_name="alice",
                    body="new reply",
                )
            ]
        )
    )
    cache = InMemorySyncCache()
    service = SyncService(
        board_service=FakeBoardService([]),
        thread_service=thread_service,
        cache=cache,
    )

    result = service.backfill_thread(
        board_name="test_board",
        article_id="123",
        start_floor=22,
        max_backfill_window=30,
    )

    assert [post.post_id for post in result.posts] == ["p22"]
    assert thread_service.calls == [("test_board", "123", 3)]


def test_backfill_thread_trims_posts_before_start_floor() -> None:
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="p20",
                    floor_label="20楼",
                    author_display_name="alice",
                    body="old reply",
                ),
                FakeThreadPost(
                    post_id="p21",
                    floor_label="21楼",
                    author_display_name="alice",
                    body="old reply",
                ),
                FakeThreadPost(
                    post_id="p22",
                    floor_label="22楼",
                    author_display_name="alice",
                    body="new reply",
                ),
                FakeThreadPost(
                    post_id="p23",
                    floor_label="23楼",
                    author_display_name="alice",
                    body="new reply",
                ),
                FakeThreadPost(
                    post_id="p24",
                    floor_label="24楼",
                    author_display_name="alice",
                    body="new reply",
                ),
            ]
        )
    )
    cache = InMemorySyncCache()
    service = SyncService(
        board_service=FakeBoardService([]),
        thread_service=thread_service,
        cache=cache,
    )

    result = service.backfill_thread(
        board_name="test_board",
        article_id="123",
        start_floor=22,
        max_backfill_window=30,
    )

    assert [post.post_id for post in result.posts] == ["p22", "p23", "p24"]
