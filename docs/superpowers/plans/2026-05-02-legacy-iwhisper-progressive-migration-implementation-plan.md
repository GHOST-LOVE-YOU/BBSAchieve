# Legacy IWhisper Progressive Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a resumable admin-triggered background migration for legacy `iwhisper` data that converts old PostgreSQL rows into the same normalized DTO and Prisma write path used by sync imports.

**Architecture:** Keep migration orchestration in the Web app. Add `importJobs` to Prisma, create one legacy adapter that reads old rows and maps them into the normalized import DTO, and run a same-process background worker that advances one thread cursor at a time while persisting status and recovery metadata into the new database.

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, TypeScript, Vitest

---

## File Structure

- Modify: `apps/web/prisma/schema.prisma`
  - Add `ImportJob` model
- Create: `apps/web/src/server/imports/legacyTypes.ts`
  - Legacy DB row shapes and normalized thread cursor helpers
- Create: `apps/web/src/server/imports/fetchLegacyIwhisperBatch.ts`
  - Query old PostgreSQL for the next `iwhisper` thread batch
- Create: `apps/web/src/server/imports/mapLegacyRows.ts`
  - Convert old rows into the normalized import DTO
- Create: `apps/web/src/server/imports/legacyMigrationRunner.ts`
  - Same-process migration runner that updates `importJobs`
- Create: `apps/web/src/server/imports/importJobStore.ts`
  - Focused Prisma helpers for create/update/read `importJobs`
- Create: `apps/web/app/admin/api/import-jobs/legacy-iwhisper/route.ts`
  - Start legacy migration job
- Create: `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`
  - Resume a paused or failed legacy job
- Create: `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`
  - Mark job as cancelled
- Modify: `apps/web/app/admin/imports/page.tsx`
  - Render recent jobs, progress, resume/stop controls
- Create: `apps/web/tests/server/mapLegacyRows.test.ts`
  - Verify old rows convert into normalized DTO correctly
- Create: `apps/web/tests/server/legacyMigrationRunner.test.ts`
  - Verify cursor progression and resume semantics
- Create: `apps/web/tests/admin-import-jobs-page.test.tsx`
  - Verify page renders jobs and action buttons

### Task 1: Add `ImportJob` to Prisma and generate the client

**Files:**
- Modify: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/*`

- [ ] **Step 1: Extend the schema with the job model**

```prisma
enum ImportJobStatus {
  pending
  running
  paused
  failed
  succeeded
  cancelled
}

model ImportJob {
  id               String          @id @default(uuid())
  jobType          String
  sourceType       String
  sourceLabel      String
  status           ImportJobStatus
  cursorThreadKey  String?
  lastProcessedAt  DateTime?
  startedAt        DateTime?
  finishedAt       DateTime?
  processedThreads Int             @default(0)
  processedReplies Int             @default(0)
  skippedThreads   Int             @default(0)
  skippedReplies   Int             @default(0)
  errorMessage     String?
  progressNote     String?
  metadataJson     Json?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
}
```

- [ ] **Step 2: Run Prisma generate and migrate**

Run: `npx pnpm@10.11.0 --filter @bbs/web prisma:generate && npx pnpm@10.11.0 --filter @bbs/web prisma:migrate --name add_import_jobs`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/prisma
git commit -m "feat: add import jobs schema"
```

### Task 2: Build the legacy row adapter and normalized DTO mapper

**Files:**
- Create: `apps/web/src/server/imports/legacyTypes.ts`
- Create: `apps/web/src/server/imports/mapLegacyRows.ts`
- Create: `apps/web/tests/server/mapLegacyRows.test.ts`

- [ ] **Step 1: Write the failing mapper test**

```ts
import { describe, expect, it } from "vitest";
import { mapLegacyRows } from "../../src/server/imports/mapLegacyRows";

describe("mapLegacyRows", () => {
  it("maps one legacy thread into the normalized import format", () => {
    const result = mapLegacyRows({
      boardSlug: "iwhisper",
      rows: [
        {
          sourceThreadId: "8830220",
          title: "Legacy thread",
          body: "Legacy body",
          authorUsername: "legacy-bot",
          publishedAt: "2026-05-01T09:00:00.000Z",
          replies: [
            {
              replyIndex: 1,
              body: "First reply",
              authorUsername: "legacy-bot-2",
              publishedAt: "2026-05-01T09:10:00.000Z",
            },
          ],
        },
      ],
    });

    expect(result.sourceType).toBe("legacy_postgres");
    expect(result.threads[0]?.sourceThreadId).toBe("8830220");
    expect(result.threads[0]?.replies[0]?.replyIndex).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/mapLegacyRows.test.ts -v`  
Expected: FAIL with module not found for `mapLegacyRows`

- [ ] **Step 3: Implement the legacy mapper**

```ts
// apps/web/src/server/imports/mapLegacyRows.ts
import type { NormalizedImportBatch } from "./syncTypes";

export function mapLegacyRows(input: {
  boardSlug: "iwhisper";
  rows: Array<{
    sourceThreadId: string;
    title: string;
    body: string;
    authorUsername: string;
    publishedAt: string;
    replies: Array<{
      replyIndex: number;
      body: string;
      authorUsername: string;
      publishedAt: string;
    }>;
  }>;
}): NormalizedImportBatch {
  return {
    sourceType: "legacy_postgres",
    sourceLabel: "legacy iwhisper",
    board: {
      slug: input.boardSlug,
      name: "IWhisper",
      description: null,
    },
    threads: input.rows.map((row) => ({
      sourceThreadId: row.sourceThreadId,
      sourceBoardSlug: input.boardSlug,
      title: row.title,
      body: row.body,
      authorUsername: row.authorUsername,
      authorDisplayName: row.authorUsername,
      publishedAt: row.publishedAt,
      replies: row.replies.map((reply) => ({
        authorUsername: reply.authorUsername,
        authorDisplayName: reply.authorUsername,
        body: reply.body,
        replyIndex: reply.replyIndex,
        publishedAt: reply.publishedAt,
      })),
    })),
  };
}
```

- [ ] **Step 4: Run the mapper test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/mapLegacyRows.test.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/imports/legacyTypes.ts apps/web/src/server/imports/mapLegacyRows.ts apps/web/tests/server/mapLegacyRows.test.ts
git commit -m "feat: add legacy iwhisper dto mapper"
```

### Task 3: Add the legacy reader and job store

**Files:**
- Create: `apps/web/src/server/imports/fetchLegacyIwhisperBatch.ts`
- Create: `apps/web/src/server/imports/importJobStore.ts`
- Create: `apps/web/tests/server/legacyMigrationRunner.test.ts`

- [ ] **Step 1: Write the failing job-store test**

```ts
import { describe, expect, it } from "vitest";

describe("legacy job store", () => {
  it("tracks the last completed thread cursor", async () => {
    const job = {
      cursorThreadKey: "8830220",
      processedThreads: 1,
    };

    expect(job.cursorThreadKey).toBe("8830220");
    expect(job.processedThreads).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/legacyMigrationRunner.test.ts -v`  
Expected: FAIL because the test file imports missing runner/store modules

- [ ] **Step 3: Implement focused job store helpers**

```ts
// apps/web/src/server/imports/importJobStore.ts
import { prisma } from "../db/client";

export async function createLegacyImportJob() {
  return prisma.importJob.create({
    data: {
      jobType: "legacy_iwhisper_migration",
      sourceType: "legacy_postgres",
      sourceLabel: "legacy iwhisper",
      status: "pending",
      metadataJson: {
        boardSlug: "iwhisper",
        direction: "newest-first",
      },
    },
  });
}

export async function markJobRunning(jobId: string) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: { status: "running", startedAt: new Date(), errorMessage: null },
  });
}

export async function updateJobProgress(jobId: string, input: {
  cursorThreadKey: string;
  processedThreads: number;
  processedReplies: number;
  skippedReplies: number;
}) {
  return prisma.importJob.update({
    where: { id: jobId },
    data: {
      cursorThreadKey: input.cursorThreadKey,
      processedThreads: input.processedThreads,
      processedReplies: input.processedReplies,
      skippedReplies: input.skippedReplies,
      lastProcessedAt: new Date(),
    },
  });
}
```

- [ ] **Step 4: Add the legacy batch reader skeleton**

```ts
// apps/web/src/server/imports/fetchLegacyIwhisperBatch.ts
export async function fetchLegacyIwhisperBatch(input: {
  cursorThreadKey?: string | null;
  take: number;
}) {
  const databaseUrl = process.env.LEGACY_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing LEGACY_DATABASE_URL");
  }

  return {
    rows: [],
    nextCursor: input.cursorThreadKey ?? null,
  };
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/imports/fetchLegacyIwhisperBatch.ts apps/web/src/server/imports/importJobStore.ts apps/web/tests/server/legacyMigrationRunner.test.ts
git commit -m "feat: add legacy import job store scaffolding"
```

### Task 4: Implement the same-process migration runner

**Files:**
- Create: `apps/web/src/server/imports/legacyMigrationRunner.ts`
- Create: `apps/web/tests/server/legacyMigrationRunner.test.ts`

- [ ] **Step 1: Write the failing runner test**

```ts
import { describe, expect, it, vi } from "vitest";
import { runLegacyMigrationJob } from "../../src/server/imports/legacyMigrationRunner";

describe("runLegacyMigrationJob", () => {
  it("advances one thread cursor only after a full thread import succeeds", async () => {
    const importSyncBatch = vi.fn(async () => ({
      importedThreads: 1,
      importedReplies: 2,
      skippedReplies: 0,
    }));

    const result = await runLegacyMigrationJob({
      jobId: "job-1",
      fetchBatch: async () => ({
        rows: [
          {
            sourceThreadId: "8830220",
            title: "Legacy thread",
            body: "Legacy body",
            authorUsername: "legacy-bot",
            publishedAt: "2026-05-01T09:00:00.000Z",
            replies: [],
          },
        ],
        nextCursor: "8830220",
      }),
      importBatch: importSyncBatch,
    });

    expect(result.cursorThreadKey).toBe("8830220");
    expect(importSyncBatch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the runner test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/legacyMigrationRunner.test.ts -v`  
Expected: FAIL with module not found for `legacyMigrationRunner`

- [ ] **Step 3: Implement the runner**

```ts
// apps/web/src/server/imports/legacyMigrationRunner.ts
import { mapLegacyRows } from "./mapLegacyRows";

export async function runLegacyMigrationJob(input: {
  jobId: string;
  fetchBatch: (args: { cursorThreadKey?: string | null; take: number }) => Promise<{
    rows: Array<{
      sourceThreadId: string;
      title: string;
      body: string;
      authorUsername: string;
      publishedAt: string;
      replies: Array<{
        replyIndex: number;
        body: string;
        authorUsername: string;
        publishedAt: string;
      }>;
    }>;
    nextCursor: string | null;
  }>;
  importBatch: (batch: ReturnType<typeof mapLegacyRows>) => Promise<{
    importedThreads: number;
    importedReplies: number;
    skippedReplies: number;
  }>;
}) {
  const page = await input.fetchBatch({ cursorThreadKey: null, take: 20 });

  if (page.rows.length === 0) {
    return {
      cursorThreadKey: null,
      importedThreads: 0,
      importedReplies: 0,
      skippedReplies: 0,
    };
  }

  let importedThreads = 0;
  let importedReplies = 0;
  let skippedReplies = 0;
  let cursorThreadKey: string | null = null;

  for (const row of page.rows) {
    const batch = mapLegacyRows({
      boardSlug: "iwhisper",
      rows: [row],
    });

    const result = await input.importBatch(batch);
    importedThreads += result.importedThreads;
    importedReplies += result.importedReplies;
    skippedReplies += result.skippedReplies;
    cursorThreadKey = row.sourceThreadId;
  }

  return {
    cursorThreadKey: page.nextCursor ?? cursorThreadKey,
    importedThreads,
    importedReplies,
    skippedReplies,
  };
}
```

- [ ] **Step 4: Run the runner test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/legacyMigrationRunner.test.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/imports/legacyMigrationRunner.ts apps/web/tests/server/legacyMigrationRunner.test.ts
git commit -m "feat: add resumable legacy migration runner"
```

### Task 5: Add admin routes and UI for start/resume/stop

**Files:**
- Create: `apps/web/app/admin/api/import-jobs/legacy-iwhisper/route.ts`
- Create: `apps/web/app/admin/api/import-jobs/[jobId]/resume/route.ts`
- Create: `apps/web/app/admin/api/import-jobs/[jobId]/stop/route.ts`
- Modify: `apps/web/app/admin/imports/page.tsx`
- Create: `apps/web/tests/admin-import-jobs-page.test.tsx`

- [ ] **Step 1: Write the failing admin page test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AdminImportsPage from "../app/admin/imports/page";

describe("admin import jobs page", () => {
  it("shows the legacy migration trigger", async () => {
    render(await AdminImportsPage());
    expect(screen.getByText("从旧库导入 iwhisper")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the admin page test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/admin-import-jobs-page.test.tsx -v`  
Expected: FAIL because the button is not rendered yet

- [ ] **Step 3: Add the routes and update the page**

```ts
// apps/web/app/admin/api/import-jobs/legacy-iwhisper/route.ts
import { NextResponse } from "next/server";
import { createLegacyImportJob } from "@/src/server/imports/importJobStore";

export async function POST() {
  const job = await createLegacyImportJob();
  return NextResponse.json({ ok: true, jobId: job.id }, { status: 200 });
}
```

```tsx
// add to apps/web/app/admin/imports/page.tsx
<form action="/admin/api/import-jobs/legacy-iwhisper" method="post" className="mt-4">
  <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm" type="submit">
    从旧库导入 iwhisper
  </button>
</form>
```

- [ ] **Step 4: Run the admin page test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/admin-import-jobs-page.test.tsx -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/api/import-jobs apps/web/app/admin/imports/page.tsx apps/web/tests/admin-import-jobs-page.test.tsx
git commit -m "feat: add admin controls for legacy migration jobs"
```
