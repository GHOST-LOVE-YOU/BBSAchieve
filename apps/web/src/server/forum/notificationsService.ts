import { Prisma } from "@prisma/client";

import { prisma } from "@/src/server/db/client";

export type NotificationType =
  | "thread_reply"
  | "reply_quote"
  | "mirror_source_stale"
  | "bot_rotated"
  | "system";

export type NotificationDto = {
  id: string;
  type: NotificationType;
  body: string;
  sourceLabel: string | null;
  occurredAt: string;
  readAt: string | null;
  threadId: string | null;
  replyId: string | null;
  threadTitle: string | null;
  /** Convenience: target URL for the "跳转原文" affordance. */
  targetHref: string | null;
};

export type NotificationFilter = "all" | "unread" | NotificationType;

export type ListNotificationsResult = {
  items: NotificationDto[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  unreadCount: number;
};

const DEFAULT_PER_PAGE = 20;

export async function listNotifications(input: {
  recipientUserId: string;
  filter?: NotificationFilter;
  page?: number;
  perPage?: number;
}): Promise<ListNotificationsResult> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const perPage = Math.min(
    100,
    Math.max(1, Math.floor(input.perPage ?? DEFAULT_PER_PAGE)),
  );
  const filter: NotificationFilter = input.filter ?? "all";

  const filterWhere: Prisma.NotificationWhereInput = (() => {
    if (filter === "all") return {};
    if (filter === "unread") return { readAt: null };
    return { type: filter };
  })();

  const where: Prisma.NotificationWhereInput = {
    recipientUserId: input.recipientUserId,
    ...filterWhere,
  };

  const [totalCount, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { recipientUserId: input.recipientUserId, readAt: null },
    }),
    prisma.notification.findMany({
      where,
      orderBy: { occurredAt: Prisma.SortOrder.desc },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        thread: { select: { id: true, title: true } },
      },
    }),
  ]);

  return {
    items: rows.map((row) => toDto(row)),
    page,
    perPage,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
    unreadCount,
  };
}

export async function markNotificationRead(input: {
  recipientUserId: string;
  notificationId: string;
}): Promise<void> {
  await prisma.notification.updateMany({
    where: {
      id: input.notificationId,
      recipientUserId: input.recipientUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(
  recipientUserId: string,
): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: { recipientUserId, readAt: null },
    data: { readAt: new Date() },
  });
  return { count: result.count };
}

type RawNotification = Prisma.NotificationGetPayload<{
  include: { thread: { select: { id: true; title: true } } };
}>;

function toDto(row: RawNotification): NotificationDto {
  const threadId = row.threadId ?? row.thread?.id ?? null;
  const targetHref = threadId
    ? `/threads/${threadId.replace(/^thread:/, "")}`
    : null;
  return {
    id: row.id,
    type: row.type as NotificationType,
    body: row.body,
    sourceLabel: row.sourceLabel,
    occurredAt: row.occurredAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
    threadId,
    replyId: row.replyId,
    threadTitle: row.thread?.title ?? null,
    targetHref,
  };
}
