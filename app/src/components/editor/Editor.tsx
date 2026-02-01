"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Block, BlockType, EditorProps, createBlock } from "./types";
import { useEditorState } from "./hooks/useEditorState";
import { parseMarkdownToBlocks, blocksToMarkdown } from "./utils";
import { BlockHandle } from "./ui/BlockHandle";
import { BlockMenu } from "./ui/BlockMenu";
import { SelectionMenu } from "./ui/SelectionMenu";
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
  showCopyButton = false,
  compact = false,
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
    insertBlocksAfter,
    replaceAllBlocks,
    deleteBlock,
    deleteBlocks,
    moveBlockUp,
    moveBlockDown,
    duplicateBlock,
    turnBlockInto,
    indentBlock,
    outdentBlock,
    selectBlockRange,
    clearSelection,
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

  // Selection menu state (context menu for selected blocks)
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  const [selectionMenuPosition, setSelectionMenuPosition] = useState({ x: 0, y: 0 });

  // Formatting toolbar state
  const [formattingToolbarOpen, setFormattingToolbarOpen] = useState(false);
  const [formattingToolbarPosition] = useState({ x: 0, y: 0 });

  // Copy state
  const [copied, setCopied] = useState(false);

  // Drag selection state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartBlockRef = useRef<string | null>(null);
  const justFinishedDraggingRef = useRef(false);

  // Auto-focus first block
  useEffect(() => {
    if (autoFocus && blocks.length > 0 && !focusedBlockId) {
      setFocusedBlockId(blocks[0].id);
    }
  }, [autoFocus, blocks, focusedBlockId, setFocusedBlockId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected blocks with Backspace or Delete
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedBlockIds.size > 0) {
        e.preventDefault();
        // Delete all selected blocks (single undo entry)
        deleteBlocks(Array.from(selectedBlockIds));
        clearSelection();
        return;
      }

      // Cut selected blocks with Cmd+X
      if ((e.metaKey || e.ctrlKey) && e.key === 'x' && selectedBlockIds.size > 0) {
        e.preventDefault();
        const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
        const markdown = blocksToMarkdown(selectedBlocks);
        navigator.clipboard.writeText(markdown);
        // Delete all selected blocks (single undo entry)
        deleteBlocks(Array.from(selectedBlockIds));
        clearSelection();
        return;
      }

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

      // Escape clears selection
      if (e.key === 'Escape' && selectedBlockIds.size > 0) {
        e.preventDefault();
        clearSelection();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedBlockId, selectedBlockIds, blocks, undo, redo, duplicateBlock, deleteBlocks, clearSelection]);

  // Handle paste events (markdown and images)
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (readOnly) return;

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // Check for images first
    const items = clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file) continue;

        // Convert to base64 data URL
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const newBlock = createBlock('image', '', { src: dataUrl, alt: 'Pasted image' });

          if (focusedBlockId) {
            insertBlocksAfter(focusedBlockId, [newBlock]);
          } else if (blocks.length > 0) {
            insertBlocksAfter(blocks[blocks.length - 1].id, [newBlock]);
          } else {
            replaceAllBlocks([newBlock]);
          }
        };
        reader.readAsDataURL(file);
        return;
      }
    }

    // Check for text/markdown content
    const text = clipboardData.getData('text/plain');
    if (!text) return;

    // Detect if text looks like markdown
    const looksLikeMarkdown = /^(#{1,3}\s|[-*]\s|\d+\.\s|```|>|\[.*\]\(.*\)|!\[.*\]\(.*\))/.test(text) ||
      text.includes('\n');

    if (looksLikeMarkdown) {
      e.preventDefault();

      const newBlocks = parseMarkdownToBlocks(text);

      if (focusedBlockId) {
        // Check if current block is empty - replace it
        const currentBlock = blocks.find(b => b.id === focusedBlockId);
        if (currentBlock && !currentBlock.content.trim()) {
          // Replace current empty block with first parsed block, then insert rest after
          if (newBlocks.length > 0) {
            updateBlock(focusedBlockId, { type: newBlocks[0].type, content: newBlocks[0].content, meta: newBlocks[0].meta });
            if (newBlocks.length > 1) {
              insertBlocksAfter(focusedBlockId, newBlocks.slice(1));
            }
          }
        } else {
          insertBlocksAfter(focusedBlockId, newBlocks);
        }
      } else if (blocks.length === 1 && !blocks[0].content.trim()) {
        // Replace single empty block with pasted content
        replaceAllBlocks(newBlocks);
      } else if (blocks.length > 0) {
        insertBlocksAfter(blocks[blocks.length - 1].id, newBlocks);
      } else {
        replaceAllBlocks(newBlocks);
      }
    }
    // If it doesn't look like markdown, let the default paste behavior happen
  }, [readOnly, focusedBlockId, blocks, insertBlocksAfter, replaceAllBlocks, updateBlock]);

  // Handle copy events (copy as markdown)
  const handleCopy = useCallback((e: ClipboardEvent) => {
    // First check if we have block-level selection
    if (selectedBlockIds.size > 0) {
      e.preventDefault();
      const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
      const markdown = blocksToMarkdown(selectedBlocks);
      e.clipboardData?.setData('text/plain', markdown);
      e.clipboardData?.setData('text/markdown', markdown);
      // Clear selection after copy
      clearSelection();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    // Check if we're copying from within the editor
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    const selectedText = selection.toString();
    if (!selectedText) return;

    // Find which blocks are involved in the selection by checking if the range intersects each block
    const intersectedBlocks: Block[] = [];
    for (const block of blocks) {
      const blockElement = editorRef.current?.querySelector(`[data-block-id="${block.id}"]`);
      if (!blockElement) continue;

      // Check if this block intersects with the selection range
      try {
        if (range.intersectsNode(blockElement)) {
          intersectedBlocks.push(block);
        }
      } catch {
        // Fallback: check if selection contains the node
        if (selection.containsNode(blockElement, true)) {
          intersectedBlocks.push(block);
        }
      }
    }

    // If multiple blocks are selected, convert to markdown
    if (intersectedBlocks.length > 1) {
      e.preventDefault();
      const markdown = blocksToMarkdown(intersectedBlocks);
      e.clipboardData?.setData('text/plain', markdown);
      e.clipboardData?.setData('text/markdown', markdown);
    }
    // For single block or no blocks detected, let default behavior happen (copies plain text)
  }, [blocks, selectedBlockIds, clearSelection]);

  // Copy all content as markdown
  const handleCopyAll = useCallback(async () => {
    const markdown = blocksToMarkdown(blocks);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [blocks]);

  // Attach paste and copy handlers
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.addEventListener('paste', handlePaste);
    editor.addEventListener('copy', handleCopy);

    return () => {
      editor.removeEventListener('paste', handlePaste);
      editor.removeEventListener('copy', handleCopy);
    };
  }, [handlePaste, handleCopy]);

  // Get block ID from an element (walks up the DOM tree)
  const getBlockIdFromElement = useCallback((element: Element | null): string | null => {
    while (element && element !== editorRef.current) {
      if (element.hasAttribute('data-block-id')) {
        return element.getAttribute('data-block-id');
      }
      element = element.parentElement;
    }
    return null;
  }, []);

  // Handle mouse down for drag selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const blockId = getBlockIdFromElement(e.target as Element);
    if (blockId) {
      dragStartBlockRef.current = blockId;
      // Don't set isDragging yet - wait for mousemove to cross block boundary
    }
  }, [getBlockIdFromElement]);

  // Handle mouse move for drag selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStartBlockRef.current) return;
    if (e.buttons !== 1) return; // Only left mouse button

    const currentBlockId = getBlockIdFromElement(e.target as Element);
    if (currentBlockId && currentBlockId !== dragStartBlockRef.current) {
      // We've crossed into a different block - start block selection
      setIsDragging(true);
      selectBlockRange(dragStartBlockRef.current, currentBlockId);
    }
  }, [getBlockIdFromElement, selectBlockRange]);

  // Handle mouse up to end drag selection
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Keep the selection active, but end the drag
      setIsDragging(false);
      // Mark that we just finished dragging so click handler doesn't clear selection
      justFinishedDraggingRef.current = true;
      // Reset the flag after a short delay (after click event fires)
      setTimeout(() => {
        justFinishedDraggingRef.current = false;
      }, 0);
    }
    dragStartBlockRef.current = null;
  }, [isDragging]);

  // Clear selection on click outside selected blocks (but not right after dragging)
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    // Don't clear selection if we just finished a drag selection
    if (justFinishedDraggingRef.current) {
      return;
    }

    // Close selection menu if open
    if (selectionMenuOpen) {
      setSelectionMenuOpen(false);
    }

    const blockId = getBlockIdFromElement(e.target as Element);
    // If clicking anywhere, clear the block selection
    if (selectedBlockIds.size > 0) {
      clearSelection();
    }
    // Focus last block if clicking on empty area
    if (!focusedBlockId && blocks.length > 0 && !blockId) {
      setFocusedBlockId(blocks[blocks.length - 1].id);
    }
  }, [getBlockIdFromElement, selectedBlockIds, clearSelection, focusedBlockId, blocks, setFocusedBlockId, selectionMenuOpen]);

  // Handle right-click context menu for selected blocks
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show custom menu if we have selected blocks
    if (selectedBlockIds.size > 0) {
      const blockId = getBlockIdFromElement(e.target as Element);
      // Check if right-clicking on a selected block
      if (blockId && selectedBlockIds.has(blockId)) {
        e.preventDefault();
        setSelectionMenuPosition({ x: e.clientX, y: e.clientY });
        setSelectionMenuOpen(true);
      }
    }
  }, [selectedBlockIds, getBlockIdFromElement]);

  // Selection menu actions
  const handleSelectionCopy = useCallback(() => {
    const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
    const markdown = blocksToMarkdown(selectedBlocks);
    navigator.clipboard.writeText(markdown);
    clearSelection();
  }, [blocks, selectedBlockIds, clearSelection]);

  const handleSelectionCut = useCallback(() => {
    const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
    const markdown = blocksToMarkdown(selectedBlocks);
    navigator.clipboard.writeText(markdown);
    // Delete all selected blocks (single undo entry)
    deleteBlocks(Array.from(selectedBlockIds));
    clearSelection();
  }, [blocks, selectedBlockIds, deleteBlocks, clearSelection]);

  const handleSelectionDelete = useCallback(() => {
    // Delete all selected blocks (single undo entry)
    deleteBlocks(Array.from(selectedBlockIds));
    clearSelection();
  }, [selectedBlockIds, deleteBlocks, clearSelection]);

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
        data-block-id={block.id}
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleEditorClick}
      onContextMenu={handleContextMenu}
    >
      {/* Editor content area */}
      <div className={compact ? "py-1" : "max-w-[720px] mx-auto px-24 py-12"}>
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

      {/* Bottom toolbar - positioned relative to the editor content, not fixed */}
      {(showCopyButton || isSaving !== undefined) && (
        <div className="sticky bottom-4 flex justify-end px-24 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
            {/* Copy as Markdown button */}
            {showCopyButton && (
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-2 px-3 py-1.5 text-[var(--text-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] bg-[var(--surface-primary)] border border-[var(--border-default)] transition-colors"
                title="Copy as Markdown"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--accent-success)]" />
                    <span className="text-[var(--accent-success)]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy as Markdown</span>
                  </>
                )}
              </button>
            )}

            {/* Saving indicator */}
            {isSaving !== undefined && (
              <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                {isSaving ? 'Saving...' : lastSaved ? `Saved ${formatTime(lastSaved)}` : ''}
              </span>
            )}
          </div>
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

      {/* Selection menu (context menu for selected blocks) */}
      <SelectionMenu
        isOpen={selectionMenuOpen}
        position={selectionMenuPosition}
        onClose={() => setSelectionMenuOpen(false)}
        onCopy={handleSelectionCopy}
        onCut={handleSelectionCut}
        onDelete={handleSelectionDelete}
        selectedCount={selectedBlockIds.size}
      />

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
