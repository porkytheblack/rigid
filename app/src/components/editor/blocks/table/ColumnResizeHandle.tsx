"use client";

import { useCallback } from "react";

export interface ColumnResizeHandleProps {
  /** Column index this handle is for */
  columnIndex: number;
  /** Whether currently resizing this column */
  isResizing: boolean;
  /** Start resize handler */
  onStartResize: (columnIndex: number, event: React.MouseEvent) => void;
}

export function ColumnResizeHandle({
  columnIndex,
  isResizing,
  onStartResize,
}: ColumnResizeHandleProps) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onStartResize(columnIndex, e);
    },
    [columnIndex, onStartResize]
  );

  return (
    <div
      className={`
        absolute top-0 right-0 w-1 h-full cursor-col-resize
        hover:bg-[var(--accent-interactive)] transition-colors
        ${isResizing ? 'bg-[var(--accent-interactive)]' : 'bg-transparent'}
      `}
      onMouseDown={handleMouseDown}
      style={{
        transform: 'translateX(50%)',
        zIndex: 10,
      }}
    >
      {/* Visual indicator on hover */}
      <div
        className={`
          absolute top-0 left-1/2 w-0.5 h-full -translate-x-1/2
          ${isResizing ? 'bg-[var(--accent-interactive)]' : 'opacity-0 group-hover:opacity-100 bg-[var(--border-strong)]'}
          transition-opacity
        `}
      />
    </div>
  );
}

export default ColumnResizeHandle;
