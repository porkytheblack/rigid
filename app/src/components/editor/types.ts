// Editor Types and Interfaces

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'todo'
  | 'toggle'
  | 'quote'
  | 'callout'
  | 'code'
  | 'mermaid'
  | 'image'
  | 'video'
  | 'file'
  | 'divider'
  | 'table';

export type CalloutType = 'info' | 'warning' | 'error' | 'success';

export type InlineFormat = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'link';

export interface InlineStyle {
  type: InlineFormat;
  start: number;
  end: number;
  data?: { url?: string };
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  children?: Block[];
  meta?: BlockMeta;
  styles?: InlineStyle[];
}

export interface BlockMeta {
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
  width?: 'small' | 'medium' | 'full';
  fileName?: string;
  fileSize?: number;
  // For table blocks
  columns?: number;
  rows?: string[][];
  // Indentation level for lists
  indent?: number;
}

export interface EditorState {
  blocks: Block[];
  selectedBlockId: string | null;
  focusedBlockId: string | null;
  selectionStart: number | null;
  selectionEnd: number | null;
}

export interface EditorAction {
  type: string;
  payload?: unknown;
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

// Screenshot type for the editor (simplified from the app's Screenshot type)
export interface EditorScreenshot {
  id: string;
  title: string;
  imagePath: string;
}

export interface EditorProps {
  initialBlocks?: Block[];
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

// Utility function to create a new block
export function createBlock(type: BlockType, content: string = '', meta?: BlockMeta): Block {
  return {
    id: crypto.randomUUID(),
    type,
    content,
    meta,
    children: type === 'toggle' ? [] : undefined,
  };
}

// Utility function to generate placeholder text based on block type
export function getBlockPlaceholder(type: BlockType): string {
  switch (type) {
    case 'heading1':
      return 'Heading 1';
    case 'heading2':
      return 'Heading 2';
    case 'heading3':
      return 'Heading 3';
    case 'paragraph':
      return "Type '/' for commands...";
    case 'quote':
      return 'Quote';
    case 'callout':
      return 'Callout';
    case 'code':
      return 'Write code...';
    case 'mermaid':
      return 'Write mermaid code...';
    case 'todo':
      return 'To-do';
    case 'bulletList':
    case 'numberedList':
      return 'List item';
    case 'toggle':
      return 'Toggle';
    default:
      return '';
  }
}
