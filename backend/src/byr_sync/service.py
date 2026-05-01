from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from byr_threads.models import ThreadPost

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
    posts: list[ThreadPost]


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
                posts = [
                    SyncPost(
                        post_id=post.post_id,
                        floor_label=post.floor_label,
                        author_display_name=post.author_display_name,
                        body=post.body,
                    )
                    for post in thread_page.posts
                ]
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
