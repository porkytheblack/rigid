"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-[var(--radius-md)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-base)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] border transition-colors resize-y",
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
Textarea.displayName = "Textarea";

export { Textarea };
