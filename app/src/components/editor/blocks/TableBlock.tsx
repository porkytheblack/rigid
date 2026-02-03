"use client";

import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { Editor as TipTapEditor } from "@tiptap/react";
import { Plus, GripVertical } from "lucide-react";
import { Block, BlockType, LegacyBlockMeta, TableCellAlign, BlockContent } from "../types";
import { FormattingToolbar } from "../ui/FormattingToolbar";
import {
  TableCellEditor,
  TableCellEditorHandle,
  TableToolbar,
  ColumnResizeHandle,
  useTableSelection,
  useColumnResize,
  parseClipboardData,
  looksLikeTableData,
  convertToTableCells,
  mergePastedData,
  CellPosition,
  TableCellData,
  createEmptyCell,
  getCellText,
} from "./table";

interface TableBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

export function TableBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: TableBlockProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<string, TableCellEditorHandle>>(new Map());
  const [focusedCell, setFocusedCell] = useState<CellPosition | null>(null);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });

  // Formatting toolbar state
  const [formattingToolbarOpen, setFormattingToolbarOpen] = useState(false);
  const [formattingToolbarPosition, setFormattingToolbarPosition] = useState({ x: 0, y: 0 });
  const [formattingToolbarEditor, setFormattingToolbarEditor] = useState<TipTapEditor | null>(null);

  const meta = block.meta as LegacyBlockMeta | undefined;
  const rawRows = (meta?.rows || []) as TableCellData[][];
  const columnAligns = (meta?.columnAligns || []) as TableCellAlign[];
  const columnWidths = meta?.columnWidths;

  // Normalize rows to ensure they have proper BlockContent structure
  const rows: TableCellData[][] = useMemo(() => {
    if (rawRows.length === 0) {
      // Default 2x2 table
      return [
        [createEmptyCell(), createEmptyCell()],
        [createEmptyCell(), createEmptyCell()],
      ];
    }

    return rawRows.map((row) => {
      if (!Array.isArray(row)) return [createEmptyCell(), createEmptyCell()];
      return row.map((cell) => {
        if (!cell) return createEmptyCell();
        if (typeof cell === 'string') {
          return { content: { text: cell, marks: [] } };
        }
        if (cell.content) {
          if (typeof cell.content === 'string') {
            return { content: { text: cell.content, marks: [] } };
          }
          return cell as TableCellData;
        }
        return createEmptyCell();
      });
    });
  }, [rawRows]);

  const numRows = rows.length;
  const numCols = Math.max(...rows.map((row) => row.length), 2);

  // Ensure column aligns array matches number of columns
  const effectiveAligns: TableCellAlign[] = useMemo(() => {
    const aligns = [...columnAligns];
    while (aligns.length < numCols) {
      aligns.push(null);
    }
    return aligns;
  }, [columnAligns, numCols]);

  // Table selection hook
  const {
    selection,
    isCellSelected,
    isCellAnchor,
    startSelection,
    extendSelection,
    clearSelection,
    selectAll,
    selectRow,
    selectColumn,
    getSelectedCells,
    handleCellMouseDown,
    handleCellMouseEnter,
  } = useTableSelection({
    numRows,
    numCols,
    onSelectionChange: () => {
      // Selection changed - could trigger copy/paste UI
    },
  });

  // Column resize hook
  const { widths, isResizing, startResize } = useColumnResize({
    numCols,
    columnWidths,
    onWidthsChange: (newWidths) => {
      updateMeta({ columnWidths: newWidths });
    },
    tableRef,
  });

  // Helper to get cell key
  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  // Helper to update metadata
  const updateMeta = useCallback(
    (updates: Partial<LegacyBlockMeta>) => {
      onUpdate({
        ...block,
        meta: {
          ...meta,
          ...updates,
        },
      });
    },
    [block, meta, onUpdate]
  );

  // Helper to update rows
  const updateRows = useCallback(
    (newRows: TableCellData[][]) => {
      updateMeta({ rows: newRows });
    },
    [updateMeta]
  );

  // Update cell content
  const updateCell = useCallback(
    (position: CellPosition, content: BlockContent) => {
      const newRows = rows.map((row, ri) =>
        row.map((cell, ci) => {
          if (ri === position.row && ci === position.col) {
            return { ...cell, content };
          }
          return cell;
        })
      );
      updateRows(newRows);
    },
    [rows, updateRows]
  );

  // Add row
  const addRow = useCallback(
    (afterIndex: number) => {
      const newRow: TableCellData[] = Array(numCols)
        .fill(null)
        .map(() => createEmptyCell());

      const newRows = [...rows];
      newRows.splice(afterIndex + 1, 0, newRow);
      updateRows(newRows);

      // Focus first cell of new row
      setTimeout(() => {
        setFocusedCell({ row: afterIndex + 1, col: 0 });
      }, 0);
    },
    [rows, numCols, updateRows]
  );

  // Add row above
  const addRowAbove = useCallback(() => {
    const targetRow = focusedCell?.row ?? 0;
    const newRow: TableCellData[] = Array(numCols)
      .fill(null)
      .map(() => createEmptyCell());

    const newRows = [...rows];
    newRows.splice(targetRow, 0, newRow);
    updateRows(newRows);

    setTimeout(() => {
      setFocusedCell({ row: targetRow, col: focusedCell?.col ?? 0 });
    }, 0);
  }, [focusedCell, rows, numCols, updateRows]);

  // Add row below
  const addRowBelow = useCallback(() => {
    const targetRow = focusedCell?.row ?? rows.length - 1;
    addRow(targetRow);
  }, [focusedCell, rows.length, addRow]);

  // Delete row
  const deleteRow = useCallback(
    (index: number) => {
      if (numRows <= 1) return;

      const newRows = rows.filter((_, i) => i !== index);
      updateRows(newRows);

      // Adjust focused cell
      if (focusedCell) {
        if (focusedCell.row >= newRows.length) {
          setFocusedCell({ row: newRows.length - 1, col: focusedCell.col });
        } else if (focusedCell.row === index) {
          setFocusedCell({ row: Math.max(0, index - 1), col: focusedCell.col });
        }
      }
    },
    [rows, numRows, updateRows, focusedCell]
  );

  // Delete current row
  const deleteCurrentRow = useCallback(() => {
    if (focusedCell) {
      deleteRow(focusedCell.row);
    }
  }, [focusedCell, deleteRow]);

  // Add column
  const addColumn = useCallback(
    (afterIndex: number) => {
      const newRows = rows.map((row) => {
        const newRow = [...row];
        newRow.splice(afterIndex + 1, 0, createEmptyCell());
        return newRow;
      });

      const newAligns = [...effectiveAligns];
      newAligns.splice(afterIndex + 1, 0, null);

      const newWidths = columnWidths ? [...columnWidths] : undefined;
      if (newWidths) {
        newWidths.splice(afterIndex + 1, 0, 150);
      }

      updateMeta({
        rows: newRows,
        columnAligns: newAligns,
        columnWidths: newWidths,
      });

      // Focus first row of new column
      setTimeout(() => {
        setFocusedCell({ row: 0, col: afterIndex + 1 });
      }, 0);
    },
    [rows, effectiveAligns, columnWidths, updateMeta]
  );

  // Add column left
  const addColumnLeft = useCallback(() => {
    const targetCol = focusedCell?.col ?? 0;
    const newRows = rows.map((row) => {
      const newRow = [...row];
      newRow.splice(targetCol, 0, createEmptyCell());
      return newRow;
    });

    const newAligns = [...effectiveAligns];
    newAligns.splice(targetCol, 0, null);

    const newWidths = columnWidths ? [...columnWidths] : undefined;
    if (newWidths) {
      newWidths.splice(targetCol, 0, 150);
    }

    updateMeta({
      rows: newRows,
      columnAligns: newAligns,
      columnWidths: newWidths,
    });

    setTimeout(() => {
      setFocusedCell({ row: focusedCell?.row ?? 0, col: targetCol });
    }, 0);
  }, [focusedCell, rows, effectiveAligns, columnWidths, updateMeta]);

  // Add column right
  const addColumnRight = useCallback(() => {
    const targetCol = focusedCell?.col ?? numCols - 1;
    addColumn(targetCol);
  }, [focusedCell, numCols, addColumn]);

  // Delete column
  const deleteColumn = useCallback(
    (index: number) => {
      if (numCols <= 1) return;

      const newRows = rows.map((row) => row.filter((_, i) => i !== index));
      const newAligns = effectiveAligns.filter((_, i) => i !== index);
      const newWidths = columnWidths?.filter((_, i) => i !== index);

      updateMeta({
        rows: newRows,
        columnAligns: newAligns,
        columnWidths: newWidths,
      });

      // Adjust focused cell
      if (focusedCell) {
        if (focusedCell.col >= newRows[0]?.length) {
          setFocusedCell({ row: focusedCell.row, col: Math.max(0, (newRows[0]?.length || 1) - 1) });
        } else if (focusedCell.col === index) {
          setFocusedCell({ row: focusedCell.row, col: Math.max(0, index - 1) });
        }
      }
    },
    [rows, numCols, effectiveAligns, columnWidths, updateMeta, focusedCell]
  );

  // Delete current column
  const deleteCurrentColumn = useCallback(() => {
    if (focusedCell) {
      deleteColumn(focusedCell.col);
    }
  }, [focusedCell, deleteColumn]);

  // Set column alignment
  const setColumnAlign = useCallback(
    (col: number, align: TableCellAlign) => {
      const newAligns = [...effectiveAligns];
      newAligns[col] = align;
      updateMeta({ columnAligns: newAligns });
    },
    [effectiveAligns, updateMeta]
  );

  // Handle cell navigation
  const handleNavigate = useCallback(
    (position: CellPosition, direction: 'up' | 'down' | 'left' | 'right' | 'tab' | 'shift-tab' | 'enter'): boolean => {
      const { row, col } = position;

      switch (direction) {
        case 'tab':
          if (col < numCols - 1) {
            setFocusedCell({ row, col: col + 1 });
            return true;
          } else if (row < numRows - 1) {
            setFocusedCell({ row: row + 1, col: 0 });
            return true;
          } else {
            // At last cell - add new row
            addRow(row);
            return true;
          }

        case 'shift-tab':
          if (col > 0) {
            setFocusedCell({ row, col: col - 1 });
            return true;
          } else if (row > 0) {
            setFocusedCell({ row: row - 1, col: numCols - 1 });
            return true;
          }
          return false;

        case 'enter':
          if (row < numRows - 1) {
            setFocusedCell({ row: row + 1, col });
            return true;
          } else {
            addRow(row);
            return true;
          }

        case 'up':
          if (row > 0) {
            setFocusedCell({ row: row - 1, col });
            return true;
          } else if (onFocusPrevious) {
            onFocusPrevious();
            return true;
          }
          return false;

        case 'down':
          if (row < numRows - 1) {
            setFocusedCell({ row: row + 1, col });
            return true;
          } else if (onFocusNext) {
            onFocusNext();
            return true;
          }
          return false;

        case 'left':
          if (col > 0) {
            setFocusedCell({ row, col: col - 1 });
            return true;
          }
          return false;

        case 'right':
          if (col < numCols - 1) {
            setFocusedCell({ row, col: col + 1 });
            return true;
          }
          return false;

        default:
          return false;
      }
    },
    [numRows, numCols, addRow, onFocusPrevious, onFocusNext]
  );

  // Handle cell focus
  const handleCellFocus = useCallback((position: CellPosition) => {
    setFocusedCell(position);
    clearSelection();
    onFocus();
  }, [clearSelection, onFocus]);

  // Handle escape from cell
  const handleEscape = useCallback(() => {
    clearSelection();
    setFocusedCell(null);
    onInsertAfter('paragraph');
  }, [clearSelection, onInsertAfter]);

  // Handle paste
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!e.clipboardData) return;

      // Check if it looks like table data
      if (looksLikeTableData(e.clipboardData)) {
        e.preventDefault();

        const parsed = parseClipboardData(e.clipboardData);
        if (!parsed) return;

        // Determine paste position
        const startRow = focusedCell?.row ?? 0;
        const startCol = focusedCell?.col ?? 0;

        // Merge pasted data
        const newRows = mergePastedData(rows, parsed, startRow, startCol);
        updateRows(newRows);

        // Update column aligns if needed
        const maxCols = Math.max(...newRows.map((r) => r.length));
        if (maxCols > effectiveAligns.length) {
          const newAligns = [...effectiveAligns];
          while (newAligns.length < maxCols) {
            newAligns.push(null);
          }
          updateMeta({ rows: newRows, columnAligns: newAligns });
        }
      }
    },
    [focusedCell, rows, effectiveAligns, updateRows, updateMeta]
  );

  // Handle copy
  const handleCopy = useCallback(
    (e: ClipboardEvent) => {
      const selectedCells = getSelectedCells();
      if (selectedCells.length === 0 && focusedCell) {
        // Copy just the focused cell
        const cell = rows[focusedCell.row]?.[focusedCell.col];
        if (cell) {
          e.preventDefault();
          const text = getCellText(cell);
          e.clipboardData?.setData('text/plain', text);
        }
        return;
      }

      if (selectedCells.length > 1) {
        e.preventDefault();

        // Get the range
        const minRow = Math.min(...selectedCells.map((c) => c.row));
        const maxRow = Math.max(...selectedCells.map((c) => c.row));
        const minCol = Math.min(...selectedCells.map((c) => c.col));
        const maxCol = Math.max(...selectedCells.map((c) => c.col));

        // Build TSV
        const lines: string[] = [];
        for (let r = minRow; r <= maxRow; r++) {
          const rowCells: string[] = [];
          for (let c = minCol; c <= maxCol; c++) {
            const cell = rows[r]?.[c];
            rowCells.push(getCellText(cell));
          }
          lines.push(rowCells.join('\t'));
        }

        e.clipboardData?.setData('text/plain', lines.join('\n'));
      }
    },
    [focusedCell, getSelectedCells, rows]
  );

  // Attach clipboard handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('paste', handlePaste);
    container.addEventListener('copy', handleCopy);

    return () => {
      container.removeEventListener('paste', handlePaste);
      container.removeEventListener('copy', handleCopy);
    };
  }, [handlePaste, handleCopy]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;

      // Cmd/Ctrl+A to select all when focused on table
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && focusedCell) {
        e.preventDefault();
        selectAll();
        return;
      }

      // Delete/Backspace to delete selected content or row
      if ((e.key === 'Backspace' || e.key === 'Delete') && selection.type && !focusedCell) {
        e.preventDefault();
        const selectedCells = getSelectedCells();
        if (selectedCells.length > 0) {
          // Clear selected cells
          const newRows = rows.map((row, ri) =>
            row.map((cell, ci) => {
              if (selectedCells.some((s) => s.row === ri && s.col === ci)) {
                return createEmptyCell();
              }
              return cell;
            })
          );
          updateRows(newRows);
          clearSelection();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, focusedCell, selection, selectAll, getSelectedCells, rows, updateRows, clearSelection]);

  // Update toolbar position when table is focused
  useEffect(() => {
    if (isFocused && tableRef.current) {
      const rect = tableRef.current.getBoundingClientRect();
      setToolbarPosition({
        x: rect.left,
        y: rect.top - 44,
      });
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
    }
  }, [isFocused]);

  // Focus handling
  useEffect(() => {
    if (isFocused && !focusedCell) {
      setFocusedCell({ row: 0, col: 0 });
    }
  }, [isFocused, focusedCell]);

  // Focus cell when it changes
  useEffect(() => {
    if (focusedCell) {
      const key = getCellKey(focusedCell.row, focusedCell.col);
      const cellEditor = cellRefs.current.get(key);
      if (cellEditor) {
        cellEditor.focusEnd();
      }
    }
  }, [focusedCell]);

  // Handle formatting toolbar
  const handleOpenFormattingToolbar = useCallback(
    (position: { x: number; y: number }, editor: TipTapEditor) => {
      setFormattingToolbarPosition(position);
      setFormattingToolbarEditor(editor);
      setFormattingToolbarOpen(true);
    },
    []
  );

  // Get alignment class
  const getAlignClass = (align: TableCellAlign): string => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      default:
        return 'text-left';
    }
  };

  // Mouse handlers for drag selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, position: CellPosition) => {
      if (e.button !== 0) return; // Only left click
      setIsDraggingSelection(true);
      handleCellMouseDown(position, { shiftKey: e.shiftKey });
    },
    [handleCellMouseDown]
  );

  const handleMouseEnter = useCallback(
    (position: CellPosition) => {
      if (isDraggingSelection) {
        handleCellMouseEnter(position, true);
      }
    },
    [isDraggingSelection, handleCellMouseEnter]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingSelection(false);
  }, []);

  // Global mouse up to end drag
  useEffect(() => {
    if (isDraggingSelection) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => document.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDraggingSelection, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-auto"
      onClick={() => onFocus()}
    >
      <table
        ref={tableRef}
        className="w-full border-collapse border border-[var(--border-default)]"
        style={{ tableLayout: columnWidths ? 'fixed' : 'auto' }}
      >
        <colgroup>
          {Array.from({ length: numCols }).map((_, i) => (
            <col
              key={i}
              style={{
                width: columnWidths?.[i] ? `${columnWidths[i]}px` : 'auto',
              }}
            />
          ))}
        </colgroup>
        <thead>
          <tr>
            {rows[0]?.map((cell, colIndex) => (
              <th
                key={colIndex}
                className={`
                  relative border border-[var(--border-default)] bg-[var(--surface-secondary)]
                  ${getAlignClass(effectiveAligns[colIndex])}
                  ${isCellSelected({ row: 0, col: colIndex }) ? 'bg-[var(--accent-muted)]' : ''}
                  group
                `}
                onMouseDown={(e) => handleMouseDown(e, { row: 0, col: colIndex })}
                onMouseEnter={() => handleMouseEnter({ row: 0, col: colIndex })}
              >
                <TableCellEditor
                  ref={(el) => {
                    if (el) cellRefs.current.set(getCellKey(0, colIndex), el);
                    else cellRefs.current.delete(getCellKey(0, colIndex));
                  }}
                  content={cell.content}
                  position={{ row: 0, col: colIndex }}
                  isFocused={focusedCell?.row === 0 && focusedCell?.col === colIndex}
                  isSelected={isCellSelected({ row: 0, col: colIndex })}
                  isHeader={true}
                  align={effectiveAligns[colIndex]}
                  onContentChange={updateCell}
                  onFocus={handleCellFocus}
                  onNavigate={handleNavigate}
                  onEscape={handleEscape}
                  onOpenFormattingToolbar={handleOpenFormattingToolbar}
                />

                {/* Column resize handle */}
                <ColumnResizeHandle
                  columnIndex={colIndex}
                  isResizing={isResizing}
                  onStartResize={startResize}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(1).map((row, rowIndex) => {
            const actualRowIndex = rowIndex + 1;
            return (
              <tr key={actualRowIndex} className="group">
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={`
                      relative border border-[var(--border-default)]
                      ${getAlignClass(effectiveAligns[colIndex])}
                      ${isCellSelected({ row: actualRowIndex, col: colIndex }) ? 'bg-[var(--accent-muted)]' : ''}
                    `}
                    onMouseDown={(e) => handleMouseDown(e, { row: actualRowIndex, col: colIndex })}
                    onMouseEnter={() => handleMouseEnter({ row: actualRowIndex, col: colIndex })}
                  >
                    <TableCellEditor
                      ref={(el) => {
                        if (el) cellRefs.current.set(getCellKey(actualRowIndex, colIndex), el);
                        else cellRefs.current.delete(getCellKey(actualRowIndex, colIndex));
                      }}
                      content={cell.content}
                      position={{ row: actualRowIndex, col: colIndex }}
                      isFocused={focusedCell?.row === actualRowIndex && focusedCell?.col === colIndex}
                      isSelected={isCellSelected({ row: actualRowIndex, col: colIndex })}
                      isHeader={false}
                      align={effectiveAligns[colIndex]}
                      onContentChange={updateCell}
                      onFocus={handleCellFocus}
                      onNavigate={handleNavigate}
                      onEscape={handleEscape}
                      onOpenFormattingToolbar={handleOpenFormattingToolbar}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Add row button at bottom */}
      <button
        type="button"
        className="w-full mt-1 p-1 flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] opacity-0 hover:opacity-100 transition-opacity"
        onClick={() => addRow(numRows - 1)}
      >
        <Plus className="w-4 h-4 mr-1" />
        <span className="text-[var(--text-caption)]">Add row</span>
      </button>

      {/* Table toolbar */}
      <TableToolbar
        isVisible={showToolbar && isFocused}
        position={toolbarPosition}
        numRows={numRows}
        numCols={numCols}
        focusedRow={focusedCell?.row ?? null}
        focusedCol={focusedCell?.col ?? null}
        columnAligns={effectiveAligns}
        onAddRow={(position) => {
          if (position === 'above') addRowAbove();
          else addRowBelow();
        }}
        onAddColumn={(position) => {
          if (position === 'left') addColumnLeft();
          else addColumnRight();
        }}
        onDeleteRow={deleteCurrentRow}
        onDeleteColumn={deleteCurrentColumn}
        onSetColumnAlign={setColumnAlign}
        onDeleteTable={onDelete}
        onClose={() => setShowToolbar(false)}
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

export default TableBlock;
