"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Block, BlockType, createBlock } from "../types";
import { createDefaultBlocks, debounce } from "../utils";

interface UseEditorStateOptions {
  initialBlocks?: Block[];
  onChange?: (blocks: Block[]) => void;
  onSave?: (blocks: Block[]) => void;
  autoSaveDelay?: number;
}

export function useEditorState({
  initialBlocks,
  onChange,
  onSave,
  autoSaveDelay = 2000,
}: UseEditorStateOptions) {
  const [blocks, setBlocks] = useState<Block[]>(
    initialBlocks && initialBlocks.length > 0 ? initialBlocks : createDefaultBlocks()
  );
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<Block[][]>([]);
  const [redoStack, setRedoStack] = useState<Block[][]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Track if we've been initialized with external blocks
  const hasInitializedRef = useRef(initialBlocks && initialBlocks.length > 0);
  const prevInitialBlocksRef = useRef<Block[] | undefined>(initialBlocks);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // Use refs to avoid stale closure issues in undo/redo
  const undoStackRef = useRef(undoStack);
  undoStackRef.current = undoStack;
  const redoStackRef = useRef(redoStack);
  redoStackRef.current = redoStack;

  // Track if we're making internal edits (to avoid resetting undo stack)
  const isInternalEditRef = useRef(false);

  // Sync with initialBlocks when they change externally (e.g., after data loads)
  useEffect(() => {
    // Skip if this is an internal edit (triggered by our own setBlocks)
    if (isInternalEditRef.current) {
      isInternalEditRef.current = false;
      prevInitialBlocksRef.current = initialBlocks;
      return;
    }

    // Only sync if initialBlocks changed and has content
    if (initialBlocks && initialBlocks.length > 0) {
      // Check if initialBlocks actually changed (not just a reference change)
      const prevIds = prevInitialBlocksRef.current?.map(b => b.id).join(',') || '';
      const newIds = initialBlocks.map(b => b.id).join(',');

      // Also check if these are the same blocks we currently have (meaning it's from our own edit)
      const currentIds = blocksRef.current.map(b => b.id).join(',');

      if (prevIds !== newIds && newIds !== currentIds) {
        setBlocks(initialBlocks);
        setUndoStack([]);
        setRedoStack([]);
        hasInitializedRef.current = true;
      }
    }
    prevInitialBlocksRef.current = initialBlocks;
  }, [initialBlocks]);

  // Debounced auto-save
  const debouncedSave = useRef(
    debounce((blocksToSave: Block[]) => {
      if (onSave) {
        setIsSaving(true);
        Promise.resolve(onSave(blocksToSave)).finally(() => {
          setIsSaving(false);
          setLastSaved(new Date());
        });
      }
    }, autoSaveDelay)
  ).current;

  // Track changes for auto-save
  useEffect(() => {
    onChange?.(blocks);
    debouncedSave(blocks);
  }, [blocks, onChange, debouncedSave]);

  // Save to undo stack before changes
  const saveToUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-49), blocksRef.current]);
    setRedoStack([]);
  }, []);

  // Undo
  const undo = useCallback(() => {
    const currentUndoStack = undoStackRef.current;
    if (currentUndoStack.length === 0) return;

    const previousState = currentUndoStack[currentUndoStack.length - 1];
    setRedoStack(prev => [...prev, blocksRef.current]);
    setUndoStack(prev => prev.slice(0, -1));
    setBlocks(previousState);
  }, []);

  // Redo
  const redo = useCallback(() => {
    const currentRedoStack = redoStackRef.current;
    if (currentRedoStack.length === 0) return;

    const nextState = currentRedoStack[currentRedoStack.length - 1];
    setUndoStack(prev => [...prev, blocksRef.current]);
    setRedoStack(prev => prev.slice(0, -1));
    setBlocks(nextState);
  }, []);

  // Update a specific block
  const updateBlock = useCallback((blockId: string, updates: Partial<Block>) => {
    saveToUndo();
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    ));
  }, [saveToUndo]);

  // Insert a block after a specific position
  const insertBlockAfter = useCallback((afterId: string, type: BlockType = 'paragraph') => {
    saveToUndo();
    const newBlock = createBlock(type, '', type === 'todo' ? { checked: false } : undefined);
    const index = blocks.findIndex(b => b.id === afterId);

    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });

    // Focus the new block
    setTimeout(() => setFocusedBlockId(newBlock.id), 0);

    return newBlock.id;
  }, [blocks, saveToUndo]);

  // Insert a block before a specific position
  const insertBlockBefore = useCallback((beforeId: string, type: BlockType = 'paragraph') => {
    saveToUndo();
    const newBlock = createBlock(type, '');
    const index = blocks.findIndex(b => b.id === beforeId);

    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index, 0, newBlock);
      return newBlocks;
    });

    setTimeout(() => setFocusedBlockId(newBlock.id), 0);

    return newBlock.id;
  }, [blocks, saveToUndo]);

  // Insert multiple blocks after a specific position (for paste)
  const insertBlocksAfter = useCallback((afterId: string, newBlocks: Block[]) => {
    if (newBlocks.length === 0) return;

    saveToUndo();
    const index = blocks.findIndex(b => b.id === afterId);

    setBlocks(prev => {
      const result = [...prev];
      result.splice(index + 1, 0, ...newBlocks);
      return result;
    });

    // Focus the last inserted block
    const lastBlock = newBlocks[newBlocks.length - 1];
    setTimeout(() => setFocusedBlockId(lastBlock.id), 0);
  }, [blocks, saveToUndo]);

  // Replace all blocks (for paste replacing all content)
  const replaceAllBlocks = useCallback((newBlocks: Block[]) => {
    if (newBlocks.length === 0) return;

    saveToUndo();
    setBlocks(newBlocks);

    // Focus the first block
    setTimeout(() => setFocusedBlockId(newBlocks[0].id), 0);
  }, [saveToUndo]);

  // Delete a block
  const deleteBlock = useCallback((blockId: string) => {
    saveToUndo();
    const index = blocks.findIndex(b => b.id === blockId);

    // Don't delete the last block
    if (blocks.length <= 1) {
      setBlocks([createBlock('paragraph', '')]);
      return;
    }

    setBlocks(prev => prev.filter(b => b.id !== blockId));

    // Focus previous block or next if first
    const focusIndex = index > 0 ? index - 1 : 0;
    const focusId = blocks[focusIndex]?.id;
    if (focusId && focusId !== blockId) {
      setTimeout(() => setFocusedBlockId(focusId), 0);
    }
  }, [blocks, saveToUndo]);

  // Delete multiple blocks at once (single undo entry)
  const deleteBlocks = useCallback((blockIds: string[]) => {
    if (blockIds.length === 0) return;

    saveToUndo();
    const idsToDelete = new Set(blockIds);

    // If we're deleting all blocks, leave one empty paragraph
    if (idsToDelete.size >= blocks.length) {
      setBlocks([createBlock('paragraph', '')]);
      return;
    }

    // Find the first non-deleted block to focus
    const firstDeletedIndex = blocks.findIndex(b => idsToDelete.has(b.id));
    const remainingBlocks = blocks.filter(b => !idsToDelete.has(b.id));

    setBlocks(remainingBlocks);

    // Focus the block at the position of first deleted, or previous if at end
    const focusIndex = Math.min(firstDeletedIndex, remainingBlocks.length - 1);
    if (remainingBlocks[focusIndex]) {
      setTimeout(() => setFocusedBlockId(remainingBlocks[focusIndex].id), 0);
    }
  }, [blocks, saveToUndo]);

  // Move a block up
  const moveBlockUp = useCallback((blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index <= 0) return;

    saveToUndo();
    setBlocks(prev => {
      const newBlocks = [...prev];
      [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
      return newBlocks;
    });
  }, [blocks, saveToUndo]);

  // Move a block down
  const moveBlockDown = useCallback((blockId: string) => {
    const index = blocks.findIndex(b => b.id === blockId);
    if (index >= blocks.length - 1) return;

    saveToUndo();
    setBlocks(prev => {
      const newBlocks = [...prev];
      [newBlocks[index], newBlocks[index + 1]] = [newBlocks[index + 1], newBlocks[index]];
      return newBlocks;
    });
  }, [blocks, saveToUndo]);

  // Duplicate a block
  const duplicateBlock = useCallback((blockId: string) => {
    saveToUndo();
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const newBlock: Block = {
      ...block,
      id: crypto.randomUUID(),
    };

    const index = blocks.findIndex(b => b.id === blockId);
    setBlocks(prev => {
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });

    setTimeout(() => setFocusedBlockId(newBlock.id), 0);
  }, [blocks, saveToUndo]);

  // Turn a block into another type
  const turnBlockInto = useCallback((blockId: string, newType: BlockType) => {
    saveToUndo();
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;

      // Preserve content when converting between text-based types
      return {
        ...block,
        type: newType,
        meta: {
          ...block.meta,
          // Add type-specific defaults
          ...(newType === 'todo' && { checked: false }),
          ...(newType === 'toggle' && { expanded: true }),
          ...(newType === 'callout' && { calloutType: 'info' }),
          ...(newType === 'code' && { language: 'plaintext' }),
        },
      };
    }));
  }, [saveToUndo]);

  // Indent a block
  const indentBlock = useCallback((blockId: string) => {
    saveToUndo();
    setBlocks(prev => prev.map(block =>
      block.id === blockId
        ? { ...block, meta: { ...block.meta, indent: Math.min((block.meta?.indent || 0) + 1, 3) } }
        : block
    ));
  }, [saveToUndo]);

  // Outdent a block
  const outdentBlock = useCallback((blockId: string) => {
    saveToUndo();
    setBlocks(prev => prev.map(block =>
      block.id === blockId
        ? { ...block, meta: { ...block.meta, indent: Math.max((block.meta?.indent || 0) - 1, 0) } }
        : block
    ));
  }, [saveToUndo]);

  // Focus next block
  const focusNextBlock = useCallback((currentId: string) => {
    const index = blocks.findIndex(b => b.id === currentId);
    if (index < blocks.length - 1) {
      setFocusedBlockId(blocks[index + 1].id);
    }
  }, [blocks]);

  // Focus previous block
  const focusPreviousBlock = useCallback((currentId: string) => {
    const index = blocks.findIndex(b => b.id === currentId);
    if (index > 0) {
      setFocusedBlockId(blocks[index - 1].id);
    }
  }, [blocks]);

  // Select block
  const selectBlock = useCallback((blockId: string, addToSelection = false) => {
    if (addToSelection) {
      setSelectedBlockIds(prev => {
        const next = new Set(prev);
        if (next.has(blockId)) {
          next.delete(blockId);
        } else {
          next.add(blockId);
        }
        return next;
      });
    } else {
      setSelectedBlockIds(new Set([blockId]));
    }
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedBlockIds(new Set());
  }, []);

  // Select a range of blocks (from startId to endId inclusive)
  const selectBlockRange = useCallback((startId: string, endId: string) => {
    const startIndex = blocks.findIndex(b => b.id === startId);
    const endIndex = blocks.findIndex(b => b.id === endId);

    if (startIndex === -1 || endIndex === -1) return;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    const selectedIds = new Set<string>();
    for (let i = minIndex; i <= maxIndex; i++) {
      selectedIds.add(blocks[i].id);
    }
    setSelectedBlockIds(selectedIds);
  }, [blocks]);

  return {
    // State
    blocks,
    focusedBlockId,
    selectedBlockIds,
    isSaving,
    lastSaved,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,

    // Actions
    setBlocks,
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
    focusNextBlock,
    focusPreviousBlock,
    selectBlock,
    selectBlockRange,
    clearSelection,
    undo,
    redo,
  };
}
