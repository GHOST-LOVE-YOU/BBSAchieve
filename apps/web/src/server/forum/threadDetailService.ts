import { Prisma } from "@prisma/client";

import { prisma } from "@/src/server/db/client";

export type ThreadDetailDto = {
  thread: {
    id: string;
    title: string;
    body: string;
    publishedAt: string;
    lastReplyAt: string | null;
    replyCount: number;
    sourceBoardSlug: string;
    sourceThreadId: string;
    /** True when the title still carries the [镜像] prefix or when the
     *  author is a bot — both signal that the thread is a mirror. */
    mirrored: boolean;
    sourceStale: boolean;
    authorId: string;
    authorName: string;
    authorIsBot: boolean;
  };
  board: { id: string; slug: string; name: string };
  /** Subscription id if the viewer is already subscribed to the whole thread. */
  threadSubscriptionId: string | null;
};

export type ThreadReplyItem = {
  id: string;
  floor: number;
  body: string;
  publishedAt: string;
  authorName: string;
  authorIsBot: boolean;
  authorId: string;
  /** Subscription id if the viewer is subscribed to this reply. */
  subscriptionId: string | null;
};

export type ThreadRepliesPage = {
  items: ThreadReplyItem[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
};

const REPLIES_PER_PAGE = 20;

function normalizeRouteId(routeId: string): string[] {
  if (routeId.startsWith("thread:")) return [routeId];
  return [routeId, `thread:${routeId}`];
}

export async function getThreadDetail(input: {
  threadId: string;
  viewerHumanUserId?: string | null;
}): Promise<ThreadDetailDto | null> {
  const candidateIds = normalizeRouteId(input.threadId);
  const thread = await prisma.thread.findFirst({
    where: { OR: candidateIds.map((id) => ({ id })) },
    include: {
      board: { select: { id: true, slug: true, name: true } },
      author: { select: { id: true, displayName: true, userType: true } },
    },
  });
  if (!thread) return null;

  const subscriptionId = input.viewerHumanUserId
    ? (
        await prisma.contentSubscription.findFirst({
          where: {
            humanUserId: input.viewerHumanUserId,
            targetType: "thread",
            threadId: thread.id,
            subscriptionStatus: "active",
          },
          select: { id: true },
        })
      )?.id ?? null
    : null;

  const mirrored =
    thread.author.userType === "bot" || /^\s*\[镜像\]/.test(thread.title);
  // Mark the source as "stale" when we have not seen any reply or update for
  // 30+ days. The product brief calls out that source posts may be deleted
  // upstream; this is a conservative heuristic until we wire a real signal.
  const lastSeen = thread.lastReplyAt ?? thread.updatedAt;
  const staleSinceMs = Date.now() - lastSeen.getTime();
  const sourceStale = mirrored && staleSinceMs > 30 * 24 * 60 * 60 * 1000;

  return {
    thread: {
      id: thread.id,
      title: thread.title,
      body: thread.body,
      publishedAt: thread.publishedAt.toISOString(),
      lastReplyAt: thread.lastReplyAt?.toISOString() ?? null,
      replyCount: thread.replyCount,
      sourceBoardSlug: thread.sourceBoardSlug,
      sourceThreadId: thread.sourceThreadId,
      mirrored,
      sourceStale,
      authorId: thread.author.id,
      authorName: thread.author.displayName,
      authorIsBot: thread.author.userType === "bot",
    },
    board: thread.board,
    threadSubscriptionId: subscriptionId,
  };
}

export async function getThreadReplies(input: {
  threadId: string;
  viewerHumanUserId?: string | null;
  page?: number;
  perPage?: number;
}): Promise<ThreadRepliesPage | null> {
  const candidateIds = normalizeRouteId(input.threadId);
  const thread = await prisma.thread.findFirst({
    where: { OR: candidateIds.map((id) => ({ id })) },
    select: { id: true },
  });
  if (!thread) return null;

  const page = Math.max(1, Math.floor(input.page ?? 1));
  const perPage = Math.min(
    100,
    Math.max(1, Math.floor(input.perPage ?? REPLIES_PER_PAGE)),
  );
  const where: Prisma.ReplyWhereInput = { threadId: thread.id };

  const [totalCount, replies] = await Promise.all([
    prisma.reply.count({ where }),
    prisma.reply.findMany({
      where,
      orderBy: { replyIndex: Prisma.SortOrder.asc },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        author: { select: { id: true, displayName: true, userType: true } },
      },
    }),
  ]);

  const subscriptionByReplyId = new Map<string, string>();
  if (input.viewerHumanUserId && replies.length > 0) {
    const subs = await prisma.contentSubscription.findMany({
      where: {
        humanUserId: input.viewerHumanUserId,
        targetType: "reply",
        replyId: { in: replies.map((reply) => reply.id) },
        subscriptionStatus: "active",
      },
      select: { id: true, replyId: true },
    });
    for (const sub of subs) {
      if (sub.replyId) {
        subscriptionByReplyId.set(sub.replyId, sub.id);
      }
    }
  }

  return {
    items: replies.map((reply) => ({
      id: reply.id,
      floor: reply.replyIndex,
      body: reply.body,
      publishedAt: reply.publishedAt.toISOString(),
      authorName: reply.author.displayName,
      authorIsBot: reply.author.userType === "bot",
      authorId: reply.author.id,
      subscriptionId: subscriptionByReplyId.get(reply.id) ?? null,
    })),
    page,
    perPage,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
  };
}
