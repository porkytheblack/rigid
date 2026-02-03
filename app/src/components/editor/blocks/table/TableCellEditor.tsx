"use client";

import { useRef, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { useEditor, EditorContent, Editor as TipTapEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import type { BlockContent, Mark, MarkType } from "../../types";
import type { CellPosition } from "./types";

export interface TableCellEditorProps {
  /** Cell content */
  content: BlockContent;
  /** Cell position */
  position: CellPosition;
  /** Whether this cell is focused */
  isFocused: boolean;
  /** Whether this cell is selected (part of selection) */
  isSelected: boolean;
  /** Whether this cell is the header row */
  isHeader: boolean;
  /** Text alignment */
  align: 'left' | 'center' | 'right' | null;
  /** Callback when content changes */
  onContentChange: (position: CellPosition, content: BlockContent) => void;
  /** Callback when focus changes */
  onFocus: (position: CellPosition) => void;
  /** Callback for navigation keys (returns true if handled) */
  onNavigate: (position: CellPosition, direction: 'up' | 'down' | 'left' | 'right' | 'tab' | 'shift-tab' | 'enter') => boolean;
  /** Callback when escape is pressed */
  onEscape: () => void;
  /** Callback to open formatting toolbar */
  onOpenFormattingToolbar?: (position: { x: number; y: number }, editor: TipTapEditor) => void;
}

export interface TableCellEditorHandle {
  focus: () => void;
  focusEnd: () => void;
  focusStart: () => void;
  getEditor: () => TipTapEditor | null;
}

/**
 * Convert TipTap editor content to our BlockContent format
 */
function extractContentFromEditor(editor: TipTapEditor): BlockContent {
  const json = editor.getJSON();
  const marks: Mark[] = [];
  let text = '';

  function processNode(node: Record<string, unknown>, offset: number = 0): number {
    if (node.type === 'text' && typeof node.text === 'string') {
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
            case 'link': {
              const attrs = markObj.attrs || {};
              marks.push({
                type: 'link',
                from: startOffset,
                to: endOffset,
                attrs: {
                  href: attrs.href as string | undefined,
                  title: attrs.title as string | undefined,
                },
              });
              continue;
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

  marks.sort((a, b) => a.from - b.from || a.to - b.to);

  return { text, marks };
}

/**
 * Convert BlockContent to TipTap content format
 */
function contentToTipTap(content: BlockContent): Record<string, unknown> {
  const { text, marks } = content;

  if (!text && marks.length === 0) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
  }

  interface Segment {
    text: string;
    marks: Array<{ type: string; attrs?: Record<string, unknown> }>;
  }

  const segments: Segment[] = [];
  const boundaries: Array<{ offset: number; type: 'start' | 'end'; mark: Mark }> = [];

  for (const mark of marks) {
    boundaries.push({ offset: mark.from, type: 'start', mark });
    boundaries.push({ offset: mark.to, type: 'end', mark });
  }
  boundaries.sort((a, b) => a.offset - b.offset);

  const activeMarks: Mark[] = [];
  let currentPos = 0;

  for (const boundary of boundaries) {
    if (boundary.offset > currentPos) {
      const segmentText = text.slice(currentPos, boundary.offset);
      if (segmentText) {
        segments.push({
          text: segmentText,
          marks: activeMarks.map((m) => markToTipTap(m)),
        });
      }
    }

    if (boundary.type === 'start') {
      activeMarks.push(boundary.mark);
    } else {
      const idx = activeMarks.findIndex(
        (m) =>
          m.type === boundary.mark.type &&
          m.from === boundary.mark.from &&
          m.to === boundary.mark.to
      );
      if (idx !== -1) {
        activeMarks.splice(idx, 1);
      }
    }

    currentPos = boundary.offset;
  }

  if (currentPos < text.length) {
    segments.push({
      text: text.slice(currentPos),
      marks: activeMarks.map((m) => markToTipTap(m)),
    });
  }

  if (segments.length === 0 && text) {
    segments.push({ text, marks: [] });
  }

  const tipTapContent: Array<Record<string, unknown>> = segments.map((seg) => ({
    type: 'text',
    text: seg.text,
    ...(seg.marks.length > 0 ? { marks: seg.marks } : {}),
  }));

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: tipTapContent.length > 0 ? tipTapContent : undefined,
      },
    ],
  };
}

function markToTipTap(mark: Mark): { type: string; attrs?: Record<string, unknown> } {
  switch (mark.type) {
    case 'bold':
      return { type: 'bold' };
    case 'italic':
      return { type: 'italic' };
    case 'strikethrough':
      return { type: 'strike' };
    case 'code':
      return { type: 'code' };
    case 'underline':
      return { type: 'underline' };
    case 'highlight':
      return { type: 'highlight' };
    case 'subscript':
      return { type: 'subscript' };
    case 'superscript':
      return { type: 'superscript' };
    case 'link':
      return {
        type: 'link',
        attrs: {
          href: mark.attrs?.href || '',
          target: '_blank',
        },
      };
    default:
      return { type: 'bold' };
  }
}

export const TableCellEditor = forwardRef<TableCellEditorHandle, TableCellEditorProps>(
  function TableCellEditor(
    {
      content,
      position,
      isFocused,
      isSelected,
      isHeader,
      align,
      onContentChange,
      onFocus,
      onNavigate,
      onEscape,
      onOpenFormattingToolbar,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastContentRef = useRef<string>(content.text);
    const isUpdatingRef = useRef(false);

    const initialContent = useMemo(() => {
      lastContentRef.current = content.text;
      return contentToTipTap(content);
    }, []);

    const editor = useEditor({
      immediatelyRender: false, // Prevent SSR hydration mismatch
      extensions: [
        StarterKit.configure({
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
          placeholder: '',
          showOnlyWhenEditable: true,
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-[var(--accent-interactive)] underline cursor-pointer',
          },
        }),
        Underline,
        Highlight.configure({
          HTMLAttributes: {
            class: 'bg-yellow-200 dark:bg-yellow-800',
          },
        }),
        Subscript,
        Superscript,
      ],
      content: initialContent,
      editorProps: {
        attributes: {
          class: 'outline-none min-h-[1.5em] w-full',
        },
        handleKeyDown: (view, event) => {
          const { state } = view;
          const { selection } = state;
          const { $from, $to } = selection;
          const isAtStart = $from.parentOffset === 0;
          const isAtEnd = $from.parentOffset === $from.parent.content.size;
          const isEmpty = $from.parent.content.size === 0;
          const isCollapsed = $from.pos === $to.pos;

          // Tab - navigate to next cell
          if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            if (onNavigate(position, 'tab')) {
              return true;
            }
          }

          // Shift+Tab - navigate to previous cell
          if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            if (onNavigate(position, 'shift-tab')) {
              return true;
            }
          }

          // Enter - move to cell below or add row
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (onNavigate(position, 'enter')) {
              return true;
            }
          }

          // Arrow keys for navigation
          if (event.key === 'ArrowUp' && isCollapsed && isAtStart) {
            event.preventDefault();
            if (onNavigate(position, 'up')) {
              return true;
            }
          }

          if (event.key === 'ArrowDown' && isCollapsed && isAtEnd) {
            event.preventDefault();
            if (onNavigate(position, 'down')) {
              return true;
            }
          }

          if (event.key === 'ArrowLeft' && isCollapsed && isAtStart) {
            event.preventDefault();
            if (onNavigate(position, 'left')) {
              return true;
            }
          }

          if (event.key === 'ArrowRight' && isCollapsed && isAtEnd) {
            event.preventDefault();
            if (onNavigate(position, 'right')) {
              return true;
            }
          }

          // Escape - exit cell editing
          if (event.key === 'Escape') {
            event.preventDefault();
            onEscape();
            return true;
          }

          return false;
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (isUpdatingRef.current) return;

        const newContent = extractContentFromEditor(ed);

        if (newContent.text !== lastContentRef.current || newContent.marks.length > 0) {
          lastContentRef.current = newContent.text;
          onContentChange(position, newContent);
        }
      },
      onFocus: () => {
        onFocus(position);
      },
      onSelectionUpdate: ({ editor: ed }) => {
        if (!onOpenFormattingToolbar) return;

        const { from, to } = ed.state.selection;
        const hasSelection = from !== to;

        if (hasSelection) {
          const { view } = ed;
          const coords = view.coordsAtPos(from);
          onOpenFormattingToolbar({ x: coords.left, y: coords.top - 8 }, ed);
        }
      },
    });

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => {
        editor?.commands.focus();
      },
      focusEnd: () => {
        editor?.commands.focus('end');
      },
      focusStart: () => {
        editor?.commands.focus('start');
      },
      getEditor: () => editor,
    }));

    // Focus handling
    useEffect(() => {
      if (isFocused && editor && !editor.isFocused) {
        requestAnimationFrame(() => {
          editor.commands.focus('end');
        });
      }
    }, [isFocused, editor]);

    // Sync content when it changes externally
    useEffect(() => {
      if (!editor || isUpdatingRef.current) return;

      if (content.text !== lastContentRef.current) {
        isUpdatingRef.current = true;
        lastContentRef.current = content.text;
        editor.commands.setContent(contentToTipTap(content));
        isUpdatingRef.current = false;
      }
    }, [content, editor]);

    const getAlignClass = () => {
      switch (align) {
        case 'center':
          return 'text-center';
        case 'right':
          return 'text-right';
        default:
          return 'text-left';
      }
    };

    return (
      <div
        ref={containerRef}
        className={`
          w-full min-h-[1.5em] px-2 py-1
          ${getAlignClass()}
          ${isHeader ? 'font-semibold' : ''}
          ${isSelected ? 'bg-[var(--accent-muted)]' : ''}
        `}
      >
        <EditorContent editor={editor} />
      </div>
    );
  }
);

export default TableCellEditor;
