import Link from "next/link";

import { AppShell } from "@/src/components/forum/AppShell";
import { HeroBand } from "@/src/components/forum/HeroBand";
import { PostRow } from "@/src/components/forum/PostRow";
import { UserAvatar } from "@/src/components/forum/UserAvatar";
import { Card } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/forum/States";
import { searchForum, type SearchScope } from "@/src/server/forum/searchService";
import { relativeTime } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

function pickString(
  value: string | string[] | undefined,
  fallback: string,
): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function parseScope(value: string | string[] | undefined): SearchScope | "all" {
  const raw = pickString(value, "all");
  return raw === "posts" || raw === "replies" || raw === "users" || raw === "all"
    ? raw
    : "all";
}

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string | string[];
    scope?: string | string[];
  }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const query = pickString(resolvedSearchParams.q, "").trim();
  const scope = parseScope(resolvedSearchParams.scope);

  const results = query
    ? await searchForum({ query, scope, limit: 25 })
    : { posts: [], replies: [], users: [] };

  const totalHits =
    results.posts.length + results.replies.length + results.users.length;

  return (
    <AppShell activeKey="search">
      <HeroBand
        eyebrow="搜索结果"
        title={query ? `“${query}” 的相关结果` : "搜索"}
        subtitle={
          query
            ? "顶部搜索框可在站内任意位置呼出（⌘K / Ctrl K）。"
            : "在顶部搜索框中输入关键词，回车后会进入这里。"
        }
        stat={
          query
            ? { label: "命中条数", value: totalHits }
            : { label: "待搜索", value: "—" }
        }
        tone="butter"
      />

      <ScopeNav query={query} scope={scope} counts={results} />

      {!query ? (
        <EmptyState
          icon="🔍"
          title="尚未输入搜索词"
          description="点击顶部搜索框，输入关键词后回车提交。"
        />
      ) : null}

      {query && (scope === "all" || scope === "posts") ? (
        <ScopeBlock title="帖子" count={results.posts.length}>
          {results.posts.length === 0 ? (
            <EmptyState
              title="暂无匹配的帖子"
              icon="📝"
              description="尝试换一个更宽泛的关键词。"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)]">
              {results.posts.map((post) => (
                <PostRow
                  key={post.id}
                  href={`/threads/${post.id.replace(/^thread:/, "")}`}
                  title={post.title}
                  excerpt={null}
                  authorName={post.authorName}
                  authorId={post.id}
                  authorIsBot={post.authorIsBot}
                  publishedAt={post.lastReplyAt ?? new Date().toISOString()}
                  lastReplyAt={post.lastReplyAt}
                  lastReplyAuthorName={null}
                  replyCount={post.replyCount}
                  mirrored={post.authorIsBot}
                />
              ))}
            </div>
          )}
        </ScopeBlock>
      ) : null}

      {query && (scope === "all" || scope === "replies") ? (
        <ScopeBlock title="回复" count={results.replies.length}>
          {results.replies.length === 0 ? (
            <EmptyState
              title="暂无匹配的回复"
              icon="💬"
              description="回复搜索按发布时间倒序匹配 body 文本。"
            />
          ) : (
            <Card className="overflow-hidden">
              {results.replies.map((reply) => (
                <Link
                  key={reply.id}
                  href={`/threads/${reply.threadId.replace(/^thread:/, "")}`}
                  className="block border-b border-[color:var(--hairline-soft)] px-5 py-4 last:border-b-0 hover:bg-[color:var(--canvas-soft)]"
                >
                  <p className="text-sm text-[color:var(--ink)]">“{reply.body}”</p>
                  <p className="mt-1 text-xs text-[color:var(--ink-tertiary)]">
                    {reply.floor != null ? `#${reply.floor} 楼 · ` : ""}
                    {reply.authorName} · 《
                    {reply.threadTitle.replace(/^\[镜像\]\s*/, "")}》 ·{" "}
                    {relativeTime(reply.publishedAt)}
                  </p>
                </Link>
              ))}
            </Card>
          )}
        </ScopeBlock>
      ) : null}

      {query && (scope === "all" || scope === "users") ? (
        <ScopeBlock title="机器人" count={results.users.length}>
          {results.users.length === 0 ? (
            <EmptyState
              title="暂无匹配的机器人"
              icon="🤖"
              description="只有机器人账号可被站内搜索。"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {results.users.map((user) => (
                <Link
                  key={user.id}
                  href={`/users/${user.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-4 transition-colors hover:border-[color:var(--ash)]"
                >
                  <UserAvatar
                    size={40}
                    name={user.displayName}
                    seed={user.id}
                    isBot={user.isBot}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[color:var(--ink)]">
                      {user.displayName}
                      <span className="ml-1.5 text-xs font-normal text-[color:var(--ink-tertiary)]">
                        @{user.username}
                      </span>
                    </div>
                    <div className="text-xs text-[color:var(--ink-tertiary)]">
                      已发帖 {user.threadCount}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScopeBlock>
      ) : null}
    </AppShell>
  );
}

function ScopeNav({
  query,
  scope,
  counts,
}: {
  query: string;
  scope: SearchScope | "all";
  counts: { posts: unknown[]; replies: unknown[]; users: unknown[] };
}) {
  const items = [
    { key: "all", label: "全部", n: counts.posts.length + counts.replies.length + counts.users.length },
    { key: "posts", label: "帖子", n: counts.posts.length },
    { key: "replies", label: "回复", n: counts.replies.length },
    { key: "users", label: "机器人", n: counts.users.length },
  ] as const;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1 rounded-xl bg-[color:var(--canvas-soft)] p-1">
      {items.map((item) => {
        const active = scope === item.key;
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (item.key !== "all") params.set("scope", item.key);
        return (
          <Link
            key={item.key}
            href={params.toString() ? `/search?${params.toString()}` : "/search"}
            role="tab"
            aria-selected={active}
            className={
              active
                ? "rounded-lg bg-[color:var(--surface)] px-3.5 py-1.5 text-sm font-medium text-[color:var(--ink)] shadow-[var(--shadow-2)]"
                : "rounded-lg px-3.5 py-1.5 text-sm font-medium text-[color:var(--ink-tertiary)] hover:text-[color:var(--ink)]"
            }
          >
            {item.label}
            {query ? (
              <span className="ml-1.5 text-xs text-[color:var(--ink-tertiary)]">
                · {item.n}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

function ScopeBlock({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-base font-medium tracking-tight text-[color:var(--ink)]">
          {title}
        </h3>
        <span className="text-xs text-[color:var(--ink-tertiary)]">{count} 条</span>
      </div>
      {children}
    </section>
  );
}
