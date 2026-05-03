from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import pytest

from byr_sync import InMemorySyncCache, THREAD_TTL_SECONDS
from byr_sync.cache import RedisSyncCache
from byr_sync.models import SyncPost
from byr_sync.service import SyncService

type FakeBoardThreadLike = FakeThread | FakeBoardThread


@dataclass(slots=True)
class FakeThread:
    article_id: str
    title: str
    reply_count: int | None


@dataclass(slots=True)
class FakeBoardPage:
    threads: list[FakeBoardThreadLike]
    has_next_page: bool = False


class FakeBoardService:
    def __init__(self, threads: list[FakeThread]) -> None:
        self.threads = threads
        self.calls: list[tuple[str, int]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> FakeBoardPage:
        self.calls.append((board_name, page))
        return FakeBoardPage(threads=self.threads)


@dataclass(slots=True)
class FakeBoardThread:
    article_id: str
    title: str
    reply_count: int | None
    post_time: str
    latest_reply_time: str


class FakePagedBoardService:
    def __init__(self, pages: dict[int, FakeBoardPage]) -> None:
        self.pages = pages
        self.calls: list[tuple[str, int]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> FakeBoardPage:
        self.calls.append((board_name, page))
        return self.pages[page]


@dataclass(slots=True)
class FakeThreadPost:
    post_id: str
    floor_label: str
    author_display_name: str
    posted_at: str
    body: str


@dataclass(slots=True)
class FakeThreadPage:
    posts: list[FakeThreadPost]
    total_pages: int = 1


class FakeThreadService:
    def __init__(
        self,
        thread_page: FakeThreadPage | None = None,
        thread_pages: dict[int, FakeThreadPage] | None = None,
    ) -> None:
        self.thread_page = thread_page or FakeThreadPage(posts=[])
        self.thread_pages = thread_pages or {}
        self.calls: list[tuple[str, str, int]] = []

    def fetch_page(
        self,
        *,
        board_name: str,
        article_id: str,
        page: int = 1,
    ) -> FakeThreadPage:
        self.calls.append((board_name, article_id, page))
        return self.thread_pages.get(page, self.thread_page)


class FakeRedis:
    def __init__(self) -> None:
        self.hashes: dict[str, dict[str, str]] = {}
        self.expirations: dict[str, int] = {}

    def hset(self, key: str, mapping: dict[str, object]) -> int:
        hash_value = self.hashes.setdefault(key, {})
        for field, value in mapping.items():
            hash_value[field] = str(value)
        return len(mapping)

    def hgetall(self, key: str) -> dict[str, str]:
        return dict(self.hashes.get(key, {}))

    def expire(self, key: str, seconds: int) -> bool:
        self.expirations[key] = seconds
        return True


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


def test_redis_cache_sets_expire_when_saving_progress() -> None:
    redis_client = FakeRedis()
    cache = RedisSyncCache(redis_client)

    progress = cache.save_thread_progress(
        board_name="IWhisper",
        article_id="123",
        reply_count=7,
        recent_post_ids=["p1", "p2"],
    )

    assert progress.ttl_seconds == THREAD_TTL_SECONDS
    assert redis_client.expirations["sync:thread:IWhisper:123"] == THREAD_TTL_SECONDS
    assert redis_client.hashes["sync:thread:IWhisper:123"] == {
        "board_name": "IWhisper",
        "article_id": "123",
        "reply_count": "7",
        "ttl_seconds": str(THREAD_TTL_SECONDS),
        "recent_post_ids": "p1,p2",
    }
    cached = cache.get_thread_progress(board_name="IWhisper", article_id="123")
    assert cached is not None
    assert cached.reply_count == 7
    assert cached.recent_post_ids == ["p1", "p2"]


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


def test_list_updates_fetches_first_page_for_new_zero_reply_thread() -> None:
    thread = FakeThread(article_id="123", title="Only opening post", reply_count=0)
    thread_page = FakeThreadPage(
        posts=[
            FakeThreadPost(
                post_id="123",
                floor_label="楼主",
                author_display_name="alice",
                posted_at="Sat Apr 25 18:07:24 2026",
                body="opening post",
            )
        ]
    )
    board_service = FakeBoardService([thread])
    thread_service = FakeThreadService(thread_page=thread_page)
    cache = InMemorySyncCache()
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
    )

    result = service.list_updates(board_name="test_board", limit=1)

    assert [post.post_id for post in result.threads[0].posts] == ["123"]
    assert thread_service.calls == [("test_board", "123", 1)]


def test_list_updates_refetches_zero_reply_thread_when_cached_posts_are_empty() -> None:
    thread = FakeThread(article_id="123", title="Only opening post", reply_count=0)
    thread_page = FakeThreadPage(
        posts=[
            FakeThreadPost(
                post_id="123",
                floor_label="楼主",
                author_display_name="alice",
                posted_at="Sat Apr 25 18:07:24 2026",
                body="opening post",
            )
        ]
    )
    board_service = FakeBoardService([thread])
    thread_service = FakeThreadService(thread_page=thread_page)
    cache = InMemorySyncCache()
    cache.save_thread_progress(
        board_name="test_board",
        article_id="123",
        reply_count=0,
        recent_post_ids=[],
    )
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
    )

    result = service.list_updates(board_name="test_board", limit=1)

    assert [post.post_id for post in result.threads[0].posts] == ["123"]
    assert thread_service.calls == [("test_board", "123", 1)]


def test_list_updates_includes_new_posts_after_cached_reply_count() -> None:
    thread = FakeThread(article_id="123", title="First thread", reply_count=24)
    thread_page = FakeThreadPage(
        posts=[
            FakeThreadPost(
                post_id="p24",
                floor_label="24楼",
                author_display_name="alice",
                posted_at="Sat Apr 26 13:25:36 2026",
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
                posted_at="Sat Apr 26 13:05:36 2026",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p21",
                floor_label="21楼",
                author_display_name="alice",
                posted_at="Sat Apr 26 13:10:36 2026",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p22",
                floor_label="22楼",
                author_display_name="alice",
                posted_at="Sat Apr 26 13:15:36 2026",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p23",
                floor_label="23楼",
                author_display_name="alice",
                posted_at="Sat Apr 26 13:20:36 2026",
                body="old reply",
            ),
            FakeThreadPost(
                post_id="p24",
                floor_label="24楼",
                author_display_name="alice",
                posted_at="Sat Apr 26 13:25:36 2026",
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


def test_fetch_original_post_returns_the_first_floor() -> None:
    board_service = FakeBoardService([])
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="123",
                    floor_label="楼主",
                    author_display_name="alice",
                    posted_at="Sat Apr 25 18:07:24 2026",
                    body="opening post",
                ),
                FakeThreadPost(
                    post_id="p1",
                    floor_label="第1楼",
                    author_display_name="bob",
                    posted_at="Sat Apr 25 18:10:00 2026",
                    body="reply",
                ),
            ]
        )
    )
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=InMemorySyncCache(),
    )

    result = service.fetch_original_post(board_name="test_board", article_id="123")

    assert result == SyncPost(
        post_id="123",
        floor_label="楼主",
        author_display_name="alice",
        posted_at="Sat Apr 25 18:07:24 2026",
        body="opening post",
    )
    assert thread_service.calls == [("test_board", "123", 1)]


def test_fetch_thread_snapshot_collects_all_pages_from_start_floor() -> None:
    board_service = FakeBoardService([])
    thread_service = FakeThreadService(
        thread_pages={
            1: FakeThreadPage(
                total_pages=2,
                posts=[
                    FakeThreadPost(
                        post_id="123",
                        floor_label="楼主",
                        author_display_name="alice",
                        posted_at="Sat Apr 25 18:07:24 2026",
                        body="opening post",
                    ),
                    FakeThreadPost(
                        post_id="p1",
                        floor_label="第1楼",
                        author_display_name="bob",
                        posted_at="Sat Apr 25 18:10:00 2026",
                        body="reply 1",
                    ),
                ],
            ),
            2: FakeThreadPage(
                total_pages=2,
                posts=[
                    FakeThreadPost(
                        post_id="p2",
                        floor_label="第2楼",
                        author_display_name="carol",
                        posted_at="Sat Apr 25 18:11:00 2026",
                        body="reply 2",
                    ),
                    FakeThreadPost(
                        post_id="p3",
                        floor_label="第3楼",
                        author_display_name="dave",
                        posted_at="Sat Apr 25 18:12:00 2026",
                        body="reply 3",
                    ),
                ],
            ),
        }
    )
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=InMemorySyncCache(),
    )

    result = service.fetch_thread_snapshot(
        board_name="test_board",
        article_id="123",
        start_floor=2,
    )

    assert [post.post_id for post in result.posts] == ["p2", "p3"]
    assert thread_service.calls == [("test_board", "123", 1), ("test_board", "123", 2)]


def test_list_updates_does_not_repeat_cached_boundary_floor() -> None:
    thread = FakeThread(article_id="123", title="First thread", reply_count=21)
    thread_page = FakeThreadPage(
        posts=[
            FakeThreadPost(
                post_id="p20",
                floor_label="20楼",
                author_display_name="alice",
                posted_at="Sat Apr 26 13:20:36 2026",
                body="boundary reply",
            ),
            FakeThreadPost(
                post_id="p21",
                floor_label="21楼",
                author_display_name="alice",
                posted_at="Sat Apr 26 13:25:36 2026",
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


def test_parse_board_time_treats_clock_time_as_today() -> None:
    reference_now = datetime(2026, 5, 3, 22, 10, 0)

    parsed = SyncService._parse_board_time("22:03:42", now=reference_now)

    assert parsed == datetime(2026, 5, 3, 22, 3, 42)


def test_parse_board_time_treats_date_only_as_end_of_day() -> None:
    parsed = SyncService._parse_board_time(
        "2026-05-02",
        now=datetime(2026, 5, 3, 22, 10, 0),
    )

    assert parsed == datetime(2026, 5, 2, 23, 59, 59)


def test_list_updates_scans_until_first_page_with_out_of_window_thread() -> None:
    page_1 = FakeBoardPage(
        threads=[
            FakeBoardThread(
                article_id="a1",
                title="in window",
                reply_count=0,
                post_time="21:50:00",
                latest_reply_time="22:05:00",
            ),
        ],
        has_next_page=True,
    )
    page_2 = FakeBoardPage(
        threads=[
            FakeBoardThread(
                article_id="a2",
                title="boundary in window",
                reply_count=0,
                post_time="21:20:00",
                latest_reply_time="21:45:00",
            ),
            FakeBoardThread(
                article_id="a3",
                title="out of window",
                reply_count=0,
                post_time="20:00:00",
                latest_reply_time="20:10:00",
            ),
        ],
        has_next_page=True,
    )
    board_service = FakePagedBoardService({1: page_1, 2: page_2})
    service = SyncService(
        board_service=board_service,
        thread_service=FakeThreadService(),
        cache=InMemorySyncCache(),
    )

    result = service.list_updates(
        board_name="IWhisper",
        limit=20,
        window_minutes=30,
        now=datetime(2026, 5, 3, 22, 10, 0),
    )

    assert [thread.article_id for thread in result.threads] == ["a1", "a2"]
    assert board_service.calls == [("IWhisper", 1), ("IWhisper", 2)]


def test_list_updates_uses_post_time_when_reply_time_is_empty() -> None:
    board_service = FakePagedBoardService(
        {
            1: FakeBoardPage(
                threads=[
                    FakeBoardThread(
                        article_id="a1",
                        title="new post",
                        reply_count=0,
                        post_time="22:00:00",
                        latest_reply_time="",
                    ),
                    FakeBoardThread(
                        article_id="a2",
                        title="old thread",
                        reply_count=0,
                        post_time="21:00:00",
                        latest_reply_time="21:30:00",
                    ),
                ],
                has_next_page=False,
            )
        }
    )
    service = SyncService(
        board_service=board_service,
        thread_service=FakeThreadService(),
        cache=InMemorySyncCache(),
    )

    result = service.list_updates(
        board_name="IWhisper",
        limit=20,
        window_minutes=30,
        now=datetime(2026, 5, 3, 22, 10, 0),
    )

    assert [thread.article_id for thread in result.threads] == ["a1"]


def test_list_updates_accepts_aware_now_for_window_filtering() -> None:
    board_service = FakePagedBoardService(
        {
            1: FakeBoardPage(
                threads=[
                    FakeBoardThread(
                        article_id="a1",
                        title="recent in forum timezone",
                        reply_count=0,
                        post_time="21:50:00",
                        latest_reply_time="22:05:00",
                    ),
                    FakeBoardThread(
                        article_id="a2",
                        title="too old in forum timezone",
                        reply_count=0,
                        post_time="21:00:00",
                        latest_reply_time="21:30:00",
                    ),
                ],
                has_next_page=False,
            )
        }
    )
    service = SyncService(
        board_service=board_service,
        thread_service=FakeThreadService(),
        cache=InMemorySyncCache(),
    )

    result = service.list_updates(
        board_name="IWhisper",
        limit=20,
        window_minutes=30,
        now=datetime(2026, 5, 3, 14, 10, 0, tzinfo=timezone.utc),
    )

    assert [thread.article_id for thread in result.threads] == ["a1"]


def test_backfill_thread_rejects_rewind_beyond_limit() -> None:
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="p31",
                    floor_label="31楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:25:36 2026",
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


def test_backfill_thread_allows_cache_miss_when_page_stays_within_window() -> None:
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="p22",
                    floor_label="22楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:25:36 2026",
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


def test_backfill_thread_rejects_cache_miss_when_observed_page_exceeds_window() -> None:
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="p40",
                    floor_label="40楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:25:36 2026",
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

    with pytest.raises(ValueError, match="Requested rewind exceeds max backfill window"):
        service.backfill_thread(
            board_name="test_board",
            article_id="123",
            start_floor=1,
            max_backfill_window=30,
        )


def test_backfill_thread_trims_posts_before_start_floor() -> None:
    thread_service = FakeThreadService(
        thread_page=FakeThreadPage(
            posts=[
                FakeThreadPost(
                    post_id="p20",
                    floor_label="20楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:05:36 2026",
                    body="old reply",
                ),
                FakeThreadPost(
                    post_id="p21",
                    floor_label="21楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:10:36 2026",
                    body="old reply",
                ),
                FakeThreadPost(
                    post_id="p22",
                    floor_label="22楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:15:36 2026",
                    body="new reply",
                ),
                FakeThreadPost(
                    post_id="p23",
                    floor_label="23楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:20:36 2026",
                    body="new reply",
                ),
                FakeThreadPost(
                    post_id="p24",
                    floor_label="24楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 13:25:36 2026",
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
