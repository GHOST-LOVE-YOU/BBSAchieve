import { cn } from "@/src/lib/utils";

export type HeroBandTone =
  | "blush"
  | "butter"
  | "sage"
  | "sky"
  | "peach"
  | "mauve";

const TONE_CLASS: Record<HeroBandTone, string> = {
  blush: "bg-[color:var(--surface-blush)]",
  butter: "bg-[color:var(--surface-butter)]",
  sage: "bg-[color:var(--surface-sage)]",
  sky: "bg-[color:var(--surface-sky)]",
  peach: "bg-[color:var(--surface-peach)]",
  mauve: "bg-[color:var(--surface-mauve)]",
};

export type HeroBandProps = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  stat?: { label: string; value: React.ReactNode };
  tone?: HeroBandTone;
  className?: string;
  children?: React.ReactNode;
};

export function HeroBand({
  eyebrow,
  title,
  subtitle,
  stat,
  tone = "blush",
  className,
  children,
}: HeroBandProps) {
  return (
    <section
      className={cn(
        "rounded-[20px] p-7 sm:p-8 mb-6 flex flex-wrap items-center gap-6",
        TONE_CLASS[tone],
        className,
      )}
    >
      <div className="flex-1 min-w-[260px]">
        {eyebrow ? (
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--ink-tertiary)]">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1.5 text-2xl font-medium tracking-tight text-[color:var(--ink)] leading-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-[color:var(--ink-secondary)]">
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>
      {stat ? (
        <div className="rounded-[14px] bg-white/55 dark:bg-white/5 px-5 py-3.5 min-w-[130px]">
          <div className="text-[28px] font-medium tracking-tight tabular-nums">
            {stat.value}
          </div>
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[color:var(--ink-secondary)]">
            {stat.label}
          </div>
        </div>
      ) : null}
    </section>
  );
}
