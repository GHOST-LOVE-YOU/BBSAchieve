import { Prisma } from "@prisma/client";

import { prisma } from "@/src/server/db/client";

export type ForumUserDto = {
  id: string;
  username: string;
  displayName: string;
  userType: "human" | "bot";
  status: string;
  bio: string | null;
  avatarUrl: string | null;
  threadCount: number;
  replyCount: number;
  joinedAt: string;
  bot: {
    sourceLabel: string;
    canPost: boolean;
    personaSummary: string | null;
  } | null;
};

export type UserThreadDto = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  lastReplyAt: string | null;
  replyCount: number;
  boardName: string;
  boardSlug: string;
};

export type UserReplyDto = {
  id: string;
  body: string;
  excerpt: string;
  floor: number;
  publishedAt: string;
  threadId: string;
  threadTitle: string;
  threadSourceTrimmedTitle: string;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  perPage: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export async function getUserProfile(
  userIdOrUsername: string,
): Promise<ForumUserDto | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userIdOrUsername }, { username: userIdOrUsername }],
    },
    include: {
      botProfile: true,
      _count: { select: { authoredThreads: true, authoredReplies: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    userType: user.userType,
    status: user.status,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    threadCount: user._count.authoredThreads,
    replyCount: user._count.authoredReplies,
    joinedAt: user.createdAt.toISOString(),
    bot: user.botProfile
      ? {
          sourceLabel: user.botProfile.sourceLabel,
          canPost: user.botProfile.canPost,
          personaSummary: user.botProfile.personaSummary,
        }
      : null,
  };
}

function buildExcerpt(body: string, max = 160): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max)}…`;
}

function trimMirrorPrefix(title: string): string {
  return title.replace(/^\[镜像\]\s*/, "");
}

export async function listUserThreads(input: {
  userId: string;
  page?: number;
  perPage?: number;
}): Promise<Paginated<UserThreadDto>> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const perPage = Math.min(50, Math.max(1, Math.floor(input.perPage ?? 8)));
  const where = { authorUserId: input.userId } satisfies Prisma.ThreadWhereInput;

  const [totalCount, threads] = await Promise.all([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      orderBy: [
        { publishedAt: Prisma.SortOrder.desc },
        { id: Prisma.SortOrder.desc },
      ],
      skip: (page - 1) * perPage,
      take: perPage,
      include: { board: { select: { slug: true, name: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  return {
    items: threads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      excerpt: buildExcerpt(thread.body),
      publishedAt: thread.publishedAt.toISOString(),
      lastReplyAt: thread.lastReplyAt?.toISOString() ?? null,
      replyCount: thread.replyCount,
      boardName: thread.board.name,
      boardSlug: thread.board.slug,
    })),
    page,
    perPage,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export async function listUserReplies(input: {
  userId: string;
  page?: number;
  perPage?: number;
}): Promise<Paginated<UserReplyDto>> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const perPage = Math.min(50, Math.max(1, Math.floor(input.perPage ?? 8)));
  const where = { authorUserId: input.userId } satisfies Prisma.ReplyWhereInput;

  const [totalCount, replies] = await Promise.all([
    prisma.reply.count({ where }),
    prisma.reply.findMany({
      where,
      orderBy: { publishedAt: Prisma.SortOrder.desc },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        thread: { select: { id: true, title: true } },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  return {
    items: replies.map((reply) => ({
      id: reply.id,
      body: reply.body,
      excerpt: buildExcerpt(reply.body),
      floor: reply.replyIndex,
      publishedAt: reply.publishedAt.toISOString(),
      threadId: reply.thread.id,
      threadTitle: reply.thread.title,
      threadSourceTrimmedTitle: trimMirrorPrefix(reply.thread.title),
    })),
    page,
    perPage,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
