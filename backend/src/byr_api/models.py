from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class SyncThreadResponse:
    article_id: str
    title: str
    reply_count: int | None


@dataclass(slots=True)
class SyncUpdatesResponse:
    board_name: str
    threads: list[SyncThreadResponse]
