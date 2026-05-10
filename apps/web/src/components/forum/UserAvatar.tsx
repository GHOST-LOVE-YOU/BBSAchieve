import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { cn, initial } from "@/src/lib/utils";

const BOT_GRADIENT_BG =
  "bg-[linear-gradient(135deg,var(--tag-blue-bg),var(--tag-mauve-bg))] border border-dashed border-[color:var(--ash)] text-[color:var(--ink)]";

const HUMAN_PALETTE = [
  "#446aa7",
  "#547358",
  "#7f6c1f",
  "#b1729b",
  "#437184",
  "#bf6969",
  "#5e646e",
];

function paletteColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return HUMAN_PALETTE[hash % HUMAN_PALETTE.length] ?? HUMAN_PALETTE[0];
}

export type UserAvatarProps = {
  /** Display name used to derive the fallback character. */
  name: string;
  /** Stable id used to deterministically pick a colour for human users. */
  seed?: string;
  /** Bot avatars use a special gradient + 🤖 marker. */
  isBot?: boolean;
  /** Optional remote URL. */
  src?: string | null;
  size?: 28 | 36 | 40 | 44 | 48 | 56 | 64 | 96;
  className?: string;
};

const SIZE_CLASS: Record<number, string> = {
  28: "h-7 w-7 text-[11px]",
  36: "h-9 w-9 text-xs",
  40: "h-10 w-10 text-sm",
  44: "h-11 w-11 text-sm",
  48: "h-12 w-12 text-base",
  56: "h-14 w-14 text-lg",
  64: "h-16 w-16 text-xl",
  96: "h-24 w-24 text-3xl",
};

export function UserAvatar({
  name,
  seed,
  isBot = false,
  src,
  size = 40,
  className,
}: UserAvatarProps) {
  const sizeClass = SIZE_CLASS[size] ?? SIZE_CLASS[40];
  const fallbackBg = isBot ? BOT_GRADIENT_BG : "text-white";
  const inlineStyle = isBot
    ? undefined
    : { backgroundColor: paletteColorFor(seed ?? name) };

  return (
    <Avatar className={cn(sizeClass, className)}>
      {src ? <AvatarImage src={src} alt={name} /> : null}
      <AvatarFallback className={cn(fallbackBg, "font-semibold")} style={inlineStyle}>
        {isBot ? <span aria-hidden>🤖</span> : initial(name)}
      </AvatarFallback>
    </Avatar>
  );
}
