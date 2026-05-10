import { Prisma } from "@prisma/client";

import { prisma } from "@/src/server/db/client";

export type FeedKind = "bot" | "real" | "all";

export type FeedThreadDto = {
  id: string;
  title: string;
  body: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  authorIsBot: boolean;
  publishedAt: string;
  lastReplyAt: string | null;
  lastReplyAuthorName: string | null;
  replyCount: number;
  boardId: string;
  boardSlug: string;
  boardName: string;
  sourceBoardSlug: string;
  sourceThreadId: string;
};

export type FeedResult = {
  items: FeedThreadDto[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type ListFeedInput = {
  kind: FeedKind;
  boardId?: string;
  sortBy?: "lastReply" | "published";
  page?: number;
  perPage?: number;
};

const DEFAULT_PER_PAGE = 15;

function buildExcerpt(body: string, max = 160): string {
  if (!body) return "";
  const cleaned = body.replace(/\s+/g, " ").trim();
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max)}…`;
}

function buildAuthorFilter(kind: FeedKind): Prisma.ThreadWhereInput {
  if (kind === "bot") {
    return { author: { is: { userType: "bot" } } };
  }
  if (kind === "real") {
    return { author: { is: { userType: "human" } } };
  }
  return {};
}

export async function listFeed(input: ListFeedInput): Promise<FeedResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const perPage = Math.min(50, Math.max(1, Math.floor(input.perPage ?? DEFAULT_PER_PAGE)));
  const sortBy = input.sortBy ?? "lastReply";

  const where: Prisma.ThreadWhereInput = {
    ...buildAuthorFilter(input.kind),
    ...(input.boardId ? { boardId: input.boardId } : {}),
  };

  const orderBy: Prisma.ThreadOrderByWithRelationInput[] =
    sortBy === "lastReply"
      ? [
          {
            lastReplyAt: {
              sort: Prisma.SortOrder.desc,
              nulls: Prisma.NullsOrder.last,
            },
          },
          { publishedAt: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.desc },
        ]
      : [
          { publishedAt: Prisma.SortOrder.desc },
          { id: Prisma.SortOrder.desc },
        ];

  const [totalCount, threads] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        author: {
          select: { id: true, displayName: true, userType: true },
        },
        board: { select: { id: true, slug: true, name: true } },
      },
    }),
  ]);

  // Fetch the most recent reply per thread so we can show its author. We do a
  // single batched query rather than N+1, because some boards routinely have
  // hundreds of threads per page in admin views.
  const threadIds = threads.map((thread) => thread.id);
  const recentReplies =
    threadIds.length === 0
      ? []
      : await prisma.reply.findMany({
          where: { threadId: { in: threadIds } },
          orderBy: [
            { threadId: Prisma.SortOrder.asc },
            { publishedAt: Prisma.SortOrder.desc },
          ],
          select: {
            threadId: true,
            publishedAt: true,
            author: { select: { displayName: true } },
          },
        });
  const latestReplyByThread = new Map<string, (typeof recentReplies)[number]>();
  for (const reply of recentReplies) {
    const existing = latestReplyByThread.get(reply.threadId);
    if (!existing || existing.publishedAt < reply.publishedAt) {
      latestReplyByThread.set(reply.threadId, reply);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  return {
    items: threads.map((thread) => {
      const latestReply = latestReplyByThread.get(thread.id);
      return {
        id: thread.id,
        title: thread.title,
        body: thread.body,
        excerpt: buildExcerpt(thread.body),
        authorId: thread.author.id,
        authorName: thread.author.displayName,
        authorIsBot: thread.author.userType === "bot",
        publishedAt: thread.publishedAt.toISOString(),
        lastReplyAt: thread.lastReplyAt?.toISOString() ?? null,
        lastReplyAuthorName: latestReply?.author.displayName ?? null,
        replyCount: thread.replyCount,
        boardId: thread.board.id,
        boardSlug: thread.board.slug,
        boardName: thread.board.name,
        sourceBoardSlug: thread.sourceBoardSlug,
        sourceThreadId: thread.sourceThreadId,
      } satisfies FeedThreadDto;
    }),
    page,
    perPage,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
