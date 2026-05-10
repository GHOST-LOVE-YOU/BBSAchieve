import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { AppShell } from "@/src/components/forum/AppShell";
import { HeroBand } from "@/src/components/forum/HeroBand";
import {
  findCatalogSection,
  type BoardCatalogSectionEntry,
} from "@/src/server/boardSync/boardCatalog";
import { prisma } from "@/src/server/db/client";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
}: {
  params: Promise<{ sectionSlug: string }>;
}) {
  const { sectionSlug } = await params;
  const section = findCatalogSection(sectionSlug);
  if (!section) {
    notFound();
  }

  // Show how many threads exist per board (across the whole section).
  const slugs = section.boards.map((board) => board.boardSlug);
  const counts = await prisma.board.findMany({
    where: { slug: { in: slugs } },
    select: {
      slug: true,
      _count: { select: { threads: true } },
    },
  });
  const countBySlug = new Map(counts.map((row) => [row.slug, row._count.threads]));

  return (
    <AppShell activeKey={{ kind: "section", slug: section.sectionSlug }}>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-[color:var(--ink-secondary)] hover:text-[color:var(--ink)]"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        返回首页
      </Link>
      <HeroBand
        eyebrow="分区"
        title={section.sectionName}
        subtitle={`本分区包含 ${section.boards.length} 个版面，下方是按目录顺序展开的列表。`}
        stat={{ label: "本分区版面", value: section.boards.length }}
        tone="mauve"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {section.boards.map((board) => (
          <BoardCard
            key={board.boardSlug}
            board={board}
            threadCount={countBySlug.get(board.boardSlug) ?? 0}
          />
        ))}
      </div>
    </AppShell>
  );
}

function BoardCard({
  board,
  threadCount,
}: {
  board: BoardCatalogSectionEntry;
  threadCount: number;
}) {
  return (
    <Link
      href={`/boards/${board.boardSlug}`}
      className="flex flex-col gap-2 rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-5 transition-colors hover:border-[color:var(--ash)]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-base font-medium text-[color:var(--ink)]">
          {board.title}
        </span>
        <span className="text-xs tabular-nums text-[color:var(--ink-tertiary)]">
          {threadCount} 帖
        </span>
      </div>
      <div className="text-xs text-[color:var(--ink-tertiary)]">
        {board.boardName}
      </div>
      {board.scheduledSyncEnabled ? (
        <div className="text-xs text-[color:var(--success)]">
          已开启定时同步 · 每 {board.scheduledIntervalMinutes} 分钟
        </div>
      ) : null}
    </Link>
  );
}
