/**
 * Utilities for converting between TipTap editor JSON and BlockContent format.
 *
 * This module provides bidirectional conversion between:
 * - TipTap's ProseMirror document JSON (nested nodes with inline marks)
 * - Our flat BlockContent format (text string + marks array with offsets)
 */

import type { Editor as TipTapEditor, JSONContent } from "@tiptap/react";
import type { Mark, MarkType, MarkAttrs, BlockContent } from "../types";

/**
 * TipTap mark representation
 */
interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * TipTap text node representation
 */
interface TipTapTextNode {
  type: "text";
  text: string;
  marks?: TipTapMark[];
}

/**
 * Map TipTap mark type to our MarkType
 */
function tipTapMarkTypeToMarkType(tipTapType: string): MarkType | null {
  const mapping: Record<string, MarkType> = {
    bold: "bold",
    italic: "italic",
    strike: "strikethrough",
    code: "code",
    underline: "underline",
    highlight: "highlight",
    subscript: "subscript",
    superscript: "superscript",
    link: "link",
    footnoteRef: "footnoteRef",
    inlineMath: "code", // Map inline math to code for now, will be handled specially
  };
  return mapping[tipTapType] || null;
}

/**
 * Map our MarkType to TipTap mark type
 */
function markTypeToTipTapMarkType(markType: MarkType): string {
  const mapping: Record<MarkType, string> = {
    bold: "bold",
    italic: "italic",
    strikethrough: "strike",
    code: "code",
    underline: "underline",
    highlight: "highlight",
    subscript: "subscript",
    superscript: "superscript",
    link: "link",
    footnoteRef: "footnoteRef",
  };
  return mapping[markType] || "bold";
}

/**
 * Extract marks and text from a TipTap editor instance.
 * Converts TipTap's nested mark structure to our flat marks array.
 */
export function extractMarksFromEditor(editor: TipTapEditor): BlockContent {
  const json = editor.getJSON();
  return extractMarksFromJSON(json);
}

/**
 * Extract marks and text from TipTap JSON content.
 */
export function extractMarksFromJSON(json: JSONContent): BlockContent {
  const marks: Mark[] = [];
  let text = "";

  function processNode(node: JSONContent, offset: number = 0): number {
    // Handle text nodes
    if (node.type === "text" && typeof node.text === "string") {
      const textContent = node.text;
      const startOffset = offset;
      const endOffset = offset + textContent.length;

      // Process marks on this text node
      if (Array.isArray(node.marks)) {
        for (const mark of node.marks) {
          const tipTapMark = mark as TipTapMark;
          const markType = tipTapMarkTypeToMarkType(tipTapMark.type);

          if (markType === "link") {
            // Handle link with attributes
            const attrs = tipTapMark.attrs || {};
            marks.push({
              type: "link",
              from: startOffset,
              to: endOffset,
              attrs: {
                href: attrs.href as string | undefined,
                title: attrs.title as string | undefined,
              },
            });
          } else if (tipTapMark.type === "footnoteRef") {
            // Handle footnote reference with attributes
            const attrs = tipTapMark.attrs || {};
            marks.push({
              type: "footnoteRef",
              from: startOffset,
              to: endOffset,
              attrs: {
                footnoteId: attrs.footnoteId as string | undefined,
              },
            });
          } else if (markType) {
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

    // Handle hard breaks
    if (node.type === "hardBreak") {
      text += "\n";
      return offset + 1;
    }

    // Process children of container nodes (paragraph, doc, etc.)
    if (Array.isArray(node.content)) {
      let currentOffset = offset;
      for (const child of node.content) {
        currentOffset = processNode(child, currentOffset);
      }
      return currentOffset;
    }

    return offset;
  }

  if (json.content) {
    processNode({ content: json.content } as JSONContent);
  }

  // Sort marks by position and merge adjacent marks of the same type
  marks.sort((a, b) => a.from - b.from || a.to - b.to);

  // Merge adjacent marks of the same type
  const mergedMarks = mergeAdjacentMarks(marks);

  return { text, marks: mergedMarks };
}

/**
 * Merge adjacent marks of the same type into single marks.
 */
function mergeAdjacentMarks(marks: Mark[]): Mark[] {
  if (marks.length === 0) return marks;

  const result: Mark[] = [];
  const sortedMarks = [...marks].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.from - b.from;
  });

  // Group by type and merge adjacent
  const byType = new Map<MarkType, Mark[]>();
  for (const mark of sortedMarks) {
    if (!byType.has(mark.type)) {
      byType.set(mark.type, []);
    }
    byType.get(mark.type)!.push(mark);
  }

  for (const [type, typeMarks] of byType) {
    // Sort by start position
    typeMarks.sort((a, b) => a.from - b.from);

    let current: Mark | null = null;
    for (const mark of typeMarks) {
      if (current === null) {
        current = { ...mark };
      } else if (current.to >= mark.from && marksHaveSameAttrs(current, mark)) {
        // Merge overlapping or adjacent marks with same attrs
        current.to = Math.max(current.to, mark.to);
      } else {
        result.push(current);
        current = { ...mark };
      }
    }
    if (current) {
      result.push(current);
    }
  }

  // Re-sort by position
  result.sort((a, b) => a.from - b.from || a.to - b.to);

  return result;
}

/**
 * Check if two marks have the same attributes.
 */
function marksHaveSameAttrs(a: Mark, b: Mark): boolean {
  if (a.type !== b.type) return false;

  const aAttrs = a.attrs || {};
  const bAttrs = b.attrs || {};

  const aKeys = Object.keys(aAttrs);
  const bKeys = Object.keys(bAttrs);

  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (aAttrs[key as keyof MarkAttrs] !== bAttrs[key as keyof MarkAttrs]) {
      return false;
    }
  }

  return true;
}

/**
 * Convert our BlockContent format to TipTap JSON content.
 */
export function marksToTipTapContent(text: string, marks: Mark[]): JSONContent {
  if (!text && marks.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  // Build segments with their active marks
  const segments = buildSegments(text, marks);

  // Convert segments to TipTap text nodes
  const content: JSONContent[] = segments.map((seg) => {
    const node: JSONContent = {
      type: "text",
      text: seg.text,
    };

    if (seg.marks.length > 0) {
      node.marks = seg.marks.map((mark) => markToTipTapMark(mark));
    }

    return node;
  });

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

/**
 * Segment of text with its active marks.
 */
interface TextSegment {
  text: string;
  marks: Mark[];
}

/**
 * Build text segments from text and marks.
 * Each segment has a consistent set of marks applied.
 */
function buildSegments(text: string, marks: Mark[]): TextSegment[] {
  if (marks.length === 0) {
    return text ? [{ text, marks: [] }] : [];
  }

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
  const segments: TextSegment[] = [];

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];

    if (start >= end) continue;

    const segmentText = text.slice(start, end);
    if (!segmentText) continue;

    // Find all marks that cover this segment
    const activeMarks = marks.filter((mark) => mark.from <= start && mark.to >= end);

    segments.push({
      text: segmentText,
      marks: activeMarks,
    });
  }

  return segments;
}

/**
 * Convert our Mark to TipTap mark format.
 */
function markToTipTapMark(mark: Mark): TipTapMark {
  const result: TipTapMark = {
    type: markTypeToTipTapMarkType(mark.type),
  };

  // Add attributes for marks that need them
  if (mark.type === "link" && mark.attrs) {
    result.attrs = {
      href: mark.attrs.href || "",
      target: "_blank",
    };
    if (mark.attrs.title) {
      result.attrs.title = mark.attrs.title;
    }
  } else if (mark.type === "footnoteRef" && mark.attrs) {
    result.attrs = {
      footnoteId: mark.attrs.footnoteId || "",
    };
  }

  return result;
}

/**
 * Check if the TipTap editor content has changed compared to BlockContent.
 * Used to avoid unnecessary updates.
 */
export function hasContentChanged(editor: TipTapEditor, content: BlockContent): boolean {
  const editorContent = extractMarksFromEditor(editor);

  if (editorContent.text !== content.text) {
    return true;
  }

  if (editorContent.marks.length !== content.marks.length) {
    return true;
  }

  for (let i = 0; i < editorContent.marks.length; i++) {
    const a = editorContent.marks[i];
    const b = content.marks[i];

    if (a.type !== b.type || a.from !== b.from || a.to !== b.to) {
      return true;
    }

    if (!marksHaveSameAttrs(a, b)) {
      return true;
    }
  }

  return false;
}

/**
 * Convert BlockContent to plain text string.
 * Used for backward compatibility with string content.
 */
export function blockContentToText(content: string | BlockContent): string {
  if (typeof content === "string") {
    return content;
  }
  return content.text;
}

/**
 * Convert string or BlockContent to BlockContent.
 */
export function normalizeBlockContent(content: string | BlockContent): BlockContent {
  if (typeof content === "string") {
    return { text: content, marks: [] };
  }
  return content;
}

/**
 * Get the current selection range from the editor.
 */
export function getEditorSelection(editor: TipTapEditor): { from: number; to: number } | null {
  const { selection } = editor.state;
  const { from, to } = selection;

  // Adjust for the paragraph wrapper node
  const paragraphStart = 1; // doc > paragraph
  const adjustedFrom = Math.max(0, from - paragraphStart);
  const adjustedTo = Math.max(0, to - paragraphStart);

  return { from: adjustedFrom, to: adjustedTo };
}

/**
 * Check if the editor has any active marks in the current selection.
 */
export function getActiveMarks(editor: TipTapEditor): Set<MarkType> {
  const activeMarks = new Set<MarkType>();

  const markTypes: Array<{ tipTap: string; our: MarkType }> = [
    { tipTap: "bold", our: "bold" },
    { tipTap: "italic", our: "italic" },
    { tipTap: "strike", our: "strikethrough" },
    { tipTap: "code", our: "code" },
    { tipTap: "underline", our: "underline" },
    { tipTap: "highlight", our: "highlight" },
    { tipTap: "subscript", our: "subscript" },
    { tipTap: "superscript", our: "superscript" },
    { tipTap: "link", our: "link" },
    { tipTap: "footnoteRef", our: "footnoteRef" },
  ];

  for (const { tipTap, our } of markTypes) {
    if (editor.isActive(tipTap)) {
      activeMarks.add(our);
    }
  }

  return activeMarks;
}
