import { Prisma } from "@prisma/client";

import { prisma } from "@/src/server/db/client";

export type SubscriptionTargetType = "thread" | "reply";

export type SubscriptionDto = {
  id: string;
  targetType: SubscriptionTargetType;
  threadId: string | null;
  replyId: string | null;
  threadTitle: string | null;
  replyExcerpt: string | null;
  replyFloor: number | null;
  status: "active" | "muted" | "revoked";
  createdAt: string;
  lastReplyAt: string | null;
};

export type SubscribeInput = {
  humanUserId: string;
  targetType: SubscriptionTargetType;
  threadId?: string;
  replyId?: string;
};

export class SubscriptionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubscriptionValidationError";
  }
}

function buildExcerpt(body: string, max = 140): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max)}…`;
}

function validateInput(input: SubscribeInput): void {
  if (input.targetType === "thread") {
    if (!input.threadId) {
      throw new SubscriptionValidationError("threadId is required for thread subscriptions");
    }
    if (input.replyId) {
      throw new SubscriptionValidationError("replyId must not be set for thread subscriptions");
    }
  } else {
    if (!input.replyId) {
      throw new SubscriptionValidationError("replyId is required for reply subscriptions");
    }
    if (!input.threadId) {
      throw new SubscriptionValidationError("threadId is required for reply subscriptions");
    }
  }
}

export async function createSubscription(
  input: SubscribeInput,
): Promise<SubscriptionDto> {
  validateInput(input);

  // Confirm target exists. Without this, we silently produce dead subscriptions
  // that would never receive notifications.
  if (input.targetType === "thread") {
    const thread = await prisma.thread.findUnique({
      where: { id: input.threadId! },
      select: { id: true },
    });
    if (!thread) {
      throw new SubscriptionValidationError("Target thread not found");
    }
  } else {
    const reply = await prisma.reply.findUnique({
      where: { id: input.replyId! },
      select: { id: true, threadId: true },
    });
    if (!reply) {
      throw new SubscriptionValidationError("Target reply not found");
    }
    if (reply.threadId !== input.threadId) {
      throw new SubscriptionValidationError("Reply does not belong to the supplied thread");
    }
  }

  const where: Prisma.ContentSubscriptionWhereInput =
    input.targetType === "thread"
      ? {
          humanUserId: input.humanUserId,
          targetType: "thread",
          threadId: input.threadId,
        }
      : {
          humanUserId: input.humanUserId,
          targetType: "reply",
          replyId: input.replyId,
        };

  const existing = await prisma.contentSubscription.findFirst({ where });
  if (existing) {
    if (existing.subscriptionStatus !== "active") {
      const reactivated = await prisma.contentSubscription.update({
        where: { id: existing.id },
        data: { subscriptionStatus: "active" },
      });
      return toDto(reactivated, null, null);
    }
    return toDto(existing, null, null);
  }

  const created = await prisma.contentSubscription.create({
    data: {
      humanUserId: input.humanUserId,
      targetType: input.targetType,
      threadId: input.threadId ?? null,
      replyId: input.replyId ?? null,
      subscriptionStatus: "active",
    },
  });
  return toDto(created, null, null);
}

export async function deleteSubscription(input: {
  humanUserId: string;
  subscriptionId: string;
}): Promise<void> {
  const result = await prisma.contentSubscription.updateMany({
    where: {
      id: input.subscriptionId,
      humanUserId: input.humanUserId,
    },
    data: {
      subscriptionStatus: "revoked",
    },
  });
  if (result.count === 0) {
    throw new SubscriptionValidationError("Subscription not found");
  }
}

export async function listSubscriptions(input: {
  humanUserId: string;
  status?: "active" | "muted" | "revoked";
  page?: number;
  perPage?: number;
}): Promise<{
  items: SubscriptionDto[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
}> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const perPage = Math.min(100, Math.max(1, Math.floor(input.perPage ?? 20)));
  const status = input.status ?? "active";

  const where: Prisma.ContentSubscriptionWhereInput = {
    humanUserId: input.humanUserId,
    subscriptionStatus: status,
  };

  const [totalCount, rows] = await Promise.all([
    prisma.contentSubscription.count({ where }),
    prisma.contentSubscription.findMany({
      where,
      orderBy: { createdAt: Prisma.SortOrder.desc },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        thread: {
          select: { id: true, title: true, lastReplyAt: true },
        },
        reply: {
          select: {
            id: true,
            body: true,
            replyIndex: true,
            thread: { select: { id: true, title: true, lastReplyAt: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: rows.map((row) => toDto(row, row.thread, row.reply)),
    page,
    perPage,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
  };
}

type RawSubscription = {
  id: string;
  targetType: SubscriptionTargetType;
  threadId: string | null;
  replyId: string | null;
  subscriptionStatus: "active" | "muted" | "revoked";
  createdAt: Date;
};

type RawThread = {
  id: string;
  title: string;
  lastReplyAt: Date | null;
} | null;

type RawReply = {
  id: string;
  body: string;
  replyIndex: number;
  thread: { id: string; title: string; lastReplyAt: Date | null };
} | null;

function toDto(
  row: RawSubscription,
  thread: RawThread,
  reply: RawReply,
): SubscriptionDto {
  if (row.targetType === "thread") {
    return {
      id: row.id,
      targetType: "thread",
      threadId: row.threadId,
      replyId: null,
      threadTitle: thread?.title ?? null,
      replyExcerpt: null,
      replyFloor: null,
      status: row.subscriptionStatus,
      createdAt: row.createdAt.toISOString(),
      lastReplyAt: thread?.lastReplyAt?.toISOString() ?? null,
    };
  }
  return {
    id: row.id,
    targetType: "reply",
    threadId: row.threadId ?? reply?.thread.id ?? null,
    replyId: row.replyId,
    threadTitle: reply?.thread.title ?? null,
    replyExcerpt: reply ? buildExcerpt(reply.body) : null,
    replyFloor: reply?.replyIndex ?? null,
    status: row.subscriptionStatus,
    createdAt: row.createdAt.toISOString(),
    lastReplyAt: reply?.thread.lastReplyAt?.toISOString() ?? null,
  };
}
