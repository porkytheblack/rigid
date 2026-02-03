"use client";

import { useRef, useEffect, useCallback, KeyboardEvent, useState, useMemo } from "react";
import { Block, BlockType, getBlockText, LegacyBlockMeta } from "../types";
import { Copy, Check } from "lucide-react";
import { createLowlight, common } from "lowlight";
import { toHtml } from "hast-util-to-html";

// Create lowlight instance with common languages
const lowlight = createLowlight(common);

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

// Map our language names to lowlight language names
const LANGUAGE_MAP: Record<string, string> = {
  'plaintext': 'plaintext',
  'javascript': 'javascript',
  'typescript': 'typescript',
  'python': 'python',
  'rust': 'rust',
  'go': 'go',
  'java': 'java',
  'c': 'c',
  'cpp': 'cpp',
  'csharp': 'csharp',
  'php': 'php',
  'ruby': 'ruby',
  'swift': 'swift',
  'kotlin': 'kotlin',
  'html': 'xml',
  'css': 'css',
  'scss': 'scss',
  'json': 'json',
  'yaml': 'yaml',
  'markdown': 'markdown',
  'sql': 'sql',
  'bash': 'bash',
  'shell': 'bash',
};

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

  const meta = block.meta as LegacyBlockMeta | undefined;
  const language = meta?.language || 'plaintext';
  const text = getBlockText(block);

  // Generate highlighted HTML
  const highlightedHtml = useMemo(() => {
    if (!text || language === 'plaintext') {
      // Escape HTML entities for plain text
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    try {
      const lowlightLang = LANGUAGE_MAP[language] || language;
      const result = lowlight.highlight(lowlightLang, text);
      return toHtml(result);
    } catch {
      // If highlighting fails, return escaped plain text
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }
  }, [text, language]);

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
  }, [text]);

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
    if (e.key === 'Backspace' && text === '') {
      e.preventDefault();
      onDelete();
      return;
    }
  }, [text, onDelete, onInsertAfter, onUpdate, onFocusPrevious, onFocusNext, block]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLanguageChange = (lang: string) => {
    onUpdate({
      ...block,
      meta: { ...meta, language: lang },
    });
    setShowLanguageMenu(false);
  };

  // Generate line numbers
  const lines = text.split('\n');
  const lineNumbers = lines.map((_: string, i: number) => i + 1);

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
          {lineNumbers.map((num: number) => (
            <div
              key={num}
              className="text-[var(--text-mono)] text-[var(--text-tertiary)] text-right leading-[1.7] h-[1.7em]"
            >
              {num}
            </div>
          ))}
        </div>

        {/* Code area with overlay for syntax highlighting */}
        <div className="flex-1 relative font-mono text-[var(--text-mono)] leading-[1.7]">
          {/* Highlighted code overlay (read-only display) */}
          <pre
            className="absolute inset-0 overflow-hidden pointer-events-none whitespace-pre-wrap break-words m-0 p-0 bg-transparent"
            aria-hidden="true"
          >
            <code
              className="hljs"
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>

          {/* Transparent textarea for editing */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            className="relative w-full bg-transparent text-transparent caret-[var(--text-primary)] font-mono leading-[1.7] resize-none outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="Write code..."
            spellCheck={false}
            rows={1}
            style={{ caretColor: 'var(--text-primary)' }}
          />
        </div>
      </div>
    </div>
  );
}
