// AI Model Configurations
import type { AIProvider } from '@/lib/tauri/types';

// =============================================================================
// Default Models by Provider
// =============================================================================

export const DEFAULT_MODELS: Record<AIProvider, string[]> = {
  anthropic: [
    'claude-sonnet-4-20250514',
    'claude-opus-4-0-20250514',
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'o1-preview',
    'o1-mini',
    'gpt-4-turbo',
  ],
  openrouter: [
    'anthropic/claude-sonnet-4',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o',
    'google/gemini-2.0-flash',
    'google/gemini-pro-1.5',
    'meta-llama/llama-3.3-70b-instruct',
  ],
  ollama: [], // Dynamically loaded from local Ollama instance
};

// =============================================================================
// Provider Display Info
// =============================================================================

export const PROVIDER_INFO: Record<AIProvider, { label: string; description: string }> = {
  ollama: {
    label: 'Ollama',
    description: 'Local AI inference (free, private)',
  },
  openrouter: {
    label: 'OpenRouter',
    description: 'Multiple models via unified API',
  },
  anthropic: {
    label: 'Anthropic',
    description: 'Claude models (recommended)',
  },
  openai: {
    label: 'OpenAI',
    description: 'GPT models',
  },
};

// =============================================================================
// Model Display Names
// =============================================================================

export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    // Anthropic
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-opus-4-0-20250514': 'Claude Opus 4',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    // OpenAI
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'o1-preview': 'o1 Preview',
    'o1-mini': 'o1 Mini',
    'gpt-4-turbo': 'GPT-4 Turbo',
    // OpenRouter
    'anthropic/claude-sonnet-4': 'Claude Sonnet 4',
    'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
    'openai/gpt-4o': 'GPT-4o',
    'google/gemini-2.0-flash': 'Gemini 2.0 Flash',
    'google/gemini-pro-1.5': 'Gemini Pro 1.5',
    'meta-llama/llama-3.3-70b-instruct': 'Llama 3.3 70B',
  };

  return displayNames[model] || model;
}

// =============================================================================
// Get Default Model for Provider
// =============================================================================

export function getDefaultModel(provider: AIProvider): string | null {
  const models = DEFAULT_MODELS[provider];
  return models.length > 0 ? models[0] : null;
}

// =============================================================================
// Token Limits
// =============================================================================

export const TOKEN_LIMITS = {
  min: 256,
  max: 32768,
  default: 8192,
  step: 256,
};
