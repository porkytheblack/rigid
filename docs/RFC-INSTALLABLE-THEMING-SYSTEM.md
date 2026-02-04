# RFC: Installable Theming System for Rigid Electron Application

## Status
Implemented

## Abstract

This RFC proposes a comprehensive theming system for the Rigid Electron/Tauri application that enables users to install, manage, and apply visual themes across the entire application. The system leverages the existing CSS custom properties architecture and settings storage infrastructure to provide a flexible, maintainable, and extensible theming solution with four built-in themes (Light, Dark, Gruvbox, Tokyo Night) and support for user-installed custom themes via JSON files.

## 1. Introduction

### 1.1 Problem Statement

The Rigid application currently implements a basic light/dark mode toggle using CSS custom properties defined in `tokens.css`. While functional, this approach has several limitations:

1. **Limited Theme Options**: Users can only choose between light and dark modes
2. **No Custom Theme Support**: Users cannot install or create their own themes
3. **Incomplete Theme Application**: The current implementation relies on `prefers-color-scheme` media queries and data attributes, but lacks a cohesive theme management system
4. **No Theme Persistence**: While a `THEME` settings key exists, there is no implemented mechanism for loading and applying themes on startup

### 1.2 Goals

1. Define a comprehensive JSON schema for theme files that covers all visual aspects of the application
2. Implement a theme management system that supports:
   - Loading built-in themes (Light, Dark, Gruvbox, Tokyo Night)
   - Installing custom themes from JSON files
   - Persisting theme selection across sessions
   - Real-time theme switching without page reload
3. Ensure themes apply consistently across all UI components
4. Provide theme validation to prevent invalid or malformed themes
5. Design the system for extensibility to accommodate future theme properties
6. Maintain backward compatibility with existing styling patterns

### 1.3 Non-Goals

1. Theme creation/editing UI (users will edit JSON files directly or use external tools)
2. Theme marketplace or distribution system
3. Per-component theme overrides (themes apply globally)
4. Animation customization beyond what CSS variables currently support
5. Font file bundling within themes (themes reference system or web fonts)

### 1.4 Success Criteria

1. All four built-in themes render correctly across all application views
2. Custom themes can be installed, validated, and applied within 100ms
3. Theme changes persist across application restarts
4. Invalid themes are rejected with clear error messages
5. No visual regression in existing UI components
6. Theme switching completes within 16ms (one frame at 60fps) for smooth UX

## 2. Background

### 2.1 Current State

The application currently uses:

**CSS Custom Properties Architecture** (`tokens.css`):
- Surface colors: `--surface-primary`, `--surface-secondary`, `--surface-elevated`, `--surface-hover`, `--surface-active`
- Text colors: `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-inverse`
- Border colors: `--border-default`, `--border-strong`, `--border-subtle`, `--border-focus`
- Accent colors: `--accent-primary`, `--accent-interactive`, `--accent-success`, `--accent-warning`, `--accent-error`, `--accent-info`
- Typography: Font families, sizes, weights, line heights, letter spacing
- Spacing, shadows, transitions, z-index values

**Tailwind CSS v4 Integration** (`globals.css`):
- Theme mapping via `@theme` block that references CSS custom properties
- Semantic color aliases: `--color-bg-*`, `--color-text-*`, `--color-border-*`, `--color-accent`, `--color-success`, etc.

**Settings Storage**:
- SQLite-based key-value store accessed via Tauri commands
- Zustand store (`useSettingsStore`) for frontend state management
- Settings key `THEME` defined but not actively used

**Light/Dark Mode**:
- Implemented via `[data-theme="light"]` selector and `prefers-color-scheme` media query
- Variables redefined for light mode in `tokens.css`

### 2.2 Terminology

| Term | Definition |
|------|------------|
| **Theme** | A complete collection of visual styling values (colors, typography, spacing) that define the application's appearance |
| **Built-in Theme** | A theme bundled with the application that cannot be deleted |
| **Custom Theme** | A user-installed theme loaded from a JSON file |
| **Theme Schema** | The JSON structure that defines all customizable properties |
| **Theme ID** | A unique identifier for each theme (slug format: `lowercase-with-dashes`) |
| **CSS Custom Property** | A CSS variable defined with `--property-name` syntax |
| **Semantic Color** | A color named by its purpose (e.g., "error") rather than its value (e.g., "red") |

### 2.3 Prior Art

| Solution | Approach | Pros | Cons |
|----------|----------|------|------|
| **VS Code Themes** | JSON color tokens with semantic naming | Extensive customization, large community | Complex schema, tied to editor semantics |
| **Tailwind CSS Themes** | CSS variables + config | Native CSS, performant | Requires build step for changes |
| **shadcn/ui** | CSS variables with HSL values | Simple, copy-paste | Limited to color palette |
| **Material Design** | Token-based design system | Comprehensive, accessible | Heavy, opinionated |

This RFC draws from VS Code's semantic color approach combined with Tailwind's CSS variable implementation, optimized for the existing Rigid architecture.

## 3. Algorithm Analysis

### 3.1 Candidate Approaches

#### 3.1.1 CSS Custom Property Injection

**Description**: Themes define CSS custom property values that are injected into a `<style>` element in the document head at runtime.

**Time Complexity**: O(n) where n = number of CSS properties
**Space Complexity**: O(n) for stored property values

**Advantages**:
- Native browser performance for style application
- No re-render required for React components
- Works with existing Tailwind classes
- Simple implementation

**Disadvantages**:
- Cannot customize properties not exposed as variables
- Style element management adds minor complexity

**Best Suited For**: Applications already using CSS custom properties extensively

#### 3.1.2 CSS-in-JS Theme Provider

**Description**: Use a React context provider that passes theme values to styled-components or similar libraries.

**Time Complexity**: O(n*m) where n = components, m = theme values accessed
**Space Complexity**: O(n*m) for component style recalculation

**Advantages**:
- Type-safe theme access
- Dynamic computation possible
- Component-level override capability

**Disadvantages**:
- Requires refactoring existing styles
- Performance overhead from re-renders
- Increases bundle size
- Not compatible with current Tailwind approach

**Best Suited For**: Greenfield projects or CSS-in-JS codebases

#### 3.1.3 CSS Class Switching

**Description**: Pre-compile multiple CSS bundles for each theme and switch between them by changing a class on the root element.

**Time Complexity**: O(1) for theme switch
**Space Complexity**: O(n*t) where t = number of themes (all themes loaded)

**Advantages**:
- Instant theme switching
- No runtime computation
- Browser caches CSS efficiently

**Disadvantages**:
- Larger initial bundle
- Cannot support unlimited custom themes
- Requires build step for new themes

**Best Suited For**: Applications with fixed, known theme set

#### 3.1.4 Hybrid: CSS Variables + JSON Schema (Selected)

**Description**: Combine CSS custom property injection with a JSON schema that maps theme values to CSS variables. Theme files define semantic tokens that are transformed into CSS custom properties.

**Time Complexity**: O(n) for initial load, O(1) for property access
**Space Complexity**: O(n) for active theme, O(t*n) for theme storage

**Advantages**:
- Extensible to unlimited custom themes
- Native performance after injection
- Type-safe schema validation
- Compatible with existing architecture
- Themes are human-readable JSON

**Disadvantages**:
- Initial parsing overhead (negligible for JSON size)
- Requires validation logic

**Best Suited For**: Flexible theming with custom theme support

### 3.2 Comparative Analysis

| Criterion | CSS Injection | CSS-in-JS | Class Switching | Hybrid (Selected) |
|-----------|--------------|-----------|-----------------|-------------------|
| Performance | Excellent | Poor | Excellent | Excellent |
| Extensibility | Good | Excellent | Poor | Excellent |
| Implementation Effort | Low | High | Medium | Medium |
| Custom Theme Support | Yes | Yes | No | Yes |
| Existing Code Compat | Excellent | Poor | Good | Excellent |
| Type Safety | None | Full | None | Schema-based |
| Bundle Size Impact | None | +50KB | +CSS per theme | +10KB |

### 3.3 Recommendation

**Selected Approach: Hybrid CSS Variables + JSON Schema**

This approach is optimal because:

1. **Architectural Fit**: The application already uses CSS custom properties extensively; this approach enhances rather than replaces the existing system
2. **Performance**: CSS variable updates are handled natively by the browser's style engine with optimal performance
3. **Extensibility**: JSON schema allows for unlimited custom themes while maintaining validation
4. **Minimal Refactoring**: No changes required to existing component styles that use CSS variables
5. **User Experience**: Theme changes are instantaneous (single `setProperty` batch update)
6. **Developer Experience**: JSON themes are easy to create, share, and validate

## 4. Detailed Design

### 4.1 Architecture Overview

```
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|  Theme JSON      |---->|  Theme Service    |---->|  CSS Variables   |
|  (File/Built-in) |     |  (Validation +    |     |  (Runtime        |
|                  |     |   Transformation) |     |   Injection)     |
+------------------+     +-------------------+     +------------------+
                                  |
                                  v
                         +------------------+
                         |                  |
                         |  Settings Store  |
                         |  (Persistence)   |
                         |                  |
                         +------------------+
```

**Data Flow**:
1. On application startup, Theme Service loads the persisted theme ID from Settings Store
2. Theme Service retrieves the theme definition (built-in or custom)
3. Theme definition is validated against the JSON schema
4. CSS custom properties are generated from the theme definition
5. Properties are injected into the document via a `<style>` element
6. When user changes theme, steps 3-5 repeat and new selection is persisted

### 4.2 Data Structures

#### 4.2.1 Theme JSON Schema

```typescript
/**
 * Complete theme definition structure.
 * All color values must be valid CSS color strings (hex, rgb, rgba, hsl, hsla).
 */
interface ThemeDefinition {
  /** Unique identifier (lowercase, alphanumeric, hyphens only) */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** Theme description */
  description?: string;

  /** Whether this is a built-in theme (cannot be deleted) */
  isBuiltIn?: boolean;

  /** Color palette definitions */
  colors: ThemeColors;
}

interface ThemeColors {
  /** Primary background (body, main content area) */
  surfacePrimary: string;
  /** Secondary background (cards, panels) */
  surfaceSecondary: string;
  /** Primary text (headings, body) */
  textPrimary: string;
  /** Secondary text (descriptions, captions) */
  textSecondary: string;
  /** Default border color */
  borderDefault: string;
  /** Accent color (brand, interactive) */
  accent: string;

  // Optional colors (auto-derived if not provided)
  surfaceElevated?: string;
  surfaceHover?: string;
  surfaceActive?: string;
  textTertiary?: string;
  textInverse?: string;
  borderStrong?: string;
  borderSubtle?: string;
  borderFocus?: string;
  accentHover?: string;
  accentMuted?: string;
  success?: string;
  successBg?: string;
  warning?: string;
  warningBg?: string;
  error?: string;
  errorBg?: string;
  info?: string;
  infoBg?: string;
}
```

### 4.3 Built-in Themes

#### Light Theme
```json
{
  "id": "light",
  "name": "Light",
  "description": "Clean light theme for daytime use",
  "isBuiltIn": true,
  "colors": {
    "surfacePrimary": "#FFFFFF",
    "surfaceSecondary": "#F7F7F7",
    "textPrimary": "#0A0A0A",
    "textSecondary": "#525252",
    "borderDefault": "#E0E0E0",
    "accent": "#2563EB"
  }
}
```

#### Dark Theme
```json
{
  "id": "dark",
  "name": "Dark",
  "description": "Default dark theme",
  "isBuiltIn": true,
  "colors": {
    "surfacePrimary": "#0A0A0A",
    "surfaceSecondary": "#141414",
    "textPrimary": "#FFFFFF",
    "textSecondary": "#A3A3A3",
    "borderDefault": "#2A2A2A",
    "accent": "#FFFFFF"
  }
}
```

#### Gruvbox Theme
```json
{
  "id": "gruvbox",
  "name": "Gruvbox",
  "description": "Retro groove color scheme with warm, earthy tones",
  "isBuiltIn": true,
  "colors": {
    "surfacePrimary": "#282828",
    "surfaceSecondary": "#3c3836",
    "textPrimary": "#ebdbb2",
    "textSecondary": "#d5c4a1",
    "borderDefault": "#504945",
    "accent": "#d79921"
  }
}
```

#### Tokyo Night Theme
```json
{
  "id": "tokyo-night",
  "name": "Tokyo Night",
  "description": "A clean theme inspired by Tokyo city lights at night",
  "isBuiltIn": true,
  "colors": {
    "surfacePrimary": "#1a1b26",
    "surfaceSecondary": "#24283b",
    "textPrimary": "#c0caf5",
    "textSecondary": "#a9b1d6",
    "borderDefault": "#414868",
    "accent": "#7aa2f7"
  }
}
```

### 4.4 Theme Store API

```typescript
interface ThemeState {
  /** Currently active theme ID */
  activeThemeId: string;

  /** All available themes (built-in + custom) */
  themes: ThemeDefinition[];

  /** User-installed custom themes */
  customThemes: ThemeDefinition[];

  /** Loading state */
  loading: boolean;

  /** Error message if theme operations fail */
  error: string | null;

  /** Whether the store has been initialized */
  initialized: boolean;
}

interface ThemeActions {
  /** Initialize theme system, load persisted theme */
  initialize: () => Promise<void>;

  /** Switch to a different theme */
  setTheme: (themeId: string) => void;

  /** Install a custom theme */
  installTheme: (theme: ThemeDefinition) => Promise<void>;

  /** Remove a custom theme */
  uninstallTheme: (themeId: string) => Promise<void>;

  /** Validate a theme import */
  validateThemeImport: (data: unknown) => ThemeValidationResult;

  /** Get a theme by ID */
  getTheme: (themeId: string) => ThemeDefinition | undefined;

  /** Clear error state */
  clearError: () => void;
}
```

### 4.5 React Hooks

```typescript
/** Initialize theme system at app root */
function useThemeInitializer(): void;

/** Main hook for theme state and actions */
function useTheme(): ThemeState & ThemeActions;

/** Hook for theme selector UI components */
function useThemeSelector(): {
  activeThemeId: string;
  themes: ThemeCardData[];
  customThemes: ThemeCardData[];
  onSelectTheme: (id: string) => void;
  onInstallTheme: (theme: ThemeImport) => Promise<void>;
  onDeleteTheme: (id: string) => Promise<void>;
  validateThemeImport: (data: unknown) => ThemeValidationResult;
};

/** Get current theme colors directly */
function useThemeColors(): ThemeColors | undefined;

/** Check if current theme is dark */
function useIsDarkTheme(): boolean;
```

## 5. Implementation Files

### Files Created

1. `app/src/lib/stores/theme-types.ts` - TypeScript interfaces and Zod schemas
2. `app/src/lib/stores/theme-builtin.ts` - Built-in theme definitions
3. `app/src/lib/stores/theme-utils.ts` - CSS generation and validation utilities
4. `app/src/lib/stores/theme.ts` - Zustand store for theme state
5. `app/src/hooks/useTheme.ts` - React hooks for theme access
6. `app/src/components/settings/ThemeCard.tsx` - Theme card component
7. `app/src/components/settings/ThemeSettings.tsx` - Theme settings section

### Files Modified

1. `app/src/lib/stores/index.ts` - Added theme exports
2. `app/src/components/layout/app-shell.tsx` - Added theme initialization
3. `app/src/views/SettingsView.tsx` - Added ThemeSettings component

## 6. Performance Characteristics

| Operation | Time Complexity | Expected Performance |
|-----------|----------------|---------------------|
| Theme validation | O(n) | ~2ms |
| CSS generation | O(n) | ~1ms |
| Theme application | O(1) | ~5ms |
| Theme switch total | O(n) | <16ms (60fps) |
| Initial theme load | O(n + file I/O) | ~50ms |

## 7. Custom Theme File Format

Users can create custom themes by creating a JSON file:

```json
{
  "name": "My Custom Theme",
  "description": "A beautiful custom theme",
  "colors": {
    "surfacePrimary": "#1e1e2e",
    "surfaceSecondary": "#313244",
    "textPrimary": "#cdd6f4",
    "textSecondary": "#a6adc8",
    "borderDefault": "#45475a",
    "accent": "#cba6f7"
  }
}
```

The `id` will be auto-generated from the name if not provided.

## 8. Security Considerations

1. **JSON Parsing**: Uses standard `JSON.parse()` which is safe against code injection
2. **CSS Injection**: Theme values are validated and only used as CSS property values
3. **Schema Validation**: All themes validated with Zod before application
4. **No Code Execution**: Theme files contain only data, no executable code

## 9. Future Enhancements

1. System theme option (follow OS preference)
2. Theme preview before applying
3. Theme export functionality
4. Code syntax highlighting theme integration
5. Theme sharing/marketplace

## 10. References

1. [CSS Custom Properties Specification](https://www.w3.org/TR/css-variables-1/)
2. [Gruvbox Color Scheme](https://github.com/morhetz/gruvbox)
3. [Tokyo Night Color Scheme](https://github.com/enkia/tokyo-night-vscode-theme)
