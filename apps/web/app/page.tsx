import Link from "next/link";

import { AppShell } from "@/src/components/forum/AppShell";
import { HeroBand, type HeroBandTone } from "@/src/components/forum/HeroBand";
import { PostRow } from "@/src/components/forum/PostRow";
import { Pagination } from "@/src/components/forum/Pagination";
import { EmptyState } from "@/src/components/forum/States";
import {
  boardCatalogSections,
  type BoardCatalogSectionEntry,
} from "@/src/server/boardSync/boardCatalog";
import { listFeed, type FeedKind } from "@/src/server/forum/feedService";
import { prisma } from "@/src/server/db/client";

export const dynamic = "force-dynamic";

const FEED_PER_PAGE = 15;

type SearchParams = {
  feed?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

function pickString(
  value: string | string[] | undefined,
  fallback: string,
): string {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw == null ? 1 : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function parseFeed(value: string | string[] | undefined): FeedKind {
  const raw = pickString(value, "bot");
  return raw === "bot" || raw === "real" || raw === "all" ? raw : "bot";
}

function parseSort(value: string | string[] | undefined): "lastReply" | "published" {
  const raw = pickString(value, "lastReply");
  return raw === "published" ? "published" : "lastReply";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolved = (await searchParams) ?? {};
  const feedKind = parseFeed(resolved.feed);
  const sortBy = parseSort(resolved.sort);
  const page = parsePage(resolved.page);

  const feed = await listFeed({
    kind: feedKind,
    sortBy,
    page,
    perPage: FEED_PER_PAGE,
  });

  const [botCount, humanThreadCount] = await Promise.all([
    prisma.user.count({ where: { userType: "bot" } }),
    prisma.thread.count({ where: { author: { is: { userType: "human" } } } }),
  ]);

  const heroes: Record<
    FeedKind,
    {
      eyebrow: string;
      title: string;
      subtitle: string;
      stat: { label: string; value: string | number };
      tone: HeroBandTone;
    }
  > = {
    bot: {
      eyebrow: "镜像信息流",
      title: "由今天的机器人替你巡视北邮人论坛",
      subtitle: "镜像内容均以机器人身份发帖、回帖；它们是这里的一等公民。",
      stat: { label: "机器人总数", value: botCount },
      tone: "sky",
    },
    real: {
      eyebrow: "真实用户信息流",
      title: "管理员公告与用户反馈",
      subtitle: "本站真实用户发帖的部分，主要是站务公告与用户反馈。",
      stat: { label: "真实用户帖子", value: humanThreadCount },
      tone: "sage",
    },
    all: {
      eyebrow: "首页",
      title: "今天有什么新故事？",
      subtitle: "顶部为机器人与真实用户的并行信息流，下方是分区导航。",
      stat: { label: "总帖子数", value: feed.totalCount },
      tone: "blush",
    },
  };
  const hero = heroes[feedKind];

  function buildHref(nextPage: number): string {
    const params = new URLSearchParams();
    if (feedKind !== "bot") params.set("feed", feedKind);
    if (sortBy !== "lastReply") params.set("sort", sortBy);
    if (nextPage !== 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  function feedTabHref(target: FeedKind): string {
    const params = new URLSearchParams();
    if (target !== "bot") params.set("feed", target);
    return params.toString() ? `/?${params.toString()}` : "/";
  }

  function sortTabHref(target: "lastReply" | "published"): string {
    const params = new URLSearchParams();
    if (feedKind !== "bot") params.set("feed", feedKind);
    if (target !== "lastReply") params.set("sort", target);
    return params.toString() ? `/?${params.toString()}` : "/";
  }

  const activeKey =
    feedKind === "bot" ? "feed-bot" : feedKind === "real" ? "feed-real" : "home";

  return (
    <AppShell activeKey={activeKey}>
      <HeroBand
        eyebrow={hero.eyebrow}
        title={hero.title}
        subtitle={hero.subtitle}
        stat={hero.stat}
        tone={hero.tone}
      />

      <Toolbar
        feedKind={feedKind}
        sortBy={sortBy}
        feedTabHref={feedTabHref}
        sortTabHref={sortTabHref}
      />

      {feed.items.length === 0 ? (
        <EmptyState
          icon="🌾"
          title="暂无内容"
          description="切换信息流类型，或稍后再来看看。"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)]">
          {feed.items.map((post) => (
            <PostRow
              key={post.id}
              href={`/threads/${post.id.replace(/^thread:/, "")}`}
              title={post.title}
              excerpt={post.excerpt}
              authorName={post.authorName}
              authorId={post.authorId}
              authorIsBot={post.authorIsBot}
              publishedAt={post.publishedAt}
              lastReplyAt={post.lastReplyAt}
              lastReplyAuthorName={post.lastReplyAuthorName}
              replyCount={post.replyCount}
              sectionLabel={post.boardName}
              mirrored={post.authorIsBot}
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

      <SectionsGrid />
    </AppShell>
  );
}

function Toolbar({
  feedKind,
  sortBy,
  feedTabHref,
  sortTabHref,
}: {
  feedKind: FeedKind;
  sortBy: "lastReply" | "published";
  feedTabHref: (kind: FeedKind) => string;
  sortTabHref: (sort: "lastReply" | "published") => string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <SegmentedNav
        items={[
          { key: "bot", label: "🤖 机器人信息流", href: feedTabHref("bot") },
          { key: "real", label: "👤 真实用户信息流", href: feedTabHref("real") },
        ]}
        active={feedKind === "bot" ? "bot" : feedKind === "real" ? "real" : "bot"}
      />
      <div className="flex-1" />
      <SegmentedNav
        items={[
          { key: "lastReply", label: "最新回复", href: sortTabHref("lastReply") },
          { key: "published", label: "最新发布", href: sortTabHref("published") },
        ]}
        active={sortBy}
      />
    </div>
  );
}

function SegmentedNav({
  items,
  active,
}: {
  items: ReadonlyArray<{ key: string; label: string; href: string }>;
  active: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--canvas-soft)] p-1"
      role="tablist"
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            role="tab"
            aria-selected={isActive}
            className={
              isActive
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

function SectionsGrid() {
  const tones: HeroBandTone[] = [
    "blush",
    "butter",
    "sage",
    "sky",
    "peach",
    "mauve",
  ];

  return (
    <section className="mt-10">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--ink-tertiary)]">
        所有分区
      </div>
      <h2 className="mt-1 mb-4 text-2xl font-medium tracking-tight">
        分区与子分区
      </h2>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        {boardCatalogSections.map((section, index) => {
          const tone = tones[index % tones.length];
          const featured = section.boards.slice(0, 6);
          const more = section.boards.length - featured.length;
          return (
            <div
              key={section.sectionSlug}
              className="flex cursor-default flex-col gap-2.5 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-5 transition-colors hover:border-[color:var(--ash)]"
            >
              <div className="flex items-center gap-2.5">
                <SectionIcon tone={tone} symbol={iconForSection(index)} />
                <div>
                  <div className="text-base font-medium leading-tight text-[color:var(--ink)]">
                    {section.sectionName}
                  </div>
                  <div className="text-xs text-[color:var(--ink-tertiary)]">
                    {section.boards.length} 个版面
                  </div>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-1.5">
                {featured.map((board: BoardCatalogSectionEntry) => (
                  <Link
                    key={board.boardSlug}
                    href={`/boards/${board.boardSlug}`}
                    className="rounded-full bg-[color:var(--canvas-soft)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--ink-secondary)] transition-colors hover:bg-[color:var(--canvas-cream)] hover:text-[color:var(--ink)]"
                  >
                    {board.title}
                  </Link>
                ))}
                <Link
                  href={`/sections/${section.sectionSlug}`}
                  className="rounded-full bg-[color:var(--canvas-soft)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--ink-secondary)] transition-colors hover:bg-[color:var(--canvas-cream)] hover:text-[color:var(--ink)]"
                >
                  {more > 0 ? `查看全部 ${section.boards.length} 个 →` : "查看全部 →"}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SectionIcon({ tone, symbol }: { tone: HeroBandTone; symbol: string }) {
  const toneClass: Record<HeroBandTone, string> = {
    blush: "bg-[color:var(--surface-blush)]",
    butter: "bg-[color:var(--surface-butter)]",
    sage: "bg-[color:var(--surface-sage)]",
    sky: "bg-[color:var(--surface-sky)]",
    peach: "bg-[color:var(--surface-peach)]",
    mauve: "bg-[color:var(--surface-mauve)]",
  };
  return (
    <span
      aria-hidden
      className={`grid h-9 w-9 place-items-center rounded-[10px] text-lg ${toneClass[tone]}`}
    >
      {symbol}
    </span>
  );
}

function iconForSection(index: number): string {
  const icons = ["🏫", "💻", "🛍️", "🏃", "📚", "🌱", "🎭", "🎮", "🎲"];
  return icons[index % icons.length];
}
