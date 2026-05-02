import type { PrismaClient } from "@prisma/client";

import { prisma } from "../db/client";

export type ThreadCursor = {
  lastReplyAt: string | null;
  threadId: string;
};

export type BoardThreadRow = {
  id: string;
  boardSlug: string;
  title?: string;
  lastReplyAt: string | Date | null;
};

export type ListBoardThreadsInput = {
  boardSlug: string;
  limit: number;
  cursor?: string | null;
};

export type ListBoardThreadsResult = {
  threads: Array<{
    id: string;
    boardSlug: string;
    title: string | null;
    lastReplyAt: string | null;
  }>;
  nextCursor: string | null;
};

export type ListBoardThreadsDeps = {
  fetchBoardThreads?: (boardSlug: string) => Promise<BoardThreadRow[]>;
};

type PrismaThreadClient = Pick<PrismaClient, "thread">;

function normalizeDate(value: string | Date | null): string | null {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function encodeBase64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeBase64UrlJson(value: string): unknown | null {
  try {
    const raw = Buffer.from(value, "base64url").toString("utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getCursorSortKey(input: {
  lastReplyAt: string | Date | null;
  threadId: string;
}): { lastReplyAtMs: number; threadId: string } {
  return {
    lastReplyAtMs:
      input.lastReplyAt == null ? Number.NEGATIVE_INFINITY : new Date(input.lastReplyAt).getTime(),
    threadId: input.threadId,
  };
}

function compareThreadsDesc(a: BoardThreadRow, b: BoardThreadRow): number {
  const left = getCursorSortKey(a);
  const right = getCursorSortKey(b);

  if (left.lastReplyAtMs !== right.lastReplyAtMs) {
    return right.lastReplyAtMs - left.lastReplyAtMs;
  }

  if (left.threadId === right.threadId) {
    return 0;
  }

  return left.threadId > right.threadId ? -1 : 1;
}

function isAfterCursor(row: BoardThreadRow, cursor: ThreadCursor): boolean {
  const rowReplyAt = row.lastReplyAt == null ? null : new Date(row.lastReplyAt).getTime();
  const cursorReplyAt =
    cursor.lastReplyAt == null ? null : new Date(cursor.lastReplyAt).getTime();

  if (rowReplyAt !== cursorReplyAt) {
    if (cursorReplyAt == null) {
      return false;
    }

    if (rowReplyAt == null) {
      return true;
    }

    return rowReplyAt < cursorReplyAt;
  }

  return row.id < cursor.threadId;
}

export function encodeThreadCursor(input: ThreadCursor): string {
  return encodeBase64UrlJson(input);
}

export function decodeThreadCursor(token: string): ThreadCursor | null {
  const parsed = decodeBase64UrlJson(token);

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("threadId" in parsed) ||
    !("lastReplyAt" in parsed)
  ) {
    return null;
  }

  const { threadId, lastReplyAt } = parsed as {
    threadId: unknown;
    lastReplyAt: unknown;
  };

  if (
    typeof threadId !== "string" ||
    threadId.trim().length === 0 ||
    (lastReplyAt !== null && typeof lastReplyAt !== "string")
  ) {
    return null;
  }

  return {
    threadId,
    lastReplyAt,
  };
}

async function defaultFetchBoardThreads(
  boardSlug: string,
  client: PrismaThreadClient = prisma,
): Promise<BoardThreadRow[]> {
  const threads = await client.thread.findMany({
    where: {
      board: {
        slug: boardSlug,
      },
    },
    select: {
      id: true,
      title: true,
      lastReplyAt: true,
      board: {
        select: {
          slug: true,
        },
      },
    },
  });

  return threads.map((thread) => ({
    id: thread.id,
    boardSlug: thread.board.slug,
    title: thread.title,
    lastReplyAt: normalizeDate(thread.lastReplyAt),
  }));
}

export async function listBoardThreads(
  input: ListBoardThreadsInput,
  deps: ListBoardThreadsDeps = {},
): Promise<ListBoardThreadsResult> {
  const fetchBoardThreads = deps.fetchBoardThreads
    ? deps.fetchBoardThreads
    : (boardSlug: string) => defaultFetchBoardThreads(boardSlug);

  const threads = (await fetchBoardThreads(input.boardSlug))
    .filter((thread) => thread.boardSlug === input.boardSlug)
    .map((thread) => ({
      ...thread,
      title: thread.title ?? null,
      lastReplyAt: normalizeDate(thread.lastReplyAt),
    }))
    .sort(compareThreadsDesc);

  const cursor =
    input.cursor == null || input.cursor === "" ? null : decodeThreadCursor(input.cursor);

  if (input.cursor && !cursor) {
    throw new Error("Invalid thread cursor");
  }

  const remaining = cursor
    ? threads.filter((thread) => isAfterCursor(thread, cursor))
    : threads;
  const page = remaining.slice(0, input.limit);
  const lastItem = page[page.length - 1] ?? null;
  const nextCursor =
    lastItem && remaining.length > page.length
      ? encodeThreadCursor({
          threadId: lastItem.id,
          lastReplyAt: lastItem.lastReplyAt,
        })
      : null;

  return {
    threads: page,
    nextCursor,
  };
}
