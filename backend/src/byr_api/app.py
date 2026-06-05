from __future__ import annotations

import os
import time

from fastapi import Depends, FastAPI, HTTPException, Query
import httpx

from .auth import require_sync_token
from .models import (
    SkippedThreadResponse,
    SyncBackfillResponse,
    SyncPostResponse,
    SyncThreadResponse,
    SyncUpdatesResponse,
)
from byr_auth import AuthError, ByrAuthClient
from byr_boards import BoardService
from byr_sync.cache import RedisSyncCache
from byr_sync.service import SyncService
from byr_threads import ThreadService


def build_sync_service() -> SyncService:
    auth_client = ByrAuthClient()
    retry_count = int(os.getenv("BYR_UPSTREAM_REQUEST_RETRY_COUNT", "1"))
    retry_delay_seconds = float(os.getenv("BYR_UPSTREAM_REQUEST_RETRY_DELAY_SECONDS", "1"))
    board_service = BoardService(
        auth_client=auth_client,
        sleep=time.sleep,
        request_retry_count=retry_count,
        request_retry_delay_seconds=retry_delay_seconds,
    )
    thread_service = ThreadService(
        auth_client=auth_client,
        sleep=time.sleep,
        request_retry_count=retry_count,
        request_retry_delay_seconds=retry_delay_seconds,
    )
    cache = RedisSyncCache.from_env()
    interval_ms = int(os.getenv("BYR_SYNC_REQUEST_INTERVAL_MS", "500"))
    return SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
        sleep=time.sleep,
        request_interval_seconds=max(interval_ms, 0) / 1000,
    )


def create_app(*, sync_service: SyncService | None = None) -> FastAPI:
    app = FastAPI()
    app.state.sync_service = sync_service or build_sync_service()

    def upstream_timeout(detail: str, exc: httpx.TimeoutException) -> HTTPException:
        return HTTPException(status_code=504, detail=detail)

    @app.get("/healthz")
    def healthz() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/api/sync/updates")
    def sync_updates(
        board_name: str = Query(default="IWhisper"),
        window_minutes: int = Query(default=30, ge=1),
        limit: int | None = Query(default=None, ge=1),
        start_page: int = Query(default=1, ge=1),
        max_pages: int | None = Query(default=None, ge=1),
        _: str = Depends(require_sync_token),
    ) -> SyncUpdatesResponse:
        try:
            result = app.state.sync_service.list_updates(
                board_name=board_name,
                limit=limit,
                window_minutes=window_minutes,
                start_page=start_page,
                max_pages=max_pages,
            )
        except AuthError as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Upstream BYR authentication failed: {exc}",
            ) from exc
        except httpx.TimeoutException as exc:
            raise upstream_timeout(
                f"Upstream BYR request timed out while syncing board {board_name}",
                exc,
            ) from exc
        return SyncUpdatesResponse(
            board_name=result.board_name,
            window_minutes=result.window_minutes,
            scanned_pages=result.scanned_pages,
            next_page=result.next_page,
            has_more=result.has_more,
            cutoff_at=result.cutoff_at.isoformat() if result.cutoff_at else None,
            threads=[
                SyncThreadResponse(
                    article_id=thread.article_id,
                    title=thread.title,
                    reply_count=thread.reply_count,
                    posts=[
                        SyncPostResponse(
                            post_id=post.post_id,
                            floor_label=post.floor_label,
                            author_display_name=post.author_display_name,
                            posted_at=post.posted_at,
                            body=post.body,
                        )
                        for post in thread.posts
                    ],
                )
                for thread in result.threads
            ],
            skipped_threads=[
                SkippedThreadResponse(
                    board_name=thread.board_name,
                    article_id=thread.article_id,
                    title=thread.title,
                    page=thread.page,
                    reason=thread.reason,
                )
                for thread in result.skipped_threads
            ],
        )

    @app.get("/api/sync/backfill")
    def sync_backfill(
        board_name: str,
        article_id: str,
        start_floor: int = Query(ge=1),
        _: str = Depends(require_sync_token),
    ) -> SyncBackfillResponse:
        try:
            result = app.state.sync_service.backfill_thread(
                board_name=board_name,
                article_id=article_id,
                start_floor=start_floor,
                max_backfill_window=30,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except httpx.TimeoutException as exc:
            raise upstream_timeout(
                f"Upstream BYR request timed out while backfilling thread {board_name}/{article_id}",
                exc,
            ) from exc

        return SyncBackfillResponse(
            article_id=result.article_id,
            start_floor=result.start_floor,
            posts=[
                SyncPostResponse(
                    post_id=post.post_id,
                    floor_label=post.floor_label,
                    author_display_name=post.author_display_name,
                    posted_at=post.posted_at,
                    body=post.body,
                )
                for post in result.posts
            ],
        )

    @app.get("/api/sync/thread-original-post")
    def sync_thread_original_post(
        board_name: str,
        article_id: str,
        _: str = Depends(require_sync_token),
    ) -> SyncPostResponse:
        try:
            post = app.state.sync_service.fetch_original_post(
                board_name=board_name,
                article_id=article_id,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except httpx.TimeoutException as exc:
            raise upstream_timeout(
                f"Upstream BYR request timed out while fetching original post {board_name}/{article_id}",
                exc,
            ) from exc

        return SyncPostResponse(
            post_id=post.post_id,
            floor_label=post.floor_label,
            author_display_name=post.author_display_name,
            posted_at=post.posted_at,
            body=post.body,
        )

    @app.get("/api/sync/thread-snapshot")
    def sync_thread_snapshot(
        board_name: str,
        article_id: str,
        start_floor: int = Query(default=1, ge=1),
        _: str = Depends(require_sync_token),
    ) -> SyncBackfillResponse:
        try:
            result = app.state.sync_service.fetch_thread_snapshot(
                board_name=board_name,
                article_id=article_id,
                start_floor=start_floor,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except httpx.TimeoutException as exc:
            raise upstream_timeout(
                f"Upstream BYR request timed out while fetching thread snapshot {board_name}/{article_id}",
                exc,
            ) from exc

        return SyncBackfillResponse(
            article_id=result.article_id,
            start_floor=result.start_floor,
            posts=[
                SyncPostResponse(
                    post_id=post.post_id,
                    floor_label=post.floor_label,
                    author_display_name=post.author_display_name,
                    posted_at=post.posted_at,
                    body=post.body,
                )
                for post in result.posts
            ],
        )

    return app
