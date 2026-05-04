import { Prisma, type PrismaClient } from "@prisma/client";

import type {
  BoardRecord,
  ReplyRecord,
  ThreadRecord,
  UserRecord,
} from "@bbs/domain";

import { prisma } from "../db/client";

type PrismaReadingClient = Pick<PrismaClient, "board" | "reply" | "thread" | "user">;

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
  findReplyById(id: string): Promise<ReplyRecord | null>;
  listRepliesByThread(threadId: string): Promise<ReplyRecord[]>;
  listRepliesPageByThread(input: {
    threadId: string;
    limit: number;
    cursor?: number;
  }): Promise<ReplyRecord[]>;
  findUserById(id: string): Promise<UserRecord | null>;
  findUsersByIds(ids: string[]): Promise<Map<string, UserRecord>>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
};

function toBoardRecord(board: {
  id: string;
  slug: string;
  name: string;
  description: string;
}): BoardRecord {
  return {
    id: board.id,
    slug: board.slug,
    name: board.name,
    description: board.description,
  };
}

function toThreadRecord(thread: {
  id: string;
  boardId: string;
  authorUserId: string;
  sourceThreadId: string;
  sourceBoardSlug: string;
  title: string;
  body: string;
  publishedAt: Date;
  replyCount: number;
  lastReplyAt: Date | null;
}): ThreadRecord {
  return {
    id: thread.id,
    boardId: thread.boardId,
    authorUserId: thread.authorUserId,
    sourceThreadId: thread.sourceThreadId,
    sourceBoardSlug: thread.sourceBoardSlug,
    title: thread.title,
    body: thread.body,
    publishedAt: thread.publishedAt.toISOString(),
    replyCount: thread.replyCount,
    lastReplyAt: thread.lastReplyAt?.toISOString() ?? null,
  };
}

function toReplyRecord(reply: {
  id: string;
  threadId: string;
  authorUserId: string;
  replyIndex: number;
  body: string;
  publishedAt: Date;
}): ReplyRecord {
  return {
    id: reply.id,
    threadId: reply.threadId,
    authorUserId: reply.authorUserId,
    replyIndex: reply.replyIndex,
    body: reply.body,
    publishedAt: reply.publishedAt.toISOString(),
  };
}

function toUserRecord(user: {
  id: string;
  username: string;
  displayName: string;
  userType: "human" | "bot";
  status: string;
  mailboxKey: string | null;
}): UserRecord {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    userType: user.userType,
    status: user.status === "disabled" ? "disabled" : "active",
    mailboxKey: user.mailboxKey ?? undefined,
  };
}

function createThreadSelect() {
  return {
    id: true,
    boardId: true,
    authorUserId: true,
    sourceBoardSlug: true,
    sourceThreadId: true,
    title: true,
    body: true,
    publishedAt: true,
    replyCount: true,
    lastReplyAt: true,
  } satisfies Prisma.ThreadSelect;
}

function createReplySelect() {
  return {
    id: true,
    threadId: true,
    authorUserId: true,
    replyIndex: true,
    body: true,
    publishedAt: true,
  } satisfies Prisma.ReplySelect;
}

function createUserSelect() {
  return {
    id: true,
    username: true,
    displayName: true,
    userType: true,
    status: true,
    mailboxKey: true,
  } satisfies Prisma.UserSelect;
}

function buildThreadPageWhere(input: {
  boardId: string;
  cursor?: {
    lastReplyAt: string | null;
    id: string;
  };
}): Prisma.ThreadWhereInput {
  if (input.cursor == null) {
    return { boardId: input.boardId };
  }

  if (input.cursor.lastReplyAt == null) {
    return {
      boardId: input.boardId,
      lastReplyAt: null,
      id: { lt: input.cursor.id },
    };
  }

  const cursorLastReplyAt = new Date(input.cursor.lastReplyAt);

  return {
    boardId: input.boardId,
    OR: [
      { lastReplyAt: { lt: cursorLastReplyAt } },
      {
        lastReplyAt: cursorLastReplyAt,
        id: { lt: input.cursor.id },
      },
      { lastReplyAt: null },
    ],
  };
}

export function createReadingRepository(
  client: PrismaReadingClient = prisma,
): ReadingRepository {
  return {
    async findBoardById(id) {
      const board = await client.board.findUnique({
        where: { id },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
        },
      });

      return board ? toBoardRecord(board) : null;
    },
    async findBoardBySlug(slug) {
      const board = await client.board.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
        },
      });

      return board ? toBoardRecord(board) : null;
    },
    async listBoards() {
      const boards = await client.board.findMany({
        orderBy: { slug: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
        },
      });

      return boards.map(toBoardRecord);
    },
    async findThreadById(id) {
      const thread = await client.thread.findUnique({
        where: { id },
        select: createThreadSelect(),
      });

      return thread ? toThreadRecord(thread) : null;
    },
    async findThreadByRouteId(routeId) {
      const thread = await client.thread.findFirst({
        where: { sourceThreadId: routeId },
        orderBy: { publishedAt: "desc" },
        select: createThreadSelect(),
      });

      return thread ? toThreadRecord(thread) : null;
    },
    async listThreadsByBoard(boardId) {
      const threads = await client.thread.findMany({
        where: { boardId },
        orderBy: { publishedAt: "desc" },
        select: createThreadSelect(),
      });

      return threads.map(toThreadRecord);
    },
    async listThreadsPageByBoard(input) {
      const threads = await client.thread.findMany({
        where: buildThreadPageWhere(input),
        orderBy: [
          {
            lastReplyAt: {
              sort: Prisma.SortOrder.desc,
              nulls: Prisma.NullsOrder.last,
            },
          },
          { id: Prisma.SortOrder.desc },
        ],
        take: input.limit,
        select: createThreadSelect(),
      });

      return threads.map(toThreadRecord);
    },
    async findReplyById(id) {
      const reply = await client.reply.findUnique({
        where: { id },
        select: createReplySelect(),
      });

      return reply ? toReplyRecord(reply) : null;
    },
    async listRepliesByThread(threadId) {
      const replies = await client.reply.findMany({
        where: { threadId },
        orderBy: { replyIndex: "asc" },
        select: createReplySelect(),
      });

      return replies.map(toReplyRecord);
    },
    async listRepliesPageByThread(input) {
      const replies = await client.reply.findMany({
        where: {
          threadId: input.threadId,
          ...(input.cursor == null ? {} : { replyIndex: { gt: input.cursor } }),
        },
        orderBy: { replyIndex: "asc" },
        take: input.limit,
        select: createReplySelect(),
      });

      return replies.map(toReplyRecord);
    },
    async findUserById(id) {
      const user = await client.user.findUnique({
        where: { id },
        select: createUserSelect(),
      });

      return user ? toUserRecord(user) : null;
    },
    async findUsersByIds(ids) {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) {
        return new Map();
      }

      const users = await client.user.findMany({
        where: { id: { in: uniqueIds } },
        select: createUserSelect(),
      });

      return new Map(users.map((user) => [user.id, toUserRecord(user)]));
    },
    async findUserByUsername(username) {
      const user = await client.user.findFirst({
        where: { username },
        select: createUserSelect(),
      });

      return user ? toUserRecord(user) : null;
    },
  };
}
