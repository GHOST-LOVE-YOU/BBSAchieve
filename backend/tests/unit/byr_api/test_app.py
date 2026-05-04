from __future__ import annotations

from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from byr_api.auth import _load_sync_token
from byr_api import app as app_module
from byr_api.app import create_app
from byr_sync import InMemorySyncCache
from byr_sync.models import BackfillResult, SyncPost, SyncThread
from byr_sync.service import SyncService, SyncUpdateResult


class FakeSyncService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, int, int | None]] = []

    def list_updates(
        self,
        *,
        board_name: str,
        limit: int,
        window_minutes: int | None = None,
    ) -> SyncUpdateResult:
        self.calls.append((board_name, limit, window_minutes))
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
                            posted_at="Sat Apr 26 13:25:36 2026",
                            body="new reply",
                        )
                    ],
                ),
            ],
            window_minutes=window_minutes,
            scanned_pages=2,
            cutoff_at=datetime.fromisoformat("2026-05-03T21:40:00"),
        )

    def fetch_original_post(self, *, board_name: str, article_id: str) -> SyncPost:
        return SyncPost(
            post_id=article_id,
            floor_label="楼主",
            author_display_name="alice",
            posted_at="Sat Apr 25 18:07:24 2026",
            body="opening post",
        )

    def fetch_thread_snapshot(
        self,
        *,
        board_name: str,
        article_id: str,
        start_floor: int = 1,
    ) -> BackfillResult:
        return BackfillResult(
            board_name=board_name,
            article_id=article_id,
            start_floor=start_floor,
            posts=[
                SyncPost(
                    post_id="p2",
                    floor_label="第2楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:10:00 2026",
                    body="new reply 2",
                ),
                SyncPost(
                    post_id="p3",
                    floor_label="第3楼",
                    author_display_name="bob",
                    posted_at="Sat Apr 26 09:15:00 2026",
                    body="new reply 3",
                ),
            ],
        )



class FakeThreadPage:
    def __init__(self, posts: list[SyncPost]) -> None:
        self.posts = posts


class FakeThreadService:
    def __init__(self, posts: list[SyncPost]) -> None:
        self.posts = posts
        self.calls: list[tuple[str, str, int]] = []

    def fetch_page(
        self,
        *,
        board_name: str,
        article_id: str,
        page: int = 1,
    ) -> FakeThreadPage:
        self.calls.append((board_name, article_id, page))
        return FakeThreadPage(posts=self.posts)


class RaisingSyncService:
    def list_updates(
        self,
        *,
        board_name: str,
        limit: int,
        window_minutes: int | None = None,
    ) -> SyncUpdateResult:
        raise AssertionError("not used")

    def backfill_thread(
        self,
        *,
        board_name: str,
        article_id: str,
        start_floor: int,
        max_backfill_window: int,
    ) -> BackfillResult:
        raise ValueError("Requested rewind exceeds max backfill window")


def test_build_sync_service_injects_real_sleep(monkeypatch: pytest.MonkeyPatch) -> None:
    captured_kwargs: dict[str, object] = {}

    class FakeSyncServiceCtor:
        def __init__(self, **kwargs: object) -> None:
            captured_kwargs.update(kwargs)

    monkeypatch.setenv("BYR_SYNC_REQUEST_INTERVAL_MS", "250")
    monkeypatch.setattr(app_module, "ByrAuthClient", lambda: object())
    monkeypatch.setattr(app_module, "BoardService", lambda auth_client: object())
    monkeypatch.setattr(app_module, "ThreadService", lambda auth_client: object())
    monkeypatch.setattr(app_module.RedisSyncCache, "from_env", classmethod(lambda cls: object()))
    monkeypatch.setattr(app_module, "SyncService", FakeSyncServiceCtor)

    app_module.build_sync_service()

    assert captured_kwargs["request_interval_seconds"] == 0.25
    assert captured_kwargs["sleep"] is app_module.time.sleep


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
        "window_minutes": 30,
        "scanned_pages": 2,
        "cutoff_at": "2026-05-03T21:40:00",
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
                        "posted_at": "Sat Apr 26 13:25:36 2026",
                        "body": "new reply",
                    }
                ],
            }
        ],
    }


def test_sync_endpoint_passes_board_name_and_window_minutes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    service = FakeSyncService()
    client = TestClient(create_app(sync_service=service))

    response = client.get(
        "/api/sync/updates",
        params={"board_name": "TestBoard", "window_minutes": 15},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert service.calls == [("TestBoard", 20, 15)]
    assert response.json()["board_name"] == "TestBoard"
    assert response.json()["window_minutes"] == 15


def test_sync_endpoint_passes_large_window_minutes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    service = FakeSyncService()
    client = TestClient(create_app(sync_service=service))

    response = client.get(
        "/api/sync/updates",
        params={"board_name": "JobInfo", "window_minutes": 5256000},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert service.calls == [("JobInfo", 20, 5256000)]


def test_sync_endpoint_passes_explicit_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    service = FakeSyncService()
    client = TestClient(create_app(sync_service=service))

    response = client.get(
        "/api/sync/updates",
        params={"board_name": "JobInfo", "window_minutes": 5256000, "limit": 200},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert service.calls == [("JobInfo", 200, 5256000)]


def test_sync_endpoint_returns_window_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    client = TestClient(create_app(sync_service=FakeSyncService()))

    response = client.get(
        "/api/sync/updates",
        params={"board_name": "TestBoard", "window_minutes": 15},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.json()["board_name"] == "TestBoard"
    assert response.json()["window_minutes"] == 15
    assert response.json()["scanned_pages"] == 2
    assert response.json()["cutoff_at"] == "2026-05-03T21:40:00"


def test_backfill_endpoint_returns_requested_thread_posts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    service = SyncService(
        board_service=FakeSyncService(),
        thread_service=FakeThreadService(
            posts=[
                SyncPost(
                    post_id="p20",
                    floor_label="20楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:00:00 2026",
                    body="old reply",
                ),
                SyncPost(
                    post_id="p21",
                    floor_label="21楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:05:00 2026",
                    body="old reply",
                ),
                SyncPost(
                    post_id="p22",
                    floor_label="22楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:10:00 2026",
                    body="new reply",
                ),
                SyncPost(
                    post_id="p23",
                    floor_label="23楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:15:00 2026",
                    body="new reply",
                ),
                SyncPost(
                    post_id="p24",
                    floor_label="24楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:20:00 2026",
                    body="new reply",
                ),
            ]
        ),
        cache=InMemorySyncCache(),
    )
    client = TestClient(create_app(sync_service=service))

    response = client.get(
        "/api/sync/backfill",
        params={"board_name": "test_board", "article_id": "123", "start_floor": 22},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "article_id": "123",
        "start_floor": 22,
        "posts": [
            {
                "post_id": "p22",
                "floor_label": "22楼",
                "author_display_name": "alice",
                "posted_at": "Sat Apr 26 09:10:00 2026",
                "body": "new reply",
            },
            {
                "post_id": "p23",
                "floor_label": "23楼",
                "author_display_name": "alice",
                "posted_at": "Sat Apr 26 09:15:00 2026",
                "body": "new reply",
            },
            {
                "post_id": "p24",
                "floor_label": "24楼",
                "author_display_name": "alice",
                "posted_at": "Sat Apr 26 09:20:00 2026",
                "body": "new reply",
            },
        ],
    }


def test_backfill_endpoint_trims_posts_before_start_floor(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    service = SyncService(
        board_service=FakeSyncService(),
        thread_service=FakeThreadService(
            posts=[
                SyncPost(
                    post_id="p20",
                    floor_label="20楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:00:00 2026",
                    body="old reply",
                ),
                SyncPost(
                    post_id="p21",
                    floor_label="21楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:05:00 2026",
                    body="old reply",
                ),
                SyncPost(
                    post_id="p22",
                    floor_label="22楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:10:00 2026",
                    body="new reply",
                ),
                SyncPost(
                    post_id="p23",
                    floor_label="23楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:15:00 2026",
                    body="new reply",
                ),
                SyncPost(
                    post_id="p24",
                    floor_label="24楼",
                    author_display_name="alice",
                    posted_at="Sat Apr 26 09:20:00 2026",
                    body="new reply",
                ),
            ]
        ),
        cache=InMemorySyncCache(),
    )
    client = TestClient(create_app(sync_service=service))

    response = client.get(
        "/api/sync/backfill",
        params={"board_name": "test_board", "article_id": "123", "start_floor": 22},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "article_id": "123",
        "start_floor": 22,
        "posts": [
            {
                "post_id": "p22",
                "floor_label": "22楼",
                "author_display_name": "alice",
                "posted_at": "Sat Apr 26 09:10:00 2026",
                "body": "new reply",
            },
            {
                "post_id": "p23",
                "floor_label": "23楼",
                "author_display_name": "alice",
                "posted_at": "Sat Apr 26 09:15:00 2026",
                "body": "new reply",
            },
            {
                "post_id": "p24",
                "floor_label": "24楼",
                "author_display_name": "alice",
                "posted_at": "Sat Apr 26 09:20:00 2026",
                "body": "new reply",
            },
        ],
    }


def test_thread_original_post_endpoint_returns_first_post(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    client = TestClient(create_app(sync_service=FakeSyncService()))

    response = client.get(
        "/api/sync/thread-original-post",
        params={"board_name": "IWhisper", "article_id": "123"},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "post_id": "123",
        "floor_label": "楼主",
        "author_display_name": "alice",
        "posted_at": "Sat Apr 25 18:07:24 2026",
        "body": "opening post",
    }


def test_thread_snapshot_endpoint_returns_full_snapshot(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    client = TestClient(create_app(sync_service=FakeSyncService()))

    response = client.get(
        "/api/sync/thread-snapshot",
        params={"board_name": "IWhisper", "article_id": "123", "start_floor": 2},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "article_id": "123",
        "start_floor": 2,
        "posts": [
            {
                "post_id": "p2",
                "floor_label": "第2楼",
                "author_display_name": "alice",
                "posted_at": "Sat Apr 26 09:10:00 2026",
                "body": "new reply 2",
            },
            {
                "post_id": "p3",
                "floor_label": "第3楼",
                "author_display_name": "bob",
                "posted_at": "Sat Apr 26 09:15:00 2026",
                "body": "new reply 3",
            },
        ],
    }


def test_backfill_endpoint_maps_value_error_to_400(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    client = TestClient(create_app(sync_service=RaisingSyncService()))

    response = client.get(
        "/api/sync/backfill",
        params={"board_name": "test_board", "article_id": "123", "start_floor": 22},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Requested rewind exceeds max backfill window"}


def test_backfill_endpoint_rejects_invalid_start_floor(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    client = TestClient(create_app(sync_service=FakeSyncService()))

    response = client.get(
        "/api/sync/backfill",
        params={"board_name": "test_board", "article_id": "123", "start_floor": 0},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 422


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
