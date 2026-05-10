import { Prisma } from "@prisma/client";

import { prisma } from "@/src/server/db/client";

export type SearchScope = "posts" | "replies" | "users";

export type SearchPostHit = {
  id: string;
  title: string;
  authorName: string;
  authorIsBot: boolean;
  replyCount: number;
  lastReplyAt: string | null;
};

export type SearchReplyHit = {
  id: string;
  threadId: string;
  threadTitle: string;
  body: string;
  floor: number | null;
  authorName: string;
  publishedAt: string;
};

export type SearchUserHit = {
  id: string;
  username: string;
  displayName: string;
  isBot: boolean;
  threadCount: number;
};

export type SearchResults = {
  posts: SearchPostHit[];
  replies: SearchReplyHit[];
  users: SearchUserHit[];
};

export type SearchInput = {
  query: string;
  scope: SearchScope | "all";
  /** Per-scope hit limit (defaults to 8). */
  limit?: number;
};

const DEFAULT_LIMIT = 8;

export async function searchForum(input: SearchInput): Promise<SearchResults> {
  const term = input.query.trim();
  if (!term) {
    return { posts: [], replies: [], users: [] };
  }
  const limit = Math.min(50, Math.max(1, input.limit ?? DEFAULT_LIMIT));
  const scope = input.scope;

  const wantPosts = scope === "all" || scope === "posts";
  const wantReplies = scope === "all" || scope === "replies";
  // Per the design brief, only bots are indexed by user search.
  const wantUsers = scope === "all" || scope === "users";

  const [posts, replies, users] = await Promise.all([
    wantPosts ? searchPosts(term, limit) : Promise.resolve([]),
    wantReplies ? searchReplies(term, limit) : Promise.resolve([]),
    wantUsers ? searchUsers(term, limit) : Promise.resolve([]),
  ]);

  return { posts, replies, users };
}

async function searchPosts(term: string, limit: number): Promise<SearchPostHit[]> {
  const matches = await prisma.thread.findMany({
    where: {
      OR: [
        { title: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { body: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ],
    },
    orderBy: [
      {
        lastReplyAt: {
          sort: Prisma.SortOrder.desc,
          nulls: Prisma.NullsOrder.last,
        },
      },
      { publishedAt: Prisma.SortOrder.desc },
    ],
    take: limit,
    include: {
      author: {
        select: { displayName: true, userType: true },
      },
    },
  });
  return matches.map((thread) => ({
    id: thread.id,
    title: thread.title,
    authorName: thread.author.displayName,
    authorIsBot: thread.author.userType === "bot",
    replyCount: thread.replyCount,
    lastReplyAt: thread.lastReplyAt?.toISOString() ?? null,
  }));
}

async function searchReplies(term: string, limit: number): Promise<SearchReplyHit[]> {
  const matches = await prisma.reply.findMany({
    where: {
      body: { contains: term, mode: Prisma.QueryMode.insensitive },
    },
    orderBy: { publishedAt: Prisma.SortOrder.desc },
    take: limit,
    include: {
      author: { select: { displayName: true } },
      thread: { select: { id: true, title: true } },
    },
  });
  return matches.map((reply) => ({
    id: reply.id,
    threadId: reply.thread.id,
    threadTitle: reply.thread.title,
    body: reply.body.length > 140 ? `${reply.body.slice(0, 140)}…` : reply.body,
    floor: reply.replyIndex,
    authorName: reply.author.displayName,
    publishedAt: reply.publishedAt.toISOString(),
  }));
}

async function searchUsers(term: string, limit: number): Promise<SearchUserHit[]> {
  // Only bots are searchable; this matches the explicit product constraint
  // documented in docs/设计师UI设计提示词（Web+Mobile）.md.
  const matches = await prisma.user.findMany({
    where: {
      userType: "bot",
      OR: [
        { username: { contains: term, mode: Prisma.QueryMode.insensitive } },
        { displayName: { contains: term, mode: Prisma.QueryMode.insensitive } },
      ],
    },
    take: limit,
    include: {
      _count: { select: { authoredThreads: true } },
    },
  });
  return matches.map((user) => ({
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    isBot: true,
    threadCount: user._count.authoredThreads,
  }));
}
