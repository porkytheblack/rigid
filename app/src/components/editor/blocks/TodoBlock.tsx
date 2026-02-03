"use client";

import { useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Block, BlockType, getBlockPlaceholder, getBlockText, LegacyBlockMeta } from "../types";
import { Check } from "lucide-react";

interface TodoBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onIndent: () => void;
  onOutdent: () => void;
  onTurnInto: (type: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

export function TodoBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onIndent,
  onOutdent,
  onTurnInto,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: TodoBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const meta = block.meta as LegacyBlockMeta | undefined;
  const checked = meta?.checked || false;
  const indent = meta?.indent || 0;
  const text = getBlockText(block);

  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== text) {
      contentRef.current.textContent = text;
    }
  }, [text]);

  // Focus handling - use requestAnimationFrame for smoother transitions
  useEffect(() => {
    if (isFocused && contentRef.current) {
      requestAnimationFrame(() => {
        if (!contentRef.current) return;

        contentRef.current.focus();

        const range = document.createRange();
        const sel = window.getSelection();

        try {
          if (contentRef.current.childNodes.length > 0) {
            const lastChild = contentRef.current.lastChild;
            if (lastChild?.nodeType === Node.TEXT_NODE) {
              range.setStart(lastChild, lastChild.textContent?.length || 0);
              range.collapse(true);
            } else {
              range.selectNodeContents(contentRef.current);
              range.collapse(false);
            }
          } else {
            range.setStart(contentRef.current, 0);
            range.collapse(true);
          }
          sel?.removeAllRanges();
          sel?.addRange(range);
        } catch {
          contentRef.current.focus();
        }
      });
    }
  }, [isFocused]);

  const handleInput = useCallback(() => {
    const content = contentRef.current?.textContent || '';
    onUpdate({ ...block, content });
  }, [block, onUpdate]);

  const handleToggle = () => {
    onUpdate({
      ...block,
      meta: { ...meta, checked: !checked },
    });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const content = contentRef.current?.textContent || '';
    const selection = window.getSelection();
    const cursorPos = selection?.anchorOffset || 0;

    // Enter - insert new todo
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (content === '') {
        if (indent > 0) {
          onOutdent();
        } else {
          onTurnInto('paragraph');
        }
      } else {
        onInsertAfter('todo');
      }
      return;
    }

    // Backspace at start
    if (e.key === 'Backspace' && cursorPos === 0) {
      e.preventDefault();
      if (content === '') {
        if (indent > 0) {
          onOutdent();
        } else {
          onDelete();
        }
      } else {
        onTurnInto('paragraph');
      }
      return;
    }

    // Tab - indent
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      onIndent();
      return;
    }

    // Shift+Tab - outdent
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      onOutdent();
      return;
    }

    // Arrow up at start - focus previous block
    if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (cursorPos === 0 && onFocusPrevious) {
        e.preventDefault();
        onFocusPrevious();
        return;
      }
    }

    // Arrow down at end - focus next block
    if (e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (cursorPos === content.length && onFocusNext) {
        e.preventDefault();
        onFocusNext();
        return;
      }
    }
  }, [indent, onDelete, onInsertAfter, onIndent, onOutdent, onTurnInto, onFocusPrevious, onFocusNext]);

  // Only show placeholder when focused
  const showPlaceholder = isFocused;

  return (
    <div
      className="flex items-start gap-3"
      style={{ paddingLeft: indent * 24 }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={handleToggle}
        className={`
          flex-shrink-0 w-4 h-4 mt-1
          border border-[var(--border-default)]
          flex items-center justify-center
          transition-colors duration-100
          ${checked ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'bg-transparent hover:border-[var(--text-secondary)]'}
        `}
      >
        {checked && <Check className="w-3 h-3 text-[var(--text-inverse)]" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        className={`
          flex-1 outline-none text-[var(--text-body-md)] leading-[1.7]
          ${showPlaceholder ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]' : ''}
          ${checked ? 'line-through text-[var(--text-tertiary)]' : ''}
        `}
        data-placeholder={getBlockPlaceholder('todo')}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        spellCheck={false}
      />
    </div>
  );
}
