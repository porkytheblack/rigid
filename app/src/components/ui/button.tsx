"use client";

import { type VariantProps, cva } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-50 hover:translate-y-[-1px] active:translate-y-[0px] active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]",
        secondary:
          "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]",
        ghost:
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
        danger:
          "bg-[var(--status-error)] text-white hover:bg-[var(--status-error)]/90 hover:shadow-[0_4px_12px_rgba(220,38,38,0.3)]",
      },
      size: {
        sm: "h-7 px-3 text-[var(--text-sm)] rounded-[var(--radius-sm)]",
        md: "h-8 px-4 text-[var(--text-base)] rounded-[var(--radius-md)]",
        lg: "h-10 px-5 text-[var(--text-md)] rounded-[var(--radius-md)]",
        icon: "h-8 w-8 rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
