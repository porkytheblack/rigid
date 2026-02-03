/**
 * Comprehensive Parser Tests
 *
 * Tests for full CommonMark, GFM, and Extended Markdown compliance.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseMarkdownToBlocks, ParseResult } from './index';
import type { Block, BlockContent, Mark } from '../types';

// Helper to get text content from block
function getBlockText(block: Block): string {
  return typeof block.content === 'string' ? block.content : (block.content as BlockContent).text;
}

// Helper to get marks from block
function getBlockMarks(block: Block): Mark[] {
  if (typeof block.content === 'string') return [];
  return (block.content as BlockContent).marks || [];
}

describe('CommonMark Compliance', () => {
  describe('Headings', () => {
    it('parses ATX headings h1-h6', () => {
      const result = parseMarkdown(`# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`);

      expect(result.blocks).toHaveLength(6);
      expect(result.blocks[0].type).toBe('heading1');
      expect(result.blocks[1].type).toBe('heading2');
      expect(result.blocks[2].type).toBe('heading3');
      expect(result.blocks[3].type).toBe('heading4');
      expect(result.blocks[4].type).toBe('heading5');
      expect(result.blocks[5].type).toBe('heading6');
    });

    it('generates unique slugs for headings', () => {
      const result = parseMarkdown(`# Test
# Test
# Test`);

      const slugs = result.blocks.map(b => (b.meta as { slug?: string })?.slug);
      expect(slugs[0]).toBe('test');
      expect(slugs[1]).toBe('test-1');
      expect(slugs[2]).toBe('test-2');
    });
  });

  describe('Paragraphs', () => {
    it('parses simple paragraphs', () => {
      const result = parseMarkdown('This is a paragraph.');
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe('paragraph');
      expect(getBlockText(result.blocks[0])).toBe('This is a paragraph.');
    });

    it('parses multiple paragraphs separated by blank lines', () => {
      const result = parseMarkdown(`First paragraph.

Second paragraph.`);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].type).toBe('paragraph');
      expect(result.blocks[1].type).toBe('paragraph');
    });
  });

  describe('Inline Formatting', () => {
    it('parses bold text with **', () => {
      const result = parseMarkdown('This is **bold** text.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('bold');
      expect(getBlockText(result.blocks[0])).toBe('This is bold text.');
    });

    it('parses bold text with __', () => {
      const result = parseMarkdown('This is __bold__ text.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('bold');
    });

    it('parses italic text with *', () => {
      const result = parseMarkdown('This is *italic* text.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('italic');
    });

    it('parses italic text with _', () => {
      const result = parseMarkdown('This is _italic_ text.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('italic');
    });

    it('parses inline code', () => {
      const result = parseMarkdown('Use the `code` function.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('code');
    });

    it('parses nested formatting (bold in italic)', () => {
      const result = parseMarkdown('This is *italic with **bold** inside*.');
      const marks = getBlockMarks(result.blocks[0]);
      // Should have both italic and bold marks
      const hasItalic = marks.some(m => m.type === 'italic');
      const hasBold = marks.some(m => m.type === 'bold');
      expect(hasItalic).toBe(true);
      expect(hasBold).toBe(true);
    });
  });

  describe('Links', () => {
    it('parses inline links', () => {
      const result = parseMarkdown('Visit [Example](https://example.com).');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('link');
      expect(marks[0].attrs?.href).toBe('https://example.com');
    });

    it('parses inline links with titles', () => {
      const result = parseMarkdown('Visit [Example](https://example.com "Example Site").');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks[0].attrs?.title).toBe('Example Site');
    });

    it('parses reference links', () => {
      const result = parseMarkdown(`Visit [Example][ex].

[ex]: https://example.com "Example Site"`);
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('link');
      expect(marks[0].attrs?.href).toBe('https://example.com');
      expect(marks[0].attrs?.title).toBe('Example Site');
    });

    it('parses shortcut reference links', () => {
      const result = parseMarkdown(`Visit [Example].

[Example]: https://example.com`);
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('link');
      expect(marks[0].attrs?.href).toBe('https://example.com');
    });
  });

  describe('Images', () => {
    it('parses inline images', () => {
      const result = parseMarkdown('![Alt text](image.png)');
      expect(result.blocks[0].type).toBe('image');
      expect((result.blocks[0].meta as { alt?: string })?.alt).toBe('Alt text');
      expect((result.blocks[0].meta as { src?: string })?.src).toBe('image.png');
    });

    it('parses images with titles', () => {
      const result = parseMarkdown('![Alt](image.png "Image Title")');
      expect((result.blocks[0].meta as { title?: string })?.title).toBe('Image Title');
    });
  });

  describe('Code Blocks', () => {
    it('parses fenced code blocks with language', () => {
      const result = parseMarkdown('```javascript\nconst x = 1;\n```');
      expect(result.blocks[0].type).toBe('code');
      expect((result.blocks[0].meta as { language?: string })?.language).toBe('javascript');
      expect(getBlockText(result.blocks[0])).toBe('const x = 1;');
    });

    it('parses fenced code blocks without language', () => {
      const result = parseMarkdown('```\ncode here\n```');
      expect(result.blocks[0].type).toBe('code');
      expect((result.blocks[0].meta as { language?: string })?.language).toBe('plaintext');
    });

    it('parses mermaid blocks specially', () => {
      const result = parseMarkdown('```mermaid\ngraph TD\nA-->B\n```');
      expect(result.blocks[0].type).toBe('mermaid');
    });
  });

  describe('Lists', () => {
    it('parses unordered lists with -', () => {
      const result = parseMarkdown(`- Item 1
- Item 2
- Item 3`);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks.every(b => b.type === 'bulletList')).toBe(true);
    });

    it('parses unordered lists with *', () => {
      const result = parseMarkdown(`* Item 1
* Item 2`);
      expect(result.blocks.every(b => b.type === 'bulletList')).toBe(true);
    });

    it('parses ordered lists', () => {
      const result = parseMarkdown(`1. First
2. Second
3. Third`);
      expect(result.blocks).toHaveLength(3);
      expect(result.blocks.every(b => b.type === 'numberedList')).toBe(true);
    });

    it('parses nested lists', () => {
      const result = parseMarkdown(`- Item 1
  - Nested 1
  - Nested 2
- Item 2`);
      // Should have 4 blocks with varying indent levels
      expect(result.blocks.length).toBeGreaterThanOrEqual(4);
      const indentLevels = result.blocks.map(b => (b.meta as { indent?: number })?.indent ?? b.indent ?? 0);
      expect(indentLevels.some(i => i > 0)).toBe(true);
    });
  });

  describe('Blockquotes', () => {
    it('parses simple blockquotes', () => {
      const result = parseMarkdown('> This is a quote.');
      expect(result.blocks[0].type).toBe('quote');
      expect(getBlockText(result.blocks[0])).toBe('This is a quote.');
    });

    it('parses nested blockquotes', () => {
      const result = parseMarkdown(`> Outer quote
> > Inner quote`);
      // Nested blockquotes should be handled
      expect(result.blocks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Horizontal Rules', () => {
    it('parses --- as divider', () => {
      const result = parseMarkdown('---');
      expect(result.blocks[0].type).toBe('divider');
    });

    it('parses *** as divider', () => {
      const result = parseMarkdown('***');
      expect(result.blocks[0].type).toBe('divider');
    });

    it('parses ___ as divider', () => {
      const result = parseMarkdown('___');
      expect(result.blocks[0].type).toBe('divider');
    });
  });
});

describe('GFM Extensions', () => {
  describe('Strikethrough', () => {
    it('parses ~~strikethrough~~', () => {
      const result = parseMarkdown('This is ~~deleted~~ text.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks).toHaveLength(1);
      expect(marks[0].type).toBe('strikethrough');
    });
  });

  describe('Task Lists', () => {
    it('parses unchecked task items', () => {
      const result = parseMarkdown('- [ ] Unchecked task');
      expect(result.blocks[0].type).toBe('todo');
      expect((result.blocks[0].meta as { checked?: boolean })?.checked).toBe(false);
    });

    it('parses checked task items', () => {
      const result = parseMarkdown('- [x] Checked task');
      expect((result.blocks[0].meta as { checked?: boolean })?.checked).toBe(true);
    });

    it('parses mixed task lists', () => {
      const result = parseMarkdown(`- [ ] Task 1
- [x] Task 2
- [ ] Task 3`);
      expect(result.blocks[0].type).toBe('todo');
      expect((result.blocks[0].meta as { checked?: boolean })?.checked).toBe(false);
      expect((result.blocks[1].meta as { checked?: boolean })?.checked).toBe(true);
      expect((result.blocks[2].meta as { checked?: boolean })?.checked).toBe(false);
    });
  });

  describe('Tables', () => {
    it('parses simple tables', () => {
      const result = parseMarkdown(`| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |`);
      expect(result.blocks[0].type).toBe('table');
      const meta = result.blocks[0].meta as { rows?: unknown[][] };
      expect(meta.rows).toHaveLength(2);
    });

    it('parses tables with alignment', () => {
      const result = parseMarkdown(`| Left | Center | Right |
| :--- | :---: | ---: |
| A | B | C |`);
      const meta = result.blocks[0].meta as { columnAligns?: (string | null)[] };
      expect(meta.columnAligns).toEqual(['left', 'center', 'right']);
    });
  });

  describe('Autolinks', () => {
    it('parses angle bracket autolinks', () => {
      const result = parseMarkdown('Visit <https://example.com>.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks.some(m => m.type === 'link')).toBe(true);
    });
  });
});

describe('Extended Markdown', () => {
  describe('Highlight', () => {
    it('parses ==highlighted== text', () => {
      const result = parseMarkdown('This is ==highlighted== text.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks.some(m => m.type === 'highlight')).toBe(true);
    });
  });

  describe('Subscript and Superscript', () => {
    it('parses ~subscript~ text', () => {
      const result = parseMarkdown('H~2~O is water.');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks.some(m => m.type === 'subscript')).toBe(true);
    });

    it('parses ^superscript^ text', () => {
      const result = parseMarkdown('E = mc^2^');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks.some(m => m.type === 'superscript')).toBe(true);
    });

    it('distinguishes ~subscript~ from ~~strikethrough~~', () => {
      const result = parseMarkdown('~sub~ and ~~strike~~');
      const marks = getBlockMarks(result.blocks[0]);
      const hasSub = marks.some(m => m.type === 'subscript');
      const hasStrike = marks.some(m => m.type === 'strikethrough');
      expect(hasSub).toBe(true);
      expect(hasStrike).toBe(true);
    });
  });

  describe('Math', () => {
    it('parses inline math', () => {
      const result = parseMarkdown('The formula is $E = mc^2$.');
      const text = getBlockText(result.blocks[0]);
      expect(text).toContain('E = mc^2');
    });

    it('parses block math', () => {
      const result = parseMarkdown(`$$
E = mc^2
$$`);
      expect(result.blocks[0].type).toBe('mathBlock');
    });
  });

  describe('Footnotes', () => {
    it('parses footnote references', () => {
      const result = parseMarkdown('This has a footnote[^1].');
      const marks = getBlockMarks(result.blocks[0]);
      expect(marks.some(m => m.type === 'footnoteRef')).toBe(true);
    });

    it('parses footnote definitions', () => {
      const result = parseMarkdown(`Text[^1].

[^1]: This is the footnote.`);
      const fnBlock = result.blocks.find(b => b.type === 'footnoteDefinition');
      expect(fnBlock).toBeDefined();
      expect((fnBlock?.meta as { identifier?: string })?.identifier).toBe('1');
    });
  });

  describe('Custom Containers', () => {
    it('parses :::note containers', () => {
      const result = parseMarkdown(`:::note
This is a note.
:::`);
      expect(result.blocks[0].type).toBe('callout');
      expect((result.blocks[0].meta as { calloutType?: string })?.calloutType).toBe('note');
    });

    it('parses :::warning containers', () => {
      const result = parseMarkdown(`:::warning
This is a warning.
:::`);
      expect((result.blocks[0].meta as { calloutType?: string })?.calloutType).toBe('warning');
    });

    it('parses containers with titles', () => {
      const result = parseMarkdown(`:::tip Custom Title
Tip content here.
:::`);
      expect((result.blocks[0].meta as { calloutType?: string })?.calloutType).toBe('tip');
    });
  });
});

describe('Edge Cases', () => {
  it('handles empty input', () => {
    const result = parseMarkdown('');
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe('paragraph');
  });

  it('handles whitespace-only input', () => {
    const result = parseMarkdown('   \n   \n   ');
    expect(result.blocks).toHaveLength(1);
  });

  it('handles malformed markdown gracefully', () => {
    // Unclosed formatting
    const result = parseMarkdown('This is **unclosed bold');
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].type).toBe('paragraph');
  });

  it('collects link references correctly', () => {
    const result = parseMarkdown(`[link][ref]

[ref]: https://example.com "Title"`);
    expect(result.linkReferences.size).toBe(1);
    expect(result.linkReferences.get('ref')).toEqual({
      url: 'https://example.com',
      title: 'Title',
    });
  });

  it('generates unique block IDs', () => {
    const result = parseMarkdown(`Paragraph 1

Paragraph 2

Paragraph 3`);
    const ids = result.blocks.map(b => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('Backward Compatibility', () => {
  it('parseMarkdownToBlocks returns just blocks array', () => {
    const blocks = parseMarkdownToBlocks('# Test');
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks[0].type).toBe('heading1');
  });
});
