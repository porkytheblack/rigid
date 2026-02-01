// LM Studio Provider Adapter
// LM Studio exposes an OpenAI-compatible API

import type {
  AIProviderAdapter,
  ProviderConfig,
  ProviderCredentials,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
} from '../types';
import { PROVIDER_CONFIGS } from '../config';

export class LMStudioAdapter implements AIProviderAdapter {
  readonly config: ProviderConfig = PROVIDER_CONFIGS.lmstudio;
  private baseUrl: string = 'http://localhost:1234/v1';

  async initialize(credentials: ProviderCredentials): Promise<void> {
    if (credentials.baseUrl) {
      this.baseUrl = credentials.baseUrl.replace(/\/$/, '');
    }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const models: ModelInfo[] = (data.data || []).map((model: { id: string }) => ({
        id: model.id,
        name: formatModelName(model.id),
        provider: 'lmstudio' as const,
        contextWindow: 8192, // Default, actual varies by model
        supportsVision: false,
        supportsFunctionCalling: false,
      }));

      // Mark first model as default
      if (models.length > 0) {
        models[0].isDefault = true;
      }

      return models;
    } catch {
      return [];
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || 'local-model',
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stop: request.stopSequences,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `LM Studio error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      model: data.model || request.model || 'local-model',
      finishReason: choice?.finish_reason,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens || 0,
        completionTokens: data.usage.completion_tokens || 0,
        totalTokens: data.usage.total_tokens || 0,
      } : undefined,
    };
  }

  async *streamComplete(request: CompletionRequest): AsyncGenerator<string, void, unknown> {
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model || 'local-model',
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stop: request.stopSequences,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `LM Studio error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to get response stream');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Helper to format model names nicely
function formatModelName(id: string): string {
  // Remove file extensions and path separators
  let name = id.replace(/\.gguf$/i, '').replace(/\//g, ' ').replace(/-/g, ' ');

  // Capitalize words
  name = name.replace(/\b\w/g, c => c.toUpperCase());

  return name;
}
