"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Block, BlockType, EditorProps } from "./types";
import { useEditorState } from "./hooks/useEditorState";
import { BlockHandle } from "./ui/BlockHandle";
import { BlockMenu } from "./ui/BlockMenu";
import { SlashCommandMenu } from "./ui/SlashCommandMenu";
import { FormattingToolbar } from "./ui/FormattingToolbar";
import { TextBlock } from "./blocks/TextBlock";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { ListBlock } from "./blocks/ListBlock";
import { TodoBlock } from "./blocks/TodoBlock";
import { ToggleBlock } from "./blocks/ToggleBlock";
import { CodeBlock } from "./blocks/CodeBlock";
import { MermaidBlock } from "./blocks/MermaidBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { DividerBlock } from "./blocks/DividerBlock";

export function Editor({
  initialBlocks,
  onChange,
  onSave,
  placeholder = "Press Enter to start writing, or / for commands",
  title,
  onTitleChange,
  readOnly = false,
  autoFocus = true,
  className = "",
  screenshots = [],
}: EditorProps) {
  const {
    blocks,
    focusedBlockId,
    selectedBlockIds,
    isSaving,
    lastSaved,
    setFocusedBlockId,
    updateBlock,
    insertBlockAfter,
    insertBlockBefore,
    deleteBlock,
    moveBlockUp,
    moveBlockDown,
    duplicateBlock,
    turnBlockInto,
    indentBlock,
    outdentBlock,
    undo,
    redo,
  } = useEditorState({ initialBlocks, onChange, onSave });

  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Slash command menu state
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashQuery, setSlashQuery] = useState("");
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null);

  // Block menu state
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const [blockMenuPosition, setBlockMenuPosition] = useState({ x: 0, y: 0 });
  const [blockMenuBlockId, setBlockMenuBlockId] = useState<string | null>(null);

  // Formatting toolbar state
  const [formattingToolbarOpen, setFormattingToolbarOpen] = useState(false);
  const [formattingToolbarPosition] = useState({ x: 0, y: 0 });

  // Auto-focus first block
  useEffect(() => {
    if (autoFocus && blocks.length > 0 && !focusedBlockId) {
      setFocusedBlockId(blocks[0].id);
    }
  }, [autoFocus, blocks, focusedBlockId, setFocusedBlockId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate block
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && focusedBlockId) {
        e.preventDefault();
        duplicateBlock(focusedBlockId);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedBlockId, undo, redo, duplicateBlock]);

  // Handle slash command selection
  const handleSlashSelect = useCallback((type: BlockType) => {
    if (slashBlockId) {
      // Clear the slash command text and transform block
      turnBlockInto(slashBlockId, type);
      updateBlock(slashBlockId, { content: '' });
    }
    setSlashMenuOpen(false);
    setSlashQuery("");
    setSlashBlockId(null);
  }, [slashBlockId, turnBlockInto, updateBlock]);

  // Handle opening slash menu
  const handleOpenSlashMenu = useCallback((blockId: string, position: { x: number; y: number }) => {
    setSlashBlockId(blockId);
    setSlashMenuPosition(position);
    setSlashMenuOpen(true);
    setSlashQuery("");
  }, []);

  // Update search query from block content when slash menu is open
  useEffect(() => {
    if (slashMenuOpen && slashBlockId) {
      const block = blocks.find(b => b.id === slashBlockId);
      if (block) {
        const content = block.content;
        // Extract text after the last /
        const slashIndex = content.lastIndexOf('/');
        if (slashIndex !== -1) {
          const query = content.slice(slashIndex + 1);
          setSlashQuery(query);
        } else if (content.length > 0) {
          // Only close if there's content but no slash (user deleted it)
          // Don't close if content is empty (slash not yet typed)
          setSlashMenuOpen(false);
          setSlashQuery("");
          setSlashBlockId(null);
        }
        // If content is empty, keep menu open - slash will appear on next input
      }
    }
  }, [slashMenuOpen, slashBlockId, blocks]);

  // Handle block menu
  const handleOpenBlockMenu = useCallback((blockId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setBlockMenuBlockId(blockId);
    setBlockMenuPosition({ x: e.clientX, y: e.clientY });
    setBlockMenuOpen(true);
  }, []);

  // Calculate list number for numbered lists
  const getListNumber = useCallback((blockIndex: number): number => {
    let count = 1;
    const block = blocks[blockIndex];
    if (block.type !== 'numberedList') return 1;

    const indent = block.meta?.indent || 0;

    // Count backwards to find position in this list sequence
    for (let i = blockIndex - 1; i >= 0; i--) {
      const prev = blocks[i];
      const prevIndent = prev.meta?.indent || 0;

      // If we hit a different block type or lower indent, stop
      if (prev.type !== 'numberedList' || prevIndent < indent) {
        break;
      }

      // Only count items at the same indent level
      if (prevIndent === indent) {
        count++;
      }
    }

    return count;
  }, [blocks]);

  // Render a block
  const renderBlock = (block: Block, index: number) => {
    const isFocused = focusedBlockId === block.id;
    const isSelected = selectedBlockIds.has(block.id);

    const commonProps = {
      block,
      isFocused,
      onUpdate: (updated: Block) => updateBlock(block.id, updated),
      onDelete: () => deleteBlock(block.id),
      onInsertAfter: (type?: BlockType) => insertBlockAfter(block.id, type),
      onFocus: () => setFocusedBlockId(block.id),
      onFocusPrevious: index > 0 ? () => setFocusedBlockId(blocks[index - 1].id) : undefined,
      // When on last block, arrow down creates a new paragraph
      onFocusNext: index < blocks.length - 1
        ? () => setFocusedBlockId(blocks[index + 1].id)
        : () => insertBlockAfter(block.id, 'paragraph'),
    };

    let BlockComponent;
    switch (block.type) {
      case 'paragraph':
      case 'heading1':
      case 'heading2':
      case 'heading3':
      case 'quote':
        BlockComponent = (
          <TextBlock
            {...commonProps}
            onInsertBefore={(type?: BlockType) => insertBlockBefore(block.id, type)}
            onMoveUp={() => moveBlockUp(block.id)}
            onMoveDown={() => moveBlockDown(block.id)}
            onIndent={() => indentBlock(block.id)}
            onOutdent={() => outdentBlock(block.id)}
            onTurnInto={(type) => turnBlockInto(block.id, type)}
            onOpenSlashMenu={(pos) => handleOpenSlashMenu(block.id, pos)}
            isSlashMenuOpen={slashMenuOpen && slashBlockId === block.id}
          />
        );
        break;

      case 'callout':
        BlockComponent = (
          <CalloutBlock
            {...commonProps}
          />
        );
        break;

      case 'bulletList':
      case 'numberedList':
        BlockComponent = (
          <ListBlock
            {...commonProps}
            listNumber={getListNumber(index)}
            onMoveUp={() => moveBlockUp(block.id)}
            onMoveDown={() => moveBlockDown(block.id)}
            onIndent={() => indentBlock(block.id)}
            onOutdent={() => outdentBlock(block.id)}
            onTurnInto={(type) => turnBlockInto(block.id, type)}
          />
        );
        break;

      case 'todo':
        BlockComponent = (
          <TodoBlock
            {...commonProps}
            onIndent={() => indentBlock(block.id)}
            onOutdent={() => outdentBlock(block.id)}
            onTurnInto={(type) => turnBlockInto(block.id, type)}
          />
        );
        break;

      case 'toggle':
        BlockComponent = (
          <ToggleBlock
            {...commonProps}
            onTurnInto={(type) => turnBlockInto(block.id, type)}
          />
        );
        break;

      case 'code':
        BlockComponent = (
          <CodeBlock
            {...commonProps}
          />
        );
        break;

      case 'mermaid':
        BlockComponent = (
          <MermaidBlock
            {...commonProps}
          />
        );
        break;

      case 'image':
        BlockComponent = (
          <ImageBlock
            {...commonProps}
            screenshots={screenshots}
          />
        );
        break;

      case 'divider':
        BlockComponent = (
          <DividerBlock
            {...commonProps}
          />
        );
        break;

      default:
        BlockComponent = (
          <TextBlock
            {...commonProps}
            onInsertBefore={(type?: BlockType) => insertBlockBefore(block.id, type)}
            onMoveUp={() => moveBlockUp(block.id)}
            onMoveDown={() => moveBlockDown(block.id)}
            onIndent={() => indentBlock(block.id)}
            onOutdent={() => outdentBlock(block.id)}
            onTurnInto={(type) => turnBlockInto(block.id, type)}
            onOpenSlashMenu={(pos) => handleOpenSlashMenu(block.id, pos)}
            isSlashMenuOpen={slashMenuOpen && slashBlockId === block.id}
          />
        );
    }

    return (
      <div
        key={block.id}
        className={`
          group relative flex items-start gap-2 py-1
          ${isSelected ? 'bg-[var(--accent-muted)] border-l-[3px] border-[var(--accent-interactive)]' : ''}
          ${isFocused && !isSelected ? 'bg-transparent' : ''}
        `}
      >
        {/* Block handle */}
        {!readOnly && (
          <div className="absolute -left-8 top-1 flex items-center gap-0.5">
            <BlockHandle
              onClick={(e) => handleOpenBlockMenu(block.id, e)}
            />
          </div>
        )}

        {/* Block content */}
        <div className="flex-1 min-w-0">
          {BlockComponent}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={editorRef}
      className={`relative min-h-full ${className}`}
      onClick={() => {
        // Click on empty area focuses last block
        if (!focusedBlockId && blocks.length > 0) {
          setFocusedBlockId(blocks[blocks.length - 1].id);
        }
      }}
    >
      {/* Editor content area */}
      <div className="max-w-[720px] mx-auto px-24 py-12">
        {/* Title */}
        {title !== undefined && (
          <div className="mb-8">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Untitled"
              className="w-full text-[32px] font-bold text-[var(--text-primary)] bg-transparent outline-none placeholder:text-[var(--text-tertiary)]"
              readOnly={readOnly}
            />
          </div>
        )}

        {/* Blocks */}
        <div className="space-y-1">
          {blocks.map((block, index) => renderBlock(block, index))}
        </div>

        {/* Empty state / placeholder */}
        {blocks.length === 1 && !blocks[0].content && (
          <div className="absolute top-0 left-0 pointer-events-none opacity-0">
            <p className="text-[var(--text-tertiary)] italic">{placeholder}</p>
          </div>
        )}
      </div>

      {/* Saving indicator */}
      {isSaving !== undefined && (
        <div className="fixed bottom-4 right-4 text-[var(--text-caption)] text-[var(--text-tertiary)]">
          {isSaving ? 'Saving...' : lastSaved ? `Saved ${formatTime(lastSaved)}` : ''}
        </div>
      )}

      {/* Slash command menu */}
      <SlashCommandMenu
        isOpen={slashMenuOpen}
        position={slashMenuPosition}
        searchQuery={slashQuery}
        onSelect={handleSlashSelect}
        onClose={() => {
          setSlashMenuOpen(false);
          setSlashQuery("");
        }}
      />

      {/* Block menu */}
      {blockMenuBlockId && (
        <BlockMenu
          isOpen={blockMenuOpen}
          position={blockMenuPosition}
          onClose={() => setBlockMenuOpen(false)}
          onDelete={() => deleteBlock(blockMenuBlockId)}
          onDuplicate={() => duplicateBlock(blockMenuBlockId)}
          onMoveUp={() => moveBlockUp(blockMenuBlockId)}
          onMoveDown={() => moveBlockDown(blockMenuBlockId)}
        />
      )}

      {/* Formatting toolbar */}
      <FormattingToolbar
        isOpen={formattingToolbarOpen}
        position={formattingToolbarPosition}
        activeFormats={[]}
        onFormat={(format) => {
          console.log('Format:', format);
          setFormattingToolbarOpen(false);
        }}
        onClose={() => setFormattingToolbarOpen(false)}
      />
    </div>
  );
}

// Helper to format time
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return 'just now';
  }
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
