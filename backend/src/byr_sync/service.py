from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Protocol

from .models import SyncPost


@dataclass(slots=True)
class SyncUpdateResult:
    board_name: str
    threads: list["SyncThread"]


class BoardThreadLike(Protocol):
    article_id: str
    title: str
    reply_count: int | None


class BoardPageLike(Protocol):
    threads: list[BoardThreadLike]


class ThreadPageLike(Protocol):
    posts: list["ThreadPostLike"]


class ThreadPostLike(Protocol):
    post_id: str
    floor_label: str
    author_display_name: str
    body: str


class ThreadProgressLike(Protocol):
    reply_count: int


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
    ) -> None:
        self.board_service = board_service
        self.thread_service = thread_service
        self.cache = cache

    def list_updates(self, *, board_name: str, limit: int) -> SyncUpdateResult:
        board_page = self.board_service.fetch_page(board_name=board_name, page=1)
        threads: list[SyncThread] = []

        for thread in board_page.threads[:limit]:
            reply_count = thread.reply_count or 0
            cached = self.cache.get_thread_progress(
                board_name=board_name,
                article_id=thread.article_id,
            )
            cached_reply_count = cached.reply_count if cached else 0
            posts: list[SyncPost] = []
            if self.thread_service is not None and reply_count > cached_reply_count:
                page = max(1, ((cached_reply_count + 1) // 10) + 1)
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

        return SyncUpdateResult(board_name=board_name, threads=threads)

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
            floor_number = SyncService._parse_floor_number(post.floor_label)
            if floor_number is not None and floor_number < start_floor:
                continue
            posts.append(
                SyncPost(
                    post_id=post.post_id,
                    floor_label=post.floor_label,
                    author_display_name=post.author_display_name,
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
