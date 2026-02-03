"use client";

import { useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Block, BlockType, getBlockPlaceholder, getBlockText, LegacyBlockMeta } from "../types";

interface ListBlockProps {
  block: Block;
  listNumber: number; // The actual number for this item in its list sequence
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onTurnInto: (type: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

export function ListBlock({
  block,
  listNumber,
  onUpdate,
  onDelete,
  onInsertAfter,
  onMoveUp,
  onMoveDown,
  onIndent,
  onOutdent,
  onTurnInto,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: ListBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const meta = block.meta as LegacyBlockMeta | undefined;
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

        // Move cursor to end
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

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const content = contentRef.current?.textContent || '';
    const selection = window.getSelection();
    const cursorPos = selection?.anchorOffset || 0;

    // Enter - insert new list item
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (content === '') {
        // Empty list item - convert to paragraph or outdent
        if (indent > 0) {
          onOutdent();
        } else {
          onTurnInto('paragraph');
        }
      } else {
        onInsertAfter(block.type);
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

    // Cmd/Ctrl + Shift + Up - move up
    if (e.key === 'ArrowUp' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      onMoveUp();
      return;
    }

    // Cmd/Ctrl + Shift + Down - move down
    if (e.key === 'ArrowDown' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
      e.preventDefault();
      onMoveDown();
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
  }, [block, indent, onDelete, onInsertAfter, onIndent, onOutdent, onMoveUp, onMoveDown, onTurnInto, onFocusPrevious, onFocusNext]);

  const renderBullet = () => {
    if (block.type === 'bulletList') {
      // Different bullet styles for nesting
      const bulletStyles = ['●', '○', '■'];
      const bulletStyle = bulletStyles[indent % bulletStyles.length];
      return (
        <span className="flex-shrink-0 w-6 text-[var(--text-tertiary)] text-center select-none">
          {bulletStyle}
        </span>
      );
    }

    if (block.type === 'numberedList') {
      return (
        <span className="flex-shrink-0 w-6 text-[var(--text-secondary)] text-right pr-2 select-none tabular-nums">
          {listNumber}.
        </span>
      );
    }

    return null;
  };

  // Only show placeholder when focused
  const showPlaceholder = isFocused;

  return (
    <div
      className="flex items-start gap-1"
      style={{ paddingLeft: indent * 24 }}
    >
      {renderBullet()}
      <div
        ref={contentRef}
        contentEditable
        suppressContentEditableWarning
        className={`flex-1 outline-none text-[var(--text-body-md)] leading-[1.7] ${showPlaceholder ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]' : ''}`}
        data-placeholder={getBlockPlaceholder(block.type)}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        spellCheck={false}
      />
    </div>
  );
}
