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
    mermaid: 'Mermaid Diagram',
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

/**
 * Calculate indentation level from leading spaces/tabs
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;
  const spaces = match[1];
  // Count tabs as 2 spaces, then divide by 2 for indent level
  const spaceCount = spaces.replace(/\t/g, '  ').length;
  return Math.floor(spaceCount / 2);
}

/**
 * Parse markdown text into blocks with support for nesting and mermaid
 */
export function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trimStart();
    const indentLevel = getIndentLevel(line);

    // Handle code blocks (including mermaid)
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLanguage = trimmedLine.slice(3).trim() || 'plaintext';
        codeBlockContent = [];
      } else {
        // End of code block - check if it's mermaid
        if (codeBlockLanguage === 'mermaid') {
          blocks.push(createBlock('mermaid', '', { mermaidCode: codeBlockContent.join('\n') }));
        } else {
          blocks.push(createBlock('code', codeBlockContent.join('\n'), { language: codeBlockLanguage }));
        }
        inCodeBlock = false;
        codeBlockLanguage = '';
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line - skip
    if (trimmedLine === '') {
      continue;
    }

    // Headings
    if (trimmedLine.startsWith('### ')) {
      blocks.push(createBlock('heading3', trimmedLine.slice(4)));
      continue;
    }
    if (trimmedLine.startsWith('## ')) {
      blocks.push(createBlock('heading2', trimmedLine.slice(3)));
      continue;
    }
    if (trimmedLine.startsWith('# ')) {
      blocks.push(createBlock('heading1', trimmedLine.slice(2)));
      continue;
    }

    // Divider
    if (trimmedLine.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      blocks.push(createBlock('divider', ''));
      continue;
    }

    // Checkbox / Todo items (with nesting support)
    if (trimmedLine.match(/^[-*]\s*\[[ x]\]\s/i)) {
      const isChecked = !!trimmedLine.match(/\[[xX]\]/);
      const content = trimmedLine.replace(/^[-*]\s*\[[ xX]\]\s*/, '');
      blocks.push(createBlock('todo', content, { checked: isChecked, indent: indentLevel }));
      continue;
    }

    // Bullet list (with nesting support)
    if (trimmedLine.match(/^[-*]\s/)) {
      const content = trimmedLine.slice(2);
      blocks.push(createBlock('bulletList', content, { indent: indentLevel }));
      continue;
    }

    // Numbered list (with nesting support)
    if (trimmedLine.match(/^\d+\.\s/)) {
      const content = trimmedLine.replace(/^\d+\.\s/, '');
      blocks.push(createBlock('numberedList', content, { indent: indentLevel }));
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith('> ')) {
      blocks.push(createBlock('quote', trimmedLine.slice(2)));
      continue;
    }

    // Image
    const imgMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      blocks.push(createBlock('image', '', { alt: imgMatch[1], src: imgMatch[2] }));
      continue;
    }

    // Default: paragraph
    blocks.push(createBlock('paragraph', trimmedLine));
  }

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    if (codeBlockLanguage === 'mermaid') {
      blocks.push(createBlock('mermaid', '', { mermaidCode: codeBlockContent.join('\n') }));
    } else {
      blocks.push(createBlock('code', codeBlockContent.join('\n'), { language: codeBlockLanguage }));
    }
  }

  return blocks.length > 0 ? blocks : [createBlock('paragraph', '')];
}

/**
 * Convert blocks to markdown with proper indentation
 */
export function blocksToMarkdown(blocks: Block[]): string {
  let result: string[] = [];
  let prevWasList = false;

  for (const block of blocks) {
    const indent = '  '.repeat(block.meta?.indent || 0);
    const isListItem = ['bulletList', 'numberedList', 'todo'].includes(block.type);

    // Add blank line before non-list items, or when transitioning from list to non-list
    if (result.length > 0 && (!isListItem || (prevWasList && !isListItem))) {
      if (!prevWasList || !isListItem) {
        result.push('');
      }
    }

    switch (block.type) {
      case 'heading1':
        result.push(`# ${block.content}`);
        break;
      case 'heading2':
        result.push(`## ${block.content}`);
        break;
      case 'heading3':
        result.push(`### ${block.content}`);
        break;
      case 'paragraph':
        result.push(block.content);
        break;
      case 'quote':
        result.push(`> ${block.content}`);
        break;
      case 'code':
        result.push(`\`\`\`${block.meta?.language || ''}\n${block.content}\n\`\`\``);
        break;
      case 'bulletList':
        result.push(`${indent}- ${block.content}`);
        break;
      case 'numberedList':
        result.push(`${indent}1. ${block.content}`);
        break;
      case 'todo':
        result.push(`${indent}- [${block.meta?.checked ? 'x' : ' '}] ${block.content}`);
        break;
      case 'divider':
        result.push('---');
        break;
      case 'image':
        result.push(`![${block.meta?.alt || ''}](${block.meta?.src || ''})`);
        break;
      case 'callout':
        result.push(`> **${block.meta?.calloutType || 'info'}:** ${block.content}`);
        break;
      case 'toggle':
        result.push(`<details>\n<summary>${block.content}</summary>\n${block.children ? blocksToMarkdown(block.children) : ''}\n</details>`);
        break;
      case 'mermaid':
        result.push(`\`\`\`mermaid\n${block.meta?.mermaidCode || block.content}\n\`\`\``);
        break;
      default:
        result.push(block.content);
    }

    prevWasList = isListItem;
  }

  return result.join('\n');
}
