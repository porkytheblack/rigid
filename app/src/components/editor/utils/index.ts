// Editor utility functions

import { Block, BlockType, createBlock } from '../types';

/**
 * Parse markdown shortcuts at the start of a line
 */
export function parseMarkdownShortcut(text: string): { type: BlockType; content: string } | null {
  const trimmed = text.trimStart();

  // Headings
  if (trimmed.startsWith('### ')) {
    return { type: 'heading3', content: trimmed.slice(4) };
  }
  if (trimmed.startsWith('## ')) {
    return { type: 'heading2', content: trimmed.slice(3) };
  }
  if (trimmed.startsWith('# ')) {
    return { type: 'heading1', content: trimmed.slice(2) };
  }

  // Lists
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    return { type: 'bulletList', content: trimmed.slice(2) };
  }
  if (/^\d+\.\s/.test(trimmed)) {
    const match = trimmed.match(/^\d+\.\s(.*)$/);
    return { type: 'numberedList', content: match ? match[1] : '' };
  }

  // Todo
  if (trimmed.startsWith('[] ') || trimmed.startsWith('[ ] ')) {
    const content = trimmed.startsWith('[] ') ? trimmed.slice(3) : trimmed.slice(4);
    return { type: 'todo', content };
  }

  // Toggle
  if (trimmed.startsWith('> ')) {
    return { type: 'toggle', content: trimmed.slice(2) };
  }

  // Quote
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
    bulletList: 'Bulleted List',
    numberedList: 'Numbered List',
    todo: 'To-do',
    toggle: 'Toggle',
    quote: 'Quote',
    callout: 'Callout',
    code: 'Code',
    image: 'Image',
    video: 'Video',
    file: 'File',
    divider: 'Divider',
    table: 'Table',
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
    'bulletList',
    'numberedList',
    'todo',
    'toggle',
    'quote',
    'callout',
  ].includes(type);
}

/**
 * Check if a block type supports children
 */
export function supportsChildren(type: BlockType): boolean {
  return type === 'toggle';
}

/**
 * Check if a block type is a list
 */
export function isListBlock(type: BlockType): boolean {
  return ['bulletList', 'numberedList', 'todo'].includes(type);
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
    let text = block.content;
    if (block.children) {
      text += '\n' + blocksToPlainText(block.children);
    }
    return text;
  }).join('\n');
}

/**
 * Serialize blocks to HTML
 */
export function blocksToHtml(blocks: Block[]): string {
  return blocks.map(block => {
    switch (block.type) {
      case 'heading1':
        return `<h1>${escapeHtml(block.content)}</h1>`;
      case 'heading2':
        return `<h2>${escapeHtml(block.content)}</h2>`;
      case 'heading3':
        return `<h3>${escapeHtml(block.content)}</h3>`;
      case 'paragraph':
        return `<p>${escapeHtml(block.content)}</p>`;
      case 'quote':
        return `<blockquote>${escapeHtml(block.content)}</blockquote>`;
      case 'code':
        return `<pre><code>${escapeHtml(block.content)}</code></pre>`;
      case 'bulletList':
        return `<ul><li>${escapeHtml(block.content)}</li></ul>`;
      case 'numberedList':
        return `<ol><li>${escapeHtml(block.content)}</li></ol>`;
      case 'todo':
        const checked = block.meta?.checked ? ' checked' : '';
        return `<div><input type="checkbox"${checked}/> ${escapeHtml(block.content)}</div>`;
      case 'divider':
        return '<hr/>';
      case 'image':
        return `<img src="${escapeHtml(block.meta?.src || '')}" alt="${escapeHtml(block.meta?.alt || '')}"/>`;
      default:
        return `<p>${escapeHtml(block.content)}</p>`;
    }
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
