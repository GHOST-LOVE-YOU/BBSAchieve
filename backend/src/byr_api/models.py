from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SyncPostResponse:
    post_id: str
    floor_label: str
    author_display_name: str
    body: str


@dataclass(slots=True)
class SyncThreadResponse:
    article_id: str
    title: str
    reply_count: int
    posts: list[SyncPostResponse]


@dataclass(slots=True)
class SyncUpdatesResponse:
    board_name: str
    threads: list[SyncThreadResponse]
