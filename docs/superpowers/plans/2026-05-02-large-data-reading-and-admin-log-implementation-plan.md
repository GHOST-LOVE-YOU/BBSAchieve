# Large Data Reading And Admin Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public thread list and the admin imports view resilient to larger datasets by introducing cursor-based thread reads, recent-first import/job queries, and light polling for running tasks.

**Architecture:** Add focused read helpers rather than broad UI rewrites. Keep public board queries ordered by `lastReplyAt`, expose cursor tokens from the server read layer, and let the admin page read only the latest imports/jobs with lightweight refresh semantics while reusing the same Prisma data source introduced earlier.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, Vitest

---

## File Structure

- Create: `apps/web/src/server/reading/listBoardThreads.ts`
  - Cursor-based board thread query helper
- Create: `apps/web/src/server/admin/listRecentImportActivity.ts`
  - Recent imports/importJobs query helper
- Modify: `apps/web/app/boards/[boardId]/page.tsx`
  - Render first cursor page and “load more” token state
- Modify: `apps/web/app/admin/imports/page.tsx`
  - Read recent imports/jobs together and show newest-first activity
- Create: `apps/web/app/admin/api/import-activity/route.ts`
  - JSON route for recent activity refresh and load more
- Create: `apps/web/tests/server/listBoardThreads.test.ts`
  - Verify cursor ordering and stable tie-break behavior
- Create: `apps/web/tests/server/listRecentImportActivity.test.ts`
  - Verify recent-first activity reads and load-more cursor handling
- Modify: `apps/web/tests/public-routes.test.tsx`
  - Verify board page shows active threads in newest-first order
- Modify: `apps/web/tests/admin-imports-page.test.tsx`
  - Verify page shows recent activity sections

### Task 1: Build a cursor-based board thread reader

**Files:**
- Create: `apps/web/src/server/reading/listBoardThreads.ts`
- Create: `apps/web/tests/server/listBoardThreads.test.ts`

- [ ] **Step 1: Write the failing cursor test**

```ts
import { describe, expect, it } from "vitest";
import { encodeThreadCursor, decodeThreadCursor } from "../../src/server/reading/listBoardThreads";

describe("thread cursor helpers", () => {
  it("round-trips the sort timestamp and thread id", () => {
    const cursor = encodeThreadCursor({
      lastReplyAt: "2026-05-02T08:00:00.000Z",
      threadId: "thread-1",
    });

    expect(decodeThreadCursor(cursor)).toEqual({
      lastReplyAt: "2026-05-02T08:00:00.000Z",
      threadId: "thread-1",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/listBoardThreads.test.ts -v`  
Expected: FAIL with module not found

- [ ] **Step 3: Add the cursor helpers and list function**

```ts
// apps/web/src/server/reading/listBoardThreads.ts
export function encodeThreadCursor(input: { lastReplyAt: string; threadId: string }) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export function decodeThreadCursor(cursor: string) {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
    lastReplyAt: string;
    threadId: string;
  };
}
```

- [ ] **Step 4: Run the cursor test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/listBoardThreads.test.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/reading/listBoardThreads.ts apps/web/tests/server/listBoardThreads.test.ts
git commit -m "feat: add board thread cursor helpers"
```

### Task 2: Query recent imports and jobs together

**Files:**
- Create: `apps/web/src/server/admin/listRecentImportActivity.ts`
- Create: `apps/web/tests/server/listRecentImportActivity.test.ts`

- [ ] **Step 1: Write the failing recent-activity test**

```ts
import { describe, expect, it } from "vitest";

describe("recent import activity shape", () => {
  it("supports import rows and import job rows in one newest-first list", () => {
    const rows = [
      { kind: "import", startedAt: "2026-05-02T08:00:00.000Z" },
      { kind: "job", startedAt: "2026-05-02T09:00:00.000Z" },
    ];

    expect(rows[1]?.kind).toBe("job");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/listRecentImportActivity.test.ts -v`  
Expected: FAIL because the module under test does not exist

- [ ] **Step 3: Implement the recent activity reader**

```ts
// apps/web/src/server/admin/listRecentImportActivity.ts
import { prisma } from "../db/client";

export async function listRecentImportActivity() {
  const [imports, jobs] = await Promise.all([
    prisma.import.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    prisma.importJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return [...imports.map((item) => ({ kind: "import" as const, startedAt: item.startedAt, item })), ...jobs.map((item) => ({ kind: "job" as const, startedAt: item.createdAt, item }))].sort(
    (left, right) => right.startedAt.getTime() - left.startedAt.getTime(),
  );
}
```

- [ ] **Step 4: Run the recent activity test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/listRecentImportActivity.test.ts -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/admin/listRecentImportActivity.ts apps/web/tests/server/listRecentImportActivity.test.ts
git commit -m "feat: add recent import activity query"
```

### Task 3: Update the board page to use active-thread ordering

**Files:**
- Modify: `apps/web/app/boards/[boardId]/page.tsx`
- Modify: `apps/web/tests/public-routes.test.tsx`

- [ ] **Step 1: Change the board route test to assert newest-first activity**

```ts
it("renders active threads in newest-first order", async () => {
  const ui = await BoardPage({
    params: Promise.resolve({ boardId: "iwhisper" }),
  });
  render(ui);
  const titles = screen.getAllByRole("link").map((node) => node.textContent);
  expect(titles[0]).toBe("Most recently updated thread");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/public-routes.test.tsx -v`  
Expected: FAIL because the board page still depends on unsorted fixture order

- [ ] **Step 3: Update the board page to call the cursor-backed reader**

```tsx
// inside apps/web/app/boards/[boardId]/page.tsx
import { listBoardThreads } from "@/src/server/reading/listBoardThreads";

const page = await listBoardThreads({
  boardSlug: boardId,
  take: 20,
});

{page.items.map((thread) => (
  <section key={thread.id} className="rounded-xl border border-zinc-200 p-4">
    <Link className="text-lg font-medium" href={`/threads/${thread.id}`}>
      {thread.title}
    </Link>
    <p className="mt-2 text-sm text-zinc-500">{thread.authorName}</p>
  </section>
))}
```

- [ ] **Step 4: Run the public route test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/public-routes.test.tsx -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/boards/[boardId]/page.tsx apps/web/tests/public-routes.test.tsx
git commit -m "feat: order board threads by latest activity"
```

### Task 4: Update the admin imports page for recent-first activity

**Files:**
- Modify: `apps/web/app/admin/imports/page.tsx`
- Modify: `apps/web/tests/admin-import-jobs-page.test.tsx`
- Modify: `apps/web/tests/admin-imports-page.test.tsx`

- [ ] **Step 1: Update the admin imports page test**

```tsx
it("shows recent import activity newest first", async () => {
  render(await AdminImportsPage());
  expect(screen.getByText("最近导入活动")).toBeTruthy();
});
```

- [ ] **Step 2: Run the admin tests**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/admin-imports-page.test.tsx tests/admin-import-jobs-page.test.tsx -v`  
Expected: FAIL because the page does not render a recent activity section yet

- [ ] **Step 3: Render unified recent activity**

```tsx
// inside apps/web/app/admin/imports/page.tsx
import { listRecentImportActivity } from "@/src/server/admin/listRecentImportActivity";

const activity = await listRecentImportActivity();

<section className="mt-8">
  <h2 className="text-xl font-semibold">最近导入活动</h2>
  <div className="mt-4 space-y-4">
    {activity.map((entry, index) => (
      <article key={`${entry.kind}-${index}`} className="rounded-xl border border-zinc-200 p-4">
        <p className="text-sm font-medium">{entry.kind === "import" ? "导入记录" : "迁移任务"}</p>
        <p className="mt-1 text-sm text-zinc-500">{entry.startedAt.toISOString()}</p>
      </article>
    ))}
  </div>
</section>
```

- [ ] **Step 4: Run the admin tests**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/admin-imports-page.test.tsx tests/admin-import-jobs-page.test.tsx -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/admin/imports/page.tsx apps/web/tests/admin-imports-page.test.tsx apps/web/tests/admin-import-jobs-page.test.tsx
git commit -m "feat: show recent import activity in admin"
```
