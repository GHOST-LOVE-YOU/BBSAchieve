# 多板块全量抓取与独立定时同步 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `IWhisper` 之外的硬编码目标板块支持 Admin 手动全量抓取、独立定时同步和全局串行限速，同时移除旧库 `iwhisper` 导入入口。

**Architecture:** 继续复用 `backend /api/sync/updates` 与 `apps/web` 的 `runByrSyncImport` 导入链路，不新增独立全量接口。`apps/web` 新增统一板块注册表、全局抓取节流器和通用板块全量任务 runner；`backend` 在现有同步抓取循环内部加请求级节流，保证单次超大窗口全量不会打满主站。

**Tech Stack:** Next.js 16, TypeScript, Prisma, Vitest, FastAPI, Python 3.12, pytest

---

## File Structure

### Files to Create

- `apps/web/src/server/boardSync/boardRegistry.ts`
  - 统一定义硬编码板块清单，包括全量窗口和定时窗口配置。
- `apps/web/src/server/imports/boardFullSyncRunner.ts`
  - 通用板块全量任务 runner，负责调度 `runByrSyncImport`、全局节流器和 `import_jobs` 状态更新。
- `apps/web/src/server/imports/scheduleBoardFullSync.ts`
  - 在 Web 进程内异步启动板块全量任务。
- `apps/web/src/server/syncThrottle/globalSyncThrottle.ts`
  - 单实例全局抓取锁，手动全量和定时任务共用。
- `apps/web/app/admin/api/import-jobs/byr-board-full-sync/route.ts`
  - 创建新的板块全量任务。
- `apps/web/tests/server/boardRegistry.test.ts`
  - 板块注册表和派生定时任务定义测试。
- `apps/web/tests/server/globalSyncThrottle.test.ts`
  - 全局节流器测试。
- `apps/web/tests/server/boardFullSyncRunner.test.ts`
  - 板块全量 runner 测试。
- `backend/tests/unit/byr_sync/test_throttle.py`
  - 抓取循环限速测试。

### Files to Modify

- `apps/web/src/server/scheduler/taskRegistry.ts`
  - 让定时任务定义由 `IWhisper` 固定项 + 其它硬编码板块派生组成。
- `apps/web/src/server/scheduler/runScheduledTask.ts`
  - 从“同 taskKey 防重”升级为“全局抓取节流”，冲突时写 `skipped`。
- `apps/web/src/server/scheduler/webScheduler.ts`
  - 继续消费 `scheduledTasks`，无需感知板块来源，但测试期望要更新。
- `apps/web/src/server/admin/listScheduledTasks.ts`
  - 支持返回新增板块任务。
- `apps/web/src/server/admin/listRecentImportActivity.ts`
  - 最近活动文案从“旧库迁移”转向“板块全量抓取”。
- `apps/web/src/server/imports/importJobStore.ts`
  - 从 `legacy` 专用 store 提升成通用板块全量任务 store，增加 `cancelled` 标记和 metadata。
- `apps/web/app/admin/imports/page.tsx`
  - 移除“从旧库导入 iwhisper”，改成板块全量入口。
- `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`
  - 把停止语义从 `paused` 改成 `cancelled`。
- `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`
  - 限制只恢复板块全量任务；旧 legacy 逻辑删除后保持一致。
- `apps/web/app/admin/api/imports/byr-sync/route.ts`
  - 让 `runByrSyncImport` 支持全量任务复用同一导入入口。
- `apps/web/src/server/imports/fetchSyncUpdates.ts`
  - 保持接口不变，但测试会覆盖不同板块与大窗口调用。
- `apps/web/tests/admin-imports-page.test.tsx`
  - 改成新的 Admin UI 断言。
- `apps/web/tests/admin-import-job-routes.test.ts`
  - 从 `legacy-iwhisper` 路由迁移到 `byr-board-full-sync` 路由。
- `apps/web/tests/server/listRecentImportActivity.test.ts`
  - 改成新任务类型与文案。
- `apps/web/tests/server/listScheduledTasks.test.ts`
  - 更新新增板块任务断言。
- `apps/web/tests/server/runScheduledTask.test.ts`
  - 更新为全局节流语义，而非仅同 taskKey 防重。
- `apps/web/tests/server/webScheduler.test.ts`
  - enabled task 数量会增加，断言要跟注册表联动。
- `apps/web/README.md`
  - 补充新 Admin 入口和“旧库导入已移除”的说明。
- `backend/src/byr_sync/service.py`
  - 在抓取循环内部加入固定等待钩子或节流实现。
- `backend/src/byr_api/app.py`
  - 如果需要读取节流配置环境变量，从这里构建服务依赖。
- `backend/tests/unit/byr_api/test_app.py`
  - 补充大窗口参数透传验证。
- `backend/README.md`
  - 补充超大窗口全量复用 `/api/sync/updates` 与节流说明。

### Files to Delete

- `apps/web/src/server/imports/fetchLegacyIwhisperBatch.ts`
- `apps/web/src/server/imports/legacyMigrationRunner.ts`
- `apps/web/src/server/imports/legacyTypes.ts`
- `apps/web/src/server/imports/mapLegacyRows.ts`
- `apps/web/app/admin/api/import-jobs/legacy-iwhisper/route.ts`

如果删除这些文件会导致现有测试或引用报错，要在同一任务里同步修复 import 和测试。

## Scope Check

这份 spec 虽然覆盖 backend、Admin、调度和限速四块，但它们都服务同一条“多板块抓取平台”主链路，且最终产出是可工作的同一能力集，因此保留为一份集成计划。执行时按任务顺序切成可验证的小步。

### Task 1: 建立硬编码板块注册表并派生定时任务

**Files:**
- Create: `apps/web/src/server/boardSync/boardRegistry.ts`
- Modify: `apps/web/src/server/scheduler/taskRegistry.ts`
- Test: `apps/web/tests/server/boardRegistry.test.ts`
- Test: `apps/web/tests/server/listScheduledTasks.test.ts`
- Test: `apps/web/tests/server/webScheduler.test.ts`

- [ ] **Step 1: Write the failing tests for board registry and scheduled task derivation**

```ts
import { describe, expect, it } from "vitest";

import {
  boardSyncBoards,
  getBoardFullSyncDefinition,
  getScheduledBoardTasks,
} from "@/src/server/boardSync/boardRegistry";

describe("boardRegistry", () => {
  it("exposes non-IWhisper boards with full-sync and scheduled settings", () => {
    expect(boardSyncBoards.length).toBeGreaterThan(0);

    const firstBoard = boardSyncBoards[0];
    expect(firstBoard).toMatchObject({
      boardName: expect.any(String),
      fullSyncEnabled: true,
      fullSyncWindowMinutes: expect.any(Number),
      scheduledSyncEnabled: expect.any(Boolean),
      scheduledIntervalMinutes: expect.any(Number),
      scheduledWindowMinutes: expect.any(Number),
    });
  });

  it("returns a full-sync definition by board name", () => {
    const board = boardSyncBoards[0]!;
    expect(getBoardFullSyncDefinition(board.boardName)).toMatchObject({
      boardName: board.boardName,
      fullSyncWindowMinutes: board.fullSyncWindowMinutes,
    });
  });

  it("builds scheduled tasks for enabled boards only", () => {
    const tasks = getScheduledBoardTasks();
    expect(tasks.some((task) => task.boardName === "IWhisper")).toBe(false);
    expect(tasks.every((task) => task.enabled)).toBe(true);
  });
});
```

```ts
import { describe, expect, it, vi } from "vitest";

import { listScheduledTasks } from "@/src/server/admin/listScheduledTasks";
import { scheduledTasks } from "@/src/server/scheduler/taskRegistry";

describe("listScheduledTasks", () => {
  it("queries latest runs for all code-defined tasks", async () => {
    const findMany = vi.fn().mockResolvedValue([]);

    await listScheduledTasks({
      scheduledTaskRun: { findMany },
    } as never);

    expect(findMany).toHaveBeenCalledWith({
      where: {
        taskKey: {
          in: scheduledTasks.map((task) => task.taskKey),
        },
      },
      orderBy: { startedAt: "desc" },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @bbs/web exec vitest run \
  apps/web/tests/server/boardRegistry.test.ts \
  apps/web/tests/server/listScheduledTasks.test.ts \
  apps/web/tests/server/webScheduler.test.ts
```

Expected:

- FAIL because `boardRegistry.ts` and related exports do not exist yet.

- [ ] **Step 3: Implement the minimal board registry and task derivation**

```ts
// apps/web/src/server/boardSync/boardRegistry.ts
export type BoardSyncDefinition = {
  boardName: string;
  boardSlug: string;
  title: string;
  description: string;
  fullSyncEnabled: boolean;
  fullSyncWindowMinutes: number;
  scheduledSyncEnabled: boolean;
  scheduledIntervalMinutes: number;
  scheduledWindowMinutes: number;
};

export type DerivedScheduledBoardTask = {
  taskKey: string;
  title: string;
  description: string;
  sourceType: "byr_sync_api";
  sourceLabel: string;
  boardName: string;
  intervalMinutes: number;
  windowMinutes: number;
  enabled: true;
  runnerType: "byr_sync_recent_window";
};

export const boardSyncBoards: readonly BoardSyncDefinition[] = [
  {
    boardName: "JobInfo",
    boardSlug: "job-info",
    title: "JobInfo 全量与定时同步",
    description: "管理员手动全量抓取 JobInfo，并按固定间隔同步最近内容。",
    fullSyncEnabled: true,
    fullSyncWindowMinutes: 60 * 24 * 365 * 10,
    scheduledSyncEnabled: true,
    scheduledIntervalMinutes: 120,
    scheduledWindowMinutes: 180,
  },
];

export function getBoardFullSyncDefinition(boardName: string) {
  return boardSyncBoards.find((board) => board.boardName === boardName) ?? null;
}

export function getScheduledBoardTasks(): DerivedScheduledBoardTask[] {
  return boardSyncBoards
    .filter((board) => board.scheduledSyncEnabled)
    .map((board) => ({
      taskKey: `${board.boardSlug}_recent_sync`,
      title: `${board.boardName} 最近内容同步`,
      description: `每 ${board.scheduledIntervalMinutes} 分钟同步一次 ${board.boardName} 最近 ${board.scheduledWindowMinutes} 分钟内容`,
      sourceType: "byr_sync_api" as const,
      sourceLabel: `${board.boardName} recent sync`,
      boardName: board.boardName,
      intervalMinutes: board.scheduledIntervalMinutes,
      windowMinutes: board.scheduledWindowMinutes,
      enabled: true,
      runnerType: "byr_sync_recent_window" as const,
    }));
}
```

```ts
// apps/web/src/server/scheduler/taskRegistry.ts
import { getScheduledBoardTasks } from "@/src/server/boardSync/boardRegistry";

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

const iwhisperTask = {
  taskKey: "iwhisper_recent_sync",
  title: "IWhisper 最近内容同步",
  description: "每 20 分钟同步一次 IWhisper 最近 30 分钟内的内容",
  sourceType: "byr_sync_api" as const,
  sourceLabel: "IWhisper recent sync",
  boardName: "IWhisper",
  intervalMinutes: 20,
  windowMinutes: 30,
  enabled: true,
  runnerType: "byr_sync_recent_window" as const,
};

export const scheduledTasks = [
  iwhisperTask,
  ...getScheduledBoardTasks(),
] as const satisfies readonly ScheduledTaskDefinition[];

export function getScheduledTask(taskKey: string) {
  return scheduledTasks.find((task) => task.taskKey === taskKey) ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @bbs/web exec vitest run \
  apps/web/tests/server/boardRegistry.test.ts \
  apps/web/tests/server/listScheduledTasks.test.ts \
  apps/web/tests/server/webScheduler.test.ts
```

Expected:

- PASS for board registry and scheduler task enumeration tests.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/boardSync/boardRegistry.ts \
  apps/web/src/server/scheduler/taskRegistry.ts \
  apps/web/tests/server/boardRegistry.test.ts \
  apps/web/tests/server/listScheduledTasks.test.ts \
  apps/web/tests/server/webScheduler.test.ts
git commit -m "feat: 增加多板块同步注册表"
```

### Task 2: 用通用 import job store 替换 legacy 专用 job store

**Files:**
- Modify: `apps/web/src/server/imports/importJobStore.ts`
- Modify: `apps/web/tests/server/listRecentImportActivity.test.ts`
- Modify: `apps/web/src/server/admin/listRecentImportActivity.ts`
- Test: `apps/web/tests/server/listRecentImportActivity.test.ts`

- [ ] **Step 1: Write the failing tests for generic board full-sync jobs**

```ts
import { describe, expect, it, vi } from "vitest";

import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";

describe("listRecentImportActivity", () => {
  it("renders board full-sync jobs with board names as titles", async () => {
    const result = await listRecentImportActivity({
      import: { findMany: vi.fn(async () => []) } as any,
      importJob: {
        findMany: vi.fn(async () => [
          {
            id: "job-1",
            jobType: "byr_board_full_sync",
            sourceLabel: "JobInfo",
            status: "paused",
            createdAt: new Date("2026-05-04T10:00:00.000Z"),
            startedAt: null,
            finishedAt: null,
            processedThreads: 0,
            processedReplies: 0,
            errorMessage: null,
          },
        ]),
      } as any,
    });

    expect(result[0]).toMatchObject({
      id: "import-job:job-1",
      kind: "import_job",
      title: "JobInfo",
      status: "paused",
      detail: "帖子 0，回复 0",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/listRecentImportActivity.test.ts
```

Expected:

- FAIL because current tests and store still assume `legacy_iwhisper_migration`.

- [ ] **Step 3: Implement generic board full-sync job helpers**

```ts
// apps/web/src/server/imports/importJobStore.ts
import type { ImportJobStatus, ImportSourceType, PrismaClient } from "@prisma/client";

export type ImportJobStore = Pick<PrismaClient, "importJob">;

export type BoardFullSyncJobInput = {
  boardName: string;
  fullSyncWindowMinutes: number;
  requestedBy?: string | null;
};

export function createBoardFullSyncJob(
  prisma: ImportJobStore,
  input: BoardFullSyncJobInput,
) {
  return prisma.importJob.create({
    data: {
      jobType: "byr_board_full_sync",
      sourceType: "byr_sync_api",
      sourceLabel: input.boardName,
      status: "pending",
      cursorThreadKey: null,
      lastProcessedAt: null,
      startedAt: null,
      finishedAt: null,
      processedThreads: 0,
      processedReplies: 0,
      skippedThreads: 0,
      skippedReplies: 0,
      errorMessage: null,
      progressNote: null,
      metadataJson: {
        boardName: input.boardName,
        fullSyncWindowMinutes: input.fullSyncWindowMinutes,
        requestedBy: input.requestedBy ?? null,
        throttlePolicy: "global-single-flight",
      },
    },
  });
}

export function markJobPaused(
  prisma: ImportJobStore,
  jobId: string,
  progressNote?: string | null,
) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "paused",
      finishedAt: new Date(),
      progressNote: progressNote ?? null,
    },
  });
}

export function markJobCancelled(prisma: ImportJobStore, jobId: string) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      status: "cancelled",
      finishedAt: new Date(),
    },
  });
}
```

```ts
// apps/web/src/server/admin/listRecentImportActivity.ts
title: job.sourceLabel || job.jobType,
detail:
  job.errorMessage ??
  `帖子 ${job.processedThreads}，回复 ${job.processedReplies}`,
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/listRecentImportActivity.test.ts
```

Expected:

- PASS and recent activity reflects board full-sync jobs.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/imports/importJobStore.ts \
  apps/web/src/server/admin/listRecentImportActivity.ts \
  apps/web/tests/server/listRecentImportActivity.test.ts
git commit -m "refactor: 通用化板块全量任务状态存储"
```

### Task 3: 实现全局抓取节流器

**Files:**
- Create: `apps/web/src/server/syncThrottle/globalSyncThrottle.ts`
- Test: `apps/web/tests/server/globalSyncThrottle.test.ts`

- [ ] **Step 1: Write the failing tests for single-flight throttle**

```ts
import { describe, expect, it } from "vitest";

import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

describe("globalSyncThrottle", () => {
  it("allows only one active holder at a time", () => {
    const first = tryAcquireGlobalSyncThrottle({
      ownerKey: "manual:JobInfo",
      triggerSource: "manual",
    });
    const second = tryAcquireGlobalSyncThrottle({
      ownerKey: "scheduled:JobInfo",
      triggerSource: "scheduled",
    });

    expect(first.acquired).toBe(true);
    expect(second).toMatchObject({
      acquired: false,
      holder: {
        ownerKey: "manual:JobInfo",
        triggerSource: "manual",
      },
    });

    releaseGlobalSyncThrottle("manual:JobInfo");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/globalSyncThrottle.test.ts
```

Expected:

- FAIL because throttle module does not exist.

- [ ] **Step 3: Implement the minimal throttle**

```ts
// apps/web/src/server/syncThrottle/globalSyncThrottle.ts
type SyncThrottleHolder = {
  ownerKey: string;
  triggerSource: "manual" | "scheduled";
  acquiredAt: Date;
};

const globalForSyncThrottle = globalThis as typeof globalThis & {
  __bbsGlobalSyncThrottleHolder__?: SyncThrottleHolder | null;
};

function getHolder() {
  return globalForSyncThrottle.__bbsGlobalSyncThrottleHolder__ ?? null;
}

export function tryAcquireGlobalSyncThrottle(input: {
  ownerKey: string;
  triggerSource: "manual" | "scheduled";
}) {
  const existing = getHolder();
  if (existing) {
    return { acquired: false as const, holder: existing };
  }

  const holder: SyncThrottleHolder = {
    ownerKey: input.ownerKey,
    triggerSource: input.triggerSource,
    acquiredAt: new Date(),
  };
  globalForSyncThrottle.__bbsGlobalSyncThrottleHolder__ = holder;

  return { acquired: true as const, holder };
}

export function releaseGlobalSyncThrottle(ownerKey: string) {
  const existing = getHolder();
  if (existing?.ownerKey === ownerKey) {
    globalForSyncThrottle.__bbsGlobalSyncThrottleHolder__ = null;
  }
}

export function getGlobalSyncThrottleHolder() {
  return getHolder();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/globalSyncThrottle.test.ts
```

Expected:

- PASS and only one holder can acquire the throttle.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/syncThrottle/globalSyncThrottle.ts \
  apps/web/tests/server/globalSyncThrottle.test.ts
git commit -m "feat: 增加全局抓取节流器"
```

### Task 4: 用通用板块全量 runner 取代 legacy migration runner

**Files:**
- Create: `apps/web/src/server/imports/boardFullSyncRunner.ts`
- Create: `apps/web/src/server/imports/scheduleBoardFullSync.ts`
- Modify: `apps/web/app/admin/api/imports/byr-sync/route.ts`
- Test: `apps/web/tests/server/boardFullSyncRunner.test.ts`

- [ ] **Step 1: Write the failing tests for board full-sync runner**

```ts
import { describe, expect, it, vi } from "vitest";

const runnerMocks = vi.hoisted(() => ({
  runByrSyncImport: vi.fn(),
  markJobPaused: vi.fn(),
  markJobRunning: vi.fn(),
  markJobSucceeded: vi.fn(),
  markJobFailed: vi.fn(),
}));

vi.mock("@/app/admin/api/imports/byr-sync/route", () => ({
  runByrSyncImport: runnerMocks.runByrSyncImport,
}));

import { runBoardFullSyncJob } from "@/src/server/imports/boardFullSyncRunner";

describe("runBoardFullSyncJob", () => {
  it("pauses immediately when global throttle is already held", async () => {
    const result = await runBoardFullSyncJob(
      {
        findJobById: vi.fn(async () => ({
          id: "job-1",
          sourceLabel: "JobInfo",
          metadataJson: { boardName: "JobInfo", fullSyncWindowMinutes: 999999 },
        })),
        markJobPaused: runnerMocks.markJobPaused,
        markJobRunning: runnerMocks.markJobRunning,
        markJobSucceeded: runnerMocks.markJobSucceeded,
        markJobFailed: runnerMocks.markJobFailed,
      } as never,
      {
        jobId: "job-1",
        ownerKey: "manual:JobInfo",
        acquireThrottle: () => ({
          acquired: false,
          holder: {
            ownerKey: "scheduled:IWhisper",
            triggerSource: "scheduled",
            acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
          },
        }),
        releaseThrottle: vi.fn(),
      },
    );

    expect(result.status).toBe("paused");
    expect(runnerMocks.markJobPaused).toHaveBeenCalled();
    expect(runnerMocks.runByrSyncImport).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/boardFullSyncRunner.test.ts
```

Expected:

- FAIL because runner module does not exist.

- [ ] **Step 3: Implement the minimal board full-sync runner**

```ts
// apps/web/src/server/imports/boardFullSyncRunner.ts
import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";

export async function runBoardFullSyncJob(
  deps: {
    findJobById: (jobId: string) => Promise<any>;
    markJobPaused: (jobId: string, progressNote: string) => Promise<unknown>;
    markJobRunning: (jobId: string) => Promise<unknown>;
    markJobSucceeded: (jobId: string) => Promise<unknown>;
    markJobFailed: (jobId: string, errorMessage: string) => Promise<unknown>;
    prisma: any;
  },
  input: {
    jobId: string;
    ownerKey: string;
    acquireThrottle: () => { acquired: boolean; holder: unknown };
    releaseThrottle: (ownerKey: string) => void;
  },
) {
  const job = await deps.findJobById(input.jobId);
  if (!job) {
    throw new Error(`missing import job ${input.jobId}`);
  }

  const throttle = input.acquireThrottle();
  if (!throttle.acquired) {
    await deps.markJobPaused(input.jobId, "skipped by global throttle");
    return { status: "paused" as const };
  }

  try {
    await deps.markJobRunning(input.jobId);
    const metadata = (job.metadataJson ?? {}) as {
      boardName: string;
      fullSyncWindowMinutes: number;
    };
    const importResult = await runByrSyncImport({
      prisma: deps.prisma,
      boardName: metadata.boardName,
      windowMinutes: metadata.fullSyncWindowMinutes,
    });
    await deps.markJobSucceeded(input.jobId);
    return { status: "succeeded" as const, importResult };
  } catch (error) {
    await deps.markJobFailed(
      input.jobId,
      error instanceof Error ? error.message : "Unknown board full sync error",
    );
    return { status: "failed" as const };
  } finally {
    input.releaseThrottle(input.ownerKey);
  }
}
```

```ts
// apps/web/src/server/imports/scheduleBoardFullSync.ts
export function scheduleBoardFullSync(run: () => Promise<unknown>) {
  setTimeout(() => {
    void run().catch(() => {
      // persisted through job state
    });
  }, 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/boardFullSyncRunner.test.ts
```

Expected:

- PASS and throttle collision marks the job `paused`.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/imports/boardFullSyncRunner.ts \
  apps/web/src/server/imports/scheduleBoardFullSync.ts \
  apps/web/tests/server/boardFullSyncRunner.test.ts \
  apps/web/app/admin/api/imports/byr-sync/route.ts
git commit -m "feat: 增加板块全量抓取 runner"
```

### Task 5: 增加新的板块全量任务路由并移除 legacy 路由

**Files:**
- Create: `apps/web/app/admin/api/import-jobs/byr-board-full-sync/route.ts`
- Delete: `apps/web/app/admin/api/import-jobs/legacy-iwhisper/route.ts`
- Modify: `apps/web/tests/admin-import-job-routes.test.ts`
- Modify: `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`

- [ ] **Step 1: Write the failing route tests for board full-sync jobs**

```ts
import { describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createBoardFullSyncJob: vi.fn(),
  findJobById: vi.fn(),
  markJobRunning: vi.fn(),
  markJobCancelled: vi.fn(),
  scheduleBoardFullSync: vi.fn(),
}));

vi.mock("@/src/server/imports/importJobStore", () => ({
  createBoardFullSyncJob: routeMocks.createBoardFullSyncJob,
  findJobById: routeMocks.findJobById,
  markJobRunning: routeMocks.markJobRunning,
  markJobCancelled: routeMocks.markJobCancelled,
}));

vi.mock("@/src/server/imports/scheduleBoardFullSync", () => ({
  scheduleBoardFullSync: routeMocks.scheduleBoardFullSync,
}));

import { POST as startPOST } from "../app/admin/api/import-jobs/byr-board-full-sync/route";

describe("board full sync import job route", () => {
  it("starts a board full-sync job for a hard-coded board", async () => {
    routeMocks.createBoardFullSyncJob.mockResolvedValue({ id: "job-1" });
    const formData = new FormData();
    formData.set("boardName", "JobInfo");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardFullSyncJob).toHaveBeenCalled();
    expect(routeMocks.scheduleBoardFullSync).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true, jobId: "job-1" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/admin-import-job-routes.test.ts
```

Expected:

- FAIL because new route does not exist and tests still point at `legacy-iwhisper`.

- [ ] **Step 3: Implement the new route and remove legacy route**

```ts
// apps/web/app/admin/api/import-jobs/byr-board-full-sync/route.ts
import { NextResponse } from "next/server";

import { getBoardFullSyncDefinition } from "@/src/server/boardSync/boardRegistry";
import { prisma } from "@/src/server/db/client";
import {
  createBoardFullSyncJob,
  findJobById,
  markJobFailed,
  markJobPaused,
  markJobRunning,
  markJobSucceeded,
} from "@/src/server/imports/importJobStore";
import { runBoardFullSyncJob } from "@/src/server/imports/boardFullSyncRunner";
import { scheduleBoardFullSync } from "@/src/server/imports/scheduleBoardFullSync";
import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

export async function POST(request: Request) {
  const formData = await request.formData();
  const boardName = String(formData.get("boardName") ?? "");
  const board = getBoardFullSyncDefinition(boardName);

  if (!board || !board.fullSyncEnabled) {
    return NextResponse.json({ ok: false, error: "Board full sync is not enabled" }, { status: 400 });
  }

  const job = await createBoardFullSyncJob(prisma, {
    boardName: board.boardName,
    fullSyncWindowMinutes: board.fullSyncWindowMinutes,
  });

  scheduleBoardFullSync(async () =>
    runBoardFullSyncJob(
      {
        prisma,
        findJobById: (jobId) => findJobById(prisma, jobId),
        markJobPaused: (jobId, progressNote) => markJobPaused(prisma, jobId, progressNote),
        markJobRunning: (jobId) => markJobRunning(prisma, jobId),
        markJobSucceeded: (jobId) => markJobSucceeded(prisma, jobId),
        markJobFailed: (jobId, errorMessage) => markJobFailed(prisma, jobId, errorMessage),
      },
      {
        jobId: job.id,
        ownerKey: `manual:${board.boardName}`,
        acquireThrottle: () =>
          tryAcquireGlobalSyncThrottle({
            ownerKey: `manual:${board.boardName}`,
            triggerSource: "manual",
          }),
        releaseThrottle: releaseGlobalSyncThrottle,
      },
    ),
  );

  return NextResponse.json({ ok: true, jobId: job.id });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/admin-import-job-routes.test.ts
```

Expected:

- PASS and tests reference `byr-board-full-sync` instead of `legacy-iwhisper`.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/app/admin/api/import-jobs/byr-board-full-sync/route.ts \
  apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts \
  apps/web/tests/admin-import-job-routes.test.ts
git rm apps/web/app/admin/api/import-jobs/legacy-iwhisper/route.ts
git commit -m "feat: 接入板块全量抓取任务入口"
```

### Task 6: 更新停止语义为 cancelled，并防止晚到成功覆盖

**Files:**
- Modify: `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`
- Modify: `apps/web/src/server/imports/importJobStore.ts`
- Modify: `apps/web/tests/admin-import-job-routes.test.ts`
- Modify: `apps/web/tests/server/boardFullSyncRunner.test.ts`

- [ ] **Step 1: Write the failing tests for cancelled stop semantics**

```ts
it("stops a board full-sync job by cancelling it", async () => {
  routeMocks.findJobById.mockResolvedValue({
    id: "job-3",
    status: "running",
    jobType: "byr_board_full_sync",
  });
  routeMocks.markJobCancelled.mockResolvedValue({});

  const response = await stopPOST(new Request("http://localhost/stop"), {
    params: Promise.resolve({ jobId: "job-3" }),
  });

  expect(routeMocks.markJobCancelled).toHaveBeenCalledWith(routeMocks.prisma, "job-3");
  await expect(response.json()).resolves.toEqual({
    ok: true,
    jobId: "job-3",
    status: "cancelled",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @bbs/web exec vitest run \
  apps/web/tests/admin-import-job-routes.test.ts \
  apps/web/tests/server/boardFullSyncRunner.test.ts
```

Expected:

- FAIL because stop route still returns `paused`.

- [ ] **Step 3: Implement cancelled stop behavior**

```ts
// apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts
import { NextResponse } from "next/server";

import { prisma } from "@/src/server/db/client";
import { findJobById, markJobCancelled } from "@/src/server/imports/importJobStore";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const job = await findJobById(prisma, jobId);

  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  if (!["pending", "running", "paused", "failed"].includes(job.status)) {
    return NextResponse.json(
      { ok: false, error: `Job is not stoppable from ${job.status}` },
      { status: 409 },
    );
  }

  await markJobCancelled(prisma, jobId);

  return NextResponse.json({ ok: true, jobId, status: "cancelled" });
}
```

```ts
// apps/web/src/server/imports/boardFullSyncRunner.ts
const refreshedJob = await deps.findJobById(input.jobId);
if (refreshedJob?.status === "cancelled") {
  return { status: "cancelled" as const };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @bbs/web exec vitest run \
  apps/web/tests/admin-import-job-routes.test.ts \
  apps/web/tests/server/boardFullSyncRunner.test.ts
```

Expected:

- PASS and cancelled jobs no longer return as paused.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts \
  apps/web/src/server/imports/importJobStore.ts \
  apps/web/tests/admin-import-job-routes.test.ts \
  apps/web/tests/server/boardFullSyncRunner.test.ts
git commit -m "fix: 明确板块全量任务停止语义"
```

### Task 7: 让定时任务使用全局节流器而不是同 taskKey 防重

**Files:**
- Modify: `apps/web/src/server/scheduler/runScheduledTask.ts`
- Modify: `apps/web/tests/server/runScheduledTask.test.ts`

- [ ] **Step 1: Write the failing tests for cross-task throttle skipping**

```ts
it("skips a different scheduled task when global throttle is already held", async () => {
  const [firstTask, secondTask] = scheduledTasks.slice(0, 2);
  const prisma = createSchedulerPrismaMock();

  routeMocks.fetchSyncUpdates.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            board_name: firstTask!.boardName,
            window_minutes: firstTask!.windowMinutes,
            scanned_pages: 1,
            cutoff_at: "2026-05-04T00:00:00",
            threads: [],
          });
        }, 0);
      }),
  );
  routeMocks.mapSyncPayload.mockReturnValue(emptyBatch);
  routeMocks.importSyncBatch.mockResolvedValue({
    importId: "import-1",
    importedThreads: 0,
    importedReplies: 0,
    skippedReplies: 0,
  });

  const firstRun = runScheduledTask({
    prisma: prisma as never,
    task: firstTask!,
    triggerSource: "scheduled",
  });

  const secondRun = await runScheduledTask({
    prisma: prisma as never,
    task: secondTask!,
    triggerSource: "scheduled",
  });

  await firstRun;

  expect(secondRun.status).toBe("skipped");
  expect(secondRun.skippedReason).toBe("global throttle active");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/runScheduledTask.test.ts
```

Expected:

- FAIL because current guard only prevents duplicate `taskKey`.

- [ ] **Step 3: Implement global throttle usage for scheduled tasks**

```ts
// apps/web/src/server/scheduler/runScheduledTask.ts
import {
  releaseGlobalSyncThrottle,
  tryAcquireGlobalSyncThrottle,
} from "@/src/server/syncThrottle/globalSyncThrottle";

export async function runScheduledTask(input: {
  prisma: RunScheduledTaskPrisma;
  task: ScheduledTaskDefinition;
  triggerSource: "scheduled" | "manual";
}) {
  const ownerKey = `${input.triggerSource}:${input.task.taskKey}`;
  const throttle = tryAcquireGlobalSyncThrottle({
    ownerKey,
    triggerSource: input.triggerSource,
  });

  if (!throttle.acquired) {
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
      skippedReason: "global throttle active",
    });
  }

  try {
    // existing create run + runByrSyncImport logic
  } finally {
    releaseGlobalSyncThrottle(ownerKey);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/runScheduledTask.test.ts
```

Expected:

- PASS and a second task skips even when task keys differ.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/scheduler/runScheduledTask.ts \
  apps/web/tests/server/runScheduledTask.test.ts
git commit -m "feat: 为定时任务接入全局抓取限流"
```

### Task 8: 更新 Admin imports 页面，替换 legacy 入口为板块全量入口

**Files:**
- Modify: `apps/web/app/admin/imports/page.tsx`
- Modify: `apps/web/tests/admin-imports-page.test.tsx`

- [ ] **Step 1: Write the failing page test for board full-sync UI**

```ts
it("renders board full-sync actions instead of legacy iwhisper import", async () => {
  prismaMock.import.findMany.mockResolvedValue([]);
  prismaMock.importJob.findMany.mockResolvedValue([
    {
      id: "job-1",
      jobType: "byr_board_full_sync",
      sourceType: "byr_sync_api",
      sourceLabel: "JobInfo",
      status: "paused",
      cursorThreadKey: null,
      processedThreads: 0,
      processedReplies: 0,
      skippedReplies: 0,
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
    },
  ]);
  vi.mocked(listRecentImportActivity).mockResolvedValue([]);

  render(await AdminImportsPage());

  expect(screen.getByRole("button", { name: "开始抓取 JobInfo 全量内容" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "从旧库导入 iwhisper" })).toBeNull();
  expect(screen.getByText("板块全量抓取任务")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/admin-imports-page.test.tsx
```

Expected:

- FAIL because page still renders the legacy button and table labels.

- [ ] **Step 3: Implement the new Admin imports UI**

```tsx
// apps/web/app/admin/imports/page.tsx
import Link from "next/link";

import { boardSyncBoards } from "@/src/server/boardSync/boardRegistry";
import { prisma } from "@/src/server/db/client";
import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";

export default async function AdminImportsPage() {
  const imports = await prisma.import.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });
  const importJobs = await prisma.importJob.findMany({
    where: { jobType: "byr_board_full_sync" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const recentActivity = await listRecentImportActivity(prisma);

  return (
    <main className="min-h-screen p-8">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          <Link href="/admin">返回总览</Link>
        </p>
        <h1 className="text-3xl font-semibold">导入导出</h1>
        <div className="grid gap-3">
          <form action="/admin/api/imports/byr-sync" method="post">
            <button
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
              type="submit"
            >
              同步北邮人数据
            </button>
          </form>
          {boardSyncBoards
            .filter((board) => board.fullSyncEnabled)
            .map((board) => (
              <form
                key={board.boardName}
                action="/admin/api/import-jobs/byr-board-full-sync"
                method="post"
              >
                <input type="hidden" name="boardName" value={board.boardName} />
                <button
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-900"
                  type="submit"
                >
                  {`开始抓取 ${board.boardName} 全量内容`}
                </button>
              </form>
            ))}
        </div>
      </div>
      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-medium">板块全量抓取任务</h2>
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter @bbs/web exec vitest run apps/web/tests/admin-imports-page.test.tsx
```

Expected:

- PASS and UI no longer references the legacy import button.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/app/admin/imports/page.tsx \
  apps/web/tests/admin-imports-page.test.tsx
git commit -m "feat: 更新导入页为板块全量抓取入口"
```

### Task 9: 在 backend 同步服务里加入抓取循环节流

**Files:**
- Modify: `backend/src/byr_sync/service.py`
- Create: `backend/tests/unit/byr_sync/test_throttle.py`
- Modify: `backend/tests/unit/byr_api/test_app.py`

- [ ] **Step 1: Write the failing backend throttle tests**

```python
from __future__ import annotations

from dataclasses import dataclass

from byr_sync import InMemorySyncCache
from byr_sync.service import SyncService


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
    def __init__(self) -> None:
        self.calls: list[tuple[str, int]] = []

    def fetch_page(self, *, board_name: str, page: int = 1) -> FakeBoardPage:
        self.calls.append((board_name, page))
        if page == 1:
          return FakeBoardPage(
              threads=[
                  FakeBoardThread(
                      article_id="1",
                      title="Job",
                      reply_count=0,
                      post_time="2026-05-04",
                      latest_reply_time="23:59:59",
                  )
              ],
              has_next_page=True,
          )
        return FakeBoardPage(threads=[], has_next_page=False)


class FakeThreadService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, int]] = []

    def fetch_page(self, *, board_name: str, article_id: str, page: int = 1):
        self.calls.append((board_name, article_id, page))
        return type("Page", (), {"posts": []})()


def test_list_updates_calls_sleep_between_board_pages() -> None:
    sleep_calls: list[float] = []
    service = SyncService(
        board_service=FakePagedBoardService(),
        thread_service=None,
        cache=InMemorySyncCache(),
        sleep=lambda seconds: sleep_calls.append(seconds),
        request_interval_seconds=0.2,
    )

    service.list_updates(
        board_name="JobInfo",
        limit=20,
        window_minutes=60 * 24 * 365 * 10,
    )

    assert sleep_calls == [0.2]


def test_list_updates_calls_sleep_before_fetching_thread_pages() -> None:
    sleep_calls: list[float] = []
    service = SyncService(
        board_service=FakePagedBoardService(),
        thread_service=FakeThreadService(),
        cache=InMemorySyncCache(),
        sleep=lambda seconds: sleep_calls.append(seconds),
        request_interval_seconds=0.2,
    )

    service.list_updates(
        board_name="JobInfo",
        limit=20,
        window_minutes=60 * 24 * 365 * 10,
    )

    assert sleep_calls.count(0.2) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && uv run pytest tests/unit/byr_sync/test_throttle.py -q
```

Expected:

- FAIL because `SyncService` does not yet accept `sleep` or `request_interval_seconds`.

- [ ] **Step 3: Implement the minimal backend throttle hooks**

```python
# backend/src/byr_sync/service.py
from collections.abc import Callable


class SyncService:
    def __init__(
        self,
        board_service: BoardServiceLike,
        thread_service: ThreadServiceLike | None,
        cache: ThreadProgressCacheLike,
        *,
        sleep: Callable[[float], None] | None = None,
        request_interval_seconds: float = 0.0,
    ) -> None:
        self.board_service = board_service
        self.thread_service = thread_service
        self.cache = cache
        self.sleep = sleep or (lambda _seconds: None)
        self.request_interval_seconds = request_interval_seconds

    def _sleep_between_requests(self) -> None:
        if self.request_interval_seconds > 0:
            self.sleep(self.request_interval_seconds)
```

```python
# backend/src/byr_sync/service.py in _collect_candidate_threads loop
while len(collected) < limit:
    board_page = self.board_service.fetch_page(board_name=board_name, page=page)
    ...
    if reached_out_of_window or not board_page.has_next_page:
        break
    self._sleep_between_requests()
    page += 1
```

```python
# backend/src/byr_sync/service.py before thread_service.fetch_page(...)
if should_fetch_thread_page:
    self._sleep_between_requests()
    page = 1 if cached is None else max(1, ((cached_reply_count + 1) // 10) + 1)
    thread_page = self.thread_service.fetch_page(
        board_name=board_name,
        article_id=thread.article_id,
        page=page,
    )
```

```python
# backend/src/byr_api/app.py
import os


def build_sync_service() -> SyncService:
    auth_client = ByrAuthClient()
    board_service = BoardService(auth_client=auth_client)
    thread_service = ThreadService(auth_client=auth_client)
    cache = RedisSyncCache.from_env()
    interval_ms = int(os.getenv("BYR_SYNC_REQUEST_INTERVAL_MS", "500"))
    return SyncService(
        board_service=board_service,
        thread_service=thread_service,
        cache=cache,
        request_interval_seconds=max(interval_ms, 0) / 1000,
    )
```

```python
# backend/tests/unit/byr_api/test_app.py
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd backend && uv run pytest \
  tests/unit/byr_sync/test_throttle.py \
  tests/unit/byr_api/test_app.py -q
```

Expected:

- PASS and throttle hook is observable in unit tests.

- [ ] **Step 5: Commit**

```bash
git add \
  backend/src/byr_sync/service.py \
  backend/tests/unit/byr_sync/test_throttle.py \
  backend/tests/unit/byr_api/test_app.py
git commit -m "feat: 为同步抓取循环增加限速"
```

### Task 10: 清理 legacy 文件并补 README / 验证

**Files:**
- Delete: `apps/web/src/server/imports/fetchLegacyIwhisperBatch.ts`
- Delete: `apps/web/src/server/imports/legacyMigrationRunner.ts`
- Delete: `apps/web/src/server/imports/legacyTypes.ts`
- Delete: `apps/web/src/server/imports/mapLegacyRows.ts`
- Modify: `apps/web/README.md`
- Modify: `backend/README.md`

- [ ] **Step 1: Write the failing documentation and stale-reference checks**

Run:

```bash
rg -n "legacy-iwhisper|legacy_iwhisper|旧库导入 iwhisper|mapLegacyRows|fetchLegacyIwhisperBatch" apps/web backend
```

Expected:

- Matches still exist in routes, imports, tests, or README files.

- [ ] **Step 2: Remove stale references and update docs**

```md
<!-- apps/web/README.md -->
管理员可以通过 `/admin/imports` 发起硬编码板块的首次全量抓取，通过 `/admin/scheduled-tasks` 查看每个板块的定时同步状态。旧库 `iwhisper` 导入入口已经移除。
```

```md
<!-- backend/README.md -->
`/api/sync/updates` 既服务最近窗口同步，也服务 Web 端首次全量抓取。全量抓取不会新增独立接口，而是通过更大的 `window_minutes` 复用同一条同步链路。为避免影响主站，抓取循环会在多页请求之间执行固定等待。
```

- [ ] **Step 3: Run verification commands**

Run:

```bash
rg -n "legacy-iwhisper|legacy_iwhisper|旧库导入 iwhisper|mapLegacyRows|fetchLegacyIwhisperBatch" apps/web backend
pnpm --filter @bbs/web exec vitest run \
  apps/web/tests/admin-imports-page.test.tsx \
  apps/web/tests/admin-import-job-routes.test.ts \
  apps/web/tests/server/boardRegistry.test.ts \
  apps/web/tests/server/globalSyncThrottle.test.ts \
  apps/web/tests/server/boardFullSyncRunner.test.ts \
  apps/web/tests/server/runScheduledTask.test.ts \
  apps/web/tests/server/listRecentImportActivity.test.ts \
  apps/web/tests/server/listScheduledTasks.test.ts \
  apps/web/tests/server/webScheduler.test.ts
cd backend && uv run pytest \
  tests/unit/byr_api/test_app.py \
  tests/unit/byr_sync/test_service.py \
  tests/unit/byr_sync/test_throttle.py -q
pnpm lint
pnpm typecheck
```

Expected:

- `rg` returns no stale legacy references that matter to the new flow.
- Web tests PASS.
- Backend tests PASS.
- Lint PASS.
- Typecheck PASS.

- [ ] **Step 4: Commit**

```bash
git rm \
  apps/web/src/server/imports/fetchLegacyIwhisperBatch.ts \
  apps/web/src/server/imports/legacyMigrationRunner.ts \
  apps/web/src/server/imports/legacyTypes.ts \
  apps/web/src/server/imports/mapLegacyRows.ts
git add apps/web/README.md backend/README.md
git commit -m "chore: 清理旧库 iwhisper 导入遗留代码"
```

## Self-Review

### Spec coverage

- 硬编码板块清单：Task 1
- 首次全量 Admin 入口：Task 5, Task 8
- 每板块独立定时任务：Task 1, Task 7
- 复用 `/api/sync/updates`：Task 4, Task 9
- 全局串行限速：Task 3, Task 4, Task 7, Task 9
- 旧 `legacy iwhisper` 入口退场：Task 5, Task 8, Task 10
- 停止语义改为 `cancelled`：Task 6
- 文档与验证：Task 10

### Placeholder scan

- 未使用 `TODO`、`TBD`、`implement later` 等占位语句。
- 每个代码步骤都包含了目标文件和最小实现示例。
- 每个测试步骤都给出明确命令。

### Type consistency

- 统一使用 `boardSyncBoards` / `getBoardFullSyncDefinition` / `getScheduledBoardTasks`。
- 通用任务类型统一为 `byr_board_full_sync`。
- 手动任务限流统一使用 `manual:<boardName>` 形式的 `ownerKey`。
- 定时任务跳过原因统一用 `global throttle active`。
