import { ZodError } from 'zod';
import {
  themeImportSchema,
  themeDefinitionSchema,
  hexColorSchema,
  type ThemeDefinition,
  type ThemeColors,
  type ThemeValidationResult,
  type ThemeValidationError,
} from './theme-types';
import { isBuiltInTheme } from './theme-builtin';

/**
 * Validates a hex color string
 */
export function isValidHexColor(color: string): boolean {
  return hexColorSchema.safeParse(color).success;
}

/**
 * Validates a theme import JSON and returns a validation result.
 * If valid, returns the normalized theme definition.
 */
export function validateTheme(data: unknown): ThemeValidationResult {
  // First try to parse as a theme import
  const importResult = themeImportSchema.safeParse(data);

  if (!importResult.success) {
    return {
      valid: false,
      errors: formatZodErrors(importResult.error),
    };
  }

  const importData = importResult.data;

  // Generate ID from name if not provided
  const id = importData.id || generateThemeId(importData.name);

  // Check for collision with built-in themes
  if (isBuiltInTheme(id)) {
    return {
      valid: false,
      errors: [
        {
          field: 'id',
          message: `Theme ID "${id}" conflicts with a built-in theme`,
        },
      ],
    };
  }

  // Create the full theme definition
  const theme: ThemeDefinition = {
    id,
    name: importData.name,
    description: importData.description,
    author: importData.author,
    version: importData.version,
    colors: importData.colors,
    isBuiltIn: false,
  };

  // Validate the full theme definition
  const definitionResult = themeDefinitionSchema.safeParse(theme);

  if (!definitionResult.success) {
    return {
      valid: false,
      errors: formatZodErrors(definitionResult.error),
    };
  }

  return {
    valid: true,
    errors: [],
    theme: definitionResult.data,
  };
}

/**
 * Generates a URL-safe ID from a theme name
 */
export function generateThemeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
}

/**
 * Formats Zod validation errors into a simpler format
 */
function formatZodErrors(error: ZodError): ThemeValidationError[] {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Generates CSS custom properties from a theme definition.
 * Returns a string of CSS that can be applied to :root or a style element.
 */
export function generateCSSFromTheme(theme: ThemeDefinition): string {
  const colors = theme.colors;
  const cssVars: string[] = [];

  // Surface colors
  cssVars.push(`--surface-primary: ${colors.surfacePrimary};`);
  cssVars.push(`--surface-secondary: ${colors.surfaceSecondary};`);
  if (colors.surfaceElevated) {
    cssVars.push(`--surface-elevated: ${colors.surfaceElevated};`);
  } else {
    cssVars.push(`--surface-elevated: ${lightenColor(colors.surfaceSecondary, 0.05)};`);
  }
  if (colors.surfaceHover) {
    cssVars.push(`--surface-hover: ${colors.surfaceHover};`);
  } else {
    cssVars.push(`--surface-hover: ${lightenColor(colors.surfaceSecondary, 0.03)};`);
  }
  if (colors.surfaceActive) {
    cssVars.push(`--surface-active: ${colors.surfaceActive};`);
  } else {
    cssVars.push(`--surface-active: ${lightenColor(colors.surfaceSecondary, 0.08)};`);
  }

  // Text colors
  cssVars.push(`--text-primary: ${colors.textPrimary};`);
  cssVars.push(`--text-secondary: ${colors.textSecondary};`);
  if (colors.textTertiary) {
    cssVars.push(`--text-tertiary: ${colors.textTertiary};`);
  } else {
    cssVars.push(`--text-tertiary: ${blendColors(colors.textSecondary, colors.surfacePrimary, 0.3)};`);
  }
  if (colors.textInverse) {
    cssVars.push(`--text-inverse: ${colors.textInverse};`);
  } else {
    cssVars.push(`--text-inverse: ${colors.surfacePrimary};`);
  }

  // Border colors
  cssVars.push(`--border-default: ${colors.borderDefault};`);
  if (colors.borderStrong) {
    cssVars.push(`--border-strong: ${colors.borderStrong};`);
  } else {
    cssVars.push(`--border-strong: ${colors.textPrimary};`);
  }
  if (colors.borderSubtle) {
    cssVars.push(`--border-subtle: ${colors.borderSubtle};`);
  } else {
    cssVars.push(`--border-subtle: ${blendColors(colors.borderDefault, colors.surfacePrimary, 0.5)};`);
  }
  if (colors.borderFocus) {
    cssVars.push(`--border-focus: ${colors.borderFocus};`);
  } else {
    cssVars.push(`--border-focus: ${colors.accent};`);
  }

  // Accent colors
  cssVars.push(`--accent-primary: ${colors.accent};`);
  if (colors.accentHover) {
    cssVars.push(`--accent-hover: ${colors.accentHover};`);
  } else {
    cssVars.push(`--accent-hover: ${lightenColor(colors.accent, 0.1)};`);
  }
  if (colors.accentInteractive) {
    cssVars.push(`--accent-interactive: ${colors.accentInteractive};`);
  } else {
    cssVars.push(`--accent-interactive: #2563EB;`);
  }
  cssVars.push(`--accent-muted: ${hexToRgba(colors.accent, 0.08)};`);

  // Status colors with defaults
  cssVars.push(`--accent-success: ${colors.accentSuccess || '#16A34A'};`);
  cssVars.push(`--accent-warning: ${colors.accentWarning || '#CA8A04'};`);
  cssVars.push(`--accent-error: ${colors.accentError || '#DC2626'};`);
  cssVars.push(`--accent-info: ${colors.accentInfo || '#0EA5E9'};`);

  // Status background colors
  cssVars.push(`--status-success-bg: ${hexToRgba(colors.accentSuccess || '#16A34A', 0.15)};`);
  cssVars.push(`--status-warning-bg: ${hexToRgba(colors.accentWarning || '#CA8A04', 0.15)};`);
  cssVars.push(`--status-error-bg: ${hexToRgba(colors.accentError || '#DC2626', 0.15)};`);
  cssVars.push(`--status-info-bg: ${hexToRgba(colors.accentInfo || '#0EA5E9', 0.15)};`);

  // Legacy compatibility aliases
  cssVars.push(`--bg-base: var(--surface-primary);`);
  cssVars.push(`--bg-surface: var(--surface-secondary);`);
  cssVars.push(`--bg-elevated: var(--surface-elevated);`);
  cssVars.push(`--bg-hover: var(--surface-hover);`);
  cssVars.push(`--bg-active: var(--surface-active);`);
  cssVars.push(`--bg-tertiary: var(--surface-active);`);
  cssVars.push(`--accent: var(--accent-primary);`);
  cssVars.push(`--status-success: var(--accent-success);`);
  cssVars.push(`--status-warning: var(--accent-warning);`);
  cssVars.push(`--status-error: var(--accent-error);`);
  cssVars.push(`--status-info: var(--accent-info);`);

  return cssVars.join('\n  ');
}

/**
 * Applies theme CSS variables directly to the document root
 */
export function applyThemeToDocument(theme: ThemeDefinition): void {
  const root = document.documentElement;
  const colors = theme.colors;

  // Surface colors
  root.style.setProperty('--surface-primary', colors.surfacePrimary);
  root.style.setProperty('--surface-secondary', colors.surfaceSecondary);
  root.style.setProperty('--surface-elevated', colors.surfaceElevated || lightenColor(colors.surfaceSecondary, 0.05));
  root.style.setProperty('--surface-hover', colors.surfaceHover || lightenColor(colors.surfaceSecondary, 0.03));
  root.style.setProperty('--surface-active', colors.surfaceActive || lightenColor(colors.surfaceSecondary, 0.08));

  // Text colors
  root.style.setProperty('--text-primary', colors.textPrimary);
  root.style.setProperty('--text-secondary', colors.textSecondary);
  root.style.setProperty('--text-tertiary', colors.textTertiary || blendColors(colors.textSecondary, colors.surfacePrimary, 0.3));
  root.style.setProperty('--text-inverse', colors.textInverse || colors.surfacePrimary);

  // Border colors
  root.style.setProperty('--border-default', colors.borderDefault);
  root.style.setProperty('--border-strong', colors.borderStrong || colors.textPrimary);
  root.style.setProperty('--border-subtle', colors.borderSubtle || blendColors(colors.borderDefault, colors.surfacePrimary, 0.5));
  root.style.setProperty('--border-focus', colors.borderFocus || colors.accent);

  // Accent colors
  root.style.setProperty('--accent-primary', colors.accent);
  root.style.setProperty('--accent-hover', colors.accentHover || lightenColor(colors.accent, 0.1));
  root.style.setProperty('--accent-interactive', colors.accentInteractive || '#2563EB');
  root.style.setProperty('--accent-muted', hexToRgba(colors.accent, 0.08));

  // Status colors
  root.style.setProperty('--accent-success', colors.accentSuccess || '#16A34A');
  root.style.setProperty('--accent-warning', colors.accentWarning || '#CA8A04');
  root.style.setProperty('--accent-error', colors.accentError || '#DC2626');
  root.style.setProperty('--accent-info', colors.accentInfo || '#0EA5E9');

  // Status backgrounds
  root.style.setProperty('--status-success-bg', hexToRgba(colors.accentSuccess || '#16A34A', 0.15));
  root.style.setProperty('--status-warning-bg', hexToRgba(colors.accentWarning || '#CA8A04', 0.15));
  root.style.setProperty('--status-error-bg', hexToRgba(colors.accentError || '#DC2626', 0.15));
  root.style.setProperty('--status-info-bg', hexToRgba(colors.accentInfo || '#0EA5E9', 0.15));

  // Legacy aliases (these reference the new variables)
  root.style.setProperty('--bg-base', 'var(--surface-primary)');
  root.style.setProperty('--bg-surface', 'var(--surface-secondary)');
  root.style.setProperty('--bg-elevated', 'var(--surface-elevated)');
  root.style.setProperty('--bg-hover', 'var(--surface-hover)');
  root.style.setProperty('--bg-active', 'var(--surface-active)');
  root.style.setProperty('--bg-tertiary', 'var(--surface-active)');
  root.style.setProperty('--accent', 'var(--accent-primary)');
  root.style.setProperty('--status-success', 'var(--accent-success)');
  root.style.setProperty('--status-warning', 'var(--accent-warning)');
  root.style.setProperty('--status-error', 'var(--accent-error)');
  root.style.setProperty('--status-info', 'var(--accent-info)');

  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme.id);
}

// ============================================
// Color utility functions
// ============================================

/**
 * Parse a hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0');
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex color to rgba string
 */
export function hexToRgba(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Lighten a hex color by a factor (0-1)
 */
export function lightenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb.r + (255 - rgb.r) * factor,
    rgb.g + (255 - rgb.g) * factor,
    rgb.b + (255 - rgb.b) * factor
  );
}

/**
 * Darken a hex color by a factor (0-1)
 */
export function darkenColor(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb.r * (1 - factor),
    rgb.g * (1 - factor),
    rgb.b * (1 - factor)
  );
}

/**
 * Blend two hex colors together
 */
export function blendColors(color1: string, color2: string, ratio: number): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return color1;

  return rgbToHex(
    rgb1.r * (1 - ratio) + rgb2.r * ratio,
    rgb1.g * (1 - ratio) + rgb2.g * ratio,
    rgb1.b * (1 - ratio) + rgb2.b * ratio
  );
}

/**
 * Calculate relative luminance of a color (for contrast calculations)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if a color is considered "light" (for determining text color)
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.179;
}

/**
 * Converts ThemeColors to the simpler format used by ThemeCard
 */
export function themeColorsToCardColors(colors: ThemeColors): {
  surfacePrimary: string;
  surfaceSecondary: string;
  textPrimary: string;
  textSecondary: string;
  borderDefault: string;
  accent: string;
} {
  return {
    surfacePrimary: colors.surfacePrimary,
    surfaceSecondary: colors.surfaceSecondary,
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    borderDefault: colors.borderDefault,
    accent: colors.accent,
  };
}
