"use client";

import { useRef, useEffect, useCallback, KeyboardEvent, useState } from "react";
import { Block, BlockType, getBlockText } from "../types";
import { GitBranch, Code, Eye, AlertCircle } from "lucide-react";
import mermaid from "mermaid";

interface MermaidBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

// Initialize mermaid with default config
mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
  fontFamily: "var(--font-mono, monospace)",
});

const DEFAULT_DIAGRAM = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Do Something]
    B -->|No| D[Do Something Else]
    C --> E[End]
    D --> E`;

export function MermaidBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: MermaidBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedSvg, setRenderedSvg] = useState<string>("");

  const text = getBlockText(block);
  const mermaidCode = text || DEFAULT_DIAGRAM;

  // Focus textarea when editing
  useEffect(() => {
    if (isFocused && isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused, isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [text, isEditing]);

  // Render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!mermaidCode.trim()) {
        setRenderedSvg("");
        setRenderError(null);
        return;
      }

      try {
        // Generate a unique ID for each render
        const id = `mermaid-${block.id}-${Date.now()}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        setRenderedSvg(svg);
        setRenderError(null);
      } catch (error) {
        console.error("Mermaid render error:", error);
        setRenderError(error instanceof Error ? error.message : "Failed to render diagram");
        setRenderedSvg("");
      }
    };

    // Debounce rendering to avoid too many re-renders while typing
    const timeout = setTimeout(renderDiagram, 300);
    return () => clearTimeout(timeout);
  }, [mermaidCode, block.id]);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const content = e.target.value;
      onUpdate({ ...block, content });
    },
    [block, onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Allow Tab for indentation
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const content = text || "";
        const newContent = content.substring(0, start) + "    " + content.substring(end);

        onUpdate({ ...block, content: newContent });

        // Restore cursor position
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 4;
        }, 0);
        return;
      }

      // Escape to exit editing mode
      if (e.key === "Escape") {
        setIsEditing(false);
        return;
      }

      // Arrow up at the start of content
      if (e.key === "ArrowUp" && textareaRef.current?.selectionStart === 0) {
        e.preventDefault();
        onFocusPrevious?.();
        return;
      }

      // Arrow down at the end of content
      if (e.key === "ArrowDown" && textareaRef.current?.selectionEnd === (text || "").length) {
        e.preventDefault();
        onFocusNext?.();
        return;
      }

      // Backspace at start of empty block
      if (e.key === "Backspace" && !text && textareaRef.current?.selectionStart === 0) {
        e.preventDefault();
        onDelete();
        return;
      }
    },
    [block, text, onUpdate, onDelete, onFocusPrevious, onFocusNext]
  );

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      onFocus();
    }
  };

  return (
    <div
      className={`border ${isFocused ? "border-[var(--border-strong)]" : "border-[var(--border-default)]"} bg-[var(--surface-secondary)]`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)] bg-[var(--surface-primary)]">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[var(--text-tertiary)]" />
          <span className="text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Mermaid Diagram
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleEditMode}
            className={`p-1.5 transition-colors ${
              isEditing
                ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
            title={isEditing ? "Preview" : "Edit"}
          >
            {isEditing ? <Eye className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text || DEFAULT_DIAGRAM}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            placeholder="Enter mermaid code..."
            className="w-full min-h-[150px] p-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-body-sm)] text-[var(--text-primary)] font-mono resize-none outline-none focus:border-[var(--border-strong)]"
            spellCheck={false}
          />
        ) : (
          <div
            ref={previewRef}
            onClick={() => setIsEditing(true)}
            className="min-h-[100px] flex items-center justify-center cursor-pointer"
          >
            {renderError ? (
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <AlertCircle className="w-8 h-8 text-[var(--accent-error)]" />
                <p className="text-[var(--text-body-sm)] text-[var(--accent-error)]">Failed to render diagram</p>
                <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] max-w-md">{renderError}</p>
              </div>
            ) : renderedSvg ? (
              <div
                className="mermaid-preview overflow-auto max-w-full"
                dangerouslySetInnerHTML={{ __html: renderedSvg }}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-tertiary)]">
                <GitBranch className="w-8 h-8" />
                <p className="text-[var(--text-body-sm)]">Click to add a Mermaid diagram</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Help text when editing */}
      {isEditing && (
        <div className="px-4 py-2 border-t border-[var(--border-default)] bg-[var(--surface-primary)]">
          <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
            Press <kbd className="px-1 py-0.5 bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[10px]">Esc</kbd> to preview
          </p>
        </div>
      )}
    </div>
  );
}
