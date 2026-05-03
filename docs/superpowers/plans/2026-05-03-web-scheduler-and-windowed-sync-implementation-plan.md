# Web 端硬编码定时任务与窗口化同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/web` 增加硬编码定时任务能力，首条任务每 20 分钟同步一次 `IWhisper` 最近 30 分钟内容，并让 `admin` 可查看任务与执行历史、手动立即执行一次。

**Architecture:** 后端先把同步 API 升级为“按时间窗口翻页到越界为止”的候选主题采集入口，并继续复用现有增量语义。Web 端新增进程内调度器、任务注册表和独立执行历史表，自动调度与手动触发共用同一个 runner，最终仍复用现有 `mapSyncPayload -> importSyncBatch` 写库链路。

**Tech Stack:** Python 3.12 + FastAPI + pytest；Next.js 16 App Router + TypeScript + Prisma + Vitest。

---

## 文件结构与职责

### Backend

- Modify: `backend/src/byr_auth/client.py`
  - 修复会话 JSON 解码在非 UTF-8 响应下的兼容性，避免窗口翻页时深页请求因编码判断错误而失败。
- Modify: `backend/tests/unit/byr_auth/test_client.py`
  - 为 JSON 自动解码回退策略补测试。
- Modify: `backend/src/byr_boards/models.py`
  - 为版面主题补充窗口判断所需的归一化时间字段或解析辅助字段。
- Modify: `backend/src/byr_sync/service.py`
  - 将 `list_updates` 从“第一页前 N 条”升级为“按窗口翻页 + 候选主题增量抓取”。
- Modify: `backend/src/byr_api/app.py`
  - 为 `/api/sync/updates` 增加 `board_name` 与 `window_minutes` 查询参数。
- Modify: `backend/src/byr_api/models.py`
  - 如有需要，为响应模型补充 `window_minutes`、`scanned_pages`、`cutoff_at`。
- Modify: `backend/tests/unit/byr_sync/test_service.py`
  - 覆盖时间解析、窗口停止翻页、边界页保留、增量语义复用。
- Modify: `backend/tests/unit/byr_api/test_app.py`
  - 覆盖带查询参数的同步接口行为。

### Web

- Modify: `apps/web/prisma/schema.prisma`
  - 新增定时任务执行历史表与相关枚举。
- Create: `apps/web/prisma/migrations/20260503xxxxxx_add_scheduled_task_runs/migration.sql`
  - 生成执行历史表迁移。
- Modify: `apps/web/src/server/imports/syncTypes.ts`
  - 为新的后端同步 payload 元信息补类型。
- Modify: `apps/web/src/server/imports/fetchSyncUpdates.ts`
  - 支持传入 `boardName` 与 `windowMinutes` 请求参数。
- Create: `apps/web/src/server/scheduler/taskRegistry.ts`
  - 硬编码任务定义。
- Create: `apps/web/src/server/scheduler/runScheduledTask.ts`
  - 单次任务执行入口，复用现有同步导入链路。
- Create: `apps/web/src/server/scheduler/scheduledTaskRunStore.ts`
  - 执行历史的 Prisma 读写封装。
- Create: `apps/web/src/server/scheduler/webScheduler.ts`
  - 进程内调度器单例、循环注册、重入保护。
- Create: `apps/web/instrumentation.ts`
  - 在 server instance 启动时初始化调度器。
- Create: `apps/web/src/server/admin/listScheduledTasks.ts`
  - 聚合代码注册表与最近执行历史，供 admin 页面读取。
- Create: `apps/web/app/admin/scheduled-tasks/page.tsx`
  - 新的 admin 定时任务页面。
- Create: `apps/web/app/admin/api/scheduled-tasks/[taskKey]/run/route.ts`
  - 手动立即执行接口。
- Modify: `apps/web/app/admin/page.tsx`
  - 给管理员总览补一个跳转入口。

### Web Tests

- Modify: `apps/web/tests/server/fetchSyncUpdates.test.ts`
  - 验证请求参数与错误处理。
- Create: `apps/web/tests/server/runScheduledTask.test.ts`
  - 覆盖 runner 的成功、失败、重入跳过。
- Create: `apps/web/tests/server/listScheduledTasks.test.ts`
  - 覆盖 admin 数据聚合。
- Create: `apps/web/tests/admin-scheduled-tasks-route.test.ts`
  - 覆盖手动立即执行接口。
- Create: `apps/web/tests/admin-scheduled-tasks-page.test.tsx`
  - 覆盖页面渲染。

## 任务分解

### Task 1: 修复后端认证 JSON 解码兼容性

**Files:**
- Modify: `backend/src/byr_auth/client.py`
- Modify: `backend/tests/unit/byr_auth/test_client.py`

- [ ] **Step 1: 写失败测试，覆盖 `utf-8` 标错但正文实际是 `gbk` 的会话 JSON**

```python
def test_parse_json_falls_back_when_response_encoding_is_wrong() -> None:
    response = make_response(
        content='{"ajax_msg":"登录成功"}'.encode("gbk"),
        encoding="utf-8",
    )

    payload = ByrAuthClient._parse_json(response)

    assert payload["ajax_msg"] == "登录成功"
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest tests/unit/byr_auth/test_client.py::test_parse_json_falls_back_when_response_encoding_is_wrong -q
```

Expected: FAIL，报 `UnicodeDecodeError` 或断言失败。

- [ ] **Step 3: 写最小实现，为 `_decode_text` 增加编码回退**

```python
    @staticmethod
    def _decode_text(response: httpx.Response) -> str:
        attempted_encodings: list[str] = []
        for encoding in [response.encoding, "utf-8", "gbk", "gb18030"]:
            if not encoding or encoding in attempted_encodings:
                continue
            attempted_encodings.append(encoding)
            try:
                return response.content.decode(encoding)
            except UnicodeDecodeError:
                continue
        return response.content.decode("utf-8", errors="replace")
```

- [ ] **Step 4: 运行后端认证测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest tests/unit/byr_auth/test_client.py -q
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add backend/src/byr_auth/client.py backend/tests/unit/byr_auth/test_client.py
git commit -m "修复后端认证 JSON 解码兼容性"
```

### Task 2: 为后端同步服务补时间归一化与窗口筛选测试

**Files:**
- Modify: `backend/tests/unit/byr_sync/test_service.py`

- [ ] **Step 1: 写失败测试，覆盖 `HH:MM:SS` 解析为当天时间**

```python
def test_parse_board_time_treats_clock_time_as_today(monkeypatch: pytest.MonkeyPatch) -> None:
    reference_now = datetime(2026, 5, 3, 22, 10, 0)

    parsed = SyncService._parse_board_time("22:03:42", now=reference_now)

    assert parsed == datetime(2026, 5, 3, 22, 3, 42)
```

- [ ] **Step 2: 写失败测试，覆盖 `YYYY-MM-DD` 补成 `23:59:59`**

```python
def test_parse_board_time_treats_date_only_as_end_of_day() -> None:
    parsed = SyncService._parse_board_time("2026-05-02", now=datetime(2026, 5, 3, 22, 10, 0))

    assert parsed == datetime(2026, 5, 2, 23, 59, 59)
```

- [ ] **Step 3: 写失败测试，覆盖窗口内翻页直到边界页停止**

```python
def test_list_updates_scans_until_first_page_with_out_of_window_thread() -> None:
    page_1 = FakeBoardPage(
        threads=[
            FakeBoardThread(
                article_id="a1",
                title="in window",
                reply_count=0,
                post_time="21:50:00",
                latest_reply_time="22:05:00",
            ),
        ],
        has_next_page=True,
    )
    page_2 = FakeBoardPage(
        threads=[
            FakeBoardThread(
                article_id="a2",
                title="boundary in window",
                reply_count=0,
                post_time="21:20:00",
                latest_reply_time="21:45:00",
            ),
            FakeBoardThread(
                article_id="a3",
                title="out of window",
                reply_count=0,
                post_time="20:00:00",
                latest_reply_time="20:10:00",
            ),
        ],
        has_next_page=True,
    )
    board_service = FakePagedBoardService({1: page_1, 2: page_2})
    service = SyncService(
        board_service=board_service,
        thread_service=FakeThreadService(),
        cache=InMemorySyncCache(),
    )

    result = service.list_updates(
        board_name="IWhisper",
        limit=20,
        window_minutes=30,
        now=datetime(2026, 5, 3, 22, 10, 0),
    )

    assert [thread.article_id for thread in result.threads] == ["a1", "a2"]
    assert board_service.calls == [("IWhisper", 1), ("IWhisper", 2)]
```

- [ ] **Step 4: 写失败测试，覆盖“无回复时退回发帖时间”**

```python
def test_list_updates_uses_post_time_when_reply_time_is_empty() -> None:
    board_service = FakePagedBoardService(
        {
            1: FakeBoardPage(
                threads=[
                    FakeBoardThread(
                        article_id="a1",
                        title="new post",
                        reply_count=0,
                        post_time="22:00:00",
                        latest_reply_time="",
                    ),
                ],
                has_next_page=False,
            )
        }
    )
    service = SyncService(
        board_service=board_service,
        thread_service=FakeThreadService(),
        cache=InMemorySyncCache(),
    )

    result = service.list_updates(
        board_name="IWhisper",
        limit=20,
        window_minutes=30,
        now=datetime(2026, 5, 3, 22, 10, 0),
    )

    assert [thread.article_id for thread in result.threads] == ["a1"]
```

- [ ] **Step 5: 运行这些测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest \
  tests/unit/byr_sync/test_service.py::test_parse_board_time_treats_clock_time_as_today \
  tests/unit/byr_sync/test_service.py::test_parse_board_time_treats_date_only_as_end_of_day \
  tests/unit/byr_sync/test_service.py::test_list_updates_scans_until_first_page_with_out_of_window_thread \
  tests/unit/byr_sync/test_service.py::test_list_updates_uses_post_time_when_reply_time_is_empty \
  -q
```

Expected: FAIL，提示 `list_updates()` 参数不匹配或 `_parse_board_time` 未定义。

- [ ] **Step 6: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add backend/tests/unit/byr_sync/test_service.py
git commit -m "补充窗口同步时间解析测试"
```

### Task 3: 实现后端时间窗口翻页与归一化解析

**Files:**
- Modify: `backend/src/byr_boards/models.py`
- Modify: `backend/src/byr_sync/service.py`
- Test: `backend/tests/unit/byr_sync/test_service.py`

- [ ] **Step 1: 给测试假对象补窗口同步所需字段**

```python
@dataclass(slots=True)
class FakeBoardThread:
    article_id: str
    title: str
    reply_count: int | None
    post_time: str
    latest_reply_time: str


@dataclass(slots=True)
class FakeBoardPage:
    threads: list[FakeBoardThread]
    has_next_page: bool = False


class FakePagedBoardService:
    def __init__(self, pages: dict[int, FakeBoardPage]) -> None:
        self.pages = pages
        self.calls: list[tuple[str, int]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> FakeBoardPage:
        self.calls.append((board_name, page))
        return self.pages[page]
```

- [ ] **Step 2: 调整 `BoardThreadLike` 与 `BoardPageLike` 协议，允许同步服务读时间与翻页标记**

```python
class BoardThreadLike(Protocol):
    article_id: str
    title: str
    reply_count: int | None
    post_time: str
    latest_reply_time: str


class BoardPageLike(Protocol):
    threads: list[BoardThreadLike]
    has_next_page: bool
```

- [ ] **Step 3: 为 `SyncService.list_updates` 增加窗口与当前时间参数**

```python
    def list_updates(
        self,
        *,
        board_name: str,
        limit: int,
        window_minutes: int | None = None,
        now: datetime | None = None,
    ) -> SyncUpdateResult:
        reference_now = now or datetime.now()
        candidate_threads = self._collect_candidate_threads(
            board_name=board_name,
            limit=limit,
            window_minutes=window_minutes,
            now=reference_now,
        )
        threads: list[SyncThread] = []
        for thread in candidate_threads:
            reply_count = thread.reply_count or 0
            cached = self.cache.get_thread_progress(
                board_name=board_name,
                article_id=thread.article_id,
            )
            cached_reply_count = cached.reply_count if cached else 0
            posts: list[SyncPost] = []
            should_fetch_thread_page = (
                self.thread_service is not None
                and (
                    reply_count > cached_reply_count
                    or (cached is None and reply_count == 0)
                    or (cached is not None and reply_count == 0 and not cached.recent_post_ids)
                )
            )
            if should_fetch_thread_page:
                page = 1 if cached is None else max(1, ((cached_reply_count + 1) // 10) + 1)
                thread_page = self.thread_service.fetch_page(
                    board_name=board_name,
                    article_id=thread.article_id,
                    page=page,
                )
                posts = self._build_posts(
                    thread_page.posts,
                    cached_reply_count=cached_reply_count,
                )
            self.cache.save_thread_progress(
                board_name=board_name,
                article_id=thread.article_id,
                reply_count=reply_count,
                recent_post_ids=[post.post_id for post in posts],
            )
            threads.append(
                self._build_sync_thread(
                    article_id=thread.article_id,
                    title=thread.title,
                    reply_count=reply_count,
                    posts=posts,
                )
            )
        return SyncUpdateResult(
            board_name=board_name,
            threads=threads,
            window_minutes=window_minutes,
            scanned_pages=self._last_scanned_pages,
            cutoff_at=(reference_now - timedelta(minutes=window_minutes)) if window_minutes is not None else None,
        )
```

- [ ] **Step 4: 写最小窗口翻页实现**

```python
    def _collect_candidate_threads(
        self,
        *,
        board_name: str,
        limit: int,
        window_minutes: int | None,
        now: datetime,
    ) -> list[BoardThreadLike]:
        if window_minutes is None:
            board_page = self.board_service.fetch_page(board_name=board_name, page=1)
            return board_page.threads[:limit]

        cutoff = now - timedelta(minutes=window_minutes)
        collected: list[BoardThreadLike] = []
        page = 1
        reached_out_of_window = False

        while len(collected) < limit:
            board_page = self.board_service.fetch_page(board_name=board_name, page=page)
            for thread in board_page.threads:
                observed_time = self._resolve_thread_observed_time(thread, now=now)
                if observed_time >= cutoff:
                    collected.append(thread)
                    if len(collected) >= limit:
                        return collected
                else:
                    reached_out_of_window = True
            if reached_out_of_window or not board_page.has_next_page:
                break
            page += 1

        return collected
```

- [ ] **Step 5: 实现时间解析与判定时间选择**

```python
    @staticmethod
    def _resolve_thread_observed_time(thread: BoardThreadLike, *, now: datetime) -> datetime:
        latest_reply_time = thread.latest_reply_time.strip()
        if latest_reply_time:
            return SyncService._parse_board_time(latest_reply_time, now=now)
        return SyncService._parse_board_time(thread.post_time, now=now)

    @staticmethod
    def _parse_board_time(raw_time: str, *, now: datetime) -> datetime:
        normalized = raw_time.strip()
        if re.fullmatch(r"\d{2}:\d{2}:\d{2}", normalized):
            clock_time = datetime.strptime(normalized, "%H:%M:%S").time()
            return datetime.combine(now.date(), clock_time)
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", normalized):
            parsed_date = datetime.strptime(normalized, "%Y-%m-%d").date()
            return datetime.combine(parsed_date, time(23, 59, 59))
        raise ValueError(f"Unsupported board time format: {raw_time}")
```

- [ ] **Step 6: 让 `backend/src/byr_boards/models.py` 与真实版面结果类型保持一致**

```python
@dataclass(slots=True)
class BoardThread:
    title: str
    article_url: str
    article_id: str
    state_icon: str
    post_time: str
    author: str
    reply_count: int | None
    latest_reply_time: str
    latest_reply_url: str
    latest_reply_author: str
```

Expected: 本步只确认无需改字段名，重点是同步服务协议开始依赖这些现有字段，不要再额外创造重复模型。

- [ ] **Step 7: 运行同步服务测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest tests/unit/byr_sync/test_service.py -q
```

Expected: PASS。

- [ ] **Step 8: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add backend/src/byr_sync/service.py backend/tests/unit/byr_sync/test_service.py backend/src/byr_boards/models.py
git commit -m "实现后端窗口化同步翻页逻辑"
```

### Task 4: 调整后端同步 API 查询参数与响应元信息

**Files:**
- Modify: `backend/src/byr_api/models.py`
- Modify: `backend/src/byr_api/app.py`
- Modify: `backend/tests/unit/byr_api/test_app.py`

- [ ] **Step 1: 写失败测试，覆盖 `/api/sync/updates` 接收 `board_name` 与 `window_minutes`**

```python
def test_sync_endpoint_passes_board_name_and_window_minutes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    service = FakeSyncService()
    client = TestClient(create_app(sync_service=service))

    response = client.get(
        "/api/sync/updates",
        params={"board_name": "IWhisper", "window_minutes": 30},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.status_code == 200
    assert service.calls == [("IWhisper", 20, 30)]
```

- [ ] **Step 2: 写失败测试，覆盖响应元信息**

```python
def test_sync_endpoint_returns_window_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BYR_SYNC_API_TOKEN", "secret-token")
    client = TestClient(create_app(sync_service=FakeSyncService()))

    response = client.get(
        "/api/sync/updates",
        params={"board_name": "IWhisper", "window_minutes": 30},
        headers={"X-Sync-Token": "secret-token"},
    )

    assert response.json()["window_minutes"] == 30
    assert response.json()["scanned_pages"] == 2
    assert response.json()["cutoff_at"] == "2026-05-03T21:40:00"
```

- [ ] **Step 3: 运行 API 测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest tests/unit/byr_api/test_app.py::test_sync_endpoint_passes_board_name_and_window_minutes tests/unit/byr_api/test_app.py::test_sync_endpoint_returns_window_metadata -q
```

Expected: FAIL，提示假服务未记录调用或响应缺字段。

- [ ] **Step 4: 为 `SyncUpdateResult` 与 FastAPI 响应模型补元信息**

```python
@dataclass(slots=True)
class SyncUpdateResult:
    board_name: str
    threads: list["SyncThread"]
    window_minutes: int | None = None
    scanned_pages: int = 1
    cutoff_at: datetime | None = None
```

```python
@dataclass(slots=True)
class SyncUpdatesResponse:
    board_name: str
    threads: list[SyncThreadResponse]
    window_minutes: int | None = None
    scanned_pages: int = 1
    cutoff_at: str | None = None
```

- [ ] **Step 5: 调整 `/api/sync/updates` 路由实现**

```python
    @app.get("/api/sync/updates")
    def sync_updates(
        board_name: str = Query(default="IWhisper"),
        window_minutes: int = Query(default=30, ge=1),
        _: str = Depends(require_sync_token),
    ) -> SyncUpdatesResponse:
        result = app.state.sync_service.list_updates(
            board_name=board_name,
            limit=20,
            window_minutes=window_minutes,
        )
        return SyncUpdatesResponse(
            board_name=result.board_name,
            window_minutes=result.window_minutes,
            scanned_pages=result.scanned_pages,
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
        )
```

- [ ] **Step 6: 运行后端 API 测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest tests/unit/byr_api/test_app.py -q
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add backend/src/byr_api/models.py backend/src/byr_api/app.py backend/tests/unit/byr_api/test_app.py backend/src/byr_sync/service.py
git commit -m "扩展后端窗口同步 API 参数与元信息"
```

### Task 5: 给 Web 同步请求类型与 fetch 工具补窗口参数

**Files:**
- Modify: `apps/web/src/server/imports/syncTypes.ts`
- Modify: `apps/web/src/server/imports/fetchSyncUpdates.ts`
- Modify: `apps/web/tests/server/fetchSyncUpdates.test.ts`

- [ ] **Step 1: 写失败测试，覆盖 `fetchSyncUpdates` 带板块与窗口查询参数**

```ts
it("requests the updates endpoint with board and window query params", async () => {
  vi.stubEnv("BYR_SYNC_API_BASE_URL", "https://sync.example.test");
  vi.stubEnv("BYR_SYNC_API_TOKEN", "secret-token");

  const fetchMock = vi.fn(async () =>
    Response.json({
      board_name: "IWhisper",
      window_minutes: 30,
      scanned_pages: 2,
      cutoff_at: "2026-05-03T21:40:00",
      threads: [],
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await fetchSyncUpdates({ boardName: "IWhisper", windowMinutes: 30 });

  expect(fetchMock).toHaveBeenCalledWith(
    "https://sync.example.test/api/sync/updates?board_name=IWhisper&window_minutes=30",
    {
      cache: "no-store",
      method: "GET",
      headers: { "X-Sync-Token": "secret-token" },
    },
  );
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/server/fetchSyncUpdates.test.ts
```

Expected: FAIL，提示 `fetchSyncUpdates` 参数不匹配或 URL 不正确。

- [ ] **Step 3: 调整类型与 fetch 实现**

```ts
export type ByrSyncUpdatesPayload = {
  board_name: string;
  window_minutes?: number | null;
  scanned_pages?: number;
  cutoff_at?: string | null;
  threads: ByrSyncThreadPayload[];
};
```

```ts
export async function fetchSyncUpdates(input: {
  boardName: string;
  windowMinutes: number;
}): Promise<ByrSyncUpdatesPayload> {
  const baseUrl = getRequiredEnv("BYR_SYNC_API_BASE_URL");
  const token = getRequiredEnv("BYR_SYNC_API_TOKEN");

  if (!baseUrl || !token) {
    throw new Error("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  }

  const params = new URLSearchParams({
    board_name: input.boardName,
    window_minutes: String(input.windowMinutes),
  });

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/sync/updates?${params.toString()}`,
    {
      method: "GET",
      headers: { "X-Sync-Token": token },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Sync API request failed: ${response.status}`);
  }

  return (await response.json()) as ByrSyncUpdatesPayload;
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/server/fetchSyncUpdates.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/src/server/imports/syncTypes.ts apps/web/src/server/imports/fetchSyncUpdates.ts apps/web/tests/server/fetchSyncUpdates.test.ts
git commit -m "支持 Web 同步请求传递窗口参数"
```

### Task 6: 为 Web 新增定时任务执行历史数据模型

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/20260503xxxxxx_add_scheduled_task_runs/migration.sql`

- [ ] **Step 1: 在 Prisma schema 中写入失败前先明确目标模型**

```prisma
enum ScheduledTaskRunStatus {
  running
  succeeded
  failed
  skipped
}

enum ScheduledTaskTriggerSource {
  scheduled
  manual
}

model ScheduledTaskRun {
  id             String                     @id @default(uuid())
  taskKey        String
  taskTitle      String
  triggerSource  ScheduledTaskTriggerSource
  status         ScheduledTaskRunStatus
  startedAt      DateTime
  finishedAt     DateTime?
  durationMs     Int?
  intervalMinutes Int
  windowMinutes  Int
  boardName      String
  importedThreads Int                       @default(0)
  importedReplies Int                       @default(0)
  skippedReason  String?
  errorMessage   String?
  metadataJson   Json?
  createdAt      DateTime                   @default(now())
  updatedAt      DateTime                   @updatedAt

  @@index([taskKey, startedAt])
  @@index([status, startedAt])
  @@map("scheduled_task_runs")
}
```

- [ ] **Step 2: 运行 Prisma 格式化与迁移生成**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web prisma:generate
pnpm --filter @bbs/web prisma:migrate --name add_scheduled_task_runs
```

Expected: 生成新的迁移目录与 Prisma Client。

- [ ] **Step 3: 检查生成的 SQL 是否符合最小设计**

```sql
CREATE TYPE "ScheduledTaskRunStatus" AS ENUM ('running', 'succeeded', 'failed', 'skipped');
CREATE TYPE "ScheduledTaskTriggerSource" AS ENUM ('scheduled', 'manual');

CREATE TABLE "scheduled_task_runs" (
  "id" TEXT NOT NULL,
  "taskKey" TEXT NOT NULL,
  "taskTitle" TEXT NOT NULL,
  "triggerSource" "ScheduledTaskTriggerSource" NOT NULL,
  "status" "ScheduledTaskRunStatus" NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "intervalMinutes" INTEGER NOT NULL,
  "windowMinutes" INTEGER NOT NULL,
  "boardName" TEXT NOT NULL,
  "importedThreads" INTEGER NOT NULL DEFAULT 0,
  "importedReplies" INTEGER NOT NULL DEFAULT 0,
  "skippedReason" TEXT,
  "errorMessage" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "scheduled_task_runs_pkey" PRIMARY KEY ("id")
);
```

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/prisma/schema.prisma apps/web/prisma/migrations
git commit -m "新增定时任务执行历史表"
```

### Task 7: 新建任务注册表与执行历史存储层

**Files:**
- Create: `apps/web/src/server/scheduler/taskRegistry.ts`
- Create: `apps/web/src/server/scheduler/scheduledTaskRunStore.ts`

- [ ] **Step 1: 写任务注册表**

```ts
export type ScheduledTaskDefinition = {
  taskKey: string;
  title: string;
  description: string;
  sourceType: "byr_sync_api";
  sourceLabel: string;
  boardName: string;
  intervalMinutes: number;
  windowMinutes: number;
  enabled: boolean;
  runnerType: "byr_sync_recent_window";
};

export const scheduledTasks: ScheduledTaskDefinition[] = [
  {
    taskKey: "iwhisper_recent_sync",
    title: "IWhisper 最近内容同步",
    description: "每 20 分钟同步一次 IWhisper 最近 30 分钟内的内容",
    sourceType: "byr_sync_api",
    sourceLabel: "IWhisper recent sync",
    boardName: "IWhisper",
    intervalMinutes: 20,
    windowMinutes: 30,
    enabled: true,
    runnerType: "byr_sync_recent_window",
  },
];

export function getScheduledTask(taskKey: string) {
  return scheduledTasks.find((task) => task.taskKey === taskKey) ?? null;
}
```

- [ ] **Step 2: 写执行历史存储层**

```ts
import type { PrismaClient, ScheduledTaskRunStatus, ScheduledTaskTriggerSource } from "@prisma/client";

export type ScheduledTaskRunStore = Pick<PrismaClient, "scheduledTaskRun">;

export async function createScheduledTaskRun(
  prisma: ScheduledTaskRunStore,
  input: {
    taskKey: string;
    taskTitle: string;
    triggerSource: ScheduledTaskTriggerSource;
    intervalMinutes: number;
    windowMinutes: number;
    boardName: string;
  },
) {
  return prisma.scheduledTaskRun.create({
    data: {
      taskKey: input.taskKey,
      taskTitle: input.taskTitle,
      triggerSource: input.triggerSource,
      status: "running" satisfies ScheduledTaskRunStatus,
      startedAt: new Date(),
      intervalMinutes: input.intervalMinutes,
      windowMinutes: input.windowMinutes,
      boardName: input.boardName,
    },
  });
}

export async function finishScheduledTaskRun(
  prisma: ScheduledTaskRunStore,
  runId: string,
  input: {
    status: ScheduledTaskRunStatus;
    importedThreads?: number;
    importedReplies?: number;
    skippedReason?: string | null;
    errorMessage?: string | null;
    metadataJson?: Record<string, unknown> | null;
  },
) {
  const finishedAt = new Date();
  const run = await prisma.scheduledTaskRun.findUniqueOrThrow({ where: { id: runId } });

  return prisma.scheduledTaskRun.update({
    where: { id: runId },
    data: {
      status: input.status,
      finishedAt,
      durationMs: finishedAt.getTime() - run.startedAt.getTime(),
      importedThreads: input.importedThreads ?? 0,
      importedReplies: input.importedReplies ?? 0,
      skippedReason: input.skippedReason ?? null,
      errorMessage: input.errorMessage ?? null,
      metadataJson: input.metadataJson ?? null,
    },
  });
}
```

- [ ] **Step 3: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/src/server/scheduler/taskRegistry.ts apps/web/src/server/scheduler/scheduledTaskRunStore.ts
git commit -m "新增定时任务注册表与执行历史存储"
```

### Task 8: 提炼共享同步导入函数并实现单次任务 runner

**Files:**
- Modify: `apps/web/app/admin/api/imports/byr-sync/route.ts`
- Create: `apps/web/src/server/scheduler/runScheduledTask.ts`
- Create: `apps/web/tests/server/runScheduledTask.test.ts`
- Modify: `apps/web/tests/admin-imports-route.test.ts`

- [ ] **Step 1: 写失败测试，覆盖 runner 成功执行**

```ts
it("runs the sync task and records a successful history row", async () => {
  const task = getScheduledTask("iwhisper_recent_sync");
  const prisma = createSchedulerPrismaMock();
  routeMocks.fetchSyncUpdates.mockResolvedValue({
    board_name: "IWhisper",
    window_minutes: 30,
    scanned_pages: 2,
    cutoff_at: "2026-05-03T21:40:00",
    threads: [],
  });
  routeMocks.mapSyncPayload.mockReturnValue(emptyBatch);
  routeMocks.importSyncBatch.mockResolvedValue({
    importId: "import-1",
    importedThreads: 2,
    importedReplies: 3,
    skippedReplies: 0,
  });

  const result = await runScheduledTask({
    prisma,
    task: task!,
    triggerSource: "scheduled",
  });

  expect(routeMocks.fetchSyncUpdates).toHaveBeenCalledWith({
    boardName: "IWhisper",
    windowMinutes: 30,
  });
  expect(result.status).toBe("succeeded");
})
```

- [ ] **Step 2: 写失败测试，覆盖重入跳过**

```ts
it("skips when the same task is already running", async () => {
  const task = getScheduledTask("iwhisper_recent_sync")!;
  const prisma = createSchedulerPrismaMock();

  const firstRun = runScheduledTask({ prisma, task, triggerSource: "scheduled" });
  const secondRun = await runScheduledTask({ prisma, task, triggerSource: "scheduled" });

  await firstRun;

  expect(secondRun.status).toBe("skipped");
  expect(secondRun.skippedReason).toBe("previous run still active");
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/server/runScheduledTask.test.ts
```

Expected: FAIL，提示模块不存在或函数未定义。

- [ ] **Step 4: 从 admin 导入路由提炼共享导入函数**

```ts
export async function runByrSyncImport(input: {
  prisma: typeof prisma;
  boardName: string;
  windowMinutes: number;
}) {
  const payload = await fetchSyncUpdates({
    boardName: input.boardName,
    windowMinutes: input.windowMinutes,
  });
  const enrichedPayload = await enrichThreadsWithSourceData(payload);
  const batch = mapSyncPayload(enrichedPayload);
  return importSyncBatch(input.prisma, batch);
}
```

- [ ] **Step 5: 让 admin 手动导入路由复用共享函数**

```ts
export async function POST() {
  try {
    const result = await runByrSyncImport({
      prisma,
      boardName: "IWhisper",
      windowMinutes: 30,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown sync import error",
      },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6: 实现 `runScheduledTask.ts`**

```ts
const runningTaskKeys = new Set<string>();

export async function runScheduledTask(input: {
  prisma: typeof prisma;
  task: ScheduledTaskDefinition;
  triggerSource: "scheduled" | "manual";
}) {
  if (runningTaskKeys.has(input.task.taskKey)) {
    const skippedRun = await createScheduledTaskRun(input.prisma, {
      taskKey: input.task.taskKey,
      taskTitle: input.task.title,
      triggerSource: input.triggerSource,
      intervalMinutes: input.task.intervalMinutes,
      windowMinutes: input.task.windowMinutes,
      boardName: input.task.boardName,
    });
    return finishScheduledTaskRun(input.prisma, skippedRun.id, {
      status: "skipped",
      skippedReason: "previous run still active",
    });
  }

  runningTaskKeys.add(input.task.taskKey);
  const run = await createScheduledTaskRun(input.prisma, {
    taskKey: input.task.taskKey,
    taskTitle: input.task.title,
    triggerSource: input.triggerSource,
    intervalMinutes: input.task.intervalMinutes,
    windowMinutes: input.task.windowMinutes,
    boardName: input.task.boardName,
  });

  try {
    const importResult = await runByrSyncImport({
      prisma: input.prisma,
      boardName: input.task.boardName,
      windowMinutes: input.task.windowMinutes,
    });
    return await finishScheduledTaskRun(input.prisma, run.id, {
      status: "succeeded",
      importedThreads: importResult.importedThreads,
      importedReplies: importResult.importedReplies,
    });
  } catch (error) {
    return await finishScheduledTaskRun(input.prisma, run.id, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown scheduled task error",
    });
  } finally {
    runningTaskKeys.delete(input.task.taskKey);
  }
}
```

- [ ] **Step 7: 运行路由测试与 runner 测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/admin-imports-route.test.ts tests/server/runScheduledTask.test.ts
```

Expected: PASS。

- [ ] **Step 8: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/app/admin/api/imports/byr-sync/route.ts apps/web/src/server/scheduler/runScheduledTask.ts apps/web/tests/server/runScheduledTask.test.ts apps/web/tests/admin-imports-route.test.ts
git commit -m "复用同步导入链路实现定时任务 runner"
```

### Task 9: 实现进程内调度器与 instrumentation 启动入口

**Files:**
- Create: `apps/web/src/server/scheduler/webScheduler.ts`
- Create: `apps/web/instrumentation.ts`
- Create: `apps/web/tests/server/webScheduler.test.ts`

- [ ] **Step 1: 写失败测试，覆盖禁用开关不启动调度器**

```ts
it("does not start when WEB_SCHEDULER_ENABLED is false", async () => {
  vi.stubEnv("WEB_SCHEDULER_ENABLED", "false");
  const registerSpy = vi.fn();

  await startWebScheduler({ scheduleTaskLoop: registerSpy });

  expect(registerSpy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: 写失败测试，覆盖同进程只初始化一次**

```ts
it("starts only once per process", async () => {
  vi.stubEnv("WEB_SCHEDULER_ENABLED", "true");
  const registerSpy = vi.fn();

  await startWebScheduler({ scheduleTaskLoop: registerSpy });
  await startWebScheduler({ scheduleTaskLoop: registerSpy });

  expect(registerSpy).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/server/webScheduler.test.ts
```

Expected: FAIL，提示模块不存在。

- [ ] **Step 4: 实现调度器单例与循环注册**

```ts
let schedulerStarted = false;

function readEnabledFlag() {
  const value = process.env.WEB_SCHEDULER_ENABLED?.trim().toLowerCase();
  return value !== "false";
}

function readRunOnBootFlag() {
  const value = process.env.WEB_SCHEDULER_RUN_ON_BOOT?.trim().toLowerCase();
  return value !== "false";
}

export async function startWebScheduler(deps?: {
  scheduleTaskLoop?: (task: ScheduledTaskDefinition) => void;
}) {
  if (schedulerStarted || !readEnabledFlag()) {
    return;
  }
  schedulerStarted = true;

  const scheduleTaskLoop = deps?.scheduleTaskLoop ?? defaultScheduleTaskLoop;
  for (const task of scheduledTasks) {
    if (!task.enabled) {
      continue;
    }
    scheduleTaskLoop(task);
  }
}
```

- [ ] **Step 5: 为 `instrumentation.ts` 写最小启动入口**

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWebScheduler } = await import("@/src/server/scheduler/webScheduler");
    await startWebScheduler();
  }
}
```

- [ ] **Step 6: 运行调度器测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/server/webScheduler.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/src/server/scheduler/webScheduler.ts apps/web/instrumentation.ts apps/web/tests/server/webScheduler.test.ts
git commit -m "新增 Web 进程内定时任务调度器"
```

### Task 10: 实现 admin 任务列表聚合与“立即执行一次”接口

**Files:**
- Create: `apps/web/src/server/admin/listScheduledTasks.ts`
- Create: `apps/web/app/admin/api/scheduled-tasks/[taskKey]/run/route.ts`
- Create: `apps/web/tests/server/listScheduledTasks.test.ts`
- Create: `apps/web/tests/admin-scheduled-tasks-route.test.ts`

- [ ] **Step 1: 写失败测试，覆盖任务定义与最近执行历史聚合**

```ts
it("returns all code-defined tasks with their latest run", async () => {
  const prisma = {
    scheduledTaskRun: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "run-1",
          taskKey: "iwhisper_recent_sync",
          status: "succeeded",
          startedAt: new Date("2026-05-03T22:00:00.000Z"),
          finishedAt: new Date("2026-05-03T22:00:08.000Z"),
          importedThreads: 2,
          importedReplies: 3,
          errorMessage: null,
        },
      ]),
    },
  };

  const result = await listScheduledTasks(prisma as never);

  expect(result[0]).toMatchObject({
    taskKey: "iwhisper_recent_sync",
    title: "IWhisper 最近内容同步",
    intervalMinutes: 20,
    windowMinutes: 30,
    latestRun: {
      status: "succeeded",
      importedThreads: 2,
      importedReplies: 3,
    },
  });
});
```

- [ ] **Step 2: 写失败测试，覆盖手动触发接口**

```ts
it("runs a scheduled task immediately by task key", async () => {
  runTaskMock.mockResolvedValue({ id: "run-1", status: "succeeded" });

  const response = await POST(new Request("http://localhost"), {
    params: Promise.resolve({ taskKey: "iwhisper_recent_sync" }),
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({
    ok: true,
    run: { id: "run-1", status: "succeeded" },
  });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/server/listScheduledTasks.test.ts tests/admin-scheduled-tasks-route.test.ts
```

Expected: FAIL，提示模块不存在或导出缺失。

- [ ] **Step 4: 实现任务列表聚合**

```ts
export async function listScheduledTasks(client: Pick<PrismaClient, "scheduledTaskRun"> = prisma) {
  const latestRuns = await client.scheduledTaskRun.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return scheduledTasks.map((task) => ({
    taskKey: task.taskKey,
    title: task.title,
    description: task.description,
    boardName: task.boardName,
    intervalMinutes: task.intervalMinutes,
    windowMinutes: task.windowMinutes,
    enabled: task.enabled,
    latestRun: latestRuns.find((run) => run.taskKey === task.taskKey) ?? null,
  }));
}
```

- [ ] **Step 5: 实现手动触发接口**

```ts
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskKey: string }> },
) {
  try {
    const { taskKey } = await params;
    const task = getScheduledTask(taskKey);

    if (!task || !task.enabled) {
      return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
    }

    const run = await runScheduledTask({
      prisma,
      task,
      triggerSource: "manual",
    });

    return NextResponse.json({ ok: true, run });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown scheduled task error",
      },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/server/listScheduledTasks.test.ts tests/admin-scheduled-tasks-route.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/src/server/admin/listScheduledTasks.ts apps/web/app/admin/api/scheduled-tasks/[taskKey]/run/route.ts apps/web/tests/server/listScheduledTasks.test.ts apps/web/tests/admin-scheduled-tasks-route.test.ts
git commit -m "新增定时任务管理接口与数据聚合"
```

### Task 11: 实现 admin 定时任务页面与总览入口

**Files:**
- Create: `apps/web/app/admin/scheduled-tasks/page.tsx`
- Modify: `apps/web/app/admin/page.tsx`
- Create: `apps/web/tests/admin-scheduled-tasks-page.test.tsx`

- [ ] **Step 1: 写失败测试，覆盖页面渲染任务定义与最近状态**

```tsx
it("renders scheduled tasks and latest run summaries", async () => {
  vi.mocked(listScheduledTasks).mockResolvedValue([
    {
      taskKey: "iwhisper_recent_sync",
      title: "IWhisper 最近内容同步",
      description: "每 20 分钟同步一次 IWhisper 最近 30 分钟内的内容",
      boardName: "IWhisper",
      intervalMinutes: 20,
      windowMinutes: 30,
      enabled: true,
      latestRun: {
        id: "run-1",
        status: "succeeded",
        importedThreads: 2,
        importedReplies: 3,
        errorMessage: null,
        startedAt: new Date("2026-05-03T22:00:00.000Z"),
        finishedAt: new Date("2026-05-03T22:00:08.000Z"),
      },
    },
  ]);

  render(await AdminScheduledTasksPage());

  expect(screen.getByText("定时任务")).toBeTruthy();
  expect(screen.getByText("IWhisper 最近内容同步")).toBeTruthy();
  expect(screen.getByText("20 分钟")).toBeTruthy();
  expect(screen.getByText("30 分钟")).toBeTruthy();
  expect(screen.getByRole("button", { name: "立即执行一次" })).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/admin-scheduled-tasks-page.test.tsx
```

Expected: FAIL，提示页面模块不存在。

- [ ] **Step 3: 实现页面**

```tsx
export default async function AdminScheduledTasksPage() {
  const tasks = await listScheduledTasks();

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <Link href="/admin">返回总览</Link>
        </p>
        <h1 className="text-3xl font-semibold">定时任务</h1>
      </div>

      <section className="mt-8 grid gap-4">
        {tasks.map((task) => (
          <article key={task.taskKey} className="rounded-xl border border-zinc-200 p-4">
            <h2 className="text-lg font-medium">{task.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{task.description}</p>
            <p className="mt-2 text-sm text-zinc-500">板块：{task.boardName}</p>
            <p className="mt-1 text-sm text-zinc-500">间隔：{task.intervalMinutes} 分钟</p>
            <p className="mt-1 text-sm text-zinc-500">窗口：{task.windowMinutes} 分钟</p>
            <p className="mt-1 text-sm text-zinc-500">代码启用：{task.enabled ? "是" : "否"}</p>
            <p className="mt-1 text-sm text-zinc-500">
              最近状态：{task.latestRun?.status ?? "暂无执行记录"}
            </p>
            <form action={`/admin/api/scheduled-tasks/${task.taskKey}/run`} method="post" className="mt-3">
              <button className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm" type="submit">
                立即执行一次
              </button>
            </form>
          </article>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: 给管理员总览补入口**

```tsx
export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">管理员总览</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900" href="/admin/imports">
          导入导出
        </Link>
        <Link className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900" href="/admin/scheduled-tasks">
          定时任务
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: 运行页面测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run tests/admin-scheduled-tasks-page.test.tsx
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/app/admin/scheduled-tasks/page.tsx apps/web/app/admin/page.tsx apps/web/tests/admin-scheduled-tasks-page.test.tsx
git commit -m "新增 admin 定时任务页面"
```

### Task 12: 跑完整验证并更新文档引用

**Files:**
- Modify: `apps/web/README.md`
- Modify: `backend/README.md`

- [ ] **Step 1: 在 Web README 补调度器环境变量与 admin 页面入口说明**

```md
运行前请准备好运行时依赖的环境变量，例如 `BYR_SYNC_API_BASE_URL`、`BYR_SYNC_API_TOKEN`、`LEGACY_DATABASE_URL`、`DATABASE_URL`、`WEB_SCHEDULER_ENABLED`、`WEB_SCHEDULER_RUN_ON_BOOT`。

其中：

- `WEB_SCHEDULER_ENABLED=false` 可用于本地禁用定时任务
- `WEB_SCHEDULER_RUN_ON_BOOT=true` 控制进程启动后是否立即执行一次
```

- [ ] **Step 2: 在后端 README 补 `/api/sync/updates` 查询参数说明**

```md
- `GET /api/sync/updates?board_name=IWhisper&window_minutes=30`

该接口会从第 1 页开始按最近活动顺序翻页，并在遇到窗口外主题后停止继续翻页。版面列表中的 `HH:MM:SS` 按当天时间解析，`YYYY-MM-DD` 按当日 `23:59:59` 解析。
```

- [ ] **Step 3: 跑后端完整测试**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/backend
uv run pytest -q
```

Expected: PASS。

- [ ] **Step 4: 跑 Web 相关测试**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run \
  tests/server/fetchSyncUpdates.test.ts \
  tests/server/runScheduledTask.test.ts \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts \
  tests/admin-imports-route.test.ts \
  tests/admin-scheduled-tasks-route.test.ts \
  tests/admin-scheduled-tasks-page.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 跑类型检查**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web typecheck
```

Expected: PASS。

- [ ] **Step 6: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add backend/README.md apps/web/README.md
git commit -m "补充定时任务与窗口同步使用说明"
```

## 自检

### Spec coverage

- 单实例 Web 进程内硬编码调度器：Task 7、Task 8、Task 9
- 数据库只存执行历史：Task 6、Task 7、Task 10、Task 11
- admin 可见所有任务并支持立即执行一次：Task 10、Task 11
- 后端按时间窗口翻页到越界为止：Task 2、Task 3、Task 4
- `HH:MM:SS` 与 `YYYY-MM-DD -> 23:59:59`：Task 2、Task 3、Task 4
- Web 继续复用现有导入链路：Task 5、Task 8
- 本地可通过环境变量禁用：Task 9、Task 12
- 实测暴露的后端编码问题：Task 1

没有发现 spec 中缺少对应任务的要求。

### Placeholder scan

- 未使用 `TODO`、`TBD`、`implement later`
- 没有“写测试”但不给测试代码的步骤
- 没有“参考上一任务”式的省略

### Type consistency

- 统一使用 `taskKey`、`windowMinutes`、`intervalMinutes`
- 手动与自动触发统一使用 `triggerSource`
- 执行历史统一使用 `scheduledTaskRun`

Plan complete and saved to `docs/superpowers/plans/2026-05-03-web-scheduler-and-windowed-sync-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
