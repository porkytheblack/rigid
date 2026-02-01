"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
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
} from "lucide-react";
import { BlockType } from "../types";

interface SlashCommand {
  id: string;
  type: BlockType;
  label: string;
  description: string;
  icon: typeof Type;
  keywords: string[];
  category: 'basic' | 'media' | 'advanced';
}

const COMMANDS: SlashCommand[] = [
  // Basic blocks
  { id: 'text', type: 'paragraph', label: 'Text', description: 'Just start writing with plain text', icon: Type, keywords: ['text', 'paragraph', 'plain'], category: 'basic' },
  { id: 'h1', type: 'heading1', label: 'Heading 1', description: 'Large section heading', icon: Heading1, keywords: ['h1', 'heading', 'title', 'large'], category: 'basic' },
  { id: 'h2', type: 'heading2', label: 'Heading 2', description: 'Medium section heading', icon: Heading2, keywords: ['h2', 'heading', 'subtitle'], category: 'basic' },
  { id: 'h3', type: 'heading3', label: 'Heading 3', description: 'Small section heading', icon: Heading3, keywords: ['h3', 'heading', 'small'], category: 'basic' },
  { id: 'bullet', type: 'bulletList', label: 'Bulleted List', description: 'Create a simple bulleted list', icon: List, keywords: ['bullet', 'list', 'unordered', 'ul'], category: 'basic' },
  { id: 'number', type: 'numberedList', label: 'Numbered List', description: 'Create a numbered list', icon: ListOrdered, keywords: ['number', 'list', 'ordered', 'ol'], category: 'basic' },
  { id: 'todo', type: 'todo', label: 'To-do', description: 'Track tasks with a to-do list', icon: CheckSquare, keywords: ['todo', 'task', 'checkbox', 'check'], category: 'basic' },
  { id: 'toggle', type: 'toggle', label: 'Toggle', description: 'Toggles can hide and show content', icon: ChevronRight, keywords: ['toggle', 'collapse', 'expand', 'dropdown'], category: 'basic' },

  // Media blocks
  { id: 'image', type: 'image', label: 'Image', description: 'Upload or embed an image', icon: Image, keywords: ['image', 'img', 'picture', 'photo'], category: 'media' },

  // Advanced blocks
  { id: 'quote', type: 'quote', label: 'Quote', description: 'Capture a quote', icon: Quote, keywords: ['quote', 'blockquote', 'citation'], category: 'advanced' },
  { id: 'callout', type: 'callout', label: 'Callout', description: 'Highlight important information', icon: MessageSquare, keywords: ['callout', 'info', 'warning', 'alert', 'note'], category: 'advanced' },
  { id: 'code', type: 'code', label: 'Code', description: 'Capture a code snippet', icon: Code, keywords: ['code', 'snippet', 'programming'], category: 'advanced' },
  { id: 'mermaid', type: 'mermaid', label: 'Mermaid Diagram', description: 'Create flowcharts, sequence diagrams, and more', icon: GitBranch, keywords: ['mermaid', 'diagram', 'flowchart', 'chart', 'graph', 'sequence'], category: 'advanced' },
  { id: 'divider', type: 'divider', label: 'Divider', description: 'Visually divide blocks', icon: Minus, keywords: ['divider', 'hr', 'line', 'separator'], category: 'advanced' },
];

interface SlashCommandMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  searchQuery: string;
  onSelect: (type: BlockType) => void;
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

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return COMMANDS;

    const query = searchQuery.toLowerCase();
    return COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      cmd.keywords.some(kw => kw.includes(query))
    );
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
    const categoryOrder = ['basic', 'media', 'advanced'];

    categoryOrder.forEach(cat => {
      const commands = filteredCommands.filter(c => c.category === cat);
      if (commands.length > 0) {
        groups.push({
          category: cat === 'basic' ? 'BASIC BLOCKS' : cat === 'media' ? 'MEDIA' : 'ADVANCED',
          commands,
        });
      }
    });

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
            onSelect(flatCommands[selectedIndex].type);
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
  }, [isOpen, flatCommands, selectedIndex, onSelect, onClose]);

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
                onClick={() => onSelect(command.type)}
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
                  <div className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
                    {command.label}
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
