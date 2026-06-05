from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SyncPostResponse:
    post_id: str
    floor_label: str
    author_display_name: str
    posted_at: str
    body: str


@dataclass(slots=True)
class SyncThreadResponse:
    article_id: str
    title: str
    reply_count: int
    posts: list[SyncPostResponse]


@dataclass(slots=True)
class SkippedThreadResponse:
    board_name: str
    article_id: str
    title: str
    page: int | None
    reason: str


@dataclass(slots=True)
class SyncUpdatesResponse:
    board_name: str
    threads: list[SyncThreadResponse]
    window_minutes: int
    scanned_pages: int = 1
    next_page: int | None = None
    has_more: bool = False
    cutoff_at: str | None = None
    skipped_threads: list[SkippedThreadResponse] | None = None


@dataclass(slots=True)
class SyncBackfillResponse:
    article_id: str
    start_floor: int
    posts: list[SyncPostResponse]
