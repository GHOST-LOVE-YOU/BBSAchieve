from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Query

from .auth import require_sync_token
from .models import (
    SyncBackfillResponse,
    SyncPostResponse,
    SyncThreadResponse,
    SyncUpdatesResponse,
)
from byr_auth import ByrAuthClient
from byr_boards import BoardService
from byr_sync.cache import RedisSyncCache
from byr_sync.service import SyncService
from byr_threads import ThreadService


def build_sync_service() -> SyncService:
    auth_client = ByrAuthClient()
    board_service = BoardService(auth_client=auth_client)
    thread_service = ThreadService(auth_client=auth_client)
    cache = RedisSyncCache.from_env()
    return SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
    )


def create_app(*, sync_service: SyncService | None = None) -> FastAPI:
    app = FastAPI()
    app.state.sync_service = sync_service or build_sync_service()

    @app.get("/healthz")
    def healthz() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/api/sync/updates")
    def sync_updates(_: str = Depends(require_sync_token)) -> SyncUpdatesResponse:
        result = app.state.sync_service.list_updates(board_name="IWhisper", limit=20)
        return SyncUpdatesResponse(
            board_name=result.board_name,
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
