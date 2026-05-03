import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "../db/client";

export type BoardThreadRow = {
  id: string;
  boardSlug: string;
  title: string | null;
  lastReplyAt: string | Date | null;
};

export type ListBoardThreadsInput = {
  boardId: string;
  boardSlug: string;
  limit: number;
  page?: number;
};

export type ListBoardThreadsResult = {
  threads: Array<{
    id: string;
    boardSlug: string;
    title: string | null;
    lastReplyAt: string | null;
  }>;
  page: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type ListBoardThreadsDeps = {
  client?: PrismaThreadClient;
};

type PrismaThreadClient = Pick<PrismaClient, "thread">;

function normalizeDate(value: string | Date | null): string | null {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function normalizePage(page: number | undefined): number {
  if (page == null) {
    return 1;
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Invalid thread page");
  }

  return page;
}

export async function listBoardThreads(
  input: ListBoardThreadsInput,
  deps: ListBoardThreadsDeps = {},
): Promise<ListBoardThreadsResult> {
  if (input.limit < 1) {
    throw new Error("Thread limit must be at least 1");
  }

  const page = normalizePage(input.page);
  const client = deps.client ?? prisma;
  const where = {
    boardId: input.boardId,
  } satisfies Prisma.ThreadWhereInput;

  const [totalCount, threads] = await Promise.all([
    client.thread.count({ where }),
    client.thread.findMany({
      where,
      orderBy: [
        {
          lastReplyAt: {
            sort: Prisma.SortOrder.desc,
            nulls: Prisma.NullsOrder.last,
          },
        },
        {
          id: Prisma.SortOrder.desc,
        },
      ],
      skip: (page - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        title: true,
        lastReplyAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / input.limit));
  const safePage = Math.min(page, totalPages);

  if (safePage !== page) {
    const adjustedThreads = await client.thread.findMany({
      where,
      orderBy: [
        {
          lastReplyAt: {
            sort: Prisma.SortOrder.desc,
            nulls: Prisma.NullsOrder.last,
          },
        },
        {
          id: Prisma.SortOrder.desc,
        },
      ],
      skip: (safePage - 1) * input.limit,
      take: input.limit,
      select: {
        id: true,
        title: true,
        lastReplyAt: true,
      },
    });

    return {
      threads: adjustedThreads.map((thread) => ({
        id: thread.id,
        boardSlug: input.boardSlug,
        title: thread.title ?? null,
        lastReplyAt: normalizeDate(thread.lastReplyAt),
      })),
      page: safePage,
      totalPages,
      totalCount,
      hasPreviousPage: safePage > 1,
      hasNextPage: safePage < totalPages,
    };
  }

  return {
    threads: threads.map((thread) => ({
      id: thread.id,
      boardSlug: input.boardSlug,
      title: thread.title ?? null,
      lastReplyAt: normalizeDate(thread.lastReplyAt),
    })),
    page,
    totalPages,
    totalCount,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
