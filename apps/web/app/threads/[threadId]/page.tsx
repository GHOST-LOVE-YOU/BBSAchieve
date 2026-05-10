import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Eye, MessageSquare } from "lucide-react";

import { AppShell } from "@/src/components/forum/AppShell";
import { Pagination } from "@/src/components/forum/Pagination";
import { SubscribeButton } from "@/src/components/forum/SubscribeButton";
import { UserAvatar } from "@/src/components/forum/UserAvatar";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { requireWebPageUser } from "@/src/server/auth/pageGuards";
import { prisma } from "@/src/server/db/client";
import {
  getThreadDetail,
  getThreadReplies,
} from "@/src/server/forum/threadDetailService";
import { relativeTime } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

const REPLIES_PER_PAGE = 20;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw == null ? 1 : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ threadId: string }>;
  searchParams?: Promise<{ page?: string | string[] }>;
}) {
  const { threadId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePage(resolvedSearchParams.page);

  const identity = await requireWebPageUser(`/threads/${threadId}`);
  const profile = await prisma.humanProfile.findUnique({
    where: {
      authProvider_authSubject: {
        authProvider: identity.provider,
        authSubject: identity.subject,
      },
    },
    select: { userId: true },
  });
  const viewerHumanUserId = profile?.userId ?? null;

  const detail = await getThreadDetail({ threadId, viewerHumanUserId });
  if (!detail) {
    notFound();
  }

  const repliesResult = await getThreadReplies({
    threadId,
    viewerHumanUserId,
    page,
    perPage: REPLIES_PER_PAGE,
  });
  if (!repliesResult) {
    notFound();
  }

  const buildHref = (nextPage: number) =>
    nextPage === 1
      ? `/threads/${threadId}`
      : `/threads/${threadId}?page=${nextPage}`;

  return (
    <AppShell activeKey={{ kind: "board", slug: detail.board.slug }}>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-[color:var(--ink-secondary)] hover:text-[color:var(--ink)]"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        返回信息流
      </Link>

      <Card className="mb-4 p-7">
        {detail.thread.mirrored ? (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-[color:var(--surface-sky)] px-4 py-3 text-sm text-[color:var(--ink-secondary)]">
            <span aria-hidden>🪞</span>
            <span>这是一条镜像帖。</span>
            <span className="font-medium text-[color:var(--ink)]">
              来源：北邮人论坛 / {detail.thread.sourceBoardSlug} / #
              {detail.thread.sourceThreadId}
            </span>
            <span className="ml-auto inline-flex items-center gap-2">
              同步于{" "}
              <strong className="text-[color:var(--ink)]">
                {relativeTime(detail.thread.publishedAt)}
              </strong>
            </span>
          </div>
        ) : null}

        {detail.thread.sourceStale ? (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-[color:var(--surface-blush)] px-4 py-2.5 text-sm text-[color:var(--tag-red-ink)]">
            <span aria-hidden>⚠️</span>
            该镜像源已超过 30 天没有更新，可能在源站已被删除。
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Badge tone="mauve">{detail.board.name}</Badge>
          {detail.thread.authorIsBot ? <Badge tone="blue">机器人发帖</Badge> : null}
        </div>
        <h1 className="mt-3 mb-3.5 text-[28px] font-medium tracking-tight leading-tight">
          {detail.thread.title}
        </h1>

        <div className="mb-4 flex items-center gap-3">
          <UserAvatar
            name={detail.thread.authorName}
            seed={detail.thread.authorId}
            isBot={detail.thread.authorIsBot}
            size={48}
          />
          <div>
            <Link
              href={`/users/${detail.thread.authorId}`}
              className="font-medium text-[color:var(--ink)] hover:underline"
            >
              {detail.thread.authorName}
            </Link>
            <div className="text-xs text-[color:var(--ink-tertiary)]">
              {relativeTime(detail.thread.publishedAt)}
              <span className="mx-1.5" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Eye aria-hidden className="h-3.5 w-3.5" />
                镜像同步
              </span>
              <span className="mx-1.5" aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare aria-hidden className="h-3.5 w-3.5" />
                {detail.thread.replyCount} 回复
              </span>
            </div>
          </div>
        </div>

        <article className="text-[color:var(--ink)] text-base leading-7 whitespace-pre-wrap break-words">
          {detail.thread.body}
        </article>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[color:var(--hairline-soft)] pt-4">
          <SubscribeButton
            variant="thread"
            threadId={detail.thread.id}
            initialSubscriptionId={detail.threadSubscriptionId}
            size="sm"
          />
          <span className="ml-auto text-xs text-[color:var(--ink-tertiary)]">
            订阅后，新回复会通过你的通知中心匿名送达。
          </span>
        </div>
      </Card>

      <Card className="mb-5">
        <div className="flex items-center border-b border-[color:var(--hairline-soft)] px-6 py-4">
          <strong className="text-[color:var(--ink)]">
            {repliesResult.totalCount} 条回复
          </strong>
        </div>
        {repliesResult.items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[color:var(--ink-tertiary)]">
            暂无回复 · 你可以订阅本帖等待新回复。
          </div>
        ) : (
          repliesResult.items.map((reply) => (
            <div
              key={reply.id}
              className="grid grid-cols-[44px_1fr] gap-4 border-b border-[color:var(--hairline-soft)] px-7 py-5 last:border-b-0"
            >
              <UserAvatar
                name={reply.authorName}
                seed={reply.authorId}
                isBot={reply.authorIsBot}
                size={44}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/users/${reply.authorId}`}
                    className="font-medium text-[color:var(--ink)] hover:underline"
                  >
                    {reply.authorName}
                  </Link>
                  {reply.authorIsBot ? <Badge tone="blue">机器人</Badge> : null}
                  <span className="text-xs text-[color:var(--ink-tertiary)]">
                    #{reply.floor} · {relativeTime(reply.publishedAt)}
                  </span>
                </div>
                <div className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-7 text-[color:var(--ink)]">
                  {reply.body}
                </div>
                <div className="mt-3">
                  <SubscribeButton
                    variant="reply"
                    threadId={detail.thread.id}
                    replyId={reply.id}
                    initialSubscriptionId={reply.subscriptionId}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </Card>

      <Pagination
        page={repliesResult.page}
        totalPages={repliesResult.totalPages}
        totalCount={repliesResult.totalCount}
        perPage={repliesResult.perPage}
        buildHref={buildHref}
      />
    </AppShell>
  );
}
