"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListOrdered,
  CheckSquare,
  ChevronRight,
  Quote,
  Code,
  Image,
  Minus,
  MessageSquare,
  GitBranch,
  Table as TableIcon,
  Calculator,
  AlertTriangle,
  Lightbulb,
  AlertCircle,
  Info,
  FileText,
} from "lucide-react";
import { BlockType } from "../types";

interface SlashCommand {
  id: string;
  type: BlockType;
  label: string;
  description: string;
  icon: typeof Type;
  keywords: string[];
  category: 'basic' | 'media' | 'advanced' | 'containers';
  shortcut?: string;
}

/**
 * Fuzzy search scoring function
 * Returns a score from 0-1 where higher is better match
 * Returns -1 if no match
 */
function fuzzyMatch(query: string, target: string): number {
  query = query.toLowerCase();
  target = target.toLowerCase();

  // Exact match gets highest score
  if (target === query) return 1;

  // Starts with query gets high score
  if (target.startsWith(query)) return 0.9;

  // Contains query as substring
  if (target.includes(query)) return 0.7;

  // Fuzzy character matching
  let queryIndex = 0;
  let score = 0;
  let lastMatchIndex = -1;
  let consecutiveBonus = 0;

  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      // Bonus for consecutive matches
      if (lastMatchIndex === i - 1) {
        consecutiveBonus += 0.1;
      }
      // Bonus for matching at word boundary
      if (i === 0 || target[i - 1] === ' ' || target[i - 1] === '-' || target[i - 1] === '_') {
        score += 0.15;
      }
      score += 0.1;
      lastMatchIndex = i;
      queryIndex++;
    }
  }

  // All query characters must be found
  if (queryIndex < query.length) return -1;

  // Normalize score and add consecutive bonus
  return Math.min(0.6, (score + consecutiveBonus) / query.length);
}

/**
 * Score a command against a search query
 * Checks label, id, and keywords
 */
function scoreCommand(command: SlashCommand, query: string): number {
  if (!query) return 0;

  // Check label
  const labelScore = fuzzyMatch(query, command.label);
  if (labelScore > 0) return labelScore;

  // Check id
  const idScore = fuzzyMatch(query, command.id);
  if (idScore > 0) return idScore * 0.95;

  // Check keywords
  let bestKeywordScore = -1;
  for (const keyword of command.keywords) {
    const keywordScore = fuzzyMatch(query, keyword);
    if (keywordScore > bestKeywordScore) {
      bestKeywordScore = keywordScore;
    }
  }

  return bestKeywordScore > 0 ? bestKeywordScore * 0.9 : -1;
}

const COMMANDS: SlashCommand[] = [
  // Basic blocks
  { id: 'paragraph', type: 'paragraph', label: 'Text', description: 'Just start writing with plain text', icon: Type, keywords: ['text', 'paragraph', 'plain', 'p'], category: 'basic' },
  { id: 'heading1', type: 'heading1', label: 'Heading 1', description: 'Large section heading', icon: Heading1, keywords: ['h1', 'heading', 'title', 'large', 'heading1'], shortcut: 'Ctrl+1', category: 'basic' },
  { id: 'heading2', type: 'heading2', label: 'Heading 2', description: 'Medium section heading', icon: Heading2, keywords: ['h2', 'heading', 'subtitle', 'heading2'], shortcut: 'Ctrl+2', category: 'basic' },
  { id: 'heading3', type: 'heading3', label: 'Heading 3', description: 'Small section heading', icon: Heading3, keywords: ['h3', 'heading', 'small', 'heading3'], shortcut: 'Ctrl+3', category: 'basic' },
  { id: 'heading4', type: 'heading4', label: 'Heading 4', description: 'Fourth level heading', icon: Heading4, keywords: ['h4', 'heading', 'heading4'], category: 'basic' },
  { id: 'heading5', type: 'heading5', label: 'Heading 5', description: 'Fifth level heading', icon: Heading5, keywords: ['h5', 'heading', 'heading5'], category: 'basic' },
  { id: 'heading6', type: 'heading6', label: 'Heading 6', description: 'Sixth level heading', icon: Heading6, keywords: ['h6', 'heading', 'heading6'], category: 'basic' },
  { id: 'bullet', type: 'bulletList', label: 'Bulleted List', description: 'Create a simple bulleted list', icon: List, keywords: ['bullet', 'list', 'unordered', 'ul', 'bulletlist'], shortcut: 'Ctrl+Shift+8', category: 'basic' },
  { id: 'numbered', type: 'numberedList', label: 'Numbered List', description: 'Create a numbered list', icon: ListOrdered, keywords: ['numbered', 'number', 'list', 'ordered', 'ol', 'numberedlist'], shortcut: 'Ctrl+Shift+7', category: 'basic' },
  { id: 'todo', type: 'todo', label: 'To-do List', description: 'Track tasks with a to-do list', icon: CheckSquare, keywords: ['todo', 'task', 'checkbox', 'check', 'tasklist'], shortcut: 'Ctrl+Shift+9', category: 'basic' },
  { id: 'toggle', type: 'toggle', label: 'Toggle', description: 'Toggles can hide and show content', icon: ChevronRight, keywords: ['toggle', 'collapse', 'expand', 'dropdown', 'collapsible', 'accordion'], category: 'basic' },
  { id: 'quote', type: 'quote', label: 'Quote', description: 'Capture a quote', icon: Quote, keywords: ['quote', 'blockquote', 'citation', 'quotation'], category: 'basic' },

  // Media blocks
  { id: 'image', type: 'image', label: 'Image', description: 'Upload or embed an image', icon: Image, keywords: ['image', 'img', 'picture', 'photo', 'media'], category: 'media' },
  { id: 'table', type: 'table', label: 'Table', description: 'Add a table with rows and columns', icon: TableIcon, keywords: ['table', 'grid', 'spreadsheet', 'data', 'cells'], category: 'media' },

  // Advanced blocks
  { id: 'code', type: 'code', label: 'Code Block', description: 'Capture a code snippet with syntax highlighting', icon: Code, keywords: ['code', 'snippet', 'programming', 'codeblock', 'syntax'], category: 'advanced' },
  { id: 'math', type: 'mathBlock', label: 'Math Block', description: 'Write mathematical expressions with LaTeX', icon: Calculator, keywords: ['math', 'latex', 'equation', 'formula', 'katex', 'mathematics'], category: 'advanced' },
  { id: 'mermaid', type: 'mermaid', label: 'Mermaid Diagram', description: 'Create flowcharts, sequence diagrams, and more', icon: GitBranch, keywords: ['mermaid', 'diagram', 'flowchart', 'chart', 'graph', 'sequence', 'uml'], category: 'advanced' },
  { id: 'divider', type: 'divider', label: 'Divider', description: 'Visually divide blocks', icon: Minus, keywords: ['divider', 'hr', 'line', 'separator', 'horizontal', 'rule'], category: 'advanced' },
  { id: 'footnote', type: 'footnoteDefinition', label: 'Footnote', description: 'Add a footnote definition', icon: FileText, keywords: ['footnote', 'reference', 'note', 'citation', 'footnotedef'], category: 'advanced' },

  // Container blocks
  { id: 'callout', type: 'callout', label: 'Callout', description: 'Highlight important information', icon: MessageSquare, keywords: ['callout', 'info', 'alert', 'admonition'], category: 'containers' },
  { id: 'container-note', type: 'container', label: 'Note', description: 'Add a note container', icon: Info, keywords: ['note', 'container', 'box', 'info'], category: 'containers' },
  { id: 'container-tip', type: 'container', label: 'Tip', description: 'Add a tip container', icon: Lightbulb, keywords: ['tip', 'container', 'hint', 'suggestion', 'advice'], category: 'containers' },
  { id: 'container-warning', type: 'container', label: 'Warning', description: 'Add a warning container', icon: AlertTriangle, keywords: ['warning', 'container', 'caution', 'alert'], category: 'containers' },
  { id: 'container-danger', type: 'container', label: 'Danger', description: 'Add a danger container', icon: AlertCircle, keywords: ['danger', 'container', 'error', 'critical', 'important'], category: 'containers' },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  searchQuery: string;
  onSelect: (type: BlockType, extraMeta?: Record<string, unknown>) => void;
  onClose: () => void;
}

export function SlashCommandMenu({
  isOpen,
  position,
  searchQuery,
  onSelect,
  onClose,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!isOpen) return;

    const menuHeight = 400; // max-h-[400px]
    const menuWidth = 320; // w-[320px]
    const padding = 8;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let newY = position.y;
    let newX = position.x;

    // Check if menu would overflow bottom
    if (position.y + menuHeight + padding > viewportHeight) {
      // Position above the cursor instead (subtract line height ~24px)
      newY = Math.max(padding, position.y - menuHeight - 28);
    }

    // Check if menu would overflow right
    if (position.x + menuWidth + padding > viewportWidth) {
      newX = Math.max(padding, viewportWidth - menuWidth - padding);
    }

    // Check if menu would overflow left
    if (position.x < padding) {
      newX = padding;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [isOpen, position]);

  // Filter and sort commands based on fuzzy search
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return COMMANDS;

    // Score all commands and filter out non-matches
    const scored = COMMANDS
      .map(cmd => ({ cmd, score: scoreCommand(cmd, searchQuery) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(({ cmd }) => cmd);
  }, [searchQuery]);

  // Group by category - skip grouping if searching
  const groupedCommands = useMemo(() => {
    if (searchQuery) {
      // When searching, show flat list without categories
      return filteredCommands.length > 0
        ? [{ category: '', commands: filteredCommands }]
        : [];
    }

    const groups: { category: string; commands: SlashCommand[] }[] = [];
    const categoryOrder = ['basic', 'media', 'advanced', 'containers'];
    const categoryLabels: Record<string, string> = {
      basic: 'BASIC BLOCKS',
      media: 'MEDIA',
      advanced: 'ADVANCED',
      containers: 'CONTAINERS',
    };

    for (const cat of categoryOrder) {
      const commands = filteredCommands.filter(c => c.category === cat);
      if (commands.length > 0) {
        groups.push({
          category: categoryLabels[cat],
          commands,
        });
      }
    }

    return groups;
  }, [filteredCommands, searchQuery]);

  // Flat list for keyboard navigation
  const flatCommands = useMemo(() =>
    groupedCommands.flatMap(g => g.commands),
    [groupedCommands]
  );

  // Reset refs array when commands change
  useEffect(() => {
    itemRefs.current = [];
  }, [flatCommands.length]);

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatCommands.length]);

  // Scroll selected item into view (only from keyboard navigation)
  useEffect(() => {
    const item = itemRefs.current[selectedIndex];
    if (item && !isScrolling) {
      item.scrollIntoView({
        block: 'nearest',
        behavior: 'auto',
      });
    }
  }, [selectedIndex, isScrolling]);

  // Track scroll state to prevent mouseEnter conflicts
  const handleScroll = () => {
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 100);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % flatCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + flatCommands.length) % flatCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            handleSelect(flatCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatCommands, selectedIndex, onClose]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSelect = (command: SlashCommand) => {
    // For container commands, add the container type to meta
    if (command.id.startsWith('container-')) {
      const containerType = command.id.replace('container-', '');
      onSelect(command.type, { containerType });
    } else {
      onSelect(command.type);
    }
  };

  if (!isOpen) return null;

  // Show empty state
  if (flatCommands.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 w-[320px] bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg"
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y,
        }}
      >
        <div className="px-4 py-8 text-center">
          <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
            No results for &quot;{searchQuery}&quot;
          </p>
        </div>
      </div>
    );
  }

  let itemIndex = 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-[320px] max-h-[400px] overflow-auto bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      onScroll={handleScroll}
    >
      {/* Search indicator */}
      {searchQuery && (
        <div className="px-3 py-2 border-b border-[var(--border-default)] text-[var(--text-body-sm)] text-[var(--text-secondary)]">
          Searching: <span className="font-medium text-[var(--text-primary)]">{searchQuery}</span>
        </div>
      )}

      {groupedCommands.map((group) => (
        <div key={group.category || 'search-results'}>
          {/* Category header - only show if not searching */}
          {group.category && (
            <div className="px-3 py-2 text-[var(--text-caption)] text-[var(--text-tertiary)] font-medium uppercase tracking-wide">
              {group.category}
            </div>
          )}

          {/* Commands */}
          {group.commands.map((command) => {
            const currentIndex = itemIndex++;
            const Icon = command.icon;
            const isSelected = currentIndex === selectedIndex;

            return (
              <button
                key={command.id}
                ref={el => { itemRefs.current[currentIndex] = el; }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 text-left
                  ${isSelected ? 'bg-[var(--surface-hover)]' : ''}
                  hover:bg-[var(--surface-hover)]
                `}
                onClick={() => handleSelect(command)}
                onMouseMove={() => {
                  // Only update selection on mouse move, not scroll
                  if (!isScrolling && selectedIndex !== currentIndex) {
                    setSelectedIndex(currentIndex);
                  }
                }}
              >
                <div className="w-10 h-10 flex items-center justify-center bg-[var(--surface-secondary)] border border-[var(--border-default)]">
                  <Icon className="w-5 h-5 text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
                      {command.label}
                    </span>
                    {command.shortcut && (
                      <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] ml-2 flex-shrink-0">
                        {command.shortcut.replace('Ctrl', navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl')}
                      </span>
                    )}
                  </div>
                  <div className="text-[var(--text-caption)] text-[var(--text-tertiary)] truncate">
                    {command.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
