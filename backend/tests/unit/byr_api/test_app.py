from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from byr_api.auth import _load_sync_token
from byr_api.app import create_app
from byr_sync.models import SyncPost, SyncThread
from byr_sync.service import SyncUpdateResult


class FakeSyncService:
    def list_updates(self, *, board_name: str, limit: int) -> SyncUpdateResult:
        return SyncUpdateResult(
            board_name=board_name,
            threads=[
                SyncThread(
                    article_id="123",
                    title="First thread",
                    reply_count=4,
                    posts=[
                        SyncPost(
                            post_id="p24",
                            floor_label="24楼",
                            author_display_name="alice",
                            body="new reply",
                        )
                    ],
                ),
            ],
        )


def test_healthcheck_requires_no_token() -> None:
    client = TestClient(create_app())

    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_sync_endpoint_rejects_missing_token() -> None:
    client = TestClient(create_app())

    response = client.get("/api/sync/updates")

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid sync API token"}


def test_sync_endpoint_returns_threads_with_valid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    client = TestClient(create_app(sync_service=FakeSyncService()))

    response = client.get("/api/sync/updates", headers={"X-Sync-Token": "secret-token"})

    assert response.status_code == 200
    assert response.json() == {
        "board_name": "IWhisper",
        "threads": [
            {
                "article_id": "123",
                "title": "First thread",
                "reply_count": 4,
                "posts": [
                    {
                        "post_id": "p24",
                        "floor_label": "24楼",
                        "author_display_name": "alice",
                        "body": "new reply",
                    }
                ],
            }
        ],
    }


def test_load_sync_token_prefers_environment_variable(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / ".env").write_text("BYR_SYNC_API_TOKEN=file-token\n", encoding="utf-8")
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "env-token")
    monkeypatch.setattr("byr_api.auth.DEFAULT_ENV_PATH", tmp_path / ".env")

    assert _load_sync_token() == "env-token"


def test_load_sync_token_reads_default_backend_env_path(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text("BYR_SYNC_API_TOKEN=secret-token\n", encoding="utf-8")
    monkeypatch.delenv("BYR_SYNC_API_TOKEN", raising=False)
    monkeypatch.setattr("byr_api.auth.DEFAULT_ENV_PATH", env_path)

    assert _load_sync_token() == "secret-token"
