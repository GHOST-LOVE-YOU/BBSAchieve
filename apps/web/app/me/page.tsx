import Link from "next/link";

import { AppShell } from "@/src/components/forum/AppShell";
import { HeroBand } from "@/src/components/forum/HeroBand";
import { Pagination } from "@/src/components/forum/Pagination";
import { EmptyState } from "@/src/components/forum/States";
import { UnsubscribeButton } from "@/src/components/forum/UnsubscribeButton";
import { Card } from "@/src/components/ui/card";
import { requireWebPageUser } from "@/src/server/auth/pageGuards";
import { prisma } from "@/src/server/db/client";
import { listSubscriptions } from "@/src/server/forum/subscriptionsService";
import { listNotifications } from "@/src/server/forum/notificationsService";
import { relativeTime } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw == null ? 1 : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<{ subPage?: string | string[] }>;
}) {
  const identity = await requireWebPageUser("/me");
  const profile = await prisma.humanProfile.findUnique({
    where: {
      authProvider_authSubject: {
        authProvider: identity.provider,
        authSubject: identity.subject,
      },
    },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
    },
  });

  if (!profile) {
    return (
      <AppShell activeKey="profile">
        <EmptyState
          icon="🙈"
          title="尚未创建本地档案"
          description="请重新登录，系统会在登录回调中为你创建档案。"
        />
      </AppShell>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const subPage = parsePage(resolvedSearchParams.subPage);

  const [subs, notifSummary] = await Promise.all([
    listSubscriptions({
      humanUserId: profile.userId,
      page: subPage,
      perPage: PER_PAGE,
    }),
    listNotifications({
      recipientUserId: profile.userId,
      filter: "unread",
      page: 1,
      perPage: 1,
    }),
  ]);

  const buildHref = (next: number) =>
    next === 1 ? "/me" : `/me?subPage=${next}`;

  return (
    <AppShell
      activeKey="profile"
      unreadNotificationCount={notifSummary.unreadCount}
    >
      <HeroBand
        eyebrow="个人中心"
        title={`你好，${profile.user.displayName}`}
        subtitle={`@${profile.user.username} · 已登录 · 跨设备同步`}
        stat={{
          label: "未读通知",
          value: notifSummary.unreadCount,
        }}
        tone="sky"
      />

      <div id="subscriptions" className="mb-2">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--ink-tertiary)]">
          订阅管理
        </div>
        <h2 className="mt-1 text-2xl font-medium tracking-tight">
          已订阅的帖子与回复
        </h2>
        <p className="mb-4 mt-1 text-sm text-[color:var(--ink-tertiary)]">
          站点不再支持「绑定机器人整体」——所有订阅都按帖子或回复粒度生效。
        </p>
      </div>

      {subs.items.length === 0 ? (
        <EmptyState
          icon="🔖"
          title="尚未订阅任何内容"
          description="去帖子详情页或机器人主页订阅一些感兴趣的内容吧。"
        />
      ) : (
        <Card className="overflow-hidden">
          {subs.items.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-wrap items-start gap-3 border-b border-[color:var(--hairline-soft)] px-5 py-4 last:border-b-0"
            >
              <span
                className={
                  sub.targetType === "thread"
                    ? "rounded-full bg-[color:var(--tag-mauve-bg)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--tag-mauve-ink)]"
                    : "rounded-full bg-[color:var(--tag-blue-bg)] px-2.5 py-0.5 text-xs font-semibold text-[color:var(--tag-blue-ink)]"
                }
              >
                {sub.targetType === "thread" ? "帖子" : "回复"}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={
                    sub.threadId
                      ? `/threads/${sub.threadId.replace(/^thread:/, "")}`
                      : "#"
                  }
                  className="block font-medium text-[color:var(--ink)] hover:underline"
                >
                  {sub.threadTitle ?? "（标题已移除）"}
                </Link>
                {sub.replyExcerpt ? (
                  <div className="mt-1 line-clamp-1 text-sm text-[color:var(--ink-secondary)]">
                    #{sub.replyFloor} 楼: {sub.replyExcerpt}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-[color:var(--ink-tertiary)]">
                  订阅于 {relativeTime(sub.createdAt)}
                  {sub.lastReplyAt
                    ? ` · 最后回复 ${relativeTime(sub.lastReplyAt)}`
                    : ""}
                </div>
              </div>
              <UnsubscribeButton subscriptionId={sub.id} />
            </div>
          ))}
        </Card>
      )}

      <Pagination
        page={subs.page}
        totalPages={subs.totalPages}
        totalCount={subs.totalCount}
        perPage={subs.perPage}
        buildHref={buildHref}
      />

      <div id="preferences" className="mt-12">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--ink-tertiary)]">
          通知偏好
        </div>
        <h2 className="mt-1 mb-2 text-2xl font-medium tracking-tight">
          通知与隐私
        </h2>
        <p className="mb-4 text-sm text-[color:var(--ink-tertiary)]">
          站内通知中心总是开启；外部通道（邮箱、Telegram）将在后续版本里加入此页。
        </p>
        <Card className="px-5 py-4 text-sm text-[color:var(--ink-secondary)]">
          <p>
            为保护匿名性，本站不会展示真实姓名或学号。订阅仅表示「希望接收通知」，不表示「认领该镜像内容」。
          </p>
          <p className="mt-2">
            如需关闭某条订阅，可在上方列表中直接取消，或在原帖/原回复底部再次点击订阅按钮以解除。
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
