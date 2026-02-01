"use client";

import { useRef, useEffect } from "react";
import { Copy, Trash2, Clipboard } from "lucide-react";

interface SelectionMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCopy: () => void;
  onCut: () => void;
  onDelete: () => void;
  position: { x: number; y: number };
  selectedCount: number;
}

export function SelectionMenu({
  isOpen,
  onClose,
  onCopy,
  onCut,
  onDelete,
  position,
  selectedCount,
}: SelectionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Adjust position to keep menu in viewport
  const adjustedPosition = { ...position };
  if (typeof window !== "undefined") {
    const menuWidth = 200;
    const menuHeight = 150;
    if (position.x + menuWidth > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - menuWidth - 10;
    }
    if (position.y + menuHeight > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - menuHeight - 10;
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg min-w-[180px]"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header showing selection count */}
      <div className="px-3 py-2 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
        <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
          {selectedCount} block{selectedCount > 1 ? "s" : ""} selected
        </span>
      </div>

      {/* Actions */}
      <div className="p-1">
        <MenuItem
          icon={Copy}
          label="Copy as Markdown"
          shortcut="⌘C"
          onClick={() => {
            onCopy();
            onClose();
          }}
        />
        <MenuItem
          icon={Clipboard}
          label="Cut"
          shortcut="⌘X"
          onClick={() => {
            onCut();
            onClose();
          }}
        />
      </div>

      <div className="h-px bg-[var(--border-default)]" />

      {/* Delete */}
      <div className="p-1">
        <MenuItem
          icon={Trash2}
          label="Delete"
          shortcut="⌫"
          onClick={() => {
            onDelete();
            onClose();
          }}
          destructive
        />
      </div>
    </div>
  );
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onClick: () => void;
  destructive?: boolean;
}

function MenuItem({ icon: Icon, label, shortcut, onClick, destructive }: MenuItemProps) {
  return (
    <button
      className={`
        w-full flex items-center gap-3 px-3 py-2 text-left
        text-[var(--text-body-sm)]
        ${destructive ? "text-[var(--accent-error)] hover:bg-[var(--status-error-bg)]" : "text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"}
      `}
      onClick={onClick}
    >
      <Icon className={`w-4 h-4 ${destructive ? "" : "text-[var(--text-tertiary)]"}`} />
      <span className="flex-1">{label}</span>
      {shortcut && <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">{shortcut}</span>}
    </button>
  );
}
