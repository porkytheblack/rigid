"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, X } from "lucide-react";
import { nodeTypeConfig, nodeTypeNames } from "./nodes";

interface NodeCommand {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  keywords: string[];
}

// Build commands from node type config
const COMMANDS: NodeCommand[] = nodeTypeNames.map((typeName) => {
  const config = nodeTypeConfig[typeName];
  return {
    id: typeName,
    label: config.label,
    description: `Add a ${config.label.toLowerCase()} node`,
    icon: config.icon,
    color: config.color,
    keywords: [typeName, config.label.toLowerCase()],
  };
});

interface NodeCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nodeType: string, label: string) => void;
}

export function NodeCommandPalette({
  isOpen,
  onClose,
  onSelect,
}: NodeCommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customLabel, setCustomLabel] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return COMMANDS;

    const query = searchQuery.toLowerCase();
    return COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.keywords.some((kw) => kw.includes(query))
    );
  }, [searchQuery]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      setCustomLabel("");
      // Focus input after a short delay to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Scroll selected item into view
  useEffect(() => {
    const item = itemRefs.current[selectedIndex];
    if (item) {
      item.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            const cmd = filteredCommands[selectedIndex];
            const label = customLabel.trim() || cmd.label;
            onSelect(cmd.id, label);
            onClose();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "Tab":
          // Tab to switch between search and label input
          if (!e.shiftKey && document.activeElement === inputRef.current) {
            e.preventDefault();
            // Focus would go to label input if we had one visible
          }
          break;
      }
    },
    [filteredCommands, selectedIndex, customLabel, onSelect, onClose]
  );

  // Global escape handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedCommand = filteredCommands[selectedIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[520px] bg-[var(--surface-primary)] border border-[var(--border-default)] shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)]">
          <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search node types... (or type a custom label)"
            className="flex-1 bg-transparent text-[var(--text-body)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            autoComplete="off"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Custom Label Input (when a type is selected) */}
        {selectedCommand && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Label:</span>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder={selectedCommand.label}
              className="flex-1 bg-transparent text-[var(--text-body-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="max-h-[320px] overflow-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                No matching node types
              </p>
              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">
                Press Enter to create a &quot;{searchQuery}&quot; node
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => {
                const Icon = command.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={command.id}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? "bg-[var(--surface-hover)]" : ""
                    } hover:bg-[var(--surface-hover)]`}
                    onClick={() => {
                      const label = customLabel.trim() || command.label;
                      onSelect(command.id, label);
                      onClose();
                    }}
                    onMouseMove={() => {
                      if (selectedIndex !== index) {
                        setSelectedIndex(index);
                      }
                    }}
                  >
                    <div
                      className="w-9 h-9 flex items-center justify-center border"
                      style={{
                        backgroundColor: `${command.color}15`,
                        borderColor: `${command.color}40`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: command.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
                        {command.label}
                      </div>
                      <div className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                        {command.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                        ↵
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-[var(--border-default)] bg-[var(--surface-secondary)]">
          <div className="flex items-center justify-between text-[var(--text-caption)] text-[var(--text-tertiary)]">
            <span>
              <kbd className="px-1.5 py-0.5 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[10px]">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[10px]">
                Enter
              </kbd>{" "}
              Add node
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[10px]">
                Esc
              </kbd>{" "}
              Close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to handle keyboard shortcut for opening the palette
export function useNodeCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      // Also support just 'n' when not focused on an input
      if (
        e.key === "n" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA" &&
        !document.activeElement?.hasAttribute("contenteditable")
      ) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { isOpen, open, close };
}
