"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ColumnResizeState } from "./types";

const MIN_COLUMN_WIDTH = 50;
const DEFAULT_COLUMN_WIDTH = 150;

export interface UseColumnResizeOptions {
  /** Number of columns */
  numCols: number;
  /** Current column widths (or undefined for auto) */
  columnWidths?: number[];
  /** Callback when widths change */
  onWidthsChange: (widths: number[]) => void;
  /** Table element ref for measuring */
  tableRef: React.RefObject<HTMLTableElement | null>;
}

export interface UseColumnResizeReturn {
  /** Current column widths (computed if not set) */
  widths: number[];
  /** Current resize state */
  resizeState: ColumnResizeState;
  /** Whether currently resizing */
  isResizing: boolean;
  /** Start resizing a column */
  startResize: (columnIndex: number, event: React.MouseEvent) => void;
  /** Handle for resize position */
  getResizeHandleProps: (columnIndex: number) => {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
}

export function useColumnResize({
  numCols,
  columnWidths,
  onWidthsChange,
  tableRef,
}: UseColumnResizeOptions): UseColumnResizeReturn {
  const [resizeState, setResizeState] = useState<ColumnResizeState>({
    columnIndex: null,
    initialWidth: 0,
    startX: 0,
    isResizing: false,
  });

  const localWidthsRef = useRef<number[]>([]);

  // Compute current widths
  const widths = columnWidths && columnWidths.length === numCols
    ? columnWidths
    : Array(numCols).fill(DEFAULT_COLUMN_WIDTH);

  // Store widths in ref for use in event handlers
  localWidthsRef.current = widths;

  const startResize = useCallback(
    (columnIndex: number, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      // Get current column width
      let currentWidth = widths[columnIndex] || DEFAULT_COLUMN_WIDTH;

      // If widths are not set, measure from the table
      if (!columnWidths && tableRef.current) {
        const cells = tableRef.current.querySelectorAll(`th:nth-child(${columnIndex + 1}), td:nth-child(${columnIndex + 1})`);
        if (cells.length > 0) {
          currentWidth = cells[0].getBoundingClientRect().width;
        }
      }

      setResizeState({
        columnIndex,
        initialWidth: currentWidth,
        startX: event.clientX,
        isResizing: true,
      });
    },
    [widths, columnWidths, tableRef]
  );

  // Handle mouse move during resize
  useEffect(() => {
    if (!resizeState.isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizeState.columnIndex === null) return;

      const deltaX = e.clientX - resizeState.startX;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, resizeState.initialWidth + deltaX);

      // Update widths
      const newWidths = [...localWidthsRef.current];
      newWidths[resizeState.columnIndex] = newWidth;

      // Initialize widths from table if not already set
      if (!columnWidths && tableRef.current) {
        const headerCells = tableRef.current.querySelectorAll('th');
        headerCells.forEach((cell, index) => {
          if (index !== resizeState.columnIndex) {
            newWidths[index] = cell.getBoundingClientRect().width;
          }
        });
      }

      onWidthsChange(newWidths);
    };

    const handleMouseUp = () => {
      setResizeState((prev) => ({
        ...prev,
        isResizing: false,
        columnIndex: null,
      }));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Add cursor style to body during resize
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizeState.isResizing, resizeState.columnIndex, resizeState.startX, resizeState.initialWidth, columnWidths, onWidthsChange, tableRef]);

  const getResizeHandleProps = useCallback(
    (columnIndex: number) => {
      return {
        onMouseDown: (e: React.MouseEvent) => startResize(columnIndex, e),
        style: {
          cursor: 'col-resize' as const,
        },
      };
    },
    [startResize]
  );

  return {
    widths,
    resizeState,
    isResizing: resizeState.isResizing,
    startResize,
    getResizeHandleProps,
  };
}

export default useColumnResize;
