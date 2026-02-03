/**
 * Table Block Module
 *
 * Exports all table-related components and utilities
 */

// Types
export * from './types';

// Components
export { TableCellEditor } from './TableCellEditor';
export type { TableCellEditorProps, TableCellEditorHandle } from './TableCellEditor';

export { TableToolbar } from './TableToolbar';
export type { TableToolbarProps } from './TableToolbar';

export { ColumnResizeHandle } from './ColumnResizeHandle';
export type { ColumnResizeHandleProps } from './ColumnResizeHandle';

// Hooks
export { useTableSelection } from './useTableSelection';
export type { UseTableSelectionOptions, UseTableSelectionReturn } from './useTableSelection';

export { useColumnResize } from './useColumnResize';
export type { UseColumnResizeOptions, UseColumnResizeReturn } from './useColumnResize';

// Utilities
export {
  parseClipboardData,
  parseHtmlTable,
  parseTextTable,
  parseTsv,
  parseCsv,
  parseMarkdownTable,
  convertToTableCells,
  mergePastedData,
  looksLikeTableData,
} from './tablePasteHandler';
