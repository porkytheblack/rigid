"use client";

import { useRef, useEffect, useCallback, KeyboardEvent, useState } from "react";
import { Block, BlockType, CalloutType, getBlockText, getBlockPlaceholder, LegacyBlockMeta } from "../types";
import { Info, AlertTriangle, AlertCircle, CheckCircle, Lightbulb, FileText } from "lucide-react";

interface CalloutBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

const calloutConfig: Record<CalloutType, { icon: typeof Info; bgColor: string; iconColor: string }> = {
  info: { icon: Info, bgColor: 'var(--status-info-bg)', iconColor: 'var(--accent-info)' },
  warning: { icon: AlertTriangle, bgColor: 'var(--status-warning-bg)', iconColor: 'var(--accent-warning)' },
  error: { icon: AlertCircle, bgColor: 'var(--status-error-bg)', iconColor: 'var(--accent-error)' },
  success: { icon: CheckCircle, bgColor: 'var(--status-success-bg)', iconColor: 'var(--accent-success)' },
  tip: { icon: Lightbulb, bgColor: 'var(--status-success-bg)', iconColor: 'var(--accent-success)' },
  note: { icon: FileText, bgColor: 'var(--status-info-bg)', iconColor: 'var(--accent-info)' },
};

export function CalloutBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: CalloutBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const meta = block.meta as LegacyBlockMeta | undefined;
  const calloutType = meta?.calloutType || 'info';
  const config = calloutConfig[calloutType];
  const Icon = config.icon;
  const text = getBlockText(block);

  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== text) {
      contentRef.current.textContent = text;
    }
  }, [text]);

  useEffect(() => {
    if (isFocused && contentRef.current) {
      contentRef.current.focus();
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
  }, [onDelete, onInsertAfter, onFocusPrevious, onFocusNext]);

  const handleTypeChange = (type: CalloutType) => {
    onUpdate({
      ...block,
      meta: { ...meta, calloutType: type },
    });
    setShowTypePicker(false);
  };

  return (
    <div
      className="relative border border-[var(--border-default)] p-4"
      style={{ backgroundColor: config.bgColor }}
    >
      <div className="flex gap-3">
        {/* Icon button - click to change type */}
        <button
          type="button"
          className="flex-shrink-0 w-5 h-5 mt-0.5"
          onClick={() => setShowTypePicker(!showTypePicker)}
        >
          <Icon className="w-5 h-5" style={{ color: config.iconColor }} />
        </button>

        {/* Type picker */}
        {showTypePicker && (
          <div className="absolute left-4 top-12 z-10 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg p-1">
            {(Object.keys(calloutConfig) as CalloutType[]).map((type) => {
              const TypeIcon = calloutConfig[type].icon;
              return (
                <button
                  key={type}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-hover)] ${calloutType === type ? 'bg-[var(--surface-hover)]' : ''}`}
                  onClick={() => handleTypeChange(type)}
                >
                  <TypeIcon className="w-4 h-4" style={{ color: calloutConfig[type].iconColor }} />
                  <span className="text-[var(--text-body-sm)] capitalize">{type}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          className="flex-1 outline-none text-[var(--text-body-md)] leading-[1.7] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]"
          data-placeholder={getBlockPlaceholder('callout')}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
