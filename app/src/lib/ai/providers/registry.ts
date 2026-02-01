// Provider Registry
// Central management of all AI providers
// Uses backend (Tauri) database as source of truth

import type {
  ProviderType,
  ProviderCredentials,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  ProviderStatus,
} from './types';
import {
  DEFAULT_MODELS,
  getProviderConfig,
  mapToBackendProvider,
  mapFromBackendProvider,
} from './config';
import { GoogleAdapter } from './adapters/google';
import { LMStudioAdapter } from './adapters/lmstudio';
import { ai as aiCommands, settings as settingsCommands } from '@/lib/tauri/commands';
import type { Message } from '@/lib/tauri/types';

// Database setting keys
const SETTINGS_KEYS = {
  activeModel: 'ai_active_model',
  credentials: (provider: string) => `ai_credentials_${provider}`,
};

class ProviderRegistry {
  // Cache of current state
  private cachedProvider: ProviderType | null = null;
  private cachedModel: string | null = null;
  private credentialsCache: Record<string, ProviderCredentials> = {};

  // Frontend adapters for providers not supported by backend
  private googleAdapter = new GoogleAdapter();
  private lmStudioAdapter = new LMStudioAdapter();

  // =============================================================================
  // Database Operations
  // =============================================================================

  private async loadModel(): Promise<string | null> {
    try {
      const model = await settingsCommands.get(SETTINGS_KEYS.activeModel);
      this.cachedModel = model;
      return model;
    } catch {
      return null;
    }
  }

  private async saveModel(model: string | null): Promise<void> {
    try {
      if (model) {
        await settingsCommands.set(SETTINGS_KEYS.activeModel, model);
      } else {
        await settingsCommands.delete(SETTINGS_KEYS.activeModel);
      }
      this.cachedModel = model;
    } catch (error) {
      console.warn('Failed to save model:', error);
    }
  }

  private async loadCredentials(provider: ProviderType): Promise<ProviderCredentials | null> {
    try {
      const stored = await settingsCommands.get(SETTINGS_KEYS.credentials(provider));
      if (stored) {
        const creds = JSON.parse(stored) as ProviderCredentials;
        this.credentialsCache[provider] = creds;
        return creds;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async saveCredentialsToDb(provider: ProviderType, credentials: ProviderCredentials): Promise<void> {
    try {
      await settingsCommands.set(SETTINGS_KEYS.credentials(provider), JSON.stringify(credentials));
      this.credentialsCache[provider] = credentials;
    } catch (error) {
      console.warn('Failed to save credentials:', error);
    }
  }

  private async deleteCredentialsFromDb(provider: ProviderType): Promise<void> {
    try {
      await settingsCommands.delete(SETTINGS_KEYS.credentials(provider));
      delete this.credentialsCache[provider];
    } catch (error) {
      console.warn('Failed to delete credentials:', error);
    }
  }

  // =============================================================================
  // Provider Status
  // =============================================================================

  private async fetchStatus(): Promise<void> {
    try {
      const status = await aiCommands.getStatus();
      const configured = status?.configured ?? false;
      const providerStr = status?.provider ?? null;

      if (configured && providerStr) {
        this.cachedProvider = mapFromBackendProvider(providerStr) || (providerStr as ProviderType);
      } else {
        this.cachedProvider = null;
      }

      // Also load model from database
      await this.loadModel();
    } catch (error) {
      console.warn('Failed to fetch AI status:', error);
    }
  }

  getActiveProvider(): ProviderType | null {
    return this.cachedProvider;
  }

  async getActiveProviderAsync(): Promise<ProviderType | null> {
    await this.fetchStatus();
    return this.cachedProvider;
  }

  getActiveModel(): string | null {
    return this.cachedModel;
  }

  // =============================================================================
  // Provider Management
  // =============================================================================

  async setActiveProvider(provider: ProviderType, model?: string): Promise<void> {
    this.cachedProvider = provider;
    this.cachedModel = model || null;

    // Initialize frontend adapter if needed
    const creds = await this.loadCredentials(provider);
    if (provider === 'google') {
      await this.googleAdapter.initialize(creds || {});
    } else if (provider === 'lmstudio') {
      await this.lmStudioAdapter.initialize(creds || {});
    }

    // Configure backend
    const backendProvider = mapToBackendProvider(provider);
    if (backendProvider) {
      await aiCommands.configureProvider(backendProvider, model);
    }

    // Save model to database
    if (model) {
      await this.saveModel(model);
    }
  }

  async setActiveModel(model: string): Promise<void> {
    this.cachedModel = model;
    await this.saveModel(model);
  }

  // =============================================================================
  // Credentials Management
  // =============================================================================

  async setCredentials(provider: ProviderType, credentials: ProviderCredentials): Promise<void> {
    // Save to database
    await this.saveCredentialsToDb(provider, credentials);

    // Update backend if it supports this provider
    const backendProvider = mapToBackendProvider(provider);
    if (backendProvider && credentials.apiKey) {
      try {
        await aiCommands.setApiKey(backendProvider, credentials.apiKey);
      } catch (error) {
        console.warn('Failed to set backend API key:', error);
      }
    }

    // Initialize frontend adapter
    if (provider === 'google' && credentials.apiKey) {
      await this.googleAdapter.initialize(credentials);
    } else if (provider === 'lmstudio') {
      await this.lmStudioAdapter.initialize(credentials);
    }
  }

  async getCredentials(provider: ProviderType): Promise<ProviderCredentials | null> {
    // Check cache first
    if (this.credentialsCache[provider]) {
      return this.credentialsCache[provider];
    }
    // Load from database
    return this.loadCredentials(provider);
  }

  getCredentialsSync(provider: ProviderType): ProviderCredentials | null {
    return this.credentialsCache[provider] || null;
  }

  async hasCredentials(provider: ProviderType): Promise<boolean> {
    const config = getProviderConfig(provider);
    if (!config.requiresApiKey) {
      return true;
    }
    const creds = await this.getCredentials(provider);
    return !!creds?.apiKey;
  }

  async removeCredentials(provider: ProviderType): Promise<void> {
    await this.deleteCredentialsFromDb(provider);

    const backendProvider = mapToBackendProvider(provider);
    if (backendProvider) {
      try {
        await aiCommands.removeApiKey(backendProvider);
      } catch (error) {
        console.warn('Failed to remove backend API key:', error);
      }
    }

    if (this.cachedProvider === provider) {
      this.cachedProvider = null;
      this.cachedModel = null;
    }
  }

  // =============================================================================
  // Availability
  // =============================================================================

  async checkProviderAvailability(provider: ProviderType): Promise<ProviderStatus> {
    const config = getProviderConfig(provider);
    const hasApiKey = await this.hasCredentials(provider);
    const isConfigured = hasApiKey || !config.requiresApiKey;

    let available = false;
    let error: string | undefined;
    // Always start with default models - they should always be shown when configured
    let models: ModelInfo[] = DEFAULT_MODELS[provider] || [];

    try {
      if (provider === 'google') {
        if (!hasApiKey) {
          error = 'API key required';
        } else {
          const creds = await this.getCredentials(provider);
          await this.googleAdapter.initialize(creds || {});
          available = await this.googleAdapter.checkAvailability();
          if (available) {
            const fetchedModels = await this.googleAdapter.listModels();
            if (fetchedModels.length > 0) {
              models = fetchedModels;
            }
          }
        }
      } else if (provider === 'lmstudio') {
        const creds = await this.getCredentials(provider);
        await this.lmStudioAdapter.initialize(creds || {});
        available = await this.lmStudioAdapter.checkAvailability();
        if (available) {
          const fetchedModels = await this.lmStudioAdapter.listModels();
          if (fetchedModels.length > 0) {
            models = fetchedModels;
          }
        } else {
          error = 'LM Studio not running';
        }
      } else {
        const backendProvider = mapToBackendProvider(provider);
        if (backendProvider) {
          try {
            const statuses = await aiCommands.checkAvailability();
            const status = statuses.find((s) => s.provider === backendProvider);
            if (status) {
              available = status.available;
              error = status.error || undefined;
            }
            // For configured providers, we consider them available for model selection
            // The actual API call will validate the key
            if (isConfigured) {
              available = true;
            }
          } catch (err) {
            error = err instanceof Error ? err.message : String(err);
            // Still allow model selection if configured
            if (isConfigured) {
              available = true;
            }
          }
        } else {
          error = 'Provider not supported';
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    return {
      provider,
      configured: isConfigured,
      available,
      error,
      models,
    };
  }

  async checkAllProviders(): Promise<ProviderStatus[]> {
    const providers: ProviderType[] = ['anthropic', 'openai', 'google', 'openrouter', 'ollama', 'lmstudio'];
    const statuses = await Promise.all(providers.map((p) => this.checkProviderAvailability(p)));
    return statuses;
  }

  // =============================================================================
  // Completions
  // =============================================================================

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    let provider = this.cachedProvider;
    if (!provider) {
      await this.fetchStatus();
      provider = this.cachedProvider;
    }

    if (!provider) {
      throw new Error('No AI provider configured');
    }

    const model = request.model || this.cachedModel;

    if (provider === 'google') {
      return this.googleAdapter.complete({ ...request, model: model || undefined });
    }

    if (provider === 'lmstudio') {
      return this.lmStudioAdapter.complete({ ...request, model: model || undefined });
    }

    const backendProvider = mapToBackendProvider(provider);
    if (!backendProvider) {
      throw new Error(`Provider ${provider} not supported`);
    }

    const messages: Message[] = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await aiCommands.complete(messages, {
      model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stop_sequences: request.stopSequences,
    });

    return {
      content: response?.content ?? '',
      model: response?.model ?? model ?? '',
      finishReason: response?.finish_reason ?? undefined,
      usage: response?.usage
        ? {
            promptTokens: response.usage.prompt_tokens ?? 0,
            completionTokens: response.usage.completion_tokens ?? 0,
            totalTokens: response.usage.total_tokens ?? 0,
          }
        : undefined,
    };
  }

  // =============================================================================
  // Models
  // =============================================================================

  async listModels(provider?: ProviderType): Promise<ModelInfo[]> {
    const targetProvider = provider || this.cachedProvider;
    if (!targetProvider) {
      return [];
    }

    const status = await this.checkProviderAvailability(targetProvider);
    return status.models;
  }

  // =============================================================================
  // Initialization
  // =============================================================================

  async initialize(): Promise<void> {
    try {
      await aiCommands.restoreConfiguration();
      await this.fetchStatus();
    } catch (error) {
      console.warn('Failed to initialize AI configuration:', error);
    }
  }
}

export const providerRegistry = new ProviderRegistry();
