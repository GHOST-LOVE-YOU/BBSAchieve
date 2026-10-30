"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { LoaderCircle, RefreshCw } from "lucide-react";
export function RefreshStatus() {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 10_000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-[color:var(--ink-secondary)] hover:bg-[color:var(--canvas-soft)] focus-visible:outline-2 focus-visible:outline-[color:var(--primary)]"
    >
      <RefreshCw size={15} aria-hidden />
      刷新状态
    </button>
  );
}
export function TaskButton({
  children,
  disabled = false,
  primary = false,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  primary?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)] ${primary ? "bg-[color:var(--ink)] text-[color:var(--on-primary)] hover:opacity-90" : "border border-[color:var(--hairline)] text-[color:var(--ink-secondary)] hover:bg-[color:var(--canvas-soft)]"}`}
    >
      {pending ? (
        <LoaderCircle aria-hidden size={15} className="animate-spin" />
      ) : null}
      {pending ? "处理中…" : children}
    </button>
  );
}
