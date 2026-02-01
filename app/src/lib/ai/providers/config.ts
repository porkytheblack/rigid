// Provider Configuration
// Defines all supported AI providers and their configurations

import type { ProviderConfig, ProviderType, ModelInfo } from './types';

// =============================================================================
// Provider Configurations
// =============================================================================

export const PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models - recommended for best quality',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    baseUrlConfigurable: false,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-...',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    baseUrlConfigurable: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  google: {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini models',
    requiresApiKey: true,
    apiKeyPlaceholder: 'AI...',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    baseUrlConfigurable: false,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access multiple models via unified API',
    requiresApiKey: true,
    apiKeyPlaceholder: 'sk-or-...',
    apiKeyUrl: 'https://openrouter.ai/keys',
    baseUrlConfigurable: false,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local AI - free and private',
    requiresApiKey: false,
    baseUrlConfigurable: true,
    defaultBaseUrl: 'http://localhost:11434',
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: false,
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Local AI with OpenAI-compatible API',
    requiresApiKey: false,
    baseUrlConfigurable: true,
    defaultBaseUrl: 'http://localhost:1234/v1',
    supportsStreaming: true,
    supportsVision: false,
    supportsFunctionCalling: false,
  },
};

// =============================================================================
// Default Models by Provider
// =============================================================================

export const DEFAULT_MODELS: Record<ProviderType, ModelInfo[]> = {
  anthropic: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
      isDefault: true,
    },
    {
      id: 'claude-opus-4-0-20250514',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      provider: 'anthropic',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
  ],
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsFunctionCalling: true,
      isDefault: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'o1',
      name: 'o1',
      provider: 'openai',
      contextWindow: 200000,
      maxOutputTokens: 100000,
      supportsVision: true,
      supportsFunctionCalling: false,
    },
    {
      id: 'o1-mini',
      name: 'o1 Mini',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 65536,
      supportsVision: false,
      supportsFunctionCalling: false,
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
  ],
  google: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
      isDefault: true,
    },
    {
      id: 'gemini-2.0-flash-thinking',
      name: 'Gemini 2.0 Flash Thinking',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      provider: 'google',
      contextWindow: 2000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      provider: 'google',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
  ],
  openrouter: [
    {
      id: 'anthropic/claude-sonnet-4',
      name: 'Claude Sonnet 4',
      provider: 'openrouter',
      contextWindow: 200000,
      supportsVision: true,
      supportsFunctionCalling: true,
      isDefault: true,
    },
    {
      id: 'anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'openrouter',
      contextWindow: 200000,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'openrouter',
      contextWindow: 128000,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'google/gemini-2.0-flash-001',
      name: 'Gemini 2.0 Flash',
      provider: 'openrouter',
      contextWindow: 1000000,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'google/gemini-pro-1.5',
      name: 'Gemini Pro 1.5',
      provider: 'openrouter',
      contextWindow: 2000000,
      supportsVision: true,
      supportsFunctionCalling: true,
    },
    {
      id: 'meta-llama/llama-3.3-70b-instruct',
      name: 'Llama 3.3 70B',
      provider: 'openrouter',
      contextWindow: 128000,
      supportsVision: false,
      supportsFunctionCalling: false,
    },
    {
      id: 'deepseek/deepseek-r1',
      name: 'DeepSeek R1',
      provider: 'openrouter',
      contextWindow: 64000,
      supportsVision: false,
      supportsFunctionCalling: false,
    },
  ],
  ollama: [], // Dynamically loaded
  lmstudio: [], // Dynamically loaded
};

// =============================================================================
// Helper Functions
// =============================================================================

export function getProviderConfig(provider: ProviderType): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

export function getDefaultModels(provider: ProviderType): ModelInfo[] {
  return DEFAULT_MODELS[provider] || [];
}

export function getDefaultModel(provider: ProviderType): ModelInfo | null {
  const models = DEFAULT_MODELS[provider];
  return models?.find(m => m.isDefault) || models?.[0] || null;
}

export function getAllProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}

export function getCloudProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(p => p.requiresApiKey);
}

export function getLocalProviders(): ProviderConfig[] {
  return Object.values(PROVIDER_CONFIGS).filter(p => !p.requiresApiKey);
}

// Map our extended provider types to backend-supported types
export function mapToBackendProvider(provider: ProviderType): 'ollama' | 'openrouter' | 'anthropic' | 'openai' | null {
  switch (provider) {
    case 'anthropic':
      return 'anthropic';
    case 'openai':
      return 'openai';
    case 'openrouter':
      return 'openrouter';
    case 'ollama':
      return 'ollama';
    case 'google':
      // Google/Gemini can be accessed via OpenRouter or direct API
      // For now, we'll use the frontend adapter
      return null;
    case 'lmstudio':
      // LM Studio uses OpenAI-compatible API
      // We'll handle this in the frontend adapter
      return null;
    default:
      return null;
  }
}

// Map backend provider types back to our extended types
export function mapFromBackendProvider(provider: string): ProviderType | null {
  switch (provider) {
    case 'anthropic':
    case 'Anthropic':
      return 'anthropic';
    case 'openai':
    case 'OpenAI':
      return 'openai';
    case 'openrouter':
    case 'OpenRouter':
      return 'openrouter';
    case 'ollama':
    case 'Ollama':
      return 'ollama';
    default:
      return null;
  }
}
