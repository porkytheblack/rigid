/**
 * InlineMath TipTap Extension
 *
 * Provides inline math rendering using KaTeX within TipTap editor.
 * Supports $...$ syntax for inline math expressions.
 *
 * Uses a Node-based approach with ReactNodeViewRenderer for proper KaTeX rendering.
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { inputRules, InputRule } from "@tiptap/pm/inputrules";
import katex from "katex";
import React, { useEffect, useRef, useState, useCallback } from "react";

// Extension options
export interface InlineMathOptions {
  HTMLAttributes: Record<string, unknown>;
}

// Node attributes
export interface InlineMathAttributes {
  latex: string;
}

// Declare commands for TypeScript
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineMath: {
      /**
       * Insert inline math at current position
       */
      insertInlineMath: (latex: string) => ReturnType;
    };
  }
}

// React component for rendering inline math - uses NodeViewProps
function InlineMathView(props: NodeViewProps) {
  const { node, updateAttributes, selected, editor } = props;
  const latex = (node.attrs.latex as string) || "";
  const containerRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempLatex, setTempLatex] = useState(latex);

  // Render the math expression
  useEffect(() => {
    if (!containerRef.current || isEditing) return;

    if (!latex || !latex.trim()) {
      containerRef.current.innerHTML =
        '<span class="text-[var(--text-tertiary)] italic text-sm">math</span>';
      setError(null);
      return;
    }

    try {
      katex.render(latex, containerRef.current, {
        displayMode: false,
        throwOnError: true,
        errorColor: "#ff4444",
        trust: false,
        strict: "warn",
        output: "htmlAndMathml",
        macros: {
          "\\R": "\\mathbb{R}",
          "\\N": "\\mathbb{N}",
          "\\Z": "\\mathbb{Z}",
          "\\Q": "\\mathbb{Q}",
          "\\C": "\\mathbb{C}",
        },
      });
      setError(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Invalid LaTeX";
      setError(errorMessage);
      containerRef.current.innerHTML = `<span class="text-red-500 text-sm" title="${errorMessage}">$${latex}$</span>`;
    }
  }, [latex, isEditing]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync tempLatex when node attrs change
  useEffect(() => {
    setTempLatex(latex);
  }, [latex]);

  const handleDoubleClick = useCallback(() => {
    if (editor.isEditable) {
      setIsEditing(true);
      setTempLatex(latex);
    }
  }, [editor.isEditable, latex]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: tempLatex });
    setIsEditing(false);
  }, [tempLatex, updateAttributes]);

  const handleCancel = useCallback(() => {
    setTempLatex(latex);
    setIsEditing(false);
  }, [latex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  const handleBlur = useCallback(() => {
    // Small delay to allow clicking away properly
    setTimeout(() => {
      handleSave();
    }, 100);
  }, [handleSave]);

  if (isEditing) {
    return React.createElement(
      NodeViewWrapper,
      {
        as: "span",
        className: "inline",
      },
      React.createElement("input", {
        ref: inputRef,
        type: "text",
        value: tempLatex,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          setTempLatex(e.target.value),
        onKeyDown: handleKeyDown,
        onBlur: handleBlur,
        className:
          "inline-block px-1 py-0.5 text-sm font-mono bg-[var(--surface-secondary)] border border-[var(--border-focus)] outline-none min-w-[60px]",
        placeholder: "LaTeX...",
        style: { width: `${Math.max(60, (tempLatex?.length || 0) * 8)}px` },
      })
    );
  }

  return React.createElement(
    NodeViewWrapper,
    {
      as: "span",
      className: "inline",
    },
    React.createElement("span", {
      ref: containerRef,
      onDoubleClick: handleDoubleClick,
      className: `inline-math ${
        selected ? "ring-2 ring-[var(--accent-interactive)]" : ""
      } ${
        error
          ? "bg-red-100 dark:bg-red-900/30"
          : "bg-[var(--surface-secondary)]"
      } px-1 py-0.5 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors`,
      title: error || "Double-click to edit",
    })
  );
}

// Create the TipTap extension
export const InlineMath = Node.create<InlineMathOptions>({
  name: "inlineMath",

  group: "inline",

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-latex") ||
          // Try to extract from annotation if KaTeX HTML
          element.querySelector('annotation[encoding="application/x-tex"]')
            ?.textContent ||
          // Fallback to text content
          element.textContent?.replace(/^\$|\$$/g, "") ||
          "",
        renderHTML: (attributes) => ({
          "data-latex": attributes.latex,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-math"]',
      },
      {
        tag: "span.inline-math",
      },
      {
        tag: "span.katex",
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "inline-math",
        "data-latex": node.attrs.latex,
        class: "inline-math",
      }),
      `$${node.attrs.latex}$`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineMathView);
  },

  addProseMirrorPlugins() {
    const extensionThis = this;
    return [
      // Input rule for $...$ syntax
      inputRules({
        rules: [
          new InputRule(/\$([^$\n]+)\$$/, (state, match, start, end) => {
            const latex = match[1];
            if (!latex || !latex.trim()) return null;

            const { tr } = state;
            tr.replaceWith(start, end, extensionThis.type.create({ latex: latex.trim() }));

            return tr;
          }),
        ],
      }),
      // Keymap for deletion
      new Plugin({
        key: new PluginKey("inlineMathKeymap"),
        props: {
          handleKeyDown: (view, event) => {
            // Handle deletion of inline math node with backspace/delete
            const { selection } = view.state;
            const { $from } = selection;

            if (event.key === "Backspace" && selection.empty) {
              const nodeBefore = $from.nodeBefore;
              if (nodeBefore?.type.name === extensionThis.name) {
                const pos = $from.pos - nodeBefore.nodeSize;
                const tr = view.state.tr.delete(pos, $from.pos);
                view.dispatch(tr);
                return true;
              }
            }

            if (event.key === "Delete" && selection.empty) {
              const nodeAfter = $from.nodeAfter;
              if (nodeAfter?.type.name === extensionThis.name) {
                const tr = view.state.tr.delete(
                  $from.pos,
                  $from.pos + nodeAfter.nodeSize
                );
                view.dispatch(tr);
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      insertInlineMath:
        (latex: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Cmd/Ctrl + Shift + M to insert inline math placeholder
      "Mod-Shift-m": () => {
        this.editor.commands.insertInlineMath("x");
        return true;
      },
    };
  },
});

export default InlineMath;
