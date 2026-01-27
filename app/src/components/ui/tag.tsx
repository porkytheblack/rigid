"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TagColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

const tagColorStyles: Record<TagColor, string> = {
  gray: "bg-[var(--tag-gray)]/20 border-[var(--tag-gray)]/40 text-[#A1A1AA]",
  red: "bg-[var(--tag-red)]/20 border-[var(--tag-red)]/40 text-[#FCA5A5]",
  orange:
    "bg-[var(--tag-orange)]/20 border-[var(--tag-orange)]/40 text-[#FDBA74]",
  yellow:
    "bg-[var(--tag-yellow)]/20 border-[var(--tag-yellow)]/40 text-[#FCD34D]",
  green: "bg-[var(--tag-green)]/20 border-[var(--tag-green)]/40 text-[#86EFAC]",
  blue: "bg-[var(--tag-blue)]/20 border-[var(--tag-blue)]/40 text-[#93C5FD]",
  purple:
    "bg-[var(--tag-purple)]/20 border-[var(--tag-purple)]/40 text-[#C4B5FD]",
  pink: "bg-[var(--tag-pink)]/20 border-[var(--tag-pink)]/40 text-[#F9A8D4]",
};

export interface TagProps {
  children: React.ReactNode;
  color?: TagColor;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

export function Tag({
  children,
  color = "gray",
  removable = false,
  onRemove,
  className,
}: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-5 px-2 rounded-full text-[var(--text-xs)] font-medium border transition-colors",
        tagColorStyles[color],
        removable && "pr-1",
        className
      )}
    >
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="p-0.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Remove tag"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
