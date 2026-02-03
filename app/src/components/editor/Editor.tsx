"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, Check } from "lucide-react";
import { Editor as TipTapEditor } from "@tiptap/react";
import { Block, BlockType, EditorProps, createBlock, getBlockText, LegacyBlockMeta } from "./types";
import { useEditorState } from "./hooks/useEditorState";
import { parseMarkdownToBlocks, blocksToMarkdown } from "./utils";
import { BlockHandle } from "./ui/BlockHandle";
import { BlockMenu } from "./ui/BlockMenu";
import { SelectionMenu } from "./ui/SelectionMenu";
import { SlashCommandMenu } from "./ui/SlashCommandMenu";
import { FormattingToolbar } from "./ui/FormattingToolbar";
import { TextBlock } from "./blocks/TextBlock";
import { RichTextBlock } from "./blocks/RichTextBlock";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { ListBlock } from "./blocks/ListBlock";
import { TodoBlock } from "./blocks/TodoBlock";
import { ToggleBlock } from "./blocks/ToggleBlock";
import { CodeBlock } from "./blocks/CodeBlock";
import { MermaidBlock } from "./blocks/MermaidBlock";
import { ImageBlock } from "./blocks/ImageBlock";
import { DividerBlock } from "./blocks/DividerBlock";
import { TableBlock } from "./blocks/TableBlock";
import { MathBlock } from "./blocks/MathBlock";
import { ContainerBlock } from "./blocks/ContainerBlock";

export function Editor({
  initialBlocks,
  initialMarkdown,
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
  // Parse initialMarkdown if provided
  const effectiveInitialBlocks = initialMarkdown
    ? parseMarkdownToBlocks(initialMarkdown)
    : initialBlocks;

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
  } = useEditorState({ initialBlocks: effectiveInitialBlocks, onChange, onSave });

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
  const [formattingToolbarPosition, setFormattingToolbarPosition] = useState({ x: 0, y: 0 });
  const [formattingToolbarEditor, setFormattingToolbarEditor] = useState<TipTapEditor | null>(null);

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
      const isMod = e.metaKey || e.ctrlKey;

      // Delete selected blocks with Backspace or Delete
      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedBlockIds.size > 0) {
        e.preventDefault();
        deleteBlocks(Array.from(selectedBlockIds));
        clearSelection();
        return;
      }

      // Cut selected blocks with Cmd+X
      if (isMod && e.key === 'x' && selectedBlockIds.size > 0) {
        e.preventDefault();
        const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
        const markdown = blocksToMarkdown(selectedBlocks);
        navigator.clipboard.writeText(markdown);
        deleteBlocks(Array.from(selectedBlockIds));
        clearSelection();
        return;
      }

      // Undo
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo
      if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Redo with Cmd+Y
      if (isMod && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate block
      if (isMod && e.key === 'd' && focusedBlockId) {
        e.preventDefault();
        duplicateBlock(focusedBlockId);
        return;
      }

      // Block type shortcuts (only when a block is focused)
      if (focusedBlockId && isMod && !e.shiftKey) {
        // Ctrl/Cmd + 1/2/3 for headings
        if (e.key === '1') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'heading1');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'heading2');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'heading3');
          return;
        }
        // Ctrl/Cmd + 0 for paragraph (clear heading)
        if (e.key === '0') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'paragraph');
          return;
        }
      }

      // List shortcuts with Ctrl/Cmd + Shift
      if (focusedBlockId && isMod && e.shiftKey) {
        // Ctrl/Cmd + Shift + 7 for numbered list
        if (e.key === '7' || e.code === 'Digit7') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'numberedList');
          return;
        }
        // Ctrl/Cmd + Shift + 8 for bullet list
        if (e.key === '8' || e.code === 'Digit8') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'bulletList');
          return;
        }
        // Ctrl/Cmd + Shift + 9 for task list
        if (e.key === '9' || e.code === 'Digit9') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'todo');
          return;
        }
        // Ctrl/Cmd + Shift + E for math block
        if (e.key === 'e' || e.key === 'E') {
          e.preventDefault();
          turnBlockInto(focusedBlockId, 'mathBlock');
          return;
        }
      }

      // Escape clears selection or closes menus
      if (e.key === 'Escape') {
        if (slashMenuOpen) {
          e.preventDefault();
          setSlashMenuOpen(false);
          setSlashQuery("");
          setSlashBlockId(null);
          return;
        }
        if (selectedBlockIds.size > 0) {
          e.preventDefault();
          clearSelection();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedBlockId, selectedBlockIds, blocks, undo, redo, duplicateBlock, deleteBlocks, clearSelection, slashMenuOpen, turnBlockInto]);

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
    const looksLikeMarkdown = /^(#{1,6}\s|[-*]\s|\d+\.\s|```|>|\[.*\]\(.*\)|!\[.*\]\(.*\)|[-*]\s*\[[ xX]\])/.test(text) ||
      text.includes('\n') ||
      text.includes('|') ||
      text.includes('$$');

    if (looksLikeMarkdown) {
      e.preventDefault();

      const newBlocks = parseMarkdownToBlocks(text);

      if (focusedBlockId) {
        const currentBlock = blocks.find(b => b.id === focusedBlockId);
        const currentContent = currentBlock ? getBlockText(currentBlock) : '';
        if (currentBlock && !currentContent.trim()) {
          if (newBlocks.length > 0) {
            updateBlock(focusedBlockId, { type: newBlocks[0].type, content: newBlocks[0].content, meta: newBlocks[0].meta });
            if (newBlocks.length > 1) {
              insertBlocksAfter(focusedBlockId, newBlocks.slice(1));
            }
          }
        } else {
          insertBlocksAfter(focusedBlockId, newBlocks);
        }
      } else if (blocks.length === 1 && !getBlockText(blocks[0]).trim()) {
        replaceAllBlocks(newBlocks);
      } else if (blocks.length > 0) {
        insertBlocksAfter(blocks[blocks.length - 1].id, newBlocks);
      } else {
        replaceAllBlocks(newBlocks);
      }
    }
  }, [readOnly, focusedBlockId, blocks, insertBlocksAfter, replaceAllBlocks, updateBlock]);

  // Handle copy events (copy as markdown)
  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (selectedBlockIds.size > 0) {
      e.preventDefault();
      const selectedBlocks = blocks.filter(b => selectedBlockIds.has(b.id));
      const markdown = blocksToMarkdown(selectedBlocks);
      e.clipboardData?.setData('text/plain', markdown);
      e.clipboardData?.setData('text/markdown', markdown);
      clearSelection();
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.commonAncestorContainer)) return;

    const selectedText = selection.toString();
    if (!selectedText) return;

    const intersectedBlocks: Block[] = [];
    for (const block of blocks) {
      const blockElement = editorRef.current?.querySelector(`[data-block-id="${block.id}"]`);
      if (!blockElement) continue;

      try {
        if (range.intersectsNode(blockElement)) {
          intersectedBlocks.push(block);
        }
      } catch {
        if (selection.containsNode(blockElement, true)) {
          intersectedBlocks.push(block);
        }
      }
    }

    if (intersectedBlocks.length > 1) {
      e.preventDefault();
      const markdown = blocksToMarkdown(intersectedBlocks);
      e.clipboardData?.setData('text/plain', markdown);
      e.clipboardData?.setData('text/markdown', markdown);
    }
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

  // Get block ID from an element
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
    }
  }, [getBlockIdFromElement]);

  // Handle mouse move for drag selection
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStartBlockRef.current) return;
    if (e.buttons !== 1) return;

    const currentBlockId = getBlockIdFromElement(e.target as Element);
    if (currentBlockId && currentBlockId !== dragStartBlockRef.current) {
      setIsDragging(true);
      selectBlockRange(dragStartBlockRef.current, currentBlockId);
    }
  }, [getBlockIdFromElement, selectBlockRange]);

  // Handle mouse up to end drag selection
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      justFinishedDraggingRef.current = true;
      setTimeout(() => {
        justFinishedDraggingRef.current = false;
      }, 0);
    }
    dragStartBlockRef.current = null;
  }, [isDragging]);

  // Clear selection on click outside selected blocks
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    if (justFinishedDraggingRef.current) {
      return;
    }

    if (selectionMenuOpen) {
      setSelectionMenuOpen(false);
    }

    const blockId = getBlockIdFromElement(e.target as Element);
    if (selectedBlockIds.size > 0) {
      clearSelection();
    }
    if (!focusedBlockId && blocks.length > 0 && !blockId) {
      setFocusedBlockId(blocks[blocks.length - 1].id);
    }
  }, [getBlockIdFromElement, selectedBlockIds, clearSelection, focusedBlockId, blocks, setFocusedBlockId, selectionMenuOpen]);

  // Handle right-click context menu for selected blocks
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (selectedBlockIds.size > 0) {
      const blockId = getBlockIdFromElement(e.target as Element);
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
    deleteBlocks(Array.from(selectedBlockIds));
    clearSelection();
  }, [blocks, selectedBlockIds, deleteBlocks, clearSelection]);

  const handleSelectionDelete = useCallback(() => {
    deleteBlocks(Array.from(selectedBlockIds));
    clearSelection();
  }, [selectedBlockIds, deleteBlocks, clearSelection]);

  // Handle slash command selection
  const handleSlashSelect = useCallback((type: BlockType, extraMeta?: Record<string, unknown>) => {
    if (slashBlockId) {
      const block = blocks.find(b => b.id === slashBlockId);
      if (block) {
        const content = getBlockText(block);
        const slashIndex = content.lastIndexOf('/');
        const newContent = slashIndex === -1 ? '' : content.slice(0, slashIndex);

        if (type === 'table') {
          updateBlock(slashBlockId, {
            type: 'table',
            content: '',
            meta: {
              columnAligns: [null, null, null],
              rows: [
                [{ content: { text: '', marks: [] } }, { content: { text: '', marks: [] } }, { content: { text: '', marks: [] } }],
                [{ content: { text: '', marks: [] } }, { content: { text: '', marks: [] } }, { content: { text: '', marks: [] } }],
              ],
            } as LegacyBlockMeta,
          });
        } else if (type === 'container') {
          updateBlock(slashBlockId, {
            type: 'container',
            content: newContent,
            meta: {
              containerType: extraMeta?.containerType || 'note',
            } as LegacyBlockMeta,
          });
        } else if (type === 'divider') {
          updateBlock(slashBlockId, {
            type: 'divider',
            content: '',
            meta: {},
          });
          insertBlockAfter(slashBlockId, 'paragraph');
        } else {
          turnBlockInto(slashBlockId, type);
          updateBlock(slashBlockId, { content: newContent });
        }
      }
    }
    setSlashMenuOpen(false);
    setSlashQuery("");
    setSlashBlockId(null);
  }, [slashBlockId, blocks, turnBlockInto, updateBlock, insertBlockAfter]);

  // Handle opening slash menu
  const handleOpenSlashMenu = useCallback((blockId: string, position: { x: number; y: number }) => {
    setSlashBlockId(blockId);
    setSlashMenuPosition(position);
    setSlashMenuOpen(true);
    setSlashQuery("");
  }, []);

  // Handle opening formatting toolbar
  const handleOpenFormattingToolbar = useCallback((position: { x: number; y: number }, editor: TipTapEditor) => {
    setFormattingToolbarPosition(position);
    setFormattingToolbarEditor(editor);
    setFormattingToolbarOpen(true);
  }, []);

  // Update search query from block content when slash menu is open
  useEffect(() => {
    if (slashMenuOpen && slashBlockId) {
      const block = blocks.find(b => b.id === slashBlockId);
      if (block) {
        const content = getBlockText(block);
        const slashIndex = content.lastIndexOf('/');
        if (slashIndex !== -1) {
          const query = content.slice(slashIndex + 1);
          setSlashQuery(query);
        } else if (content.length > 0) {
          setSlashMenuOpen(false);
          setSlashQuery("");
          setSlashBlockId(null);
        }
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

    const meta = block.meta as LegacyBlockMeta | undefined;
    const indent = meta?.indent || 0;

    for (let i = blockIndex - 1; i >= 0; i--) {
      const prev = blocks[i];
      const prevMeta = prev.meta as LegacyBlockMeta | undefined;
      const prevIndent = prevMeta?.indent || 0;

      if (prev.type !== 'numberedList' || prevIndent < indent) {
        break;
      }

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
      case 'heading4':
      case 'heading5':
      case 'heading6':
      case 'quote':
      case 'blockquote':
        BlockComponent = (
          <RichTextBlock
            {...commonProps}
            onInsertBefore={(type?: BlockType) => insertBlockBefore(block.id, type)}
            onMoveUp={() => moveBlockUp(block.id)}
            onMoveDown={() => moveBlockDown(block.id)}
            onIndent={() => indentBlock(block.id)}
            onOutdent={() => outdentBlock(block.id)}
            onTurnInto={(type) => turnBlockInto(block.id, type)}
            onOpenSlashMenu={(pos) => handleOpenSlashMenu(block.id, pos)}
            isSlashMenuOpen={slashMenuOpen && slashBlockId === block.id}
            onOpenFormattingToolbar={handleOpenFormattingToolbar}
            onCloseFormattingToolbar={() => setFormattingToolbarOpen(false)}
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

      case 'container':
        BlockComponent = (
          <ContainerBlock
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
      case 'taskList':
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
      case 'codeBlock':
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

      case 'table':
        BlockComponent = (
          <TableBlock
            {...commonProps}
          />
        );
        break;

      case 'mathBlock':
        BlockComponent = (
          <MathBlock
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
          <RichTextBlock
            {...commonProps}
            onInsertBefore={(type?: BlockType) => insertBlockBefore(block.id, type)}
            onMoveUp={() => moveBlockUp(block.id)}
            onMoveDown={() => moveBlockDown(block.id)}
            onIndent={() => indentBlock(block.id)}
            onOutdent={() => outdentBlock(block.id)}
            onTurnInto={(type) => turnBlockInto(block.id, type)}
            onOpenSlashMenu={(pos) => handleOpenSlashMenu(block.id, pos)}
            isSlashMenuOpen={slashMenuOpen && slashBlockId === block.id}
            onOpenFormattingToolbar={handleOpenFormattingToolbar}
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
        {blocks.length === 1 && !getBlockText(blocks[0]) && (
          <div className="absolute top-0 left-0 pointer-events-none opacity-0">
            <p className="text-[var(--text-tertiary)] italic">{placeholder}</p>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      {(showCopyButton || isSaving !== undefined) && (
        <div className="sticky bottom-4 flex justify-end px-24 pointer-events-none">
          <div className="flex items-center gap-3 pointer-events-auto">
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
        editor={formattingToolbarEditor}
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
