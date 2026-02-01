// AI Provider Adapter Types
// This provides a unified interface for all AI providers

export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'google'      // Gemini
  | 'openrouter'
  | 'ollama'
  | 'lmstudio';

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyPlaceholder?: string;
  apiKeyUrl?: string;
  baseUrlConfigurable: boolean;
  defaultBaseUrl?: string;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
}

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow: number;
  maxOutputTokens?: number;
  supportsVision?: boolean;
  supportsFunctionCalling?: boolean;
  isDefault?: boolean;
}

export interface ProviderStatus {
  provider: ProviderType;
  configured: boolean;
  available: boolean;
  error?: string;
  models: ModelInfo[];
}

export interface CompletionRequest {
  messages: ProviderMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  stopSequences?: string[];
}

export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionResponse {
  content: string;
  model: string;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Provider Adapter Interface
export interface AIProviderAdapter {
  readonly config: ProviderConfig;

  // Lifecycle
  initialize(credentials: ProviderCredentials): Promise<void>;
  checkAvailability(): Promise<boolean>;

  // Models
  listModels(): Promise<ModelInfo[]>;

  // Completions
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  // Optional: Streaming (returns async generator)
  streamComplete?(request: CompletionRequest): AsyncGenerator<string, void, unknown>;
}

// Factory function type
export type ProviderFactory = () => AIProviderAdapter;
