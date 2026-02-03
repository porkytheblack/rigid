/**
 * Markdown Serializer Module
 *
 * Converts Block structures back to valid markdown with proper formatting.
 * Handles overlapping marks correctly and preserves all formatting on round-trip.
 *
 * Supported features:
 * - All block types: paragraphs, headings, lists, code, tables, etc.
 * - All inline marks: bold, italic, strikethrough, code, links, etc.
 * - Proper handling of overlapping/nested marks
 * - Round-trip fidelity with the parser
 * - GFM extensions (tables, task lists, strikethrough)
 * - Extended markdown (math, containers, footnotes)
 */

import type { Block, BlockContent, Mark, MarkType, LegacyBlockMeta, TableCellAlign, TableCell } from '../types';
import { getBlockText, getBlockMarks } from '../types';

export interface SerializeOptions {
  /** Use soft line breaks (two spaces) vs hard breaks - default false */
  softBreaks?: boolean;
  /** Preferred bullet character: '-' | '*' | '+' - default '-' */
  bulletChar?: '-' | '*' | '+';
  /** Preferred emphasis character: '_' | '*' - default '*' */
  emphasisChar?: '_' | '*';
  /** Number of spaces for list indentation - default 2 */
  listIndent?: number;
  /** Include link reference definitions at end - default false */
  linkReferences?: boolean;
  /** Include footnote definitions at end - default true */
  footnotes?: boolean;
  /** Escape special characters in plain text - default false (for better readability) */
  escapeText?: boolean;
  /** Strong emphasis character: '__' | '**' - follows emphasisChar by default */
  strongChar?: '__' | '**';
}

export interface SerializeContext {
  linkReferences: Map<string, { url: string; title?: string }>;
  footnotes: Map<string, Block>;
  options: Required<SerializeOptions>;
  listCounters: Map<number, number>; // indent level -> current number
  /** Track if we're inside a list for proper spacing */
  inList: boolean;
  /** Track current list type for proper numbering reset */
  currentListType: 'bullet' | 'numbered' | 'task' | null;
}

const DEFAULT_OPTIONS: Required<SerializeOptions> = {
  softBreaks: false,
  bulletChar: '-',
  emphasisChar: '*',
  listIndent: 2,
  linkReferences: false,
  footnotes: true,
  escapeText: false,
  strongChar: '**',
};

/**
 * Characters that need escaping in markdown text
 */
const MARKDOWN_ESCAPE_CHARS = /([\\`*_{}[\]()#+\-.!|<>])/g;

/**
 * Escape special markdown characters in text
 */
function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_ESCAPE_CHARS, '\\$1');
}

/**
 * Escape text for use in markdown links/images
 * Handles parentheses, spaces, and other problematic characters
 */
function escapeUrl(url: string): string {
  if (!url) return '';
  return url
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/ /g, '%20');
}

/**
 * Escape text for use in link titles (inside double quotes)
 */
function escapeTitle(title: string): string {
  if (!title) return '';
  return title.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

/**
 * Escape pipe characters for table cells
 */
function escapeTableCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

interface MarkBoundary {
  offset: number;
  type: 'open' | 'close';
  mark: Mark;
  priority: number;
  /** Unique identifier for matching open/close pairs */
  markId: number;
}

/**
 * Get the markdown syntax for opening a mark
 */
function getMarkOpenSyntax(mark: Mark, options: Required<SerializeOptions>): string {
  switch (mark.type) {
    case 'bold':
      return options.emphasisChar === '_' ? '__' : '**';
    case 'italic':
      return options.emphasisChar === '_' ? '_' : '*';
    case 'strikethrough':
      return '~~';
    case 'code':
      return '`';
    case 'highlight':
      return '==';
    case 'subscript':
      return '~';
    case 'superscript':
      return '^';
    case 'link':
      return '[';
    case 'footnoteRef':
      return '[^';
    case 'underline':
      return '<u>';
    default:
      return '';
  }
}

/**
 * Get the markdown syntax for closing a mark
 */
function getMarkCloseSyntax(mark: Mark, options: Required<SerializeOptions>): string {
  switch (mark.type) {
    case 'bold':
      return options.emphasisChar === '_' ? '__' : '**';
    case 'italic':
      return options.emphasisChar === '_' ? '_' : '*';
    case 'strikethrough':
      return '~~';
    case 'code':
      return '`';
    case 'highlight':
      return '==';
    case 'subscript':
      return '~';
    case 'superscript':
      return '^';
    case 'link': {
      const href = mark.attrs?.href || '';
      const title = mark.attrs?.title;
      if (title) {
        return `](${escapeUrl(href)} "${escapeTitle(title)}")`;
      }
      return `](${escapeUrl(href)})`;
    }
    case 'footnoteRef': {
      const footnoteId = mark.attrs?.footnoteId || '';
      return `${footnoteId}]`;
    }
    case 'underline':
      return '</u>';
    default:
      return '';
  }
}

/**
 * Get mark priority for proper nesting
 * Lower priority marks should be opened first and closed last (outer marks)
 * Higher priority marks are innermost
 *
 * This ensures proper nesting like: **_text_** instead of **_text**_
 */
function getMarkPriority(type: MarkType): number {
  const priorities: Record<MarkType, number> = {
    link: 1,          // Links wrap everything (outermost)
    bold: 2,          // Bold is typically outer
    italic: 3,        // Italic inside bold
    strikethrough: 4,
    underline: 5,
    highlight: 6,
    subscript: 7,
    superscript: 8,
    code: 9,          // Code is innermost (no nested formatting inside code)
    footnoteRef: 10,  // Footnote refs are atomic
  };
  return priorities[type] ?? 5;
}

/**
 * Check if a mark type is "atomic" (cannot contain other marks)
 */
function isAtomicMark(type: MarkType): boolean {
  return type === 'code' || type === 'footnoteRef';
}

/**
 * Serialize inline content with marks to markdown string
 *
 * This function handles the complex task of converting text with overlapping
 * marks into properly nested markdown syntax. The algorithm:
 *
 * 1. Creates boundaries for each mark (open and close points)
 * 2. Sorts boundaries by position, then by type (opens before closes)
 * 3. Processes boundaries in order, properly nesting marks
 * 4. When a mark needs to close but isn't the innermost, temporarily closes
 *    and reopens the intervening marks to maintain valid nesting
 */
export function serializeInline(
  content: BlockContent | string,
  options: Required<SerializeOptions> = DEFAULT_OPTIONS
): string {
  // Handle string content (backward compatibility)
  if (typeof content === 'string') {
    return content;
  }

  const { text, marks } = content;

  // No marks - return plain text
  if (!marks || marks.length === 0) {
    return text;
  }

  // Filter out invalid marks (where from >= to or out of bounds)
  const validMarks = marks.filter(mark =>
    mark.from >= 0 &&
    mark.to <= text.length &&
    mark.from < mark.to
  );

  if (validMarks.length === 0) {
    return text;
  }

  // Build list of mark boundaries with unique IDs
  const boundaries: MarkBoundary[] = [];
  validMarks.forEach((mark, index) => {
    const priority = getMarkPriority(mark.type);
    boundaries.push({ offset: mark.from, type: 'open', mark, priority, markId: index });
    boundaries.push({ offset: mark.to, type: 'close', mark, priority, markId: index });
  });

  // Sort boundaries:
  // 1. By offset (ascending)
  // 2. At same offset: closes before opens for proper nesting at boundaries
  //    Exception: when close and open are for overlapping marks, open should come first
  // 3. Opens: lower priority first (outer marks open first)
  // 4. Closes: higher priority first (inner marks close first)
  boundaries.sort((a, b) => {
    if (a.offset !== b.offset) {
      return a.offset - b.offset;
    }

    // At same offset, handle close/open ordering carefully
    // For proper markdown nesting, we want to close before opening new marks
    // unless they're the same mark (open before close)
    if (a.type !== b.type) {
      // Different types at same position
      // Close existing marks before opening new ones
      // This produces: **text**_more_ instead of **text_**more_
      return a.type === 'close' ? -1 : 1;
    }

    // Same type at same offset: sort by priority
    if (a.type === 'open') {
      // Lower priority opens first (will be outer mark)
      return a.priority - b.priority;
    }
    // Higher priority closes first (inner marks close first)
    return b.priority - a.priority;
  });

  // Generate output by processing boundaries
  let output = '';
  let pos = 0;

  // Stack of currently open marks with their IDs for matching
  const openMarks: Array<{ mark: Mark; markId: number }> = [];

  for (const boundary of boundaries) {
    // Output text up to this boundary
    if (boundary.offset > pos) {
      output += text.slice(pos, boundary.offset);
      pos = boundary.offset;
    }

    if (boundary.type === 'open') {
      output += getMarkOpenSyntax(boundary.mark, options);
      openMarks.push({ mark: boundary.mark, markId: boundary.markId });
    } else {
      // Find the mark to close by its unique ID
      const markIndex = openMarks.findIndex(m => m.markId === boundary.markId);

      if (markIndex !== -1) {
        // Close marks in LIFO order to maintain proper nesting
        // If the mark to close isn't at the top, we need to close
        // intervening marks and reopen them
        const marksToReopen: Array<{ mark: Mark; markId: number }> = [];

        // Close all marks opened after this one
        while (openMarks.length > markIndex + 1) {
          const closedMark = openMarks.pop()!;
          output += getMarkCloseSyntax(closedMark.mark, options);
          marksToReopen.push(closedMark);
        }

        // Close the target mark
        openMarks.pop();
        output += getMarkCloseSyntax(boundary.mark, options);

        // Reopen marks that were closed early (in reverse order to maintain nesting)
        for (let i = marksToReopen.length - 1; i >= 0; i--) {
          const markToReopen = marksToReopen[i];
          output += getMarkOpenSyntax(markToReopen.mark, options);
          openMarks.push(markToReopen);
        }
      }
    }
  }

  // Output remaining text
  if (pos < text.length) {
    output += text.slice(pos);
  }

  // Close any remaining open marks (shouldn't happen with valid input)
  while (openMarks.length > 0) {
    const unclosedMark = openMarks.pop()!;
    output += getMarkCloseSyntax(unclosedMark.mark, options);
  }

  return output;
}

/**
 * Serialize a table to markdown
 *
 * Tables are serialized in GFM format:
 * | Header 1 | Header 2 |
 * | -------- | -------- |
 * | Cell 1   | Cell 2   |
 *
 * Alignment is specified in the separator row:
 * - :--- for left
 * - :---: for center
 * - ---: for right
 * - --- for default (left)
 */
function serializeTable(meta: LegacyBlockMeta, options: Required<SerializeOptions>): string {
  const rows = meta.rows as Array<Array<TableCell | { content: BlockContent } | string>> | undefined;
  const aligns = meta.columnAligns as TableCellAlign[] | undefined;

  if (!rows || rows.length === 0) {
    return '';
  }

  const lines: string[] = [];

  // Determine column count from all rows
  const colCount = Math.max(...rows.map(row => row.length), 0);

  if (colCount === 0) {
    return '';
  }

  // Process each row
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const cells: string[] = [];

    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      const cell = row[colIdx];
      let cellText = '';

      if (cell !== undefined && cell !== null) {
        if (typeof cell === 'string') {
          cellText = escapeTableCell(cell);
        } else if ('content' in cell && cell.content) {
          // Handle both TableCell and {content: BlockContent} formats
          const cellContent = cell.content;
          if (typeof cellContent === 'string') {
            cellText = escapeTableCell(cellContent);
          } else {
            cellText = escapeTableCell(serializeInline(cellContent, options));
          }
        }
      }

      cells.push(cellText);
    }

    lines.push(`| ${cells.join(' | ')} |`);

    // Add separator after first row (header)
    if (rowIdx === 0) {
      const separators: string[] = [];
      for (let colIdx = 0; colIdx < colCount; colIdx++) {
        const align = aligns?.[colIdx];
        if (align === 'left') {
          separators.push(':---');
        } else if (align === 'center') {
          separators.push(':---:');
        } else if (align === 'right') {
          separators.push('---:');
        } else {
          separators.push('---');
        }
      }
      lines.push(`| ${separators.join(' | ')} |`);
    }
  }

  return lines.join('\n');
}

/**
 * Determine if a blank line is needed before this block
 */
function needsBlankLineBefore(
  block: Block,
  prevBlock: Block | null,
  _context: SerializeContext
): boolean {
  if (!prevBlock) {
    return false;
  }

  const currentType = block.type;
  const prevType = prevBlock.type;

  // List items at same or nested indent don't need blank lines between them
  const isCurrentList = isListType(currentType);
  const isPrevList = isListType(prevType);

  if (isCurrentList && isPrevList) {
    // No blank line between adjacent list items (tight list)
    return false;
  }

  // Transitioning from list to non-list needs blank line
  if (isPrevList && !isCurrentList) {
    return true;
  }

  // Non-list to list needs blank line
  if (!isPrevList && isCurrentList) {
    return true;
  }

  // Headings need blank line before (unless at start)
  if (currentType.startsWith('heading')) {
    return true;
  }

  // Code blocks need blank line before
  if (currentType === 'code' || currentType === 'codeBlock') {
    return true;
  }

  // Tables need blank line before
  if (currentType === 'table') {
    return true;
  }

  // Dividers typically have blank line before
  if (currentType === 'divider') {
    return true;
  }

  // Block quotes need blank line before
  if (currentType === 'blockquote' || currentType === 'quote') {
    return true;
  }

  // Math blocks need blank line before
  if (currentType === 'mathBlock') {
    return true;
  }

  // Callouts/containers need blank line before
  if (currentType === 'callout' || currentType === 'container') {
    return true;
  }

  // Images need blank line before
  if (currentType === 'image') {
    return true;
  }

  // Embeds need blank line before
  if (currentType === 'embed' || currentType === 'video') {
    return true;
  }

  // Toggle blocks need blank line before
  if (currentType === 'toggle') {
    return true;
  }

  // Footnote definitions need blank line before
  if (currentType === 'footnoteDefinition') {
    return true;
  }

  // Paragraph after anything other than paragraph needs blank line
  if (currentType === 'paragraph' && prevType !== 'paragraph') {
    return true;
  }

  return false;
}

/**
 * Check if block type is a list type
 */
function isListType(type: string): boolean {
  return ['bulletList', 'numberedList', 'taskList', 'todo'].includes(type);
}

/**
 * Get the list marker for a list type
 */
function getListMarker(
  type: string,
  meta: LegacyBlockMeta | undefined,
  context: SerializeContext,
  indent: number
): string {
  const { options } = context;

  switch (type) {
    case 'bulletList':
      return `${options.bulletChar} `;

    case 'numberedList': {
      // Track list numbering per indent level
      if (!context.listCounters.has(indent)) {
        // Check if meta has a starting number
        const start = meta?.start ?? 1;
        context.listCounters.set(indent, start);
      }
      const num = context.listCounters.get(indent)!;
      context.listCounters.set(indent, num + 1);
      return `${num}. `;
    }

    case 'taskList':
    case 'todo': {
      const checked = meta?.checked ? 'x' : ' ';
      return `${options.bulletChar} [${checked}] `;
    }

    default:
      return '';
  }
}

/**
 * Serialize a single block to markdown
 */
export function serializeBlock(block: Block, context: SerializeContext): string {
  const text = getBlockText(block);
  const marks = getBlockMarks(block);
  const content: BlockContent = { text, marks };
  const meta = block.meta as LegacyBlockMeta | undefined;
  const indent = meta?.indent ?? block.indent ?? 0;
  const indentStr = ' '.repeat(indent * context.options.listIndent);
  const { options } = context;

  switch (block.type) {
    case 'paragraph':
      return serializeInline(content, options);

    case 'heading1':
      return `# ${serializeInline(content, options)}`;

    case 'heading2':
      return `## ${serializeInline(content, options)}`;

    case 'heading3':
      return `### ${serializeInline(content, options)}`;

    case 'heading4':
      return `#### ${serializeInline(content, options)}`;

    case 'heading5':
      return `##### ${serializeInline(content, options)}`;

    case 'heading6':
      return `###### ${serializeInline(content, options)}`;

    case 'bulletList':
    case 'numberedList':
    case 'taskList':
    case 'todo': {
      const marker = getListMarker(block.type, meta, context, indent);
      return `${indentStr}${marker}${serializeInline(content, options)}`;
    }

    case 'quote':
    case 'blockquote': {
      if (block.children && block.children.length > 0) {
        // Nested blockquote with children
        const childMarkdown = serializeBlocks(block.children, options);
        return childMarkdown
          .split('\n')
          .map(line => `> ${line}`)
          .join('\n');
      }
      // Simple blockquote with just content
      const quoteContent = serializeInline(content, options);
      if (quoteContent.includes('\n')) {
        // Multi-line quote
        return quoteContent
          .split('\n')
          .map(line => `> ${line}`)
          .join('\n');
      }
      return `> ${quoteContent}`;
    }

    case 'code':
    case 'codeBlock': {
      const lang = meta?.language || '';
      const filename = meta?.filename ? ` ${meta.filename}` : '';
      // Don't use serializeInline for code - preserve raw text
      return `\`\`\`${lang}${filename}\n${text}\n\`\`\``;
    }

    case 'mermaid': {
      const mermaidCode = meta?.mermaidCode || text;
      return `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
    }

    case 'mathBlock': {
      const latex = meta?.latex || text;
      return `$$\n${latex}\n$$`;
    }

    case 'divider':
      return '---';

    case 'image': {
      const alt = meta?.alt || '';
      const src = meta?.src || '';
      const title = meta?.title;
      const caption = meta?.caption;

      let imageMarkdown: string;
      if (title) {
        imageMarkdown = `![${escapeMarkdown(alt)}](${escapeUrl(src)} "${escapeTitle(title)}")`;
      } else {
        imageMarkdown = `![${escapeMarkdown(alt)}](${escapeUrl(src)})`;
      }

      // Add caption if present (as a paragraph below)
      if (caption) {
        return `${imageMarkdown}\n*${caption}*`;
      }
      return imageMarkdown;
    }

    case 'table':
      return serializeTable(meta || {}, options);

    case 'callout': {
      const calloutType = meta?.calloutType || 'info';
      const title = meta?.title;

      let calloutContent: string;
      if (block.children && block.children.length > 0) {
        calloutContent = serializeBlocks(block.children, options);
      } else {
        calloutContent = serializeInline(content, options);
      }

      if (title) {
        return `:::${calloutType} ${title}\n${calloutContent}\n:::`;
      }
      return `:::${calloutType}\n${calloutContent}\n:::`;
    }

    case 'container': {
      const containerType = meta?.containerType || 'note';
      const title = meta?.title;

      let containerContent: string;
      if (block.children && block.children.length > 0) {
        containerContent = serializeBlocks(block.children, options);
      } else {
        containerContent = serializeInline(content, options);
      }

      if (title) {
        return `:::${containerType} ${title}\n${containerContent}\n:::`;
      }
      return `:::${containerType}\n${containerContent}\n:::`;
    }

    case 'toggle': {
      const summary = serializeInline(content, options);
      if (block.children && block.children.length > 0) {
        const childMarkdown = serializeBlocks(block.children, options);
        return `<details>\n<summary>${summary}</summary>\n\n${childMarkdown}\n</details>`;
      }
      return `<details>\n<summary>${summary}</summary>\n</details>`;
    }

    case 'footnoteDefinition': {
      const identifier = meta?.identifier || '';
      let footnoteContent: string;

      if (block.children && block.children.length > 0) {
        // Multi-paragraph footnote
        footnoteContent = serializeBlocks(block.children, options)
          .split('\n')
          .map((line, i) => i === 0 ? line : `    ${line}`)
          .join('\n');
      } else {
        footnoteContent = serializeInline(content, options);
      }

      return `[^${identifier}]: ${footnoteContent}`;
    }

    case 'video': {
      const src = meta?.src || '';
      const title = meta?.title;
      if (title) {
        return `<video src="${escapeUrl(src)}" title="${escapeTitle(title)}"></video>`;
      }
      return `<video src="${escapeUrl(src)}"></video>`;
    }

    case 'file': {
      const src = meta?.src || '';
      const fileName = meta?.fileName || 'file';
      return `[${fileName}](${escapeUrl(src)})`;
    }

    case 'embed': {
      const src = meta?.src || meta?.url || '';
      const embedType = meta?.embedType;

      // For known embed types, use appropriate format
      if (embedType === 'youtube') {
        return `::youtube[${src}]`;
      }

      return `<iframe src="${escapeUrl(src)}"></iframe>`;
    }

    default:
      // Unknown block type - output as paragraph
      return serializeInline(content, options);
  }
}

/**
 * Serialize blocks to markdown string.
 *
 * @param blocks - The blocks to serialize
 * @param options - Serialization configuration
 * @returns Valid markdown string
 *
 * @example
 * const markdown = serializeBlocks(blocks);
 * // parseMarkdown(markdown) produces semantically equivalent blocks
 */
export function serializeBlocks(blocks: Block[], options: SerializeOptions = {}): string {
  const mergedOptions: Required<SerializeOptions> = { ...DEFAULT_OPTIONS, ...options };

  const context: SerializeContext = {
    linkReferences: new Map(),
    footnotes: new Map(),
    options: mergedOptions,
    listCounters: new Map(),
    inList: false,
    currentListType: null,
  };

  const output: string[] = [];
  let prevBlock: Block | null = null;
  let prevWasList = false;
  let prevIndent = 0;

  for (const block of blocks) {
    const isListItem = isListType(block.type);
    const meta = block.meta as LegacyBlockMeta | undefined;
    const indent = meta?.indent ?? block.indent ?? 0;

    // Reset list counter when:
    // 1. Transitioning from list to non-list
    // 2. Indent decreases
    // 3. List type changes at same indent
    if (!isListItem) {
      // Clear all list counters when exiting list
      context.listCounters.clear();
      context.currentListType = null;
    } else {
      // Check if we need to reset numbering
      const newListType = block.type === 'numberedList' ? 'numbered' :
        block.type === 'bulletList' ? 'bullet' : 'task';

      if (indent < prevIndent) {
        // Clear counters at higher indents
        for (const [key] of context.listCounters) {
          if (key > indent) {
            context.listCounters.delete(key);
          }
        }
      }

      // Reset counter if list type changed at this indent
      if (context.currentListType !== newListType && context.listCounters.has(indent)) {
        context.listCounters.delete(indent);
      }
      context.currentListType = newListType;
    }

    // Determine if we need a blank line before this block
    const needsBlank = needsBlankLineBefore(block, prevBlock, context);

    if (needsBlank && output.length > 0) {
      output.push('');
    } else if (output.length > 0 && !isListItem && prevWasList) {
      // Blank line after list ends
      output.push('');
    }

    const serialized = serializeBlock(block, context);
    output.push(serialized);

    // Collect footnotes for potential end-of-document output
    if (block.type === 'footnoteDefinition' && meta?.identifier) {
      context.footnotes.set(meta.identifier, block);
    }

    prevBlock = block;
    prevWasList = isListItem;
    prevIndent = indent;
    context.inList = isListItem;
  }

  // Append link reference definitions at end if requested
  if (mergedOptions.linkReferences && context.linkReferences.size > 0) {
    output.push('');
    for (const [identifier, { url, title }] of context.linkReferences) {
      if (title) {
        output.push(`[${identifier}]: ${escapeUrl(url)} "${escapeTitle(title)}"`);
      } else {
        output.push(`[${identifier}]: ${escapeUrl(url)}`);
      }
    }
  }

  return output.join('\n');
}

/**
 * Convenience function for simple serialization (backward compatible)
 */
export function blocksToMarkdown(blocks: Block[]): string {
  return serializeBlocks(blocks);
}

/**
 * Serialize a single block's content to inline markdown
 * Useful for getting formatted text from a block without block-level syntax
 */
export function serializeBlockContent(block: Block, options: SerializeOptions = {}): string {
  const text = getBlockText(block);
  const marks = getBlockMarks(block);
  const mergedOptions: Required<SerializeOptions> = { ...DEFAULT_OPTIONS, ...options };
  return serializeInline({ text, marks }, mergedOptions);
}

export default serializeBlocks;
