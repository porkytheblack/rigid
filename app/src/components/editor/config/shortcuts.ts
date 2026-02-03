/**
 * Keyboard shortcuts configuration for the block editor.
 *
 * Provides a centralized configuration for all keyboard shortcuts
 * with platform-aware modifier key handling.
 */

import type { MarkType } from "../types";

/**
 * Get the platform-specific modifier key name.
 */
export function getModifierKey(): "Cmd" | "Ctrl" {
  if (typeof navigator === "undefined") return "Ctrl";
  return navigator.platform.includes("Mac") ? "Cmd" : "Ctrl";
}

/**
 * Get the platform-specific modifier key symbol.
 */
export function getModifierSymbol(): string {
  return getModifierKey() === "Cmd" ? "\u2318" : "Ctrl+";
}

/**
 * Shortcut definition.
 */
export interface ShortcutDef {
  /** The key combination (using Mod for platform-agnostic modifier) */
  key: string;
  /** Display label for the shortcut */
  label: string;
  /** The mark type this shortcut applies */
  markType?: MarkType;
  /** The TipTap command name */
  command: string;
  /** Whether this shortcut requires Shift */
  shift?: boolean;
  /** Description of what the shortcut does */
  description: string;
}

/**
 * All formatting keyboard shortcuts.
 */
export const FORMATTING_SHORTCUTS: ShortcutDef[] = [
  {
    key: "b",
    label: "Mod+B",
    markType: "bold",
    command: "toggleBold",
    description: "Toggle bold formatting",
  },
  {
    key: "i",
    label: "Mod+I",
    markType: "italic",
    command: "toggleItalic",
    description: "Toggle italic formatting",
  },
  {
    key: "u",
    label: "Mod+U",
    markType: "underline",
    command: "toggleUnderline",
    description: "Toggle underline formatting",
  },
  {
    key: "e",
    label: "Mod+E",
    markType: "code",
    command: "toggleCode",
    description: "Toggle inline code formatting",
  },
  {
    key: "`",
    label: "Mod+`",
    markType: "code",
    command: "toggleCode",
    description: "Toggle inline code formatting (alternative)",
  },
  {
    key: "s",
    label: "Mod+Shift+S",
    markType: "strikethrough",
    command: "toggleStrike",
    shift: true,
    description: "Toggle strikethrough formatting",
  },
  {
    key: "h",
    label: "Mod+Shift+H",
    markType: "highlight",
    command: "toggleHighlight",
    shift: true,
    description: "Toggle highlight formatting",
  },
  {
    key: "k",
    label: "Mod+K",
    markType: "link",
    command: "openLinkDialog",
    description: "Insert or edit link",
  },
  {
    key: ",",
    label: "Mod+,",
    markType: "subscript",
    command: "toggleSubscript",
    description: "Toggle subscript formatting",
  },
  {
    key: ".",
    label: "Mod+.",
    markType: "superscript",
    command: "toggleSuperscript",
    description: "Toggle superscript formatting",
  },
  {
    key: "m",
    label: "Mod+Shift+M",
    command: "toggleInlineMath",
    shift: true,
    description: "Toggle inline math formatting",
  },
];

/**
 * Get the display string for a shortcut.
 */
export function formatShortcut(shortcut: ShortcutDef): string {
  const mod = getModifierSymbol();
  const shift = shortcut.shift ? "Shift+" : "";
  const key = shortcut.key.toUpperCase();
  return `${mod}${shift}${key}`;
}

/**
 * Find a shortcut by mark type.
 */
export function findShortcutByMarkType(markType: MarkType): ShortcutDef | undefined {
  return FORMATTING_SHORTCUTS.find((s) => s.markType === markType);
}

/**
 * Find a shortcut by command name.
 */
export function findShortcutByCommand(command: string): ShortcutDef | undefined {
  return FORMATTING_SHORTCUTS.find((s) => s.command === command);
}

/**
 * Check if a keyboard event matches a shortcut.
 */
export function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutDef): boolean {
  const modKey = event.metaKey || event.ctrlKey;
  const shiftKey = event.shiftKey;

  if (!modKey) return false;
  if (shortcut.shift && !shiftKey) return false;
  if (!shortcut.shift && shiftKey) return false;

  return event.key.toLowerCase() === shortcut.key.toLowerCase();
}

/**
 * Block-level shortcuts (not formatting).
 */
export const BLOCK_SHORTCUTS = {
  // Navigation
  focusPrevious: { key: "ArrowUp", description: "Focus previous block (at start of content)" },
  focusNext: { key: "ArrowDown", description: "Focus next block (at end of content)" },

  // Block operations
  insertAfter: { key: "Enter", description: "Insert new block after" },
  deleteBlock: { key: "Backspace", description: "Delete block (when empty)" },
  turnIntoParagraph: { key: "Backspace", description: "Turn into paragraph (at start of non-empty block)" },

  // Indentation
  indent: { key: "Tab", description: "Indent block" },
  outdent: { key: "Tab", shift: true, description: "Outdent block" },

  // Block movement
  moveUp: { key: "ArrowUp", mod: true, shift: true, description: "Move block up" },
  moveDown: { key: "ArrowDown", mod: true, shift: true, description: "Move block down" },

  // Commands
  openSlashMenu: { key: "/", description: "Open slash command menu" },
} as const;

/**
 * Editor-level shortcuts.
 */
export const EDITOR_SHORTCUTS = {
  undo: { key: "z", mod: true, description: "Undo" },
  redo: { key: "z", mod: true, shift: true, description: "Redo" },
  redoAlt: { key: "y", mod: true, description: "Redo (alternative)" },
  duplicate: { key: "d", mod: true, description: "Duplicate block" },
  deleteSelected: { key: "Backspace", description: "Delete selected blocks" },
  cutSelected: { key: "x", mod: true, description: "Cut selected blocks" },
  escape: { key: "Escape", description: "Clear selection or close menu" },
} as const;
