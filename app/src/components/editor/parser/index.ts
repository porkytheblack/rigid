/**
 * Markdown Parser Module
 *
 * Provides comprehensive markdown parsing using micromark and mdast-util-from-markdown.
 * Supports CommonMark, GFM extensions, math, directives, and custom containers.
 */

import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { math } from 'micromark-extension-math';
import { mathFromMarkdown } from 'mdast-util-math';
import { directive } from 'micromark-extension-directive';
import { directiveFromMarkdown } from 'mdast-util-directive';
import type { Root, RootContent, PhrasingContent, Paragraph, Heading, Blockquote, List, ListItem, Code, ThematicBreak, Table, TableRow, TableCell, Text, Emphasis, Strong, Delete, InlineCode, Link, Image, Html, Break, Definition, LinkReference, ImageReference } from 'mdast';
import type { Block, BlockContent, Mark, MarkType, LegacyBlockMeta, TableCellAlign } from '../types';

// Extended node types from plugins
interface MathNode {
  type: 'math';
  value: string;
  meta?: string;
}

interface InlineMathNode {
  type: 'inlineMath';
  value: string;
}

interface FootnoteReference {
  type: 'footnoteReference';
  identifier: string;
  label?: string;
}

interface FootnoteDefinition {
  type: 'footnoteDefinition';
  identifier: string;
  label?: string;
  children: RootContent[];
}

interface TextDirective {
  type: 'textDirective';
  name: string;
  attributes?: Record<string, string>;
  children: PhrasingContent[];
}

interface LeafDirective {
  type: 'leafDirective';
  name: string;
  attributes?: Record<string, string>;
  children: PhrasingContent[];
}

interface ContainerDirective {
  type: 'containerDirective';
  name: string;
  attributes?: Record<string, string>;
  children: RootContent[];
}

// GFM autolink types
interface GfmAutolinkLiteral {
  type: 'link';
  url: string;
  children: [{ type: 'text'; value: string }];
}

type ExtendedNode = RootContent | MathNode | InlineMathNode | FootnoteReference | FootnoteDefinition | TextDirective | LeafDirective | ContainerDirective;
type ExtendedPhrasingContent = PhrasingContent | InlineMathNode | FootnoteReference | TextDirective;

export interface ParseOptions {
  /** Enable GFM extensions (tables, strikethrough, etc.) - default true */
  gfm?: boolean;
  /** Enable footnotes - default true */
  footnotes?: boolean;
  /** Enable math (LaTeX) - default true */
  math?: boolean;
  /** Enable custom containers (:::note, etc.) - default true */
  containers?: boolean;
}

export interface ParseResult {
  /** Parsed blocks */
  blocks: Block[];
  /** Link reference definitions found */
  linkReferences: Map<string, { url: string; title?: string }>;
  /** Footnote definitions found */
  footnotes: Map<string, Block>;
  /** Any warnings during parsing */
  warnings: ParseWarning[];
}

export interface ParseWarning {
  message: string;
  line?: number;
  column?: number;
}

interface TransformContext {
  indent: number;
  slugs: Set<string>;
  linkReferences: Map<string, { url: string; title?: string }>;
  footnotes: Map<string, Block>;
  warnings: ParseWarning[];
  listItemIndex: number;
  isTaskList: boolean;
  isTightList: boolean;
}

/**
 * Generate a URL-safe slug from text
 */
function generateSlug(text: string, existingSlugs: Set<string>): string {
  let slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  if (!slug) {
    slug = 'heading';
  }

  let finalSlug = slug;
  let counter = 1;
  while (existingSlugs.has(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }

  return finalSlug;
}

/**
 * Generate a unique block ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Offset marks by a given amount
 */
function offsetMarks(marks: Mark[], offset: number): Mark[] {
  return marks.map(mark => ({
    ...mark,
    from: mark.from + offset,
    to: mark.to + offset,
  }));
}

/**
 * Process extended markdown syntax in text that micromark doesn't handle natively.
 * This includes:
 * - ==highlight==
 * - ~subscript~ (single tilde, not to be confused with ~~strikethrough~~)
 * - ^superscript^
 *
 * Returns the processed text and any marks found.
 */
function processExtendedSyntax(text: string): { text: string; marks: Mark[] } {
  const marks: Mark[] = [];
  let processedText = '';
  let i = 0;

  while (i < text.length) {
    // Check for highlight ==text==
    if (text[i] === '=' && text[i + 1] === '=' && i + 2 < text.length) {
      const endIdx = text.indexOf('==', i + 2);
      if (endIdx !== -1) {
        const highlightText = text.slice(i + 2, endIdx);
        const startOffset = processedText.length;
        processedText += highlightText;
        marks.push({
          type: 'highlight',
          from: startOffset,
          to: processedText.length,
        });
        i = endIdx + 2;
        continue;
      }
    }

    // Check for superscript ^text^ (single caret, not escaped)
    if (text[i] === '^' && i > 0 && text[i - 1] !== '\\' && i + 1 < text.length) {
      // Find closing caret (not at start of word if preceded by space)
      let endIdx = i + 1;
      while (endIdx < text.length && text[endIdx] !== '^' && text[endIdx] !== ' ' && text[endIdx] !== '\n') {
        endIdx++;
      }
      if (endIdx < text.length && text[endIdx] === '^') {
        const supText = text.slice(i + 1, endIdx);
        if (supText.length > 0) {
          const startOffset = processedText.length;
          processedText += supText;
          marks.push({
            type: 'superscript',
            from: startOffset,
            to: processedText.length,
          });
          i = endIdx + 1;
          continue;
        }
      }
    }

    // Check for subscript ~text~ (single tilde, not double ~~)
    if (text[i] === '~' && text[i + 1] !== '~' && i + 1 < text.length) {
      // Find closing single tilde (not double)
      let endIdx = i + 1;
      while (endIdx < text.length && !(text[endIdx] === '~' && text[endIdx + 1] !== '~') && text[endIdx] !== ' ' && text[endIdx] !== '\n') {
        endIdx++;
      }
      if (endIdx < text.length && text[endIdx] === '~' && text[endIdx + 1] !== '~') {
        const subText = text.slice(i + 1, endIdx);
        if (subText.length > 0) {
          const startOffset = processedText.length;
          processedText += subText;
          marks.push({
            type: 'subscript',
            from: startOffset,
            to: processedText.length,
          });
          i = endIdx + 1;
          continue;
        }
      }
    }

    // Regular character
    processedText += text[i];
    i++;
  }

  return { text: processedText, marks };
}

/**
 * Extract inline content from mdast phrasing content nodes
 * @param nodes - The phrasing content nodes to process
 * @param linkRefs - Optional map of link reference definitions for resolving reference links
 */
function extractInlineContent(
  nodes: ExtendedPhrasingContent[],
  linkRefs?: Map<string, { url: string; title?: string }>
): BlockContent {
  let text = '';
  const marks: Mark[] = [];

  for (const node of nodes) {
    const startOffset = text.length;

    switch (node.type) {
      case 'text': {
        const textValue = (node as Text).value;
        // Process extended syntax (==highlight==, ~sub~, ^sup^)
        const processed = processExtendedSyntax(textValue);
        text += processed.text;
        marks.push(...offsetMarks(processed.marks, startOffset));
        break;
      }

      case 'emphasis': {
        const emphNode = node as Emphasis;
        const innerContent = extractInlineContent(emphNode.children as ExtendedPhrasingContent[], linkRefs);
        text += innerContent.text;
        marks.push({ type: 'italic', from: startOffset, to: text.length });
        marks.push(...offsetMarks(innerContent.marks, startOffset));
        break;
      }

      case 'strong': {
        const strongNode = node as Strong;
        const innerContent = extractInlineContent(strongNode.children as ExtendedPhrasingContent[], linkRefs);
        text += innerContent.text;
        marks.push({ type: 'bold', from: startOffset, to: text.length });
        marks.push(...offsetMarks(innerContent.marks, startOffset));
        break;
      }

      case 'delete': {
        const deleteNode = node as Delete;
        const innerContent = extractInlineContent(deleteNode.children as ExtendedPhrasingContent[], linkRefs);
        text += innerContent.text;
        marks.push({ type: 'strikethrough', from: startOffset, to: text.length });
        marks.push(...offsetMarks(innerContent.marks, startOffset));
        break;
      }

      case 'inlineCode': {
        const codeNode = node as InlineCode;
        text += codeNode.value;
        marks.push({ type: 'code', from: startOffset, to: text.length });
        break;
      }

      case 'link': {
        const linkNode = node as Link;
        const innerContent = extractInlineContent(linkNode.children as ExtendedPhrasingContent[], linkRefs);
        text += innerContent.text;
        marks.push({
          type: 'link',
          from: startOffset,
          to: text.length,
          attrs: { href: linkNode.url, title: linkNode.title || undefined },
        });
        marks.push(...offsetMarks(innerContent.marks, startOffset));
        break;
      }

      case 'linkReference': {
        // Handle reference-style links [text][ref] or [ref]
        const linkRef = node as LinkReference;
        const innerContent = extractInlineContent(linkRef.children as ExtendedPhrasingContent[], linkRefs);
        text += innerContent.text;

        // Try to resolve the reference
        const identifier = linkRef.identifier.toLowerCase();
        const resolved = linkRefs?.get(identifier);

        if (resolved) {
          marks.push({
            type: 'link',
            from: startOffset,
            to: text.length,
            attrs: { href: resolved.url, title: resolved.title },
          });
        }
        // If not resolved, just keep the text without a link mark
        marks.push(...offsetMarks(innerContent.marks, startOffset));
        break;
      }

      case 'imageReference': {
        // Handle reference-style images ![alt][ref]
        const imgRef = node as ImageReference;
        const altText = imgRef.alt || 'image';
        text += altText;
        // Image references are typically rendered as block images, not inline
        break;
      }

      case 'image': {
        const imgNode = node as Image;
        // Represent images inline as their alt text with a special marker
        const altText = imgNode.alt || 'image';
        text += altText;
        break;
      }

      case 'inlineMath': {
        const mathNode = node as InlineMathNode;
        // Represent inline math with the raw LaTeX
        text += `$${mathNode.value}$`;
        break;
      }

      case 'footnoteReference': {
        const fnRef = node as FootnoteReference;
        const refText = `[^${fnRef.identifier}]`;
        text += refText;
        marks.push({
          type: 'footnoteRef',
          from: startOffset,
          to: text.length,
          attrs: { footnoteId: fnRef.identifier },
        });
        break;
      }

      case 'break':
        text += '\n';
        break;

      case 'html': {
        const htmlNode = node as Html;
        // Strip HTML tags for plain text, but preserve content
        const stripped = htmlNode.value.replace(/<[^>]*>/g, '');
        text += stripped;
        break;
      }

      case 'textDirective': {
        const dir = node as TextDirective;
        // Handle special inline directives like ::highlight[text]
        if (dir.name === 'highlight' || dir.name === 'mark') {
          const innerContent = extractInlineContent(dir.children as ExtendedPhrasingContent[], linkRefs);
          text += innerContent.text;
          marks.push({ type: 'highlight', from: startOffset, to: text.length });
          marks.push(...offsetMarks(innerContent.marks, startOffset));
        } else if (dir.name === 'sub') {
          const innerContent = extractInlineContent(dir.children as ExtendedPhrasingContent[], linkRefs);
          text += innerContent.text;
          marks.push({ type: 'subscript', from: startOffset, to: text.length });
          marks.push(...offsetMarks(innerContent.marks, startOffset));
        } else if (dir.name === 'sup') {
          const innerContent = extractInlineContent(dir.children as ExtendedPhrasingContent[], linkRefs);
          text += innerContent.text;
          marks.push({ type: 'superscript', from: startOffset, to: text.length });
          marks.push(...offsetMarks(innerContent.marks, startOffset));
        } else {
          // Unknown directive - just extract text
          const innerContent = extractInlineContent(dir.children as ExtendedPhrasingContent[], linkRefs);
          text += innerContent.text;
          marks.push(...offsetMarks(innerContent.marks, startOffset));
        }
        break;
      }

      default:
        // Handle unknown node types gracefully
        if ('value' in node && typeof (node as { value: unknown }).value === 'string') {
          text += (node as { value: string }).value;
        } else if ('children' in node && Array.isArray((node as { children: unknown[] }).children)) {
          const innerContent = extractInlineContent((node as { children: ExtendedPhrasingContent[] }).children, linkRefs);
          text += innerContent.text;
          marks.push(...offsetMarks(innerContent.marks, startOffset));
        }
    }
  }

  // Sort marks by start position, then by end position (for consistent ordering)
  marks.sort((a, b) => a.from - b.from || a.to - b.to);

  return { text, marks };
}

/**
 * Extract plain text from phrasing content nodes
 */
function extractText(nodes: ExtendedPhrasingContent[], linkRefs?: Map<string, { url: string; title?: string }>): string {
  return extractInlineContent(nodes, linkRefs).text;
}

/**
 * First pass: collect all link reference definitions from the AST
 */
function collectDefinitions(tree: Root): Map<string, { url: string; title?: string }> {
  const definitions = new Map<string, { url: string; title?: string }>();

  function visit(node: RootContent | Root): void {
    if (node.type === 'definition') {
      const def = node as Definition;
      definitions.set(def.identifier.toLowerCase(), {
        url: def.url,
        title: def.title || undefined,
      });
    }
    if ('children' in node && Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child as RootContent);
      }
    }
  }

  visit(tree);
  return definitions;
}

/**
 * Transform a table node to a Block
 */
function transformTable(node: Table, context: TransformContext): Block {
  const rows: { content: BlockContent }[][] = [];
  const columnAligns: TableCellAlign[] = [];

  // Extract alignment from first row or table align property
  if (node.align) {
    for (const align of node.align) {
      columnAligns.push(align as TableCellAlign);
    }
  }

  for (const row of node.children as TableRow[]) {
    const cells: { content: BlockContent }[] = [];
    for (const cell of row.children as TableCell[]) {
      cells.push({
        content: extractInlineContent(cell.children as ExtendedPhrasingContent[], context.linkReferences),
      });
    }
    rows.push(cells);
  }

  // Ensure we have column aligns for all columns
  const maxCols = Math.max(...rows.map(r => r.length), 0);
  while (columnAligns.length < maxCols) {
    columnAligns.push(null);
  }

  return {
    id: generateId(),
    type: 'table',
    content: '',
    meta: {
      columnAligns,
      rows,
    } as LegacyBlockMeta,
    indent: context.indent,
  };
}

/**
 * Transform a list item to one or more Blocks
 */
function transformListItem(
  item: ListItem,
  list: List,
  index: number,
  context: TransformContext
): Block[] {
  const blocks: Block[] = [];
  const isTaskItem = item.checked !== null && item.checked !== undefined;
  const isOrdered = list.ordered === true;

  // For task items, use taskList type
  // For ordered lists, use numberedList
  // For unordered lists, use bulletList
  let blockType: 'taskList' | 'numberedList' | 'bulletList' | 'todo';
  if (isTaskItem) {
    blockType = 'todo'; // Use 'todo' for backward compatibility
  } else if (isOrdered) {
    blockType = 'numberedList';
  } else {
    blockType = 'bulletList';
  }

  // Extract content from the first paragraph or text content
  let content: BlockContent = { text: '', marks: [] };
  const childBlocks: Block[] = [];

  for (const child of item.children) {
    if (child.type === 'paragraph' && content.text === '') {
      content = extractInlineContent((child as Paragraph).children as ExtendedPhrasingContent[], context.linkReferences);
    } else if (child.type === 'list') {
      // Nested list - recursively transform
      const nestedList = child as List;
      const nestedContext: TransformContext = {
        ...context,
        indent: context.indent + 1,
        listItemIndex: 0,
        isTaskList: nestedList.children.some((li: ListItem) => li.checked !== null && li.checked !== undefined),
        isTightList: nestedList.spread === false,
      };

      for (let i = 0; i < nestedList.children.length; i++) {
        const nestedBlocks = transformListItem(
          nestedList.children[i] as ListItem,
          nestedList,
          i,
          nestedContext
        );
        childBlocks.push(...nestedBlocks);
      }
    } else {
      // Other block content inside list item
      const transformed = transformNode(child as ExtendedNode, { ...context, indent: context.indent + 1 });
      if (Array.isArray(transformed)) {
        childBlocks.push(...transformed);
      } else {
        childBlocks.push(transformed);
      }
    }
  }

  const meta: LegacyBlockMeta = {
    indent: context.indent,
  };

  if (isTaskItem) {
    meta.checked = item.checked === true;
  }

  blocks.push({
    id: generateId(),
    type: blockType,
    content: content.text,
    meta,
    indent: context.indent,
  });

  // Add any nested blocks
  blocks.push(...childBlocks);

  return blocks;
}

/**
 * Transform an mdast node to Block or Block array
 */
function transformNode(node: ExtendedNode, context: TransformContext): Block | Block[] {
  switch (node.type) {
    case 'paragraph': {
      const para = node as Paragraph;
      const content = extractInlineContent(para.children as ExtendedPhrasingContent[], context.linkReferences);
      return {
        id: generateId(),
        type: 'paragraph',
        content: content.text,
        meta: {},
        indent: context.indent,
      };
    }

    case 'heading': {
      const heading = node as Heading;
      const content = extractInlineContent(heading.children as ExtendedPhrasingContent[], context.linkReferences);
      const text = extractText(heading.children as ExtendedPhrasingContent[], context.linkReferences);
      const slug = generateSlug(text, context.slugs);
      context.slugs.add(slug);

      const level = heading.depth as 1 | 2 | 3 | 4 | 5 | 6;
      const typeMap: Record<number, 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5' | 'heading6'> = {
        1: 'heading1',
        2: 'heading2',
        3: 'heading3',
        4: 'heading4',
        5: 'heading5',
        6: 'heading6',
      };

      return {
        id: generateId(),
        type: typeMap[level],
        content: content.text,
        meta: { level, slug } as LegacyBlockMeta,
        indent: 0,
      };
    }

    case 'blockquote': {
      const quote = node as Blockquote;
      const childBlocks: Block[] = [];

      for (const child of quote.children) {
        const transformed = transformNode(child as ExtendedNode, { ...context, indent: 0 });
        if (Array.isArray(transformed)) {
          childBlocks.push(...transformed);
        } else {
          childBlocks.push(transformed);
        }
      }

      // If there's only one paragraph child, use its content directly
      if (childBlocks.length === 1 && childBlocks[0].type === 'paragraph') {
        return {
          id: generateId(),
          type: 'quote',
          content: childBlocks[0].content,
          meta: {},
          indent: context.indent,
        };
      }

      // Otherwise, create a blockquote with children
      return {
        id: generateId(),
        type: 'blockquote',
        content: '',
        children: childBlocks,
        meta: {},
        indent: context.indent,
      };
    }

    case 'list': {
      const list = node as List;
      const blocks: Block[] = [];
      const listContext: TransformContext = {
        ...context,
        listItemIndex: 0,
        isTaskList: list.children.some((item: ListItem) => item.checked !== null && item.checked !== undefined),
        isTightList: list.spread === false,
      };

      for (let i = 0; i < list.children.length; i++) {
        const itemBlocks = transformListItem(
          list.children[i] as ListItem,
          list,
          i,
          listContext
        );
        blocks.push(...itemBlocks);
      }

      return blocks;
    }

    case 'code': {
      const code = node as Code;
      const language = code.lang || 'plaintext';

      // Check if it's a mermaid diagram
      if (language === 'mermaid') {
        return {
          id: generateId(),
          type: 'mermaid',
          content: code.value,
          meta: { mermaidCode: code.value } as LegacyBlockMeta,
          indent: context.indent,
        };
      }

      return {
        id: generateId(),
        type: 'code',
        content: code.value,
        meta: {
          language,
        } as LegacyBlockMeta,
        indent: context.indent,
      };
    }

    case 'thematicBreak':
      return {
        id: generateId(),
        type: 'divider',
        content: '',
        meta: {},
        indent: 0,
      };

    case 'table':
      return transformTable(node as Table, context);

    case 'math': {
      const mathNode = node as MathNode;
      return {
        id: generateId(),
        type: 'mathBlock',
        content: mathNode.value,
        meta: {
          latex: mathNode.value,
          displayMode: true,
        } as LegacyBlockMeta,
        indent: context.indent,
      };
    }

    case 'footnoteDefinition': {
      const fnDef = node as FootnoteDefinition;
      const childBlocks: Block[] = [];

      for (const child of fnDef.children) {
        const transformed = transformNode(child as ExtendedNode, { ...context, indent: 0 });
        if (Array.isArray(transformed)) {
          childBlocks.push(...transformed);
        } else {
          childBlocks.push(transformed);
        }
      }

      // Get content from first child if it's a paragraph
      let content = '';
      if (childBlocks.length > 0 && childBlocks[0].type === 'paragraph') {
        content = typeof childBlocks[0].content === 'string'
          ? childBlocks[0].content
          : (childBlocks[0].content as BlockContent).text;
      }

      const block: Block = {
        id: generateId(),
        type: 'footnoteDefinition',
        content,
        meta: {
          identifier: fnDef.identifier,
        } as LegacyBlockMeta,
        children: childBlocks.length > 1 ? childBlocks.slice(1) : undefined,
        indent: context.indent,
      };

      // Store in context for later reference
      context.footnotes.set(fnDef.identifier, block);

      return block;
    }

    case 'containerDirective': {
      const container = node as ContainerDirective;
      const name = container.name.toLowerCase();

      // Map common container names to callout types
      const calloutTypeMap: Record<string, 'info' | 'warning' | 'error' | 'success' | 'tip' | 'note'> = {
        note: 'note',
        tip: 'tip',
        info: 'info',
        warning: 'warning',
        danger: 'error',
        error: 'error',
        success: 'success',
        important: 'warning',
        caution: 'warning',
      };

      const calloutType = calloutTypeMap[name];

      if (calloutType) {
        // Transform as callout
        const childBlocks: Block[] = [];

        for (const child of container.children) {
          const transformed = transformNode(child as ExtendedNode, { ...context, indent: 0 });
          if (Array.isArray(transformed)) {
            childBlocks.push(...transformed);
          } else {
            childBlocks.push(transformed);
          }
        }

        // Get title from attributes or first text
        const title = container.attributes?.title;

        // If single paragraph child, use its content
        if (childBlocks.length === 1 && childBlocks[0].type === 'paragraph') {
          return {
            id: generateId(),
            type: 'callout',
            content: typeof childBlocks[0].content === 'string'
              ? childBlocks[0].content
              : (childBlocks[0].content as BlockContent).text,
            meta: {
              calloutType,
              title,
            } as LegacyBlockMeta,
            indent: context.indent,
          };
        }

        return {
          id: generateId(),
          type: 'callout',
          content: '',
          children: childBlocks,
          meta: {
            calloutType,
            title,
          } as LegacyBlockMeta,
          indent: context.indent,
        };
      }

      // Unknown container - transform as generic container
      const childBlocks: Block[] = [];

      for (const child of container.children) {
        const transformed = transformNode(child as ExtendedNode, { ...context, indent: 0 });
        if (Array.isArray(transformed)) {
          childBlocks.push(...transformed);
        } else {
          childBlocks.push(transformed);
        }
      }

      return {
        id: generateId(),
        type: 'container',
        content: '',
        children: childBlocks,
        meta: {
          containerType: 'note',
          title: container.attributes?.title,
        } as LegacyBlockMeta,
        indent: context.indent,
      };
    }

    case 'leafDirective': {
      const leaf = node as LeafDirective;
      const content = extractInlineContent(leaf.children as ExtendedPhrasingContent[], context.linkReferences);

      // Handle special leaf directives
      if (leaf.name === 'youtube' || leaf.name === 'video') {
        return {
          id: generateId(),
          type: 'embed',
          content: '',
          meta: {
            src: leaf.attributes?.src || leaf.attributes?.url || content.text,
          } as LegacyBlockMeta,
          indent: context.indent,
        };
      }

      // Default: treat as paragraph
      return {
        id: generateId(),
        type: 'paragraph',
        content: content.text,
        meta: {},
        indent: context.indent,
      };
    }

    case 'html': {
      const html = node as Html;
      // Try to extract meaningful content from HTML
      const stripped = html.value.replace(/<[^>]*>/g, '').trim();

      // Check for common HTML patterns
      if (html.value.includes('<hr') || html.value.includes('<hr/')) {
        return {
          id: generateId(),
          type: 'divider',
          content: '',
          meta: {},
          indent: 0,
        };
      }

      if (stripped) {
        return {
          id: generateId(),
          type: 'paragraph',
          content: stripped,
          meta: {},
          indent: context.indent,
        };
      }

      // Empty HTML - skip
      return [];
    }

    case 'image': {
      const img = node as Image;
      return {
        id: generateId(),
        type: 'image',
        content: '',
        meta: {
          src: img.url,
          alt: img.alt || '',
          title: img.title || undefined,
        } as LegacyBlockMeta,
        indent: context.indent,
      };
    }

    default: {
      // Handle unknown node types gracefully
      context.warnings.push({
        message: `Unknown node type: ${node.type}`,
      });

      // Try to extract text content
      if ('value' in node && typeof (node as { value: unknown }).value === 'string') {
        return {
          id: generateId(),
          type: 'paragraph',
          content: (node as { value: string }).value,
          meta: {},
          indent: context.indent,
        };
      }

      if ('children' in node && Array.isArray((node as { children: unknown[] }).children)) {
        const blocks: Block[] = [];
        for (const child of (node as { children: ExtendedNode[] }).children) {
          const transformed = transformNode(child, context);
          if (Array.isArray(transformed)) {
            blocks.push(...transformed);
          } else {
            blocks.push(transformed);
          }
        }
        return blocks;
      }

      return [];
    }
  }
}

/**
 * Parse markdown string into blocks.
 *
 * @param markdown - The markdown string to parse
 * @param options - Parser configuration
 * @returns ParseResult containing blocks and extracted definitions
 *
 * @example
 * const { blocks } = parseMarkdown('# Hello **World**');
 * // blocks[0].type === 'heading1'
 * // blocks[0].content === 'Hello World'
 */
export function parseMarkdown(markdown: string, options: ParseOptions = {}): ParseResult {
  const {
    gfm: enableGfm = true,
    math: enableMath = true,
    containers: enableContainers = true,
  } = options;

  // Build extensions based on options
  // Define extension arrays with proper types from the micromark/mdast ecosystem
  const micromarkExtensions: Array<ReturnType<typeof gfm> | ReturnType<typeof math> | ReturnType<typeof directive>> = [];
  const mdastExtensions: Array<ReturnType<typeof gfmFromMarkdown> | ReturnType<typeof mathFromMarkdown> | ReturnType<typeof directiveFromMarkdown>> = [];

  if (enableGfm) {
    micromarkExtensions.push(gfm());
    mdastExtensions.push(gfmFromMarkdown());
  }

  if (enableMath) {
    micromarkExtensions.push(math());
    mdastExtensions.push(mathFromMarkdown());
  }

  if (enableContainers) {
    micromarkExtensions.push(directive());
    mdastExtensions.push(directiveFromMarkdown());
  }

  // Parse markdown to mdast
  let tree: Root;
  try {
    tree = fromMarkdown(markdown, {
      extensions: micromarkExtensions,
      mdastExtensions,
    });
  } catch (error) {
    // If parsing fails, return a single paragraph with the raw content
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    return {
      blocks: [{
        id: generateId(),
        type: 'paragraph',
        content: markdown,
        meta: {},
      }],
      linkReferences: new Map(),
      footnotes: new Map(),
      warnings: [{
        message: `Parsing error: ${errorMessage}`,
      }],
    };
  }

  // First pass: collect all link reference definitions
  const linkDefinitions = collectDefinitions(tree);

  // Initialize context
  const context: TransformContext = {
    indent: 0,
    slugs: new Set(),
    linkReferences: linkDefinitions,
    footnotes: new Map(),
    warnings: [],
    listItemIndex: 0,
    isTaskList: false,
    isTightList: false,
  };

  // Transform AST to blocks (skip definition nodes as they're already collected)
  const blocks: Block[] = [];

  for (const child of tree.children) {
    // Skip definition nodes - they're metadata, not content
    if (child.type === 'definition') {
      continue;
    }

    const transformed = transformNode(child as ExtendedNode, context);
    if (Array.isArray(transformed)) {
      blocks.push(...transformed);
    } else {
      blocks.push(transformed);
    }
  }

  // Ensure we have at least one block
  if (blocks.length === 0) {
    blocks.push({
      id: generateId(),
      type: 'paragraph',
      content: '',
      meta: {},
    });
  }

  return {
    blocks,
    linkReferences: context.linkReferences,
    footnotes: context.footnotes,
    warnings: context.warnings,
  };
}

/**
 * Convenience function for simple parsing (backward compatible)
 */
export function parseMarkdownToBlocks(markdown: string): Block[] {
  return parseMarkdown(markdown).blocks;
}

export default parseMarkdown;
