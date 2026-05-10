import Link from "next/link";
import { MessageSquare } from "lucide-react";

import { UserAvatar } from "@/src/components/forum/UserAvatar";
import { Badge } from "@/src/components/ui/badge";
import { cn, relativeTime } from "@/src/lib/utils";

export type PostRowProps = {
  href: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  authorId: string;
  authorIsBot: boolean;
  publishedAt: string | Date;
  lastReplyAt?: string | Date | null;
  lastReplyAuthorName?: string | null;
  replyCount: number;
  sectionLabel?: string | null;
  pinned?: boolean;
  mirrored?: boolean;
  className?: string;
};

export function PostRow({
  href,
  title,
  excerpt,
  authorName,
  authorId,
  authorIsBot,
  publishedAt,
  lastReplyAt,
  lastReplyAuthorName,
  replyCount,
  sectionLabel,
  pinned,
  mirrored,
  className,
}: PostRowProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group grid grid-cols-[40px_1fr_auto] items-start gap-4 px-5 py-4 border-b border-[color:var(--hairline-soft)] last:border-b-0 transition-colors hover:bg-[color:var(--canvas-soft)]",
        className,
      )}
    >
      <UserAvatar
        name={authorName}
        seed={authorId}
        isBot={authorIsBot}
        size={40}
        className="row-span-2"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-2 text-base font-medium text-[color:var(--ink)] leading-snug">
          {pinned ? <Badge tone="red">置顶</Badge> : null}
          {mirrored ? <Badge tone="blue">镜像</Badge> : null}
          <span className="line-clamp-1 break-all">{title}</span>
        </div>
        {excerpt ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-[color:var(--ink-secondary)] leading-relaxed">
            {excerpt}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--ink-tertiary)]">
          <span className="font-medium text-[color:var(--ink-secondary)]">
            {authorName}
          </span>
          <span aria-hidden>·</span>
          <span>{relativeTime(publishedAt)}</span>
          {sectionLabel ? (
            <>
              <span aria-hidden>·</span>
              <span>{sectionLabel}</span>
            </>
          ) : null}
          {lastReplyAt ? (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                最后回复 {relativeTime(lastReplyAt)}
                {lastReplyAuthorName ? (
                  <span className="font-medium text-[color:var(--ink-secondary)] max-w-[8rem] truncate">
                    · {lastReplyAuthorName}
                  </span>
                ) : null}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 min-w-[60px] text-[color:var(--ink)]">
        <span className="inline-flex items-center gap-1 text-sm font-medium">
          <MessageSquare aria-hidden className="h-3.5 w-3.5" />
          {replyCount}
        </span>
      </div>
    </Link>
  );
}
