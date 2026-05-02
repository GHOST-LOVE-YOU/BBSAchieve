# Prisma Sync Import Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-backed data path for `IWhisper` by adding Prisma, creating the new PostgreSQL schema, importing sync API payloads through a Web server route, and rendering public/admin pages from the new database.

**Architecture:** Keep Python responsible only for sync data collection and expose a thin import client in `apps/web`. Add Prisma to the Web app, define the final forum schema there, normalize sync payloads into one internal DTO, and persist them through focused server-side import services that both admin actions and future legacy migration code can reuse.

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, TypeScript, Vitest

---

## File Structure

- Create: `apps/web/prisma/schema.prisma`
  - Prisma schema for boards, threads, replies, users, humanProfiles, botProfiles, userBotBindings, imports
- Create: `apps/web/prisma/migrations/*`
  - Initial migration for the schema above
- Create: `apps/web/src/server/db/client.ts`
  - Shared Prisma client singleton for server code
- Create: `apps/web/src/server/db/seed.ts`
  - Seed helper that ensures the `iwhisper` board exists
- Create: `apps/web/src/server/imports/syncTypes.ts`
  - Internal normalized DTO types for sync import
- Create: `apps/web/src/server/imports/mapSyncPayload.ts`
  - Mapper from Python sync API JSON to internal DTO
- Create: `apps/web/src/server/imports/importSyncBatch.ts`
  - Prisma write service for boards, bots, threads, replies, imports
- Create: `apps/web/src/server/imports/fetchSyncUpdates.ts`
  - Server-side HTTP client for Python `/api/sync/updates`
- Create: `apps/web/app/admin/api/imports/byr-sync/route.ts`
  - Admin-triggered POST route for manual sync import
- Create: `apps/web/src/server/reading/readingRepository.ts`
  - Prisma-backed board/thread/reply read methods for public pages
- Modify: `apps/web/app/admin/imports/page.tsx`
  - Add sync trigger button and import result table
- Modify: `apps/web/app/page.tsx`
  - Read board summaries from Prisma-backed runtime
- Modify: `apps/web/app/boards/[boardId]/page.tsx`
  - Read board threads from Prisma-backed runtime
- Modify: `apps/web/app/threads/[threadId]/page.tsx`
  - Read thread detail from Prisma-backed runtime
- Modify: `packages/domain/src/repositories/threadRepository.ts`
  - Extend thread record for source ids, reply counts, last reply time
- Modify: `packages/domain/src/repositories/replyRepository.ts`
  - Extend reply record for reply index
- Modify: `packages/domain/src/repositories/userRepository.ts`
  - Add bot profile–oriented fields used by Prisma-backed import
- Modify: `packages/state/src/runtime/readingFlowDeps.ts`
  - Split fixture runtime from future production runtime entry
- Create: `packages/state/src/runtime/createPrismaReadingFlowDeps.ts`
  - Build domain repositories from Web Prisma reader
- Modify: `packages/state/src/runtime/index.ts`
  - Export the new runtime factory
- Create: `apps/web/tests/server/importSyncBatch.test.ts`
  - Unit tests for DTO mapping and idempotent import writes
- Create: `apps/web/tests/server/fetchSyncUpdates.test.ts`
  - Unit tests for sync API client error mapping
- Modify: `apps/web/tests/public-routes.test.tsx`
  - Mock production runtime reads and verify public pages render database-backed data
- Create: `apps/web/tests/admin-imports-page.test.tsx`
  - Verify admin imports page renders trigger UI and import rows
- Modify: `apps/web/package.json`
  - Add Prisma dependencies and scripts
- Create: `apps/web/vitest.setup.ts`
  - Shared test setup for server mocks if needed
- Modify: `docs/frontend-dev.md`
  - Add Prisma generation, migration, and Web import verification commands

### Task 1: Add Prisma to the Web app and define the schema

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/prisma/schema.prisma`
- Create: `apps/web/prisma/migrations/*`
- Test: `apps/web/package.json`

- [ ] **Step 1: Add Prisma dependencies and scripts**

```json
{
  "dependencies": {
    "@prisma/client": "^6.8.2",
    "@bbs/state": "workspace:*",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  },
  "devDependencies": {
    "prisma": "^6.8.2",
    "@bbs/domain": "workspace:*",
    "@bbs/test-utils": "workspace:*",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9.39.1",
    "eslint-config-next": "16.2.4",
    "jsdom": "^26.1.0",
    "tailwindcss": "^4",
    "typescript": "^5",
    "vitest": "^3.2.4"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run tests/public-routes.test.tsx",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy"
  }
}
```

- [ ] **Step 2: Create the initial Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserType {
  human
  bot
}

enum UserStatus {
  active
  disabled
}

enum ImportStatus {
  running
  succeeded
  failed
  partial
}

model Board {
  id          String   @id @default(uuid())
  slug        String   @unique
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  threads     Thread[]
}

model User {
  id              String           @id @default(uuid())
  username        String
  displayName     String?
  userType        UserType
  avatarUrl       String?
  bio             String?
  status          UserStatus
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  humanProfile    HumanProfile?
  botProfile      BotProfile?
  authoredThreads Thread[]         @relation("ThreadAuthor")
  authoredReplies Reply[]          @relation("ReplyAuthor")
  humanBindings   UserBotBinding[] @relation("HumanBindings")
  botBindings     UserBotBinding[] @relation("BotBindings")

  @@index([username])
}

model HumanProfile {
  userId        String   @id
  authProvider  String
  authSubject   String   @unique
  email         String?
  profileStatus String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model BotProfile {
  userId          String   @id
  mailboxKey      String?
  sourceLabel     String?
  canPost         Boolean  @default(true)
  personaSummary  String?
  profileStatus   String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserBotBinding {
  id            String   @id @default(uuid())
  humanUserId   String
  botUserId     String
  bindingStatus String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  humanUser     User     @relation("HumanBindings", fields: [humanUserId], references: [id], onDelete: Cascade)
  botUser       User     @relation("BotBindings", fields: [botUserId], references: [id], onDelete: Cascade)
}

model Thread {
  id              String   @id @default(uuid())
  boardId         String
  authorUserId    String
  title           String
  body            String
  sourceThreadId  String?
  sourceBoardSlug String?
  replyCount      Int      @default(0)
  lastReplyAt     DateTime?
  publishedAt     DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  board           Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)
  author          User     @relation("ThreadAuthor", fields: [authorUserId], references: [id], onDelete: Restrict)
  replies         Reply[]

  @@unique([sourceBoardSlug, sourceThreadId])
  @@index([boardId, lastReplyAt])
  @@index([boardId, publishedAt])
}

model Reply {
  id           String   @id @default(uuid())
  threadId      String
  authorUserId  String
  body          String
  replyIndex    Int
  publishedAt   DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  thread        Thread   @relation(fields: [threadId], references: [id], onDelete: Cascade)
  author        User     @relation("ReplyAuthor", fields: [authorUserId], references: [id], onDelete: Restrict)

  @@unique([threadId, replyIndex])
  @@index([threadId, publishedAt])
}

model Import {
  id              String       @id @default(uuid())
  sourceType      String
  sourceLabel     String
  status          ImportStatus
  startedAt       DateTime
  finishedAt      DateTime?
  importedThreads Int          @default(0)
  importedReplies Int          @default(0)
  skippedReplies  Int          @default(0)
  errorMessage    String?
  metadataJson    Json?
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

- [ ] **Step 3: Run Prisma generate to verify the schema**

Run: `npx pnpm@10.11.0 --filter @bbs/web prisma:generate`  
Expected: PASS with Prisma Client generated under `apps/web/node_modules/.prisma`

- [ ] **Step 4: Create the initial migration**

Run: `npx pnpm@10.11.0 --filter @bbs/web prisma:migrate --name init_forum_imports`  
Expected: PASS with a new folder under `apps/web/prisma/migrations/`

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/prisma
git commit -m "feat: add prisma schema for forum imports"
```

### Task 2: Extend domain/runtime types for source-backed forum records

**Files:**
- Modify: `packages/domain/src/repositories/threadRepository.ts`
- Modify: `packages/domain/src/repositories/replyRepository.ts`
- Modify: `packages/domain/src/repositories/userRepository.ts`
- Modify: `packages/state/src/runtime/readingFlowDeps.ts`
- Modify: `packages/state/src/runtime/index.ts`
- Create: `packages/state/tests/runtime-types.test.ts`

- [ ] **Step 1: Write the failing domain type test**

```ts
import { describe, expect, it } from "vitest";
import type { ReplyRecord, ThreadRecord, UserRecord } from "@bbs/domain";

describe("runtime source fields", () => {
  it("allows source thread ids, reply indexes, and bot mailbox fields", () => {
    const thread: ThreadRecord = {
      id: "thread-1",
      boardId: "board-1",
      authorUserId: "user-1",
      title: "title",
      body: "body",
      publishedAt: "2026-05-02T00:00:00.000Z",
      sourceThreadId: "8830220",
      sourceBoardSlug: "iwhisper",
      replyCount: 2,
      lastReplyAt: "2026-05-02T00:10:00.000Z",
    };

    const reply: ReplyRecord = {
      id: "reply-1",
      threadId: "thread-1",
      authorUserId: "user-1",
      body: "reply",
      replyIndex: 1,
      publishedAt: "2026-05-02T00:01:00.000Z",
    };

    const user: UserRecord = {
      id: "user-1",
      username: "bot-1",
      displayName: "Bot 1",
      userType: "bot",
      status: "active",
      mailboxKey: "mailbox-1",
    };

    expect(thread.sourceThreadId).toBe("8830220");
    expect(reply.replyIndex).toBe(1);
    expect(user.mailboxKey).toBe("mailbox-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 vitest run packages/state/tests/runtime-types.test.ts`  
Expected: FAIL with missing `ReplyRecord` export or missing source fields

- [ ] **Step 3: Update repository record types**

```ts
// packages/domain/src/repositories/threadRepository.ts
export interface ThreadRecord {
  id: string;
  boardId: string;
  authorUserId: string;
  title: string;
  body: string;
  publishedAt: string;
  sourceThreadId?: string;
  sourceBoardSlug?: string;
  replyCount?: number;
  lastReplyAt?: string;
}
```

```ts
// packages/domain/src/repositories/replyRepository.ts
export interface ReplyRecord {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
  publishedAt: string;
  replyIndex?: number;
}
```

```ts
// packages/domain/src/repositories/userRepository.ts
export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  userType: "human" | "bot";
  status: "active" | "disabled";
  mailboxKey?: string;
}
```

- [ ] **Step 4: Update in-memory runtime fixture to satisfy the new shape**

```ts
// inside packages/state/src/runtime/readingFlowDeps.ts
{
  id: "thread:first-offer",
  boardId: "board:job",
  authorUserId: "user:robot-1",
  title: "First offer from the mirror",
  body: "A new listing has been mirrored and is ready to read.",
  publishedAt: "2026-05-01T08:00:00.000Z",
  sourceThreadId: "8830220",
  sourceBoardSlug: "iwhisper",
  replyCount: 2,
  lastReplyAt: "2026-05-01T08:10:00.000Z",
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx pnpm@10.11.0 vitest run packages/state/tests/runtime-types.test.ts`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/repositories packages/state/src/runtime packages/state/tests/runtime-types.test.ts
git commit -m "refactor: extend domain records for source-backed imports"
```

### Task 3: Build the sync DTO mapper and Prisma write service

**Files:**
- Create: `apps/web/src/server/db/client.ts`
- Create: `apps/web/src/server/db/seed.ts`
- Create: `apps/web/src/server/imports/syncTypes.ts`
- Create: `apps/web/src/server/imports/mapSyncPayload.ts`
- Create: `apps/web/src/server/imports/importSyncBatch.ts`
- Create: `apps/web/tests/server/importSyncBatch.test.ts`

- [ ] **Step 1: Write the failing import service test**

```ts
import { describe, expect, it } from "vitest";
import { mapSyncPayload } from "../../src/server/imports/mapSyncPayload";

describe("mapSyncPayload", () => {
  it("normalizes a sync thread and preserves reply indexes", () => {
    const result = mapSyncPayload({
      threads: [
        {
          article_id: "8830220",
          board_name: "IWhisper",
          title: "Need advice",
          body: "Opening post",
          author: "robot-alpha",
          published_at: "2026-05-02T08:00:00.000Z",
          posts: [
            {
              floor: 1,
              author: "robot-beta",
              body: "reply body",
              published_at: "2026-05-02T08:10:00.000Z",
            },
          ],
        },
      ],
    });

    expect(result.sourceType).toBe("byr_sync_api");
    expect(result.threads[0]?.sourceThreadId).toBe("8830220");
    expect(result.threads[0]?.replies[0]?.replyIndex).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/importSyncBatch.test.ts -v`  
Expected: FAIL with module not found for `mapSyncPayload`

- [ ] **Step 3: Add the normalized DTO and mapping function**

```ts
// apps/web/src/server/imports/syncTypes.ts
export type NormalizedImportBatch = {
  sourceType: "byr_sync_api" | "legacy_postgres";
  sourceLabel: string;
  board: {
    slug: string;
    name: string;
    description: string | null;
  };
  threads: Array<{
    sourceThreadId: string;
    sourceBoardSlug: string;
    title: string;
    body: string;
    authorUsername: string;
    authorDisplayName: string;
    publishedAt: string;
    replies: Array<{
      authorUsername: string;
      authorDisplayName: string;
      body: string;
      replyIndex: number;
      publishedAt: string;
    }>;
  }>;
};
```

```ts
// apps/web/src/server/imports/mapSyncPayload.ts
import type { NormalizedImportBatch } from "./syncTypes";

export function mapSyncPayload(input: {
  threads: Array<{
    article_id: string;
    board_name: string;
    title: string;
    body: string;
    author: string;
    published_at: string;
    posts: Array<{
      floor: number;
      author: string;
      body: string;
      published_at: string;
    }>;
  }>;
}): NormalizedImportBatch {
  return {
    sourceType: "byr_sync_api",
    sourceLabel: "IWhisper updates",
    board: {
      slug: "iwhisper",
      name: "IWhisper",
      description: null,
    },
    threads: input.threads.map((thread) => ({
      sourceThreadId: thread.article_id,
      sourceBoardSlug: "iwhisper",
      title: thread.title,
      body: thread.body,
      authorUsername: thread.author,
      authorDisplayName: thread.author,
      publishedAt: thread.published_at,
      replies: thread.posts.map((post) => ({
        authorUsername: post.author,
        authorDisplayName: post.author,
        body: post.body,
        replyIndex: post.floor,
        publishedAt: post.published_at,
      })),
    })),
  };
}
```

- [ ] **Step 4: Implement the Prisma import service**

```ts
// apps/web/src/server/imports/importSyncBatch.ts
import { PrismaClient } from "@prisma/client";
import type { NormalizedImportBatch } from "./syncTypes";

export async function importSyncBatch(prisma: PrismaClient, batch: NormalizedImportBatch) {
  const startedAt = new Date();
  const importRow = await prisma.import.create({
    data: {
      sourceType: batch.sourceType,
      sourceLabel: batch.sourceLabel,
      status: "running",
      startedAt,
      metadataJson: { threadCount: batch.threads.length },
    },
  });

  let importedThreads = 0;
  let importedReplies = 0;
  let skippedReplies = 0;

  try {
    const board = await prisma.board.upsert({
      where: { slug: batch.board.slug },
      update: { name: batch.board.name, description: batch.board.description },
      create: batch.board,
    });

    for (const thread of batch.threads) {
      const author = await prisma.user.upsert({
        where: { id: `bot:${thread.authorUsername}` },
        update: {
          username: thread.authorUsername,
          displayName: thread.authorDisplayName,
        },
        create: {
          id: `bot:${thread.authorUsername}`,
          username: thread.authorUsername,
          displayName: thread.authorDisplayName,
          userType: "bot",
          status: "active",
          botProfile: {
            create: {
              sourceLabel: batch.sourceLabel,
              profileStatus: "active",
            },
          },
        },
      });

      const savedThread = await prisma.thread.upsert({
        where: {
          sourceBoardSlug_sourceThreadId: {
            sourceBoardSlug: thread.sourceBoardSlug,
            sourceThreadId: thread.sourceThreadId,
          },
        },
        update: {
          title: thread.title,
          body: thread.body,
          replyCount: thread.replies.length,
          lastReplyAt: thread.replies.at(-1)?.publishedAt
            ? new Date(thread.replies.at(-1)!.publishedAt)
            : new Date(thread.publishedAt),
        },
        create: {
          boardId: board.id,
          authorUserId: author.id,
          title: thread.title,
          body: thread.body,
          sourceThreadId: thread.sourceThreadId,
          sourceBoardSlug: thread.sourceBoardSlug,
          replyCount: thread.replies.length,
          lastReplyAt: thread.replies.at(-1)?.publishedAt
            ? new Date(thread.replies.at(-1)!.publishedAt)
            : new Date(thread.publishedAt),
          publishedAt: new Date(thread.publishedAt),
        },
      });

      importedThreads += 1;

      for (const reply of thread.replies) {
        const replyAuthor = await prisma.user.upsert({
          where: { id: `bot:${reply.authorUsername}` },
          update: {
            username: reply.authorUsername,
            displayName: reply.authorDisplayName,
          },
          create: {
            id: `bot:${reply.authorUsername}`,
            username: reply.authorUsername,
            displayName: reply.authorDisplayName,
            userType: "bot",
            status: "active",
            botProfile: {
              create: {
                sourceLabel: batch.sourceLabel,
                profileStatus: "active",
              },
            },
          },
        });

        const existingReply = await prisma.reply.findUnique({
          where: {
            threadId_replyIndex: {
              threadId: savedThread.id,
              replyIndex: reply.replyIndex,
            },
          },
        });

        if (existingReply) {
          skippedReplies += 1;
          continue;
        }

        await prisma.reply.create({
          data: {
            threadId: savedThread.id,
            authorUserId: replyAuthor.id,
            body: reply.body,
            replyIndex: reply.replyIndex,
            publishedAt: new Date(reply.publishedAt),
          },
        });
        importedReplies += 1;
      }
    }

    await prisma.import.update({
      where: { id: importRow.id },
      data: {
        status: "succeeded",
        finishedAt: new Date(),
        importedThreads,
        importedReplies,
        skippedReplies,
      },
    });

    return { importedThreads, importedReplies, skippedReplies, importId: importRow.id };
  } catch (error) {
    await prisma.import.update({
      where: { id: importRow.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Unknown import error",
      },
    });
    throw error;
  }
}
```

- [ ] **Step 5: Run the import service test**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/importSyncBatch.test.ts -v`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/imports apps/web/src/server/db apps/web/tests/server/importSyncBatch.test.ts
git commit -m "feat: add normalized sync import service"
```

### Task 4: Add the admin sync route and admin imports page

**Files:**
- Create: `apps/web/src/server/imports/fetchSyncUpdates.ts`
- Create: `apps/web/app/admin/api/imports/byr-sync/route.ts`
- Modify: `apps/web/app/admin/imports/page.tsx`
- Create: `apps/web/tests/server/fetchSyncUpdates.test.ts`
- Create: `apps/web/tests/admin-imports-page.test.tsx`

- [ ] **Step 1: Write the failing sync client test**

```ts
import { describe, expect, it, vi } from "vitest";
import { fetchSyncUpdates } from "../../src/server/imports/fetchSyncUpdates";

describe("fetchSyncUpdates", () => {
  it("throws when the sync API responds with a non-ok status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad token", { status: 401 })),
    );

    await expect(fetchSyncUpdates()).rejects.toThrow("Sync API request failed: 401");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/fetchSyncUpdates.test.ts -v`  
Expected: FAIL with module not found for `fetchSyncUpdates`

- [ ] **Step 3: Implement the sync client and route**

```ts
// apps/web/src/server/imports/fetchSyncUpdates.ts
export async function fetchSyncUpdates() {
  const baseUrl = process.env.BYR_SYNC_API_BASE_URL;
  const token = process.env.BYR_SYNC_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error("Missing BYR_SYNC_API_BASE_URL or BYR_SYNC_API_TOKEN");
  }

  const response = await fetch(`${baseUrl}/api/sync/updates`, {
    headers: {
      "X-Sync-Token": token,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Sync API request failed: ${response.status}`);
  }

  return response.json();
}
```

```ts
// apps/web/app/admin/api/imports/byr-sync/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/server/db/client";
import { fetchSyncUpdates } from "@/src/server/imports/fetchSyncUpdates";
import { importSyncBatch } from "@/src/server/imports/importSyncBatch";
import { mapSyncPayload } from "@/src/server/imports/mapSyncPayload";

export async function POST() {
  try {
    const payload = await fetchSyncUpdates();
    const batch = mapSyncPayload(payload);
    const result = await importSyncBatch(prisma, batch);

    return NextResponse.json({ ok: true, result }, { status: 200 });
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

- [ ] **Step 4: Render the admin imports page**

```tsx
// apps/web/app/admin/imports/page.tsx
import { prisma } from "@/src/server/db/client";

export default async function AdminImportsPage() {
  const imports = await prisma.import.findMany({
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">导入导出</h1>
      <form action="/admin/api/imports/byr-sync" method="post" className="mt-6">
        <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white" type="submit">
          同步北邮人数据
        </button>
      </form>
      <div className="mt-8 space-y-4">
        {imports.map((item) => (
          <section key={item.id} className="rounded-xl border border-zinc-200 p-4">
            <p className="text-sm font-medium">{item.sourceLabel}</p>
            <p className="mt-1 text-sm text-zinc-500">状态：{item.status}</p>
            <p className="mt-1 text-sm text-zinc-500">帖子：{item.importedThreads}</p>
            <p className="mt-1 text-sm text-zinc-500">回复：{item.importedReplies}</p>
            {item.errorMessage ? <p className="mt-1 text-sm text-red-600">{item.errorMessage}</p> : null}
          </section>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/fetchSyncUpdates.test.ts tests/admin-imports-page.test.tsx -v`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/imports/fetchSyncUpdates.ts apps/web/app/admin/api/imports/byr-sync/route.ts apps/web/app/admin/imports/page.tsx apps/web/tests/server/fetchSyncUpdates.test.ts apps/web/tests/admin-imports-page.test.tsx
git commit -m "feat: add admin sync import trigger"
```

### Task 5: Switch public reading pages to Prisma-backed reads

**Files:**
- Create: `apps/web/src/server/reading/readingRepository.ts`
- Create: `packages/state/src/runtime/createPrismaReadingFlowDeps.ts`
- Modify: `packages/state/src/runtime/index.ts`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/boards/[boardId]/page.tsx`
- Modify: `apps/web/app/threads/[threadId]/page.tsx`
- Modify: `apps/web/tests/public-routes.test.tsx`

- [ ] **Step 1: Write the failing public route test update**

```ts
it("renders database-backed board detail and thread summaries", async () => {
  const ui = await BoardPage({
    params: Promise.resolve({ boardId: "iwhisper" }),
  });
  render(ui);
  expect(screen.getByText("IWhisper")).toBeTruthy();
  expect(screen.getByText("Need advice")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/public-routes.test.tsx -v`  
Expected: FAIL because the page still depends on fixture board ids and fixture runtime

- [ ] **Step 3: Add Prisma-backed reading repositories and wire them into pages**

```ts
// packages/state/src/runtime/createPrismaReadingFlowDeps.ts
import type { BoardRepository, ReplyRepository, ThreadRepository, UserRepository } from "@bbs/domain";

export function createPrismaReadingFlowDeps(input: {
  boards: BoardRepository;
  replies: ReplyRepository;
  threads: ThreadRepository;
  users: UserRepository;
}) {
  return input;
}
```

```tsx
// apps/web/app/page.tsx
import { getBoardSummaries } from "@bbs/state";
import { createPrismaReadingFlowDeps } from "@bbs/state/runtime";
import { createReadingRepositories } from "@/src/server/reading/readingRepository";

export default async function HomePage() {
  const result = await getBoardSummaries(
    createPrismaReadingFlowDeps(await createReadingRepositories()),
  );
  // keep the current render branch logic
}
```

- [ ] **Step 4: Run the public route tests**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/public-routes.test.tsx -v`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/reading packages/state/src/runtime apps/web/app/page.tsx apps/web/app/boards/[boardId]/page.tsx apps/web/app/threads/[threadId]/page.tsx apps/web/tests/public-routes.test.tsx
git commit -m "feat: read public forum pages from prisma"
```

### Task 6: Document and verify the first real-data flow

**Files:**
- Modify: `docs/frontend-dev.md`
- Test: `apps/web/package.json`

- [ ] **Step 1: Add Prisma and sync import commands to the frontend doc**

```md
## 数据库初始化

```bash
npx pnpm@10.11.0 --filter @bbs/web prisma:generate
npx pnpm@10.11.0 --filter @bbs/web prisma:migrate
```

## 真实数据导入验证

```bash
npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/importSyncBatch.test.ts tests/server/fetchSyncUpdates.test.ts
npx pnpm@10.11.0 --filter @bbs/web vitest run tests/public-routes.test.tsx tests/admin-imports-page.test.tsx
npx pnpm@10.11.0 --filter @bbs/web typecheck
```
```

- [ ] **Step 2: Run the focused verification commands**

Run: `npx pnpm@10.11.0 --filter @bbs/web vitest run tests/server/importSyncBatch.test.ts tests/server/fetchSyncUpdates.test.ts tests/public-routes.test.tsx tests/admin-imports-page.test.tsx && npx pnpm@10.11.0 --filter @bbs/web typecheck`  
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add docs/frontend-dev.md
git commit -m "docs: add prisma sync import verification steps"
```
