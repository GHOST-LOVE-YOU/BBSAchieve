# Cross-Platform Reading Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Web 与 mobile 打通基于本地假数据和内存仓储的只读阅读链路，实现首页版面列表、版面帖子列表、帖子详情与回复列表。

**Architecture:** 先补齐 `packages/domain` 中阅读链路需要的实体与仓储接口，再在 `packages/test-utils` 提供共享假数据与内存仓储，随后在 `packages/state` 新增只读查询用例并统一返回 `success / notFound / error` 结果。Web 与 mobile 页面都只消费这些查询结果，各自保留最小路由和纯文本结构。

**Tech Stack:** TypeScript, Next.js App Router, Expo Router, React, React Native, Vitest, Testing Library

---

## 文件结构

- 新建: `packages/domain/src/repositories/boardRepository.ts`
  - 定义版面记录与读取接口。
- 新建: `packages/domain/src/repositories/replyRepository.ts`
  - 定义回复记录与读取接口。
- 修改: `packages/domain/src/repositories/threadRepository.ts`
  - 为帖子读取补充按 id 查询接口。
- 修改: `packages/domain/src/repositories/userRepository.ts`
  - 为作者名展示补充按 id 查询接口。
- 修改: `packages/domain/src/index.ts`
  - 导出新增仓储接口。
- 新建: `packages/test-utils/src/fixtures/forumFixtures.ts`
  - 提供共享论坛假数据。
- 修改: `packages/test-utils/src/inMemory/inMemoryRepositories.ts`
  - 扩展内存仓储，覆盖版面、帖子、回复、用户读取。
- 修改: `packages/test-utils/src/index.ts`
  - 导出 fixtures 与扩展仓储。
- 新建: `packages/state/src/useCases/getBoardSummaries.ts`
  - 首页版面列表查询。
- 新建: `packages/state/src/useCases/getBoardDetail.ts`
  - 版面详情与帖子列表查询。
- 新建: `packages/state/src/useCases/getThreadDetail.ts`
  - 帖子详情与回复列表查询。
- 新建: `packages/state/src/fixtures/readingFlowDeps.ts`
  - 组装共享 fixtures 对应的查询依赖，供双端页面直接复用。
- 修改: `packages/state/src/index.ts`
  - 导出新增只读查询用例。
- 新建: `packages/state/tests/getBoardSummaries.test.ts`
  - 首页查询测试。
- 新建: `packages/state/tests/getBoardDetail.test.ts`
  - 版面详情查询测试。
- 新建: `packages/state/tests/getThreadDetail.test.ts`
  - 帖子详情查询测试。
- 修改: `apps/web/app/page.tsx`
  - 首页列出版面入口。
- 修改: `apps/web/app/boards/[boardId]/page.tsx`
  - 版面页列帖子列表。
- 修改: `apps/web/app/threads/[threadId]/page.tsx`
  - 帖子页列正文与回复。
- 修改: `apps/web/tests/public-routes.test.tsx`
  - 覆盖公开区阅读链路与 not-found。
- 修改: `apps/mobile/src/app/index.tsx`
  - 首页列出版面入口。
- 新建: `apps/mobile/src/app/boards/[boardId].tsx`
  - 版面页列帖子摘要。
- 新建: `apps/mobile/src/app/threads/[threadId].tsx`
  - 帖子页展示正文与回复。
- 修改: `apps/mobile/__tests__/mobile-routes.test.tsx`
  - 覆盖移动端阅读链路。

### Task 1: 补齐共享领域接口与内存假数据

**Files:**
- Create: `packages/domain/src/repositories/boardRepository.ts`
- Create: `packages/domain/src/repositories/replyRepository.ts`
- Modify: `packages/domain/src/repositories/threadRepository.ts`
- Modify: `packages/domain/src/repositories/userRepository.ts`
- Modify: `packages/domain/src/index.ts`
- Create: `packages/test-utils/src/fixtures/forumFixtures.ts`
- Modify: `packages/test-utils/src/inMemory/inMemoryRepositories.ts`
- Modify: `packages/test-utils/src/index.ts`
- Test: `packages/state/tests/getBoardSummaries.test.ts`

- [ ] **Step 1: 先写失败测试，锁定共享假数据和仓储读取能力**

```ts
import { describe, expect, it } from "vitest";

import {
  forumFixture,
  InMemoryBoardRepository,
  InMemoryReplyRepository,
  InMemoryThreadRepository,
  InMemoryUserRepository,
} from "@bbs/test-utils";

describe("forum fixtures", () => {
  it("exposes board, thread, reply, and user records for reading flows", async () => {
    const boards = new InMemoryBoardRepository(forumFixture.boards);
    const threads = new InMemoryThreadRepository(forumFixture.threads);
    const replies = new InMemoryReplyRepository(forumFixture.replies);
    const users = new InMemoryUserRepository(forumFixture.users);

    expect(await boards.list()).toHaveLength(2);
    expect(await threads.listByBoard("board:job")).toHaveLength(2);
    expect(await replies.listByThread("thread:first-offer")).toHaveLength(2);
    expect(await users.findById("bot:campus-news")).toMatchObject({
      displayName: "校园快讯机器人",
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `npx pnpm@10.11.0 vitest run packages/state/tests/getBoardSummaries.test.ts`
Expected: FAIL，提示 `@bbs/test-utils` 尚未导出 `forumFixture` 或版面/回复仓储。

- [ ] **Step 3: 写最小领域接口、fixtures 和内存仓储实现**

```ts
// packages/domain/src/repositories/boardRepository.ts
export interface BoardRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
}

export interface BoardRepository {
  list(): Promise<BoardRecord[]>;
  findById(id: string): Promise<BoardRecord | null>;
  findBySlug(slug: string): Promise<BoardRecord | null>;
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
}

export interface ReplyRepository {
  listByThread(threadId: string): Promise<ReplyRecord[]>;
}
```

```ts
// packages/domain/src/repositories/threadRepository.ts
export interface ThreadRecord {
  id: string;
  boardId: string;
  authorUserId: string;
  title: string;
  body: string;
  publishedAt: string;
}

export interface ThreadRepository {
  create(input: ThreadRecord): Promise<ThreadRecord>;
  findById(id: string): Promise<ThreadRecord | null>;
  listByBoard(boardId: string): Promise<ThreadRecord[]>;
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

export interface UserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  createBot(input: UserRecord): Promise<UserRecord>;
}
```

```ts
// packages/test-utils/src/fixtures/forumFixtures.ts
import type { BoardRecord, ReplyRecord, ThreadRecord, UserRecord } from "@bbs/domain";

export const forumFixture: {
  boards: BoardRecord[];
  users: UserRecord[];
  threads: ThreadRecord[];
  replies: ReplyRecord[];
} = {
  boards: [
    {
      id: "board:job",
      slug: "job",
      name: "求职广场",
      description: "机器人与真实用户共同关注的求职讨论区",
    },
    {
      id: "board:hot",
      slug: "hot",
      name: "今日热点",
      description: "适合验证空态的只读版面",
    },
  ],
  users: [
    {
      id: "bot:campus-news",
      username: "campus-news",
      displayName: "校园快讯机器人",
      userType: "bot",
      status: "active",
      mailboxKey: "mailbox-campus-news",
    },
    {
      id: "bot:offer-helper",
      username: "offer-helper",
      displayName: "Offer助手",
      userType: "bot",
      status: "active",
      mailboxKey: "mailbox-offer-helper",
    },
  ],
  threads: [
    {
      id: "thread:first-offer",
      boardId: "board:job",
      authorUserId: "bot:campus-news",
      title: "字节暑期实习开奖汇总",
      body: "这里汇总今天同步到的开奖信息。",
      publishedAt: "2026-05-01T09:00:00.000Z",
    },
    {
      id: "thread:resume-tips",
      boardId: "board:job",
      authorUserId: "bot:offer-helper",
      title: "简历修改经验贴",
      body: "把最近高频建议整理成一份阅读版。",
      publishedAt: "2026-05-01T11:00:00.000Z",
    },
  ],
  replies: [
    {
      id: "reply:first-offer-1",
      threadId: "thread:first-offer",
      authorUserId: "bot:offer-helper",
      body: "已补充测开与客户端岗位。",
      publishedAt: "2026-05-01T10:00:00.000Z",
    },
    {
      id: "reply:first-offer-2",
      threadId: "thread:first-offer",
      authorUserId: "bot:campus-news",
      body: "后续有新批次会继续更新。",
      publishedAt: "2026-05-01T12:00:00.000Z",
    },
  ],
};
```

```ts
// packages/test-utils/src/inMemory/inMemoryRepositories.ts
import type {
  BoardRecord,
  BoardRepository,
  ReplyRecord,
  ReplyRepository,
  ThreadRecord,
  ThreadRepository,
  UserRecord,
  UserRepository,
} from "@bbs/domain";

export class InMemoryBoardRepository implements BoardRepository {
  constructor(private readonly items: BoardRecord[] = []) {}

  async list(): Promise<BoardRecord[]> {
    return this.items;
  }

  async findById(id: string): Promise<BoardRecord | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<BoardRecord | null> {
    return this.items.find((item) => item.slug === slug) ?? null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly items = new Map<string, UserRecord>();

  constructor(items: UserRecord[] = []) {
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.items.get(id) ?? null;
  }

  async findByUsername(username: string): Promise<UserRecord | null> {
    return [...this.items.values()].find((item) => item.username === username) ?? null;
  }

  async createBot(input: UserRecord): Promise<UserRecord> {
    this.items.set(input.id, input);
    return input;
  }
}

export class InMemoryThreadRepository implements ThreadRepository {
  private readonly items = new Map<string, ThreadRecord>();

  constructor(items: ThreadRecord[] = []) {
    for (const item of items) {
      this.items.set(item.id, item);
    }
  }

  async create(input: ThreadRecord): Promise<ThreadRecord> {
    this.items.set(input.id, input);
    return input;
  }

  async findById(id: string): Promise<ThreadRecord | null> {
    return this.items.get(id) ?? null;
  }

  async listByBoard(boardId: string): Promise<ThreadRecord[]> {
    return [...this.items.values()].filter((item) => item.boardId === boardId);
  }
}

export class InMemoryReplyRepository implements ReplyRepository {
  constructor(private readonly items: ReplyRecord[] = []) {}

  async listByThread(threadId: string): Promise<ReplyRecord[]> {
    return this.items.filter((item) => item.threadId === threadId);
  }
}
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `npx pnpm@10.11.0 vitest run packages/state/tests/getBoardSummaries.test.ts`
Expected: PASS，输出 `1 passed`。

- [ ] **Step 5: 提交共享假数据与仓储层**

```bash
git add packages/domain/src/repositories/boardRepository.ts packages/domain/src/repositories/replyRepository.ts packages/domain/src/repositories/threadRepository.ts packages/domain/src/repositories/userRepository.ts packages/domain/src/index.ts packages/test-utils/src/fixtures/forumFixtures.ts packages/test-utils/src/inMemory/inMemoryRepositories.ts packages/test-utils/src/index.ts packages/state/tests/getBoardSummaries.test.ts
git commit -m "功能：补充阅读链路共享仓储与假数据"
```

### Task 2: 实现共享只读查询用例与契约测试

**Files:**
- Create: `packages/state/src/useCases/getBoardSummaries.ts`
- Create: `packages/state/src/useCases/getBoardDetail.ts`
- Create: `packages/state/src/useCases/getThreadDetail.ts`
- Create: `packages/state/src/fixtures/readingFlowDeps.ts`
- Modify: `packages/state/src/index.ts`
- Create: `packages/state/tests/getBoardSummaries.test.ts`
- Create: `packages/state/tests/getBoardDetail.test.ts`
- Create: `packages/state/tests/getThreadDetail.test.ts`

- [ ] **Step 1: 先写失败测试，锁定查询结果语义**

```ts
import { describe, expect, it } from "vitest";

import { getBoardDetail, getBoardSummaries, getThreadDetail } from "../src";
import { readingFlowDeps } from "../src/fixtures/readingFlowDeps";

describe("reading flow use cases", () => {
  it("returns board summaries for the home page", async () => {
    const result = await getBoardSummaries(readingFlowDeps);
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }

    expect(result.boards[0]).toMatchObject({
      id: "board:job",
      threadCount: 2,
      latestThreadTitle: "简历修改经验贴",
    });
    expect(result.boards[1]).toMatchObject({
      id: "board:hot",
      threadCount: 0,
      latestThreadTitle: null,
    });
  });

  it("returns notFound when the board is missing", async () => {
    const result = await getBoardDetail("missing-board", readingFlowDeps);
    expect(result).toEqual({ status: "notFound" });
  });

  it("returns thread detail with ordered replies", async () => {
    const result = await getThreadDetail("thread:first-offer", readingFlowDeps);
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("expected success");
    }

    expect(result.thread.title).toBe("字节暑期实习开奖汇总");
    expect(result.replies.map((reply) => reply.id)).toEqual([
      "reply:first-offer-1",
      "reply:first-offer-2",
    ]);
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `npx pnpm@10.11.0 vitest run packages/state/tests/getBoardSummaries.test.ts packages/state/tests/getBoardDetail.test.ts packages/state/tests/getThreadDetail.test.ts`
Expected: FAIL，提示读取用例尚未存在。

- [ ] **Step 3: 写最小查询用例实现与导出**

```ts
// packages/state/src/useCases/getBoardSummaries.ts
import type { BoardRepository, ThreadRepository } from "@bbs/domain";

export async function getBoardSummaries(deps: {
  boards: BoardRepository;
  threads: ThreadRepository;
}): Promise<
  | {
      status: "success";
      boards: Array<{
        id: string;
        slug: string;
        name: string;
        description: string;
        threadCount: number;
        latestThreadTitle: string | null;
      }>;
    }
  | { status: "error"; message: string }
> {
  try {
    const boards = await deps.boards.list();
    const items = await Promise.all(
      boards.map(async (board) => {
        const threads = await deps.threads.listByBoard(board.id);
        const latestThread = [...threads].sort((a, b) =>
          a.publishedAt < b.publishedAt ? 1 : -1,
        )[0];

        return {
          id: board.id,
          slug: board.slug,
          name: board.name,
          description: board.description,
          threadCount: threads.length,
          latestThreadTitle: latestThread?.title ?? null,
        };
      }),
    );

    return { status: "success", boards: items };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}
```

```ts
// packages/state/src/useCases/getBoardDetail.ts
import type {
  BoardRepository,
  ReplyRepository,
  ThreadRepository,
  UserRepository,
} from "@bbs/domain";

export async function getBoardDetail(
  boardIdOrSlug: string,
  deps: {
    boards: BoardRepository;
    threads: ThreadRepository;
    replies: ReplyRepository;
    users: UserRepository;
  },
): Promise<
  | {
      status: "success";
      board: { id: string; slug: string; name: string; description: string };
      threads: Array<{
        id: string;
        title: string;
        authorName: string;
        publishedAt: string;
        replyCount: number;
      }>;
    }
  | { status: "notFound" }
  | { status: "error"; message: string }
> {
  try {
    const board =
      (await deps.boards.findById(boardIdOrSlug)) ??
      (await deps.boards.findBySlug(boardIdOrSlug));

    if (!board) {
      return { status: "notFound" };
    }

    const threads = await deps.threads.listByBoard(board.id);
    const items = await Promise.all(
      threads.map(async (thread) => {
        const author = await deps.users.findById(thread.authorUserId);
        const replies = await deps.replies.listByThread(thread.id);
        return {
          id: thread.id,
          title: thread.title,
          authorName: author?.displayName ?? "未知作者",
          publishedAt: thread.publishedAt,
          replyCount: replies.length,
        };
      }),
    );

    return {
      status: "success",
      board: {
        id: board.id,
        slug: board.slug,
        name: board.name,
        description: board.description,
      },
      threads: items.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}
```

```ts
// packages/state/src/useCases/getThreadDetail.ts
import type {
  BoardRepository,
  ReplyRepository,
  ThreadRepository,
  UserRepository,
} from "@bbs/domain";

export async function getThreadDetail(
  threadId: string,
  deps: {
    boards: BoardRepository;
    users: UserRepository;
    threads: ThreadRepository;
    replies: ReplyRepository;
  },
): Promise<
  | {
      status: "success";
      board: { id: string; slug: string; name: string };
      thread: {
        id: string;
        title: string;
        body: string;
        authorName: string;
        publishedAt: string;
      };
      replies: Array<{
        id: string;
        body: string;
        authorName: string;
        publishedAt: string;
      }>;
    }
  | { status: "notFound" }
  | { status: "error"; message: string }
> {
  try {
    const thread = await deps.threads.findById(threadId);
    if (!thread) {
      return { status: "notFound" };
    }

    const board = await deps.boards.findById(thread.boardId);
    const author = await deps.users.findById(thread.authorUserId);
    const replies = await deps.replies.listByThread(thread.id);
    const replyItems = await Promise.all(
      replies.map(async (reply) => {
        const replyAuthor = await deps.users.findById(reply.authorUserId);
        return {
          id: reply.id,
          body: reply.body,
          authorName: replyAuthor?.displayName ?? "未知作者",
          publishedAt: reply.publishedAt,
        };
      }),
    );

    return {
      status: "success",
      board: {
        id: board?.id ?? "unknown-board",
        slug: board?.slug ?? "unknown-board",
        name: board?.name ?? "未知版面",
      },
      thread: {
        id: thread.id,
        title: thread.title,
        body: thread.body,
        authorName: author?.displayName ?? "未知作者",
        publishedAt: thread.publishedAt,
      },
      replies: replyItems.sort((a, b) => (a.publishedAt > b.publishedAt ? 1 : -1)),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}
```

```ts
// packages/state/src/index.ts
export * from "./useCases/createBotAndThread";
export * from "./useCases/importForumData";
export * from "./useCases/getBoardSummaries";
export * from "./useCases/getBoardDetail";
export * from "./useCases/getThreadDetail";
```

```ts
// packages/state/src/fixtures/readingFlowDeps.ts
import {
  forumFixture,
  InMemoryBoardRepository,
  InMemoryReplyRepository,
  InMemoryThreadRepository,
  InMemoryUserRepository,
} from "@bbs/test-utils";

export const readingFlowDeps = {
  boards: new InMemoryBoardRepository(forumFixture.boards),
  users: new InMemoryUserRepository(forumFixture.users),
  threads: new InMemoryThreadRepository(forumFixture.threads),
  replies: new InMemoryReplyRepository(forumFixture.replies),
};
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `npx pnpm@10.11.0 vitest run packages/state/tests/getBoardSummaries.test.ts packages/state/tests/getBoardDetail.test.ts packages/state/tests/getThreadDetail.test.ts`
Expected: PASS，输出 `3 passed`。

- [ ] **Step 5: 提交共享读取用例**

```bash
git add packages/state/src/useCases/getBoardSummaries.ts packages/state/src/useCases/getBoardDetail.ts packages/state/src/useCases/getThreadDetail.ts packages/state/src/fixtures/readingFlowDeps.ts packages/state/src/index.ts packages/state/tests/getBoardSummaries.test.ts packages/state/tests/getBoardDetail.test.ts packages/state/tests/getThreadDetail.test.ts
git commit -m "功能：新增双端阅读链路查询用例"
```

### Task 3: 接上 Web 公开区阅读页面

**Files:**
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/boards/[boardId]/page.tsx`
- Modify: `apps/web/app/threads/[threadId]/page.tsx`
- Modify: `apps/web/tests/public-routes.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定 Web 路由阅读链路**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BoardPage from "../app/boards/[boardId]/page";
import HomePage from "../app/page";
import ThreadPage from "../app/threads/[threadId]/page";

describe("web public routes", () => {
  it("renders board entries on the home page", async () => {
    render(await HomePage());
    expect(screen.getByText("求职广场")).toBeTruthy();
    expect(screen.getByText("今日热点")).toBeTruthy();
  });

  it("renders board detail and thread summaries", async () => {
    const ui = await BoardPage({ params: Promise.resolve({ boardId: "board:job" }) });
    render(ui);
    expect(screen.getByText("字节暑期实习开奖汇总")).toBeTruthy();
    expect(screen.getByText("简历修改经验贴")).toBeTruthy();
  });

  it("renders thread detail and replies", async () => {
    const ui = await ThreadPage({ params: Promise.resolve({ threadId: "thread:first-offer" }) });
    render(ui);
    expect(screen.getByText("这里汇总今天同步到的开奖信息。")).toBeTruthy();
    expect(screen.getByText("后续有新批次会继续更新。")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `npx pnpm@10.11.0 vitest run apps/web/tests/public-routes.test.tsx`
Expected: FAIL，当前页面还是占位标题。

- [ ] **Step 3: 写最小页面实现**

```tsx
// apps/web/app/page.tsx
import { getBoardSummaries } from "@bbs/state";
import { readingFlowDeps } from "@bbs/state/src/fixtures/readingFlowDeps";

export default async function HomePage() {
  const result = await getBoardSummaries(readingFlowDeps);

  if (result.status !== "success") {
    return <main><div>读取版面失败</div></main>;
  }

  return (
    <main>
      <div>论坛首页</div>
      {result.boards.length === 0 ? <div>暂无版面</div> : null}
      {result.boards.map((board) => (
        <div key={board.id}>
          <a href={`/boards/${board.id}`}>{board.name}</a>
          <div>{board.description}</div>
          <div>帖子数：{board.threadCount}</div>
        </div>
      ))}
    </main>
  );
}
```

```tsx
// apps/web/app/boards/[boardId]/page.tsx
import { notFound } from "next/navigation";

import { getBoardDetail } from "@bbs/state";
import { readingFlowDeps } from "@bbs/state/src/fixtures/readingFlowDeps";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const result = await getBoardDetail(boardId, readingFlowDeps);

  if (result.status === "notFound") {
    notFound();
  }

  if (result.status !== "success") {
    return <main><div>读取版面失败</div></main>;
  }

  return (
    <main>
      <div>{result.board.name}</div>
      <div>{result.board.description}</div>
      {result.threads.length === 0 ? <div>暂无帖子</div> : null}
      {result.threads.map((thread) => (
        <div key={thread.id}>
          <a href={`/threads/${thread.id}`}>{thread.title}</a>
          <div>{thread.authorName}</div>
        </div>
      ))}
    </main>
  );
}
```

```tsx
// apps/web/app/threads/[threadId]/page.tsx
import { notFound } from "next/navigation";

import { getThreadDetail } from "@bbs/state";
import { readingFlowDeps } from "@bbs/state/src/fixtures/readingFlowDeps";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const result = await getThreadDetail(threadId, readingFlowDeps);

  if (result.status === "notFound") {
    notFound();
  }

  if (result.status !== "success") {
    return <main><div>读取帖子失败</div></main>;
  }

  return (
    <main>
      <div>{result.thread.title}</div>
      <div>{result.thread.body}</div>
      <div>{result.thread.authorName}</div>
      {result.replies.length === 0 ? <div>暂无回复</div> : null}
      {result.replies.map((reply) => (
        <div key={reply.id}>
          <div>{reply.authorName}</div>
          <div>{reply.body}</div>
        </div>
      ))}
    </main>
  );
}
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `npx pnpm@10.11.0 vitest run apps/web/tests/public-routes.test.tsx`
Expected: PASS，输出 `3 passed`。

- [ ] **Step 5: 提交 Web 阅读链路**

```bash
git add apps/web/app/page.tsx apps/web/app/boards/[boardId]/page.tsx apps/web/app/threads/[threadId]/page.tsx apps/web/tests/public-routes.test.tsx
git commit -m "功能：接通 web 公开区只读阅读链路"
```

### Task 4: 接上 Mobile 只读阅读页面

**Files:**
- Modify: `apps/mobile/src/app/index.tsx`
- Create: `apps/mobile/src/app/boards/[boardId].tsx`
- Create: `apps/mobile/src/app/threads/[threadId].tsx`
- Modify: `apps/mobile/__tests__/mobile-routes.test.tsx`

- [ ] **Step 1: 先写失败测试，锁定 mobile 阅读链路**

```tsx
import { renderRouter, screen } from "expo-router/testing-library";

describe("mobile routes", () => {
  it("renders board entries on home", () => {
    renderRouter({
      index: require("../src/app/index").default,
      "boards/[boardId]": require("../src/app/boards/[boardId]").default,
      "threads/[threadId]": require("../src/app/threads/[threadId]").default,
    });

    expect(screen.getByText("求职广场")).toBeTruthy();
    expect(screen.getByText("今日热点")).toBeTruthy();
  });

  it("renders board detail", () => {
    renderRouter({
      index: require("../src/app/index").default,
      "boards/[boardId]": require("../src/app/boards/[boardId]").default,
      "threads/[threadId]": require("../src/app/threads/[threadId]").default,
    }, {
      initialUrl: "/boards/board:job",
    });

    expect(screen.getByText("字节暑期实习开奖汇总")).toBeTruthy();
  });

  it("renders thread detail and replies", () => {
    renderRouter({
      index: require("../src/app/index").default,
      "boards/[boardId]": require("../src/app/boards/[boardId]").default,
      "threads/[threadId]": require("../src/app/threads/[threadId]").default,
    }, {
      initialUrl: "/threads/thread:first-offer",
    });

    expect(screen.getByText("这里汇总今天同步到的开奖信息。")).toBeTruthy();
    expect(screen.getByText("后续有新批次会继续更新。")).toBeTruthy();
  });
});
```

- [ ] **Step 2: 运行测试并确认当前失败**

Run: `npx pnpm@10.11.0 --filter @bbs/mobile exec jest __tests__/mobile-routes.test.tsx --runInBand`
Expected: FAIL，目标页面尚未存在或仍是占位内容。

- [ ] **Step 3: 写最小移动端页面实现**

```tsx
// apps/mobile/src/app/index.tsx
import { Link } from "expo-router";
import { Text, View } from "react-native";

import { getBoardSummaries } from "@bbs/state";
import { readingFlowDeps } from "@bbs/state/src/fixtures/readingFlowDeps";

const resultPromise = getBoardSummaries(readingFlowDeps);

export default function HomeScreen() {
  const result = React.use(resultPromise);

  if (result.status !== "success") {
    return <View><Text>读取版面失败</Text></View>;
  }

  return (
    <View>
      <Text>移动端版面列表</Text>
      {result.boards.length === 0 ? <Text>暂无版面</Text> : null}
      {result.boards.map((board) => (
        <View key={board.id}>
          <Link href={`/boards/${board.id}`}>{board.name}</Link>
          <Text>{board.description}</Text>
        </View>
      ))}
    </View>
  );
}
```

```tsx
// apps/mobile/src/app/boards/[boardId].tsx
import { useLocalSearchParams, Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { getBoardDetail } from "@bbs/state";
import { readingFlowDeps } from "@bbs/state/src/fixtures/readingFlowDeps";

export default function BoardScreen() {
  const { boardId } = useLocalSearchParams<{ boardId: string }>();
  const result = React.use(
    React.useMemo(() => getBoardDetail(boardId, readingFlowDeps), [boardId]),
  );

  if (result.status === "notFound") {
    return <View><Text>版面不存在</Text></View>;
  }

  if (result.status !== "success") {
    return <View><Text>读取版面失败</Text></View>;
  }

  return (
    <View>
      <Text>{result.board.name}</Text>
      <Text>{result.board.description}</Text>
      {result.threads.length === 0 ? <Text>暂无帖子</Text> : null}
      {result.threads.map((thread) => (
        <View key={thread.id}>
          <Link href={`/threads/${thread.id}`}>{thread.title}</Link>
          <Text>{thread.authorName}</Text>
        </View>
      ))}
    </View>
  );
}
```

```tsx
// apps/mobile/src/app/threads/[threadId].tsx
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { getThreadDetail } from "@bbs/state";
import { readingFlowDeps } from "@bbs/state/src/fixtures/readingFlowDeps";

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const result = React.use(
    React.useMemo(() => getThreadDetail(threadId, readingFlowDeps), [threadId]),
  );

  if (result.status === "notFound") {
    return <View><Text>帖子不存在</Text></View>;
  }

  if (result.status !== "success") {
    return <View><Text>读取帖子失败</Text></View>;
  }

  return (
    <View>
      <Text>{result.thread.title}</Text>
      <Text>{result.thread.body}</Text>
      <Text>{result.thread.authorName}</Text>
      {result.replies.length === 0 ? <Text>暂无回复</Text> : null}
      {result.replies.map((reply) => (
        <View key={reply.id}>
          <Text>{reply.authorName}</Text>
          <Text>{reply.body}</Text>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: 重新运行测试并确认通过**

Run: `npx pnpm@10.11.0 --filter @bbs/mobile exec jest __tests__/mobile-routes.test.tsx --runInBand`
Expected: PASS，输出 `3 passed`。

- [ ] **Step 5: 提交 mobile 阅读链路**

```bash
git add apps/mobile/src/app/index.tsx apps/mobile/src/app/boards/[boardId].tsx apps/mobile/src/app/threads/[threadId].tsx apps/mobile/__tests__/mobile-routes.test.tsx
git commit -m "功能：接通 mobile 只读阅读链路"
```

### Task 5: 运行全链路验证并收口文档

**Files:**
- Modify: `docs/frontend-dev.md`

- [ ] **Step 1: 补充前端开发文档中的新增校验命令**

```md
## 校验

```bash
npx pnpm@10.11.0 vitest run packages/state/tests/createBotAndThread.test.ts packages/state/tests/importForumData.test.ts packages/state/tests/getBoardSummaries.test.ts packages/state/tests/getBoardDetail.test.ts packages/state/tests/getThreadDetail.test.ts
npx pnpm@10.11.0 vitest run apps/web/tests/public-routes.test.tsx
npx pnpm@10.11.0 --filter @bbs/mobile exec jest __tests__/mobile-routes.test.tsx --runInBand
```
```

- [ ] **Step 2: 运行共享层、Web、mobile 测试并确认全部通过**

Run: `npx pnpm@10.11.0 vitest run packages/state/tests/createBotAndThread.test.ts packages/state/tests/importForumData.test.ts packages/state/tests/getBoardSummaries.test.ts packages/state/tests/getBoardDetail.test.ts packages/state/tests/getThreadDetail.test.ts apps/web/tests/public-routes.test.tsx && npx pnpm@10.11.0 --filter @bbs/mobile exec jest __tests__/mobile-routes.test.tsx --runInBand`
Expected: PASS，状态测试、Web 路由测试、mobile 路由测试全部通过。

- [ ] **Step 3: 提交验证与文档更新**

```bash
git add docs/frontend-dev.md
git commit -m "文档：更新双端阅读链路校验说明"
```
