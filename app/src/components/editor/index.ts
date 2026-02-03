// Editor Component Library
// A block-based editor with Notion-style experience and full markdown support

// Main Editor Component
export { Editor } from './Editor';

// Types - Core
export type {
  Block,
  BlockType,
  BlockMeta,
  LegacyBlockMeta,
  InlineStyle,
  EditorProps,
  BlockContent,
  Mark,
  MarkType,
  ContainerType,
  ListItemMeta,
  HeadingMeta,
  CodeMeta,
  ImageMeta,
  TableMeta,
  TableCell,
  FootnoteMeta,
} from './types';

export {
  createBlock,
  getBlockText,
  getBlockMarks,
  getBlockPlaceholder,
  createBlockContent,
} from './types';

// Hooks
export { useEditorState } from './hooks/useEditorState';

// Block Components
export { TextBlock } from './blocks/TextBlock';
export { RichTextBlock } from './blocks/RichTextBlock';
export { CalloutBlock } from './blocks/CalloutBlock';
export { ContainerBlock } from './blocks/ContainerBlock';
export { ListBlock } from './blocks/ListBlock';
export { TodoBlock } from './blocks/TodoBlock';
export { ToggleBlock } from './blocks/ToggleBlock';
export { CodeBlock } from './blocks/CodeBlock';
export { ImageBlock } from './blocks/ImageBlock';
export { DividerBlock } from './blocks/DividerBlock';
export { TableBlock } from './blocks/TableBlock';
export { MathBlock } from './blocks/MathBlock';
export { MermaidBlock } from './blocks/MermaidBlock';

// UI Components
export { BlockHandle } from './ui/BlockHandle';
export { BlockMenu } from './ui/BlockMenu';
export { SelectionMenu } from './ui/SelectionMenu';
export { SlashCommandMenu } from './ui/SlashCommandMenu';
export { FormattingToolbar } from './ui/FormattingToolbar';

// Parser and Serializer
export {
  parseMarkdown,
  parseMarkdownToBlocks,
} from './parser';

export {
  serializeBlocks,
  blocksToMarkdown,
  serializeInline,
} from './serializer';

// Utilities
export {
  parseMarkdownShortcut,
  getBlockTypeName,
  isTextBlock,
  isListBlock,
  supportsChildren,
  blocksToPlainText,
  blocksToHtml,
  createDefaultBlocks,
  generateId,
  debounce,
  moveBlock,
  insertBlock,
  removeBlock,
  findBlockById,
  findBlockIndex,
  updateBlockById,
  calculateWordCount,
  calculateCharacterCount,
  flattenBlocks,
  getAllBlockIds,
  isBlockEmpty,
  generateSlug,
} from './utils';
