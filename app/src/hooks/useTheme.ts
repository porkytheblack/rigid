import { useEffect, useMemo, useCallback } from 'react';
import {
  useThemeStore,
  selectActiveTheme,
  selectActiveThemeId,
  selectThemes,
  selectCustomThemes,
} from '@/lib/stores/theme';
import type { ThemeDefinition } from '@/lib/stores/theme-types';
import { themeColorsToCardColors } from '@/lib/stores/theme-utils';

/**
 * Hook to initialize the theme system at app startup.
 * Call this once in the app root (e.g., AppShell).
 *
 * This hook:
 * - Loads the saved theme preference from settings
 * - Loads any custom installed themes
 * - Applies the active theme's CSS variables
 */
export function useThemeInitializer(): void {
  const initialize = useThemeStore(state => state.initialize);
  const initialized = useThemeStore(state => state.initialized);

  useEffect(() => {
    if (!initialized) {
      initialize().catch(console.warn);
    }
  }, [initialize, initialized]);
}

/**
 * Main theme hook for accessing theme state and actions.
 *
 * @returns Object with theme state and actions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { activeTheme, setTheme, themes } = useTheme();
 *
 *   return (
 *     <select
 *       value={activeTheme?.id}
 *       onChange={(e) => setTheme(e.target.value)}
 *     >
 *       {themes.map(theme => (
 *         <option key={theme.id} value={theme.id}>{theme.name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useTheme() {
  // Use stable selectors that return references directly from state
  const activeThemeId = useThemeStore(selectActiveThemeId);
  const themes = useThemeStore(selectThemes);
  const customThemes = useThemeStore(selectCustomThemes);
  const initialized = useThemeStore(state => state.initialized);
  const loading = useThemeStore(state => state.loading);
  const error = useThemeStore(state => state.error);

  const setTheme = useThemeStore(state => state.setTheme);
  const installTheme = useThemeStore(state => state.installTheme);
  const uninstallTheme = useThemeStore(state => state.uninstallTheme);
  const validateThemeImport = useThemeStore(state => state.validateThemeImport);
  const clearError = useThemeStore(state => state.clearError);
  const getTheme = useThemeStore(state => state.getTheme);

  const activeTheme = useThemeStore(selectActiveTheme);

  // Memoize built-in themes to avoid creating new array on every render
  const builtInThemes = useMemo(
    () => themes.filter(t => t.isBuiltIn),
    [themes]
  );

  return {
    // State
    activeThemeId,
    activeTheme,
    themes,
    builtInThemes,
    customThemes,
    initialized,
    loading,
    error,

    // Actions
    setTheme,
    installTheme,
    uninstallTheme,
    validateThemeImport,
    clearError,
    getTheme,
  };
}

/**
 * Hook specifically for theme selection UI components like ThemeSettings.
 * Provides data in the format expected by ThemeCard components.
 *
 * IMPORTANT: This hook memoizes all derived data and callbacks to prevent
 * infinite re-render loops. The themes and customThemes arrays are transformed
 * using useMemo, and handlers use useCallback.
 *
 * @returns Object with theme cards data and actions
 */
export function useThemeSelector() {
  // Use stable selectors directly from the store to avoid intermediate hook overhead
  const activeThemeId = useThemeStore(selectActiveThemeId);
  const themes = useThemeStore(selectThemes);
  const customThemes = useThemeStore(selectCustomThemes);
  const loading = useThemeStore(state => state.loading);
  const error = useThemeStore(state => state.error);
  const setTheme = useThemeStore(state => state.setTheme);
  const installTheme = useThemeStore(state => state.installTheme);
  const uninstallTheme = useThemeStore(state => state.uninstallTheme);
  const validateThemeImport = useThemeStore(state => state.validateThemeImport);
  const clearError = useThemeStore(state => state.clearError);

  // Memoize transformed theme cards to avoid creating new arrays on every render
  const themeCards = useMemo(
    () =>
      themes.map(theme => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        colors: themeColorsToCardColors(theme.colors),
        isBuiltIn: theme.isBuiltIn ?? false,
      })),
    [themes]
  );

  // Memoize transformed custom theme cards
  const customThemeCards = useMemo(
    () =>
      customThemes.map(theme => ({
        id: theme.id,
        name: theme.name,
        description: theme.description,
        colors: themeColorsToCardColors(theme.colors),
      })),
    [customThemes]
  );

  // Memoize callbacks to ensure stable references
  const handleSelectTheme = useCallback(
    (themeId: string) => {
      setTheme(themeId);
    },
    [setTheme]
  );

  const handleInstallTheme = useCallback(
    async (themeData: {
      id: string;
      name: string;
      description?: string;
      colors: {
        surfacePrimary: string;
        surfaceSecondary: string;
        textPrimary: string;
        textSecondary: string;
        borderDefault: string;
        accent: string;
      };
    }): Promise<void> => {
      // Convert to ThemeDefinition format
      const theme: ThemeDefinition = {
        id: themeData.id,
        name: themeData.name,
        description: themeData.description,
        colors: {
          surfacePrimary: themeData.colors.surfacePrimary,
          surfaceSecondary: themeData.colors.surfaceSecondary,
          textPrimary: themeData.colors.textPrimary,
          textSecondary: themeData.colors.textSecondary,
          borderDefault: themeData.colors.borderDefault,
          accent: themeData.colors.accent,
        },
        isBuiltIn: false,
      };

      await installTheme(theme);
    },
    [installTheme]
  );

  const handleDeleteTheme = useCallback(
    async (themeId: string): Promise<void> => {
      await uninstallTheme(themeId);
    },
    [uninstallTheme]
  );

  return {
    activeThemeId,
    themes: themeCards,
    customThemes: customThemeCards,
    loading,
    error,
    onSelectTheme: handleSelectTheme,
    onInstallTheme: handleInstallTheme,
    onDeleteTheme: handleDeleteTheme,
    validateThemeImport,
    clearError,
  };
}

/**
 * Hook for getting the current active theme's colors.
 * Useful for components that need direct access to theme colors.
 *
 * @returns The active theme's colors or undefined if not initialized
 */
export function useThemeColors() {
  const activeTheme = useThemeStore(selectActiveTheme);
  return activeTheme?.colors;
}

/**
 * Hook for checking if the current theme is dark.
 * Useful for conditional styling or icon selection.
 *
 * @returns boolean indicating if current theme is considered dark
 */
export function useIsDarkTheme(): boolean {
  const activeTheme = useThemeStore(selectActiveTheme);

  if (!activeTheme) return true; // Default to dark

  // Check if the surface primary color is dark
  // by checking if it's closer to black than white
  const hex = activeTheme.colors.surfacePrimary;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.5;
}
