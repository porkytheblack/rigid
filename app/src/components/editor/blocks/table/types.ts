/**
 * Table-specific types for the enhanced TableBlock
 */

import type { BlockContent, Mark } from '../../types';

/**
 * Position of a cell in the table
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * A range of cells in the table
 */
export interface CellRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * Enhanced table cell with rich content support
 */
export interface TableCellData {
  content: BlockContent;
  colspan?: number;
  rowspan?: number;
}

/**
 * Selection state for the table
 */
export interface TableSelection {
  /** The anchor cell (where selection started) */
  anchor: CellPosition | null;
  /** The focus cell (where selection ends) */
  focus: CellPosition | null;
  /** Type of selection */
  type: 'cell' | 'row' | 'column' | 'all' | null;
}

/**
 * Column resize state
 */
export interface ColumnResizeState {
  /** Column index being resized */
  columnIndex: number | null;
  /** Initial width when resize started */
  initialWidth: number;
  /** Initial mouse X position */
  startX: number;
  /** Whether currently resizing */
  isResizing: boolean;
}

/**
 * Parsed table data from clipboard
 */
export interface ParsedTableData {
  /** The parsed rows of data */
  rows: string[][];
  /** Source format detected */
  format: 'html' | 'tsv' | 'csv' | 'unknown';
  /** Whether the first row appears to be a header */
  hasHeader: boolean;
}

/**
 * Get all cell positions in a selection range
 */
export function getCellsInRange(range: CellRange): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let row = range.startRow; row <= range.endRow; row++) {
    for (let col = range.startCol; col <= range.endCol; col++) {
      cells.push({ row, col });
    }
  }
  return cells;
}

/**
 * Check if a cell is within a selection range
 */
export function isCellInRange(cell: CellPosition, range: CellRange | null): boolean {
  if (!range) return false;
  return (
    cell.row >= range.startRow &&
    cell.row <= range.endRow &&
    cell.col >= range.startCol &&
    cell.col <= range.endCol
  );
}

/**
 * Get the normalized range from a selection (handles inverted selections)
 */
export function getNormalizedRange(selection: TableSelection): CellRange | null {
  if (!selection.anchor) return null;

  const focus = selection.focus || selection.anchor;

  return {
    startRow: Math.min(selection.anchor.row, focus.row),
    endRow: Math.max(selection.anchor.row, focus.row),
    startCol: Math.min(selection.anchor.col, focus.col),
    endCol: Math.max(selection.anchor.col, focus.col),
  };
}

/**
 * Create a cell key for use in Map/Set operations
 */
export function cellKey(pos: CellPosition): string {
  return `${pos.row}-${pos.col}`;
}

/**
 * Parse a cell key back to a position
 */
export function parseCellKey(key: string): CellPosition {
  const [row, col] = key.split('-').map(Number);
  return { row, col };
}

/**
 * Create an empty cell with default content
 */
export function createEmptyCell(): TableCellData {
  return {
    content: { text: '', marks: [] },
  };
}

/**
 * Create a cell with text content
 */
export function createCell(text: string, marks: Mark[] = []): TableCellData {
  return {
    content: { text, marks },
  };
}

/**
 * Get text content from a cell (handles various cell formats for backward compatibility)
 */
export function getCellText(cell: TableCellData | string | undefined | null): string {
  if (!cell) return '';
  if (typeof cell === 'string') return cell;
  if (cell.content) {
    if (typeof cell.content === 'string') return cell.content;
    return cell.content.text || '';
  }
  return '';
}

/**
 * Set text content on a cell
 */
export function setCellText(cell: TableCellData, text: string): TableCellData {
  return {
    ...cell,
    content: {
      ...cell.content,
      text,
    },
  };
}
