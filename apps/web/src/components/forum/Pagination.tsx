import Link from "next/link";

import { cn } from "@/src/lib/utils";

export type PaginationProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  /** Builds the link href for a given page number. */
  buildHref: (page: number) => string;
  className?: string;
};

function pageList(page: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: Array<number | "…"> = [1];
  if (page > 3) pages.push("…");
  for (
    let i = Math.max(2, page - 1);
    i <= Math.min(totalPages - 1, page + 1);
    i += 1
  ) {
    pages.push(i);
  }
  if (page < totalPages - 2) pages.push("…");
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  perPage,
  buildHref,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && totalCount <= perPage) {
    return null;
  }

  const start = (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, totalCount);
  const pages = pageList(page, totalPages);

  return (
    <nav
      aria-label="分页"
      className={cn(
        "mt-5 flex flex-wrap items-center justify-between gap-3 text-sm",
        className,
      )}
    >
      <div className="text-[color:var(--ink-tertiary)]">
        共 <strong className="text-[color:var(--ink)]">{totalCount}</strong> 条 ·
        第 <span className="tabular-nums">{start}</span>–
        <span className="tabular-nums">{end}</span>
      </div>
      <div className="flex items-center gap-1">
        <PageLink
          disabled={page === 1}
          href={buildHref(Math.max(1, page - 1))}
          aria-label="上一页"
        >
          ‹
        </PageLink>
        {pages.map((entry, i) =>
          entry === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-[color:var(--mute)]">
              …
            </span>
          ) : (
            <PageLink
              key={entry}
              active={entry === page}
              href={buildHref(entry)}
              aria-current={entry === page ? "page" : undefined}
            >
              {entry}
            </PageLink>
          ),
        )}
        <PageLink
          disabled={page === totalPages}
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-label="下一页"
        >
          ›
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  active,
  disabled,
  children,
  ...rest
}: React.PropsWithChildren<{
  href: string;
  active?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
}>) {
  const className = cn(
    "inline-grid h-9 min-w-[2.25rem] place-items-center rounded-lg px-2.5 text-sm font-medium transition-colors tabular-nums",
    active
      ? "bg-[color:var(--ink)] text-[color:var(--on-primary)]"
      : "text-[color:var(--ink-secondary)] hover:bg-[color:var(--canvas-soft)]",
    disabled && "pointer-events-none text-[color:var(--mute)]",
  );
  if (disabled) {
    return (
      <span className={className} aria-disabled {...rest}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  );
}
