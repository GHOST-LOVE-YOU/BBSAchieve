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
export type SearchInput = {
  query: string;
  scope: SearchScope | "all";
  page?: number;
  perPage?: number;
};
export type SearchResults = {
  posts: SearchPostHit[];
  replies: SearchReplyHit[];
  users: SearchUserHit[];
  page: number;
  perPage: number;
  totals: { posts: number; replies: number; users: number };
};
const DEFAULT_PER_PAGE = 25;
export async function searchForum(input: SearchInput): Promise<SearchResults> {
  const term = input.query.trim();
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const perPage = Math.min(
    50,
    Math.max(1, Math.floor(input.perPage ?? DEFAULT_PER_PAGE)),
  );
  if (!term)
    return {
      posts: [],
      replies: [],
      users: [],
      page,
      perPage,
      totals: { posts: 0, replies: 0, users: 0 },
    };
  const scope = input.scope,
    wantPosts = scope === "all" || scope === "posts",
    wantReplies = scope === "all" || scope === "replies",
    wantUsers = scope === "all" || scope === "users";
  const [posts, replies, users] = await Promise.all([
    wantPosts
      ? searchPosts(term, page, perPage)
      : Promise.resolve({ items: [], total: 0 }),
    wantReplies
      ? searchReplies(term, page, perPage)
      : Promise.resolve({ items: [], total: 0 }),
    wantUsers
      ? searchUsers(term, page, perPage)
      : Promise.resolve({ items: [], total: 0 }),
  ]);
  return {
    posts: posts.items,
    replies: replies.items,
    users: users.items,
    page,
    perPage,
    totals: { posts: posts.total, replies: replies.total, users: users.total },
  };
}
const pattern = (term: string) => `%${term.replace(/[\\%_]/g, "\\$&")}%`;
async function searchPosts(term: string, page: number, perPage: number) {
  const p = pattern(term);
  const [rows, count] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        displayName: string;
        userType: "human" | "bot";
        replyCount: number;
        lastReplyAt: Date | null;
      }>
    >(
      Prisma.sql`SELECT t.id,t.title,u."displayName",u."userType",t."replyCount",t."lastReplyAt" FROM threads t JOIN users u ON u.id=t."authorUserId" WHERE lower(t.title) LIKE lower(${p}) OR lower(t.body) LIKE lower(${p}) ORDER BY t."lastReplyAt" DESC NULLS LAST,t."publishedAt" DESC,t.id DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    ),
    prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS count FROM threads t WHERE lower(t.title) LIKE lower(${p}) OR lower(t.body) LIKE lower(${p})`,
    ),
  ]);
  return {
    items: rows.map((x) => ({
      id: x.id,
      title: x.title,
      authorName: x.displayName,
      authorIsBot: x.userType === "bot",
      replyCount: x.replyCount,
      lastReplyAt: x.lastReplyAt?.toISOString() ?? null,
    })),
    total: Number(count[0]?.count ?? 0),
  };
}
async function searchReplies(term: string, page: number, perPage: number) {
  const p = pattern(term);
  const [rows, count] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        threadId: string;
        threadTitle: string;
        body: string;
        replyIndex: number;
        displayName: string;
        publishedAt: Date;
      }>
    >(
      Prisma.sql`SELECT r.id,r."threadId",t.title AS "threadTitle",r.body,r."replyIndex",u."displayName",r."publishedAt" FROM replies r JOIN threads t ON t.id=r."threadId" JOIN users u ON u.id=r."authorUserId" WHERE lower(r.body) LIKE lower(${p}) ORDER BY r."publishedAt" DESC,r.id DESC LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    ),
    prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS count FROM replies r WHERE lower(r.body) LIKE lower(${p})`,
    ),
  ]);
  return {
    items: rows.map((x) => ({
      id: x.id,
      threadId: x.threadId,
      threadTitle: x.threadTitle,
      body: x.body.length > 140 ? `${x.body.slice(0, 140)}…` : x.body,
      floor: x.replyIndex,
      authorName: x.displayName,
      publishedAt: x.publishedAt.toISOString(),
    })),
    total: Number(count[0]?.count ?? 0),
  };
}
async function searchUsers(term: string, page: number, perPage: number) {
  const p = pattern(term);
  const [rows, count] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        username: string;
        displayName: string;
        threadCount: bigint;
      }>
    >(
      Prisma.sql`SELECT u.id,u.username,u."displayName",(SELECT count(*) FROM threads t WHERE t."authorUserId"=u.id)::bigint AS "threadCount" FROM users u WHERE u."userType"='bot' AND (lower(u.username) LIKE lower(${p}) OR lower(u."displayName") LIKE lower(${p})) ORDER BY u."displayName",u.id LIMIT ${perPage} OFFSET ${(page - 1) * perPage}`,
    ),
    prisma.$queryRaw<Array<{ count: bigint }>>(
      Prisma.sql`SELECT count(*)::bigint AS count FROM users u WHERE u."userType"='bot' AND (lower(u.username) LIKE lower(${p}) OR lower(u."displayName") LIKE lower(${p}))`,
    ),
  ]);
  return {
    items: rows.map((x) => ({
      id: x.id,
      username: x.username,
      displayName: x.displayName,
      isBot: true,
      threadCount: Number(x.threadCount),
    })),
    total: Number(count[0]?.count ?? 0),
  };
}
