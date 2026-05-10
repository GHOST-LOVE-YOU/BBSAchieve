import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * `cn` is the standard shadcn class-name combiner: it merges Tailwind classes
 * intelligently so the *last* utility for a given property wins, while still
 * supporting conditional / array inputs via clsx.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format a Date / ISO string as a 中文 relative time (e.g. "5 分钟前"). */
export function relativeTime(input: Date | string | null | undefined): string {
  if (input == null) return "";
  const target = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(target.getTime())) return "";
  const diffMs = Date.now() - target.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)} 小时前`;
  if (diffMin < 60 * 24 * 7) return `${Math.floor(diffMin / (60 * 24))} 天前`;
  if (diffMin < 60 * 24 * 30) return `${Math.floor(diffMin / (60 * 24 * 7))} 周前`;
  return target.toLocaleDateString("zh-CN");
}

/** Returns first character of a name, useful for avatar fallbacks. */
export function initial(name: string | null | undefined): string {
  if (!name) return "?";
  // Use Array.from so emoji / surrogate pairs don't slice incorrectly.
  return Array.from(name.trim())[0] ?? "?";
}
