from __future__ import annotations

from fastapi.testclient import TestClient

from byr_api.app import create_app


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


def test_sync_endpoint_accepts_valid_token(tmp_path, monkeypatch) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text("BYR_SYNC_API_TOKEN=secret-token\n", encoding="utf-8")
    monkeypatch.chdir(tmp_path)

    client = TestClient(create_app())

    response = client.get("/api/sync/updates", headers={"X-Sync-Token": "secret-token"})

    assert response.status_code == 200
    assert response.json() == {"threads": []}
