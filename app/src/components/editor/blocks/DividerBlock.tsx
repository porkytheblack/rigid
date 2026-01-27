"use client";

import { useRef, useEffect, KeyboardEvent } from "react";

interface DividerBlockProps {
  onDelete: () => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  onInsertAfter: () => void;
  isFocused: boolean;
}

export function DividerBlock({
  onDelete,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  onInsertAfter,
  isFocused,
}: DividerBlockProps) {
  const divRef = useRef<HTMLDivElement>(null);

  // Auto-focus when isFocused changes
  useEffect(() => {
    if (isFocused && divRef.current) {
      divRef.current.focus();
    }
  }, [isFocused]);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      onDelete();
      return;
    }

    // Arrow up - focus previous block
    if (e.key === 'ArrowUp' && onFocusPrevious) {
      e.preventDefault();
      onFocusPrevious();
      return;
    }

    // Arrow down - focus next block
    if (e.key === 'ArrowDown' && onFocusNext) {
      e.preventDefault();
      onFocusNext();
      return;
    }

    // Enter - insert block after
    if (e.key === 'Enter') {
      e.preventDefault();
      onInsertAfter();
      return;
    }
  };

  return (
    <div
      ref={divRef}
      className={`
        py-4 w-full cursor-pointer group outline-none
        ${isFocused ? 'bg-[var(--surface-hover)]' : ''}
      `}
      onClick={onFocus}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <hr className="border-0 h-px bg-[var(--border-default)] group-hover:bg-[var(--text-tertiary)] transition-colors" />
    </div>
  );
}
