"use client";

import { GripVertical } from "lucide-react";
import { forwardRef } from "react";

interface BlockHandleProps {
  onMouseDown?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  isDragging?: boolean;
}

export const BlockHandle = forwardRef<HTMLButtonElement, BlockHandleProps>(
  ({ onMouseDown, onClick, isDragging }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={`
          flex items-center justify-center
          w-6 h-6
          opacity-0 group-hover:opacity-100
          transition-opacity duration-100
          text-[var(--text-tertiary)]
          hover:text-[var(--text-secondary)]
          hover:bg-[var(--surface-hover)]
          cursor-grab active:cursor-grabbing
          ${isDragging ? 'opacity-100 cursor-grabbing' : ''}
        `}
        onMouseDown={onMouseDown}
        onClick={onClick}
        tabIndex={-1}
        aria-label="Drag to move block"
      >
        <GripVertical className="w-4 h-4" />
      </button>
    );
  }
);

BlockHandle.displayName = "BlockHandle";
