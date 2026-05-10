import Link from "next/link";

import { AppShell } from "@/src/components/forum/AppShell";
import { Pagination } from "@/src/components/forum/Pagination";
import { EmptyState } from "@/src/components/forum/States";
import { MarkAllReadButton } from "@/src/components/forum/MarkAllReadButton";
import { NotificationRow } from "@/src/components/forum/NotificationRow";
import { Card } from "@/src/components/ui/card";
import { requireWebPageUser } from "@/src/server/auth/pageGuards";
import { prisma } from "@/src/server/db/client";
import {
  listNotifications,
  type NotificationFilter,
} from "@/src/server/forum/notificationsService";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

const FILTER_OPTIONS: ReadonlyArray<{ key: NotificationFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "unread", label: "未读" },
  { key: "thread_reply", label: "回复" },
  { key: "reply_quote", label: "@提及" },
  { key: "system", label: "系统" },
];

function parseFilter(value: string | string[] | undefined): NotificationFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw === "all" ||
    raw === "unread" ||
    raw === "thread_reply" ||
    raw === "reply_quote" ||
    raw === "mirror_source_stale" ||
    raw === "bot_rotated" ||
    raw === "system"
  ) {
    return raw;
  }
  return "all";
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw == null ? 1 : Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    filter?: string | string[];
    page?: string | string[];
  }>;
}) {
  const identity = await requireWebPageUser("/notifications");
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
    return (
      <AppShell activeKey="notifications">
        <EmptyState
          icon="🙈"
          title="未找到本地用户档案"
          description="请退出后重新登录，以便系统创建你的本地档案。"
        />
      </AppShell>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const filter = parseFilter(resolvedSearchParams.filter);
  const page = parsePage(resolvedSearchParams.page);

  const result = await listNotifications({
    recipientUserId: profile.userId,
    filter,
    page,
    perPage: PER_PAGE,
  });

  const buildHref = (nextPage: number) => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (nextPage !== 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/notifications?${qs}` : `/notifications`;
  };

  const filterHref = (target: NotificationFilter) => {
    const params = new URLSearchParams();
    if (target !== "all") params.set("filter", target);
    return params.toString()
      ? `/notifications?${params.toString()}`
      : "/notifications";
  };

  return (
    <AppShell
      activeKey="notifications"
      unreadNotificationCount={result.unreadCount}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--ink-tertiary)]">
        通知中心
      </div>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">
        {result.unreadCount > 0
          ? `${result.unreadCount} 条未读通知`
          : "已经全部看完啦"}
      </h1>
      <p className="mt-1.5 mb-5 text-sm text-[color:var(--ink-secondary)]">
        通知通过站内匿名通道送达。订阅帖子或回复后，新动态会出现在这里。
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div
          className="inline-flex items-center gap-1 rounded-xl bg-[color:var(--canvas-soft)] p-1"
          role="tablist"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = option.key === filter;
            return (
              <Link
                key={option.key}
                href={filterHref(option.key)}
                role="tab"
                aria-selected={active}
                className={
                  active
                    ? "rounded-lg bg-[color:var(--surface)] px-4 py-1.5 text-sm font-medium text-[color:var(--ink)] shadow-[var(--shadow-2)]"
                    : "rounded-lg px-4 py-1.5 text-sm font-medium text-[color:var(--ink-tertiary)] hover:text-[color:var(--ink)]"
                }
              >
                {option.label}
              </Link>
            );
          })}
        </div>
        <div className="flex-1" />
        <MarkAllReadButton hasUnread={result.unreadCount > 0} />
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="没有通知"
          description="新内容会出现在这里。"
        />
      ) : (
        <Card className="overflow-hidden">
          {result.items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
            />
          ))}
        </Card>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        perPage={result.perPage}
        buildHref={buildHref}
      />
    </AppShell>
  );
}
