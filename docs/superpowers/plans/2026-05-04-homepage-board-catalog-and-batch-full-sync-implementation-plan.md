# 首页板块固化与批量全量抓取 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `/admin/imports` 先展示一次性固化的全部 BYR 首页板块，并支持多选后创建一条批量全量抓取总任务，按代码顺序串行跑各板块、失败即停、从失败板块继续。

**Architecture:** 继续复用现有 `/api/sync/updates` 和 `runByrSyncImport` 导入链路，但把当前“一板块一条任务”的模型替换成“固化板块目录 + 一条总任务 + 板块级元数据进度”。Web 侧新增首页板块固化来源、批量总任务 runner 和总任务元数据状态机；定时任务仍然从同一份目录中只派生显式启用的板块。

**Tech Stack:** Next.js 16, TypeScript, Prisma, Vitest, FastAPI, Python 3.12, pytest

---

## Scope Check

这份 spec 涉及板块来源、Admin 多选交互、批量总任务状态机和定时任务派生，但它们都服务同一个“首页板块固化 + 批量全量抓取”功能，不适合再拆成多个独立计划。执行时按数据源、状态机、UI、验证四段切成小任务即可。

## File Structure

### Files to Create

- `apps/web/src/server/boardSync/boardCatalog.ts`
  - 保存一次性抓取 BYR 首页后固化下来的全部板块清单，是新的唯一板块事实源。
- `apps/web/src/server/imports/boardBatchFullSyncRunner.ts`
  - 总任务执行器，负责按代码顺序串行推进多个板块。
- `apps/web/src/server/imports/boardBatchJobMetadata.ts`
  - 封装总任务 `metadataJson` 的读取、初始化和更新。
- `apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts`
  - 多选提交后创建一条批量总任务。
- `apps/web/tests/server/boardCatalog.test.ts`
  - 固化板块目录与定时任务派生测试。
- `apps/web/tests/server/boardBatchJobMetadata.test.ts`
  - 总任务元数据状态机测试。
- `apps/web/tests/server/boardBatchFullSyncRunner.test.ts`
  - 总任务串行推进、失败即停、恢复跳过已完成板块测试。
- `backend/tests/unit/byr_boards/test_homepage_capture.py`
  - 若需要，把首页板块抓取结果固化前先用 fixture 验证一次抓取逻辑。

### Files to Modify

- `apps/web/src/server/boardSync/boardRegistry.ts`
  - 升级为从 `boardCatalog.ts` 派生，而不是只保存少量板块。
- `apps/web/app/admin/imports/page.tsx`
  - 从单板块按钮改成板块多选列表 + 一键开始全量抓取 + 批量总任务列表。
- `apps/web/tests/admin-imports-page.test.tsx`
  - 改成多选列表、总任务行、失败板块/当前板块/累计统计断言。
- `apps/web/src/server/imports/importJobStore.ts`
  - 新增批量总任务 `jobType`、受控状态迁移和批量元数据更新辅助方法。
- `apps/web/src/server/admin/listRecentImportActivity.ts`
  - 让最近活动能正确展示批量总任务的当前板块、失败板块和 `progressNote`。
- `apps/web/tests/server/listRecentImportActivity.test.ts`
  - 改成批量总任务样本。
- `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`
  - 支持批量总任务恢复，从失败板块继续。
- `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`
  - 支持批量总任务停止。
- `apps/web/tests/admin-import-job-routes.test.ts`
  - 改成批量总任务创建/恢复/停止断言。
- `apps/web/src/server/scheduler/taskRegistry.ts`
  - 由 `boardCatalog.ts` 派生定时任务候选，但只保留 `scheduledSyncEnabled` 板块。
- `apps/web/tests/server/boardRegistry.test.ts`
  - 从“只测 JobInfo”改成“目录驱动的派生行为”。
- `apps/web/tests/server/listScheduledTasks.test.ts`
  - 跟着新目录派生结果更新。
- `apps/web/README.md`
  - 改成说明“首页板块已固化为代码常量、多选创建总任务”。

### Files to Delete

- `apps/web/app/admin/api/import-jobs/byr-board-full-sync/route.ts`
  - 旧的单板块创建入口。
- `apps/web/src/server/imports/boardFullSyncRunner.ts`
  - 旧的单板块 runner。
- `apps/web/src/server/imports/scheduleBoardFullSync.ts`
  - 旧的单板块 fire-and-forget helper。
- `apps/web/tests/server/boardFullSyncRunner.test.ts`
  - 单板块 runner 测试。

删除这些文件时，要同步改掉 import 和测试引用，避免新旧两套任务模型同时存在。

## Plan

### Task 1: 固化 BYR 首页板块目录并统一派生来源

**Files:**
- Create: `apps/web/src/server/boardSync/boardCatalog.ts`
- Modify: `apps/web/src/server/boardSync/boardRegistry.ts`
- Modify: `apps/web/tests/server/boardRegistry.test.ts`
- Create: `apps/web/tests/server/boardCatalog.test.ts`

- [ ] **Step 1: Write the failing tests for the new board catalog source**

```ts
import { describe, expect, it } from "vitest";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { boardSyncBoards, getScheduledBoardTasks } from "@/src/server/boardSync/boardRegistry";

describe("boardCatalog", () => {
  it("contains IWhisper and other homepage boards as the canonical source", () => {
    expect(boardCatalog.length).toBeGreaterThan(1);
    expect(boardCatalog.some((board) => board.boardName === "IWhisper")).toBe(true);
    expect(boardCatalog.some((board) => board.boardName === "JobInfo")).toBe(true);
  });

  it("drives boardSyncBoards from the full catalog", () => {
    expect(boardSyncBoards.map((board) => board.boardName)).toEqual(
      boardCatalog.map((board) => board.boardName),
    );
  });

  it("only derives scheduled tasks from explicitly enabled boards", () => {
    const scheduledTasks = getScheduledBoardTasks();
    expect(scheduledTasks.every((task) => task.enabled)).toBe(true);
    expect(scheduledTasks.map((task) => task.boardName)).toEqual(
      boardCatalog.filter((board) => board.scheduledSyncEnabled).map((board) => board.boardName),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/boardCatalog.test.ts \
  tests/server/boardRegistry.test.ts
```

Expected:

- FAIL because `boardCatalog.ts` does not exist and `boardRegistry.ts` is still single-board oriented.

- [ ] **Step 3: Implement the catalog and registry derivation**

```ts
// apps/web/src/server/boardSync/boardCatalog.ts
export type BoardCatalogEntry = {
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

export const boardCatalog: readonly BoardCatalogEntry[] = [
  {
    boardName: "IWhisper",
    boardSlug: "iwhisper",
    title: "IWhisper 全量与定时同步",
    description: "悄悄话板块，支持全量和定时同步。",
    fullSyncEnabled: true,
    fullSyncWindowMinutes: 60 * 24 * 365 * 10,
    scheduledSyncEnabled: true,
    scheduledIntervalMinutes: 20,
    scheduledWindowMinutes: 30,
  },
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
```

```ts
// apps/web/src/server/boardSync/boardRegistry.ts
import { boardCatalog, type BoardCatalogEntry } from "./boardCatalog";

export type BoardSyncDefinition = BoardCatalogEntry;

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

export const boardSyncBoards: readonly BoardSyncDefinition[] = boardCatalog;

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

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/boardCatalog.test.ts \
  tests/server/boardRegistry.test.ts
```

Expected:

- PASS and the canonical board source is now the fixed homepage-derived catalog.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/boardSync/boardCatalog.ts \
  apps/web/src/server/boardSync/boardRegistry.ts \
  apps/web/tests/server/boardCatalog.test.ts \
  apps/web/tests/server/boardRegistry.test.ts
git commit -m "feat: 固化首页板块目录"
```

### Task 2: 为批量总任务建立元数据状态模型

**Files:**
- Create: `apps/web/src/server/imports/boardBatchJobMetadata.ts`
- Create: `apps/web/tests/server/boardBatchJobMetadata.test.ts`
- Modify: `apps/web/src/server/imports/importJobStore.ts`

- [ ] **Step 1: Write the failing tests for batch metadata state**

```ts
import { describe, expect, it } from "vitest";

import {
  createBatchJobMetadata,
  getCurrentBoardName,
  markBoardCompleted,
  markBoardFailed,
  type BoardBatchJobMetadata,
} from "@/src/server/imports/boardBatchJobMetadata";

describe("boardBatchJobMetadata", () => {
  it("creates ordered metadata from selected boards", () => {
    const metadata = createBatchJobMetadata({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
    });

    expect(metadata).toEqual({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
      completedBoardNames: [],
      currentBoardName: "IWhisper",
      failedBoardName: null,
      currentBoardIndex: 0,
      perBoardStats: {},
    });
  });

  it("moves to the next board after success and records per-board stats", () => {
    const metadata = markBoardCompleted(
      createBatchJobMetadata({
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
      }),
      {
        boardName: "IWhisper",
        processedThreads: 3,
        processedReplies: 7,
      },
    );

    expect(metadata.completedBoardNames).toEqual(["IWhisper"]);
    expect(metadata.currentBoardName).toBe("JobInfo");
    expect(metadata.perBoardStats.IWhisper).toEqual({
      processedThreads: 3,
      processedReplies: 7,
    });
  });

  it("records the failed board and keeps the cursor there", () => {
    const metadata = markBoardFailed(
      createBatchJobMetadata({
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
      }),
      "IWhisper",
    );

    expect(metadata.failedBoardName).toBe("IWhisper");
    expect(getCurrentBoardName(metadata)).toBe("IWhisper");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/server/boardBatchJobMetadata.test.ts
```

Expected:

- FAIL because the metadata helper module does not exist.

- [ ] **Step 3: Implement the metadata helper and store changes**

```ts
// apps/web/src/server/imports/boardBatchJobMetadata.ts
export type BoardBatchJobMetadata = {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
  completedBoardNames: string[];
  currentBoardName: string | null;
  failedBoardName: string | null;
  currentBoardIndex: number;
  perBoardStats: Record<
    string,
    {
      processedThreads: number;
      processedReplies: number;
    }
  >;
};

export function createBatchJobMetadata(input: {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
}): BoardBatchJobMetadata {
  return {
    selectedBoardNames: input.selectedBoardNames,
    orderedBoardNames: input.orderedBoardNames,
    completedBoardNames: [],
    currentBoardName: input.orderedBoardNames[0] ?? null,
    failedBoardName: null,
    currentBoardIndex: 0,
    perBoardStats: {},
  };
}

export function getCurrentBoardName(metadata: BoardBatchJobMetadata) {
  return metadata.currentBoardName;
}

export function markBoardCompleted(
  metadata: BoardBatchJobMetadata,
  input: {
    boardName: string;
    processedThreads: number;
    processedReplies: number;
  },
): BoardBatchJobMetadata {
  const nextIndex = metadata.currentBoardIndex + 1;
  return {
    ...metadata,
    completedBoardNames: [...metadata.completedBoardNames, input.boardName],
    currentBoardIndex: nextIndex,
    currentBoardName: metadata.orderedBoardNames[nextIndex] ?? null,
    failedBoardName: null,
    perBoardStats: {
      ...metadata.perBoardStats,
      [input.boardName]: {
        processedThreads: input.processedThreads,
        processedReplies: input.processedReplies,
      },
    },
  };
}

export function markBoardFailed(
  metadata: BoardBatchJobMetadata,
  boardName: string,
): BoardBatchJobMetadata {
  return {
    ...metadata,
    currentBoardName: boardName,
    failedBoardName: boardName,
  };
}
```

```ts
// apps/web/src/server/imports/importJobStore.ts
export type BoardBatchFullSyncJobInput = {
  selectedBoardNames: string[];
  orderedBoardNames: string[];
};

export function createBoardBatchFullSyncJob(
  prisma: ImportJobStore,
  input: BoardBatchFullSyncJobInput,
) {
  return prisma.importJob.create({
    data: {
      jobType: "byr_board_full_sync_batch",
      sourceType: "byr_sync_api",
      sourceLabel: "multi-board full sync",
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
      metadataJson: createBatchJobMetadata({
        selectedBoardNames: input.selectedBoardNames,
        orderedBoardNames: input.orderedBoardNames,
      }),
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/server/boardBatchJobMetadata.test.ts
```

Expected:

- PASS and the batch metadata state transitions are explicit and testable.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/imports/boardBatchJobMetadata.ts \
  apps/web/src/server/imports/importJobStore.ts \
  apps/web/tests/server/boardBatchJobMetadata.test.ts
git commit -m "feat: 增加批量全量抓取任务元数据状态机"
```

### Task 3: 将单板块创建入口替换为多选批量总任务入口

**Files:**
- Create: `apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts`
- Delete: `apps/web/app/admin/api/import-jobs/byr-board-full-sync/route.ts`
- Modify: `apps/web/tests/admin-import-job-routes.test.ts`

- [ ] **Step 1: Write the failing route tests for batch job creation**

```ts
import { describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  createBoardBatchFullSyncJob: vi.fn(),
  scheduleBoardBatchFullSync: vi.fn(),
  prisma: {},
}));

vi.mock("@/src/server/db/client", () => ({
  prisma: routeMocks.prisma,
}));

vi.mock("@/src/server/imports/importJobStore", () => ({
  createBoardBatchFullSyncJob: routeMocks.createBoardBatchFullSyncJob,
}));

vi.mock("@/src/server/imports/scheduleBoardBatchFullSync", () => ({
  scheduleBoardBatchFullSync: routeMocks.scheduleBoardBatchFullSync,
}));

import { POST as startPOST } from "../app/admin/api/import-jobs/byr-board-full-sync-batch/route";

describe("board batch full sync route", () => {
  it("creates one batch job from multiple selected boards and reorders them by catalog order", async () => {
    routeMocks.createBoardBatchFullSyncJob.mockResolvedValue({ id: "job-batch-1" });
    const formData = new FormData();
    formData.append("boardNames", "JobInfo");
    formData.append("boardNames", "IWhisper");
    const request = new Request("http://localhost/admin/api/import-jobs/byr-board-full-sync-batch", {
      method: "POST",
      body: formData,
    });

    const response = await startPOST(request);

    expect(routeMocks.createBoardBatchFullSyncJob).toHaveBeenCalledWith(
      routeMocks.prisma,
      {
        selectedBoardNames: ["JobInfo", "IWhisper"],
        orderedBoardNames: ["IWhisper", "JobInfo"],
      },
    );
    expect(routeMocks.scheduleBoardBatchFullSync).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ ok: true, jobId: "job-batch-1" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/admin-import-job-routes.test.ts
```

Expected:

- FAIL because the batch route and its schedule helper do not exist yet.

- [ ] **Step 3: Implement the new batch route**

```ts
// apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts
import { NextResponse } from "next/server";

import { boardSyncBoards } from "@/src/server/boardSync/boardRegistry";
import { prisma } from "@/src/server/db/client";
import { createBoardBatchFullSyncJob } from "@/src/server/imports/importJobStore";
import { scheduleBoardBatchFullSync } from "@/src/server/imports/scheduleBoardBatchFullSync";

export async function POST(request: Request) {
  const formData = await request.formData();
  const selectedBoardNames = formData
    .getAll("boardNames")
    .map((value) => String(value))
    .filter((value) => value.trim().length > 0);

  if (selectedBoardNames.length === 0) {
    return NextResponse.json({ ok: false, error: "At least one board must be selected" }, { status: 400 });
  }

  const knownBoardNames = new Set(boardSyncBoards.map((board) => board.boardName));
  if (selectedBoardNames.some((name) => !knownBoardNames.has(name))) {
    return NextResponse.json({ ok: false, error: "Unknown board selection" }, { status: 400 });
  }

  const orderedBoardNames = boardSyncBoards
    .map((board) => board.boardName)
    .filter((name) => selectedBoardNames.includes(name));

  const job = await createBoardBatchFullSyncJob(prisma, {
    selectedBoardNames,
    orderedBoardNames,
  });

  scheduleBoardBatchFullSync(job.id);

  return NextResponse.json({ ok: true, jobId: job.id });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/admin-import-job-routes.test.ts
```

Expected:

- PASS and the route creates one ordered batch job for multiple selected boards.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/app/admin/api/import-jobs/byr-board-full-sync-batch/route.ts \
  apps/web/tests/admin-import-job-routes.test.ts \
  apps/web/src/server/imports/importJobStore.ts
git rm apps/web/app/admin/api/import-jobs/byr-board-full-sync/route.ts
git commit -m "feat: 增加批量全量抓取总任务入口"
```

### Task 4: 为批量总任务实现串行 runner 和恢复点

**Files:**
- Create: `apps/web/src/server/imports/boardBatchFullSyncRunner.ts`
- Create: `apps/web/src/server/imports/scheduleBoardBatchFullSync.ts`
- Test: `apps/web/tests/server/boardBatchFullSyncRunner.test.ts`
- Modify: `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`

- [ ] **Step 1: Write the failing tests for batch runner sequencing**

```ts
import { describe, expect, it, vi } from "vitest";

import {
  createBatchJobMetadata,
  markBoardCompleted,
} from "@/src/server/imports/boardBatchJobMetadata";
import { runBoardBatchFullSyncJob } from "@/src/server/imports/boardBatchFullSyncRunner";

describe("runBoardBatchFullSyncJob", () => {
  it("runs selected boards in catalog order and advances to the next board", async () => {
    const runByrSyncImport = vi
      .fn()
      .mockResolvedValueOnce({
        importedThreads: 2,
        importedReplies: 5,
        skippedReplies: 0,
      })
      .mockResolvedValueOnce({
        importedThreads: 3,
        importedReplies: 7,
        skippedReplies: 1,
      });

    const metadata = createBatchJobMetadata({
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
    });

    const result = await runBoardBatchFullSyncJob(
      {
        findJobById: vi.fn(async () => ({
          id: "batch-1",
          status: "pending",
          metadataJson: metadata,
        })),
        markJobRunning: vi.fn(async () => ({ count: 1 })),
        updateJobProgress: vi.fn(),
        markJobSucceeded: vi.fn(async () => ({ count: 1 })),
        markJobFailed: vi.fn(async () => ({ count: 1 })),
        runByrSyncImport,
        prisma: {},
      } as never,
      {
        jobId: "batch-1",
        acquireThrottle: () => ({
          acquired: true,
          holder: {
            ownerKey: "manual:batch-1",
            triggerSource: "manual",
            acquiredAt: new Date("2026-05-04T10:00:00.000Z"),
          },
        }),
        releaseThrottle: vi.fn(),
      },
    );

    expect(runByrSyncImport).toHaveBeenNthCalledWith(1, expect.objectContaining({
      boardName: "IWhisper",
    }));
    expect(runByrSyncImport).toHaveBeenNthCalledWith(2, expect.objectContaining({
      boardName: "JobInfo",
    }));
    expect(result.status).toBe("succeeded");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/server/boardBatchFullSyncRunner.test.ts
```

Expected:

- FAIL because the batch runner does not exist.

- [ ] **Step 3: Implement the batch runner and scheduler**

```ts
// apps/web/src/server/imports/scheduleBoardBatchFullSync.ts
import { prisma } from "@/src/server/db/client";
import { runBoardBatchFullSyncJob } from "./boardBatchFullSyncRunner";

export function scheduleBoardBatchFullSync(jobId: string) {
  setTimeout(() => {
    void runBoardBatchFullSyncJob(
      {
        prisma,
        findJobById: (scheduledJobId) => prisma.importJob.findUnique({ where: { id: scheduledJobId } }),
        markJobRunning: () => Promise.resolve({ count: 1 }),
        updateJobProgress: (scheduledJobId, progress) =>
          prisma.importJob.update({
            where: { id: scheduledJobId },
            data: progress,
          }),
        markJobSucceeded: () => Promise.resolve({ count: 1 }),
        markJobFailed: () => Promise.resolve({ count: 1 }),
      } as never,
      {
        jobId,
        acquireThrottle: () => ({
          acquired: true,
          holder: {
            ownerKey: `manual:${jobId}`,
            triggerSource: "manual" as const,
            acquiredAt: new Date(),
          },
        }),
        releaseThrottle: () => undefined,
      },
    ).catch(() => {
      // persisted by job state
    });
  }, 0);
}
```

```ts
// apps/web/src/server/imports/boardBatchFullSyncRunner.ts
import { runByrSyncImport } from "@/app/admin/api/imports/byr-sync/route";
import {
  createBatchJobMetadata,
  getCurrentBoardName,
  markBoardCompleted,
  markBoardFailed,
  type BoardBatchJobMetadata,
} from "./boardBatchJobMetadata";

export async function runBoardBatchFullSyncJob(
  deps: {
    findJobById: (jobId: string) => Promise<any>;
    markJobRunning: (jobId: string) => Promise<{ count: number } | unknown>;
    updateJobProgress: (jobId: string, progress: Record<string, unknown>) => Promise<unknown>;
    markJobSucceeded: (jobId: string) => Promise<{ count: number } | unknown>;
    markJobFailed: (jobId: string, errorMessage: string) => Promise<{ count: number } | unknown>;
    prisma: any;
    runByrSyncImport?: typeof runByrSyncImport;
  },
  input: {
    jobId: string;
    acquireThrottle: () => { acquired: boolean; holder: unknown };
    releaseThrottle: () => void;
  },
) {
  const runImport = deps.runByrSyncImport ?? runByrSyncImport;
  const job = await deps.findJobById(input.jobId);
  const metadata = job.metadataJson as BoardBatchJobMetadata;

  const throttle = input.acquireThrottle();
  if (!throttle.acquired) {
    await deps.updateJobProgress(input.jobId, {
      status: "paused",
      progressNote: `等待全局抓取窗口，当前板块 ${getCurrentBoardName(metadata) ?? "—"}`,
    });
    return { status: "paused" as const };
  }

  try {
    const runningResult = await deps.markJobRunning(input.jobId);
    if (
      runningResult &&
      typeof runningResult === "object" &&
      "count" in runningResult &&
      runningResult.count === 0
    ) {
      return { status: "cancelled" as const };
    }

    let current = metadata;
    for (let index = current.currentBoardIndex; index < current.orderedBoardNames.length; index += 1) {
      const boardName = current.orderedBoardNames[index]!;
      try {
        const importResult = await runImport({
          prisma: deps.prisma,
          boardName,
          windowMinutes: 60 * 24 * 365 * 10,
          limit: null,
        });
        current = markBoardCompleted(current, {
          boardName,
          processedThreads: importResult.importedThreads,
          processedReplies: importResult.importedReplies,
        });
        await deps.updateJobProgress(input.jobId, {
          metadataJson: current,
          processedThreads:
            Object.values(current.perBoardStats).reduce((sum, stat) => sum + stat.processedThreads, 0),
          processedReplies:
            Object.values(current.perBoardStats).reduce((sum, stat) => sum + stat.processedReplies, 0),
          progressNote: current.currentBoardName
            ? `当前板块 ${current.currentBoardName}`
            : "全部板块已完成",
        });
      } catch (error) {
        current = markBoardFailed(current, boardName);
        await deps.updateJobProgress(input.jobId, {
          metadataJson: current,
          progressNote: `板块 ${boardName} 失败`,
        });
        await deps.markJobFailed(
          input.jobId,
          error instanceof Error ? error.message : "Unknown batch full sync error",
        );
        return { status: "failed" as const };
      }
    }

    await deps.markJobSucceeded(input.jobId);
    return { status: "succeeded" as const };
  } finally {
    input.releaseThrottle();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/server/boardBatchFullSyncRunner.test.ts
```

Expected:

- PASS and the batch runner advances boards in catalog order.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/imports/boardBatchFullSyncRunner.ts \
  apps/web/src/server/imports/scheduleBoardBatchFullSync.ts \
  apps/web/tests/server/boardBatchFullSyncRunner.test.ts \
  apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts
git commit -m "feat: 增加批量全量抓取总任务执行器"
```

### Task 5: 把 `/admin/imports` 改成多选板块 + 一条总任务

**Files:**
- Modify: `apps/web/app/admin/imports/page.tsx`
- Modify: `apps/web/tests/admin-imports-page.test.tsx`

- [ ] **Step 1: Write the failing tests for batch-selection UI**

```ts
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import AdminImportsPage from "../app/admin/imports/page";
import { boardCatalog } from "@/src/server/boardSync/boardCatalog";

describe("admin imports page", () => {
  it("renders all catalog boards as checkboxes and one batch submit button", async () => {
    render(await AdminImportsPage());

    const fullSyncBoards = boardCatalog;
    for (const board of fullSyncBoards) {
      expect(screen.getByRole("checkbox", { name: board.boardName })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "开始全量抓取" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /开始抓取 .* 全量内容/u })).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/admin-imports-page.test.tsx
```

Expected:

- FAIL because the page still renders per-board buttons instead of a multi-select form.

- [ ] **Step 3: Implement the multi-select UI**

```tsx
// apps/web/app/admin/imports/page.tsx
import Link from "next/link";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { prisma } from "@/src/server/db/client";
import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";

export default async function AdminImportsPage() {
  const boards = boardCatalog;
  const recentActivity = await listRecentImportActivity(prisma);
  const importJobs = await prisma.importJob.findMany({
    where: { jobType: "byr_board_full_sync_batch" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="min-h-screen p-8">
      <p className="text-sm text-zinc-500">
        <Link href="/admin">返回总览</Link>
      </p>
      <h1 className="text-3xl font-semibold">导入导出</h1>

      <form action="/admin/api/import-jobs/byr-board-full-sync-batch" method="post" className="mt-6">
        <fieldset className="grid gap-3">
          <legend className="text-lg font-medium">选择要全量抓取的板块</legend>
          {boards.map((board) => (
            <label key={board.boardName} className="flex items-center gap-3 text-sm">
              <input name="boardNames" type="checkbox" value={board.boardName} />
              <span>{board.boardName}</span>
            </label>
          ))}
        </fieldset>
        <button
          className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm"
          type="submit"
        >
          开始全量抓取
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run tests/admin-imports-page.test.tsx
```

Expected:

- PASS and the page now renders a registry-wide checkbox list plus one batch submit button.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/app/admin/imports/page.tsx \
  apps/web/tests/admin-imports-page.test.tsx
git commit -m "feat: 将导入页改为批量板块选择"
```

### Task 6: 让任务列表展示批量总任务状态并支持从失败板块恢复

**Files:**
- Modify: `apps/web/src/server/admin/listRecentImportActivity.ts`
- Modify: `apps/web/tests/server/listRecentImportActivity.test.ts`
- Modify: `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`
- Modify: `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`
- Modify: `apps/web/tests/admin-import-job-routes.test.ts`

- [ ] **Step 1: Write the failing tests for batch resume/stop and operator activity**

```ts
it("resumes a batch full-sync job from its failed board", async () => {
  routeMocks.findJobById.mockResolvedValue({
    id: "batch-1",
    jobType: "byr_board_full_sync_batch",
    status: "failed",
    metadataJson: {
      selectedBoardNames: ["JobInfo", "IWhisper"],
      orderedBoardNames: ["IWhisper", "JobInfo"],
      completedBoardNames: ["IWhisper"],
      currentBoardName: "JobInfo",
      failedBoardName: "JobInfo",
      currentBoardIndex: 1,
      perBoardStats: {
        IWhisper: { processedThreads: 2, processedReplies: 6 },
      },
    },
  });

  const response = await resumePOST(request, {
    params: Promise.resolve({ jobId: "batch-1" }),
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ ok: true, jobId: "batch-1" });
});
```

```ts
it("prefers progressNote for paused batch jobs in recent activity", async () => {
  const result = await listRecentImportActivity({
    import: { findMany: vi.fn(async () => []) } as any,
    importJob: {
      findMany: vi.fn(async () => [
        {
          id: "job-1",
          jobType: "byr_board_full_sync_batch",
          sourceLabel: "multi-board full sync",
          status: "paused",
          createdAt: new Date("2026-05-04T10:00:00.000Z"),
          startedAt: new Date("2026-05-04T10:02:00.000Z"),
          finishedAt: new Date("2026-05-04T10:03:00.000Z"),
          processedThreads: 4,
          processedReplies: 12,
          errorMessage: null,
          progressNote: "等待全局抓取窗口，当前板块 JobInfo",
        },
      ]),
    } as any,
  });

  expect(result[0]?.detail).toBe("等待全局抓取窗口，当前板块 JobInfo");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/admin-import-job-routes.test.ts \
  tests/server/listRecentImportActivity.test.ts
```

Expected:

- FAIL because the routes and activity list still assume `byr_board_full_sync`.

- [ ] **Step 3: Implement batch operator behavior**

```ts
// apps/web/src/server/admin/listRecentImportActivity.ts
detail:
  job.progressNote ??
  job.errorMessage ??
  `帖子 ${job.processedThreads}，回复 ${job.processedReplies}`,
```

```ts
// apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts
if (job.jobType !== "byr_board_full_sync_batch") {
  return NextResponse.json(
    { ok: false, error: "Only batch full sync jobs can be resumed" },
    { status: 409 },
  );
}
```

```ts
// apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts
if (job.jobType !== "byr_board_full_sync_batch") {
  return NextResponse.json(
    { ok: false, error: "Only batch full sync jobs can be stopped" },
    { status: 409 },
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/admin-import-job-routes.test.ts \
  tests/server/listRecentImportActivity.test.ts
```

Expected:

- PASS and the operator surface now talks in batch-job semantics.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/admin/listRecentImportActivity.ts \
  apps/web/tests/server/listRecentImportActivity.test.ts \
  apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts \
  apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts \
  apps/web/tests/admin-import-job-routes.test.ts
git commit -m "feat: 接入批量全量抓取任务状态与恢复"
```

### Task 7: 让定时任务只从显式启用板块派生，并保持与批量总任务共存

**Files:**
- Modify: `apps/web/src/server/scheduler/taskRegistry.ts`
- Modify: `apps/web/tests/server/listScheduledTasks.test.ts`
- Modify: `apps/web/tests/server/webScheduler.test.ts`

- [ ] **Step 1: Write the failing tests for scheduled-task derivation from the full catalog**

```ts
import { describe, expect, it } from "vitest";

import { boardCatalog } from "@/src/server/boardSync/boardCatalog";
import { scheduledTasks } from "@/src/server/scheduler/taskRegistry";

describe("scheduled task derivation", () => {
  it("only includes boards explicitly enabled for scheduled sync", () => {
    expect(scheduledTasks.map((task) => task.boardName)).toEqual(
      boardCatalog.filter((board) => board.scheduledSyncEnabled).map((board) => board.boardName),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts
```

Expected:

- FAIL if the task registry still mixes old hardcoded assumptions with the full catalog.

- [ ] **Step 3: Implement the derivation cleanup**

```ts
// apps/web/src/server/scheduler/taskRegistry.ts
import { getScheduledBoardTasks } from "@/src/server/boardSync/boardRegistry";

export const scheduledTasks = getScheduledBoardTasks() as const;
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts
```

Expected:

- PASS and the scheduled task set is fully derived from the explicit catalog flags.

- [ ] **Step 5: Commit**

```bash
git add \
  apps/web/src/server/scheduler/taskRegistry.ts \
  apps/web/tests/server/listScheduledTasks.test.ts \
  apps/web/tests/server/webScheduler.test.ts
git commit -m "refactor: 统一从板块目录派生定时任务"
```

### Task 8: 文档与最终验证

**Files:**
- Modify: `apps/web/README.md`
- Modify: `backend/README.md`

- [ ] **Step 1: Write the failing stale-design checks**

Run:

```bash
rg -n "单板块|开始抓取 JobInfo 全量内容|byr_board_full_sync\\b|每板块一条|旧设计" \
  apps/web backend docs/superpowers/plans docs/superpowers/specs
```

Expected:

- Matches still exist in docs or code that assume the old one-board-one-job approach.

- [ ] **Step 2: Update docs to the batch full-sync model**

```md
<!-- apps/web/README.md -->
管理员可以通过 `/admin/imports` 查看固化的板块列表，勾选一个或多个板块后创建一条批量全量抓取总任务。定时任务仍然只针对代码里显式启用的板块生成。
```

```md
<!-- backend/README.md -->
`/api/sync/updates` 继续作为 Web 最近同步和批量全量抓取的统一入口。普通最近同步沿用默认 `limit=20`，而批量全量抓取可在保持同一接口的前提下请求无硬上限模式。
```

- [ ] **Step 3: Run final verification**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
npx pnpm@10.11.0 --filter @bbs/web typecheck
npx pnpm@10.11.0 --filter @bbs/web exec vitest run \
  tests/admin-import-job-routes.test.ts \
  tests/admin-imports-page.test.tsx \
  tests/server/boardCatalog.test.ts \
  tests/server/boardBatchJobMetadata.test.ts \
  tests/server/boardBatchFullSyncRunner.test.ts \
  tests/server/listRecentImportActivity.test.ts \
  tests/server/listScheduledTasks.test.ts \
  tests/server/webScheduler.test.ts
cd backend && uv run pytest tests/unit/byr_api/test_app.py tests/unit/byr_boards/test_service.py tests/unit/byr_sync/test_service.py tests/unit/byr_sync/test_throttle.py -q
```

Expected:

- `@bbs/web` typecheck PASS
- 新增/修改的 Web 测试 PASS
- 相关 backend 测试 PASS

- [ ] **Step 4: Commit**

```bash
git add \
  apps/web/README.md \
  backend/README.md \
  docs/superpowers/plans/2026-05-04-homepage-board-catalog-and-batch-full-sync-implementation-plan.md
git commit -m "docs: 更新批量全量抓取说明与验证记录"
```

## Self-Review

### Spec coverage

- 首页板块抓取并固化来源：Task 1
- `/admin/imports` 多选列表：Task 5
- 一次多选创建一条总任务：Task 3
- 总任务按代码顺序串行推进：Task 4
- 失败即停：Task 4
- 从失败板块恢复：Task 4 + Task 6
- `IWhisper` 也在同一列表里：Task 1 + Task 5
- 定时任务只从显式启用板块派生：Task 1 + Task 7

### Placeholder scan

- 没有使用 `TODO`、`TBD`、`implement later` 之类占位语句。
- 每个任务都给出确切文件路径、测试命令和最小代码草案。
- 没有使用“类似 Task N”这类跳跃式描述。

### Type consistency

- 固化目录统一叫 `boardCatalog`
- 页面导出清单统一叫 `boardSyncBoards`
- 总任务类型统一叫 `byr_board_full_sync_batch`
- 总任务元数据统一使用 `selectedBoardNames / orderedBoardNames / completedBoardNames / currentBoardName / failedBoardName / currentBoardIndex / perBoardStats`

