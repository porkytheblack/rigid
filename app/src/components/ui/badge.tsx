"use client";

import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full text-[var(--text-xs)] font-medium min-w-[18px] h-[18px] px-1.5",
  {
    variants: {
      variant: {
        default: "bg-[var(--bg-hover)] text-[var(--text-primary)]",
        success: "bg-[var(--status-success)]/20 text-[var(--status-success)]",
        warning: "bg-[var(--status-warning)]/20 text-[var(--status-warning)]",
        error: "bg-[var(--status-error)]/20 text-[var(--status-error)]",
        info: "bg-[var(--status-info)]/20 text-[var(--status-info)]",
        accent: "bg-[var(--accent-muted)] text-[var(--accent)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
