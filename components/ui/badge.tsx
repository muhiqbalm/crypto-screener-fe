import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

/**
 * Badge / pill. Use the semantic `tone` variants instead of hand-rolled
 * `bg-x/10 text-x border-x/30` strings so every status chip looks the same.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors duration-200 [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // --- semantic tones (tinted background + matching text/border) ---
        bullish: "border-bullish/30 bg-bullish/10 text-bullish",
        bearish: "border-bearish/30 bg-bearish/10 text-bearish",
        warn: "border-warn/30 bg-warn/10 text-warn",
        info: "border-info/30 bg-info/10 text-info",
        lab: "border-lab/30 bg-lab/10 text-lab",
        brand: "border-brand/30 bg-brand/10 text-brand",
        muted: "border-border bg-muted/50 text-muted-foreground",
      },
      size: {
        default: "",
        sm: "px-1.5 py-0 text-2xs",
        xs: "px-1 py-0 text-3xs font-mono tracking-wide",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
