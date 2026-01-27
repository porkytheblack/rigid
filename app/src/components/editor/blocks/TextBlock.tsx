"use client";

import { useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Block, BlockType, getBlockPlaceholder } from "../types";
import { parseMarkdownShortcut } from "../utils";

interface TextBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onInsertBefore?: (type?: BlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onTurnInto: (type: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
  onOpenSlashMenu: (position: { x: number; y: number }) => void;
  isSlashMenuOpen?: boolean;
}

export function TextBlock({
  block,
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
  onOpenSlashMenu,
  isSlashMenuOpen = false,
}: TextBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef(block.content);

  // Sync content with block
  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content;
    }
    lastContentRef.current = block.content;
  }, [block.content]);

  // Focus handling - use requestAnimationFrame for smoother transitions
  useEffect(() => {
    if (isFocused && contentRef.current) {
      // Use requestAnimationFrame for smoother focus
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
          // Fallback: just focus without cursor positioning
          contentRef.current.focus();
        }
      });
    }
  }, [isFocused]);

  const handleInput = useCallback(() => {
    const content = contentRef.current?.textContent || '';

    // Check for markdown shortcuts
    const shortcut = parseMarkdownShortcut(content);
    if (shortcut && shortcut.type !== block.type) {
      onTurnInto(shortcut.type);
      // Update content after transformation
      setTimeout(() => {
        onUpdate({ ...block, type: shortcut.type, content: shortcut.content });
        if (contentRef.current) {
          contentRef.current.textContent = shortcut.content;
        }
      }, 0);
      return;
    }

    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      onUpdate({ ...block, content });
    }
  }, [block, onUpdate, onTurnInto]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const content = contentRef.current?.textContent || '';
    const selection = window.getSelection();
    const cursorPos = selection?.anchorOffset || 0;

    // Enter - insert new block (but not if slash menu is open)
    if (e.key === 'Enter' && !e.shiftKey && !isSlashMenuOpen) {
      e.preventDefault();
      onInsertAfter();
      return;
    }

    // If slash menu is open, let it handle Enter/Escape
    if (isSlashMenuOpen && (e.key === 'Enter' || e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      return;
    }

    // Backspace at start of empty block - delete block
    if (e.key === 'Backspace' && content === '' && cursorPos === 0) {
      e.preventDefault();
      onDelete();
      return;
    }

    // Backspace at start of non-empty block - merge with previous or turn into paragraph
    if (e.key === 'Backspace' && cursorPos === 0 && block.type !== 'paragraph') {
      e.preventDefault();
      onTurnInto('paragraph');
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

    // Arrow up at start of content - focus previous block
    if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (cursorPos === 0 && onFocusPrevious) {
        e.preventDefault();
        onFocusPrevious();
        return;
      }
    }

    // Arrow down at end of content - focus next block
    if (e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (cursorPos === content.length && onFocusNext) {
        e.preventDefault();
        onFocusNext();
        return;
      }
    }

    // Slash - open command menu (will capture typed text after /)
    if (e.key === '/' && !isSlashMenuOpen) {
      // Get cursor position for menu
      const rect = contentRef.current?.getBoundingClientRect();
      if (rect) {
        // Position menu below current line
        const selection = window.getSelection();
        let menuX = rect.left;
        let menuY = rect.bottom + 4;

        // Try to get more precise position from selection
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rangeRect = range.getBoundingClientRect();
          if (rangeRect.width > 0 || rangeRect.height > 0) {
            menuX = rangeRect.left;
            menuY = rangeRect.bottom + 4;
          }
        }

        onOpenSlashMenu({ x: menuX, y: menuY });
      }
    }
  }, [block, isSlashMenuOpen, onDelete, onInsertAfter, onIndent, onOutdent, onMoveUp, onMoveDown, onTurnInto, onOpenSlashMenu, onFocusPrevious, onFocusNext]);

  const getBlockStyles = () => {
    switch (block.type) {
      case 'heading1':
        return 'text-[32px] font-bold leading-[1.4] tracking-[-0.02em] mt-8 mb-4';
      case 'heading2':
        return 'text-[24px] font-bold leading-[1.4] tracking-[-0.02em] mt-7 mb-3';
      case 'heading3':
        return 'text-[18px] font-bold leading-[1.4] tracking-[-0.01em] mt-6 mb-2';
      case 'quote':
        return 'border-l-[3px] border-[var(--text-primary)] pl-5 text-[var(--text-secondary)]';
      default:
        return 'text-[var(--text-body-md)] leading-[1.7]';
    }
  };

  // Only show placeholder when focused
  const showPlaceholder = isFocused;

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      className={`
        w-full outline-none
        ${showPlaceholder ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)] empty:before:pointer-events-none' : ''}
        ${getBlockStyles()}
      `}
      data-placeholder={getBlockPlaceholder(block.type)}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      spellCheck={false}
    />
  );
}
