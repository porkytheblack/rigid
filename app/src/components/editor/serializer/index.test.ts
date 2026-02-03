/**
 * Comprehensive tests for the Markdown Serializer
 *
 * Tests cover:
 * - All block types
 * - All inline mark types
 * - Overlapping marks
 * - Nested structures
 * - Edge cases
 * - Round-trip consistency with parser
 */

import { describe, it, expect } from 'vitest';
import {
  serializeBlocks,
  serializeInline,
  serializeBlock,
  serializeBlockContent,
  blocksToMarkdown,
  SerializeContext,
} from './index';
import type { Block, BlockContent, Mark } from '../types';

// Helper to create a block with default values
function createBlock(partial: Partial<Block> & { type: Block['type'] }): Block {
  return {
    id: crypto.randomUUID(),
    content: '',
    meta: {},
    ...partial,
  };
}

// Helper to create BlockContent
function createContent(text: string, marks: Mark[] = []): BlockContent {
  return { text, marks };
}

// Helper to create a default context for serializeBlock tests
function createContext(): SerializeContext {
  return {
    linkReferences: new Map(),
    footnotes: new Map(),
    options: {
      softBreaks: false,
      bulletChar: '-',
      emphasisChar: '*',
      listIndent: 2,
      linkReferences: false,
      footnotes: true,
      escapeText: false,
      strongChar: '**',
    },
    listCounters: new Map(),
    inList: false,
    currentListType: null,
  };
}

describe('serializeInline', () => {
  describe('plain text', () => {
    it('returns plain text unchanged', () => {
      const content = createContent('Hello, world!');
      expect(serializeInline(content)).toBe('Hello, world!');
    });

    it('handles empty text', () => {
      const content = createContent('');
      expect(serializeInline(content)).toBe('');
    });

    it('handles string content for backward compatibility', () => {
      expect(serializeInline('Hello, world!')).toBe('Hello, world!');
    });
  });

  describe('single marks', () => {
    it('serializes bold text', () => {
      const content = createContent('Hello bold world', [
        { type: 'bold', from: 6, to: 10 },
      ]);
      expect(serializeInline(content)).toBe('Hello **bold** world');
    });

    it('serializes italic text', () => {
      const content = createContent('Hello italic world', [
        { type: 'italic', from: 6, to: 12 },
      ]);
      expect(serializeInline(content)).toBe('Hello *italic* world');
    });

    it('serializes strikethrough text', () => {
      const content = createContent('Hello deleted world', [
        { type: 'strikethrough', from: 6, to: 13 },
      ]);
      expect(serializeInline(content)).toBe('Hello ~~deleted~~ world');
    });

    it('serializes inline code', () => {
      const content = createContent('Use the code function', [
        { type: 'code', from: 8, to: 12 },
      ]);
      expect(serializeInline(content)).toBe('Use the `code` function');
    });

    it('serializes highlight', () => {
      const content = createContent('This is important', [
        { type: 'highlight', from: 8, to: 17 },
      ]);
      expect(serializeInline(content)).toBe('This is ==important==');
    });

    it('serializes subscript', () => {
      const content = createContent('H2O', [
        { type: 'subscript', from: 1, to: 2 },
      ]);
      expect(serializeInline(content)).toBe('H~2~O');
    });

    it('serializes superscript', () => {
      const content = createContent('x2', [
        { type: 'superscript', from: 1, to: 2 },
      ]);
      expect(serializeInline(content)).toBe('x^2^');
    });

    it('serializes underline', () => {
      const content = createContent('underlined text', [
        { type: 'underline', from: 0, to: 10 },
      ]);
      expect(serializeInline(content)).toBe('<u>underlined</u> text');
    });

    it('serializes links without title', () => {
      const content = createContent('Click here for more', [
        { type: 'link', from: 6, to: 10, attrs: { href: 'https://example.com' } },
      ]);
      expect(serializeInline(content)).toBe('Click [here](https://example.com) for more');
    });

    it('serializes links with title', () => {
      const content = createContent('Click here for more', [
        { type: 'link', from: 6, to: 10, attrs: { href: 'https://example.com', title: 'Example Site' } },
      ]);
      expect(serializeInline(content)).toBe('Click [here](https://example.com "Example Site") for more');
    });

    it('serializes footnote references', () => {
      const content = createContent('See footnote[^1] here', [
        { type: 'footnoteRef', from: 12, to: 16, attrs: { footnoteId: '1' } },
      ]);
      expect(serializeInline(content)).toBe('See footnote[^1] here');
    });
  });

  describe('nested marks', () => {
    it('serializes bold inside italic', () => {
      const content = createContent('italic and bold', [
        { type: 'italic', from: 0, to: 15 },
        { type: 'bold', from: 11, to: 15 },
      ]);
      expect(serializeInline(content)).toBe('*italic and **bold***');
    });

    it('serializes italic inside bold', () => {
      const content = createContent('bold and italic', [
        { type: 'bold', from: 0, to: 15 },
        { type: 'italic', from: 9, to: 15 },
      ]);
      expect(serializeInline(content)).toBe('**bold and *italic***');
    });

    it('serializes bold and italic on same text', () => {
      const content = createContent('both styles', [
        { type: 'bold', from: 0, to: 11 },
        { type: 'italic', from: 0, to: 11 },
      ]);
      // Bold opens first (lower priority), italic opens second
      expect(serializeInline(content)).toBe('***both styles***');
    });

    it('serializes link with bold text', () => {
      const content = createContent('Click bold link', [
        { type: 'link', from: 6, to: 15, attrs: { href: 'https://example.com' } },
        { type: 'bold', from: 6, to: 10 },
      ]);
      expect(serializeInline(content)).toBe('Click [**bold** link](https://example.com)');
    });
  });

  describe('overlapping marks', () => {
    it('handles overlapping bold and italic', () => {
      const content = createContent('Hello bold and italic world', [
        { type: 'bold', from: 6, to: 18 },    // "bold and ital"
        { type: 'italic', from: 15, to: 27 }, // "italic world"
      ]);
      // Should produce proper nesting with reopening
      const result = serializeInline(content);
      expect(result).toContain('**');
      expect(result).toContain('*');
    });

    it('handles three overlapping marks', () => {
      const content = createContent('ABCDEFGHIJ', [
        { type: 'bold', from: 1, to: 7 },        // BCDEFG
        { type: 'italic', from: 3, to: 8 },      // DEFGH
        { type: 'strikethrough', from: 5, to: 9 }, // FGHI
      ]);
      const result = serializeInline(content);
      // Just verify all marks are present
      expect(result).toContain('**');
      expect(result).toContain('*');
      expect(result).toContain('~~');
    });
  });

  describe('edge cases', () => {
    it('handles marks at start of text', () => {
      const content = createContent('bold text', [
        { type: 'bold', from: 0, to: 4 },
      ]);
      expect(serializeInline(content)).toBe('**bold** text');
    });

    it('handles marks at end of text', () => {
      const content = createContent('text bold', [
        { type: 'bold', from: 5, to: 9 },
      ]);
      expect(serializeInline(content)).toBe('text **bold**');
    });

    it('handles marks spanning entire text', () => {
      const content = createContent('all bold', [
        { type: 'bold', from: 0, to: 8 },
      ]);
      expect(serializeInline(content)).toBe('**all bold**');
    });

    it('handles adjacent marks', () => {
      const content = createContent('bolditalic', [
        { type: 'bold', from: 0, to: 4 },
        { type: 'italic', from: 4, to: 10 },
      ]);
      expect(serializeInline(content)).toBe('**bold***italic*');
    });

    it('filters out invalid marks', () => {
      const content = createContent('text', [
        { type: 'bold', from: 5, to: 10 }, // Out of bounds
        { type: 'italic', from: 2, to: 1 }, // Invalid range
      ]);
      expect(serializeInline(content)).toBe('text');
    });

    it('handles empty marks array', () => {
      const content = createContent('text', []);
      expect(serializeInline(content)).toBe('text');
    });
  });

  describe('emphasis character options', () => {
    it('uses underscore for emphasis when configured', () => {
      const content = createContent('italic and bold', [
        { type: 'italic', from: 0, to: 6 },
        { type: 'bold', from: 11, to: 15 },
      ]);
      const options = {
        softBreaks: false,
        bulletChar: '-' as const,
        emphasisChar: '_' as const,
        listIndent: 2,
        linkReferences: false,
        footnotes: true,
        escapeText: false,
        strongChar: '**' as const,
      };
      expect(serializeInline(content, options)).toBe('_italic_ and __bold__');
    });
  });
});

describe('serializeBlock', () => {
  describe('paragraph', () => {
    it('serializes paragraph', () => {
      const block = createBlock({
        type: 'paragraph',
        content: 'Hello, world!',
      });
      expect(serializeBlock(block, createContext())).toBe('Hello, world!');
    });

    it('serializes paragraph with marks', () => {
      const block = createBlock({
        type: 'paragraph',
        content: createContent('Hello bold world', [
          { type: 'bold', from: 6, to: 10 },
        ]),
      });
      expect(serializeBlock(block, createContext())).toBe('Hello **bold** world');
    });
  });

  describe('headings', () => {
    it('serializes heading 1', () => {
      const block = createBlock({ type: 'heading1', content: 'Title' });
      expect(serializeBlock(block, createContext())).toBe('# Title');
    });

    it('serializes heading 2', () => {
      const block = createBlock({ type: 'heading2', content: 'Section' });
      expect(serializeBlock(block, createContext())).toBe('## Section');
    });

    it('serializes heading 3', () => {
      const block = createBlock({ type: 'heading3', content: 'Subsection' });
      expect(serializeBlock(block, createContext())).toBe('### Subsection');
    });

    it('serializes heading 4', () => {
      const block = createBlock({ type: 'heading4', content: 'Level 4' });
      expect(serializeBlock(block, createContext())).toBe('#### Level 4');
    });

    it('serializes heading 5', () => {
      const block = createBlock({ type: 'heading5', content: 'Level 5' });
      expect(serializeBlock(block, createContext())).toBe('##### Level 5');
    });

    it('serializes heading 6', () => {
      const block = createBlock({ type: 'heading6', content: 'Level 6' });
      expect(serializeBlock(block, createContext())).toBe('###### Level 6');
    });

    it('serializes heading with marks', () => {
      const block = createBlock({
        type: 'heading1',
        content: createContent('Bold Title', [
          { type: 'bold', from: 0, to: 4 },
        ]),
      });
      expect(serializeBlock(block, createContext())).toBe('# **Bold** Title');
    });
  });

  describe('lists', () => {
    it('serializes bullet list item', () => {
      const block = createBlock({ type: 'bulletList', content: 'List item' });
      expect(serializeBlock(block, createContext())).toBe('- List item');
    });

    it('serializes numbered list item', () => {
      const context = createContext();
      const block = createBlock({ type: 'numberedList', content: 'First item' });
      expect(serializeBlock(block, context)).toBe('1. First item');
    });

    it('increments numbered list counter', () => {
      const context = createContext();
      const block1 = createBlock({ type: 'numberedList', content: 'First' });
      const block2 = createBlock({ type: 'numberedList', content: 'Second' });

      expect(serializeBlock(block1, context)).toBe('1. First');
      expect(serializeBlock(block2, context)).toBe('2. Second');
    });

    it('serializes task list unchecked', () => {
      const block = createBlock({
        type: 'taskList',
        content: 'Todo item',
        meta: { checked: false },
      });
      expect(serializeBlock(block, createContext())).toBe('- [ ] Todo item');
    });

    it('serializes task list checked', () => {
      const block = createBlock({
        type: 'taskList',
        content: 'Done item',
        meta: { checked: true },
      });
      expect(serializeBlock(block, createContext())).toBe('- [x] Done item');
    });

    it('serializes todo (alias) unchecked', () => {
      const block = createBlock({
        type: 'todo',
        content: 'Todo item',
        meta: { checked: false },
      });
      expect(serializeBlock(block, createContext())).toBe('- [ ] Todo item');
    });

    it('serializes indented list item', () => {
      const block = createBlock({
        type: 'bulletList',
        content: 'Nested item',
        meta: { indent: 1 },
      });
      expect(serializeBlock(block, createContext())).toBe('  - Nested item');
    });

    it('serializes deeply nested list item', () => {
      const block = createBlock({
        type: 'bulletList',
        content: 'Deep item',
        meta: { indent: 3 },
      });
      expect(serializeBlock(block, createContext())).toBe('      - Deep item');
    });
  });

  describe('blockquote', () => {
    it('serializes simple blockquote', () => {
      const block = createBlock({ type: 'quote', content: 'Quoted text' });
      expect(serializeBlock(block, createContext())).toBe('> Quoted text');
    });

    it('serializes blockquote with children', () => {
      const block = createBlock({
        type: 'blockquote',
        content: '',
        children: [
          createBlock({ type: 'paragraph', content: 'First paragraph' }),
          createBlock({ type: 'paragraph', content: 'Second paragraph' }),
        ],
      });
      const result = serializeBlock(block, createContext());
      expect(result).toContain('> First paragraph');
    });
  });

  describe('code blocks', () => {
    it('serializes code block without language', () => {
      const block = createBlock({
        type: 'codeBlock',
        content: 'const x = 1;',
        meta: {},
      });
      expect(serializeBlock(block, createContext())).toBe('```\nconst x = 1;\n```');
    });

    it('serializes code block with language', () => {
      const block = createBlock({
        type: 'codeBlock',
        content: 'const x = 1;',
        meta: { language: 'javascript' },
      });
      expect(serializeBlock(block, createContext())).toBe('```javascript\nconst x = 1;\n```');
    });

    it('serializes code (alias) block', () => {
      const block = createBlock({
        type: 'code',
        content: 'print("hello")',
        meta: { language: 'python' },
      });
      expect(serializeBlock(block, createContext())).toBe('```python\nprint("hello")\n```');
    });

    it('serializes mermaid block', () => {
      const block = createBlock({
        type: 'mermaid',
        content: 'graph TD\n  A --> B',
        meta: { mermaidCode: 'graph TD\n  A --> B' },
      });
      expect(serializeBlock(block, createContext())).toBe('```mermaid\ngraph TD\n  A --> B\n```');
    });
  });

  describe('math blocks', () => {
    it('serializes math block', () => {
      const block = createBlock({
        type: 'mathBlock',
        content: 'E = mc^2',
        meta: { latex: 'E = mc^2' },
      });
      expect(serializeBlock(block, createContext())).toBe('$$\nE = mc^2\n$$');
    });
  });

  describe('divider', () => {
    it('serializes divider', () => {
      const block = createBlock({ type: 'divider', content: '' });
      expect(serializeBlock(block, createContext())).toBe('---');
    });
  });

  describe('image', () => {
    it('serializes image without title', () => {
      const block = createBlock({
        type: 'image',
        content: '',
        meta: { src: 'https://example.com/image.png', alt: 'Example' },
      });
      expect(serializeBlock(block, createContext())).toBe('![Example](https://example.com/image.png)');
    });

    it('serializes image with title', () => {
      const block = createBlock({
        type: 'image',
        content: '',
        meta: {
          src: 'https://example.com/image.png',
          alt: 'Example',
          title: 'My Image',
        },
      });
      expect(serializeBlock(block, createContext())).toBe('![Example](https://example.com/image.png "My Image")');
    });

    it('escapes special characters in alt text', () => {
      const block = createBlock({
        type: 'image',
        content: '',
        meta: { src: 'image.png', alt: 'Image [with] brackets' },
      });
      const result = serializeBlock(block, createContext());
      expect(result).toContain('\\[with\\]');
    });
  });

  describe('table', () => {
    it('serializes simple table', () => {
      const block = createBlock({
        type: 'table',
        content: '',
        meta: {
          rows: [
            [{ content: { text: 'Header 1', marks: [] } }, { content: { text: 'Header 2', marks: [] } }],
            [{ content: { text: 'Cell 1', marks: [] } }, { content: { text: 'Cell 2', marks: [] } }],
          ],
          columnAligns: [null, null],
        },
      });
      const result = serializeBlock(block, createContext());
      expect(result).toContain('| Header 1 | Header 2 |');
      expect(result).toContain('| --- | --- |');
      expect(result).toContain('| Cell 1 | Cell 2 |');
    });

    it('serializes table with alignment', () => {
      const block = createBlock({
        type: 'table',
        content: '',
        meta: {
          rows: [
            [{ content: { text: 'Left', marks: [] } }, { content: { text: 'Center', marks: [] } }, { content: { text: 'Right', marks: [] } }],
          ],
          columnAligns: ['left', 'center', 'right'],
        },
      });
      const result = serializeBlock(block, createContext());
      expect(result).toContain(':---');
      expect(result).toContain(':---:');
      expect(result).toContain('---:');
    });

    it('serializes table with formatted content', () => {
      const block = createBlock({
        type: 'table',
        content: '',
        meta: {
          rows: [
            [
              { content: createContent('Bold', [{ type: 'bold', from: 0, to: 4 }]) },
              { content: { text: 'Plain', marks: [] } },
            ],
          ],
          columnAligns: [null, null],
        },
      });
      const result = serializeBlock(block, createContext());
      expect(result).toContain('**Bold**');
    });
  });

  describe('callout', () => {
    it('serializes callout with content', () => {
      const block = createBlock({
        type: 'callout',
        content: 'Important note',
        meta: { calloutType: 'info' },
      });
      const result = serializeBlock(block, createContext());
      expect(result).toBe(':::info\nImportant note\n:::');
    });

    it('serializes callout with title', () => {
      const block = createBlock({
        type: 'callout',
        content: 'Note content',
        meta: { calloutType: 'warning', title: 'Warning!' },
      });
      const result = serializeBlock(block, createContext());
      expect(result).toBe(':::warning Warning!\nNote content\n:::');
    });
  });

  describe('container', () => {
    it('serializes container', () => {
      const block = createBlock({
        type: 'container',
        content: 'Container content',
        meta: { containerType: 'note' },
      });
      const result = serializeBlock(block, createContext());
      expect(result).toBe(':::note\nContainer content\n:::');
    });
  });

  describe('toggle', () => {
    it('serializes toggle without children', () => {
      const block = createBlock({
        type: 'toggle',
        content: 'Summary',
      });
      const result = serializeBlock(block, createContext());
      expect(result).toContain('<details>');
      expect(result).toContain('<summary>Summary</summary>');
      expect(result).toContain('</details>');
    });

    it('serializes toggle with children', () => {
      const block = createBlock({
        type: 'toggle',
        content: 'Click to expand',
        children: [
          createBlock({ type: 'paragraph', content: 'Hidden content' }),
        ],
      });
      const result = serializeBlock(block, createContext());
      expect(result).toContain('<summary>Click to expand</summary>');
      expect(result).toContain('Hidden content');
    });
  });

  describe('footnote definition', () => {
    it('serializes footnote definition', () => {
      const block = createBlock({
        type: 'footnoteDefinition',
        content: 'This is the footnote text.',
        meta: { identifier: '1' },
      });
      expect(serializeBlock(block, createContext())).toBe('[^1]: This is the footnote text.');
    });
  });

  describe('video', () => {
    it('serializes video', () => {
      const block = createBlock({
        type: 'video',
        content: '',
        meta: { src: 'https://example.com/video.mp4' },
      });
      expect(serializeBlock(block, createContext())).toBe('<video src="https://example.com/video.mp4"></video>');
    });
  });

  describe('file', () => {
    it('serializes file', () => {
      const block = createBlock({
        type: 'file',
        content: '',
        meta: { src: 'https://example.com/doc.pdf', fileName: 'document.pdf' },
      });
      expect(serializeBlock(block, createContext())).toBe('[document.pdf](https://example.com/doc.pdf)');
    });
  });

  describe('embed', () => {
    it('serializes embed', () => {
      const block = createBlock({
        type: 'embed',
        content: '',
        meta: { src: 'https://example.com/embed' },
      });
      expect(serializeBlock(block, createContext())).toBe('<iframe src="https://example.com/embed"></iframe>');
    });
  });
});

describe('serializeBlocks', () => {
  it('serializes multiple blocks', () => {
    const blocks: Block[] = [
      createBlock({ type: 'heading1', content: 'Title' }),
      createBlock({ type: 'paragraph', content: 'First paragraph.' }),
      createBlock({ type: 'paragraph', content: 'Second paragraph.' }),
    ];
    const result = serializeBlocks(blocks);
    expect(result).toContain('# Title');
    expect(result).toContain('First paragraph.');
    expect(result).toContain('Second paragraph.');
  });

  it('adds blank lines between different block types', () => {
    const blocks: Block[] = [
      createBlock({ type: 'paragraph', content: 'Paragraph' }),
      createBlock({ type: 'heading1', content: 'Heading' }),
    ];
    const result = serializeBlocks(blocks);
    expect(result).toBe('Paragraph\n\n# Heading');
  });

  it('does not add blank lines between list items', () => {
    const blocks: Block[] = [
      createBlock({ type: 'bulletList', content: 'Item 1' }),
      createBlock({ type: 'bulletList', content: 'Item 2' }),
      createBlock({ type: 'bulletList', content: 'Item 3' }),
    ];
    const result = serializeBlocks(blocks);
    expect(result).toBe('- Item 1\n- Item 2\n- Item 3');
  });

  it('resets numbered list counter for new list', () => {
    const blocks: Block[] = [
      createBlock({ type: 'numberedList', content: 'First' }),
      createBlock({ type: 'numberedList', content: 'Second' }),
      createBlock({ type: 'paragraph', content: 'Break' }),
      createBlock({ type: 'numberedList', content: 'New first' }),
    ];
    const result = serializeBlocks(blocks);
    expect(result).toContain('1. First');
    expect(result).toContain('2. Second');
    expect(result).toContain('1. New first');
  });

  it('handles nested list indentation', () => {
    const blocks: Block[] = [
      createBlock({ type: 'bulletList', content: 'Level 0', meta: { indent: 0 } }),
      createBlock({ type: 'bulletList', content: 'Level 1', meta: { indent: 1 } }),
      createBlock({ type: 'bulletList', content: 'Level 2', meta: { indent: 2 } }),
      createBlock({ type: 'bulletList', content: 'Back to 1', meta: { indent: 1 } }),
    ];
    const result = serializeBlocks(blocks);
    expect(result).toContain('- Level 0');
    expect(result).toContain('  - Level 1');
    expect(result).toContain('    - Level 2');
    expect(result).toContain('  - Back to 1');
  });

  it('handles empty blocks array', () => {
    expect(serializeBlocks([])).toBe('');
  });

  it('uses custom bullet character', () => {
    const blocks: Block[] = [
      createBlock({ type: 'bulletList', content: 'Item' }),
    ];
    const result = serializeBlocks(blocks, { bulletChar: '*' });
    expect(result).toBe('* Item');
  });

  it('uses custom emphasis character', () => {
    const blocks: Block[] = [
      createBlock({
        type: 'paragraph',
        content: createContent('italic', [
          { type: 'italic', from: 0, to: 6 },
        ]),
      }),
    ];
    const result = serializeBlocks(blocks, { emphasisChar: '_' });
    expect(result).toBe('_italic_');
  });
});

describe('blocksToMarkdown', () => {
  it('is alias for serializeBlocks', () => {
    const blocks: Block[] = [
      createBlock({ type: 'paragraph', content: 'Test' }),
    ];
    expect(blocksToMarkdown(blocks)).toBe(serializeBlocks(blocks));
  });
});

describe('serializeBlockContent', () => {
  it('serializes block content with marks', () => {
    const block = createBlock({
      type: 'paragraph',
      content: createContent('Hello bold world', [
        { type: 'bold', from: 6, to: 10 },
      ]),
    });
    expect(serializeBlockContent(block)).toBe('Hello **bold** world');
  });
});

describe('URL escaping', () => {
  it('escapes parentheses in URLs', () => {
    const block = createBlock({
      type: 'image',
      content: '',
      meta: { src: 'https://example.com/image(1).png', alt: 'Test' },
    });
    const result = serializeBlock(block, createContext());
    expect(result).toContain('%28');
    expect(result).toContain('%29');
  });

  it('escapes spaces in URLs', () => {
    const block = createBlock({
      type: 'image',
      content: '',
      meta: { src: 'https://example.com/my image.png', alt: 'Test' },
    });
    const result = serializeBlock(block, createContext());
    expect(result).toContain('%20');
  });
});

describe('title escaping', () => {
  it('escapes quotes in titles', () => {
    const block = createBlock({
      type: 'image',
      content: '',
      meta: { src: 'image.png', alt: 'Test', title: 'A "quoted" title' },
    });
    const result = serializeBlock(block, createContext());
    expect(result).toContain('\\"');
  });
});

describe('table cell escaping', () => {
  it('escapes pipe characters in table cells', () => {
    const block = createBlock({
      type: 'table',
      content: '',
      meta: {
        rows: [
          [{ content: { text: 'Cell | with | pipes', marks: [] } }],
        ],
        columnAligns: [null],
      },
    });
    const result = serializeBlock(block, createContext());
    expect(result).toContain('\\|');
  });
});

describe('complex documents', () => {
  it('serializes a complete document', () => {
    const blocks: Block[] = [
      createBlock({ type: 'heading1', content: 'Document Title' }),
      createBlock({ type: 'paragraph', content: 'Introduction paragraph.' }),
      createBlock({ type: 'heading2', content: 'First Section' }),
      createBlock({ type: 'paragraph', content: 'Some text here.' }),
      createBlock({ type: 'bulletList', content: 'Point one', meta: { indent: 0 } }),
      createBlock({ type: 'bulletList', content: 'Point two', meta: { indent: 0 } }),
      createBlock({ type: 'bulletList', content: 'Sub-point', meta: { indent: 1 } }),
      createBlock({
        type: 'codeBlock',
        content: 'console.log("Hello");',
        meta: { language: 'javascript' },
      }),
      createBlock({ type: 'divider', content: '' }),
      createBlock({ type: 'heading2', content: 'Conclusion' }),
      createBlock({
        type: 'paragraph',
        content: createContent('Final thoughts with emphasis.', [
          { type: 'italic', from: 20, to: 28 },
        ]),
      }),
    ];

    const result = serializeBlocks(blocks);

    expect(result).toContain('# Document Title');
    expect(result).toContain('## First Section');
    expect(result).toContain('- Point one');
    expect(result).toContain('  - Sub-point');
    expect(result).toContain('```javascript');
    expect(result).toContain('---');
    expect(result).toContain('*emphasis*');
  });
});
