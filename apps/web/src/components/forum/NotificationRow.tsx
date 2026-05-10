"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { cn, relativeTime } from "@/src/lib/utils";
import type { NotificationDto } from "@/src/server/forum/notificationsService";

const ICON_BY_TYPE: Record<NotificationDto["type"], { glyph: string; bg: string }> = {
  thread_reply: {
    glyph: "💬",
    bg: "bg-[color:var(--tag-blue-bg)] text-[color:var(--tag-blue-ink)]",
  },
  reply_quote: {
    glyph: "🤖",
    bg: "bg-[color:var(--tag-mauve-bg)] text-[color:var(--tag-mauve-ink)]",
  },
  mirror_source_stale: {
    glyph: "⚠️",
    bg: "bg-[color:var(--tag-red-bg)] text-[color:var(--tag-red-ink)]",
  },
  bot_rotated: {
    glyph: "🔁",
    bg: "bg-[color:var(--tag-turquoise-bg)] text-[color:var(--tag-turquoise-ink)]",
  },
  system: {
    glyph: "🔔",
    bg: "bg-[color:var(--tag-yellow-bg)] text-[color:var(--tag-yellow-ink)]",
  },
};

export function NotificationRow({
  notification,
}: {
  notification: NotificationDto;
}) {
  const router = useRouter();
  const [unread, setUnread] = React.useState(notification.readAt == null);
  const [isPending, startTransition] = React.useTransition();
  const visualMeta = ICON_BY_TYPE[notification.type] ?? ICON_BY_TYPE.system;

  async function markRead() {
    if (!unread) return;
    setUnread(false);
    try {
      await fetch(`/api/public/notifications/${notification.id}/read`, {
        method: "POST",
      });
    } catch {
      // Best-effort; the next list refresh will resync state if this failed.
    }
  }

  function handleClick(event: React.MouseEvent) {
    if (notification.targetHref) {
      event.preventDefault();
      void markRead();
      startTransition(() => {
        router.push(notification.targetHref!);
      });
      return;
    }
    void markRead();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "grid w-full grid-cols-[8px_36px_1fr_auto] items-start gap-4 border-b border-[color:var(--hairline-soft)] px-5 py-4 text-left last:border-b-0 transition-colors hover:bg-[color:var(--canvas-soft)] disabled:opacity-60",
      )}
      disabled={isPending}
    >
      <span
        aria-hidden
        className={cn(
          "mt-2 inline-block h-2 w-2 rounded-full bg-[color:var(--primary)] opacity-0 transition-opacity",
          unread && "opacity-100",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full text-base",
          visualMeta.bg,
        )}
      >
        {visualMeta.glyph}
      </span>
      <div className="min-w-0">
        <div className="text-sm leading-snug text-[color:var(--ink)]">
          {notification.body}
        </div>
        {notification.sourceLabel ? (
          <div className="mt-1 text-xs text-[color:var(--ink-secondary)]">
            {notification.sourceLabel}
          </div>
        ) : null}
        {notification.threadTitle ? (
          <div className="mt-1 text-xs text-[color:var(--ink-tertiary)] truncate">
            《{notification.threadTitle}》
          </div>
        ) : null}
      </div>
      <div className="text-xs text-[color:var(--ink-tertiary)] whitespace-nowrap">
        {relativeTime(notification.occurredAt)}
      </div>
    </button>
  );
}
