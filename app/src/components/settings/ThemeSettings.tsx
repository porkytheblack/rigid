'use client';

import { useState, useCallback, useRef } from 'react';
import { Palette, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeSelectionModal, type ThemeItem } from './ThemeSelectionModal';
import { useThemeSelector } from '@/hooks/useTheme';
import { BUILT_IN_THEMES as BUILT_IN_THEME_DEFINITIONS } from '@/lib/stores/theme-builtin';
import { themeColorsToCardColors } from '@/lib/stores/theme-utils';
import type { ThemeColors } from './ThemeCard';

/**
 * Represents a custom theme installed by the user.
 */
interface CustomTheme {
  id: string;
  name: string;
  description?: string;
  colors: ThemeColors;
}

/**
 * Validation error for theme JSON files.
 */
interface ValidationError {
  message: string;
  field?: string;
}

/**
 * ThemeSettings provides the UI for managing application themes.
 * Uses a modal for theme browsing and selection.
 *
 * Features:
 * - Current theme preview card
 * - Modal for browsing all available themes
 * - Theme installation via JSON file upload
 * - Validation feedback for invalid theme files
 */
export function ThemeSettings() {
  const {
    activeThemeId,
    themes,
    customThemes,
    onSelectTheme,
    onInstallTheme,
    validateThemeImport,
  } = useThemeSelector();

  const [isInstalling, setIsInstalling] = useState(false);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current active theme
  const activeTheme = themes.find(t => t.id === activeThemeId);

  // Transform themes for modal display
  const modalThemes: ThemeItem[] = themes.map(theme => ({
    id: theme.id,
    name: theme.name,
    description: theme.description,
    colors: theme.colors,
    isBuiltIn: theme.isBuiltIn,
    isPopular: theme.isBuiltIn,
  }));

  // Handle opening the file picker from the modal
  const handleInstallFromModal = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Processes a theme file and installs it if valid.
   */
  const processThemeFile = useCallback(async (file: File) => {
    setValidationError(null);

    if (!file.name.endsWith('.json')) {
      setValidationError({ message: 'Only JSON files are supported' });
      return;
    }

    try {
      setIsInstalling(true);
      const text = await file.text();
      const data = JSON.parse(text);

      // Use the store's validation function
      const result = validateThemeImport(data);

      if (!result.valid) {
        const firstError = result.errors[0];
        setValidationError({
          message: firstError?.message || 'Invalid theme',
          field: firstError?.field,
        });
        return;
      }

      if (!result.theme) {
        setValidationError({ message: 'Failed to parse theme' });
        return;
      }

      // Check if theme with same ID already exists in custom themes
      if (customThemes.some(t => t.id === result.theme!.id)) {
        setValidationError({
          message: `A theme with ID "${result.theme.id}" is already installed`,
          field: 'id',
        });
        return;
      }

      // Install the theme using the store
      await onInstallTheme({
        id: result.theme.id,
        name: result.theme.name,
        description: result.theme.description,
        colors: {
          surfacePrimary: result.theme.colors.surfacePrimary,
          surfaceSecondary: result.theme.colors.surfaceSecondary,
          textPrimary: result.theme.colors.textPrimary,
          textSecondary: result.theme.colors.textSecondary,
          borderDefault: result.theme.colors.borderDefault,
          accent: result.theme.colors.accent,
        },
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        setValidationError({ message: 'Invalid JSON syntax in theme file' });
      } else {
        setValidationError({
          message: error instanceof Error ? error.message : 'Failed to install theme',
        });
      }
    } finally {
      setIsInstalling(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [validateThemeImport, customThemes, onInstallTheme]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processThemeFile(file);
    }
  }, [processThemeFile]);

  const handleSelectTheme = useCallback((themeId: string) => {
    onSelectTheme(themeId);
  }, [onSelectTheme]);

  return (
    <section className="mb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center bg-[var(--text-primary)]">
          <Palette size={16} className="text-[var(--text-inverse)]" />
        </div>
        <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
          Appearance
        </h2>
      </div>

      {/* Theme description */}
      <p className="mb-4 text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
        Choose a theme for the application. You can also install custom themes from JSON files.
      </p>

      {/* Validation error display */}
      {validationError && (
        <div className="mb-4 flex items-start gap-3 border border-[var(--accent-error)] bg-[var(--status-error-bg)] p-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-[var(--accent-error)]" />
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-body-sm)] text-[var(--accent-error)]">
              {validationError.message}
            </p>
            {validationError.field && (
              <p className="mt-1 text-[var(--text-caption)] text-[var(--text-tertiary)]">
                Field: {validationError.field}
              </p>
            )}
          </div>
          <button
            onClick={() => setValidationError(null)}
            className="shrink-0 p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Current theme preview card */}
      <div className="border border-[var(--border-default)] bg-[var(--surface-secondary)] p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Color preview bar */}
            {activeTheme && (
              <div className="flex h-10 w-24 overflow-hidden border border-[var(--border-subtle)]">
                <div className="flex-1" style={{ backgroundColor: activeTheme.colors.surfacePrimary }} />
                <div className="flex-1" style={{ backgroundColor: activeTheme.colors.surfaceSecondary }} />
                <div className="flex-1" style={{ backgroundColor: activeTheme.colors.textPrimary }} />
                <div className="flex-1" style={{ backgroundColor: activeTheme.colors.accent }} />
              </div>
            )}
            <div>
              <h3 className="font-medium text-[var(--text-primary)]">
                {activeTheme?.name || 'No theme selected'}
              </h3>
              {activeTheme?.description && (
                <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                  {activeTheme.description}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            Change Theme
          </Button>
        </div>
      </div>

      {/* Hidden file input for theme installation */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Select theme file"
      />

      {/* Installing indicator */}
      {isInstalling && (
        <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
          Installing theme...
        </p>
      )}

      {/* Theme Selection Modal */}
      <ThemeSelectionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        themes={modalThemes}
        activeThemeId={activeThemeId}
        onSelectTheme={handleSelectTheme}
        onInstallTheme={handleInstallFromModal}
      />
    </section>
  );
}

/**
 * Built-in themes exported for backwards compatibility.
 * Prefer using the theme store for accessing themes.
 */
export const BUILT_IN_THEMES = BUILT_IN_THEME_DEFINITIONS.map(t => ({
  id: t.id,
  name: t.name,
  description: t.description || '',
  colors: themeColorsToCardColors(t.colors),
}));

export type { CustomTheme, ThemeColors };
