from __future__ import annotations

from dataclasses import dataclass

from byr_sync import InMemorySyncCache
from byr_sync.models import SyncPost
from byr_sync.service import SyncService


@dataclass(slots=True)
class FakeBoardThread:
    article_id: str
    title: str
    reply_count: int | None
    post_time: str
    latest_reply_time: str


@dataclass(slots=True)
class FakeBoardPage:
    threads: list[FakeBoardThread]
    has_next_page: bool = False


class FakePagedBoardService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> FakeBoardPage:
        self.calls.append((board_name, page))
        if page == 1:
            return FakeBoardPage(
                threads=[
                    FakeBoardThread(
                        article_id="1",
                        title="Job",
                        reply_count=0,
                        post_time="2026-05-04",
                        latest_reply_time="23:59:59",
                    )
                ],
                has_next_page=True,
            )
        return FakeBoardPage(threads=[], has_next_page=False)


class FakeSinglePageBoardService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> FakeBoardPage:
        self.calls.append((board_name, page))
        return FakeBoardPage(
            threads=[
                FakeBoardThread(
                    article_id="1",
                    title="Job",
                    reply_count=1,
                    post_time="2026-05-04",
                    latest_reply_time="23:59:59",
                )
            ],
            has_next_page=False,
        )


class FakeThreadService:
    def __init__(self, *, pages: dict[int, object] | None = None) -> None:
        self.calls: list[tuple[str, str, int]] = []
        self.pages = pages or {}

    def fetch_page(self, *, board_name: str, article_id: str, page: int = 1):
        self.calls.append((board_name, article_id, page))
        return self.pages.get(page, type("Page", (), {"posts": []})())


def test_list_updates_calls_sleep_between_board_pages() -> None:
    sleep_calls: list[float] = []
    service = SyncService(
        board_service=FakePagedBoardService(),
        thread_service=None,
        cache=InMemorySyncCache(),
        sleep=lambda seconds: sleep_calls.append(seconds),
        request_interval_seconds=0.2,
    )

    service.list_updates(
        board_name="JobInfo",
        limit=20,
        window_minutes=60 * 24 * 365 * 10,
    )

    assert sleep_calls == [0.2]


def test_list_updates_calls_sleep_before_fetching_thread_pages() -> None:
    sleep_calls: list[float] = []
    board_service = FakeSinglePageBoardService()
    thread_service = FakeThreadService()
    service = SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=InMemorySyncCache(),
        sleep=lambda seconds: sleep_calls.append(seconds),
        request_interval_seconds=0.2,
    )

    service.list_updates(
        board_name="JobInfo",
        limit=20,
        window_minutes=60 * 24 * 365 * 10,
    )

    assert board_service.calls == [("JobInfo", 1)]
    assert thread_service.calls == [("JobInfo", "1", 1)]
    assert sleep_calls == [0.2]


def test_backfill_thread_calls_sleep_before_fetching_thread_page() -> None:
    sleep_calls: list[float] = []
    thread_service = FakeThreadService()
    service = SyncService(
        board_service=FakeSinglePageBoardService(),
        thread_service=thread_service,
        cache=InMemorySyncCache(),
        sleep=lambda seconds: sleep_calls.append(seconds),
        request_interval_seconds=0.2,
    )

    service.backfill_thread(
        board_name="JobInfo",
        article_id="1",
        start_floor=11,
        max_backfill_window=30,
    )

    assert thread_service.calls == [("JobInfo", "1", 2)]
    assert sleep_calls == [0.2]


def test_fetch_thread_snapshot_calls_sleep_between_thread_pages() -> None:
    sleep_calls: list[float] = []
    first_page = type(
        "Page",
        (),
        {
            "posts": [
                SyncPost(
                    post_id="1",
                    floor_label="楼主",
                    author_display_name="alice",
                    posted_at="Sat Apr 25 18:07:24 2026",
                    body="opening post",
                )
            ],
            "total_pages": 3,
        },
    )()
    second_page = type(
        "Page",
        (),
        {
            "posts": [
                SyncPost(
                    post_id="p2",
                    floor_label="2楼",
                    author_display_name="bob",
                    posted_at="Sat Apr 25 18:08:24 2026",
                    body="reply",
                )
            ]
        },
    )()
    third_page = type(
        "Page",
        (),
        {
            "posts": [
                SyncPost(
                    post_id="p3",
                    floor_label="3楼",
                    author_display_name="carol",
                    posted_at="Sat Apr 25 18:09:24 2026",
                    body="reply",
                )
            ]
        },
    )()
    thread_service = FakeThreadService(pages={1: first_page, 2: second_page, 3: third_page})
    service = SyncService(
        board_service=FakeSinglePageBoardService(),
        thread_service=thread_service,
        cache=InMemorySyncCache(),
        sleep=lambda seconds: sleep_calls.append(seconds),
        request_interval_seconds=0.2,
    )

    service.fetch_thread_snapshot(board_name="JobInfo", article_id="1")

    assert thread_service.calls == [
        ("JobInfo", "1", 1),
        ("JobInfo", "1", 2),
        ("JobInfo", "1", 3),
    ]
    assert sleep_calls == [0.2, 0.2, 0.2]
