# First Sync API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为后端增加首个面向前端的同步 API，包括轻量 token 鉴权、Redis 三天短期缓存、主增量拉取接口、指定帖子补拉接口，并同步收缩说明文档边界。

**Architecture:** 在现有 `byr_auth`、`byr_boards`、`byr_threads` 采集能力之上新增一层很薄的 HTTP 服务。HTTP 层只负责请求校验、鉴权、序列化和错误映射；增量同步与补拉语义集中在新的 `byr_sync` 模块，Redis 只作为三天短期缓存，不承担最终业务存储。

**Tech Stack:** Python 3.12, FastAPI, Uvicorn, redis-py, httpx, pytest

---

## 文件结构

- 修改: `backend/pyproject.toml`
  - 增加 `fastapi`、`uvicorn`、`redis` 依赖，并注册新的脚本入口。
- 修改: `backend/README.md`
  - 补充 Redis、本地 API 启动方式、token 配置、测试命令。
- 修改: `backend/AGENTS.md`
  - 删除产品级背景，收缩为后端职责边界。
- 新建: `backend/src/byr_api/__init__.py`
  - API 入口与 `main()`。
- 新建: `backend/src/byr_api/app.py`
  - FastAPI 应用、路由注册、错误处理。
- 新建: `backend/src/byr_api/auth.py`
  - 基于固定 token 的请求鉴权依赖。
- 新建: `backend/src/byr_api/models.py`
  - API 请求与响应模型。
- 新建: `backend/src/byr_sync/__init__.py`
  - 导出同步服务。
- 新建: `backend/src/byr_sync/cache.py`
  - Redis 访问层与三天 TTL 常量。
- 新建: `backend/src/byr_sync/models.py`
  - 增量同步内部数据结构。
- 新建: `backend/src/byr_sync/service.py`
  - 主拉取与定向补拉核心逻辑。
- 新建: `backend/tests/unit/byr_api/test_app.py`
  - API 路由、鉴权、错误码测试。
- 新建: `backend/tests/unit/byr_sync/test_service.py`
  - Redis 缓存、增量窗口、补拉语义测试。

### Task 1: 收缩说明文档并补充运行说明

**Files:**
- Modify: `backend/AGENTS.md`
- Modify: `backend/README.md`

- [ ] **Step 1: 写出文档边界调整内容**

```md
# backend/AGENTS.md

## 后端职责

1. 管理北邮人登录态与 cookie 复用。
2. 采集版面页与帖子页。
3. 维护短期同步缓存。
4. 向前端暴露同步 API。

## 不属于后端的内容

1. 论坛产品规则。
2. 机器人与真实用户的关系设计。
3. 通知产品交互方案。
4. 用户认领帖子或回复的产品逻辑。
```

```md
# backend/README.md 追加片段

## Sync API Setup

1. 启动本地 Redis:

   ```bash
   docker run --name bbsachieve-redis -p 6379:6379 redis:7-alpine
   ```

2. 在 `backend/.env` 中增加:

   ```env
   BYR_SYNC_API_TOKEN=dev-token
   BYR_SYNC_REDIS_URL=redis://127.0.0.1:6379/0
   ```

3. 启动 API:

   ```bash
   uv run byr-sync-api
   ```
```

- [ ] **Step 2: 手工更新文档**

把 `backend/AGENTS.md` 中的产品级背景删掉，只保留后端职责与约束。把上面的 `README` 片段追加到 [backend/README.md](/home/yinyra/code/bbsAchieve/backend/README.md) 末尾，保留现有 CLI 说明。

- [ ] **Step 3: 检查文档措辞**

Run: `sed -n '1,260p' backend/AGENTS.md && sed -n '1,260p' backend/README.md`  
Expected: `backend/AGENTS.md` 只讨论后端边界，`README` 包含 Redis、本地 token、API 启动步骤。

- [ ] **Step 4: 提交文档调整**

```bash
git add backend/AGENTS.md backend/README.md
git commit -m "docs: narrow backend guidance for sync api work"
```

### Task 2: 搭起最小 FastAPI 服务骨架与 token 鉴权

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/src/byr_api/__init__.py`
- Create: `backend/src/byr_api/app.py`
- Create: `backend/src/byr_api/auth.py`
- Create: `backend/src/byr_api/models.py`
- Test: `backend/tests/unit/byr_api/test_app.py`

- [ ] **Step 1: 先写失败测试**

```python
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
    assert response.json()["detail"] == "Invalid sync API token"
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd backend && uv run pytest tests/unit/byr_api/test_app.py -v`  
Expected: FAIL，提示 `ModuleNotFoundError: No module named 'fastapi'` 或 `No module named 'byr_api'`。

- [ ] **Step 3: 写最小实现**

```toml
# backend/pyproject.toml
dependencies = [
    "beautifulsoup4>=4.14.3",
    "fastapi>=0.116.1",
    "httpx>=0.28.1",
    "python-dotenv>=1.1.1",
    "redis>=6.0.0",
    "uvicorn>=0.35.0",
]

[project.scripts]
byr-auth = "byr_cli:main"
byr-bbs = "byr_cli:main"
byr-sync-api = "byr_api:main"
```

```python
# backend/src/byr_api/auth.py
from __future__ import annotations

import os

from fastapi import Header, HTTPException, status
from dotenv import dotenv_values


def require_sync_token(x_sync_token: str | None = Header(default=None)) -> str:
    env = dotenv_values()
    expected = os.getenv("BYR_SYNC_API_TOKEN") or env.get("BYR_SYNC_API_TOKEN")
    if not expected or x_sync_token != str(expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid sync API token",
        )
    return str(expected)
```

```python
# backend/src/byr_api/app.py
from __future__ import annotations

from fastapi import Depends, FastAPI

from .auth import require_sync_token


def create_app() -> FastAPI:
    app = FastAPI(title="BYR Sync API")

    @app.get("/healthz")
    def healthcheck() -> dict[str, bool]:
        return {"ok": True}

    @app.get("/api/sync/updates")
    def list_updates(_: str = Depends(require_sync_token)) -> dict[str, list[object]]:
        return {"threads": []}

    return app
```

```python
# backend/src/byr_api/__init__.py
from __future__ import annotations

import uvicorn

from .app import create_app


def main() -> int:
    uvicorn.run(create_app(), host="127.0.0.1", port=8000)
    return 0
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `cd backend && uv sync && uv run pytest tests/unit/byr_api/test_app.py -v`  
Expected: PASS，两个用例通过。

- [ ] **Step 5: 提交骨架**

```bash
git add backend/pyproject.toml backend/src/byr_api backend/tests/unit/byr_api/test_app.py
git commit -m "feat: add sync api skeleton with token auth"
```

### Task 3: 实现 Redis 缓存层与同步内部模型

**Files:**
- Create: `backend/src/byr_sync/__init__.py`
- Create: `backend/src/byr_sync/cache.py`
- Create: `backend/src/byr_sync/models.py`
- Test: `backend/tests/unit/byr_sync/test_service.py`

- [ ] **Step 1: 先写缓存行为测试**

```python
from byr_sync.cache import THREAD_TTL_SECONDS, InMemorySyncCache


def test_save_thread_progress_sets_three_day_ttl() -> None:
    cache = InMemorySyncCache()

    cache.save_thread_progress(
        board_name="IWhisper",
        article_id="123",
        reply_count=23,
    )

    entry = cache.thread_progress["IWhisper:123"]
    assert entry.reply_count == 23
    assert entry.ttl_seconds == THREAD_TTL_SECONDS
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py -v`  
Expected: FAIL，提示 `No module named 'byr_sync'`。

- [ ] **Step 3: 写最小缓存实现**

```python
# backend/src/byr_sync/models.py
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class ThreadProgress:
    board_name: str
    article_id: str
    reply_count: int
    ttl_seconds: int
    recent_post_ids: list[str] = field(default_factory=list)
```

```python
# backend/src/byr_sync/cache.py
from __future__ import annotations

from dataclasses import dataclass

from .models import ThreadProgress

THREAD_TTL_SECONDS = 3 * 24 * 60 * 60


@dataclass(slots=True)
class InMemorySyncCache:
    thread_progress: dict[str, ThreadProgress] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.thread_progress is None:
            self.thread_progress = {}

    def save_thread_progress(
        self,
        *,
        board_name: str,
        article_id: str,
        reply_count: int,
        recent_post_ids: list[str] | None = None,
    ) -> None:
        self.thread_progress[f"{board_name}:{article_id}"] = ThreadProgress(
            board_name=board_name,
            article_id=article_id,
            reply_count=reply_count,
            ttl_seconds=THREAD_TTL_SECONDS,
            recent_post_ids=recent_post_ids or [],
        )
```

```python
# backend/src/byr_sync/__init__.py
from .cache import THREAD_TTL_SECONDS, InMemorySyncCache

__all__ = ["THREAD_TTL_SECONDS", "InMemorySyncCache"]
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py -v`  
Expected: PASS，TTL 为 `259200` 秒。

- [ ] **Step 5: 提交缓存基线**

```bash
git add backend/src/byr_sync backend/tests/unit/byr_sync/test_service.py
git commit -m "feat: add sync cache primitives"
```

### Task 4: 实现主增量拉取服务

**Files:**
- Create: `backend/src/byr_sync/service.py`
- Modify: `backend/src/byr_api/models.py`
- Modify: `backend/src/byr_api/app.py`
- Test: `backend/tests/unit/byr_sync/test_service.py`
- Test: `backend/tests/unit/byr_api/test_app.py`

- [ ] **Step 1: 先写主拉取失败测试**

```python
from byr_boards.models import BoardPageResult, BoardThread
from byr_sync.cache import InMemorySyncCache
from byr_sync.service import SyncService


class FakeBoardService:
    def fetch_page(self, **_: object) -> BoardPageResult:
        return BoardPageResult(
            board_name="IWhisper",
            page=1,
            user_id="42",
            reused_cookies=True,
            requested_url="https://bbs.byr.cn/board/IWhisper",
            online_users=None,
            max_online_users=None,
            max_online_at="",
            today_post_count=None,
            total_pages=1,
            has_next_page=False,
            threads=[
                BoardThread(
                    title="测试帖子",
                    article_url="/article/IWhisper/123",
                    article_id="123",
                    state_icon="",
                    post_time="",
                    author="IWhisper#1",
                    reply_count=23,
                    latest_reply_time="2026-05-01 10:00:00",
                    latest_reply_url="/article/IWhisper/123?p=3",
                    latest_reply_author="IWhisper#2",
                )
            ],
        )


def test_list_updates_returns_changed_threads() -> None:
    service = SyncService(
        board_service=FakeBoardService(),
        thread_service=None,
        cache=InMemorySyncCache(),
    )

    result = service.list_updates(board_name="IWhisper", limit=20)

    assert len(result.threads) == 1
    assert result.threads[0].article_id == "123"
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py::test_list_updates_returns_changed_threads -v`  
Expected: FAIL，提示 `No module named 'byr_sync.service'` 或 `AttributeError`。

- [ ] **Step 3: 写最小实现**

```python
# backend/src/byr_sync/models.py 追加
@dataclass(slots=True)
class SyncThread:
    article_id: str
    title: str
    reply_count: int


@dataclass(slots=True)
class SyncUpdateResult:
    board_name: str
    threads: list[SyncThread]
```

```python
# backend/src/byr_sync/service.py
from __future__ import annotations

from byr_boards import BoardService
from byr_threads import ThreadService

from .cache import InMemorySyncCache
from .models import SyncThread, SyncUpdateResult


class SyncService:
    def __init__(
        self,
        *,
        board_service: BoardService,
        thread_service: ThreadService | None,
        cache: InMemorySyncCache,
    ) -> None:
        self.board_service = board_service
        self.thread_service = thread_service
        self.cache = cache

    def list_updates(self, *, board_name: str, limit: int) -> SyncUpdateResult:
        board_page = self.board_service.fetch_page(board_name=board_name, page=1)
        threads: list[SyncThread] = []
        for thread in board_page.threads[:limit]:
            reply_count = thread.reply_count or 0
            self.cache.save_thread_progress(
                board_name=board_name,
                article_id=thread.article_id,
                reply_count=reply_count,
            )
            threads.append(
                SyncThread(
                    article_id=thread.article_id,
                    title=thread.title,
                    reply_count=reply_count,
                )
            )
        return SyncUpdateResult(board_name=board_name, threads=threads)
```

```python
# backend/src/byr_api/models.py
from __future__ import annotations

from pydantic import BaseModel


class SyncThreadResponse(BaseModel):
    article_id: str
    title: str
    reply_count: int


class SyncUpdatesResponse(BaseModel):
    board_name: str
    threads: list[SyncThreadResponse]
```

```python
# backend/src/byr_api/app.py 追加核心片段
from byr_auth import ByrAuthClient
from byr_boards import BoardService
from byr_sync.cache import InMemorySyncCache
from byr_sync.service import SyncService


def build_sync_service() -> SyncService:
    auth_client = ByrAuthClient()
    return SyncService(
        board_service=BoardService(auth_client),
        thread_service=None,
        cache=InMemorySyncCache(),
    )
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py tests/unit/byr_api/test_app.py -v`  
Expected: PASS，主拉取接口返回线程列表。

- [ ] **Step 5: 提交主拉取服务**

```bash
git add backend/src/byr_sync/service.py backend/src/byr_api/models.py backend/src/byr_api/app.py backend/tests/unit/byr_sync/test_service.py backend/tests/unit/byr_api/test_app.py
git commit -m "feat: add sync updates service"
```

### Task 5: 为主拉取加入帖子回复详情与短期缓存对齐

**Files:**
- Modify: `backend/src/byr_sync/models.py`
- Modify: `backend/src/byr_sync/cache.py`
- Modify: `backend/src/byr_sync/service.py`
- Modify: `backend/src/byr_api/models.py`
- Test: `backend/tests/unit/byr_sync/test_service.py`

- [ ] **Step 1: 先写“返回新回复”的失败测试**

```python
from byr_threads.models import ThreadPageResult, ThreadPost


class FakeThreadService:
    def fetch_page(self, **_: object) -> ThreadPageResult:
        return ThreadPageResult(
            board_name="IWhisper",
            article_id="123",
            page=3,
            user_id="42",
            reused_cookies=True,
            requested_url="https://bbs.byr.cn/article/IWhisper/123?p=3",
            thread_title="测试帖子",
            post_count=24,
            total_pages=3,
            has_next_page=False,
            posts=[
                ThreadPost(
                    post_id="p24",
                    floor_label="24楼",
                    is_original_post=False,
                    author_display_name="IWhisper#9",
                    is_anonymous=True,
                    anonymous_id=9,
                    posted_at="2026-05-01 10:05:00",
                    title="Re: 测试帖子",
                    body="新回复",
                )
            ],
        )


def test_list_updates_includes_new_posts_after_cached_reply_count() -> None:
    cache = InMemorySyncCache()
    cache.save_thread_progress(board_name="IWhisper", article_id="123", reply_count=23)
    service = SyncService(
        board_service=FakeBoardService(),
        thread_service=FakeThreadService(),
        cache=cache,
    )

    result = service.list_updates(board_name="IWhisper", limit=20)

    assert result.threads[0].posts[0].post_id == "p24"
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py::test_list_updates_includes_new_posts_after_cached_reply_count -v`  
Expected: FAIL，提示 `SyncThread` 没有 `posts` 字段。

- [ ] **Step 3: 写最小实现**

```python
# backend/src/byr_sync/models.py 追加
@dataclass(slots=True)
class SyncPost:
    post_id: str
    floor_label: str
    author_display_name: str
    body: str


@dataclass(slots=True)
class SyncThread:
    article_id: str
    title: str
    reply_count: int
    posts: list[SyncPost]
```

```python
# backend/src/byr_sync/service.py 替换 list_updates 中的主体逻辑
cached = self.cache.thread_progress.get(f"{board_name}:{thread.article_id}")
cached_reply_count = cached.reply_count if cached else 0
posts: list[SyncPost] = []
if self.thread_service is not None and reply_count > cached_reply_count:
    thread_page = self.thread_service.fetch_page(
        board_name=board_name,
        article_id=thread.article_id,
        page=max(1, ((cached_reply_count + 1) // 10) + 1),
    )
    posts = [
        SyncPost(
            post_id=post.post_id,
            floor_label=post.floor_label,
            author_display_name=post.author_display_name,
            body=post.body,
        )
        for post in thread_page.posts
    ]
self.cache.save_thread_progress(
    board_name=board_name,
    article_id=thread.article_id,
    reply_count=reply_count,
    recent_post_ids=[post.post_id for post in posts],
)
threads.append(
    SyncThread(
        article_id=thread.article_id,
        title=thread.title,
        reply_count=reply_count,
        posts=posts,
    )
)
```

```python
# backend/src/byr_api/models.py 追加
class SyncPostResponse(BaseModel):
    post_id: str
    floor_label: str
    author_display_name: str
    body: str


class SyncThreadResponse(BaseModel):
    article_id: str
    title: str
    reply_count: int
    posts: list[SyncPostResponse]
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py -v`  
Expected: PASS，能返回缓存基线之后的新回复。

- [ ] **Step 5: 提交回复增量能力**

```bash
git add backend/src/byr_sync/models.py backend/src/byr_sync/cache.py backend/src/byr_sync/service.py backend/src/byr_api/models.py backend/tests/unit/byr_sync/test_service.py
git commit -m "feat: include incremental thread replies in sync updates"
```

### Task 6: 实现指定帖子补拉接口

**Files:**
- Modify: `backend/src/byr_sync/models.py`
- Modify: `backend/src/byr_sync/service.py`
- Modify: `backend/src/byr_api/models.py`
- Modify: `backend/src/byr_api/app.py`
- Test: `backend/tests/unit/byr_sync/test_service.py`
- Test: `backend/tests/unit/byr_api/test_app.py`

- [ ] **Step 1: 先写补拉失败测试**

```python
import pytest


def test_backfill_thread_rejects_rewind_beyond_limit() -> None:
    cache = InMemorySyncCache()
    cache.save_thread_progress(board_name="IWhisper", article_id="123", reply_count=23)
    service = SyncService(
        board_service=FakeBoardService(),
        thread_service=FakeThreadService(),
        cache=cache,
    )

    with pytest.raises(ValueError, match="Requested rewind exceeds max backfill window"):
        service.backfill_thread(
            board_name="IWhisper",
            article_id="123",
            start_floor=1,
            max_backfill_window=10,
        )
```

```python
def test_backfill_endpoint_returns_requested_thread_posts() -> None:
    app = create_app()
    client = TestClient(app)

    response = client.get(
        "/api/sync/backfill",
        params={"board_name": "IWhisper", "article_id": "123", "start_floor": 22},
        headers={"x-sync-token": "dev-token"},
    )

    assert response.status_code == 200
    assert response.json()["thread"]["article_id"] == "123"
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py tests/unit/byr_api/test_app.py -v`  
Expected: FAIL，提示 `SyncService` 缺少 `backfill_thread` 或路由不存在。

- [ ] **Step 3: 写最小实现**

```python
# backend/src/byr_sync/models.py 追加
@dataclass(slots=True)
class BackfillResult:
    board_name: str
    article_id: str
    start_floor: int
    posts: list[SyncPost]
```

```python
# backend/src/byr_sync/service.py 追加
    def backfill_thread(
        self,
        *,
        board_name: str,
        article_id: str,
        start_floor: int,
        max_backfill_window: int,
    ) -> BackfillResult:
        cached = self.cache.thread_progress.get(f"{board_name}:{article_id}")
        cached_reply_count = cached.reply_count if cached else 0
        if cached_reply_count and cached_reply_count - start_floor > max_backfill_window:
            raise ValueError("Requested rewind exceeds max backfill window")

        if self.thread_service is None:
            raise ValueError("Thread service is required for backfill")

        thread_page = self.thread_service.fetch_page(
            board_name=board_name,
            article_id=article_id,
            page=max(1, ((start_floor - 1) // 10) + 1),
        )
        posts = [
            SyncPost(
                post_id=post.post_id,
                floor_label=post.floor_label,
                author_display_name=post.author_display_name,
                body=post.body,
            )
            for post in thread_page.posts
        ]
        return BackfillResult(
            board_name=board_name,
            article_id=article_id,
            start_floor=start_floor,
            posts=posts,
        )
```

```python
# backend/src/byr_api/app.py 追加核心片段
from fastapi import HTTPException, Query


    @app.get("/api/sync/backfill")
    def backfill_thread(
        board_name: str = Query(...),
        article_id: str = Query(...),
        start_floor: int = Query(..., ge=1),
        _: str = Depends(require_sync_token),
    ) -> dict[str, object]:
        try:
            result = build_sync_service().backfill_thread(
                board_name=board_name,
                article_id=article_id,
                start_floor=start_floor,
                max_backfill_window=30,
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        return {
            "thread": {
                "article_id": result.article_id,
                "start_floor": result.start_floor,
                "posts": [post.__dict__ for post in result.posts],
            }
        }
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py tests/unit/byr_api/test_app.py -v`  
Expected: PASS，超过窗口会返回明确错误，正常补拉可返回指定帖子结果。

- [ ] **Step 5: 提交补拉能力**

```bash
git add backend/src/byr_sync/models.py backend/src/byr_sync/service.py backend/src/byr_api/models.py backend/src/byr_api/app.py backend/tests/unit/byr_sync/test_service.py backend/tests/unit/byr_api/test_app.py
git commit -m "feat: add targeted sync backfill endpoint"
```

### Task 7: 用真实 Redis 客户端替换内存缓存并完成收尾验证

**Files:**
- Modify: `backend/src/byr_sync/cache.py`
- Modify: `backend/src/byr_api/app.py`
- Modify: `backend/README.md`
- Test: `backend/tests/unit/byr_sync/test_service.py`

- [ ] **Step 1: 先写 Redis 适配失败测试**

```python
from byr_sync.cache import RedisSyncCache


class FakeRedis:
    def __init__(self) -> None:
        self.saved: dict[str, tuple[dict[str, object], int]] = {}

    def hset(self, key: str, mapping: dict[str, object]) -> None:
        self.saved[key] = (mapping, 0)

    def expire(self, key: str, seconds: int) -> None:
        mapping, _ = self.saved[key]
        self.saved[key] = (mapping, seconds)


def test_redis_cache_sets_expire_when_saving_progress() -> None:
    redis_client = FakeRedis()
    cache = RedisSyncCache(redis_client)

    cache.save_thread_progress(board_name="IWhisper", article_id="123", reply_count=23)

    assert redis_client.saved["sync:thread:IWhisper:123"][1] == THREAD_TTL_SECONDS
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `cd backend && uv run pytest tests/unit/byr_sync/test_service.py::test_redis_cache_sets_expire_when_saving_progress -v`  
Expected: FAIL，提示 `RedisSyncCache` 未定义。

- [ ] **Step 3: 写 Redis 适配实现**

```python
# backend/src/byr_sync/cache.py 追加
from __future__ import annotations

import json
import os

from redis import Redis


class RedisSyncCache:
    def __init__(self, redis_client: Redis) -> None:
        self.redis_client = redis_client

    @classmethod
    def from_env(cls) -> "RedisSyncCache":
        url = os.getenv("BYR_SYNC_REDIS_URL", "redis://127.0.0.1:6379/0")
        return cls(Redis.from_url(url, decode_responses=True))

    def save_thread_progress(
        self,
        *,
        board_name: str,
        article_id: str,
        reply_count: int,
        recent_post_ids: list[str] | None = None,
    ) -> None:
        key = f"sync:thread:{board_name}:{article_id}"
        self.redis_client.hset(
            key,
            mapping={
                "board_name": board_name,
                "article_id": article_id,
                "reply_count": reply_count,
                "recent_post_ids": json.dumps(recent_post_ids or []),
            },
        )
        self.redis_client.expire(key, THREAD_TTL_SECONDS)
```

```python
# backend/src/byr_api/app.py 中 build_sync_service 替换
from byr_sync.cache import RedisSyncCache


def build_sync_service() -> SyncService:
    auth_client = ByrAuthClient()
    return SyncService(
        board_service=BoardService(auth_client),
        thread_service=ThreadService(auth_client),
        cache=RedisSyncCache.from_env(),
    )
```

- [ ] **Step 4: 运行全量后端测试**

Run: `cd backend && uv run pytest -q`  
Expected: PASS，现有采集测试与新增 API/同步测试全部通过。

- [ ] **Step 5: 提交收尾变更**

```bash
git add backend/src/byr_sync/cache.py backend/src/byr_api/app.py backend/README.md backend/tests/unit/byr_sync/test_service.py
git commit -m "feat: wire sync service to redis cache"
```

## 自查

### Spec 覆盖

- 根目录与 `backend/AGENTS.md` 边界: Task 1
- 轻量 token 鉴权: Task 2
- 主拉取接口: Task 4
- 增量回复返回: Task 5
- 指定帖子补拉: Task 6
- Redis 三天缓存: Task 3, Task 7
- 测试与运行说明: Task 1, Task 2, Task 7

没有发现未覆盖的 spec 条目。

### 占位符扫描

本计划未使用 `TODO`、`TBD`、`implement later`、`similar to` 等占位符表述。

### 类型一致性

- `SyncService.list_updates()` 在 Task 4 定义，并在 Task 5 扩展返回 `posts`。
- `SyncService.backfill_thread()` 在 Task 6 定义，使用的 `SyncPost`、`BackfillResult` 都在同任务前置定义。
- 缓存 TTL 常量始终使用 `THREAD_TTL_SECONDS`。
