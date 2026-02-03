"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Editor as TipTapEditor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Highlighter,
  Subscript,
  Superscript,
  X,
  Sigma,
  Hash,
} from "lucide-react";

interface FormattingToolbarProps {
  isOpen: boolean;
  position: { x: number; y: number };
  editor: TipTapEditor | null;
  onClose: () => void;
}

interface ToolbarButton {
  id: string;
  icon: typeof Bold;
  label: string;
  shortcut: string;
  command: string;
  isActive?: (editor: TipTapEditor) => boolean;
  action?: (editor: TipTapEditor) => void;
  ariaLabel?: string;
}

// Get platform-specific modifier key for display
const getModifierDisplay = () => {
  if (typeof navigator === "undefined") return "Ctrl";
  return navigator.platform.includes("Mac") ? "Cmd" : "Ctrl";
};

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  {
    id: "bold",
    icon: Bold,
    label: "Bold",
    shortcut: "Mod+B",
    command: "toggleBold",
    isActive: (editor) => editor.isActive("bold"),
    action: (editor) => editor.chain().focus().toggleBold().run(),
    ariaLabel: "Toggle bold formatting",
  },
  {
    id: "italic",
    icon: Italic,
    label: "Italic",
    shortcut: "Mod+I",
    command: "toggleItalic",
    isActive: (editor) => editor.isActive("italic"),
    action: (editor) => editor.chain().focus().toggleItalic().run(),
    ariaLabel: "Toggle italic formatting",
  },
  {
    id: "underline",
    icon: Underline,
    label: "Underline",
    shortcut: "Mod+U",
    command: "toggleUnderline",
    isActive: (editor) => editor.isActive("underline"),
    action: (editor) => editor.chain().focus().toggleUnderline().run(),
    ariaLabel: "Toggle underline formatting",
  },
  {
    id: "strikethrough",
    icon: Strikethrough,
    label: "Strikethrough",
    shortcut: "Mod+Shift+S",
    command: "toggleStrike",
    isActive: (editor) => editor.isActive("strike"),
    action: (editor) => editor.chain().focus().toggleStrike().run(),
    ariaLabel: "Toggle strikethrough formatting",
  },
  {
    id: "code",
    icon: Code,
    label: "Inline Code",
    shortcut: "Mod+E",
    command: "toggleCode",
    isActive: (editor) => editor.isActive("code"),
    action: (editor) => editor.chain().focus().toggleCode().run(),
    ariaLabel: "Toggle inline code formatting",
  },
  {
    id: "highlight",
    icon: Highlighter,
    label: "Highlight",
    shortcut: "Mod+Shift+H",
    command: "toggleHighlight",
    isActive: (editor) => editor.isActive("highlight"),
    action: (editor) => editor.chain().focus().toggleHighlight().run(),
    ariaLabel: "Toggle highlight formatting",
  },
  {
    id: "subscript",
    icon: Subscript,
    label: "Subscript",
    shortcut: "Mod+,",
    command: "toggleSubscript",
    isActive: (editor) => editor.isActive("subscript"),
    action: (editor) => editor.chain().focus().toggleSubscript().run(),
    ariaLabel: "Toggle subscript formatting",
  },
  {
    id: "superscript",
    icon: Superscript,
    label: "Superscript",
    shortcut: "Mod+.",
    command: "toggleSuperscript",
    isActive: (editor) => editor.isActive("superscript"),
    action: (editor) => editor.chain().focus().toggleSuperscript().run(),
    ariaLabel: "Toggle superscript formatting",
  },
];

type InputMode = "none" | "link" | "math" | "footnote";

export function FormattingToolbar({
  isOpen,
  position,
  editor,
  onClose,
}: FormattingToolbarProps) {
  const [inputMode, setInputMode] = useState<InputMode>("none");
  const [linkUrl, setLinkUrl] = useState("");
  const [mathLatex, setMathLatex] = useState("");
  const [footnoteId, setFootnoteId] = useState("");
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const mathInputRef = useRef<HTMLInputElement>(null);
  const footnoteInputRef = useRef<HTMLInputElement>(null);
  const [focusedButtonIndex, setFocusedButtonIndex] = useState(-1);

  // Adjust position to keep toolbar in viewport
  useEffect(() => {
    if (!isOpen) return;

    const toolbarWidth = 450; // Approximate width
    const toolbarHeight = 40;
    const padding = 8;

    const viewportWidth = window.innerWidth;

    let newX = position.x - toolbarWidth / 2; // Center on selection
    let newY = position.y - toolbarHeight - 8; // Above selection

    // Check if toolbar would overflow left
    if (newX < padding) {
      newX = padding;
    }

    // Check if toolbar would overflow right
    if (newX + toolbarWidth + padding > viewportWidth) {
      newX = viewportWidth - toolbarWidth - padding;
    }

    // Check if toolbar would overflow top - position below instead
    if (newY < padding) {
      newY = position.y + 24; // Below selection
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [isOpen, position]);

  // Focus input when shown
  useEffect(() => {
    if (inputMode === "link" && linkInputRef.current) {
      // Pre-fill with existing link URL if selection is a link
      if (editor && editor.isActive("link")) {
        const attrs = editor.getAttributes("link");
        setLinkUrl(attrs.href || "");
      }
      linkInputRef.current.focus();
      linkInputRef.current.select();
    } else if (inputMode === "math" && mathInputRef.current) {
      mathInputRef.current.focus();
    } else if (inputMode === "footnote" && footnoteInputRef.current) {
      footnoteInputRef.current.focus();
    }
  }, [inputMode, editor]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // Delay to prevent immediate close
      const timeout = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeout);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || !editor) return;

      if (e.key === "Escape") {
        e.preventDefault();
        if (inputMode !== "none") {
          setInputMode("none");
          setLinkUrl("");
          setMathLatex("");
          setFootnoteId("");
        } else {
          onClose();
        }
        return;
      }

      // Only handle arrow keys when not in input mode
      if (inputMode === "none") {
        const totalButtons = TOOLBAR_BUTTONS.length + 3; // +3 for link, math, footnote

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          setFocusedButtonIndex((prev) => (prev + 1) % totalButtons);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          setFocusedButtonIndex((prev) =>
            prev <= 0 ? totalButtons - 1 : prev - 1
          );
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          // Trigger the focused button action
          if (focusedButtonIndex >= 0 && focusedButtonIndex < TOOLBAR_BUTTONS.length) {
            TOOLBAR_BUTTONS[focusedButtonIndex].action?.(editor);
          } else if (focusedButtonIndex === TOOLBAR_BUTTONS.length) {
            setInputMode("link");
          } else if (focusedButtonIndex === TOOLBAR_BUTTONS.length + 1) {
            setInputMode("math");
          } else if (focusedButtonIndex === TOOLBAR_BUTTONS.length + 2) {
            setInputMode("footnote");
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, inputMode, focusedButtonIndex, editor, onClose]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor) return;

    if (linkUrl.trim()) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl.trim() })
        .run();
    } else {
      // Remove link if URL is empty
      editor.chain().focus().unsetLink().run();
    }

    setLinkUrl("");
    setInputMode("none");
  }, [editor, linkUrl]);

  const handleRemoveLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setLinkUrl("");
    setInputMode("none");
  }, [editor]);

  const handleMathSubmit = useCallback(() => {
    if (!editor) return;

    if (mathLatex.trim()) {
      // Insert inline math node
      editor.commands.insertContent({
        type: "inlineMath",
        attrs: { latex: mathLatex.trim() },
      });
    }

    setMathLatex("");
    setInputMode("none");
  }, [editor, mathLatex]);

  const handleFootnoteSubmit = useCallback(() => {
    if (!editor) return;

    if (footnoteId.trim()) {
      // Insert footnote reference mark
      editor.commands.setFootnoteRef({ footnoteId: footnoteId.trim() });
    }

    setFootnoteId("");
    setInputMode("none");
  }, [editor, footnoteId]);

  const handleInputKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLInputElement>,
      submitFn: () => void,
      clearFn: () => void
    ) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitFn();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        clearFn();
        setInputMode("none");
      }
    },
    []
  );

  if (!isOpen || !editor) return null;

  const isLinkActive = editor.isActive("link");
  const modKey = getModifierDisplay();

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center bg-[var(--surface-primary)] border border-[var(--border-strong)] shadow-lg rounded-sm"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="toolbar"
      aria-label="Text formatting toolbar"
    >
      {inputMode === "none" && (
        <>
          {TOOLBAR_BUTTONS.map((button, index) => {
            const Icon = button.icon;
            const isActive = button.isActive ? button.isActive(editor) : false;
            const isFocused = focusedButtonIndex === index;

            return (
              <button
                key={button.id}
                type="button"
                className={`
                  w-8 h-8 flex items-center justify-center
                  ${isActive ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}
                  ${isFocused ? "ring-2 ring-inset ring-[var(--accent-interactive)]" : ""}
                  hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]
                  ${index === 0 ? "" : "border-l border-[var(--border-default)]"}
                  transition-colors
                `}
                onClick={() => button.action?.(editor)}
                title={`${button.label} (${button.shortcut.replace("Mod", modKey)})`}
                aria-label={button.ariaLabel}
                aria-pressed={isActive}
                tabIndex={isFocused ? 0 : -1}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}

          {/* Divider */}
          <div className="w-px h-4 bg-[var(--border-default)] mx-1" />

          {/* Link button */}
          <button
            type="button"
            className={`
              w-8 h-8 flex items-center justify-center
              ${isLinkActive ? "bg-[var(--surface-hover)] text-[var(--accent-interactive)]" : "text-[var(--text-secondary)]"}
              ${focusedButtonIndex === TOOLBAR_BUTTONS.length ? "ring-2 ring-inset ring-[var(--accent-interactive)]" : ""}
              hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]
              border-l border-[var(--border-default)]
              transition-colors
            `}
            onClick={() => setInputMode("link")}
            title={`Link (${modKey}+K)`}
            aria-label="Insert or edit link"
            aria-pressed={isLinkActive}
            tabIndex={focusedButtonIndex === TOOLBAR_BUTTONS.length ? 0 : -1}
          >
            <Link className="w-4 h-4" />
          </button>

          {/* Math button */}
          <button
            type="button"
            className={`
              w-8 h-8 flex items-center justify-center
              text-[var(--text-secondary)]
              ${focusedButtonIndex === TOOLBAR_BUTTONS.length + 1 ? "ring-2 ring-inset ring-[var(--accent-interactive)]" : ""}
              hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]
              border-l border-[var(--border-default)]
              transition-colors
            `}
            onClick={() => setInputMode("math")}
            title={`Inline Math (${modKey}+Shift+M)`}
            aria-label="Insert inline math"
            tabIndex={focusedButtonIndex === TOOLBAR_BUTTONS.length + 1 ? 0 : -1}
          >
            <Sigma className="w-4 h-4" />
          </button>

          {/* Footnote button */}
          <button
            type="button"
            className={`
              w-8 h-8 flex items-center justify-center
              text-[var(--text-secondary)]
              ${focusedButtonIndex === TOOLBAR_BUTTONS.length + 2 ? "ring-2 ring-inset ring-[var(--accent-interactive)]" : ""}
              hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]
              border-l border-[var(--border-default)]
              transition-colors
            `}
            onClick={() => setInputMode("footnote")}
            title="Insert Footnote Reference"
            aria-label="Insert footnote reference"
            tabIndex={focusedButtonIndex === TOOLBAR_BUTTONS.length + 2 ? 0 : -1}
          >
            <Hash className="w-4 h-4" />
          </button>
        </>
      )}

      {inputMode === "link" && (
        <div className="flex items-center px-2 gap-1">
          <Link className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Paste link URL..."
            className="w-48 h-8 px-2 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            onKeyDown={(e) =>
              handleInputKeyDown(e, handleLinkSubmit, () => setLinkUrl(""))
            }
            aria-label="Link URL"
          />
          <button
            type="button"
            className="px-2 h-6 text-xs text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)] rounded transition-colors"
            onClick={handleLinkSubmit}
          >
            Apply
          </button>
          {isLinkActive && (
            <button
              type="button"
              className="px-2 h-6 text-xs text-[var(--accent-error)] font-medium hover:bg-[var(--surface-hover)] rounded transition-colors"
              onClick={handleRemoveLink}
              title="Remove link"
              aria-label="Remove link"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {inputMode === "math" && (
        <div className="flex items-center px-2 gap-1">
          <Sigma className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={mathInputRef}
            type="text"
            value={mathLatex}
            onChange={(e) => setMathLatex(e.target.value)}
            placeholder="LaTeX expression..."
            className="w-48 h-8 px-2 bg-transparent text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            onKeyDown={(e) =>
              handleInputKeyDown(e, handleMathSubmit, () => setMathLatex(""))
            }
            aria-label="LaTeX expression"
          />
          <button
            type="button"
            className="px-2 h-6 text-xs text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)] rounded transition-colors"
            onClick={handleMathSubmit}
          >
            Insert
          </button>
          <button
            type="button"
            className="p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] rounded transition-colors"
            onClick={() => {
              setMathLatex("");
              setInputMode("none");
            }}
            title="Cancel"
            aria-label="Cancel"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {inputMode === "footnote" && (
        <div className="flex items-center px-2 gap-1">
          <Hash className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
          <input
            ref={footnoteInputRef}
            type="text"
            value={footnoteId}
            onChange={(e) => setFootnoteId(e.target.value)}
            placeholder="Footnote ID (e.g., 1, note1)..."
            className="w-48 h-8 px-2 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            onKeyDown={(e) =>
              handleInputKeyDown(e, handleFootnoteSubmit, () =>
                setFootnoteId("")
              )
            }
            aria-label="Footnote identifier"
          />
          <button
            type="button"
            className="px-2 h-6 text-xs text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)] rounded transition-colors"
            onClick={handleFootnoteSubmit}
          >
            Insert
          </button>
          <button
            type="button"
            className="p-1 text-[var(--text-tertiary)] hover:bg-[var(--surface-hover)] rounded transition-colors"
            onClick={() => {
              setFootnoteId("");
              setInputMode("none");
            }}
            title="Cancel"
            aria-label="Cancel"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default FormattingToolbar;
