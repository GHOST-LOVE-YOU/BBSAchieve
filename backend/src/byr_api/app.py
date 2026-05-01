from __future__ import annotations

from fastapi import Depends, FastAPI

from .auth import require_sync_token


def create_app() -> FastAPI:
    app = FastAPI()

    @app.get("/healthz")
    def healthz() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/api/sync/updates")
    def sync_updates(_: str = Depends(require_sync_token)) -> dict[str, list[object]]:
        return {"threads": []}

    return app
