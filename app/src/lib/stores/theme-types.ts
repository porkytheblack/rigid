import { z } from 'zod';

/**
 * Hex color validation regex - matches 6-character hex codes with # prefix
 */
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

/**
 * Zod schema for validating hex color strings
 */
export const hexColorSchema = z
  .string()
  .regex(hexColorRegex, 'Must be a valid hex color (e.g., #FFFFFF)');

/**
 * Theme color palette schema - defines all semantic colors required for a theme.
 * These colors map to CSS custom properties used throughout the application.
 */
export const themeColorsSchema = z.object({
  // Surface colors - backgrounds and containers
  surfacePrimary: hexColorSchema,
  surfaceSecondary: hexColorSchema,
  surfaceElevated: hexColorSchema.optional(),
  surfaceHover: hexColorSchema.optional(),
  surfaceActive: hexColorSchema.optional(),

  // Text colors
  textPrimary: hexColorSchema,
  textSecondary: hexColorSchema,
  textTertiary: hexColorSchema.optional(),
  textInverse: hexColorSchema.optional(),

  // Border colors
  borderDefault: hexColorSchema,
  borderStrong: hexColorSchema.optional(),
  borderSubtle: hexColorSchema.optional(),
  borderFocus: hexColorSchema.optional(),

  // Accent colors
  accent: hexColorSchema,
  accentHover: hexColorSchema.optional(),
  accentInteractive: hexColorSchema.optional(),

  // Status colors (optional - will use defaults if not provided)
  accentSuccess: hexColorSchema.optional(),
  accentWarning: hexColorSchema.optional(),
  accentError: hexColorSchema.optional(),
  accentInfo: hexColorSchema.optional(),
});

/**
 * Theme definition schema - the complete structure of a theme
 */
export const themeDefinitionSchema = z.object({
  id: z
    .string()
    .min(1, 'Theme ID is required')
    .max(50, 'Theme ID must be 50 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Theme ID must be lowercase alphanumeric with hyphens only'),
  name: z
    .string()
    .min(1, 'Theme name is required')
    .max(50, 'Theme name must be 50 characters or less'),
  description: z.string().max(200, 'Description must be 200 characters or less').optional(),
  author: z.string().max(100, 'Author must be 100 characters or less').optional(),
  version: z.string().max(20, 'Version must be 20 characters or less').optional(),
  colors: themeColorsSchema,
  isBuiltIn: z.boolean().optional(),
});

/**
 * Schema for theme JSON files that users can import.
 * More lenient than internal schema - generates ID from name if not provided.
 */
export const themeImportSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: z.string().min(1, 'Theme name is required').max(50),
  description: z.string().max(200).optional(),
  author: z.string().max(100).optional(),
  version: z.string().max(20).optional(),
  colors: themeColorsSchema,
});

// Type exports derived from Zod schemas
export type ThemeColors = z.infer<typeof themeColorsSchema>;
export type ThemeDefinition = z.infer<typeof themeDefinitionSchema>;
export type ThemeImport = z.infer<typeof themeImportSchema>;

/**
 * Result of theme validation
 */
export interface ThemeValidationResult {
  valid: boolean;
  errors: ThemeValidationError[];
  theme?: ThemeDefinition;
}

/**
 * Individual validation error with field path and message
 */
export interface ThemeValidationError {
  field: string;
  message: string;
}

/**
 * Theme store state
 */
export interface ThemeState {
  /** Currently active theme ID */
  activeThemeId: string;
  /** All available themes (built-in + custom) */
  themes: ThemeDefinition[];
  /** Custom themes installed by user */
  customThemes: ThemeDefinition[];
  /** Whether theme system has been initialized */
  initialized: boolean;
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Theme store actions
 */
export interface ThemeActions {
  /** Initialize theme system, loading persisted settings */
  initialize: () => Promise<void>;
  /** Set the active theme by ID */
  setTheme: (themeId: string) => Promise<void>;
  /** Install a custom theme from a theme definition */
  installTheme: (theme: ThemeDefinition) => Promise<void>;
  /** Uninstall a custom theme by ID */
  uninstallTheme: (themeId: string) => Promise<void>;
  /** Validate a theme import and return result */
  validateThemeImport: (data: unknown) => ThemeValidationResult;
  /** Apply theme CSS variables to document */
  applyTheme: (theme: ThemeDefinition) => void;
  /** Get a theme by ID */
  getTheme: (themeId: string) => ThemeDefinition | undefined;
  /** Clear any error state */
  clearError: () => void;
}

/**
 * Complete theme store type
 */
export type ThemeStore = ThemeState & ThemeActions;

/**
 * Settings keys for theme persistence
 */
export const THEME_SETTINGS_KEYS = {
  ACTIVE_THEME: 'theme.active',
  CUSTOM_THEMES: 'theme.custom',
} as const;

/**
 * Default theme ID
 */
export const DEFAULT_THEME_ID = 'dark';
