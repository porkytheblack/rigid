"use client";

import { useState, useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Palette,
  MoreHorizontal,
} from "lucide-react";

interface FormattingToolbarProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onFormat: (format: string) => void;
  onClose: () => void;
  activeFormats: string[];
}

interface ToolbarButton {
  id: string;
  icon: typeof Bold;
  label: string;
  shortcut: string;
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { id: 'bold', icon: Bold, label: 'Bold', shortcut: '⌘B' },
  { id: 'italic', icon: Italic, label: 'Italic', shortcut: '⌘I' },
  { id: 'underline', icon: Underline, label: 'Underline', shortcut: '⌘U' },
  { id: 'strikethrough', icon: Strikethrough, label: 'Strikethrough', shortcut: '⌘⇧S' },
  { id: 'code', icon: Code, label: 'Code', shortcut: '⌘E' },
  { id: 'link', icon: Link, label: 'Link', shortcut: '⌘K' },
];

export function FormattingToolbar({
  isOpen,
  position,
  onFormat,
  onClose,
  activeFormats,
}: FormattingToolbarProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Focus link input when shown
  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleLinkSubmit = () => {
    if (linkUrl.trim()) {
      onFormat(`link:${linkUrl.trim()}`);
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center bg-[var(--surface-primary)] border border-[var(--border-strong)] shadow-lg"
      style={{
        left: position.x,
        top: position.y - 48,
        transform: 'translateX(-50%)',
      }}
    >
      {!showLinkInput ? (
        <>
          {TOOLBAR_BUTTONS.map((button, index) => {
            const Icon = button.icon;
            const isActive = activeFormats.includes(button.id);

            return (
              <button
                key={button.id}
                type="button"
                className={`
                  w-8 h-8 flex items-center justify-center
                  ${isActive ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                  hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]
                  ${index === 0 ? '' : 'border-l border-[var(--border-default)]'}
                `}
                onClick={() => {
                  if (button.id === 'link') {
                    setShowLinkInput(true);
                  } else {
                    onFormat(button.id);
                  }
                }}
                title={`${button.label} (${button.shortcut})`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-default)] mx-1" />

          {/* Color */}
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            title="Text color"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* More */}
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            title="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex items-center px-2">
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Paste link..."
            className="w-48 h-8 px-2 bg-transparent text-[var(--text-body-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLinkSubmit();
              }
              if (e.key === 'Escape') {
                setShowLinkInput(false);
                setLinkUrl('');
              }
            }}
          />
          <button
            type="button"
            className="px-3 h-8 text-[var(--text-body-sm)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]"
            onClick={handleLinkSubmit}
          >
            Link
          </button>
        </div>
      )}
    </div>
  );
}
