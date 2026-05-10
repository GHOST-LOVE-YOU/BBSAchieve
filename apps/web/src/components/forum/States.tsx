import { cn } from "@/src/lib/utils";

export function EmptyState({
  icon = "📭",
  title,
  description,
  className,
}: {
  icon?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] py-14 px-5 text-center",
        className,
      )}
    >
      <div className="mb-2.5 text-[38px] opacity-40" aria-hidden>
        {icon}
      </div>
      <div className="text-base font-medium text-[color:var(--ink)]">{title}</div>
      {description ? (
        <div className="mt-1 text-sm text-[color:var(--ink-tertiary)]">
          {description}
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = "加载失败",
  description = "请稍后再试。",
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface-blush)] p-4 flex items-center gap-3",
        className,
      )}
    >
      <span className="text-2xl" aria-hidden>
        ⚠️
      </span>
      <div className="flex-1">
        <div className="font-medium text-[color:var(--ink)]">{title}</div>
        <div className="text-sm text-[color:var(--ink-secondary)]">{description}</div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-[color:var(--hairline)] bg-[color:var(--surface)] p-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-3 px-3 py-4">
          <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-[70%]" />
            <div className="skeleton h-3 w-[40%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
