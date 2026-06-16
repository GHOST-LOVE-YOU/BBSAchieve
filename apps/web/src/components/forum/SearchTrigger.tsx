"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Bot, BookOpen, MessageSquare, Search, X } from "lucide-react";

import { UserAvatar } from "@/src/components/forum/UserAvatar";
import { cn, relativeTime } from "@/src/lib/utils";

type SearchScope = "posts" | "replies" | "users";

type SearchPostHit = {
  id: string;
  title: string;
  authorName: string;
  replyCount: number;
  lastReplyAt: string | null;
};

type SearchReplyHit = {
  id: string;
  threadId: string;
  threadTitle: string;
  body: string;
  floor: number | null;
  authorName: string;
  publishedAt: string;
};

type SearchUserHit = {
  id: string;
  username: string;
  displayName: string;
  isBot: boolean;
  threadCount: number;
};

type SearchResults = {
  posts: SearchPostHit[];
  replies: SearchReplyHit[];
  users: SearchUserHit[];
};

const EMPTY_RESULTS: SearchResults = { posts: [], replies: [], users: [] };

export function SearchTrigger({
  className,
  highlight = false,
}: {
  className?: string;
  highlight?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [scope, setScope] = React.useState<SearchScope>("posts");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // Cmd/Ctrl-K opens the modal anywhere on the page.
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search whenever the query or scope changes.
  React.useEffect(() => {
    if (!open) return;
    const term = query.trim();
    if (term.length === 0) {
      return;
    }
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: term, scope, limit: "8" });
        const response = await fetch(`/api/public/search?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          setResults(EMPTY_RESULTS);
        } else {
          const payload = (await response.json()) as Partial<SearchResults>;
          setResults({
            posts: payload.posts ?? [],
            replies: payload.replies ?? [],
            users: payload.users ?? [],
          });
        }
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== "AbortError") {
          setResults(EMPTY_RESULTS);
        }
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [open, query, scope]);

  function updateQuery(value: string) {
    setQuery(value);
    if (value.trim().length === 0) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
    } else {
      setLoading(true);
    }
  }

  function updateScope(nextScope: SearchScope) {
    setScope(nextScope);
    if (query.trim().length > 0) {
      setLoading(true);
    }
  }

  function submitSearch() {
    const term = query.trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}&scope=${scope}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl border border-[color:var(--hairline)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--mute)] transition-colors hover:border-[color:var(--ash)]",
            highlight && "ring-2 ring-[color:var(--ring)]",
            className,
          )}
        >
          <Search aria-hidden className="h-4 w-4 text-[color:var(--ink-tertiary)]" />
          <span className="flex-1 text-left truncate">搜索帖子 / 回复 / 用户</span>
          <span className="rounded-md border border-[color:var(--hairline)] px-1.5 py-px text-[10.5px] font-mono text-[color:var(--ink-tertiary)]">
            ⌘K
          </span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-[12vh] z-[101] w-[min(640px,92vw)] -translate-x-1/2 rounded-[14px] bg-[color:var(--surface)] shadow-[var(--shadow-1)]",
            "border border-[color:var(--hairline)] overflow-hidden",
          )}
        >
          <Dialog.Title className="sr-only">站内搜索</Dialog.Title>
          <Dialog.Description className="sr-only">
            搜索帖子、回复或机器人
          </Dialog.Description>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--hairline-soft)]">
            <Search aria-hidden className="h-4 w-4 text-[color:var(--ink-tertiary)]" />
            <input
              autoFocus
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              placeholder="搜索帖子 / 回复 / 用户"
              className="flex-1 bg-transparent text-base text-[color:var(--ink)] outline-none placeholder:text-[color:var(--mute)]"
            />
            <Dialog.Close
              className="rounded-md px-2 py-1 text-xs text-[color:var(--ink-tertiary)] hover:bg-[color:var(--canvas-soft)]"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="flex gap-0 border-b border-[color:var(--hairline-soft)] px-2">
            <ScopeTab
              active={scope === "posts"}
              onClick={() => updateScope("posts")}
              label="帖子"
            />
            <ScopeTab
              active={scope === "replies"}
              onClick={() => updateScope("replies")}
              label="回复"
            />
            <ScopeTab
              active={scope === "users"}
              onClick={() => updateScope("users")}
              label="机器人"
              hint="仅机器人可被搜索"
            />
          </div>
          <div className="max-h-[380px] overflow-y-auto py-2">
            {query.trim().length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[color:var(--ink-tertiary)]">
                输入关键词以搜索 · 回车提交进入完整搜索结果
              </div>
            ) : loading ? (
              <div className="px-4 py-6 text-center text-sm text-[color:var(--ink-tertiary)]">
                正在搜索…
              </div>
            ) : (
              <SearchResultsList
                scope={scope}
                results={results}
                onPick={() => setOpen(false)}
                onSubmit={submitSearch}
                query={query}
              />
            )}
          </div>
          <div className="flex gap-3 border-t border-[color:var(--hairline-soft)] px-4 py-2 text-xs text-[color:var(--ink-tertiary)]">
            <span>↵ 提交搜索</span>
            <span>↑↓ 导航</span>
            <span>Esc 关闭</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ScopeTab({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3.5 py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors",
        active
          ? "border-[color:var(--primary)] text-[color:var(--ink)]"
          : "border-transparent text-[color:var(--ink-tertiary)] hover:text-[color:var(--ink)]",
      )}
    >
      {label}
      {hint ? <span className="ml-1.5 text-xs text-[color:var(--ink-tertiary)]">· {hint}</span> : null}
    </button>
  );
}

function SearchResultsList({
  scope,
  results,
  onPick,
  onSubmit,
  query,
}: {
  scope: SearchScope;
  results: SearchResults;
  onPick: () => void;
  onSubmit: () => void;
  query: string;
}) {
  if (scope === "posts") {
    if (results.posts.length === 0) {
      return <EmptyHint label="暂无匹配的帖子" />;
    }
    return (
      <ul className="divide-y divide-[color:var(--hairline-soft)]">
        {results.posts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/threads/${encodePathSegment(post.id)}`}
              onClick={onPick}
              className="flex items-start gap-3 px-4 py-2.5 hover:bg-[color:var(--canvas-soft)]"
            >
              <BookOpen aria-hidden className="mt-0.5 h-4 w-4 text-[color:var(--ink-tertiary)]" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[color:var(--ink)] truncate">
                  {post.title}
                </div>
                <div className="text-xs text-[color:var(--ink-tertiary)]">
                  {post.authorName} · {post.replyCount} 回复 ·{" "}
                  {post.lastReplyAt ? relativeTime(post.lastReplyAt) : "暂无回复"}
                </div>
              </div>
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onSubmit}
            className="w-full px-4 py-3 text-left text-sm font-medium text-[color:var(--primary)] hover:bg-[color:var(--canvas-soft)]"
          >
            查看全部 “{query}” 的搜索结果 →
          </button>
        </li>
      </ul>
    );
  }
  if (scope === "replies") {
    if (results.replies.length === 0) {
      return <EmptyHint label="暂无匹配的回复" />;
    }
    return (
      <ul className="divide-y divide-[color:var(--hairline-soft)]">
        {results.replies.map((reply) => (
          <li key={reply.id}>
            <Link
              href={`/threads/${encodePathSegment(reply.threadId)}`}
              onClick={onPick}
              className="flex items-start gap-3 px-4 py-2.5 hover:bg-[color:var(--canvas-soft)]"
            >
              <MessageSquare
                aria-hidden
                className="mt-0.5 h-4 w-4 text-[color:var(--ink-tertiary)]"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[color:var(--ink)] line-clamp-1">
                  “{reply.body}”
                </div>
                <div className="text-xs text-[color:var(--ink-tertiary)]">
                  {reply.floor != null ? `#${reply.floor} 楼 · ` : ""}
                  {reply.authorName} · 《
                  {reply.threadTitle.replace(/^\[镜像\]\s*/, "")}》
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  if (results.users.length === 0) {
    return <EmptyHint label="暂无匹配的机器人" />;
  }
  return (
    <ul className="divide-y divide-[color:var(--hairline-soft)]">
      <li className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-[0.06em] text-[color:var(--ink-tertiary)]">
        站内仅机器人可被搜索 · 点击进入主页订阅其发帖与回复
      </li>
      {results.users.map((user) => (
        <li key={user.id}>
          <Link
            href={`/users/${encodePathSegment(user.id)}`}
            onClick={onPick}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--canvas-soft)]"
          >
            <UserAvatar
              size={28}
              name={user.displayName}
              seed={user.id}
              isBot={user.isBot}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[color:var(--ink)] truncate">
                {user.displayName}
                <span className="ml-1.5 text-xs font-normal text-[color:var(--ink-tertiary)]">
                  @{user.username}
                </span>
              </div>
              <div className="text-xs text-[color:var(--ink-tertiary)]">
                {user.isBot ? "镜像机器人" : "真实用户"} · 已发帖 {user.threadCount}
              </div>
            </div>
            <Bot aria-hidden className="h-3.5 w-3.5 text-[color:var(--ink-tertiary)]" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="px-4 py-6 text-center text-sm text-[color:var(--ink-tertiary)]">
      {label}
    </div>
  );
}

/** Strips leading `thread:` / `reply:` prefixes from internal ids before
 *  encoding them into URL path segments. */
function encodePathSegment(value: string): string {
  return encodeURIComponent(value.replace(/^thread:/, "").replace(/^reply:/, ""));
}
