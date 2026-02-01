"use client";

import { useRef, useEffect, useCallback, KeyboardEvent, useState } from "react";
import { Block, BlockType, getBlockPlaceholder, createBlock } from "../types";
import { ChevronRight } from "lucide-react";

interface ToggleBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onTurnInto: (type: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

export function ToggleBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onTurnInto,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: ToggleBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [focusedChildIndex, setFocusedChildIndex] = useState<number | null>(null);
  const expanded = block.meta?.expanded !== false; // Default to expanded
  const children = block.children || [];

  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content]);

  useEffect(() => {
    if (isFocused && contentRef.current && focusedChildIndex === null) {
      contentRef.current.focus();
    }
  }, [isFocused, focusedChildIndex]);

  const handleInput = useCallback(() => {
    const content = contentRef.current?.textContent || '';
    onUpdate({ ...block, content });
  }, [block, onUpdate]);

  const handleToggle = () => {
    onUpdate({
      ...block,
      meta: { ...block.meta, expanded: !expanded },
    });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const content = contentRef.current?.textContent || '';
    const selection = window.getSelection();
    const cursorPos = selection?.anchorOffset || 0;

    // Enter - add child block and focus it
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // Always expand and add/focus first child
      const newChild = createBlock('paragraph', '');
      if (children.length === 0) {
        onUpdate({
          ...block,
          meta: { ...block.meta, expanded: true },
          children: [newChild],
        });
        // Focus the new child
        setFocusedChildIndex(0);
      } else {
        // Insert at beginning and focus
        onUpdate({
          ...block,
          meta: { ...block.meta, expanded: true },
          children: [newChild, ...children],
        });
        setFocusedChildIndex(0);
      }
      return;
    }

    // Backspace at start of empty toggle
    if (e.key === 'Backspace' && content === '' && cursorPos === 0) {
      e.preventDefault();
      if (children.length === 0) {
        onDelete();
      } else {
        onTurnInto('paragraph');
      }
      return;
    }

    // Arrow down - move to first child if expanded, otherwise focus next block
    if (e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (expanded && children.length > 0) {
        e.preventDefault();
        setFocusedChildIndex(0);
        return;
      } else if (onFocusNext) {
        e.preventDefault();
        onFocusNext();
        return;
      }
    }

    // Arrow up at start - focus previous block
    if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (cursorPos === 0 && onFocusPrevious) {
        e.preventDefault();
        onFocusPrevious();
        return;
      }
    }
  }, [block, children, expanded, onDelete, onTurnInto, onUpdate, onFocusPrevious, onFocusNext]);

  const handleChildUpdate = (childIndex: number, updatedChild: Block) => {
    const newChildren = [...children];
    newChildren[childIndex] = updatedChild;
    onUpdate({ ...block, children: newChildren });
  };

  const handleChildDelete = (childIndex: number) => {
    const newChildren = children.filter((_, i) => i !== childIndex);
    onUpdate({ ...block, children: newChildren });
    // If deleted the last child, focus back to header
    if (newChildren.length === 0) {
      setFocusedChildIndex(null);
    } else if (childIndex > 0) {
      setFocusedChildIndex(childIndex - 1);
    }
  };

  const handleChildInsertAfter = (childIndex: number) => {
    const newChild = createBlock('paragraph', '');
    const newChildren = [...children];
    newChildren.splice(childIndex + 1, 0, newChild);
    onUpdate({ ...block, children: newChildren });
    setFocusedChildIndex(childIndex + 1);
  };

  const handleChildFocus = (index: number) => {
    setFocusedChildIndex(index);
  };

  const handleHeaderFocus = () => {
    setFocusedChildIndex(null);
    onFocus();
  };

  // Handle exiting from the last child - focus the next block
  const handleChildExit = (childIndex: number) => {
    if (childIndex === children.length - 1) {
      // Last child - exit toggle and focus next block
      setFocusedChildIndex(null);
      if (onFocusNext) {
        onFocusNext();
      } else {
        onInsertAfter('paragraph');
      }
    }
  };

  // Handle moving up from first child - go to header
  const handleChildMoveUp = (childIndex: number) => {
    if (childIndex === 0) {
      setFocusedChildIndex(null);
      // Focus the header
      requestAnimationFrame(() => {
        contentRef.current?.focus();
      });
    } else {
      setFocusedChildIndex(childIndex - 1);
    }
  };

  // Show placeholder only when header is focused
  const showPlaceholder = isFocused && focusedChildIndex === null;

  return (
    <div className="w-full">
      {/* Toggle header */}
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={handleToggle}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          className={`flex-1 outline-none text-[var(--text-body-md)] leading-[1.7] font-medium ${showPlaceholder ? 'empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]' : ''}`}
          data-placeholder={getBlockPlaceholder('toggle')}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={handleHeaderFocus}
          spellCheck={false}
        />
      </div>

      {/* Toggle content */}
      {expanded && (
        <div className="ml-6 pl-4 border-l border-[var(--border-subtle)] mt-1">
          {children.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                const newChild = createBlock('paragraph', '');
                onUpdate({ ...block, children: [newChild] });
                setFocusedChildIndex(0);
              }}
              className="text-[var(--text-tertiary)] text-[var(--text-body-sm)] py-2 hover:text-[var(--text-secondary)] text-left w-full"
            >
              Click to add content...
            </button>
          ) : (
            children.map((child, index) => (
              <div key={child.id} className="py-1">
                <NestedBlock
                  block={child}
                  onUpdate={(updated) => handleChildUpdate(index, updated)}
                  onDelete={() => handleChildDelete(index)}
                  onInsertAfter={() => handleChildInsertAfter(index)}
                  onFocus={() => handleChildFocus(index)}
                  onExit={() => handleChildExit(index)}
                  onMoveUp={() => handleChildMoveUp(index)}
                  isFocused={focusedChildIndex === index}
                  isLastChild={index === children.length - 1}
                />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Simple nested block for toggle content
interface NestedBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: () => void;
  onFocus: () => void;
  onExit: () => void;
  onMoveUp: () => void;
  isFocused: boolean;
  isLastChild: boolean;
}

function NestedBlock({ block, onUpdate, onDelete, onInsertAfter, onFocus, onExit, onMoveUp, isFocused, isLastChild }: NestedBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== block.content) {
      contentRef.current.textContent = block.content;
    }
  }, [block.content]);

  // Focus handling with requestAnimationFrame
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

  const handleInput = () => {
    const content = contentRef.current?.textContent || '';
    onUpdate({ ...block, content });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const content = contentRef.current?.textContent || '';
    const selection = window.getSelection();
    const cursorAtStart = selection?.anchorOffset === 0;
    const cursorAtEnd = selection?.anchorOffset === content.length;

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onInsertAfter();
      return;
    }

    if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      onDelete();
      return;
    }

    // Cmd/Ctrl + Enter or Escape to exit toggle
    if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || e.key === 'Escape') {
      e.preventDefault();
      onExit();
      return;
    }

    // Arrow down at end of last child - exit toggle
    if (e.key === 'ArrowDown' && cursorAtEnd && isLastChild) {
      e.preventDefault();
      onExit();
      return;
    }

    // Arrow up at start - move to previous child or header
    if (e.key === 'ArrowUp' && cursorAtStart) {
      e.preventDefault();
      onMoveUp();
      return;
    }
  };

  return (
    <div
      ref={contentRef}
      contentEditable
      suppressContentEditableWarning
      className={`outline-none text-[var(--text-body-md)] leading-[1.7] ${isFocused ? "empty:before:content-['Type_something...'] empty:before:text-[var(--text-tertiary)]" : ''}`}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      spellCheck={false}
    />
  );
}
