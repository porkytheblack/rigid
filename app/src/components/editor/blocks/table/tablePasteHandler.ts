/**
 * Table Paste Handler
 *
 * Parses and handles paste from various table sources:
 * - HTML tables (Excel, Google Sheets, web pages)
 * - Tab-separated values (TSV) - common from spreadsheets
 * - Comma-separated values (CSV)
 * - Plain text with delimiters
 */

import type { ParsedTableData, TableCellData } from './types';
import { createCell } from './types';

/**
 * Parse clipboard data and extract table data
 */
export function parseClipboardData(clipboardData: DataTransfer): ParsedTableData | null {
  // Try HTML first (Excel, Google Sheets produce HTML tables)
  const html = clipboardData.getData('text/html');
  if (html) {
    const parsed = parseHtmlTable(html);
    if (parsed && parsed.rows.length > 0) {
      return parsed;
    }
  }

  // Fall back to plain text (TSV or CSV)
  const text = clipboardData.getData('text/plain');
  if (text) {
    return parseTextTable(text);
  }

  return null;
}

/**
 * Parse HTML table content from clipboard
 */
export function parseHtmlTable(html: string): ParsedTableData | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find table element
    const table = doc.querySelector('table');
    if (!table) {
      return null;
    }

    const rows: string[][] = [];
    let hasHeader = false;

    // Check for thead
    const thead = table.querySelector('thead');
    if (thead) {
      hasHeader = true;
      const headerRows = thead.querySelectorAll('tr');
      headerRows.forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll('th, td').forEach((cell) => {
          cells.push(getCellTextContent(cell));
        });
        if (cells.length > 0) {
          rows.push(cells);
        }
      });
    }

    // Get tbody rows (or all tr if no tbody)
    const tbody = table.querySelector('tbody') || table;
    const bodyRows = tbody.querySelectorAll(':scope > tr');

    bodyRows.forEach((tr, index) => {
      const cells: string[] = [];
      const cellElements = tr.querySelectorAll('th, td');

      // First row with th elements might be header
      if (index === 0 && !hasHeader) {
        const thCount = tr.querySelectorAll('th').length;
        if (thCount > 0 && thCount === cellElements.length) {
          hasHeader = true;
        }
      }

      cellElements.forEach((cell) => {
        cells.push(getCellTextContent(cell));
      });

      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    if (rows.length === 0) {
      return null;
    }

    return {
      rows,
      format: 'html',
      hasHeader,
    };
  } catch (error) {
    console.warn('Failed to parse HTML table:', error);
    return null;
  }
}

/**
 * Get text content from an HTML cell, handling nested elements
 */
function getCellTextContent(cell: Element): string {
  // Get text content, preserving line breaks from <br>
  let text = '';
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeName === 'BR') {
      text += '\n';
    } else if (node.nodeName === 'P' && text.length > 0) {
      text += '\n';
    }
    node = walker.nextNode();
  }

  return text.trim();
}

/**
 * Parse text-based table (TSV or CSV)
 */
export function parseTextTable(text: string): ParsedTableData | null {
  if (!text.trim()) {
    return null;
  }

  // Detect delimiter - tabs are more common from spreadsheets
  const lines = text.split(/\r?\n/);
  const firstLine = lines[0] || '';

  // Check for tabs first (TSV)
  if (firstLine.includes('\t')) {
    return parseTsv(text);
  }

  // Check for commas (CSV)
  if (firstLine.includes(',')) {
    return parseCsv(text);
  }

  // Check for pipes (Markdown tables)
  if (firstLine.includes('|')) {
    return parseMarkdownTable(text);
  }

  // Single value - not a table
  return null;
}

/**
 * Parse tab-separated values
 */
export function parseTsv(text: string): ParsedTableData {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const rows: string[][] = [];

  for (const line of lines) {
    // Split by tabs
    const cells = line.split('\t').map((cell) => cell.trim());
    rows.push(cells);
  }

  return {
    rows,
    format: 'tsv',
    hasHeader: detectHeaderRow(rows),
  };
}

/**
 * Parse comma-separated values with proper quote handling
 */
export function parseCsv(text: string): ParsedTableData {
  const rows: string[][] = [];
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;

    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else if (char === '"') {
          // End of quoted field
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          // Start of quoted field
          inQuotes = true;
        } else if (char === ',') {
          // End of field
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    // Don't forget the last field
    cells.push(current.trim());
    rows.push(cells);
  }

  return {
    rows,
    format: 'csv',
    hasHeader: detectHeaderRow(rows),
  };
}

/**
 * Parse markdown table format
 */
export function parseMarkdownTable(text: string): ParsedTableData {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '');
  const rows: string[][] = [];
  let hasHeader = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip separator rows (|---|---|)
    if (/^\|?[\s\-:|]+\|?$/.test(line)) {
      // If this is the second line, the first line is a header
      if (i === 1 && rows.length === 1) {
        hasHeader = true;
      }
      continue;
    }

    // Parse cell values
    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell, idx, arr) => {
        // Filter out empty first/last cells from leading/trailing pipes
        if (idx === 0 && cell === '') return false;
        if (idx === arr.length - 1 && cell === '') return false;
        return true;
      });

    if (cells.length > 0) {
      rows.push(cells);
    }
  }

  return {
    rows,
    format: 'unknown', // Treat markdown as unknown since it's already in our format
    hasHeader,
  };
}

/**
 * Simple heuristic to detect if first row is likely a header
 */
function detectHeaderRow(rows: string[][]): boolean {
  if (rows.length < 2) return false;

  const firstRow = rows[0];
  const secondRow = rows[1];

  // Check if first row has different characteristics than second row
  // Headers often:
  // - Are shorter
  // - Don't contain numbers
  // - Are title-cased

  let firstRowNumericCount = 0;
  let secondRowNumericCount = 0;

  for (const cell of firstRow) {
    if (/^\d+(\.\d+)?$/.test(cell.trim())) {
      firstRowNumericCount++;
    }
  }

  for (const cell of secondRow) {
    if (/^\d+(\.\d+)?$/.test(cell.trim())) {
      secondRowNumericCount++;
    }
  }

  // If first row has no numbers but second row has numbers, likely a header
  if (firstRowNumericCount === 0 && secondRowNumericCount > 0) {
    return true;
  }

  return false;
}

/**
 * Convert parsed table data to TableCellData format
 */
export function convertToTableCells(data: ParsedTableData): TableCellData[][] {
  return data.rows.map((row) =>
    row.map((cellText) => createCell(cellText))
  );
}

/**
 * Merge pasted data into existing table at a specific position
 */
export function mergePastedData(
  existingRows: TableCellData[][],
  pastedData: ParsedTableData,
  startRow: number,
  startCol: number
): TableCellData[][] {
  const newRows = [...existingRows.map((row) => [...row])];

  for (let r = 0; r < pastedData.rows.length; r++) {
    const targetRow = startRow + r;

    // Expand rows if needed
    while (newRows.length <= targetRow) {
      const newRow: TableCellData[] = [];
      const colCount = newRows[0]?.length || pastedData.rows[0].length;
      for (let c = 0; c < colCount; c++) {
        newRow.push(createCell(''));
      }
      newRows.push(newRow);
    }

    for (let c = 0; c < pastedData.rows[r].length; c++) {
      const targetCol = startCol + c;

      // Expand columns if needed
      if (targetCol >= (newRows[targetRow]?.length || 0)) {
        // Expand all rows to have the new column count
        const newColCount = targetCol + 1;
        for (const row of newRows) {
          while (row.length < newColCount) {
            row.push(createCell(''));
          }
        }
      }

      // Set the cell content
      newRows[targetRow][targetCol] = createCell(pastedData.rows[r][c]);
    }
  }

  return newRows;
}

/**
 * Check if clipboard data looks like table data
 */
export function looksLikeTableData(clipboardData: DataTransfer): boolean {
  const html = clipboardData.getData('text/html');
  if (html && html.includes('<table')) {
    return true;
  }

  const text = clipboardData.getData('text/plain');
  if (!text) return false;

  // Check for tab characters (TSV)
  if (text.includes('\t')) return true;

  // Check for multiple lines with commas (CSV)
  const lines = text.split(/\r?\n/);
  if (lines.length > 1 && lines[0].includes(',')) return true;

  // Check for markdown table format
  if (text.includes('|') && text.includes('\n')) return true;

  return false;
}
