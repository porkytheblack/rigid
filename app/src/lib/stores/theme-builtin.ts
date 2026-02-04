import type { ThemeDefinition } from './theme-types';

/**
 * Light theme - Clean, bright interface for daytime use
 * Based on the existing light mode CSS variables in tokens.css
 */
export const lightTheme: ThemeDefinition = {
  id: 'light',
  name: 'Light',
  description: 'Clean, bright interface for daytime use',
  isBuiltIn: true,
  colors: {
    // Surface colors
    surfacePrimary: '#FFFFFF',
    surfaceSecondary: '#F7F7F7',
    surfaceElevated: '#FFFFFF',
    surfaceHover: '#F0F0F0',
    surfaceActive: '#E8E8E8',

    // Text colors
    textPrimary: '#0A0A0A',
    textSecondary: '#525252',
    textTertiary: '#8C8C8C',
    textInverse: '#FFFFFF',

    // Border colors
    borderDefault: '#E0E0E0',
    borderStrong: '#0A0A0A',
    borderSubtle: '#EBEBEB',
    borderFocus: '#A3A3A3',

    // Accent colors
    accent: '#0A0A0A',
    accentHover: '#262626',
    accentInteractive: '#2563EB',

    // Status colors
    accentSuccess: '#16A34A',
    accentWarning: '#CA8A04',
    accentError: '#DC2626',
    accentInfo: '#0EA5E9',
  },
};

/**
 * Dark theme - Default dark theme with sharp contrasts
 * Based on the existing dark mode CSS variables in tokens.css (root defaults)
 */
export const darkTheme: ThemeDefinition = {
  id: 'dark',
  name: 'Dark',
  description: 'Default dark theme with sharp contrasts',
  isBuiltIn: true,
  colors: {
    // Surface colors
    surfacePrimary: '#0A0A0A',
    surfaceSecondary: '#141414',
    surfaceElevated: '#1A1A1A',
    surfaceHover: '#1F1F1F',
    surfaceActive: '#262626',

    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textTertiary: '#737373',
    textInverse: '#0A0A0A',

    // Border colors
    borderDefault: '#2A2A2A',
    borderStrong: '#FFFFFF',
    borderSubtle: '#1F1F1F',
    borderFocus: '#525252',

    // Accent colors
    accent: '#FFFFFF',
    accentHover: '#E5E5E5',
    accentInteractive: '#2563EB',

    // Status colors
    accentSuccess: '#16A34A',
    accentWarning: '#CA8A04',
    accentError: '#DC2626',
    accentInfo: '#0EA5E9',
  },
};

/**
 * Gruvbox theme - Retro groove with warm, earthy tones
 * Inspired by the popular Gruvbox color scheme
 * https://github.com/morhetz/gruvbox
 */
export const gruvboxTheme: ThemeDefinition = {
  id: 'gruvbox',
  name: 'Gruvbox',
  description: 'Retro groove with warm, earthy tones',
  isBuiltIn: true,
  colors: {
    // Surface colors - Gruvbox dark background palette
    surfacePrimary: '#282828',
    surfaceSecondary: '#3c3836',
    surfaceElevated: '#504945',
    surfaceHover: '#504945',
    surfaceActive: '#665c54',

    // Text colors - Gruvbox foreground palette
    textPrimary: '#ebdbb2',
    textSecondary: '#a89984',
    textTertiary: '#928374',
    textInverse: '#282828',

    // Border colors
    borderDefault: '#504945',
    borderStrong: '#ebdbb2',
    borderSubtle: '#3c3836',
    borderFocus: '#a89984',

    // Accent colors - Gruvbox orange
    accent: '#fe8019',
    accentHover: '#d65d0e',
    accentInteractive: '#83a598',

    // Status colors - Gruvbox palette
    accentSuccess: '#b8bb26',
    accentWarning: '#fabd2f',
    accentError: '#fb4934',
    accentInfo: '#83a598',
  },
};

/**
 * Tokyo Night theme - Inspired by the lights of Tokyo at night
 * Based on the popular Tokyo Night VS Code theme
 * https://github.com/enkia/tokyo-night-vscode-theme
 */
export const tokyoNightTheme: ThemeDefinition = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  description: 'Inspired by the lights of Tokyo at night',
  isBuiltIn: true,
  colors: {
    // Surface colors - Tokyo Night background palette
    surfacePrimary: '#1a1b26',
    surfaceSecondary: '#24283b',
    surfaceElevated: '#414868',
    surfaceHover: '#292e42',
    surfaceActive: '#33467c',

    // Text colors - Tokyo Night foreground palette
    textPrimary: '#c0caf5',
    textSecondary: '#565f89',
    textTertiary: '#414868',
    textInverse: '#1a1b26',

    // Border colors
    borderDefault: '#3b4261',
    borderStrong: '#c0caf5',
    borderSubtle: '#292e42',
    borderFocus: '#7aa2f7',

    // Accent colors - Tokyo Night blue
    accent: '#7aa2f7',
    accentHover: '#7dcfff',
    accentInteractive: '#7aa2f7',

    // Status colors - Tokyo Night palette
    accentSuccess: '#9ece6a',
    accentWarning: '#e0af68',
    accentError: '#f7768e',
    accentInfo: '#7dcfff',
  },
};

/**
 * Catppuccin Mocha - Soothing pastel dark theme
 * https://github.com/catppuccin/catppuccin
 */
export const catppuccinMochaTheme: ThemeDefinition = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  description: 'Soothing pastel dark theme with warm colors',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#1e1e2e',
    surfaceSecondary: '#313244',
    surfaceElevated: '#45475a',
    surfaceHover: '#45475a',
    surfaceActive: '#585b70',

    textPrimary: '#cdd6f4',
    textSecondary: '#a6adc8',
    textTertiary: '#6c7086',
    textInverse: '#1e1e2e',

    borderDefault: '#45475a',
    borderStrong: '#cdd6f4',
    borderSubtle: '#313244',
    borderFocus: '#89b4fa',

    accent: '#cba6f7',
    accentHover: '#b4befe',
    accentInteractive: '#89b4fa',

    accentSuccess: '#a6e3a1',
    accentWarning: '#f9e2af',
    accentError: '#f38ba8',
    accentInfo: '#89dceb',
  },
};

/**
 * Catppuccin Latte - Soothing pastel light theme
 * https://github.com/catppuccin/catppuccin
 */
export const catppuccinLatteTheme: ThemeDefinition = {
  id: 'catppuccin-latte',
  name: 'Catppuccin Latte',
  description: 'Soothing pastel light theme with warm colors',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#eff1f5',
    surfaceSecondary: '#e6e9ef',
    surfaceElevated: '#dce0e8',
    surfaceHover: '#ccd0da',
    surfaceActive: '#bcc0cc',

    textPrimary: '#4c4f69',
    textSecondary: '#6c6f85',
    textTertiary: '#8c8fa1',
    textInverse: '#eff1f5',

    borderDefault: '#ccd0da',
    borderStrong: '#4c4f69',
    borderSubtle: '#dce0e8',
    borderFocus: '#1e66f5',

    accent: '#8839ef',
    accentHover: '#7287fd',
    accentInteractive: '#1e66f5',

    accentSuccess: '#40a02b',
    accentWarning: '#df8e1d',
    accentError: '#d20f39',
    accentInfo: '#04a5e5',
  },
};

/**
 * Dracula - Dark theme with vivid purple and pink accents
 * https://github.com/dracula/dracula-theme
 */
export const draculaTheme: ThemeDefinition = {
  id: 'dracula',
  name: 'Dracula',
  description: 'Dark theme with vivid purple and pink accents',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#282a36',
    surfaceSecondary: '#21222c',
    surfaceElevated: '#44475a',
    surfaceHover: '#44475a',
    surfaceActive: '#6272a4',

    textPrimary: '#f8f8f2',
    textSecondary: '#bfbfbf',
    textTertiary: '#6272a4',
    textInverse: '#282a36',

    borderDefault: '#44475a',
    borderStrong: '#f8f8f2',
    borderSubtle: '#21222c',
    borderFocus: '#bd93f9',

    accent: '#bd93f9',
    accentHover: '#ff79c6',
    accentInteractive: '#8be9fd',

    accentSuccess: '#50fa7b',
    accentWarning: '#f1fa8c',
    accentError: '#ff5555',
    accentInfo: '#8be9fd',
  },
};

/**
 * Nord - Arctic, north-bluish color palette
 * https://github.com/arcticicestudio/nord
 */
export const nordTheme: ThemeDefinition = {
  id: 'nord',
  name: 'Nord',
  description: 'Arctic, north-bluish color palette',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#2e3440',
    surfaceSecondary: '#3b4252',
    surfaceElevated: '#434c5e',
    surfaceHover: '#434c5e',
    surfaceActive: '#4c566a',

    textPrimary: '#eceff4',
    textSecondary: '#d8dee9',
    textTertiary: '#4c566a',
    textInverse: '#2e3440',

    borderDefault: '#4c566a',
    borderStrong: '#eceff4',
    borderSubtle: '#3b4252',
    borderFocus: '#88c0d0',

    accent: '#88c0d0',
    accentHover: '#81a1c1',
    accentInteractive: '#5e81ac',

    accentSuccess: '#a3be8c',
    accentWarning: '#ebcb8b',
    accentError: '#bf616a',
    accentInfo: '#b48ead',
  },
};

/**
 * One Dark - Atom's iconic dark theme
 * https://github.com/atom/one-dark-syntax
 */
export const oneDarkTheme: ThemeDefinition = {
  id: 'one-dark',
  name: 'One Dark',
  description: 'Atom editor iconic dark theme',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#282c34',
    surfaceSecondary: '#21252b',
    surfaceElevated: '#2c323c',
    surfaceHover: '#3a3f4b',
    surfaceActive: '#4d5566',

    textPrimary: '#abb2bf',
    textSecondary: '#828997',
    textTertiary: '#5c6370',
    textInverse: '#282c34',

    borderDefault: '#3a3f4b',
    borderStrong: '#abb2bf',
    borderSubtle: '#21252b',
    borderFocus: '#528bff',

    accent: '#61afef',
    accentHover: '#528bff',
    accentInteractive: '#528bff',

    accentSuccess: '#98c379',
    accentWarning: '#e5c07b',
    accentError: '#e06c75',
    accentInfo: '#56b6c2',
  },
};

/**
 * One Light - Atom's iconic light theme
 * https://github.com/atom/one-light-syntax
 */
export const oneLightTheme: ThemeDefinition = {
  id: 'one-light',
  name: 'One Light',
  description: 'Atom editor iconic light theme',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#fafafa',
    surfaceSecondary: '#f0f0f0',
    surfaceElevated: '#e5e5e6',
    surfaceHover: '#dbdbdc',
    surfaceActive: '#d0d0d0',

    textPrimary: '#383a42',
    textSecondary: '#696c77',
    textTertiary: '#a0a1a7',
    textInverse: '#fafafa',

    borderDefault: '#d0d0d0',
    borderStrong: '#383a42',
    borderSubtle: '#e5e5e6',
    borderFocus: '#4078f2',

    accent: '#4078f2',
    accentHover: '#526fff',
    accentInteractive: '#4078f2',

    accentSuccess: '#50a14f',
    accentWarning: '#c18401',
    accentError: '#e45649',
    accentInfo: '#0184bc',
  },
};

/**
 * Solarized Dark - Precision colors for machines and people
 * https://github.com/altercation/solarized
 */
export const solarizedDarkTheme: ThemeDefinition = {
  id: 'solarized-dark',
  name: 'Solarized Dark',
  description: 'Precision colors designed for readability',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#002b36',
    surfaceSecondary: '#073642',
    surfaceElevated: '#094552',
    surfaceHover: '#0b5466',
    surfaceActive: '#586e75',

    textPrimary: '#839496',
    textSecondary: '#657b83',
    textTertiary: '#586e75',
    textInverse: '#002b36',

    borderDefault: '#094552',
    borderStrong: '#839496',
    borderSubtle: '#073642',
    borderFocus: '#268bd2',

    accent: '#268bd2',
    accentHover: '#2aa198',
    accentInteractive: '#268bd2',

    accentSuccess: '#859900',
    accentWarning: '#b58900',
    accentError: '#dc322f',
    accentInfo: '#2aa198',
  },
};

/**
 * Solarized Light - Precision colors for machines and people
 * https://github.com/altercation/solarized
 */
export const solarizedLightTheme: ThemeDefinition = {
  id: 'solarized-light',
  name: 'Solarized Light',
  description: 'Precision colors designed for readability',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#fdf6e3',
    surfaceSecondary: '#eee8d5',
    surfaceElevated: '#e4ddc8',
    surfaceHover: '#d9d2bd',
    surfaceActive: '#93a1a1',

    textPrimary: '#657b83',
    textSecondary: '#839496',
    textTertiary: '#93a1a1',
    textInverse: '#fdf6e3',

    borderDefault: '#d9d2bd',
    borderStrong: '#657b83',
    borderSubtle: '#eee8d5',
    borderFocus: '#268bd2',

    accent: '#268bd2',
    accentHover: '#2aa198',
    accentInteractive: '#268bd2',

    accentSuccess: '#859900',
    accentWarning: '#b58900',
    accentError: '#dc322f',
    accentInfo: '#2aa198',
  },
};

/**
 * Monokai - Classic vibrant dark theme
 * https://monokai.pro/
 */
export const monokaiTheme: ThemeDefinition = {
  id: 'monokai',
  name: 'Monokai',
  description: 'Classic vibrant dark theme with bold colors',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#272822',
    surfaceSecondary: '#1e1f1c',
    surfaceElevated: '#3e3d32',
    surfaceHover: '#49483e',
    surfaceActive: '#75715e',

    textPrimary: '#f8f8f2',
    textSecondary: '#cfcfc2',
    textTertiary: '#75715e',
    textInverse: '#272822',

    borderDefault: '#49483e',
    borderStrong: '#f8f8f2',
    borderSubtle: '#3e3d32',
    borderFocus: '#66d9ef',

    accent: '#f92672',
    accentHover: '#fd5ff0',
    accentInteractive: '#66d9ef',

    accentSuccess: '#a6e22e',
    accentWarning: '#e6db74',
    accentError: '#f92672',
    accentInfo: '#66d9ef',
  },
};

/**
 * GitHub Dark - GitHub's official dark theme
 * https://github.com/primer/github-vscode-theme
 */
export const githubDarkTheme: ThemeDefinition = {
  id: 'github-dark',
  name: 'GitHub Dark',
  description: 'GitHub official dark theme',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#0d1117',
    surfaceSecondary: '#161b22',
    surfaceElevated: '#21262d',
    surfaceHover: '#30363d',
    surfaceActive: '#484f58',

    textPrimary: '#c9d1d9',
    textSecondary: '#8b949e',
    textTertiary: '#6e7681',
    textInverse: '#0d1117',

    borderDefault: '#30363d',
    borderStrong: '#c9d1d9',
    borderSubtle: '#21262d',
    borderFocus: '#58a6ff',

    accent: '#58a6ff',
    accentHover: '#79c0ff',
    accentInteractive: '#58a6ff',

    accentSuccess: '#3fb950',
    accentWarning: '#d29922',
    accentError: '#f85149',
    accentInfo: '#58a6ff',
  },
};

/**
 * GitHub Light - GitHub's official light theme
 * https://github.com/primer/github-vscode-theme
 */
export const githubLightTheme: ThemeDefinition = {
  id: 'github-light',
  name: 'GitHub Light',
  description: 'GitHub official light theme',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#ffffff',
    surfaceSecondary: '#f6f8fa',
    surfaceElevated: '#eaeef2',
    surfaceHover: '#dbe0e5',
    surfaceActive: '#d0d7de',

    textPrimary: '#24292f',
    textSecondary: '#57606a',
    textTertiary: '#8c959f',
    textInverse: '#ffffff',

    borderDefault: '#d0d7de',
    borderStrong: '#24292f',
    borderSubtle: '#eaeef2',
    borderFocus: '#0969da',

    accent: '#0969da',
    accentHover: '#0550ae',
    accentInteractive: '#0969da',

    accentSuccess: '#1a7f37',
    accentWarning: '#9a6700',
    accentError: '#cf222e',
    accentInfo: '#0969da',
  },
};

/**
 * Material Dark - Material Design inspired dark theme
 * https://github.com/material-theme/vsc-material-theme
 */
export const materialDarkTheme: ThemeDefinition = {
  id: 'material-dark',
  name: 'Material Dark',
  description: 'Material Design inspired dark theme',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#212121',
    surfaceSecondary: '#1a1a1a',
    surfaceElevated: '#303030',
    surfaceHover: '#3c3c3c',
    surfaceActive: '#525252',

    textPrimary: '#eeffff',
    textSecondary: '#b0bec5',
    textTertiary: '#546e7a',
    textInverse: '#212121',

    borderDefault: '#424242',
    borderStrong: '#eeffff',
    borderSubtle: '#303030',
    borderFocus: '#80cbc4',

    accent: '#80cbc4',
    accentHover: '#64ffda',
    accentInteractive: '#82aaff',

    accentSuccess: '#c3e88d',
    accentWarning: '#ffcb6b',
    accentError: '#ff5370',
    accentInfo: '#82aaff',
  },
};

/**
 * Material Light - Material Design inspired light theme
 * https://github.com/material-theme/vsc-material-theme
 */
export const materialLightTheme: ThemeDefinition = {
  id: 'material-light',
  name: 'Material Light',
  description: 'Material Design inspired light theme',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#fafafa',
    surfaceSecondary: '#f5f5f5',
    surfaceElevated: '#eeeeee',
    surfaceHover: '#e0e0e0',
    surfaceActive: '#bdbdbd',

    textPrimary: '#212121',
    textSecondary: '#727272',
    textTertiary: '#9e9e9e',
    textInverse: '#fafafa',

    borderDefault: '#e0e0e0',
    borderStrong: '#212121',
    borderSubtle: '#eeeeee',
    borderFocus: '#00897b',

    accent: '#00897b',
    accentHover: '#00695c',
    accentInteractive: '#1976d2',

    accentSuccess: '#558b2f',
    accentWarning: '#f57c00',
    accentError: '#e53935',
    accentInfo: '#1976d2',
  },
};

/**
 * Ayu Dark - Modern dark theme with subtle accents
 * https://github.com/ayu-theme/ayu-colors
 */
export const ayuDarkTheme: ThemeDefinition = {
  id: 'ayu-dark',
  name: 'Ayu Dark',
  description: 'Modern dark theme with subtle orange accents',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#0d1017',
    surfaceSecondary: '#131721',
    surfaceElevated: '#1c212b',
    surfaceHover: '#252b35',
    surfaceActive: '#2e3440',

    textPrimary: '#bfbdb6',
    textSecondary: '#8a8a8a',
    textTertiary: '#565b66',
    textInverse: '#0d1017',

    borderDefault: '#2a2f3a',
    borderStrong: '#bfbdb6',
    borderSubtle: '#1c212b',
    borderFocus: '#e6b450',

    accent: '#ffb454',
    accentHover: '#ff9940',
    accentInteractive: '#59c2ff',

    accentSuccess: '#7fd962',
    accentWarning: '#ffb454',
    accentError: '#d95757',
    accentInfo: '#59c2ff',
  },
};

/**
 * Ayu Light - Modern light theme with subtle accents
 * https://github.com/ayu-theme/ayu-colors
 */
export const ayuLightTheme: ThemeDefinition = {
  id: 'ayu-light',
  name: 'Ayu Light',
  description: 'Modern light theme with subtle orange accents',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#fcfcfc',
    surfaceSecondary: '#f3f4f5',
    surfaceElevated: '#e8e9eb',
    surfaceHover: '#dfe0e2',
    surfaceActive: '#d4d5d8',

    textPrimary: '#5c6166',
    textSecondary: '#8a9199',
    textTertiary: '#acb2be',
    textInverse: '#fcfcfc',

    borderDefault: '#dfe0e2',
    borderStrong: '#5c6166',
    borderSubtle: '#e8e9eb',
    borderFocus: '#fa8d3e',

    accent: '#fa8d3e',
    accentHover: '#f28021',
    accentInteractive: '#399ee6',

    accentSuccess: '#6cbf43',
    accentWarning: '#fa8d3e',
    accentError: '#f07171',
    accentInfo: '#399ee6',
  },
};

/**
 * Rose Pine - All natural pine, faux fur and a bit of soho vibes
 * https://github.com/rose-pine/rose-pine-theme
 */
export const rosePineTheme: ThemeDefinition = {
  id: 'rose-pine',
  name: 'Rose Pine',
  description: 'Soho vibes with muted rose and pine tones',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#191724',
    surfaceSecondary: '#1f1d2e',
    surfaceElevated: '#26233a',
    surfaceHover: '#2a273f',
    surfaceActive: '#393552',

    textPrimary: '#e0def4',
    textSecondary: '#908caa',
    textTertiary: '#6e6a86',
    textInverse: '#191724',

    borderDefault: '#393552',
    borderStrong: '#e0def4',
    borderSubtle: '#26233a',
    borderFocus: '#c4a7e7',

    accent: '#c4a7e7',
    accentHover: '#ebbcba',
    accentInteractive: '#9ccfd8',

    accentSuccess: '#31748f',
    accentWarning: '#f6c177',
    accentError: '#eb6f92',
    accentInfo: '#9ccfd8',
  },
};

/**
 * Rose Pine Dawn - Light variant of Rose Pine
 * https://github.com/rose-pine/rose-pine-theme
 */
export const rosePineDawnTheme: ThemeDefinition = {
  id: 'rose-pine-dawn',
  name: 'Rose Pine Dawn',
  description: 'Light variant with muted rose and pine tones',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#faf4ed',
    surfaceSecondary: '#fffaf3',
    surfaceElevated: '#f2e9e1',
    surfaceHover: '#e4dfde',
    surfaceActive: '#d7d3d0',

    textPrimary: '#575279',
    textSecondary: '#797593',
    textTertiary: '#9893a5',
    textInverse: '#faf4ed',

    borderDefault: '#dfdad9',
    borderStrong: '#575279',
    borderSubtle: '#f2e9e1',
    borderFocus: '#907aa9',

    accent: '#907aa9',
    accentHover: '#d7827e',
    accentInteractive: '#56949f',

    accentSuccess: '#286983',
    accentWarning: '#ea9d34',
    accentError: '#b4637a',
    accentInfo: '#56949f',
  },
};

/**
 * Everforest Dark - Comfortable and pleasant green forest theme
 * https://github.com/sainnhe/everforest
 */
export const everforestDarkTheme: ThemeDefinition = {
  id: 'everforest-dark',
  name: 'Everforest Dark',
  description: 'Comfortable green forest theme inspired by nature',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#2d353b',
    surfaceSecondary: '#343f44',
    surfaceElevated: '#3d484d',
    surfaceHover: '#475258',
    surfaceActive: '#4f5b58',

    textPrimary: '#d3c6aa',
    textSecondary: '#9da9a0',
    textTertiary: '#7a8478',
    textInverse: '#2d353b',

    borderDefault: '#4f5b58',
    borderStrong: '#d3c6aa',
    borderSubtle: '#3d484d',
    borderFocus: '#a7c080',

    accent: '#a7c080',
    accentHover: '#83c092',
    accentInteractive: '#7fbbb3',

    accentSuccess: '#a7c080',
    accentWarning: '#dbbc7f',
    accentError: '#e67e80',
    accentInfo: '#7fbbb3',
  },
};

/**
 * Everforest Light - Light variant of the forest theme
 * https://github.com/sainnhe/everforest
 */
export const everforestLightTheme: ThemeDefinition = {
  id: 'everforest-light',
  name: 'Everforest Light',
  description: 'Light green forest theme inspired by nature',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#fdf6e3',
    surfaceSecondary: '#f4f0d9',
    surfaceElevated: '#e5dfc5',
    surfaceHover: '#d8d3ba',
    surfaceActive: '#c9c5ae',

    textPrimary: '#5c6a72',
    textSecondary: '#829181',
    textTertiary: '#a6b0a0',
    textInverse: '#fdf6e3',

    borderDefault: '#d8d3ba',
    borderStrong: '#5c6a72',
    borderSubtle: '#e5dfc5',
    borderFocus: '#8da101',

    accent: '#8da101',
    accentHover: '#35a77c',
    accentInteractive: '#3a94c5',

    accentSuccess: '#8da101',
    accentWarning: '#dfa000',
    accentError: '#f85552',
    accentInfo: '#3a94c5',
  },
};

/**
 * Kanagawa - Dark theme inspired by famous painting by Katsushika Hokusai
 * https://github.com/rebelot/kanagawa.nvim
 */
export const kanagawaTheme: ThemeDefinition = {
  id: 'kanagawa',
  name: 'Kanagawa',
  description: 'Japanese art inspired dark theme with wave motifs',
  isBuiltIn: true,
  colors: {
    surfacePrimary: '#1f1f28',
    surfaceSecondary: '#16161d',
    surfaceElevated: '#2a2a37',
    surfaceHover: '#363646',
    surfaceActive: '#54546d',

    textPrimary: '#dcd7ba',
    textSecondary: '#c8c093',
    textTertiary: '#727169',
    textInverse: '#1f1f28',

    borderDefault: '#54546d',
    borderStrong: '#dcd7ba',
    borderSubtle: '#2a2a37',
    borderFocus: '#7e9cd8',

    accent: '#7e9cd8',
    accentHover: '#7fb4ca',
    accentInteractive: '#7e9cd8',

    accentSuccess: '#98bb6c',
    accentWarning: '#e6c384',
    accentError: '#ff5d62',
    accentInfo: '#7fb4ca',
  },
};

/**
 * All built-in themes
 */
export const BUILT_IN_THEMES: ThemeDefinition[] = [
  lightTheme,
  darkTheme,
  gruvboxTheme,
  tokyoNightTheme,
  catppuccinMochaTheme,
  catppuccinLatteTheme,
  draculaTheme,
  nordTheme,
  oneDarkTheme,
  oneLightTheme,
  solarizedDarkTheme,
  solarizedLightTheme,
  monokaiTheme,
  githubDarkTheme,
  githubLightTheme,
  materialDarkTheme,
  materialLightTheme,
  ayuDarkTheme,
  ayuLightTheme,
  rosePineTheme,
  rosePineDawnTheme,
  everforestDarkTheme,
  everforestLightTheme,
  kanagawaTheme,
];

/**
 * Get a built-in theme by ID
 */
export function getBuiltInTheme(id: string): ThemeDefinition | undefined {
  return BUILT_IN_THEMES.find(theme => theme.id === id);
}

/**
 * Check if a theme ID is a built-in theme
 */
export function isBuiltInTheme(id: string): boolean {
  return BUILT_IN_THEMES.some(theme => theme.id === id);
}
