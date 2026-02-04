'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import { Search, X, Upload, Check, Sparkles, Sun, Moon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ThemeColors } from './ThemeCard';

/**
 * Theme category for filtering
 */
export type ThemeCategory = 'all' | 'dark' | 'light' | 'popular' | 'custom';

/**
 * Theme item displayed in the modal
 */
export interface ThemeItem {
  id: string;
  name: string;
  description?: string;
  colors: ThemeColors;
  isBuiltIn: boolean;
  category?: ThemeCategory;
  isPopular?: boolean;
}

export interface ThemeSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themes: ThemeItem[];
  activeThemeId: string;
  onSelectTheme: (themeId: string) => void;
  onInstallTheme: () => void;
}

/**
 * Category filter configuration
 */
const CATEGORIES: { id: ThemeCategory; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'popular', label: 'Popular', icon: Star },
  { id: 'custom', label: 'Custom', icon: Upload },
];

/**
 * Determines if a theme is "dark" based on surface color luminance
 */
function isDarkTheme(colors: ThemeColors): boolean {
  const hex = colors.surfacePrimary;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * ThemeSelectionModal provides a rich browsing experience for selecting themes.
 *
 * Features:
 * - Search filtering by theme name
 * - Category filtering (All, Dark, Light, Popular, Custom)
 * - Live preview of selected theme
 * - Two-stage selection: preview then apply
 * - Install custom theme button
 *
 * Design decisions:
 * - Large modal to accommodate many themes without scrolling fatigue
 * - Preview panel shows actual UI elements styled with theme colors
 * - Category pills use subtle styling to not compete with theme cards
 * - Apply button only enabled when preview differs from active theme
 */
export function ThemeSelectionModal({
  open,
  onOpenChange,
  themes,
  activeThemeId,
  onSelectTheme,
  onInstallTheme,
}: ThemeSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ThemeCategory>('all');
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (newOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      setPreviewThemeId(null);
    }
    onOpenChange(newOpen);
  }, [onOpenChange]);

  // Get the theme being previewed (or active theme if none selected)
  const previewTheme = useMemo(() => {
    const themeId = previewThemeId || activeThemeId;
    return themes.find(t => t.id === themeId);
  }, [themes, previewThemeId, activeThemeId]);

  // Filter themes based on search and category
  const filteredThemes = useMemo(() => {
    return themes.filter(theme => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = theme.name.toLowerCase().includes(query);
        const descMatch = theme.description?.toLowerCase().includes(query);
        if (!nameMatch && !descMatch) return false;
      }

      // Category filter
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'dark') return isDarkTheme(theme.colors);
      if (selectedCategory === 'light') return !isDarkTheme(theme.colors);
      if (selectedCategory === 'popular') return theme.isPopular || theme.isBuiltIn;
      if (selectedCategory === 'custom') return !theme.isBuiltIn;

      return true;
    });
  }, [themes, searchQuery, selectedCategory]);

  // Handle theme preview selection
  const handlePreviewTheme = useCallback((themeId: string) => {
    setPreviewThemeId(themeId);
  }, []);

  // Handle apply - select the previewed theme and close
  const handleApply = useCallback(() => {
    if (previewThemeId && previewThemeId !== activeThemeId) {
      onSelectTheme(previewThemeId);
    }
    handleOpenChange(false);
  }, [previewThemeId, activeThemeId, onSelectTheme, handleOpenChange]);

  // Handle install theme click
  const handleInstallClick = useCallback(() => {
    handleOpenChange(false);
    // Small delay to let modal close animation complete
    setTimeout(() => {
      onInstallTheme();
    }, 150);
  }, [handleOpenChange, onInstallTheme]);

  const hasChanges = previewThemeId && previewThemeId !== activeThemeId;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] max-h-[700px] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
          <DialogTitle className="text-lg font-semibold">
            Choose Theme
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--text-secondary)]">
            Select a theme to customize the application appearance
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
            />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setSelectedCategory(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors',
                  'border',
                  selectedCategory === id
                    ? 'bg-[var(--text-primary)] text-[var(--text-inverse)] border-[var(--text-primary)]'
                    : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Theme Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredThemes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Search size={40} className="text-[var(--text-tertiary)] mb-3" />
                <p className="text-[var(--text-secondary)] font-medium">No themes found</p>
                <p className="text-sm text-[var(--text-tertiary)] mt-1">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredThemes.map((theme) => (
                  <ThemeGridCard
                    key={theme.id}
                    theme={theme}
                    isActive={theme.id === activeThemeId}
                    isPreview={theme.id === previewThemeId}
                    onSelect={handlePreviewTheme}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="w-72 border-l border-[var(--border-subtle)] p-6 flex flex-col bg-[var(--surface-secondary)]">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">
              Preview
            </h3>

            {previewTheme ? (
              <ThemePreviewPanel theme={previewTheme} />
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <p className="text-sm text-[var(--text-tertiary)]">
                  Click a theme to preview
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleInstallClick}
          >
            <Upload size={14} className="mr-1.5" />
            Install Custom Theme
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={!hasChanges}
            >
              {hasChanges ? 'Apply Theme' : 'Done'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact theme card for the grid display
 */
interface ThemeGridCardProps {
  theme: ThemeItem;
  isActive: boolean;
  isPreview: boolean;
  onSelect: (themeId: string) => void;
}

function ThemeGridCard({ theme, isActive, isPreview, onSelect }: ThemeGridCardProps) {
  const isSelected = isPreview || (!isPreview && isActive);

  return (
    <button
      onClick={() => onSelect(theme.id)}
      className={cn(
        'relative text-left transition-all p-2',
        'border bg-[var(--surface-secondary)]',
        'hover:border-[var(--border-strong)]',
        isSelected
          ? 'border-[var(--text-primary)] ring-1 ring-[var(--text-primary)]'
          : 'border-[var(--border-default)]'
      )}
      aria-pressed={isSelected}
      aria-label={`${theme.name} theme${isActive ? ', currently active' : ''}`}
    >
      {/* Active/Preview indicator */}
      {isSelected && (
        <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center bg-[var(--text-primary)]">
          <Check size={10} className="text-[var(--text-inverse)]" />
        </div>
      )}

      {/* Color swatches - compact horizontal bar */}
      <div className="flex h-6 overflow-hidden border border-[var(--border-subtle)] mb-2">
        <div className="flex-1" style={{ backgroundColor: theme.colors.surfacePrimary }} />
        <div className="flex-1" style={{ backgroundColor: theme.colors.surfaceSecondary }} />
        <div className="flex-1" style={{ backgroundColor: theme.colors.textPrimary }} />
        <div className="flex-1" style={{ backgroundColor: theme.colors.accent }} />
      </div>

      {/* Theme name */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
          {theme.name}
        </span>
        {isActive && !isPreview && (
          <span className="shrink-0 px-1 py-0.5 text-[8px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] bg-[var(--surface-elevated)]">
            Active
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Live preview panel showing how theme colors look in context
 */
interface ThemePreviewPanelProps {
  theme: ThemeItem;
}

function ThemePreviewPanel({ theme }: ThemePreviewPanelProps) {
  const { colors } = theme;

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* Theme info */}
      <div>
        <h4 className="font-medium text-[var(--text-primary)]">{theme.name}</h4>
        {theme.description && (
          <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{theme.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2">
          {theme.isBuiltIn && (
            <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] bg-[var(--surface-elevated)]">
              Built-in
            </span>
          )}
          <span className="px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] bg-[var(--surface-elevated)]">
            {isDarkTheme(colors) ? 'Dark' : 'Light'}
          </span>
        </div>
      </div>

      {/* Mini UI Preview */}
      <div
        className="flex-1 p-3 border overflow-hidden"
        style={{
          backgroundColor: colors.surfacePrimary,
          borderColor: colors.borderDefault,
        }}
      >
        {/* Simulated header */}
        <div
          className="h-3 w-16 mb-3"
          style={{ backgroundColor: colors.textPrimary }}
        />

        {/* Simulated card */}
        <div
          className="p-2 border mb-2"
          style={{
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.borderDefault,
          }}
        >
          <div
            className="h-2 w-20 mb-1.5"
            style={{ backgroundColor: colors.textPrimary }}
          />
          <div
            className="h-1.5 w-24"
            style={{ backgroundColor: colors.textSecondary }}
          />
        </div>

        {/* Simulated text lines */}
        <div className="space-y-1.5">
          <div
            className="h-1.5 w-full"
            style={{ backgroundColor: colors.textPrimary, opacity: 0.8 }}
          />
          <div
            className="h-1.5 w-3/4"
            style={{ backgroundColor: colors.textSecondary }}
          />
          <div
            className="h-1.5 w-5/6"
            style={{ backgroundColor: colors.textSecondary }}
          />
        </div>

        {/* Simulated button */}
        <div
          className="mt-3 h-5 w-16 flex items-center justify-center"
          style={{ backgroundColor: colors.accent }}
        >
          <span
            className="text-[7px] font-medium"
            style={{ color: isDarkTheme({ ...colors, surfacePrimary: colors.accent }) ? '#fff' : '#000' }}
          >
            Button
          </span>
        </div>
      </div>

      {/* Color palette display */}
      <div>
        <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Colors</p>
        <div className="grid grid-cols-3 gap-1.5">
          <ColorSwatch label="Background" color={colors.surfacePrimary} />
          <ColorSwatch label="Surface" color={colors.surfaceSecondary} />
          <ColorSwatch label="Text" color={colors.textPrimary} />
          <ColorSwatch label="Secondary" color={colors.textSecondary} />
          <ColorSwatch label="Border" color={colors.borderDefault} />
          <ColorSwatch label="Accent" color={colors.accent} />
        </div>
      </div>
    </div>
  );
}

/**
 * Small color swatch with label
 */
function ColorSwatch({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-6 w-full border border-[var(--border-subtle)]"
        style={{ backgroundColor: color }}
        title={color}
      />
      <span className="text-[9px] text-[var(--text-tertiary)] truncate">{label}</span>
    </div>
  );
}
