// Editor Component Library
// A block-based editor with Notion-style experience

// Main Editor Component
export { Editor } from './Editor';

// Types
export type {
  Block,
  BlockType,
  BlockMeta,
  InlineStyle,
  EditorProps,
} from './types';

export { createBlock } from './types';

// Hooks
export { useEditorState } from './hooks/useEditorState';

// Block Components
export { TextBlock } from './blocks/TextBlock';
export { CalloutBlock } from './blocks/CalloutBlock';
export { ListBlock } from './blocks/ListBlock';
export { TodoBlock } from './blocks/TodoBlock';
export { ToggleBlock } from './blocks/ToggleBlock';
export { CodeBlock } from './blocks/CodeBlock';
export { ImageBlock } from './blocks/ImageBlock';
export { DividerBlock } from './blocks/DividerBlock';

// UI Components
export { BlockHandle } from './ui/BlockHandle';
export { BlockMenu } from './ui/BlockMenu';
export { SlashCommandMenu } from './ui/SlashCommandMenu';
export { FormattingToolbar } from './ui/FormattingToolbar';

// Utilities
export {
  parseMarkdownShortcut,
  parseMarkdownToBlocks,
  getBlockTypeName,
  isTextBlock,
  isListBlock,
  supportsChildren,
  blocksToPlainText,
  blocksToHtml,
  createDefaultBlocks,
} from './utils';
