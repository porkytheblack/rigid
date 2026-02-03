// Editor utility functions

import { Block, BlockType, createBlock, getBlockText, LegacyBlockMeta } from '../types';
import { parseMarkdownToBlocks as parserParseMarkdownToBlocks } from '../parser';
import { blocksToMarkdown as serializerBlocksToMarkdown } from '../serializer';

// Re-export from parser and serializer
export { parseMarkdown, parseMarkdownToBlocks } from '../parser';
export { serializeBlocks, blocksToMarkdown, serializeInline } from '../serializer';

/**
 * Parse markdown shortcuts at the start of a line
 */
export function parseMarkdownShortcut(text: string): { type: BlockType; content: string } | null {
  const trimmed = text.trimStart();

  // Headings (check longer patterns first)
  if (trimmed.startsWith('###### ')) {
    return { type: 'heading6', content: trimmed.slice(7) };
  }
  if (trimmed.startsWith('##### ')) {
    return { type: 'heading5', content: trimmed.slice(6) };
  }
  if (trimmed.startsWith('#### ')) {
    return { type: 'heading4', content: trimmed.slice(5) };
  }
  if (trimmed.startsWith('### ')) {
    return { type: 'heading3', content: trimmed.slice(4) };
  }
  if (trimmed.startsWith('## ')) {
    return { type: 'heading2', content: trimmed.slice(3) };
  }
  if (trimmed.startsWith('# ')) {
    return { type: 'heading1', content: trimmed.slice(2) };
  }

  // Task lists / Todos (check before regular lists)
  if (trimmed.match(/^[-*]\s*\[[ xX]\]\s/)) {
    const isChecked = !!trimmed.match(/\[[xX]\]/);
    const content = trimmed.replace(/^[-*]\s*\[[ xX]\]\s*/, '');
    return { type: 'todo', content };
  }

  // Lists
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    return { type: 'bulletList', content: trimmed.slice(2) };
  }
  if (/^\d+\.\s/.test(trimmed)) {
    const match = trimmed.match(/^\d+\.\s(.*)$/);
    return { type: 'numberedList', content: match ? match[1] : '' };
  }

  // Toggle (using > for backward compatibility)
  if (trimmed.startsWith('> ')) {
    return { type: 'quote', content: trimmed.slice(2) };
  }

  // Quote (using " or ")
  if (trimmed.startsWith('" ') || trimmed.startsWith('" ')) {
    return { type: 'quote', content: trimmed.slice(2) };
  }

  // Divider
  if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
    return { type: 'divider', content: '' };
  }

  // Code block
  if (trimmed.startsWith('```')) {
    const language = trimmed.slice(3).trim();
    return { type: 'code', content: language };
  }

  // Math block
  if (trimmed.startsWith('$$')) {
    return { type: 'mathBlock', content: '' };
  }

  return null;
}

/**
 * Get the display name for a block type
 */
export function getBlockTypeName(type: BlockType): string {
  const names: Record<BlockType, string> = {
    paragraph: 'Paragraph',
    heading1: 'Heading 1',
    heading2: 'Heading 2',
    heading3: 'Heading 3',
    heading4: 'Heading 4',
    heading5: 'Heading 5',
    heading6: 'Heading 6',
    bulletList: 'Bulleted List',
    numberedList: 'Numbered List',
    taskList: 'Task List',
    todo: 'To-do',
    toggle: 'Toggle',
    quote: 'Quote',
    blockquote: 'Block Quote',
    callout: 'Callout',
    container: 'Container',
    code: 'Code',
    codeBlock: 'Code Block',
    mathBlock: 'Math Block',
    mermaid: 'Mermaid Diagram',
    image: 'Image',
    video: 'Video',
    file: 'File',
    embed: 'Embed',
    divider: 'Divider',
    table: 'Table',
    footnoteDefinition: 'Footnote',
  };
  return names[type] || type;
}

/**
 * Check if a block type supports text content
 */
export function isTextBlock(type: BlockType): boolean {
  return [
    'paragraph',
    'heading1',
    'heading2',
    'heading3',
    'heading4',
    'heading5',
    'heading6',
    'bulletList',
    'numberedList',
    'taskList',
    'todo',
    'toggle',
    'quote',
    'blockquote',
    'callout',
    'container',
  ].includes(type);
}

/**
 * Check if a block type supports children
 */
export function supportsChildren(type: BlockType): boolean {
  return type === 'toggle' || type === 'blockquote' || type === 'quote' || type === 'container' || type === 'callout';
}

/**
 * Check if a block type is a list
 */
export function isListBlock(type: BlockType): boolean {
  return ['bulletList', 'numberedList', 'taskList', 'todo'].includes(type);
}

/**
 * Move a block in an array
 */
export function moveBlock(blocks: Block[], fromIndex: number, toIndex: number): Block[] {
  const newBlocks = [...blocks];
  const [removed] = newBlocks.splice(fromIndex, 1);
  newBlocks.splice(toIndex, 0, removed);
  return newBlocks;
}

/**
 * Insert a block at a specific index
 */
export function insertBlock(blocks: Block[], index: number, block: Block): Block[] {
  const newBlocks = [...blocks];
  newBlocks.splice(index, 0, block);
  return newBlocks;
}

/**
 * Remove a block at a specific index
 */
export function removeBlock(blocks: Block[], index: number): Block[] {
  const newBlocks = [...blocks];
  newBlocks.splice(index, 1);
  return newBlocks;
}

/**
 * Find a block by ID
 */
export function findBlockById(blocks: Block[], id: string): Block | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find the index of a block by ID
 */
export function findBlockIndex(blocks: Block[], id: string): number {
  return blocks.findIndex(b => b.id === id);
}

/**
 * Update a block by ID
 */
export function updateBlockById(blocks: Block[], id: string, updates: Partial<Block>): Block[] {
  return blocks.map(block => {
    if (block.id === id) {
      return { ...block, ...updates };
    }
    if (block.children) {
      return {
        ...block,
        children: updateBlockById(block.children, id, updates),
      };
    }
    return block;
  });
}

/**
 * Serialize blocks to plain text
 */
export function blocksToPlainText(blocks: Block[]): string {
  return blocks.map(block => {
    let text = getBlockText(block);
    if (block.children) {
      text += '\n' + blocksToPlainText(block.children);
    }
    return text;
  }).join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Serialize blocks to HTML
 */
export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(block => {
    const text = getBlockText(block);
    const meta = block.meta as LegacyBlockMeta | undefined;

    switch (block.type) {
      case 'heading1':
        return `<h1>${escapeHtml(text)}</h1>`;
      case 'heading2':
        return `<h2>${escapeHtml(text)}</h2>`;
      case 'heading3':
        return `<h3>${escapeHtml(text)}</h3>`;
      case 'heading4':
        return `<h4>${escapeHtml(text)}</h4>`;
      case 'heading5':
        return `<h5>${escapeHtml(text)}</h5>`;
      case 'heading6':
        return `<h6>${escapeHtml(text)}</h6>`;
      case 'paragraph':
        return `<p>${escapeHtml(text)}</p>`;
      case 'quote':
      case 'blockquote':
        return `<blockquote>${escapeHtml(text)}</blockquote>`;
      case 'code':
      case 'codeBlock':
        return `<pre><code class="language-${meta?.language || 'plaintext'}">${escapeHtml(text)}</code></pre>`;
      case 'bulletList':
        return `<ul><li>${escapeHtml(text)}</li></ul>`;
      case 'numberedList':
        return `<ol><li>${escapeHtml(text)}</li></ol>`;
      case 'taskList':
      case 'todo': {
        const checked = meta?.checked ? ' checked' : '';
        return `<div class="task-item"><input type="checkbox"${checked} disabled/> ${escapeHtml(text)}</div>`;
      }
      case 'divider':
        return '<hr/>';
      case 'image':
        return `<img src="${escapeHtml(meta?.src || '')}" alt="${escapeHtml(meta?.alt || '')}"/>`;
      case 'table': {
        // Simple table rendering
        const rows = meta?.rows as Array<Array<{ content: { text: string } } | string>> | undefined;
        if (!rows || rows.length === 0) return '';

        let html = '<table><tbody>';
        for (const row of rows) {
          html += '<tr>';
          for (const cell of row) {
            const cellText = typeof cell === 'string' ? cell : (cell.content?.text || '');
            html += `<td>${escapeHtml(cellText)}</td>`;
          }
          html += '</tr>';
        }
        html += '</tbody></table>';
        return html;
      }
      case 'mathBlock':
        return `<div class="math-block">${escapeHtml(meta?.latex || text)}</div>`;
      case 'mermaid':
        return `<div class="mermaid">${escapeHtml(meta?.mermaidCode || text)}</div>`;
      case 'callout': {
        const calloutType = meta?.calloutType || 'info';
        return `<div class="callout callout-${calloutType}">${escapeHtml(text)}</div>`;
      }
      case 'toggle': {
        const childHtml = block.children ? blocksToHtml(block.children) : '';
        return `<details><summary>${escapeHtml(text)}</summary>${childHtml}</details>`;
      }
      default:
        return `<p>${escapeHtml(text)}</p>`;
    }
  }).join('\n');
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Create default blocks for empty editor
 */
export function createDefaultBlocks(): Block[] {
  return [createBlock('paragraph', '')];
}

/**
 * Calculate word count for blocks
 */
export function calculateWordCount(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) {
    const text = getBlockText(block);
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    count += words.length;
    if (block.children) {
      count += calculateWordCount(block.children);
    }
  }
  return count;
}

/**
 * Calculate character count for blocks
 */
export function calculateCharacterCount(blocks: Block[]): number {
  let count = 0;
  for (const block of blocks) {
    const text = getBlockText(block);
    count += text.length;
    if (block.children) {
      count += calculateCharacterCount(block.children);
    }
  }
  return count;
}

/**
 * Flatten nested blocks into a single array
 */
export function flattenBlocks(blocks: Block[]): Block[] {
  const result: Block[] = [];
  for (const block of blocks) {
    result.push(block);
    if (block.children) {
      result.push(...flattenBlocks(block.children));
    }
  }
  return result;
}

/**
 * Get all block IDs in order
 */
export function getAllBlockIds(blocks: Block[]): string[] {
  return flattenBlocks(blocks).map(b => b.id);
}

/**
 * Check if a block is empty (no meaningful content)
 */
export function isBlockEmpty(block: Block): boolean {
  const text = getBlockText(block);
  if (text.trim().length > 0) return false;
  if (block.children && block.children.length > 0) {
    return block.children.every(isBlockEmpty);
  }
  return true;
}

/**
 * Generate a slug from text for headings
 */
export function generateSlug(text: string, existingSlugs?: Set<string>): string {
  let slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  if (!slug) {
    slug = 'heading';
  }

  if (existingSlugs) {
    let finalSlug = slug;
    let counter = 1;
    while (existingSlugs.has(finalSlug)) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }
    return finalSlug;
  }

  return slug;
}
