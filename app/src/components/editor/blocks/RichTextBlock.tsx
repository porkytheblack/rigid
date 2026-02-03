"use client";

import { useRef, useEffect, useMemo } from "react";
import { useEditor, EditorContent, Editor as TipTapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Extension } from "@tiptap/core";
import {
  Block,
  BlockType,
  getBlockPlaceholder,
  getBlockText,
  Mark,
  MarkType,
  BlockContent,
} from "../types";
import { parseMarkdownShortcut } from "../utils";
import { FootnoteRef, InlineMath } from "../extensions";

/**
 * Custom keyboard shortcuts extension for additional shortcuts
 * beyond what TipTap's StarterKit provides
 */
const CustomKeyboardShortcuts = Extension.create({
  name: 'customKeyboardShortcuts',

  addKeyboardShortcuts() {
    return {
      // Ctrl+` or Cmd+` for inline code (in addition to Ctrl+E)
      'Mod-`': () => this.editor.chain().focus().toggleCode().run(),

      // Ctrl+Shift+S for strikethrough
      'Mod-Shift-s': () => this.editor.chain().focus().toggleStrike().run(),

      // Ctrl+Shift+H for highlight
      'Mod-Shift-h': () => this.editor.chain().focus().toggleHighlight().run(),

      // Note: Ctrl+Shift+M for inline math is handled in InlineMath extension
    };
  },
});

interface RichTextBlockProps {
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
  onOpenFormattingToolbar?: (
    position: { x: number; y: number },
    editor: TipTapEditor
  ) => void;
  onCloseFormattingToolbar?: () => void;
}

/**
 * Convert TipTap editor content to our Mark format
 */
function extractMarksFromEditor(
  editor: TipTapEditor
): { text: string; marks: Mark[] } {
  const json = editor.getJSON();
  const marks: Mark[] = [];
  let text = "";

  function processNode(
    node: Record<string, unknown>,
    offset: number = 0
  ): number {
    if (node.type === "text" && typeof node.text === "string") {
      const textContent = node.text;
      const startOffset = offset;
      const endOffset = offset + textContent.length;

      // Process marks on this text node
      if (Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          const markObj = mark as { type: string; attrs?: Record<string, unknown> };
          let markType: MarkType | null = null;

          switch (markObj.type) {
            case 'bold':
              markType = 'bold';
              break;
            case 'italic':
              markType = 'italic';
              break;
            case 'strike':
              markType = 'strikethrough';
              break;
            case 'code':
              markType = 'code';
              break;
            case 'underline':
              markType = 'underline';
              break;
            case 'highlight':
              markType = 'highlight';
              break;
            case 'subscript':
              markType = 'subscript';
              break;
            case 'superscript':
              markType = 'superscript';
              break;
            case "link": {
              const attrs = markObj.attrs || {};
              marks.push({
                type: "link",
                from: startOffset,
                to: endOffset,
                attrs: {
                  href: attrs.href as string | undefined,
                  title: attrs.title as string | undefined,
                },
              });
              continue; // Skip adding again below
            }
            case "footnoteRef": {
              const attrs = markObj.attrs || {};
              marks.push({
                type: "footnoteRef",
                from: startOffset,
                to: endOffset,
                attrs: {
                  footnoteId: attrs.footnoteId as string | undefined,
                },
              });
              continue;
            }
            case "inlineMath": {
              // Treat inline math as code for mark type
              markType = "code";
              break;
            }
          }

          if (markType) {
            marks.push({
              type: markType,
              from: startOffset,
              to: endOffset,
            });
          }
        }
      }

      text += textContent;
      return endOffset;
    }

    if (node.type === 'hardBreak') {
      text += '\n';
      return offset + 1;
    }

    // Process children
    if (Array.isArray(node.content)) {
      let currentOffset = offset;
      for (const child of node.content) {
        currentOffset = processNode(child as Record<string, unknown>, currentOffset);
      }
      return currentOffset;
    }

    return offset;
  }

  if (json.content) {
    processNode({ content: json.content } as Record<string, unknown>);
  }

  // Sort marks by position and merge adjacent marks of the same type
  marks.sort((a, b) => a.from - b.from || a.to - b.to);

  return { text, marks };
}

/**
 * Convert our Mark format to TipTap editor content
 */
function marksToTipTapContent(
  text: string,
  marks: Mark[]
): Record<string, unknown> {
  if (!text && marks.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  // Build marked text segments
  interface Segment {
    text: string;
    marks: Array<{ type: string; attrs?: Record<string, unknown> }>;
  }

  const segments: Segment[] = [];

  // Collect all boundary points
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(text.length);

  for (const mark of marks) {
    boundaries.add(mark.from);
    boundaries.add(mark.to);
  }

  // Sort boundaries
  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  // Build segments
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];

    if (start >= end) continue;

    const segmentText = text.slice(start, end);
    if (!segmentText) continue;

    // Find all marks that cover this segment
    const activeMarks = marks.filter(
      (mark) => mark.from <= start && mark.to >= end
    );

    segments.push({
      text: segmentText,
      marks: activeMarks.map((m) => markToTipTap(m)),
    });
  }

  // If no segments, create one with the full text
  if (segments.length === 0 && text) {
    segments.push({ text, marks: [] });
  }

  // Convert segments to TipTap content
  const content: Array<Record<string, unknown>> = segments.map((seg) => ({
    type: "text",
    text: seg.text,
    ...(seg.marks.length > 0 ? { marks: seg.marks } : {}),
  }));

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: content.length > 0 ? content : undefined,
      },
    ],
  };
}

function markToTipTap(
  mark: Mark
): { type: string; attrs?: Record<string, unknown> } {
  switch (mark.type) {
    case "bold":
      return { type: "bold" };
    case "italic":
      return { type: "italic" };
    case "strikethrough":
      return { type: "strike" };
    case "code":
      return { type: "code" };
    case "underline":
      return { type: "underline" };
    case "highlight":
      return { type: "highlight" };
    case "subscript":
      return { type: "subscript" };
    case "superscript":
      return { type: "superscript" };
    case "link":
      return {
        type: "link",
        attrs: {
          href: mark.attrs?.href || "",
          target: "_blank",
        },
      };
    case "footnoteRef":
      return {
        type: "footnoteRef",
        attrs: {
          footnoteId: mark.attrs?.footnoteId || "",
        },
      };
    default:
      return { type: "bold" }; // Fallback
  }
}

export function RichTextBlock({
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
  onOpenFormattingToolbar,
  onCloseFormattingToolbar,
}: RichTextBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef<BlockContent>({ text: "", marks: [] });
  const isUpdatingRef = useRef(false);
  const isFocusedRef = useRef(isFocused);

  // Keep isFocused ref in sync
  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  // Get initial content
  const initialContent = useMemo(() => {
    const text = getBlockText(block);
    let marks: Mark[] = [];

    // Extract marks from block content
    if (typeof block.content === "object" && "marks" in block.content) {
      marks = [...block.content.marks];
    } else if (block.styles) {
      // Legacy styles conversion
      marks = block.styles.map((style) => ({
        type: style.type as MarkType,
        from: style.start,
        to: style.end,
        attrs: style.data
          ? { href: style.data.url, title: style.data.title }
          : undefined,
      }));
    }

    lastContentRef.current = { text, marks };
    return marksToTipTapContent(text, marks);
  }, []);

  const editor = useEditor({
    immediatelyRender: false, // Prevent SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        // Disable features we don't need at block level
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: {
          keepMarks: true,
        },
      }),
      Placeholder.configure({
        placeholder: getBlockPlaceholder(block.type),
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class:
            "text-[var(--accent-interactive)] underline cursor-pointer hover:text-[var(--accent-interactive-hover)]",
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class: "bg-yellow-200 dark:bg-yellow-800/50 px-0.5 rounded",
        },
      }),
      Subscript,
      Superscript,
      FootnoteRef,
      InlineMath,
      CustomKeyboardShortcuts,
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "outline-none w-full",
        role: "textbox",
        "aria-multiline": "false",
        "aria-label": `${block.type} block content`,
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { selection } = state;
        const { $from } = selection;
        const isAtStart = $from.parentOffset === 0;
        const isAtEnd = $from.parentOffset === $from.parent.content.size;
        const isEmpty = $from.parent.content.size === 0;

        // Enter - insert new block (but not if slash menu is open)
        if (event.key === 'Enter' && !event.shiftKey && !isSlashMenuOpen) {
          event.preventDefault();
          onInsertAfter();
          return true;
        }

        // If slash menu is open, let it handle navigation
        if (isSlashMenuOpen && ['Enter', 'Escape', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
          return false; // Let the event bubble up
        }

        // Backspace at start of empty block - delete block
        if (event.key === 'Backspace' && isEmpty && isAtStart) {
          event.preventDefault();
          onDelete();
          return true;
        }

        // Backspace at start of non-empty block - merge or convert
        if (event.key === 'Backspace' && isAtStart && !isEmpty && block.type !== 'paragraph') {
          event.preventDefault();
          onTurnInto('paragraph');
          return true;
        }

        // Tab - indent
        if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          onIndent();
          return true;
        }

        // Shift+Tab - outdent
        if (event.key === 'Tab' && event.shiftKey) {
          event.preventDefault();
          onOutdent();
          return true;
        }

        // Cmd/Ctrl + Shift + Up - move up
        if (event.key === 'ArrowUp' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
          event.preventDefault();
          onMoveUp();
          return true;
        }

        // Cmd/Ctrl + Shift + Down - move down
        if (event.key === 'ArrowDown' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
          event.preventDefault();
          onMoveDown();
          return true;
        }

        // Arrow up at start - focus previous block
        if (event.key === 'ArrowUp' && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
          if (isAtStart && onFocusPrevious) {
            event.preventDefault();
            onFocusPrevious();
            return true;
          }
        }

        // Arrow down at end - focus next block
        if (event.key === 'ArrowDown' && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
          if (isAtEnd && onFocusNext) {
            event.preventDefault();
            onFocusNext();
            return true;
          }
        }

        // Slash - open command menu
        if (event.key === '/' && !isSlashMenuOpen) {
          // Get cursor position for menu
          const { view } = editor!;
          const coords = view.coordsAtPos(selection.from);
          onOpenSlashMenu({ x: coords.left, y: coords.bottom + 4 });
          // Don't prevent default - let the slash be typed
          return false;
        }

        // Ctrl/Cmd + K for link
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
          event.preventDefault();
          // If there's a selection, show the formatting toolbar for link input
          if (!selection.empty && onOpenFormattingToolbar) {
            const { view } = editor!;
            const coords = view.coordsAtPos(selection.from);
            onOpenFormattingToolbar({ x: coords.left, y: coords.top - 8 }, editor!);
          } else if (editor!.isActive('link')) {
            // If cursor is on a link, remove it
            editor!.chain().focus().unsetLink().run();
          }
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isUpdatingRef.current) return;

      const { text, marks } = extractMarksFromEditor(editor);

      // Check for markdown shortcuts
      const shortcut = parseMarkdownShortcut(text);
      if (shortcut && shortcut.type !== block.type) {
        onTurnInto(shortcut.type);
        // Update content after transformation
        setTimeout(() => {
          isUpdatingRef.current = true;
          const newContent: BlockContent = { text: shortcut.content, marks: [] };
          onUpdate({
            ...block,
            type: shortcut.type,
            content: newContent,
          });
          editor.commands.setContent(marksToTipTapContent(shortcut.content, []));
          isUpdatingRef.current = false;
        }, 0);
        return;
      }

      // Check if content actually changed
      const prevContent = lastContentRef.current;
      const textChanged = text !== prevContent.text;
      const marksChanged =
        marks.length !== prevContent.marks.length ||
        marks.some(
          (m, i) =>
            !prevContent.marks[i] ||
            m.type !== prevContent.marks[i].type ||
            m.from !== prevContent.marks[i].from ||
            m.to !== prevContent.marks[i].to
        );

      if (textChanged || marksChanged) {
        lastContentRef.current = { text, marks };
        // Update with full BlockContent including marks
        onUpdate({
          ...block,
          content: { text, marks },
        });
      }
    },
    onFocus: () => {
      onFocus();
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      if (hasSelection && onOpenFormattingToolbar) {
        // Get selection coordinates for positioning the toolbar
        const { view } = editor;
        const startCoords = view.coordsAtPos(from);
        const endCoords = view.coordsAtPos(to);

        // Position toolbar above the selection, centered
        const centerX = (startCoords.left + endCoords.right) / 2;
        const topY = Math.min(startCoords.top, endCoords.top);

        onOpenFormattingToolbar({ x: centerX, y: topY - 8 }, editor);
      } else if (onCloseFormattingToolbar) {
        onCloseFormattingToolbar();
      }
    },
    onBlur: () => {
      // Small delay to allow clicking toolbar buttons
      setTimeout(() => {
        if (onCloseFormattingToolbar && !isFocusedRef.current) {
          onCloseFormattingToolbar();
        }
      }, 150);
    },
  });

  // Focus handling
  useEffect(() => {
    if (isFocused && editor && !editor.isFocused) {
      requestAnimationFrame(() => {
        editor.commands.focus('end');
      });
    }
  }, [isFocused, editor]);

  // Sync content when block changes externally
  useEffect(() => {
    if (!editor || isUpdatingRef.current) return;

    const currentText = getBlockText(block);
    if (currentText !== lastContentRef.current.text) {
      isUpdatingRef.current = true;

      const marks: Mark[] = [];
      if (typeof block.content === 'object' && 'marks' in block.content) {
        marks.push(...block.content.marks);
      }

      lastContentRef.current = { text: currentText, marks };
      editor.commands.setContent(marksToTipTapContent(currentText, marks));
      isUpdatingRef.current = false;
    }
  }, [block, editor]);

  const getBlockStyles = () => {
    switch (block.type) {
      case 'heading1':
        return 'text-[32px] font-bold leading-[1.4] tracking-[-0.02em] mt-8 mb-4';
      case 'heading2':
        return 'text-[24px] font-bold leading-[1.4] tracking-[-0.02em] mt-7 mb-3';
      case 'heading3':
        return 'text-[18px] font-bold leading-[1.4] tracking-[-0.01em] mt-6 mb-2';
      case 'heading4':
        return 'text-[16px] font-bold leading-[1.4] mt-5 mb-2';
      case 'heading5':
        return 'text-[14px] font-bold leading-[1.4] mt-4 mb-1';
      case 'heading6':
        return 'text-[12px] font-bold leading-[1.4] uppercase tracking-wide mt-4 mb-1';
      case 'quote':
      case 'blockquote':
        return 'border-l-[3px] border-[var(--text-primary)] pl-5 text-[var(--text-secondary)] italic';
      default:
        return 'text-[var(--text-body-md)] leading-[1.7]';
    }
  };

  return (
    <div ref={containerRef} className={`w-full ${getBlockStyles()}`}>
      <EditorContent editor={editor} />
    </div>
  );
}

export default RichTextBlock;
