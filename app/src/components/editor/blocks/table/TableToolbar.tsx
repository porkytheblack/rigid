"use client";

import { useRef, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Rows,
  Columns,
  Table2,
  ChevronDown,
} from "lucide-react";
import type { TableCellAlign } from "../../types";

export interface TableToolbarProps {
  /** Whether the toolbar is visible */
  isVisible: boolean;
  /** Position relative to table */
  position: { x: number; y: number };
  /** Number of rows */
  numRows: number;
  /** Number of columns */
  numCols: number;
  /** Currently focused row (for row operations) */
  focusedRow: number | null;
  /** Currently focused column (for column operations) */
  focusedCol: number | null;
  /** Column alignments */
  columnAligns: TableCellAlign[];
  /** Add row callback */
  onAddRow: (position: 'above' | 'below') => void;
  /** Add column callback */
  onAddColumn: (position: 'left' | 'right') => void;
  /** Delete row callback */
  onDeleteRow: () => void;
  /** Delete column callback */
  onDeleteColumn: () => void;
  /** Set column alignment */
  onSetColumnAlign: (colIndex: number, align: TableCellAlign) => void;
  /** Delete entire table */
  onDeleteTable: () => void;
  /** Close toolbar */
  onClose: () => void;
}

export function TableToolbar({
  isVisible,
  position,
  numRows,
  numCols,
  focusedRow,
  focusedCol,
  columnAligns,
  onAddRow,
  onAddColumn,
  onDeleteRow,
  onDeleteColumn,
  onSetColumnAlign,
  onDeleteTable,
  onClose,
}: TableToolbarProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [showRowMenu, setShowRowMenu] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowRowMenu(false);
        setShowColumnMenu(false);
        setShowAlignMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible]);

  if (!isVisible) return null;

  const currentAlign = focusedCol !== null ? columnAligns[focusedCol] : null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 flex items-center gap-0.5 bg-[var(--surface-primary)] border border-[var(--border-strong)] shadow-lg p-1"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Row operations */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 text-[var(--text-caption)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          onClick={() => {
            setShowRowMenu(!showRowMenu);
            setShowColumnMenu(false);
            setShowAlignMenu(false);
          }}
          title="Row operations"
        >
          <Rows className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </button>

        {showRowMenu && (
          <div className="absolute top-full left-0 mt-1 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg min-w-[140px] z-50">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] hover:bg-[var(--surface-hover)]"
              onClick={() => {
                onAddRow('above');
                setShowRowMenu(false);
              }}
            >
              <Plus className="w-4 h-4" />
              Add row above
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] hover:bg-[var(--surface-hover)]"
              onClick={() => {
                onAddRow('below');
                setShowRowMenu(false);
              }}
            >
              <Plus className="w-4 h-4" />
              Add row below
            </button>
            {numRows > 1 && (
              <>
                <div className="border-t border-[var(--border-default)] my-1" />
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] text-red-500 hover:bg-[var(--surface-hover)]"
                  onClick={() => {
                    onDeleteRow();
                    setShowRowMenu(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete row
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Column operations */}
      <div className="relative">
        <button
          type="button"
          className="flex items-center gap-1 px-2 py-1 text-[var(--text-caption)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
          onClick={() => {
            setShowColumnMenu(!showColumnMenu);
            setShowRowMenu(false);
            setShowAlignMenu(false);
          }}
          title="Column operations"
        >
          <Columns className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </button>

        {showColumnMenu && (
          <div className="absolute top-full left-0 mt-1 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg min-w-[150px] z-50">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] hover:bg-[var(--surface-hover)]"
              onClick={() => {
                onAddColumn('left');
                setShowColumnMenu(false);
              }}
            >
              <Plus className="w-4 h-4" />
              Add column left
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] hover:bg-[var(--surface-hover)]"
              onClick={() => {
                onAddColumn('right');
                setShowColumnMenu(false);
              }}
            >
              <Plus className="w-4 h-4" />
              Add column right
            </button>
            {numCols > 1 && (
              <>
                <div className="border-t border-[var(--border-default)] my-1" />
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] text-red-500 hover:bg-[var(--surface-hover)]"
                  onClick={() => {
                    onDeleteColumn();
                    setShowColumnMenu(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete column
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--border-default)] mx-1" />

      {/* Alignment */}
      <div className="relative">
        <button
          type="button"
          className={`
            flex items-center gap-1 px-2 py-1 text-[var(--text-caption)] transition-colors
            ${focusedCol !== null ? 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]' : 'text-[var(--text-tertiary)] cursor-not-allowed'}
          `}
          onClick={() => {
            if (focusedCol !== null) {
              setShowAlignMenu(!showAlignMenu);
              setShowRowMenu(false);
              setShowColumnMenu(false);
            }
          }}
          title="Column alignment"
          disabled={focusedCol === null}
        >
          {currentAlign === 'center' ? (
            <AlignCenter className="w-4 h-4" />
          ) : currentAlign === 'right' ? (
            <AlignRight className="w-4 h-4" />
          ) : (
            <AlignLeft className="w-4 h-4" />
          )}
          <ChevronDown className="w-3 h-3" />
        </button>

        {showAlignMenu && focusedCol !== null && (
          <div className="absolute top-full left-0 mt-1 bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg min-w-[120px] z-50">
            <button
              type="button"
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] hover:bg-[var(--surface-hover)]
                ${currentAlign === null || currentAlign === 'left' ? 'bg-[var(--surface-hover)]' : ''}
              `}
              onClick={() => {
                onSetColumnAlign(focusedCol, 'left');
                setShowAlignMenu(false);
              }}
            >
              <AlignLeft className="w-4 h-4" />
              Align left
            </button>
            <button
              type="button"
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] hover:bg-[var(--surface-hover)]
                ${currentAlign === 'center' ? 'bg-[var(--surface-hover)]' : ''}
              `}
              onClick={() => {
                onSetColumnAlign(focusedCol, 'center');
                setShowAlignMenu(false);
              }}
            >
              <AlignCenter className="w-4 h-4" />
              Align center
            </button>
            <button
              type="button"
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-left text-[var(--text-body-sm)] hover:bg-[var(--surface-hover)]
                ${currentAlign === 'right' ? 'bg-[var(--surface-hover)]' : ''}
              `}
              onClick={() => {
                onSetColumnAlign(focusedCol, 'right');
                setShowAlignMenu(false);
              }}
            >
              <AlignRight className="w-4 h-4" />
              Align right
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-[var(--border-default)] mx-1" />

      {/* Delete table */}
      <button
        type="button"
        className="flex items-center gap-1 px-2 py-1 text-[var(--text-caption)] text-red-500 hover:bg-[var(--surface-hover)] transition-colors"
        onClick={onDeleteTable}
        title="Delete table"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default TableToolbar;
