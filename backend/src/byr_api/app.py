from __future__ import annotations

from fastapi import Depends, FastAPI

from .auth import require_sync_token
from .models import SyncThreadResponse, SyncUpdatesResponse
from byr_auth import ByrAuthClient
from byr_boards import BoardService
from byr_sync import InMemorySyncCache
from byr_sync.service import SyncService
from byr_threads import ThreadService


def build_sync_service() -> SyncService:
    auth_client = ByrAuthClient()
    board_service = BoardService(auth_client=auth_client)
    thread_service = ThreadService(auth_client=auth_client)
    cache = InMemorySyncCache()
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
                )
                for thread in result.threads
            ],
        )

    return app
