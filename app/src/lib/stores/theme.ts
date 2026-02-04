import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  type ThemeStore,
  type ThemeDefinition,
  type ThemeValidationResult,
  THEME_SETTINGS_KEYS,
  DEFAULT_THEME_ID,
} from './theme-types';
import { BUILT_IN_THEMES, isBuiltInTheme } from './theme-builtin';
import { validateTheme, applyThemeToDocument } from './theme-utils';
import { settings as settingsCommands } from '@/lib/tauri/commands';

/**
 * Theme store - manages application theming with Zustand
 *
 * Features:
 * - Built-in themes (Light, Dark, Gruvbox, Tokyo Night)
 * - Custom theme installation from JSON
 * - Theme persistence via settings store
 * - CSS variable injection for system-wide theming
 */
export const useThemeStore = create<ThemeStore>()(
  immer((set, get) => ({
    // State
    activeThemeId: DEFAULT_THEME_ID,
    themes: [...BUILT_IN_THEMES],
    customThemes: [],
    initialized: false,
    loading: false,
    error: null,

    // Actions
    initialize: async () => {
      if (get().initialized) return;

      set(state => {
        state.loading = true;
        state.error = null;
      });

      try {
        // Load active theme from settings
        const savedThemeId = await settingsCommands.get(THEME_SETTINGS_KEYS.ACTIVE_THEME);

        // Load custom themes from settings
        const customThemesJson = await settingsCommands.get(THEME_SETTINGS_KEYS.CUSTOM_THEMES);
        let customThemes: ThemeDefinition[] = [];

        if (customThemesJson) {
          try {
            const parsed = JSON.parse(customThemesJson);
            if (Array.isArray(parsed)) {
              // Validate each custom theme
              customThemes = parsed.filter(theme => {
                const result = validateTheme(theme);
                return result.valid;
              }).map(theme => ({
                ...theme,
                isBuiltIn: false,
              }));
            }
          } catch (e) {
            console.warn('Failed to parse custom themes:', e);
          }
        }

        // Determine active theme
        let activeThemeId = savedThemeId || DEFAULT_THEME_ID;
        const allThemes = [...BUILT_IN_THEMES, ...customThemes];
        const themeExists = allThemes.some(t => t.id === activeThemeId);

        if (!themeExists) {
          activeThemeId = DEFAULT_THEME_ID;
        }

        set(state => {
          state.customThemes = customThemes;
          state.themes = allThemes;
          state.activeThemeId = activeThemeId;
          state.initialized = true;
          state.loading = false;
        });

        // Apply the active theme
        const activeTheme = allThemes.find(t => t.id === activeThemeId);
        if (activeTheme) {
          applyThemeToDocument(activeTheme);
        }
      } catch (error) {
        set(state => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
          state.initialized = true;
        });

        // Apply default theme on error
        const defaultTheme = BUILT_IN_THEMES.find(t => t.id === DEFAULT_THEME_ID);
        if (defaultTheme) {
          applyThemeToDocument(defaultTheme);
        }
      }
    },

    setTheme: async (themeId: string) => {
      const theme = get().themes.find(t => t.id === themeId);

      if (!theme) {
        set(state => {
          state.error = `Theme "${themeId}" not found`;
        });
        return;
      }

      const previousThemeId = get().activeThemeId;

      // Optimistic update
      set(state => {
        state.activeThemeId = themeId;
        state.error = null;
      });

      // Apply theme immediately
      applyThemeToDocument(theme);

      // Persist to settings
      try {
        await settingsCommands.set(THEME_SETTINGS_KEYS.ACTIVE_THEME, themeId);
      } catch (error) {
        // Rollback on error
        set(state => {
          state.activeThemeId = previousThemeId;
          state.error = error instanceof Error ? error.message : String(error);
        });

        // Revert theme
        const previousTheme = get().themes.find(t => t.id === previousThemeId);
        if (previousTheme) {
          applyThemeToDocument(previousTheme);
        }
      }
    },

    installTheme: async (theme: ThemeDefinition) => {
      // Validate the theme
      const validationResult = validateTheme(theme);

      if (!validationResult.valid || !validationResult.theme) {
        set(state => {
          state.error = validationResult.errors.map(e => e.message).join(', ');
        });
        return;
      }

      const newTheme = { ...validationResult.theme, isBuiltIn: false };

      // Check for duplicate ID
      if (get().customThemes.some(t => t.id === newTheme.id)) {
        set(state => {
          state.error = `A theme with ID "${newTheme.id}" is already installed`;
        });
        return;
      }

      // Check for collision with built-in themes
      if (isBuiltInTheme(newTheme.id)) {
        set(state => {
          state.error = `Theme ID "${newTheme.id}" conflicts with a built-in theme`;
        });
        return;
      }

      // Optimistic update
      set(state => {
        state.customThemes.push(newTheme);
        state.themes = [...BUILT_IN_THEMES, ...state.customThemes];
        state.error = null;
      });

      // Persist to settings
      try {
        const customThemes = get().customThemes;
        await settingsCommands.set(
          THEME_SETTINGS_KEYS.CUSTOM_THEMES,
          JSON.stringify(customThemes)
        );
      } catch (error) {
        // Rollback on error
        set(state => {
          state.customThemes = state.customThemes.filter(t => t.id !== newTheme.id);
          state.themes = [...BUILT_IN_THEMES, ...state.customThemes];
          state.error = error instanceof Error ? error.message : String(error);
        });
      }
    },

    uninstallTheme: async (themeId: string) => {
      // Cannot uninstall built-in themes
      if (isBuiltInTheme(themeId)) {
        set(state => {
          state.error = 'Cannot uninstall built-in themes';
        });
        return;
      }

      const themeToRemove = get().customThemes.find(t => t.id === themeId);
      if (!themeToRemove) {
        set(state => {
          state.error = `Theme "${themeId}" not found`;
        });
        return;
      }

      const wasActive = get().activeThemeId === themeId;

      // Optimistic update
      set(state => {
        state.customThemes = state.customThemes.filter(t => t.id !== themeId);
        state.themes = [...BUILT_IN_THEMES, ...state.customThemes];

        // Switch to default theme if the removed theme was active
        if (wasActive) {
          state.activeThemeId = DEFAULT_THEME_ID;
        }
        state.error = null;
      });

      // Apply default theme if needed
      if (wasActive) {
        const defaultTheme = BUILT_IN_THEMES.find(t => t.id === DEFAULT_THEME_ID);
        if (defaultTheme) {
          applyThemeToDocument(defaultTheme);
        }
      }

      // Persist to settings
      try {
        const customThemes = get().customThemes;
        await settingsCommands.set(
          THEME_SETTINGS_KEYS.CUSTOM_THEMES,
          JSON.stringify(customThemes)
        );

        if (wasActive) {
          await settingsCommands.set(THEME_SETTINGS_KEYS.ACTIVE_THEME, DEFAULT_THEME_ID);
        }
      } catch (error) {
        // Rollback on error
        set(state => {
          state.customThemes.push(themeToRemove);
          state.themes = [...BUILT_IN_THEMES, ...state.customThemes];

          if (wasActive) {
            state.activeThemeId = themeId;
          }

          state.error = error instanceof Error ? error.message : String(error);
        });

        // Revert theme if needed
        if (wasActive) {
          applyThemeToDocument(themeToRemove);
        }
      }
    },

    validateThemeImport: (data: unknown): ThemeValidationResult => {
      return validateTheme(data);
    },

    applyTheme: (theme: ThemeDefinition) => {
      applyThemeToDocument(theme);
    },

    getTheme: (themeId: string): ThemeDefinition | undefined => {
      return get().themes.find(t => t.id === themeId);
    },

    clearError: () => {
      set(state => {
        state.error = null;
      });
    },
  }))
);

// Selector helpers
// Note: These selectors return values directly from state to ensure stable references.
// The themes array is already separated into built-in and custom in the store,
// so we use state.customThemes directly rather than filtering state.themes.

export const selectActiveTheme = (state: ThemeStore): ThemeDefinition | undefined => {
  return state.themes.find(t => t.id === state.activeThemeId);
};

export const selectActiveThemeId = (state: ThemeStore): string => {
  return state.activeThemeId;
};

export const selectThemes = (state: ThemeStore): ThemeDefinition[] => {
  return state.themes;
};

export const selectCustomThemes = (state: ThemeStore): ThemeDefinition[] => {
  return state.customThemes;
};

// Note: selectBuiltInThemes uses filter() which creates a new array on each call.
// This is acceptable for infrequent use, but components that re-render often
// should use selectThemes and filter in a useMemo instead.
export const selectBuiltInThemes = (state: ThemeStore): ThemeDefinition[] => {
  return state.themes.filter(t => t.isBuiltIn);
};
