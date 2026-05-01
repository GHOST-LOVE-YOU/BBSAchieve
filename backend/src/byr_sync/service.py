from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(slots=True)
class SyncThread:
    article_id: str
    title: str
    reply_count: int


@dataclass(slots=True)
class SyncUpdateResult:
    board_name: str
    threads: list[SyncThread]


class BoardThreadLike(Protocol):
    article_id: str
    title: str
    reply_count: int | None


class BoardPageLike(Protocol):
    threads: list[BoardThreadLike]


class BoardServiceLike(Protocol):
    def fetch_page(self, *, board_name: str, page: int = 1) -> BoardPageLike: ...


class ThreadProgressCacheLike(Protocol):
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
        thread_service,
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
            self.cache.save_thread_progress(
                board_name=board_name,
                article_id=thread.article_id,
                reply_count=reply_count,
            )
            threads.append(
                SyncThread(
                    article_id=thread.article_id,
                    title=thread.title,
                    reply_count=reply_count,
                )
            )

        return SyncUpdateResult(board_name=board_name, threads=threads)
