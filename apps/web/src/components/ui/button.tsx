import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/src/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-[color:var(--primary)] text-[color:var(--on-primary)] hover:opacity-90",
        ink: "bg-[color:var(--ink)] text-[color:var(--on-primary)] hover:opacity-90",
        secondary:
          "bg-[color:var(--canvas-cream)] text-[color:var(--ink)] hover:bg-[color:var(--canvas-soft)]",
        tertiary:
          "bg-[color:var(--canvas-soft)] text-[color:var(--ink-secondary)] hover:bg-[color:var(--canvas-cream)]",
        outline:
          "bg-[color:var(--surface)] text-[color:var(--ink)] border border-[color:var(--hairline)] hover:bg-[color:var(--canvas-soft)]",
        ghost:
          "bg-transparent text-[color:var(--ink)] hover:bg-[color:var(--canvas-soft)]",
        destructive:
          "bg-[color:var(--error)] text-white hover:opacity-90",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-9 w-9 p-0 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
