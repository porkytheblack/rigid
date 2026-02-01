"use client";

import { useRef, useEffect } from "react";
import {
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
} from "lucide-react";

interface BlockMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  position: { x: number; y: number };
}

export function BlockMenu({
  isOpen,
  onClose,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  position,
}: BlockMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg min-w-[180px]"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Edit actions */}
      <div className="p-1">
        <MenuItem icon={Copy} label="Duplicate" shortcut="⌘D" onClick={() => { onDuplicate(); onClose(); }} />
      </div>

      <div className="h-px bg-[var(--border-default)]" />

      {/* Move actions */}
      <div className="p-1">
        <MenuItem icon={ArrowUp} label="Move up" shortcut="⌘⇧↑" onClick={() => { onMoveUp(); onClose(); }} />
        <MenuItem icon={ArrowDown} label="Move down" shortcut="⌘⇧↓" onClick={() => { onMoveDown(); onClose(); }} />
      </div>

      <div className="h-px bg-[var(--border-default)]" />

      {/* Delete */}
      <div className="p-1">
        <MenuItem
          icon={Trash2}
          label="Delete"
          shortcut="⌫"
          onClick={() => { onDelete(); onClose(); }}
          destructive
        />
      </div>
    </div>
  );
}

interface MenuItemProps {
  icon: typeof Type;
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
        ${destructive ? 'text-[var(--accent-error)] hover:bg-[var(--status-error-bg)]' : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'}
      `}
      onClick={onClick}
    >
      <Icon className={`w-4 h-4 ${destructive ? '' : 'text-[var(--text-tertiary)]'}`} />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">{shortcut}</span>
      )}
    </button>
  );
}
