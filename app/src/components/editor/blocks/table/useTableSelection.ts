"use client";

import { useState, useCallback, useMemo } from "react";
import type { CellPosition, CellRange, TableSelection } from "./types";
import { getNormalizedRange, isCellInRange, getCellsInRange, cellKey } from "./types";

export interface UseTableSelectionOptions {
  numRows: number;
  numCols: number;
  onSelectionChange?: (selection: TableSelection) => void;
}

export interface UseTableSelectionReturn {
  /** Current selection state */
  selection: TableSelection;
  /** Set of selected cell keys for fast lookup */
  selectedCellKeys: Set<string>;
  /** Check if a cell is selected */
  isCellSelected: (pos: CellPosition) => boolean;
  /** Check if a cell is the anchor of the selection */
  isCellAnchor: (pos: CellPosition) => boolean;
  /** Start a selection at a cell */
  startSelection: (pos: CellPosition, type?: 'cell' | 'row' | 'column') => void;
  /** Extend selection to a cell (for shift+click or drag) */
  extendSelection: (pos: CellPosition) => void;
  /** Clear the selection */
  clearSelection: () => void;
  /** Select all cells */
  selectAll: () => void;
  /** Select an entire row */
  selectRow: (rowIndex: number) => void;
  /** Select an entire column */
  selectColumn: (colIndex: number) => void;
  /** Get the normalized selection range */
  getRange: () => CellRange | null;
  /** Get all selected cells */
  getSelectedCells: () => CellPosition[];
  /** Handle click on a cell */
  handleCellClick: (pos: CellPosition, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => void;
  /** Handle mouse down on a cell (for drag selection) */
  handleCellMouseDown: (pos: CellPosition, event: { shiftKey: boolean }) => void;
  /** Handle mouse enter on a cell (for drag selection) */
  handleCellMouseEnter: (pos: CellPosition, isDragging: boolean) => void;
}

export function useTableSelection({
  numRows,
  numCols,
  onSelectionChange,
}: UseTableSelectionOptions): UseTableSelectionReturn {
  const [selection, setSelection] = useState<TableSelection>({
    anchor: null,
    focus: null,
    type: null,
  });

  // Compute selected cell keys for fast lookup
  const selectedCellKeys = useMemo(() => {
    const keys = new Set<string>();
    const range = getNormalizedRange(selection);

    if (!range) return keys;

    // For row selection, select entire row regardless of numCols
    if (selection.type === 'row' && selection.anchor) {
      const startRow = range.startRow;
      const endRow = range.endRow;
      for (let row = startRow; row <= endRow; row++) {
        for (let col = 0; col < numCols; col++) {
          keys.add(cellKey({ row, col }));
        }
      }
      return keys;
    }

    // For column selection, select entire column regardless of numRows
    if (selection.type === 'column' && selection.anchor) {
      const startCol = range.startCol;
      const endCol = range.endCol;
      for (let col = startCol; col <= endCol; col++) {
        for (let row = 0; row < numRows; row++) {
          keys.add(cellKey({ row, col }));
        }
      }
      return keys;
    }

    // For all selection
    if (selection.type === 'all') {
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          keys.add(cellKey({ row, col }));
        }
      }
      return keys;
    }

    // For normal cell selection
    const cells = getCellsInRange(range);
    for (const cell of cells) {
      keys.add(cellKey(cell));
    }

    return keys;
  }, [selection, numRows, numCols]);

  const isCellSelected = useCallback(
    (pos: CellPosition) => {
      return selectedCellKeys.has(cellKey(pos));
    },
    [selectedCellKeys]
  );

  const isCellAnchor = useCallback(
    (pos: CellPosition) => {
      if (!selection.anchor) return false;
      return selection.anchor.row === pos.row && selection.anchor.col === pos.col;
    },
    [selection.anchor]
  );

  const updateSelection = useCallback(
    (newSelection: TableSelection) => {
      setSelection(newSelection);
      onSelectionChange?.(newSelection);
    },
    [onSelectionChange]
  );

  const startSelection = useCallback(
    (pos: CellPosition, type: 'cell' | 'row' | 'column' = 'cell') => {
      updateSelection({
        anchor: pos,
        focus: pos,
        type,
      });
    },
    [updateSelection]
  );

  const extendSelection = useCallback(
    (pos: CellPosition) => {
      if (!selection.anchor) return;

      updateSelection({
        ...selection,
        focus: pos,
      });
    },
    [selection, updateSelection]
  );

  const clearSelection = useCallback(() => {
    updateSelection({
      anchor: null,
      focus: null,
      type: null,
    });
  }, [updateSelection]);

  const selectAll = useCallback(() => {
    updateSelection({
      anchor: { row: 0, col: 0 },
      focus: { row: numRows - 1, col: numCols - 1 },
      type: 'all',
    });
  }, [numRows, numCols, updateSelection]);

  const selectRow = useCallback(
    (rowIndex: number) => {
      updateSelection({
        anchor: { row: rowIndex, col: 0 },
        focus: { row: rowIndex, col: numCols - 1 },
        type: 'row',
      });
    },
    [numCols, updateSelection]
  );

  const selectColumn = useCallback(
    (colIndex: number) => {
      updateSelection({
        anchor: { row: 0, col: colIndex },
        focus: { row: numRows - 1, col: colIndex },
        type: 'column',
      });
    },
    [numRows, updateSelection]
  );

  const getRange = useCallback(() => {
    return getNormalizedRange(selection);
  }, [selection]);

  const getSelectedCells = useCallback(() => {
    const range = getNormalizedRange(selection);
    if (!range) return [];

    // Handle row/column selection
    if (selection.type === 'row') {
      const cells: CellPosition[] = [];
      for (let row = range.startRow; row <= range.endRow; row++) {
        for (let col = 0; col < numCols; col++) {
          cells.push({ row, col });
        }
      }
      return cells;
    }

    if (selection.type === 'column') {
      const cells: CellPosition[] = [];
      for (let col = range.startCol; col <= range.endCol; col++) {
        for (let row = 0; row < numRows; row++) {
          cells.push({ row, col });
        }
      }
      return cells;
    }

    if (selection.type === 'all') {
      const cells: CellPosition[] = [];
      for (let row = 0; row < numRows; row++) {
        for (let col = 0; col < numCols; col++) {
          cells.push({ row, col });
        }
      }
      return cells;
    }

    return getCellsInRange(range);
  }, [selection, numRows, numCols]);

  const handleCellClick = useCallback(
    (pos: CellPosition, event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }) => {
      if (event.shiftKey && selection.anchor) {
        // Extend selection
        extendSelection(pos);
      } else {
        // Start new selection
        startSelection(pos);
      }
    },
    [selection.anchor, extendSelection, startSelection]
  );

  const handleCellMouseDown = useCallback(
    (pos: CellPosition, event: { shiftKey: boolean }) => {
      if (event.shiftKey && selection.anchor) {
        extendSelection(pos);
      } else {
        startSelection(pos);
      }
    },
    [selection.anchor, extendSelection, startSelection]
  );

  const handleCellMouseEnter = useCallback(
    (pos: CellPosition, isDragging: boolean) => {
      if (isDragging && selection.anchor) {
        extendSelection(pos);
      }
    },
    [selection.anchor, extendSelection]
  );

  return {
    selection,
    selectedCellKeys,
    isCellSelected,
    isCellAnchor,
    startSelection,
    extendSelection,
    clearSelection,
    selectAll,
    selectRow,
    selectColumn,
    getRange,
    getSelectedCells,
    handleCellClick,
    handleCellMouseDown,
    handleCellMouseEnter,
  };
}

export default useTableSelection;
