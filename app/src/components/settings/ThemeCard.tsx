'use client';

import { Check, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Theme color palette for preview rendering.
 * These are the key semantic colors that define a theme's visual identity.
 */
export interface ThemeColors {
  surfacePrimary: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  borderDefault: string;
  accent: string;
}

export interface ThemeCardProps {
  id: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  isActive: boolean;
  isBuiltIn: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * ThemeCard displays a single theme option with:
 * - Color palette preview (mini swatches showing key colors)
 * - Theme name and description
 * - Active indicator when selected
 * - Delete button for custom themes only
 *
 * Design decisions:
 * - Horizontal color bar preview shows 5 key colors at a glance
 * - The entire card is clickable for easy selection
 * - Active state uses accent border and checkmark badge
 * - Delete button appears only on hover for custom themes
 */
export function ThemeCard({
  id,
  name,
  description,
  colors,
  isActive,
  isBuiltIn,
  onSelect,
  onDelete,
}: ThemeCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <button
      onClick={() => onSelect(id)}
      className={cn(
        'group relative w-full text-left transition-all',
        'border bg-[var(--surface-secondary)] p-3',
        'hover:border-[var(--border-strong)]',
        isActive
          ? 'border-[var(--text-primary)] ring-1 ring-[var(--text-primary)]'
          : 'border-[var(--border-default)]'
      )}
      aria-pressed={isActive}
      aria-label={`${name} theme${isActive ? ', currently active' : ''}`}
    >
      {/* Active indicator badge */}
      {isActive && (
        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center bg-[var(--text-primary)]">
          <Check size={12} className="text-[var(--text-inverse)]" />
        </div>
      )}

      {/* Color palette preview - horizontal bar with key theme colors */}
      <div className="mb-3 flex h-8 overflow-hidden border border-[var(--border-subtle)]">
        {/* Surface primary - background */}
        <div
          className="flex-1"
          style={{ backgroundColor: colors.surfacePrimary }}
          title="Background"
        />
        {/* Surface secondary - cards/panels */}
        <div
          className="flex-1"
          style={{ backgroundColor: colors.surfaceSecondary }}
          title="Surface"
        />
        {/* Text primary */}
        <div
          className="flex-1"
          style={{ backgroundColor: colors.textPrimary }}
          title="Text"
        />
        {/* Border color */}
        <div
          className="flex-1"
          style={{ backgroundColor: colors.borderDefault }}
          title="Border"
        />
        {/* Accent color */}
        <div
          className="flex-1"
          style={{ backgroundColor: colors.accent }}
          title="Accent"
        />
      </div>

      {/* Mini UI preview - shows how text looks on the theme background */}
      <div
        className="mb-3 p-2 border"
        style={{
          backgroundColor: colors.surfacePrimary,
          borderColor: colors.borderDefault,
        }}
      >
        <div
          className="text-[10px] font-medium mb-1"
          style={{ color: colors.textPrimary }}
        >
          Preview Text
        </div>
        <div
          className="text-[9px]"
          style={{ color: colors.textSecondary }}
        >
          Secondary content
        </div>
      </div>

      {/* Theme info */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)] truncate">
              {name}
            </h4>
            {isBuiltIn && (
              <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] bg-[var(--surface-elevated)]">
                Built-in
              </span>
            )}
          </div>
          {description && (
            <p className="mt-0.5 text-[var(--text-caption)] text-[var(--text-tertiary)] line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {/* Delete button - only for custom themes, visible on hover */}
        {!isBuiltIn && onDelete && (
          <button
            onClick={handleDelete}
            className={cn(
              'shrink-0 p-1.5 text-[var(--text-tertiary)]',
              'opacity-0 group-hover:opacity-100 transition-opacity',
              'hover:text-[var(--accent-error)] hover:bg-[var(--status-error-bg)]'
            )}
            aria-label={`Delete ${name} theme`}
            title="Delete theme"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </button>
  );
}
