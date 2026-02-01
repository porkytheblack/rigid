"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, X, FileText } from "lucide-react";
import { nodeTypeConfig, nodeTypeNames } from "@/components/diagrams";

interface Command {
  id: string;
  category: "graph" | "doc";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color?: string;
  action: string;
  nodeType?: string;
}

// Build commands - graph node types and architecture doc
const COMMANDS: Command[] = [
  // Architecture doc
  {
    id: "new-architecture-doc",
    category: "doc",
    label: "Architecture Doc",
    description: "Create a new architecture document",
    icon: FileText,
    color: "#6366f1",
    action: "create-architecture-doc",
  },
  // Graph types based on node types
  ...nodeTypeNames.map((typeName) => {
    const config = nodeTypeConfig[typeName];
    return {
      id: `graph-${typeName}`,
      category: "graph" as const,
      label: `${config.label} Graph`,
      description: `Create a graph starting with a ${config.label.toLowerCase()} node`,
      icon: config.icon,
      color: config.color,
      action: "create-graph",
      nodeType: typeName,
    };
  }),
];

interface ExplorationCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGraph: (name: string, nodeType: string) => void;
  onCreateArchitectureDoc: (name: string) => void;
}

export function ExplorationCommandPalette({
  isOpen,
  onClose,
  onCreateGraph,
  onCreateArchitectureDoc,
}: ExplorationCommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [customName, setCustomName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!searchQuery) return COMMANDS;

    const query = searchQuery.toLowerCase();
    return COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group by category
  const groupedCommands = useMemo(() => {
    const docs = filteredCommands.filter((c) => c.category === "doc");
    const graphs = filteredCommands.filter((c) => c.category === "graph");
    return { docs, graphs };
  }, [filteredCommands]);

  // Flat list for keyboard navigation
  const flatCommands = useMemo(
    () => [...groupedCommands.docs, ...groupedCommands.graphs],
    [groupedCommands]
  );

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
      setCustomName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatCommands.length]);

  // Scroll selected item into view
  useEffect(() => {
    const item = itemRefs.current[selectedIndex];
    if (item) {
      item.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
  }, [selectedIndex]);

  // Execute selected command
  const executeCommand = useCallback(
    (command: Command) => {
      const name = customName.trim() || command.label;

      if (command.action === "create-architecture-doc") {
        onCreateArchitectureDoc(name);
      } else if (command.action === "create-graph" && command.nodeType) {
        onCreateGraph(name, command.nodeType);
      }
      onClose();
    },
    [customName, onCreateGraph, onCreateArchitectureDoc, onClose]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [flatCommands, selectedIndex, executeCommand, onClose]
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

  const selectedCommand = flatCommands[selectedIndex];

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
            placeholder="Search for graphs, docs..."
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

        {/* Custom Name Input */}
        {selectedCommand && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Name:</span>
            <input
              ref={nameInputRef}
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={selectedCommand.label}
              className="flex-1 bg-transparent text-[var(--text-body-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
            />
          </div>
        )}

        {/* Results List */}
        <div ref={listRef} className="max-h-[360px] overflow-auto">
          {flatCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                No matching items
              </p>
            </div>
          ) : (
            <div className="py-2">
              {/* Documents Section */}
              {groupedCommands.docs.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide">
                    Documents
                  </div>
                  {groupedCommands.docs.map((command) => {
                    const index = flatCommands.indexOf(command);
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
                        onClick={() => executeCommand(command)}
                        onMouseMove={() => {
                          if (selectedIndex !== index) {
                            setSelectedIndex(index);
                          }
                        }}
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center border"
                          style={{
                            backgroundColor: command.color ? `${command.color}15` : undefined,
                            borderColor: command.color ? `${command.color}40` : "var(--border-default)",
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
                </>
              )}

              {/* Graphs Section */}
              {groupedCommands.graphs.length > 0 && (
                <>
                  <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wide mt-2">
                    Graphs
                  </div>
                  {groupedCommands.graphs.map((command) => {
                    const index = flatCommands.indexOf(command);
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
                        onClick={() => executeCommand(command)}
                        onMouseMove={() => {
                          if (selectedIndex !== index) {
                            setSelectedIndex(index);
                          }
                        }}
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center border"
                          style={{
                            backgroundColor: command.color ? `${command.color}15` : undefined,
                            borderColor: command.color ? `${command.color}40` : "var(--border-default)",
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
                </>
              )}
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
              Create
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
export function useExplorationCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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
