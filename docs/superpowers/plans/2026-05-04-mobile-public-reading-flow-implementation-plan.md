# Mobile Public Reading Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/mobile` 接入基于 `apps/web` 的真实公共只读 API，并让版面帖子列表和帖子回复列表都支持首批 `20` 条、滑动到底继续加载 `20` 条的增量加载体验。

**Architecture:** 先在 `apps/web` 的现有 Prisma 读取仓储之上新增统一的 public reading service / DTO 层，明确拆出 `boards`、`board detail`、`board threads feed`、`thread detail`、`thread replies feed` 这 5 个读能力。Web SSR 页面直接消费这层 service，public API 也消费同一层 service；`apps/mobile` 再通过 `EXPO_PUBLIC_WEB_BASE_URL` 请求这些 API，并用 `FlatList` + hook 承接增量加载。

**Tech Stack:** TypeScript, Next.js App Router, Prisma, Vitest, Expo Router, React Native, Jest, Testing Library

---

## 文件结构

### Web 读模型与服务

- Create: `apps/web/src/server/reading/publicReadingDtos.ts`
  - 定义首页版面摘要、版面详情、帖子流、帖子详情、回复流的共享 DTO。
- Create: `apps/web/src/server/reading/boardFeedCursor.ts`
  - 负责版面帖子流 cursor 的编码、解码与校验。
- Create: `apps/web/src/server/reading/publicReadingService.ts`
  - 聚合 `listBoards`、`getBoard`、`getBoardThreadsFeed`、`getThread`、`getThreadRepliesFeed`。
- Modify: `apps/web/src/server/reading/readingRepository.ts`
  - 增加按路由 id 查帖子、批量按 id 查用户、按 board/thread 做限量查询的能力。

### Web 页面与 Public API

- Create: `apps/web/app/api/public/boards/route.ts`
  - 匿名返回首页版面摘要列表。
- Create: `apps/web/app/api/public/boards/[boardIdOrSlug]/route.ts`
  - 匿名返回单个版面元信息。
- Create: `apps/web/app/api/public/boards/[boardIdOrSlug]/threads/route.ts`
  - 匿名返回版面帖子流。
- Create: `apps/web/app/api/public/threads/[threadId]/route.ts`
  - 匿名返回帖子主体和所属版面摘要。
- Create: `apps/web/app/api/public/threads/[threadId]/replies/route.ts`
  - 匿名返回帖子回复流。
- Modify: `apps/web/app/page.tsx`
  - 改为直接消费 `publicReadingService.listBoards()`。
- Modify: `apps/web/app/boards/[boardId]/page.tsx`
  - 改为消费 `publicReadingService.getBoard()` 与 `getBoardThreadsFeed()`。
- Modify: `apps/web/app/threads/[threadId]/page.tsx`
  - 改为消费 `publicReadingService.getThread()` 与 `getThreadRepliesFeed()`。

### Web 测试

- Create: `apps/web/tests/server/publicReadingService.test.ts`
  - 覆盖 5 个 service 能力、cursor、`hasMore`、not found、非法参数。
- Create: `apps/web/tests/public-api-routes.test.ts`
  - 覆盖 public API 的 `200 / 400 / 404 / 500`。
- Modify: `apps/web/tests/public-routes.test.tsx`
  - 改为 mock `publicReadingService`，验证 Web 页面继续工作。

### Mobile 数据访问与页面

- Create: `apps/mobile/src/lib/api.ts`
  - 统一读取 `EXPO_PUBLIC_WEB_BASE_URL`、拼接 URL、处理 HTTP 错误。
- Create: `apps/mobile/src/features/reading/types.ts`
  - 定义 mobile 侧消费 public API 的响应类型。
- Create: `apps/mobile/src/features/reading/client.ts`
  - 定义 `fetchBoards`、`fetchBoard`、`fetchBoardThreadsFeed`、`fetchThread`、`fetchThreadRepliesFeed`。
- Create: `apps/mobile/src/features/reading/useBoardThreadsFeed.ts`
  - 管理版面页“元信息 + 帖子流”的首批、续批、失败重试。
- Create: `apps/mobile/src/features/reading/useThreadRepliesFeed.ts`
  - 管理帖子页“主体 + 回复流”的首批、续批、失败重试。
- Modify: `apps/mobile/src/app/(tabs)/index.tsx`
  - 首页改为请求真实 `/api/public/boards`。
- Modify: `apps/mobile/src/app/boards/[boardId].tsx`
  - 版面页改为 `FlatList` + 帖子流增量加载。
- Modify: `apps/mobile/src/app/threads/[threadId].tsx`
  - 帖子页改为 `FlatList` + 回复流增量加载。

### Mobile 测试

- Modify: `apps/mobile/__tests__/mobile-routes.test.tsx`
  - mock reading client，覆盖首页、版面页、帖子页、not found 和错误态。
- Create: `apps/mobile/__tests__/reading-hooks.test.tsx`
  - 覆盖两个 hook 的首批、续批、失败重试。

### 文档

- Modify: `apps/mobile/README.md`
  - 补充 `EXPO_PUBLIC_WEB_BASE_URL` 的配置方式与缺失时的显式错误行为。

## 任务分解

### Task 1: 写 Web public reading service 的失败测试

**Files:**
- Create: `apps/web/tests/server/publicReadingService.test.ts`

- [ ] **Step 1: 写失败测试，锁定首页版面摘要 DTO**

```ts
import { describe, expect, it, vi } from "vitest";

import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

describe("publicReadingService", () => {
  it("returns board summaries with threadCount and latestThreadTitle", async () => {
    const service = createPublicReadingService({
      repository: {
        listBoards: vi.fn().mockResolvedValue([
          {
            id: "board:job",
            slug: "job",
            name: "Jobs and Offers",
            description: "Signals for roles, openings, and practical next steps.",
          },
        ]),
        listThreadsByBoard: vi.fn().mockResolvedValue([
          {
            id: "thread:first-offer",
            boardId: "board:job",
            authorUserId: "user:robot-1",
            sourceBoardSlug: "job",
            sourceThreadId: "source-thread-1",
            title: "First offer from the mirror",
            body: "A new listing has been mirrored and is ready to read.",
            publishedAt: "2026-05-01T08:00:00.000Z",
            replyCount: 2,
            lastReplyAt: "2026-05-01T08:10:00.000Z",
          },
        ]),
      } as any,
    });

    await expect(service.listBoards()).resolves.toEqual({
      boards: [
        {
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
          threadCount: 1,
          latestThreadTitle: "First offer from the mirror",
        },
      ],
    });
  });
});
```

- [ ] **Step 2: 写失败测试，锁定版面详情与帖子流**

```ts
it("returns board detail and thread feed with cursor pagination", async () => {
  const service = createPublicReadingService({
    repository: {
      findBoardById: vi.fn().mockResolvedValue(null),
      findBoardBySlug: vi.fn().mockResolvedValue({
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
        description: "Signals for roles, openings, and practical next steps.",
      }),
      listThreadsPageByBoard: vi.fn().mockResolvedValue([
        {
          id: "thread:2",
          boardId: "board:job",
          authorUserId: "user:robot-2",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-2",
          title: "Second thread",
          body: "Second body",
          publishedAt: "2026-05-01T09:00:00.000Z",
          replyCount: 1,
          lastReplyAt: "2026-05-01T10:00:00.000Z",
        },
        {
          id: "thread:1",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-1",
          title: "First thread",
          body: "First body",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 0,
          lastReplyAt: "2026-05-01T09:00:00.000Z",
        },
        {
          id: "thread:older",
          boardId: "board:job",
          authorUserId: "user:robot-1",
          sourceBoardSlug: "job",
          sourceThreadId: "source-thread-0",
          title: "Older thread",
          body: "Older body",
          publishedAt: "2026-05-01T07:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        },
      ]),
      findUsersByIds: vi.fn().mockResolvedValue(
        new Map([
          [
            "user:robot-1",
            {
              id: "user:robot-1",
              username: "robot-1",
              displayName: "Robot 1",
              userType: "bot",
              status: "active",
            },
          ],
          [
            "user:robot-2",
            {
              id: "user:robot-2",
              username: "robot-2",
              displayName: "Robot 2",
              userType: "bot",
              status: "active",
            },
          ],
        ]),
      ),
    } as any,
  });

  await expect(service.getBoard("job")).resolves.toEqual({
    id: "board:job",
    slug: "job",
    name: "Jobs and Offers",
    description: "Signals for roles, openings, and practical next steps.",
  });

  await expect(service.getBoardThreadsFeed({ boardIdOrSlug: "job", limit: 2 })).resolves.toEqual({
    items: [
      {
        id: "thread:2",
        title: "Second thread",
        authorName: "Robot 2",
        publishedAt: "2026-05-01T09:00:00.000Z",
        replyCount: 1,
        lastReplyAt: "2026-05-01T10:00:00.000Z",
      },
      {
        id: "thread:1",
        title: "First thread",
        authorName: "Robot 1",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 0,
        lastReplyAt: "2026-05-01T09:00:00.000Z",
      },
    ],
    page: {
      limit: 2,
      nextCursor: expect.any(String),
      hasMore: true,
    },
  });
});
```

- [ ] **Step 3: 写失败测试，锁定帖子详情与回复流**

```ts
it("returns thread detail and replies feed sorted by replyIndex asc", async () => {
  const service = createPublicReadingService({
    repository: {
      findThreadByRouteId: vi.fn().mockResolvedValue({
        id: "thread:first-offer",
        boardId: "board:job",
        authorUserId: "user:robot-1",
        sourceBoardSlug: "job",
        sourceThreadId: "source-thread-1",
        title: "First offer from the mirror",
        body: "A new listing has been mirrored and is ready to read.",
        publishedAt: "2026-05-01T08:00:00.000Z",
        replyCount: 2,
        lastReplyAt: "2026-05-01T08:10:00.000Z",
      }),
      findBoardById: vi.fn().mockResolvedValue({
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
        description: "Signals for roles, openings, and practical next steps.",
      }),
      findUserById: vi.fn().mockResolvedValue({
        id: "user:robot-1",
        username: "robot-1",
        displayName: "Robot 1",
        userType: "bot",
        status: "active",
      }),
      listRepliesPageByThread: vi.fn().mockResolvedValue([
        {
          id: "reply:1",
          threadId: "thread:first-offer",
          authorUserId: "user:alice",
          replyIndex: 1,
          body: "Reply 1",
          publishedAt: "2026-05-01T08:05:00.000Z",
        },
        {
          id: "reply:2",
          threadId: "thread:first-offer",
          authorUserId: "user:robot-1",
          replyIndex: 2,
          body: "Reply 2",
          publishedAt: "2026-05-01T08:10:00.000Z",
        },
        {
          id: "reply:3",
          threadId: "thread:first-offer",
          authorUserId: "user:alice",
          replyIndex: 3,
          body: "Reply 3",
          publishedAt: "2026-05-01T08:15:00.000Z",
        },
      ]),
      findUsersByIds: vi.fn().mockResolvedValue(
        new Map([
          [
            "user:alice",
            {
              id: "user:alice",
              username: "alice",
              displayName: "Alice",
              userType: "human",
              status: "active",
            },
          ],
          [
            "user:robot-1",
            {
              id: "user:robot-1",
              username: "robot-1",
              displayName: "Robot 1",
              userType: "bot",
              status: "active",
            },
          ],
        ]),
      ),
    } as any,
  });

  await expect(service.getThread("first-offer")).resolves.toEqual({
    board: {
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
    },
    thread: {
      id: "thread:first-offer",
      title: "First offer from the mirror",
      body: "A new listing has been mirrored and is ready to read.",
      authorName: "Robot 1",
      publishedAt: "2026-05-01T08:00:00.000Z",
      replyCount: 2,
    },
  });

  await expect(service.getThreadRepliesFeed({ threadId: "first-offer", limit: 2 })).resolves.toEqual({
    items: [
      {
        id: "reply:1",
        body: "Reply 1",
        authorName: "Alice",
        publishedAt: "2026-05-01T08:05:00.000Z",
        replyIndex: 1,
      },
      {
        id: "reply:2",
        body: "Reply 2",
        authorName: "Robot 1",
        publishedAt: "2026-05-01T08:10:00.000Z",
        replyIndex: 2,
      },
    ],
    page: {
      limit: 2,
      nextCursor: "2",
      hasMore: true,
    },
  });
});
```

- [ ] **Step 4: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/publicReadingService.test.ts
```

Expected: FAIL，报 `publicReadingService` 文件不存在或导出缺失。

- [ ] **Step 5: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/tests/server/publicReadingService.test.ts
git commit -m "补充公共阅读服务失败测试"
```

### Task 2: 实现 Web public reading DTO、repository 扩展与 service

**Files:**
- Create: `apps/web/src/server/reading/publicReadingDtos.ts`
- Create: `apps/web/src/server/reading/boardFeedCursor.ts`
- Create: `apps/web/src/server/reading/publicReadingService.ts`
- Modify: `apps/web/src/server/reading/readingRepository.ts`
- Test: `apps/web/tests/server/publicReadingService.test.ts`

- [ ] **Step 1: 扩展 repository 能力**

```ts
export type ReadingRepository = {
  findBoardById(id: string): Promise<BoardRecord | null>;
  findBoardBySlug(slug: string): Promise<BoardRecord | null>;
  listBoards(): Promise<BoardRecord[]>;
  findThreadById(id: string): Promise<ThreadRecord | null>;
  findThreadByRouteId(routeId: string): Promise<ThreadRecord | null>;
  listThreadsByBoard(boardId: string): Promise<ThreadRecord[]>;
  listThreadsPageByBoard(input: {
    boardId: string;
    limit: number;
    cursor?: {
      lastReplyAt: string | null;
      id: string;
    };
  }): Promise<ThreadRecord[]>;
  listRepliesPageByThread(input: {
    threadId: string;
    limit: number;
    cursor?: number;
  }): Promise<ReplyRecord[]>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUsersByIds(ids: string[]): Promise<Map<string, UserRecord>>;
};
```

- [ ] **Step 2: 新增 DTO 与 cursor 文件**

```ts
// apps/web/src/server/reading/publicReadingDtos.ts
export type PublicBoardSummaryDto = {
  id: string;
  slug: string;
  name: string;
  description: string;
  threadCount: number;
  latestThreadTitle: string | null;
};

export type PublicBoardDetailDto = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type PublicBoardThreadItemDto = {
  id: string;
  title: string;
  authorName: string;
  publishedAt: string;
  replyCount: number;
  lastReplyAt: string | null;
};

export type PublicThreadDetailDto = {
  board: { id: string; slug: string; name: string };
  thread: {
    id: string;
    title: string;
    body: string;
    authorName: string;
    publishedAt: string;
    replyCount: number;
  };
};

export type PublicReplyItemDto = {
  id: string;
  body: string;
  authorName: string;
  publishedAt: string;
  replyIndex: number;
};
```

```ts
// apps/web/src/server/reading/boardFeedCursor.ts
export type BoardFeedCursor = {
  lastReplyAt: string | null;
  id: string;
};

export function encodeBoardFeedCursor(input: BoardFeedCursor) {
  return Buffer.from(JSON.stringify(input)).toString("base64url");
}

export function decodeBoardFeedCursor(cursor: string): BoardFeedCursor {
  const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as BoardFeedCursor;
  if (typeof parsed.id !== "string" || !("lastReplyAt" in parsed)) {
    throw new Error("Invalid board cursor");
  }
  return parsed;
}
```

- [ ] **Step 3: 实现 `publicReadingService`**

```ts
import {
  decodeBoardFeedCursor,
  encodeBoardFeedCursor,
} from "./boardFeedCursor";
import { createReadingRepository, type ReadingRepository } from "./readingRepository";

function normalizeLimit(limit: number | undefined) {
  if (limit == null) {
    return 20;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new Error("Invalid limit");
  }
  return limit;
}

export function createPublicReadingService(input: { repository?: ReadingRepository } = {}) {
  const repository = input.repository ?? createReadingRepository();

  return {
    async listBoards() {
      const boards = await repository.listBoards();
      const boardSummaries = await Promise.all(
        boards.map(async (board) => {
          const threads = await repository.listThreadsByBoard(board.id);
          const latestThread =
            [...threads].sort(
              (a, b) =>
                new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
            )[0] ?? null;

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

      return { boards: boardSummaries };
    },

    async getBoard(boardIdOrSlug: string) {
      const board =
        (await repository.findBoardById(boardIdOrSlug)) ??
        (await repository.findBoardBySlug(boardIdOrSlug));
      if (!board) {
        return null;
      }
      return {
        id: board.id,
        slug: board.slug,
        name: board.name,
        description: board.description,
      };
    },

    async getBoardThreadsFeed(input: {
      boardIdOrSlug: string;
      limit?: number;
      cursor?: string;
    }) {
      const board = await this.getBoard(input.boardIdOrSlug);
      if (!board) {
        return null;
      }

      const limit = normalizeLimit(input.limit);
      const rows = await repository.listThreadsPageByBoard({
        boardId: board.id,
        limit: limit + 1,
        cursor: input.cursor ? decodeBoardFeedCursor(input.cursor) : undefined,
      });
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);
      const authors = await repository.findUsersByIds(items.map((item) => item.authorUserId));
      const lastItem = items.at(-1);

      return {
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          authorName: authors.get(item.authorUserId)?.displayName ?? "未知作者",
          publishedAt: item.publishedAt,
          replyCount: item.replyCount ?? 0,
          lastReplyAt: item.lastReplyAt ?? null,
        })),
        page: {
          limit,
          nextCursor:
            hasMore && lastItem
              ? encodeBoardFeedCursor({
                  lastReplyAt: lastItem.lastReplyAt ?? null,
                  id: lastItem.id,
                })
              : null,
          hasMore,
        },
      };
    },

    async getThread(threadId: string) {
      const thread = await repository.findThreadByRouteId(threadId);
      if (!thread) {
        return null;
      }

      const board = await repository.findBoardById(thread.boardId);
      const author = await repository.findUserById(thread.authorUserId);
      if (!board) {
        throw new Error(`Missing board for thread ${thread.id}`);
      }

      return {
        board: {
          id: board.id,
          slug: board.slug,
          name: board.name,
        },
        thread: {
          id: thread.id,
          title: thread.title,
          body: thread.body,
          authorName: author?.displayName ?? "未知作者",
          publishedAt: thread.publishedAt,
          replyCount: thread.replyCount ?? 0,
        },
      };
    },

    async getThreadRepliesFeed(input: {
      threadId: string;
      limit?: number;
      cursor?: string;
    }) {
      const thread = await repository.findThreadByRouteId(input.threadId);
      if (!thread) {
        return null;
      }

      const limit = normalizeLimit(input.limit);
      const replyCursor =
        input.cursor == null ? undefined : Number.parseInt(input.cursor, 10);
      if (input.cursor != null && (!Number.isInteger(replyCursor) || replyCursor < 0)) {
        throw new Error("Invalid reply cursor");
      }

      const rows = await repository.listRepliesPageByThread({
        threadId: thread.id,
        limit: limit + 1,
        cursor: replyCursor,
      });
      const hasMore = rows.length > limit;
      const items = rows.slice(0, limit);
      const authors = await repository.findUsersByIds(items.map((item) => item.authorUserId));
      const lastItem = items.at(-1);

      return {
        items: items.map((item) => ({
          id: item.id,
          body: item.body,
          authorName: authors.get(item.authorUserId)?.displayName ?? "未知作者",
          publishedAt: item.publishedAt,
          replyIndex: item.replyIndex ?? 0,
        })),
        page: {
          limit,
          nextCursor: hasMore && lastItem ? String(lastItem.replyIndex ?? 0) : null,
          hasMore,
        },
      };
    },
  };
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run apps/web/tests/server/publicReadingService.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add \
  apps/web/src/server/reading/publicReadingDtos.ts \
  apps/web/src/server/reading/boardFeedCursor.ts \
  apps/web/src/server/reading/publicReadingService.ts \
  apps/web/src/server/reading/readingRepository.ts \
  apps/web/tests/server/publicReadingService.test.ts
git commit -m "新增公共阅读服务与仓储扩展"
```

### Task 3: 写 Web public API 的失败测试

**Files:**
- Create: `apps/web/tests/public-api-routes.test.ts`

- [ ] **Step 1: 写失败测试，覆盖版面列表与版面详情接口**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  listBoards: vi.fn(),
  getBoard: vi.fn(),
  getBoardThreadsFeed: vi.fn(),
  getThread: vi.fn(),
  getThreadRepliesFeed: vi.fn(),
}));

vi.mock("@/src/server/reading/publicReadingService", () => ({
  createPublicReadingService: () => routeMocks,
}));

import { GET as getBoards } from "../app/api/public/boards/route";
import { GET as getBoard } from "../app/api/public/boards/[boardIdOrSlug]/route";

describe("public api routes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns boards as anonymous json", async () => {
    routeMocks.listBoards.mockResolvedValue({
      boards: [
        {
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
          threadCount: 2,
          latestThreadTitle: "Newest thread",
        },
      ],
    });

    const response = await getBoards(new Request("http://localhost/api/public/boards"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      boards: [
        {
          id: "board:job",
          slug: "job",
          name: "Jobs and Offers",
          description: "Signals for roles, openings, and practical next steps.",
          threadCount: 2,
          latestThreadTitle: "Newest thread",
        },
      ],
    });
  });

  it("returns 404 when board detail is missing", async () => {
    routeMocks.getBoard.mockResolvedValue(null);

    const response = await getBoard(new Request("http://localhost/api/public/boards/missing"), {
      params: Promise.resolve({ boardIdOrSlug: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Board not found" });
  });
});
```

- [ ] **Step 2: 写失败测试，覆盖帖子流、帖子详情和回复流**

```ts
import { GET as getBoardThreadsFeed } from "../app/api/public/boards/[boardIdOrSlug]/threads/route";
import { GET as getThread } from "../app/api/public/threads/[threadId]/route";
import { GET as getThreadRepliesFeed } from "../app/api/public/threads/[threadId]/replies/route";

it("returns 400 when thread feed limit is invalid", async () => {
  routeMocks.getBoardThreadsFeed.mockRejectedValue(new Error("Invalid limit"));

  const response = await getBoardThreadsFeed(
    new Request("http://localhost/api/public/boards/job/threads?limit=21"),
    { params: Promise.resolve({ boardIdOrSlug: "job" }) },
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: "Invalid limit" });
});

it("returns thread detail json", async () => {
  routeMocks.getThread.mockResolvedValue({
    board: {
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
    },
    thread: {
      id: "thread:first-offer",
      title: "First offer from the mirror",
      body: "A new listing has been mirrored and is ready to read.",
      authorName: "Robot 1",
      publishedAt: "2026-05-01T08:00:00.000Z",
      replyCount: 2,
    },
  });

  const response = await getThread(
    new Request("http://localhost/api/public/threads/first-offer"),
    { params: Promise.resolve({ threadId: "first-offer" }) },
  );

  expect(response.status).toBe(200);
});

it("returns 404 when thread replies feed is missing", async () => {
  routeMocks.getThreadRepliesFeed.mockResolvedValue(null);

  const response = await getThreadRepliesFeed(
    new Request("http://localhost/api/public/threads/missing/replies?limit=20"),
    { params: Promise.resolve({ threadId: "missing" }) },
  );

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Thread not found" });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run apps/web/tests/public-api-routes.test.ts
```

Expected: FAIL，报 public route 文件不存在。

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/web/tests/public-api-routes.test.ts
git commit -m "补充公共阅读 API 失败测试"
```

### Task 4: 实现 Web public API route

**Files:**
- Create: `apps/web/app/api/public/boards/route.ts`
- Create: `apps/web/app/api/public/boards/[boardIdOrSlug]/route.ts`
- Create: `apps/web/app/api/public/boards/[boardIdOrSlug]/threads/route.ts`
- Create: `apps/web/app/api/public/threads/[threadId]/route.ts`
- Create: `apps/web/app/api/public/threads/[threadId]/replies/route.ts`
- Test: `apps/web/tests/public-api-routes.test.ts`

- [ ] **Step 1: 实现版面列表与版面详情 route**

```ts
// apps/web/app/api/public/boards/route.ts
import { NextResponse } from "next/server";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export async function GET() {
  try {
    return NextResponse.json(await createPublicReadingService().listBoards());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
```

```ts
// apps/web/app/api/public/boards/[boardIdOrSlug]/route.ts
import { NextResponse } from "next/server";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export async function GET(
  _request: Request,
  context: { params: Promise<{ boardIdOrSlug: string }> },
) {
  try {
    const { boardIdOrSlug } = await context.params;
    const board = await createPublicReadingService().getBoard(boardIdOrSlug);
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return NextResponse.json(board);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: 实现帖子流、帖子详情与回复流 route**

```ts
function parseLimit(url: URL) {
  const raw = url.searchParams.get("limit");
  return raw == null ? undefined : Number.parseInt(raw, 10);
}

// boards/[boardIdOrSlug]/threads/route.ts
export async function GET(
  request: Request,
  context: { params: Promise<{ boardIdOrSlug: string }> },
) {
  try {
    const { boardIdOrSlug } = await context.params;
    const url = new URL(request.url);
    const result = await createPublicReadingService().getBoardThreadsFeed({
      boardIdOrSlug,
      limit: parseLimit(url),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    if (!result) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
```

```ts
// threads/[threadId]/route.ts
export async function GET(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await context.params;
    const result = await createPublicReadingService().getThread(threadId);
    if (!result) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
```

```ts
// threads/[threadId]/replies/route.ts
export async function GET(
  request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await context.params;
    const url = new URL(request.url);
    const result = await createPublicReadingService().getThreadRepliesFeed({
      threadId,
      limit: parseLimit(url),
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
    if (!result) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 3: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run apps/web/tests/public-api-routes.test.ts
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add \
  apps/web/app/api/public/boards/route.ts \
  'apps/web/app/api/public/boards/[boardIdOrSlug]/route.ts' \
  'apps/web/app/api/public/boards/[boardIdOrSlug]/threads/route.ts' \
  'apps/web/app/api/public/threads/[threadId]/route.ts' \
  'apps/web/app/api/public/threads/[threadId]/replies/route.ts' \
  apps/web/tests/public-api-routes.test.ts
git commit -m "实现公共阅读 API 路由"
```

### Task 5: 让 Web SSR 页面改用 public reading service

**Files:**
- Modify: `apps/web/tests/public-routes.test.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/boards/[boardId]/page.tsx`
- Modify: `apps/web/app/threads/[threadId]/page.tsx`

- [ ] **Step 1: 写失败测试，改为 mock `publicReadingService`**

```ts
const publicReadingMock = vi.hoisted(() => ({
  listBoards: vi.fn(),
  getBoard: vi.fn(),
  getBoardThreadsFeed: vi.fn(),
  getThread: vi.fn(),
  getThreadRepliesFeed: vi.fn(),
}));

vi.mock("@/src/server/reading/publicReadingService", () => ({
  createPublicReadingService: () => publicReadingMock,
}));
```

```ts
it("renders thread detail from the public reading service", async () => {
  publicReadingMock.getThread.mockResolvedValue({
    board: {
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
    },
    thread: {
      id: "thread:first-offer",
      title: "First offer from the mirror",
      body: "A new listing has been mirrored and is ready to read.",
      authorName: "Robot 1",
      publishedAt: "2026-05-01T08:00:00.000Z",
      replyCount: 2,
    },
  });
  publicReadingMock.getThreadRepliesFeed.mockResolvedValue({
    items: [
      {
        id: "reply:1",
        body: "Reply 1",
        authorName: "Alice",
        publishedAt: "2026-05-01T08:05:00.000Z",
        replyIndex: 1,
      },
    ],
    page: {
      limit: 20,
      nextCursor: null,
      hasMore: false,
    },
  });

  render(
    await ThreadPage({
      params: Promise.resolve({ threadId: "first-offer" }),
    }),
  );

  expect(screen.getByText("First offer from the mirror")).toBeTruthy();
  expect(screen.getByText("Reply 1")).toBeTruthy();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run apps/web/tests/public-routes.test.tsx
```

Expected: FAIL，报旧 mock 与页面实现不匹配。

- [ ] **Step 3: 改写 Web 页面**

```ts
// apps/web/app/page.tsx
import Link from "next/link";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await createPublicReadingService().listBoards();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">论坛首页</h1>
      <div className="mt-6 space-y-4">
        {result.boards.map((board) => (
          <section key={board.id} className="rounded-xl border border-zinc-200 p-4">
            <Link className="text-xl font-medium" href={`/boards/${board.slug}`}>
              {board.name}
            </Link>
            <p className="mt-2 text-sm text-zinc-700">{board.description}</p>
            <p className="mt-2 text-sm text-zinc-500">帖子数：{board.threadCount}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
```

```ts
// apps/web/app/boards/[boardId]/page.tsx
const service = createPublicReadingService();
const board = await service.getBoard(boardId);
if (!board) notFound();
const feed = await service.getBoardThreadsFeed({ boardIdOrSlug: boardId, limit: 20 });
```

```ts
// apps/web/app/threads/[threadId]/page.tsx
const service = createPublicReadingService();
const threadResult = await service.getThread(threadId);
if (!threadResult) notFound();
const repliesResult = await service.getThreadRepliesFeed({ threadId, limit: 20 });
```

- [ ] **Step 4: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run apps/web/tests/public-routes.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add \
  apps/web/tests/public-routes.test.tsx \
  apps/web/app/page.tsx \
  'apps/web/app/boards/[boardId]/page.tsx' \
  'apps/web/app/threads/[threadId]/page.tsx'
git commit -m "让 Web 页面复用公共阅读服务"
```

### Task 6: 写 mobile client 和首页替换的失败测试

**Files:**
- Modify: `apps/mobile/__tests__/mobile-routes.test.tsx`

- [ ] **Step 1: 写失败测试，锁定环境变量缺失时的显式错误**

```ts
it("shows a clear error when the public web base url is missing", async () => {
  const original = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  delete process.env.EXPO_PUBLIC_WEB_BASE_URL;
  jest.resetModules();

  try {
    const { fetchBoards } = await import("../src/features/reading/client");
    await expect(fetchBoards()).rejects.toThrow(
      "Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API",
    );
  } finally {
    process.env.EXPO_PUBLIC_WEB_BASE_URL = original;
    jest.resetModules();
  }
});
```

- [ ] **Step 2: 写失败测试，锁定首页改为读取 public client**

```ts
jest.mock("../src/features/reading/client", () => ({
  fetchBoards: jest.fn().mockResolvedValue({
    boards: [
      {
        id: "board:job",
        slug: "job",
        name: "Jobs and Offers",
        description: "Signals for roles, openings, and practical next steps.",
        threadCount: 2,
        latestThreadTitle: "Newest thread",
      },
    ],
  }),
  fetchBoard: jest.fn(),
  fetchBoardThreadsFeed: jest.fn(),
  fetchThread: jest.fn(),
  fetchThreadRepliesFeed: jest.fn(),
}));

it("renders board entries from the public reading client on the home page", async () => {
  renderMobileRoute("/");

  expect(await screen.findByText("Jobs and Offers")).toBeTruthy();
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
pnpm test -- --runInBand __tests__/mobile-routes.test.tsx
```

Expected: FAIL，报 `client.ts` 不存在或首页仍在读取 fixture。

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/mobile/__tests__/mobile-routes.test.tsx
git commit -m "补充移动端公共阅读客户端失败测试"
```

### Task 7: 实现 mobile API client、类型与首页替换

**Files:**
- Create: `apps/mobile/src/lib/api.ts`
- Create: `apps/mobile/src/features/reading/types.ts`
- Create: `apps/mobile/src/features/reading/client.ts`
- Modify: `apps/mobile/src/app/(tabs)/index.tsx`
- Modify: `apps/mobile/README.md`
- Test: `apps/mobile/__tests__/mobile-routes.test.tsx`

- [ ] **Step 1: 新增通用 API 层与 response 类型**

```ts
// apps/mobile/src/lib/api.ts
function getWebBaseUrl() {
  const value = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim();
  if (!value) {
    throw new Error("Missing EXPO_PUBLIC_WEB_BASE_URL for mobile public reading API");
  }
  return value.replace(/\/$/, "");
}

export async function apiGetJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getWebBaseUrl()}${path}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`;
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json() as Promise<T>;
}
```

```ts
// apps/mobile/src/features/reading/types.ts
export type BoardsResponse = {
  boards: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    threadCount: number;
    latestThreadTitle: string | null;
  }>;
};

export type BoardDetailResponse = {
  id: string;
  slug: string;
  name: string;
  description: string;
};

export type BoardThreadsFeedResponse = {
  items: Array<{
    id: string;
    title: string;
    authorName: string;
    publishedAt: string;
    replyCount: number;
    lastReplyAt: string | null;
  }>;
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};

export type ThreadDetailResponse = {
  board: { id: string; slug: string; name: string };
  thread: {
    id: string;
    title: string;
    body: string;
    authorName: string;
    publishedAt: string;
    replyCount: number;
  };
};

export type ThreadRepliesFeedResponse = {
  items: Array<{
    id: string;
    body: string;
    authorName: string;
    publishedAt: string;
    replyIndex: number;
  }>;
  page: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
};
```

- [ ] **Step 2: 新增 reading client**

```ts
import { apiGetJson } from "@/lib/api";
import type {
  BoardDetailResponse,
  BoardThreadsFeedResponse,
  BoardsResponse,
  ThreadDetailResponse,
  ThreadRepliesFeedResponse,
} from "./types";

export function fetchBoards() {
  return apiGetJson<BoardsResponse>("/api/public/boards");
}

export function fetchBoard(boardIdOrSlug: string) {
  return apiGetJson<BoardDetailResponse>(
    `/api/public/boards/${encodeURIComponent(boardIdOrSlug)}`,
  );
}

export function fetchBoardThreadsFeed(boardIdOrSlug: string, cursor?: string) {
  const searchParams = new URLSearchParams({ limit: "20" });
  if (cursor) searchParams.set("cursor", cursor);
  return apiGetJson<BoardThreadsFeedResponse>(
    `/api/public/boards/${encodeURIComponent(boardIdOrSlug)}/threads?${searchParams.toString()}`,
  );
}

export function fetchThread(threadId: string) {
  return apiGetJson<ThreadDetailResponse>(
    `/api/public/threads/${encodeURIComponent(threadId)}`,
  );
}

export function fetchThreadRepliesFeed(threadId: string, cursor?: string) {
  const searchParams = new URLSearchParams({ limit: "20" });
  if (cursor) searchParams.set("cursor", cursor);
  return apiGetJson<ThreadRepliesFeedResponse>(
    `/api/public/threads/${encodeURIComponent(threadId)}/replies?${searchParams.toString()}`,
  );
}
```

- [ ] **Step 3: 改写首页与 README**

```tsx
// apps/mobile/src/app/(tabs)/index.tsx
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";

import { fetchBoards } from "@/features/reading/client";

export default function HomeScreen() {
  const [boards, setBoards] = useState<Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    threadCount: number;
    latestThreadTitle: string | null;
  }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetchBoards()
      .then((result) => {
        if (!active) return;
        setBoards(result.boards);
        setErrorMessage(null);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error instanceof Error ? error.message : "unknown error");
      });
    return () => {
      active = false;
    };
  }, []);

  if (errorMessage) {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>论坛首页</Text>
        <Text>读取失败：{errorMessage}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 28, fontWeight: "600" }}>论坛首页</Text>
      <View style={{ gap: 12 }}>
        {boards.map((board) => (
          <View key={board.id} style={{ gap: 6 }}>
            <Link
              href={{
                pathname: "/boards/[boardId]",
                params: { boardId: board.slug },
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "500" }}>{board.name}</Text>
            </Link>
            <Text>{board.description}</Text>
            <Text>帖子数：{board.threadCount}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

```md
### 移动端真实读取环境变量

移动端读取 `apps/web` 的公共只读 API 时，必须提供：

```env
EXPO_PUBLIC_WEB_BASE_URL=https://your-web-domain.example.com
```

如果缺失该变量，移动端会显式报错，不会自动回退到仓库 fixture。
```

- [ ] **Step 4: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
pnpm test -- --runInBand __tests__/mobile-routes.test.tsx
```

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add \
  apps/mobile/src/lib/api.ts \
  apps/mobile/src/features/reading/types.ts \
  apps/mobile/src/features/reading/client.ts \
  'apps/mobile/src/app/(tabs)/index.tsx' \
  apps/mobile/README.md \
  apps/mobile/__tests__/mobile-routes.test.tsx
git commit -m "接入移动端公共阅读客户端与首页"
```

### Task 8: 写 mobile 增量列表 hook 的失败测试

**Files:**
- Create: `apps/mobile/__tests__/reading-hooks.test.tsx`

- [ ] **Step 1: 写失败测试，覆盖版面帖子流 hook**

```ts
import { act, renderHook, waitFor } from "@testing-library/react-native";

import * as readingClient from "../src/features/reading/client";
import { useBoardThreadsFeed } from "../src/features/reading/useBoardThreadsFeed";

describe("reading hooks", () => {
  it("loads board detail and appends the next batch of threads", async () => {
    jest.spyOn(readingClient, "fetchBoard").mockResolvedValue({
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
      description: "Signals for roles, openings, and practical next steps.",
    });
    jest.spyOn(readingClient, "fetchBoardThreadsFeed")
      .mockResolvedValueOnce({
        items: Array.from({ length: 20 }, (_, index) => ({
          id: `thread:${index + 1}`,
          title: `Thread ${index + 1}`,
          authorName: "Robot",
          publishedAt: "2026-05-01T08:00:00.000Z",
          replyCount: 0,
          lastReplyAt: null,
        })),
        page: {
          limit: 20,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "thread:21",
            title: "Thread 21",
            authorName: "Robot",
            publishedAt: "2026-05-01T08:00:00.000Z",
            replyCount: 0,
            lastReplyAt: null,
          },
        ],
        page: {
          limit: 20,
          nextCursor: null,
          hasMore: false,
        },
      });

    const { result } = renderHook(() => useBoardThreadsFeed("job"));

    await waitFor(() => expect(result.current.items).toHaveLength(20));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.board?.name).toBe("Jobs and Offers");
    expect(result.current.items).toHaveLength(21);
    expect(result.current.hasMore).toBe(false);
  });
});
```

- [ ] **Step 2: 写失败测试，覆盖帖子回复流 hook 的失败重试**

```ts
import { useThreadRepliesFeed } from "../src/features/reading/useThreadRepliesFeed";

it("keeps existing replies when loading the next batch fails", async () => {
  jest.spyOn(readingClient, "fetchThread").mockResolvedValue({
    board: {
      id: "board:job",
      slug: "job",
      name: "Jobs and Offers",
    },
    thread: {
      id: "thread:first-offer",
      title: "First offer from the mirror",
      body: "A new listing has been mirrored and is ready to read.",
      authorName: "Robot 1",
      publishedAt: "2026-05-01T08:00:00.000Z",
      replyCount: 2,
    },
  });
  jest.spyOn(readingClient, "fetchThreadRepliesFeed")
    .mockResolvedValueOnce({
      items: [
        {
          id: "reply:1",
          body: "Reply 1",
          authorName: "Alice",
          publishedAt: "2026-05-01T08:05:00.000Z",
          replyIndex: 1,
        },
      ],
      page: {
        limit: 20,
        nextCursor: "1",
        hasMore: true,
      },
    })
    .mockRejectedValueOnce(new Error("boom"));

  const { result } = renderHook(() => useThreadRepliesFeed("first-offer"));

  await waitFor(() => expect(result.current.items).toHaveLength(1));

  await act(async () => {
    await result.current.loadMore();
  });

  expect(result.current.items).toHaveLength(1);
  expect(result.current.loadMoreError).toBe("boom");
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
pnpm test -- --runInBand __tests__/reading-hooks.test.tsx
```

Expected: FAIL，报 hook 文件不存在。

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add apps/mobile/__tests__/reading-hooks.test.tsx
git commit -m "补充移动端增量列表 hook 失败测试"
```

### Task 9: 实现 mobile 版面页增量加载

**Files:**
- Create: `apps/mobile/src/features/reading/useBoardThreadsFeed.ts`
- Modify: `apps/mobile/src/app/boards/[boardId].tsx`
- Test: `apps/mobile/__tests__/reading-hooks.test.tsx`
- Test: `apps/mobile/__tests__/mobile-routes.test.tsx`

- [ ] **Step 1: 实现 `useBoardThreadsFeed`**

```ts
import { useEffect, useState } from "react";

import { fetchBoard, fetchBoardThreadsFeed } from "./client";
import type { BoardDetailResponse, BoardThreadsFeedResponse } from "./types";

export function useBoardThreadsFeed(boardIdOrSlug: string | undefined) {
  const [board, setBoard] = useState<BoardDetailResponse | null>(null);
  const [items, setItems] = useState<BoardThreadsFeedResponse["items"]>([]);
  const [initialStatus, setInitialStatus] = useState<"loading" | "success" | "notFound" | "error">("loading");
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      if (!boardIdOrSlug) {
        setInitialStatus("notFound");
        setBoard(null);
        setItems([]);
        return;
      }

      try {
        setInitialStatus("loading");
        const [boardResult, feedResult] = await Promise.all([
          fetchBoard(boardIdOrSlug),
          fetchBoardThreadsFeed(boardIdOrSlug),
        ]);
        if (!active) return;
        setBoard(boardResult);
        setItems(feedResult.items);
        setNextCursor(feedResult.page.nextCursor);
        setHasMore(feedResult.page.hasMore);
        setInitialStatus("success");
        setInitialError(null);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "unknown error";
        const status = typeof error === "object" && error && "status" in error ? (error as any).status : undefined;
        setInitialStatus(status === 404 ? "notFound" : "error");
        setInitialError(message);
      }
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, [boardIdOrSlug]);

  async function loadMore() {
    if (!boardIdOrSlug || !nextCursor || !hasMore || isLoadingMore) {
      return;
    }
    try {
      setIsLoadingMore(true);
      setLoadMoreError(null);
      const feedResult = await fetchBoardThreadsFeed(boardIdOrSlug, nextCursor);
      setItems((current) => [...current, ...feedResult.items]);
      setNextCursor(feedResult.page.nextCursor);
      setHasMore(feedResult.page.hasMore);
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : "unknown error");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return {
    board,
    items,
    initialStatus,
    initialError,
    loadMoreError,
    isLoadingMore,
    hasMore,
    loadMore,
  };
}
```

- [ ] **Step 2: 用 `FlatList` 改写版面页**

```tsx
import { FlatList, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { useBoardThreadsFeed } from "@/features/reading/useBoardThreadsFeed";

export default function BoardPage() {
  const { boardId } = useLocalSearchParams<{ boardId?: string | string[] }>();
  const boardIdValue = Array.isArray(boardId) ? boardId[0] : boardId;
  const {
    board,
    items,
    initialStatus,
    initialError,
    loadMoreError,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useBoardThreadsFeed(boardIdValue);

  if (initialStatus !== "success") {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>版面帖子</Text>
        <Text>
          {initialStatus === "notFound"
            ? "版面不存在"
            : initialStatus === "error"
              ? `读取失败：${initialError ?? "unknown error"}`
              : "加载中"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 24, gap: 12 }}
      onEndReached={() => {
        if (hasMore && !isLoadingMore) {
          void loadMore();
        }
      }}
      onEndReachedThreshold={0.6}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "600" }}>{board?.name ?? "版面帖子"}</Text>
          <Text>{board?.description}</Text>
        </View>
      }
      ListFooterComponent={
        <View style={{ paddingTop: 12, gap: 8 }}>
          {isLoadingMore ? <Text>正在加载更多帖子…</Text> : null}
          {loadMoreError ? <Text>加载更多失败：{loadMoreError}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ gap: 4 }}>
          <Link
            href={{
              pathname: "/threads/[threadId]",
              params: { threadId: item.id.replace(/^thread:/, "") },
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "500" }}>{item.title}</Text>
          </Link>
          <Text>{item.authorName}</Text>
          <Text>回复数：{item.replyCount}</Text>
        </View>
      )}
    />
  );
}
```

- [ ] **Step 3: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
pnpm test -- --runInBand __tests__/reading-hooks.test.tsx __tests__/mobile-routes.test.tsx
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add \
  apps/mobile/src/features/reading/useBoardThreadsFeed.ts \
  'apps/mobile/src/app/boards/[boardId].tsx' \
  apps/mobile/__tests__/reading-hooks.test.tsx \
  apps/mobile/__tests__/mobile-routes.test.tsx
git commit -m "实现移动端版面帖子流增量加载"
```

### Task 10: 实现 mobile 帖子页增量加载

**Files:**
- Create: `apps/mobile/src/features/reading/useThreadRepliesFeed.ts`
- Modify: `apps/mobile/src/app/threads/[threadId].tsx`
- Test: `apps/mobile/__tests__/reading-hooks.test.tsx`
- Test: `apps/mobile/__tests__/mobile-routes.test.tsx`

- [ ] **Step 1: 实现 `useThreadRepliesFeed`**

```ts
import { useEffect, useState } from "react";

import { fetchThread, fetchThreadRepliesFeed } from "./client";
import type { ThreadDetailResponse, ThreadRepliesFeedResponse } from "./types";

export function useThreadRepliesFeed(threadId: string | undefined) {
  const [threadResult, setThreadResult] = useState<ThreadDetailResponse | null>(null);
  const [items, setItems] = useState<ThreadRepliesFeedResponse["items"]>([]);
  const [initialStatus, setInitialStatus] = useState<"loading" | "success" | "notFound" | "error">("loading");
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      if (!threadId) {
        setInitialStatus("notFound");
        setThreadResult(null);
        setItems([]);
        return;
      }

      try {
        setInitialStatus("loading");
        const [threadResponse, repliesResponse] = await Promise.all([
          fetchThread(threadId),
          fetchThreadRepliesFeed(threadId),
        ]);
        if (!active) return;
        setThreadResult(threadResponse);
        setItems(repliesResponse.items);
        setNextCursor(repliesResponse.page.nextCursor);
        setHasMore(repliesResponse.page.hasMore);
        setInitialStatus("success");
        setInitialError(null);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "unknown error";
        const status = typeof error === "object" && error && "status" in error ? (error as any).status : undefined;
        setInitialStatus(status === 404 ? "notFound" : "error");
        setInitialError(message);
      }
    }

    void loadInitial();
    return () => {
      active = false;
    };
  }, [threadId]);

  async function loadMore() {
    if (!threadId || !nextCursor || !hasMore || isLoadingMore) {
      return;
    }
    try {
      setIsLoadingMore(true);
      setLoadMoreError(null);
      const repliesResponse = await fetchThreadRepliesFeed(threadId, nextCursor);
      setItems((current) => [...current, ...repliesResponse.items]);
      setNextCursor(repliesResponse.page.nextCursor);
      setHasMore(repliesResponse.page.hasMore);
    } catch (error) {
      setLoadMoreError(error instanceof Error ? error.message : "unknown error");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return {
    threadResult,
    items,
    initialStatus,
    initialError,
    loadMoreError,
    isLoadingMore,
    hasMore,
    loadMore,
  };
}
```

- [ ] **Step 2: 用 `FlatList` 改写帖子页**

```tsx
import { FlatList, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { useThreadRepliesFeed } from "@/features/reading/useThreadRepliesFeed";

export default function ThreadPage() {
  const { threadId } = useLocalSearchParams<{ threadId?: string | string[] }>();
  const threadIdValue = Array.isArray(threadId) ? threadId[0] : threadId;
  const {
    threadResult,
    items,
    initialStatus,
    initialError,
    loadMoreError,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useThreadRepliesFeed(threadIdValue);

  if (initialStatus !== "success") {
    return (
      <View style={{ flex: 1, padding: 24, gap: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: "600" }}>帖子详情</Text>
        <Text>
          {initialStatus === "notFound"
            ? "帖子不存在"
            : initialStatus === "error"
              ? `读取失败：${initialError ?? "unknown error"}`
              : "加载中"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 24, gap: 12 }}
      onEndReached={() => {
        if (hasMore && !isLoadingMore) {
          void loadMore();
        }
      }}
      onEndReachedThreshold={0.6}
      ListHeaderComponent={
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 28, fontWeight: "600" }}>
            {threadResult?.thread.title ?? "帖子详情"}
          </Text>
          <Text>{threadResult?.thread.body}</Text>
          <Text>{threadResult?.thread.authorName}</Text>
        </View>
      }
      ListFooterComponent={
        <View style={{ paddingTop: 12, gap: 8 }}>
          {isLoadingMore ? <Text>正在加载更多回复…</Text> : null}
          {loadMoreError ? <Text>加载更多失败：{loadMoreError}</Text> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ gap: 4 }}>
          <Text>{item.authorName}</Text>
          <Text>{item.body}</Text>
        </View>
      )}
    />
  );
}
```

- [ ] **Step 3: 运行测试并确认通过**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
pnpm test -- --runInBand __tests__/reading-hooks.test.tsx __tests__/mobile-routes.test.tsx
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add \
  apps/mobile/src/features/reading/useThreadRepliesFeed.ts \
  'apps/mobile/src/app/threads/[threadId].tsx' \
  apps/mobile/__tests__/reading-hooks.test.tsx \
  apps/mobile/__tests__/mobile-routes.test.tsx
git commit -m "实现移动端帖子回复流增量加载"
```

### Task 11: 全量验证

**Files:**
- Modify: `docs/superpowers/plans/2026-05-04-mobile-public-reading-flow-implementation-plan.md`

- [ ] **Step 1: 运行 Web 测试**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web exec vitest run \
  apps/web/tests/server/publicReadingService.test.ts \
  apps/web/tests/public-api-routes.test.ts \
  apps/web/tests/public-routes.test.tsx
```

Expected: PASS。

- [ ] **Step 2: 运行 mobile 测试**

Run:

```bash
cd /Users/ghost/code/BBSAchieve/apps/mobile
pnpm test -- --runInBand __tests__/reading-hooks.test.tsx __tests__/mobile-routes.test.tsx
```

Expected: PASS。

- [ ] **Step 3: 运行 typecheck**

Run:

```bash
cd /Users/ghost/code/BBSAchieve
pnpm --filter @bbs/web typecheck
pnpm --filter @bbs/mobile typecheck
pnpm --filter @bbs/mobile typecheck:test
```

Expected: PASS。

- [ ] **Step 4: 提交**

```bash
cd /Users/ghost/code/BBSAchieve
git add docs/superpowers/plans/2026-05-04-mobile-public-reading-flow-implementation-plan.md
git commit -m "完成移动端公共阅读链路实现计划"
```

## 自检

### Spec coverage

- Web 统一 reading service / DTO：Task 1、Task 2、Task 5 覆盖。
- Web public read API：Task 3、Task 4 覆盖。
- Mobile 通过 `EXPO_PUBLIC_WEB_BASE_URL` 读取：Task 6、Task 7 覆盖。
- 版面帖子流增量加载：Task 8、Task 9 覆盖。
- 帖子回复流增量加载：Task 8、Task 10 覆盖。
- 文档与验证：Task 7、Task 11 覆盖。

没有发现 spec 中缺少任务承接的部分。

### Placeholder scan

- 已检查没有 `TODO`、`TBD`、`implement later`、`Similar to Task` 等占位符。
- 每个任务都包含了具体文件、命令与代码片段。

### Type consistency

- Web service 统一暴露 `listBoards`、`getBoard`、`getBoardThreadsFeed`、`getThread`、`getThreadRepliesFeed`。
- Mobile client 统一暴露 `fetchBoards`、`fetchBoard`、`fetchBoardThreadsFeed`、`fetchThread`、`fetchThreadRepliesFeed`。
- 增量加载统一使用 `limit=20`、`nextCursor`、`hasMore`，未混入页码语义。
