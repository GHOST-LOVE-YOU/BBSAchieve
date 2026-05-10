import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, ChevronLeft, MessageSquare } from "lucide-react";

import { AppShell } from "@/src/components/forum/AppShell";
import { HeroBand } from "@/src/components/forum/HeroBand";
import { Pagination } from "@/src/components/forum/Pagination";
import { SubscribeButton } from "@/src/components/forum/SubscribeButton";
import { UserAvatar } from "@/src/components/forum/UserAvatar";
import { Badge } from "@/src/components/ui/badge";
import { Card } from "@/src/components/ui/card";
import { prisma } from "@/src/server/db/client";
import { getWebSessionIdentity } from "@/src/server/auth/webSession";
import {
  getUserProfile,
  listUserReplies,
  listUserThreads,
} from "@/src/server/forum/userProfileService";
import { relativeTime } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

const PER_PAGE = 8;

type SearchParams = {
  tab?: string | string[];
  page?: string | string[];
};

function pickTab(value: string | string[] | undefined): "posts" | "replies" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "replies" ? "replies" : "posts";
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw == null ? 1 : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export default async function UserProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { userId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const tab = pickTab(resolvedSearchParams.tab);
  const page = parsePage(resolvedSearchParams.page);

  const profile = await getUserProfile(userId);
  if (!profile) {
    notFound();
  }

  const [threads, replies, viewerSubscriptions] = await Promise.all([
    tab === "posts"
      ? listUserThreads({ userId: profile.id, page, perPage: PER_PAGE })
      : listUserThreads({ userId: profile.id, page: 1, perPage: PER_PAGE }),
    tab === "replies"
      ? listUserReplies({ userId: profile.id, page, perPage: PER_PAGE })
      : listUserReplies({ userId: profile.id, page: 1, perPage: PER_PAGE }),
    resolveViewerSubscriptions(profile.id),
  ]);

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (tab !== "posts") params.set("tab", tab);
    if (nextPage !== 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/users/${userId}?${qs}` : `/users/${userId}`;
  };

  const tabHref = (target: "posts" | "replies") => {
    const params = new URLSearchParams();
    if (target !== "posts") params.set("tab", target);
    return params.toString() ? `/users/${userId}?${params.toString()}` : `/users/${userId}`;
  };

  return (
    <AppShell>
      <Link
        href="/"
        className="mb-3 inline-flex items-center gap-1 text-sm text-[color:var(--ink-secondary)] hover:text-[color:var(--ink)]"
      >
        <ChevronLeft aria-hidden className="h-4 w-4" />
        返回
      </Link>

      <HeroBand
        eyebrow={profile.userType === "bot" ? "机器人主页" : "用户主页"}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <UserAvatar
              name={profile.displayName}
              seed={profile.id}
              isBot={profile.userType === "bot"}
              src={profile.avatarUrl}
              size={64}
            />
            {profile.displayName}
            <span className="text-base font-normal text-[color:var(--ink-tertiary)]">
              @{profile.username}
            </span>
          </span>
        }
        subtitle={
          profile.userType === "bot"
            ? profile.bot?.personaSummary ??
              "镜像机器人。它周期性从北邮人论坛抓取新内容，并以机器人身份发帖、回帖。订阅它的具体帖子或回复以接收通知。"
            : profile.bio ?? "真实用户。"
        }
        stat={{
          label: profile.userType === "bot" ? "已发帖 / 回帖" : "发帖 / 回帖",
          value: `${profile.threadCount} · ${profile.replyCount}`,
        }}
        tone="sky"
      >
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.userType === "bot" ? (
            <>
              <Badge tone="blue">
                <Bot className="h-3 w-3" /> 镜像机器人
              </Badge>
              {profile.bot?.sourceLabel ? (
                <Badge tone="turquoise">来源：{profile.bot.sourceLabel}</Badge>
              ) : null}
              {profile.bot?.canPost ? (
                <Badge tone="green">允许发帖</Badge>
              ) : (
                <Badge tone="outline">仅展示</Badge>
              )}
            </>
          ) : (
            <Badge tone="outline">真实用户</Badge>
          )}
        </div>
      </HeroBand>

      {profile.userType === "bot" ? (
        <Card className="mb-4 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--tag-blue-bg)] text-base">
              🔖
            </div>
            <div className="flex-1">
              <strong className="text-[color:var(--ink)]">订阅它的发帖或回复</strong>
              <div className="mt-1 text-sm text-[color:var(--ink-tertiary)]">
                站点不再支持「绑定机器人整体」——避免多人共用同一 ID 时的通知冲突。请在下面的列表里按需订阅单条帖子或单层回复。
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--canvas-soft)] p-1"
          role="tablist"
        >
          <Link
            href={tabHref("posts")}
            role="tab"
            aria-selected={tab === "posts"}
            className={
              tab === "posts"
                ? "rounded-lg bg-[color:var(--surface)] px-4 py-1.5 text-sm font-medium text-[color:var(--ink)] shadow-[var(--shadow-2)]"
                : "rounded-lg px-4 py-1.5 text-sm font-medium text-[color:var(--ink-tertiary)] hover:text-[color:var(--ink)]"
            }
          >
            📝 最近发帖 · {threads.totalCount}
          </Link>
          <Link
            href={tabHref("replies")}
            role="tab"
            aria-selected={tab === "replies"}
            className={
              tab === "replies"
                ? "rounded-lg bg-[color:var(--surface)] px-4 py-1.5 text-sm font-medium text-[color:var(--ink)] shadow-[var(--shadow-2)]"
                : "rounded-lg px-4 py-1.5 text-sm font-medium text-[color:var(--ink-tertiary)] hover:text-[color:var(--ink)]"
            }
          >
            💬 最近回复 · {replies.totalCount}
          </Link>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-[color:var(--ink-tertiary)]">最新优先</span>
      </div>

      <Card className="mb-4">
        {tab === "posts" ? (
          threads.items.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-[color:var(--ink-tertiary)]">
              该用户尚未发帖。
            </div>
          ) : (
            threads.items.map((thread) => (
              <div
                key={thread.id}
                className="flex flex-wrap items-start gap-3.5 border-b border-[color:var(--hairline-soft)] px-5 py-3.5 last:border-b-0"
              >
                <Badge tone="mauve">发帖</Badge>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/threads/${thread.id.replace(/^thread:/, "")}`}
                    className="block font-medium text-[color:var(--ink)] hover:underline"
                  >
                    {thread.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--ink-tertiary)]">
                    <span>{thread.boardName}</span>
                    <span aria-hidden>·</span>
                    <span>{relativeTime(thread.publishedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{thread.replyCount} 回复</span>
                  </div>
                </div>
                <SubscribeButton
                  variant="thread"
                  threadId={thread.id}
                  initialSubscriptionId={
                    viewerSubscriptions.threadIds.get(thread.id) ?? null
                  }
                  size="sm"
                />
              </div>
            ))
          )
        ) : replies.items.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[color:var(--ink-tertiary)]">
            该用户尚未回复。
          </div>
        ) : (
          replies.items.map((reply) => (
            <div
              key={reply.id}
              className="flex flex-wrap items-start gap-3.5 border-b border-[color:var(--hairline-soft)] px-5 py-3.5 last:border-b-0"
            >
              <Badge tone="blue">回复</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[color:var(--ink)] line-clamp-2">
                  “{reply.excerpt}”
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--ink-tertiary)]">
                  <span>#{reply.floor} 楼</span>
                  <span aria-hidden>·</span>
                  <Link
                    href={`/threads/${reply.threadId.replace(/^thread:/, "")}`}
                    className="text-[color:var(--ink)] hover:underline"
                  >
                    《{reply.threadSourceTrimmedTitle}》
                  </Link>
                  <span aria-hidden>·</span>
                  <span>{relativeTime(reply.publishedAt)}</span>
                </div>
              </div>
              <SubscribeButton
                variant="reply"
                threadId={reply.threadId}
                replyId={reply.id}
                initialSubscriptionId={
                  viewerSubscriptions.replyIds.get(reply.id) ?? null
                }
                size="sm"
              />
            </div>
          ))
        )}
      </Card>

      {tab === "posts" ? (
        <Pagination
          page={threads.page}
          totalPages={threads.totalPages}
          totalCount={threads.totalCount}
          perPage={threads.perPage}
          buildHref={buildHref}
        />
      ) : (
        <Pagination
          page={replies.page}
          totalPages={replies.totalPages}
          totalCount={replies.totalCount}
          perPage={replies.perPage}
          buildHref={buildHref}
        />
      )}

      <p className="mt-6 text-xs text-[color:var(--ink-tertiary)]">
        <MessageSquare className="mr-1 inline h-3 w-3" aria-hidden />
        订阅本页面里的具体帖子或回复，会让对应的更新进入你的通知中心。
      </p>
    </AppShell>
  );
}

async function resolveViewerSubscriptions(targetUserId: string) {
  const identity = await getWebSessionIdentity().catch(() => null);
  if (!identity) {
    return {
      threadIds: new Map<string, string>(),
      replyIds: new Map<string, string>(),
    };
  }
  const profile = await prisma.humanProfile.findUnique({
    where: {
      authProvider_authSubject: {
        authProvider: identity.provider,
        authSubject: identity.subject,
      },
    },
    select: { userId: true },
  });
  if (!profile) {
    return {
      threadIds: new Map<string, string>(),
      replyIds: new Map<string, string>(),
    };
  }
  const subs = await prisma.contentSubscription.findMany({
    where: {
      humanUserId: profile.userId,
      subscriptionStatus: "active",
      OR: [
        { thread: { is: { authorUserId: targetUserId } } },
        { reply: { is: { authorUserId: targetUserId } } },
      ],
    },
    select: { id: true, targetType: true, threadId: true, replyId: true },
  });
  const threadIds = new Map<string, string>();
  const replyIds = new Map<string, string>();
  for (const sub of subs) {
    if (sub.targetType === "thread" && sub.threadId) {
      threadIds.set(sub.threadId, sub.id);
    } else if (sub.targetType === "reply" && sub.replyId) {
      replyIds.set(sub.replyId, sub.id);
    }
  }
  return { threadIds, replyIds };
}
