"use client";

import { useRef, useEffect, useCallback, useState, KeyboardEvent } from "react";
import katex from "katex";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Block, BlockType, LegacyBlockMeta, getBlockText } from "../types";

// Math symbols organized by category
const MATH_SYMBOLS = {
  greek: {
    label: "Greek Letters",
    symbols: [
      { latex: "\\alpha", display: "\u03B1", name: "alpha" },
      { latex: "\\beta", display: "\u03B2", name: "beta" },
      { latex: "\\gamma", display: "\u03B3", name: "gamma" },
      { latex: "\\delta", display: "\u03B4", name: "delta" },
      { latex: "\\epsilon", display: "\u03B5", name: "epsilon" },
      { latex: "\\zeta", display: "\u03B6", name: "zeta" },
      { latex: "\\eta", display: "\u03B7", name: "eta" },
      { latex: "\\theta", display: "\u03B8", name: "theta" },
      { latex: "\\iota", display: "\u03B9", name: "iota" },
      { latex: "\\kappa", display: "\u03BA", name: "kappa" },
      { latex: "\\lambda", display: "\u03BB", name: "lambda" },
      { latex: "\\mu", display: "\u03BC", name: "mu" },
      { latex: "\\nu", display: "\u03BD", name: "nu" },
      { latex: "\\xi", display: "\u03BE", name: "xi" },
      { latex: "\\pi", display: "\u03C0", name: "pi" },
      { latex: "\\rho", display: "\u03C1", name: "rho" },
      { latex: "\\sigma", display: "\u03C3", name: "sigma" },
      { latex: "\\tau", display: "\u03C4", name: "tau" },
      { latex: "\\upsilon", display: "\u03C5", name: "upsilon" },
      { latex: "\\phi", display: "\u03C6", name: "phi" },
      { latex: "\\chi", display: "\u03C7", name: "chi" },
      { latex: "\\psi", display: "\u03C8", name: "psi" },
      { latex: "\\omega", display: "\u03C9", name: "omega" },
      { latex: "\\Gamma", display: "\u0393", name: "Gamma" },
      { latex: "\\Delta", display: "\u0394", name: "Delta" },
      { latex: "\\Theta", display: "\u0398", name: "Theta" },
      { latex: "\\Lambda", display: "\u039B", name: "Lambda" },
      { latex: "\\Xi", display: "\u039E", name: "Xi" },
      { latex: "\\Pi", display: "\u03A0", name: "Pi" },
      { latex: "\\Sigma", display: "\u03A3", name: "Sigma" },
      { latex: "\\Phi", display: "\u03A6", name: "Phi" },
      { latex: "\\Psi", display: "\u03A8", name: "Psi" },
      { latex: "\\Omega", display: "\u03A9", name: "Omega" },
    ],
  },
  operators: {
    label: "Operators",
    symbols: [
      { latex: "+", display: "+", name: "plus" },
      { latex: "-", display: "-", name: "minus" },
      { latex: "\\times", display: "\u00D7", name: "times" },
      { latex: "\\div", display: "\u00F7", name: "divide" },
      { latex: "\\pm", display: "\u00B1", name: "plus-minus" },
      { latex: "\\mp", display: "\u2213", name: "minus-plus" },
      { latex: "\\cdot", display: "\u00B7", name: "dot" },
      { latex: "\\ast", display: "*", name: "asterisk" },
      { latex: "\\sum", display: "\u2211", name: "sum" },
      { latex: "\\prod", display: "\u220F", name: "product" },
      { latex: "\\int", display: "\u222B", name: "integral" },
      { latex: "\\oint", display: "\u222E", name: "contour integral" },
      { latex: "\\partial", display: "\u2202", name: "partial" },
      { latex: "\\nabla", display: "\u2207", name: "nabla" },
      { latex: "\\infty", display: "\u221E", name: "infinity" },
    ],
  },
  relations: {
    label: "Relations",
    symbols: [
      { latex: "=", display: "=", name: "equals" },
      { latex: "\\neq", display: "\u2260", name: "not equal" },
      { latex: "<", display: "<", name: "less than" },
      { latex: ">", display: ">", name: "greater than" },
      { latex: "\\leq", display: "\u2264", name: "less or equal" },
      { latex: "\\geq", display: "\u2265", name: "greater or equal" },
      { latex: "\\ll", display: "\u226A", name: "much less" },
      { latex: "\\gg", display: "\u226B", name: "much greater" },
      { latex: "\\approx", display: "\u2248", name: "approximately" },
      { latex: "\\sim", display: "\u223C", name: "similar" },
      { latex: "\\equiv", display: "\u2261", name: "equivalent" },
      { latex: "\\propto", display: "\u221D", name: "proportional" },
      { latex: "\\in", display: "\u2208", name: "in" },
      { latex: "\\notin", display: "\u2209", name: "not in" },
      { latex: "\\subset", display: "\u2282", name: "subset" },
      { latex: "\\supset", display: "\u2283", name: "superset" },
      { latex: "\\subseteq", display: "\u2286", name: "subset or equal" },
      { latex: "\\supseteq", display: "\u2287", name: "superset or equal" },
    ],
  },
  structures: {
    label: "Structures",
    symbols: [
      { latex: "\\frac{a}{b}", display: "a/b", name: "fraction" },
      { latex: "\\sqrt{x}", display: "\u221Ax", name: "square root" },
      { latex: "\\sqrt[n]{x}", display: "\u207F\u221Ax", name: "nth root" },
      { latex: "x^{n}", display: "x\u207F", name: "power" },
      { latex: "x_{n}", display: "x\u2099", name: "subscript" },
      { latex: "\\binom{n}{k}", display: "(n k)", name: "binomial" },
      { latex: "\\lim_{x \\to a}", display: "lim", name: "limit" },
      { latex: "\\sum_{i=1}^{n}", display: "\u03A3", name: "sum with bounds" },
      { latex: "\\int_{a}^{b}", display: "\u222B", name: "definite integral" },
      { latex: "\\vec{v}", display: "v\u20D7", name: "vector" },
      { latex: "\\hat{x}", display: "x\u0302", name: "hat" },
      { latex: "\\bar{x}", display: "x\u0304", name: "bar" },
      { latex: "\\dot{x}", display: "x\u0307", name: "dot" },
      { latex: "\\ddot{x}", display: "x\u0308", name: "double dot" },
    ],
  },
  brackets: {
    label: "Brackets",
    symbols: [
      { latex: "\\left( \\right)", display: "( )", name: "parentheses" },
      { latex: "\\left[ \\right]", display: "[ ]", name: "brackets" },
      { latex: "\\left\\{ \\right\\}", display: "{ }", name: "braces" },
      { latex: "\\left| \\right|", display: "| |", name: "abs value" },
      { latex: "\\left\\| \\right\\|", display: "\u2016 \u2016", name: "norm" },
      { latex: "\\langle \\rangle", display: "\u27E8 \u27E9", name: "angle brackets" },
      { latex: "\\lfloor \\rfloor", display: "\u230A \u230B", name: "floor" },
      { latex: "\\lceil \\rceil", display: "\u2308 \u2309", name: "ceiling" },
    ],
  },
  functions: {
    label: "Functions",
    symbols: [
      { latex: "\\sin", display: "sin", name: "sine" },
      { latex: "\\cos", display: "cos", name: "cosine" },
      { latex: "\\tan", display: "tan", name: "tangent" },
      { latex: "\\cot", display: "cot", name: "cotangent" },
      { latex: "\\sec", display: "sec", name: "secant" },
      { latex: "\\csc", display: "csc", name: "cosecant" },
      { latex: "\\arcsin", display: "arcsin", name: "arc sine" },
      { latex: "\\arccos", display: "arccos", name: "arc cosine" },
      { latex: "\\arctan", display: "arctan", name: "arc tangent" },
      { latex: "\\sinh", display: "sinh", name: "hyperbolic sine" },
      { latex: "\\cosh", display: "cosh", name: "hyperbolic cosine" },
      { latex: "\\tanh", display: "tanh", name: "hyperbolic tangent" },
      { latex: "\\ln", display: "ln", name: "natural log" },
      { latex: "\\log", display: "log", name: "logarithm" },
      { latex: "\\log_{b}", display: "log\u2082", name: "log base" },
      { latex: "\\exp", display: "exp", name: "exponential" },
    ],
  },
  arrows: {
    label: "Arrows",
    symbols: [
      { latex: "\\rightarrow", display: "\u2192", name: "right arrow" },
      { latex: "\\leftarrow", display: "\u2190", name: "left arrow" },
      { latex: "\\leftrightarrow", display: "\u2194", name: "double arrow" },
      { latex: "\\Rightarrow", display: "\u21D2", name: "implies" },
      { latex: "\\Leftarrow", display: "\u21D0", name: "implied by" },
      { latex: "\\Leftrightarrow", display: "\u21D4", name: "iff" },
      { latex: "\\uparrow", display: "\u2191", name: "up arrow" },
      { latex: "\\downarrow", display: "\u2193", name: "down arrow" },
      { latex: "\\mapsto", display: "\u21A6", name: "maps to" },
    ],
  },
  misc: {
    label: "Miscellaneous",
    symbols: [
      { latex: "\\forall", display: "\u2200", name: "for all" },
      { latex: "\\exists", display: "\u2203", name: "exists" },
      { latex: "\\nexists", display: "\u2204", name: "not exists" },
      { latex: "\\therefore", display: "\u2234", name: "therefore" },
      { latex: "\\because", display: "\u2235", name: "because" },
      { latex: "\\land", display: "\u2227", name: "and" },
      { latex: "\\lor", display: "\u2228", name: "or" },
      { latex: "\\neg", display: "\u00AC", name: "not" },
      { latex: "\\cup", display: "\u222A", name: "union" },
      { latex: "\\cap", display: "\u2229", name: "intersection" },
      { latex: "\\emptyset", display: "\u2205", name: "empty set" },
      { latex: "\\mathbb{R}", display: "\u211D", name: "reals" },
      { latex: "\\mathbb{N}", display: "\u2115", name: "naturals" },
      { latex: "\\mathbb{Z}", display: "\u2124", name: "integers" },
      { latex: "\\mathbb{Q}", display: "\u211A", name: "rationals" },
      { latex: "\\mathbb{C}", display: "\u2102", name: "complex" },
    ],
  },
};

interface MathBlockProps {
  block: Block;
  onUpdate: (block: Block) => void;
  onDelete: () => void;
  onInsertAfter: (type?: BlockType) => void;
  onFocus: () => void;
  onFocusPrevious?: () => void;
  onFocusNext?: () => void;
  isFocused: boolean;
}

export function MathBlock({
  block,
  onUpdate,
  onDelete,
  onInsertAfter,
  onFocus,
  onFocusPrevious,
  onFocusNext,
  isFocused,
}: MathBlockProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("greek");

  const meta = block.meta as LegacyBlockMeta | undefined;
  const latex = meta?.latex || getBlockText(block) || '';

  // Render LaTeX
  const renderLatex = useCallback(() => {
    if (!previewRef.current) return;

    if (!latex.trim()) {
      previewRef.current.innerHTML = '<span class="text-[var(--text-tertiary)] italic">Click to add LaTeX math...</span>';
      setError(null);
      return;
    }

    try {
      katex.render(latex, previewRef.current, {
        displayMode: true,
        throwOnError: true,
        errorColor: 'var(--accent-error)',
        trust: false,
        strict: 'warn',
        output: 'htmlAndMathml',
        macros: {
          // Common LaTeX macros
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
          '\\Q': '\\mathbb{Q}',
          '\\C': '\\mathbb{C}',
          '\\vec': '\\mathbf{#1}',
        },
      });
      setError(null);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Invalid LaTeX expression';
      setError(errorMessage);

      // Show error in preview
      previewRef.current.innerHTML = `<span class="text-[var(--accent-error)]">${errorMessage}</span>`;
    }
  }, [latex]);

  // Render on mount and when latex changes (both for editing preview and non-editing display)
  // Must include isEditing in dependencies because the previewRef points to different DOM elements
  // based on editing state (editing preview div vs non-editing display div)
  useEffect(() => {
    renderLatex();
  }, [latex, renderLatex, isEditing]);

  // Handle the case where the editing preview div is conditionally mounted
  // When latex goes from empty to non-empty while editing, the preview div is created
  // but the main effect may have already run with a null ref. This effect ensures
  // we render after the DOM element is available.
  useEffect(() => {
    if (isEditing && latex.trim() && previewRef.current) {
      // Use a microtask to ensure the DOM has fully settled after conditional render
      queueMicrotask(() => {
        renderLatex();
      });
    }
  }, [isEditing, latex, renderLatex]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [latex, isEditing]);

  // Focus handling
  useEffect(() => {
    if (isFocused && isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused, isEditing]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newLatex = e.target.value;
    onUpdate({
      ...block,
      content: newLatex,
      meta: { ...meta, latex: newLatex, displayMode: true },
    });
  }, [block, meta, onUpdate]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape exits editing mode
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setShowSymbols(false);
      renderLatex();
      return;
    }

    // Cmd/Ctrl + Enter to exit editing
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setIsEditing(false);
      setShowSymbols(false);
      renderLatex();
      onInsertAfter('paragraph');
      return;
    }

    // Delete empty math block
    if (e.key === 'Backspace' && latex === '') {
      e.preventDefault();
      onDelete();
      return;
    }

    // Arrow up at start - focus previous block
    if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === 0 && onFocusPrevious) {
        e.preventDefault();
        setIsEditing(false);
        setShowSymbols(false);
        onFocusPrevious();
        return;
      }
    }

    // Arrow down at end - focus next block
    if (e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey) {
      const textarea = textareaRef.current;
      if (textarea && textarea.selectionStart === textarea.value.length && onFocusNext) {
        e.preventDefault();
        setIsEditing(false);
        setShowSymbols(false);
        onFocusNext();
        return;
      }
    }
  }, [latex, onDelete, onInsertAfter, onFocusPrevious, onFocusNext, renderLatex]);

  const handlePreviewClick = useCallback(() => {
    setIsEditing(true);
    onFocus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          textareaRef.current.value.length,
          textareaRef.current.value.length
        );
      }
    }, 0);
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    // Delay to allow for button clicks
    setTimeout(() => {
      if (document.activeElement !== textareaRef.current) {
        setIsEditing(false);
        setShowSymbols(false);
        renderLatex();
      }
    }, 150);
  }, [renderLatex]);

  const handleCopyLatex = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [latex]);

  const insertSymbol = useCallback((symbolLatex: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = latex;

    // Add space before symbol if needed
    const prefix = start > 0 && !currentValue[start - 1].match(/[\s{([\^_]/) ? ' ' : '';

    const newValue = currentValue.slice(0, start) + prefix + symbolLatex + currentValue.slice(end);

    onUpdate({
      ...block,
      content: newValue,
      meta: { ...meta, latex: newValue, displayMode: true },
    });

    // Move cursor after inserted symbol
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + prefix.length + symbolLatex.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  }, [latex, block, meta, onUpdate]);

  return (
    <div
      className="relative w-full border border-[var(--border-default)] bg-[var(--surface-secondary)]"
      onClick={!isEditing ? handlePreviewClick : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)]">
        <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
          Math (LaTeX)
        </span>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[var(--text-caption)] text-[var(--accent-error)]">
              Error
            </span>
          )}
          {/* Copy button */}
          {latex.trim() && (
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 text-[var(--text-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLatex();
              }}
              title="Copy LaTeX source"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-[var(--accent-success)]" />
                  <span className="text-[var(--accent-success)]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
          {!isEditing && (
            <button
              type="button"
              className="text-[var(--text-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              onClick={(e) => {
                e.stopPropagation();
                handlePreviewClick();
              }}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={latex}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={handleBlur}
            className="w-full bg-transparent text-[var(--text-mono)] text-[var(--text-primary)] font-mono leading-[1.7] resize-none outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="Enter LaTeX expression (e.g., E = mc^2)"
            rows={1}
            spellCheck={false}
          />

          {/* Symbols toggle button */}
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="flex items-center gap-1 text-[var(--text-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              onMouseDown={(e) => e.preventDefault()} // Prevent blur from textarea
              onClick={(e) => {
                e.stopPropagation();
                setShowSymbols(!showSymbols);
              }}
            >
              {showSymbols ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>Math Symbols</span>
            </button>
            <div className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
              Press <kbd className="px-1 py-0.5 bg-[var(--surface-hover)] border border-[var(--border-default)] text-[10px]">Cmd+Enter</kbd> to finish
            </div>
          </div>

          {/* Symbols palette */}
          {showSymbols && (
            <div className="mt-3 border border-[var(--border-default)] bg-[var(--surface-primary)]">
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1 px-2 py-2 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]">
                {Object.entries(MATH_SYMBOLS).map(([key, category]) => (
                  <button
                    key={key}
                    type="button"
                    className={`px-2 py-1 text-[var(--text-caption)] transition-colors ${
                      activeCategory === key
                        ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                    }`}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur from textarea
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCategory(key);
                    }}
                  >
                    {category.label}
                  </button>
                ))}
              </div>

              {/* Symbol grid */}
              <div className="p-2 max-h-[200px] overflow-y-auto">
                <div className="grid grid-cols-8 gap-1">
                  {MATH_SYMBOLS[activeCategory as keyof typeof MATH_SYMBOLS].symbols.map((symbol, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-10 h-10 flex items-center justify-center text-lg hover:bg-[var(--surface-hover)] border border-transparent hover:border-[var(--border-default)] transition-colors"
                      onMouseDown={(e) => e.preventDefault()} // Prevent blur from textarea
                      onClick={(e) => {
                        e.stopPropagation();
                        insertSymbol(symbol.latex);
                      }}
                      title={`${symbol.name} (${symbol.latex})`}
                    >
                      {symbol.display}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live preview while editing */}
          {latex.trim() && (
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <div className="text-[var(--text-caption)] text-[var(--text-tertiary)] mb-2">Preview:</div>
              <div
                ref={previewRef}
                className="text-center py-4 overflow-x-auto"
              />
            </div>
          )}
        </div>
      ) : (
        <div
          ref={previewRef}
          className="p-4 text-center cursor-pointer min-h-[60px] flex items-center justify-center overflow-x-auto"
        />
      )}
    </div>
  );
}

export default MathBlock;
