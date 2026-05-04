from __future__ import annotations

from collections.abc import Callable
import re
from dataclasses import dataclass
from datetime import datetime, time, timedelta
from typing import Protocol
from zoneinfo import ZoneInfo

from .models import SyncPost

FORUM_TIMEZONE = ZoneInfo("Asia/Shanghai")


@dataclass(slots=True)
class SyncUpdateResult:
    board_name: str
    threads: list["SyncThread"]
    window_minutes: int | None = None
    scanned_pages: int = 1
    cutoff_at: datetime | None = None


class BoardThreadLike(Protocol):
    article_id: str
    title: str
    reply_count: int | None
    post_time: str
    latest_reply_time: str


class BoardPageLike(Protocol):
    threads: list[BoardThreadLike]
    has_next_page: bool


class ThreadPageLike(Protocol):
    posts: list["ThreadPostLike"]


class ThreadPostLike(Protocol):
    post_id: str
    floor_label: str
    author_display_name: str
    posted_at: str
    body: str


class ThreadProgressLike(Protocol):
    reply_count: int
    recent_post_ids: list[str]


class BoardServiceLike(Protocol):
    def fetch_page(self, *, board_name: str, page: int = 1) -> BoardPageLike: ...


class ThreadServiceLike(Protocol):
    def fetch_page(
        self,
        *,
        board_name: str,
        article_id: str,
        page: int = 1,
    ) -> ThreadPageLike: ...


class ThreadProgressCacheLike(Protocol):
    def get_thread_progress(
        self,
        *,
        board_name: str,
        article_id: str,
    ) -> ThreadProgressLike | None: ...

    def save_thread_progress(
        self,
        board_name: str,
        article_id: str,
        reply_count: int,
        recent_post_ids: list[str] | None = None,
    ) -> object: ...


class SyncService:
    """First-version sync service: fetch page 1 and persist per-thread progress."""

    def __init__(
        self,
        board_service: BoardServiceLike,
        thread_service: ThreadServiceLike | None,
        cache: ThreadProgressCacheLike,
        *,
        sleep: Callable[[float], None] | None = None,
        request_interval_seconds: float = 0.0,
    ) -> None:
        self.board_service = board_service
        self.thread_service = thread_service
        self.cache = cache
        self.sleep = sleep or (lambda _seconds: None)
        self.request_interval_seconds = request_interval_seconds

    def _sleep_between_requests(self) -> None:
        if self.request_interval_seconds > 0:
            self.sleep(self.request_interval_seconds)

    def list_updates(
        self,
        *,
        board_name: str,
        limit: int,
        window_minutes: int | None = None,
        now: datetime | None = None,
    ) -> SyncUpdateResult:
        reference_now = self._normalize_reference_now(now)
        candidate_threads, scanned_pages = self._collect_candidate_threads(
            board_name=board_name,
            limit=limit,
            window_minutes=window_minutes,
            now=reference_now,
        )
        threads: list[SyncThread] = []

        for thread in candidate_threads:
            reply_count = thread.reply_count or 0
            cached = self.cache.get_thread_progress(
                board_name=board_name,
                article_id=thread.article_id,
            )
            cached_reply_count = cached.reply_count if cached else 0
            posts: list[SyncPost] = []
            should_fetch_thread_page = (
                self.thread_service is not None
                and (
                    reply_count > cached_reply_count
                    or (cached is None and reply_count == 0)
                    or (cached is not None and reply_count == 0 and not cached.recent_post_ids)
                )
            )
            if should_fetch_thread_page:
                self._sleep_between_requests()
                page = 1 if cached is None else max(1, ((cached_reply_count + 1) // 10) + 1)
                thread_page = self.thread_service.fetch_page(
                    board_name=board_name,
                    article_id=thread.article_id,
                    page=page,
                )
                posts = self._build_posts(
                    thread_page.posts,
                    cached_reply_count=cached_reply_count,
                )
            self.cache.save_thread_progress(
                board_name=board_name,
                article_id=thread.article_id,
                reply_count=reply_count,
                recent_post_ids=[post.post_id for post in posts],
            )
            threads.append(
                self._build_sync_thread(
                    article_id=thread.article_id,
                    title=thread.title,
                    reply_count=reply_count,
                    posts=posts,
                )
            )

        return SyncUpdateResult(
            board_name=board_name,
            threads=threads,
            window_minutes=window_minutes,
            scanned_pages=scanned_pages,
            cutoff_at=(
                reference_now - timedelta(minutes=window_minutes)
                if window_minutes is not None
                else None
            ),
        )

    def backfill_thread(
        self,
        *,
        board_name: str,
        article_id: str,
        start_floor: int,
        max_backfill_window: int,
    ) -> "BackfillResult":
        from .models import BackfillResult

        cached = self.cache.get_thread_progress(
            board_name=board_name,
            article_id=article_id,
        )
        if self.thread_service is None:
            raise ValueError("Thread service is required for backfill")

        page = max(1, ((start_floor - 1) // 10) + 1)
        self._sleep_between_requests()
        thread_page = self.thread_service.fetch_page(
            board_name=board_name,
            article_id=article_id,
            page=page,
        )
        observed_max_floor = self._observed_max_floor(thread_page.posts)
        known_upper_floor = observed_max_floor
        if cached is not None:
            cached_reply_count = cached.reply_count
            known_upper_floor = (
                max(cached_reply_count, observed_max_floor)
                if observed_max_floor is not None
                else cached_reply_count
            )
        if (
            known_upper_floor is not None
            and known_upper_floor - start_floor > max_backfill_window
        ):
            raise ValueError("Requested rewind exceeds max backfill window")
        posts = self._build_backfill_posts(thread_page.posts, start_floor=start_floor)
        return BackfillResult(
            board_name=board_name,
            article_id=article_id,
            start_floor=start_floor,
            posts=posts,
        )

    def fetch_original_post(
        self,
        *,
        board_name: str,
        article_id: str,
    ) -> SyncPost:
        if self.thread_service is None:
            raise ValueError("Thread service is required for fetching original post")

        self._sleep_between_requests()
        thread_page = self.thread_service.fetch_page(
            board_name=board_name,
            article_id=article_id,
            page=1,
        )
        for post in thread_page.posts:
            if post.post_id == article_id or self._is_original_post_floor(post.floor_label):
                return SyncPost(
                    post_id=post.post_id,
                    floor_label=post.floor_label,
                    author_display_name=post.author_display_name,
                    posted_at=post.posted_at,
                    body=post.body,
                )

        raise ValueError("Original post not found")

    def fetch_thread_snapshot(
        self,
        *,
        board_name: str,
        article_id: str,
        start_floor: int = 1,
    ) -> "BackfillResult":
        from .models import BackfillResult

        if self.thread_service is None:
            raise ValueError("Thread service is required for thread snapshot")
        if start_floor < 1:
            raise ValueError("Start floor must be greater than or equal to 1")

        self._sleep_between_requests()
        first_page = self.thread_service.fetch_page(
            board_name=board_name,
            article_id=article_id,
            page=1,
        )
        posts = list(first_page.posts)
        total_pages = max(1, getattr(first_page, "total_pages", 1))
        for page in range(2, total_pages + 1):
            self._sleep_between_requests()
            page_result = self.thread_service.fetch_page(
                board_name=board_name,
                article_id=article_id,
                page=page,
            )
            posts.extend(page_result.posts)

        return BackfillResult(
            board_name=board_name,
            article_id=article_id,
            start_floor=start_floor,
            posts=self._build_backfill_posts(posts, start_floor=start_floor),
        )

    @staticmethod
    def _build_sync_thread(
        *,
        article_id: str,
        title: str,
        reply_count: int,
        posts: list[SyncPost],
    ) -> "SyncThread":
        from .models import SyncThread

        return SyncThread(
            article_id=article_id,
            title=title,
            reply_count=reply_count,
            posts=posts,
        )

    def _collect_candidate_threads(
        self,
        *,
        board_name: str,
        limit: int,
        window_minutes: int | None,
        now: datetime,
    ) -> tuple[list[BoardThreadLike], int]:
        if window_minutes is None:
            board_page = self.board_service.fetch_page(board_name=board_name, page=1)
            return board_page.threads[:limit], 1

        cutoff = now - timedelta(minutes=window_minutes)
        collected: list[BoardThreadLike] = []
        page = 1
        reached_out_of_window = False

        while len(collected) < limit:
            board_page = self.board_service.fetch_page(board_name=board_name, page=page)
            for thread in board_page.threads:
                observed_time = self._resolve_thread_observed_time(thread, now=now)
                if observed_time >= cutoff:
                    collected.append(thread)
                    if len(collected) >= limit:
                        return collected, page
                else:
                    reached_out_of_window = True
            if reached_out_of_window or not board_page.has_next_page:
                break
            self._sleep_between_requests()
            page += 1

        return collected, page

    @staticmethod
    def _build_posts(
        thread_posts: list[ThreadPostLike],
        *,
        cached_reply_count: int,
    ) -> list[SyncPost]:
        posts: list[SyncPost] = []
        for post in thread_posts:
            floor_number = SyncService._parse_floor_number(post.floor_label)
            if floor_number is not None and floor_number <= cached_reply_count:
                continue
            posts.append(
                SyncPost(
                    post_id=post.post_id,
                    floor_label=post.floor_label,
                    author_display_name=post.author_display_name,
                    posted_at=post.posted_at,
                    body=post.body,
                )
            )
        return posts

    @staticmethod
    def _build_backfill_posts(
        thread_posts: list[ThreadPostLike],
        *,
        start_floor: int,
    ) -> list[SyncPost]:
        posts: list[SyncPost] = []
        for post in thread_posts:
            if (
                start_floor > 1
                and (post.post_id == "" or SyncService._is_original_post_floor(post.floor_label))
            ):
                continue
            floor_number = SyncService._parse_floor_number(post.floor_label)
            if floor_number is not None and floor_number < start_floor:
                continue
            posts.append(
                SyncPost(
                    post_id=post.post_id,
                    floor_label=post.floor_label,
                    author_display_name=post.author_display_name,
                    posted_at=post.posted_at,
                    body=post.body,
                )
            )
        return posts

    @staticmethod
    def _observed_max_floor(thread_posts: list[ThreadPostLike]) -> int | None:
        observed_floors = [
            floor_number
            for post in thread_posts
            if (floor_number := SyncService._parse_floor_number(post.floor_label)) is not None
        ]
        if not observed_floors:
            return None
        return max(observed_floors)

    @staticmethod
    def _parse_floor_number(floor_label: str) -> int | None:
        match = re.search(r"(\d+)", floor_label)
        if match is None:
            return None
        return int(match.group(1))

    @staticmethod
    def _is_original_post_floor(floor_label: str) -> bool:
        normalized = floor_label.strip()
        return normalized == "楼主" or normalized == "0楼"

    @staticmethod
    def _resolve_thread_observed_time(thread: BoardThreadLike, *, now: datetime) -> datetime:
        latest_reply_time = thread.latest_reply_time.strip()
        if latest_reply_time:
            return SyncService._parse_board_time(latest_reply_time, now=now)
        return SyncService._parse_board_time(thread.post_time, now=now)

    @staticmethod
    def _parse_board_time(raw_time: str, *, now: datetime) -> datetime:
        normalized = raw_time.strip()
        if re.fullmatch(r"\d{2}:\d{2}:\d{2}", normalized):
            clock_time = datetime.strptime(normalized, "%H:%M:%S").time()
            return datetime.combine(now.date(), clock_time)
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", normalized):
            parsed_date = datetime.strptime(normalized, "%Y-%m-%d").date()
            return datetime.combine(parsed_date, time(23, 59, 59))
        raise ValueError(f"Unsupported board time format: {raw_time}")

    @staticmethod
    def _normalize_reference_now(now: datetime | None) -> datetime:
        if now is None:
            return datetime.now(FORUM_TIMEZONE).replace(tzinfo=None)
        if now.tzinfo is not None:
            return now.astimezone(FORUM_TIMEZONE).replace(tzinfo=None)
        return now
