import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/src/components/forum/AppShell";
import { HeroBand } from "@/src/components/forum/HeroBand";
import { Pagination } from "@/src/components/forum/Pagination";
import { PostRow } from "@/src/components/forum/PostRow";
import { EmptyState } from "@/src/components/forum/States";
import { listFeed } from "@/src/server/forum/feedService";
import { createPublicReadingService } from "@/src/server/reading/publicReadingService";
import { findCatalogEntryByBoardSlug } from "@/src/server/boardSync/boardCatalog";

export const dynamic = "force-dynamic";

const PER_PAGE = 15;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw == null ? 1 : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function parseSort(value: string | string[] | undefined): "lastReply" | "published" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "published" ? "published" : "lastReply";
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ boardId: string }>;
  searchParams?: Promise<{ page?: string | string[]; sort?: string | string[] }>;
}) {
  const { boardId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePage(resolvedSearchParams.page);
  const sortBy = parseSort(resolvedSearchParams.sort);

  const service = createPublicReadingService();
  const board = await service.getBoard(boardId);
  if (!board) {
    notFound();
  }

  const [feed, catalogEntry] = await Promise.all([
    listFeed({
      kind: "all",
      boardId: board.id,
      sortBy,
      page,
      perPage: PER_PAGE,
    }),
    Promise.resolve(findCatalogEntryByBoardSlug(board.slug)),
  ]);

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (sortBy !== "lastReply") params.set("sort", sortBy);
    if (nextPage !== 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/boards/${boardId}?${qs}` : `/boards/${boardId}`;
  };

  return (
    <AppShell activeKey={{ kind: "board", slug: board.slug }}>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-[color:var(--ink-secondary)] hover:text-[color:var(--ink)]"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        返回首页
      </Link>

      <HeroBand
        eyebrow="版面"
        title={board.name}
        subtitle={
          board.description ||
          (catalogEntry
            ? `${catalogEntry.sectionName} · 当前来自首页固化板块目录。`
            : "本版面镜像北邮人论坛同名板块的最新帖子。")
        }
        stat={{ label: "本版帖子", value: feed.totalCount }}
        tone="peach"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SortSwitcher boardId={boardId} sortBy={sortBy} />
      </div>

      {feed.items.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="本版面暂无帖子"
          description="新数据会随后端定时同步任务进入这里。"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)]">
          {feed.items.map((thread) => (
            <PostRow
              key={thread.id}
              href={`/threads/${thread.id.replace(/^thread:/, "")}`}
              title={thread.title}
              excerpt={thread.excerpt}
              authorName={thread.authorName}
              authorId={thread.authorId}
              authorIsBot={thread.authorIsBot}
              publishedAt={thread.publishedAt}
              lastReplyAt={thread.lastReplyAt}
              lastReplyAuthorName={thread.lastReplyAuthorName}
              replyCount={thread.replyCount}
              sectionLabel={thread.boardName}
              mirrored={thread.authorIsBot}
            />
          ))}
        </div>
      )}

      <Pagination
        page={feed.page}
        totalPages={feed.totalPages}
        totalCount={feed.totalCount}
        perPage={feed.perPage}
        buildHref={buildHref}
      />
    </AppShell>
  );
}

function SortSwitcher({
  boardId,
  sortBy,
}: {
  boardId: string;
  sortBy: "lastReply" | "published";
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--canvas-soft)] p-1"
      role="tablist"
    >
      {(
        [
          { key: "lastReply", label: "最新回复" },
          { key: "published", label: "最新发布" },
        ] as const
      ).map((item) => {
        const active = item.key === sortBy;
        const params = new URLSearchParams();
        if (item.key !== "lastReply") params.set("sort", item.key);
        const href = params.toString()
          ? `/boards/${boardId}?${params.toString()}`
          : `/boards/${boardId}`;
        return (
          <Link
            key={item.key}
            href={href}
            role="tab"
            aria-selected={active}
            className={
              active
                ? "rounded-lg bg-[color:var(--surface)] px-4 py-1.5 text-sm font-medium text-[color:var(--ink)] shadow-[var(--shadow-2)]"
                : "rounded-lg px-4 py-1.5 text-sm font-medium text-[color:var(--ink-tertiary)] hover:text-[color:var(--ink)]"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
