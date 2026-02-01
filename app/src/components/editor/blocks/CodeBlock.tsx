"use client";

import { useRef, useEffect, useCallback, KeyboardEvent, useState } from "react";
import { Block, BlockType } from "../types";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

const LANGUAGES = [
  'plaintext',
  'javascript',
  'typescript',
  'python',
  'rust',
  'go',
  'java',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'html',
  'css',
  'scss',
  'json',
  'yaml',
  'markdown',
  'sql',
  'bash',
  'shell',
];

export function CodeBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: CodeBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  const language = block.meta?.language || 'plaintext';

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [block.content]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = e.target.value;
    onUpdate({ ...block, content });
  }, [block, onUpdate]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Insert tab character
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onUpdate({ ...block, content: newValue });

      // Move cursor after tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
      return;
    }

    // Escape exits code block
    if (e.key === 'Escape') {
      e.preventDefault();
      onInsertAfter('paragraph');
      return;
    }

    // Cmd/Ctrl + Enter to exit
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onInsertAfter('paragraph');
      return;
    }

    // Arrow down at very end of content - focus next block
    if (e.key === 'ArrowDown') {
      const textarea = textareaRef.current;
      if (textarea) {
        const isAtEnd = textarea.selectionStart === textarea.value.length;
        // Only exit if cursor is at the absolute end of the content
        if (isAtEnd && onFocusNext) {
          e.preventDefault();
          onFocusNext();
          return;
        }
      }
    }

    // Arrow up at very start of content - focus previous block
    if (e.key === 'ArrowUp') {
      const textarea = textareaRef.current;
      if (textarea) {
        const isAtStart = textarea.selectionStart === 0;
        // Only exit if cursor is at the absolute start of the content
        if (isAtStart && onFocusPrevious) {
          e.preventDefault();
          onFocusPrevious();
          return;
        }
      }
    }

    // Delete empty code block
    if (e.key === 'Backspace' && block.content === '') {
      e.preventDefault();
      onDelete();
      return;
    }
  }, [block, onDelete, onInsertAfter, onUpdate, onFocusPrevious, onFocusNext]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(block.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLanguageChange = (lang: string) => {
    onUpdate({
      ...block,
      meta: { ...block.meta, language: lang },
    });
    setShowLanguageMenu(false);
  };

  // Generate line numbers
  const lines = block.content.split('\n');
  const lineNumbers = lines.map((_, i) => i + 1);

  return (
    <div className="relative w-full border border-[var(--border-default)] bg-[var(--surface-secondary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)]">
        {/* Language selector */}
        <div className="relative">
          <button
            type="button"
            className="text-[var(--text-caption)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
          >
            {language}
          </button>

          {showLanguageMenu && (
            <div className="absolute top-full left-0 mt-1 z-10 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg max-h-[200px] overflow-auto min-w-[120px]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  className={`w-full px-3 py-1.5 text-left text-[var(--text-caption)] hover:bg-[var(--surface-hover)] ${language === lang ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                  onClick={() => handleLanguageChange(lang)}
                >
                  {lang}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy button */}
        <button
          type="button"
          className="flex items-center gap-1.5 text-[var(--text-caption)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="flex p-4">
        {/* Line numbers */}
        <div className="flex-shrink-0 pr-4 select-none">
          {lineNumbers.map((num) => (
            <div
              key={num}
              className="text-[var(--text-mono)] text-[var(--text-tertiary)] text-right leading-[1.7] h-[1.7em]"
            >
              {num}
            </div>
          ))}
        </div>

        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          value={block.content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          className="flex-1 bg-transparent text-[var(--text-mono)] text-[var(--text-primary)] font-mono leading-[1.7] resize-none outline-none placeholder:text-[var(--text-tertiary)]"
          placeholder="Write code..."
          spellCheck={false}
          rows={1}
        />
      </div>
    </div>
  );
}
