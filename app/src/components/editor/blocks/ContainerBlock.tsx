"use client";

import { useRef, useEffect, useCallback, useState, KeyboardEvent } from "react";
import { Info, AlertTriangle, Lightbulb, AlertCircle, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Block, BlockType, ContainerType, LegacyBlockMeta, getBlockText, getBlockPlaceholder } from "../types";

interface ContainerBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

interface ContainerConfig {
  icon: typeof Info;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  label: string;
}

const containerConfig: Record<ContainerType, ContainerConfig> = {
  note: {
    icon: Info,
    bgColor: 'var(--status-info-bg)',
    borderColor: 'var(--accent-info)',
    iconColor: 'var(--accent-info)',
    label: 'Note',
  },
  info: {
    icon: Info,
    bgColor: 'var(--status-info-bg)',
    borderColor: 'var(--accent-info)',
    iconColor: 'var(--accent-info)',
    label: 'Info',
  },
  tip: {
    icon: Lightbulb,
    bgColor: 'var(--status-success-bg)',
    borderColor: 'var(--accent-success)',
    iconColor: 'var(--accent-success)',
    label: 'Tip',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'var(--status-warning-bg)',
    borderColor: 'var(--accent-warning)',
    iconColor: 'var(--accent-warning)',
    label: 'Warning',
  },
  danger: {
    icon: AlertCircle,
    bgColor: 'var(--status-error-bg)',
    borderColor: 'var(--accent-error)',
    iconColor: 'var(--accent-error)',
    label: 'Danger',
  },
  details: {
    icon: HelpCircle,
    bgColor: 'var(--surface-secondary)',
    borderColor: 'var(--border-strong)',
    iconColor: 'var(--text-secondary)',
    label: 'Details',
  },
};

export function ContainerBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: ContainerBlockProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const meta = block.meta as LegacyBlockMeta | undefined;
  const containerType = (meta?.containerType || 'note') as ContainerType;
  const title = meta?.title || '';
  const config = containerConfig[containerType];
  const Icon = config.icon;
  const text = getBlockText(block);

  // Sync content
  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent !== text) {
      contentRef.current.textContent = text;
    }
  }, [text]);

  // Focus handling
  useEffect(() => {
    if (isFocused && contentRef.current) {
      contentRef.current.focus();
    }
  }, [isFocused]);

  const handleContentInput = useCallback(() => {
    const newText = contentRef.current?.textContent || '';
    onUpdate({ ...block, content: newText });
  }, [block, onUpdate]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...block,
      meta: { ...meta, title: e.target.value },
    });
  }, [block, meta, onUpdate]);

  const handleContentKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    const content = contentRef.current?.textContent || '';
    const selection = window.getSelection();
    const cursorPos = selection?.anchorOffset || 0;
    const isAtStart = cursorPos === 0;
    const isAtEnd = cursorPos === content.length;

    // Enter - insert new paragraph after container
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onInsertAfter('paragraph');
      return;
    }

    // Backspace on empty content - delete block
    if (e.key === 'Backspace' && content === '' && isAtStart) {
      e.preventDefault();
      onDelete();
      return;
    }

    // Arrow up at start - focus previous block
    if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (isAtStart && onFocusPrevious) {
        e.preventDefault();
        onFocusPrevious();
        return;
      }
    }

    // Arrow down at end - focus next block
    if (e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
      if (isAtEnd && onFocusNext) {
        e.preventDefault();
        onFocusNext();
        return;
      }
    }
  }, [onDelete, onInsertAfter, onFocusPrevious, onFocusNext]);

  const handleTypeChange = useCallback((type: ContainerType) => {
    onUpdate({
      ...block,
      meta: { ...meta, containerType: type },
    });
    setShowTypePicker(false);
  }, [block, meta, onUpdate]);

  const toggleCollapse = useCallback(() => {
    if (containerType === 'details') {
      setIsCollapsed(prev => !prev);
    }
  }, [containerType]);

  const isCollapsible = containerType === 'details';

  return (
    <div
      className="relative border-l-4 p-4"
      style={{
        backgroundColor: config.bgColor,
        borderLeftColor: config.borderColor,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        {/* Icon button - click to change type */}
        <button
          type="button"
          className="flex-shrink-0 mt-0.5"
          onClick={() => setShowTypePicker(!showTypePicker)}
          title={`Change container type (${config.label})`}
        >
          <Icon className="w-5 h-5" style={{ color: config.iconColor }} />
        </button>

        {/* Collapse toggle for details type */}
        {isCollapsible && (
          <button
            type="button"
            className="flex-shrink-0 mt-0.5"
            onClick={toggleCollapse}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" />
            )}
          </button>
        )}

        {/* Title input */}
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder={config.label}
          className="flex-1 bg-transparent font-semibold text-[var(--text-body-md)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
        />

        {/* Type picker dropdown */}
        {showTypePicker && (
          <div className="absolute left-4 top-12 z-10 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg p-1 min-w-[140px]">
            {(Object.keys(containerConfig) as ContainerType[]).map((type) => {
              const TypeConfig = containerConfig[type];
              const TypeIcon = TypeConfig.icon;
              return (
                <button
                  key={type}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--surface-hover)] ${containerType === type ? 'bg-[var(--surface-hover)]' : ''}`}
                  onClick={() => handleTypeChange(type)}
                >
                  <TypeIcon className="w-4 h-4" style={{ color: TypeConfig.iconColor }} />
                  <span className="text-[var(--text-body-sm)]">{TypeConfig.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {(!isCollapsed || !isCollapsible) && (
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          className="outline-none text-[var(--text-body-md)] leading-[1.7] ml-8 empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--text-tertiary)]"
          data-placeholder={getBlockPlaceholder('container')}
          onInput={handleContentInput}
          onKeyDown={handleContentKeyDown}
          onFocus={onFocus}
          spellCheck={false}
        />
      )}

      {/* Click outside to close type picker */}
      {showTypePicker && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowTypePicker(false)}
        />
      )}
    </div>
  );
}

export default ContainerBlock;
