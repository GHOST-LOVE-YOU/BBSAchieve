import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-tight",
  {
    variants: {
      tone: {
        yellow: "bg-[color:var(--tag-yellow-bg)] text-[color:var(--tag-yellow-ink)]",
        green: "bg-[color:var(--tag-green-bg)] text-[color:var(--tag-green-ink)]",
        blue: "bg-[color:var(--tag-blue-bg)] text-[color:var(--tag-blue-ink)]",
        mauve: "bg-[color:var(--tag-mauve-bg)] text-[color:var(--tag-mauve-ink)]",
        turquoise:
          "bg-[color:var(--tag-turquoise-bg)] text-[color:var(--tag-turquoise-ink)]",
        red: "bg-[color:var(--tag-red-bg)] text-[color:var(--tag-red-ink)]",
        outline:
          "bg-transparent text-[color:var(--ink-secondary)] border border-[color:var(--hairline)]",
      },
    },
    defaultVariants: {
      tone: "blue",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
