// Editor Types and Interfaces
// Comprehensive type definitions for the block editor with full markdown support

/**
 * All supported block types in the editor.
 * Organized by category for slash command menu grouping.
 */
export type BlockType =
  // Text blocks
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  // List blocks
  | 'bulletList'
  | 'numberedList'
  | 'taskList'
  // Alias for backward compatibility
  | 'todo'
  // Container blocks
  | 'blockquote'
  | 'quote' // Alias for backward compatibility
  | 'callout'
  | 'toggle'
  | 'container'
  // Code blocks
  | 'codeBlock'
  | 'code' // Alias for backward compatibility
  | 'mathBlock'
  | 'mermaid'
  // Media blocks
  | 'image'
  | 'video'
  | 'file'
  | 'embed'
  // Table blocks
  | 'table'
  // Reference blocks
  | 'footnoteDefinition'
  // Structural blocks
  | 'divider';

/**
 * Inline formatting marks that can be applied to text ranges.
 * Marks are non-exclusive (text can be bold AND italic).
 */
export type MarkType =
  | 'bold'           // **text** or __text__
  | 'italic'         // *text* or _text_
  | 'strikethrough'  // ~~text~~
  | 'code'           // `text`
  | 'underline'      // Custom (not standard markdown)
  | 'highlight'      // ==text==
  | 'subscript'      // ~text~
  | 'superscript'    // ^text^
  | 'link'           // [text](url)
  | 'footnoteRef';   // [^1]

/**
 * Attributes for marks that need additional data.
 */
export interface MarkAttrs {
  // For links
  href?: string;
  title?: string;
  // For footnotes
  footnoteId?: string;
  // For custom colors
  color?: string;
  backgroundColor?: string;
}

/**
 * A mark applied to a text range.
 * Marks are stored as ranges for efficient serialization.
 */
export interface Mark {
  type: MarkType;
  from: number;      // Start offset (inclusive)
  to: number;        // End offset (exclusive)
  attrs?: MarkAttrs;
}

/**
 * Content model for a block.
 * Blocks either contain rich text OR nested blocks, never both.
 */
export interface BlockContent {
  /**
   * The text content of the block.
   * For code blocks, this is the raw code.
   * For rich text blocks, this is the unmarked text.
   */
  text: string;

  /**
   * Marks applied to the text.
   * Sorted by `from` offset for efficient processing.
   */
  marks: Mark[];
}

// Callout types
export type CalloutType = 'info' | 'warning' | 'error' | 'success' | 'tip' | 'note';

// Container types
export type ContainerType = 'note' | 'warning' | 'tip' | 'danger' | 'info' | 'details';

// Table cell alignment
export type TableCellAlign = 'left' | 'center' | 'right' | null;

/**
 * Table cell data structure
 */
export interface TableCell {
  content: BlockContent;
  colspan?: number;
  rowspan?: number;
}

/**
 * Block metadata types - each block type has specific metadata
 */
export interface ParagraphMeta {
  type: 'paragraph';
}

export interface HeadingMeta {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  slug?: string;
}

export interface ListItemMeta {
  type: 'listItem';
  listStyle: 'bullet' | 'number' | 'alpha' | 'roman';
  start?: number;
  tight?: boolean;
  indent?: number;
}

export interface TaskItemMeta {
  type: 'taskItem';
  checked: boolean;
  indent?: number;
}

export interface CodeBlockMeta {
  type: 'codeBlock';
  language: string;
  filename?: string;
  highlightLines?: number[];
  showLineNumbers?: boolean;
  copyable?: boolean;
}

export interface ImageMeta {
  type: 'image';
  src: string;
  alt: string;
  title?: string;
  width?: 'small' | 'medium' | 'large' | 'full';
  caption?: string;
  linkUrl?: string;
}

export interface TableMeta {
  type: 'table';
  columnAligns: TableCellAlign[];
  hasHeader: boolean;
  rows: TableCell[][];
  /** Column widths in pixels (optional - uses auto width if not specified) */
  columnWidths?: number[];
}

/**
 * Table selection state for multi-cell selection
 */
export interface TableSelectionState {
  /** Selection start cell */
  startCell: { row: number; col: number } | null;
  /** Selection end cell (for range selection) */
  endCell: { row: number; col: number } | null;
  /** Type of selection */
  type: 'cell' | 'row' | 'column' | 'all' | null;
}

/**
 * Get the selected cell range from a selection state
 */
export function getSelectedCellRange(selection: TableSelectionState): {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
} | null {
  if (!selection.startCell) return null;

  const endCell = selection.endCell || selection.startCell;

  return {
    startRow: Math.min(selection.startCell.row, endCell.row),
    endRow: Math.max(selection.startCell.row, endCell.row),
    startCol: Math.min(selection.startCell.col, endCell.col),
    endCol: Math.max(selection.startCell.col, endCell.col),
  };
}

export interface CalloutMeta {
  type: 'callout';
  calloutType: CalloutType;
  title?: string;
  icon?: string;
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface ContainerMeta {
  type: 'container';
  containerType: ContainerType;
  title?: string;
}

export interface MathMeta {
  type: 'math';
  latex: string;
  displayMode: boolean;
}

export interface FootnoteMeta {
  type: 'footnote';
  identifier: string;
  backRefs?: string[];
}

export interface BlockquoteMeta {
  type: 'blockquote';
}

export interface ToggleMeta {
  type: 'toggle';
  expanded: boolean;
}

export interface DividerMeta {
  type: 'divider';
}

export interface MermaidMeta {
  type: 'mermaid';
  mermaidCode: string;
}

export interface VideoMeta {
  type: 'video';
  src: string;
  title?: string;
  width?: 'small' | 'medium' | 'large' | 'full';
}

export interface FileMeta {
  type: 'file';
  src: string;
  fileName: string;
  fileSize?: number;
}

export interface EmbedMeta {
  type: 'embed';
  url: string;
  embedType?: 'youtube' | 'vimeo' | 'twitter' | 'codepen' | 'generic';
}

export interface EmptyMeta {
  type: 'empty';
}

/**
 * Legacy metadata interface for backward compatibility
 */
export interface LegacyBlockMeta {
  // For todo blocks
  checked?: boolean;
  // For toggle blocks
  expanded?: boolean;
  // For callout blocks
  calloutType?: CalloutType;
  calloutIcon?: string;
  // For code blocks
  language?: string;
  // For mermaid blocks
  mermaidCode?: string;
  // For image/video/file blocks
  src?: string;
  alt?: string;
  caption?: string;
  width?: 'small' | 'medium' | 'large' | 'full';
  fileName?: string;
  fileSize?: number;
  title?: string;
  // For table blocks
  columns?: number;
  rows?: TableCell[][] | string[][];
  columnAligns?: TableCellAlign[];
  columnWidths?: number[];
  hasHeader?: boolean;
  // Indentation level for lists
  indent?: number;
  // Starting number for ordered lists
  start?: number;
  // For containers
  containerType?: ContainerType;
  // For embed blocks
  url?: string;
  embedType?: 'youtube' | 'vimeo' | 'twitter' | 'codepen' | 'generic';
  // For code blocks (alias for fileName)
  filename?: string;
  // For math
  latex?: string;
  displayMode?: boolean;
  // For footnotes
  identifier?: string;
  // For headings
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  slug?: string;
}

// Alias for backward compatibility
export type CodeMeta = CodeBlockMeta;

/**
 * Metadata union type - supports both new typed metadata and legacy format
 */
export type BlockMeta =
  | ParagraphMeta
  | HeadingMeta
  | ListItemMeta
  | TaskItemMeta
  | CodeBlockMeta
  | ImageMeta
  | TableMeta
  | CalloutMeta
  | ContainerMeta
  | MathMeta
  | FootnoteMeta
  | BlockquoteMeta
  | ToggleMeta
  | DividerMeta
  | MermaidMeta
  | VideoMeta
  | FileMeta
  | EmbedMeta
  | EmptyMeta
  | LegacyBlockMeta;

/**
 * The primary block data structure.
 * Designed for efficient serialization and database storage.
 */
export interface Block {
  /** Unique identifier (UUID v4) */
  id: string;

  /** The type determines rendering and behavior */
  type: BlockType;

  /**
   * Text content - can be plain string (legacy) or rich content
   * For backward compatibility, we support both string and BlockContent
   */
  content: string | BlockContent;

  /** Nested blocks (for toggle, callout, blockquote, etc.) */
  children?: Block[];

  /**
   * Type-specific metadata
   * Using LegacyBlockMeta for backward compatibility with existing components
   */
  meta?: LegacyBlockMeta;

  /**
   * Inline styles for backward compatibility
   * New code should use content.marks instead
   */
  styles?: InlineStyle[];

  /**
   * Indentation level (0-based).
   * Used for list nesting and visual hierarchy.
   */
  indent?: number;
}

// Backward compatibility alias
export type InlineFormat = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link';

export interface InlineStyle {
  type: InlineFormat;
  start: number;
  end: number;
  data?: { url?: string; title?: string };
}

/**
 * Selection state supporting both block and inline selections.
 */
export interface SelectionState {
  /** Currently focused block ID */
  focusedBlockId: string | null;

  /** Selected block IDs (for multi-block selection) */
  selectedBlockIds: Set<string>;

  /** Inline selection within a block */
  inlineSelection: InlineSelection | null;
}

export interface InlineSelection {
  blockId: string;
  anchor: number;  // Start of selection
  head: number;    // End of selection (can be before anchor)
}

/**
 * A transaction represents an atomic change to the editor state.
 * Multiple changes can be batched into a single transaction for undo.
 */
export interface Transaction {
  id: string;
  timestamp: number;
  changes: Change[];
  selectionBefore: SelectionState;
  selectionAfter: SelectionState;
}

export type Change =
  | { type: 'insertBlock'; block: Block; afterId: string | null }
  | { type: 'deleteBlock'; blockId: string; previousBlock: Block }
  | { type: 'updateBlock'; blockId: string; before: Partial<Block>; after: Partial<Block> }
  | { type: 'moveBlock'; blockId: string; fromIndex: number; toIndex: number }
  | { type: 'updateContent'; blockId: string; before: BlockContent; after: BlockContent };

/**
 * The complete editor state.
 */
export interface EditorState {
  /** Ordered array of top-level blocks */
  blocks: Block[];

  /** Current selection */
  selection: SelectionState;

  /** Undo stack (most recent first) */
  undoStack: Transaction[];

  /** Redo stack (most recent first) */
  redoStack: Transaction[];

  /** Link reference definitions for the document */
  linkReferences: Map<string, { url: string; title?: string }>;

  /** Footnote definitions */
  footnotes: Map<string, Block>;

  /** Document metadata */
  documentMeta: DocumentMeta;
}

export interface DocumentMeta {
  title?: string;
  wordCount: number;
  characterCount: number;
  blockCount: number;
  lastModified: Date;
}

// Screenshot type for the editor (simplified from the app's Screenshot type)
export interface EditorScreenshot {
  id: string;
  title: string;
  imagePath: string;
}

export interface EditorProps {
  initialBlocks?: Block[];
  initialMarkdown?: string;
  onChange?: (blocks: Block[]) => void;
  onSave?: (blocks: Block[]) => void;
  placeholder?: string;
  title?: string;
  onTitleChange?: (title: string) => void;
  readOnly?: boolean;
  autoFocus?: boolean;
  className?: string;
  screenshots?: EditorScreenshot[];
  /** Show copy as markdown button */
  showCopyButton?: boolean;
  /** Compact mode - removes max-width and centering for use in modals/sidebars */
  compact?: boolean;
  /** Enable GFM extensions */
  gfm?: boolean;
  /** Enable math support */
  math?: boolean;
  /** Enable custom containers */
  containers?: boolean;
  /** Enable footnotes */
  footnotes?: boolean;
}

export interface BlockProps {
  block: Block;
  isSelected: boolean;
  isFocused: boolean;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onInsertBefore: (type?: BlockType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onFocus: () => void;
  onSelect: () => void;
  onDuplicate: () => void;
  onTurnInto: (type: BlockType) => void;
}

export interface BlockHandle {
  focus: () => void;
  getContent: () => string;
}

export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  category: 'basic' | 'media' | 'advanced' | 'inline';
  action: () => BlockType | null;
}

// Utility types for content handling

/**
 * Helper to get text content from a block (handles both string and BlockContent)
 */
export function getBlockText(block: Block): string {
  if (typeof block.content === 'string') {
    return block.content;
  }
  return block.content.text;
}

/**
 * Helper to get marks from a block (handles both formats)
 */
export function getBlockMarks(block: Block): Mark[] {
  if (typeof block.content === 'string') {
    // Convert legacy styles to marks if present
    if (block.styles && block.styles.length > 0) {
      return block.styles.map(style => ({
        type: style.type as MarkType,
        from: style.start,
        to: style.end,
        attrs: style.data ? { href: style.data.url, title: style.data.title } : undefined,
      }));
    }
    return [];
  }
  return block.content.marks;
}

/**
 * Helper to create block content
 */
export function createBlockContent(text: string, marks: Mark[] = []): BlockContent {
  return { text, marks };
}

/**
 * Utility function to create a new block with proper defaults
 */
export function createBlock(
  type: BlockType,
  content: string | BlockContent = '',
  meta?: Partial<LegacyBlockMeta>
): Block {
  const id = crypto.randomUUID();

  // Normalize content to string for backward compatibility
  const contentValue = typeof content === 'string' ? content : content.text;

  // Set default meta based on type
  let defaultMeta: Partial<LegacyBlockMeta> = {};

  switch (type) {
    case 'todo':
    case 'taskList':
      defaultMeta = { checked: false };
      break;
    case 'toggle':
      defaultMeta = { expanded: true };
      break;
    case 'callout':
      defaultMeta = { calloutType: 'info' };
      break;
    case 'code':
    case 'codeBlock':
      defaultMeta = { language: 'plaintext' };
      break;
    case 'mathBlock':
      defaultMeta = { latex: contentValue, displayMode: true };
      break;
    case 'container':
      defaultMeta = { containerType: 'note' };
      break;
    case 'table':
      defaultMeta = {
        columnAligns: [null, null],
        rows: [[{ content: { text: '', marks: [] } }, { content: { text: '', marks: [] } }]]
      };
      break;
  }

  return {
    id,
    type,
    content: contentValue,
    meta: { ...defaultMeta, ...meta } as LegacyBlockMeta,
    children: type === 'toggle' || type === 'blockquote' || type === 'container' ? [] : undefined,
  };
}

/**
 * Utility function to generate placeholder text based on block type
 */
export function getBlockPlaceholder(type: BlockType): string {
  switch (type) {
    case 'heading1':
      return 'Heading 1';
    case 'heading2':
      return 'Heading 2';
    case 'heading3':
      return 'Heading 3';
    case 'heading4':
      return 'Heading 4';
    case 'heading5':
      return 'Heading 5';
    case 'heading6':
      return 'Heading 6';
    case 'paragraph':
      return "Type '/' for commands...";
    case 'quote':
    case 'blockquote':
      return 'Quote';
    case 'callout':
      return 'Callout';
    case 'code':
    case 'codeBlock':
      return 'Write code...';
    case 'mermaid':
      return 'Write mermaid code...';
    case 'todo':
    case 'taskList':
      return 'To-do';
    case 'bulletList':
    case 'numberedList':
      return 'List item';
    case 'toggle':
      return 'Toggle';
    case 'mathBlock':
      return 'LaTeX math expression...';
    case 'container':
      return 'Container content...';
    case 'table':
      return 'Table cell';
    case 'footnoteDefinition':
      return 'Footnote content...';
    default:
      return '';
  }
}

/**
 * Normalize block type aliases to canonical types
 */
export function normalizeBlockType(type: BlockType): BlockType {
  switch (type) {
    case 'todo':
      return 'taskList';
    case 'quote':
      return 'blockquote';
    case 'code':
      return 'codeBlock';
    default:
      return type;
  }
}

/**
 * Check if a block type is a text-based block that supports inline formatting
 */
export function isTextBasedBlock(type: BlockType): boolean {
  const textBasedTypes: BlockType[] = [
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
  ];
  return textBasedTypes.includes(type);
}

/**
 * Check if a block type is a list type
 */
export function isListType(type: BlockType): boolean {
  return type === 'bulletList' || type === 'numberedList' || type === 'taskList' || type === 'todo';
}

/**
 * Check if a block type supports children
 */
export function supportsChildren(type: BlockType): boolean {
  return type === 'toggle' || type === 'blockquote' || type === 'quote' || type === 'container';
}
