"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-[var(--radius-md)] bg-[var(--bg-surface)] px-3 text-[var(--text-base)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-base)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-[var(--status-error)] focus-visible:ring-[var(--status-error)]"
            : "border-[var(--border-default)] hover:border-[var(--border-strong)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
