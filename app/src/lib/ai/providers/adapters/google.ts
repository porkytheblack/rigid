// Google AI (Gemini) Provider Adapter
import type {
  AIProviderAdapter,
  ProviderConfig,
  ProviderCredentials,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
} from '../types';
import { PROVIDER_CONFIGS, DEFAULT_MODELS } from '../config';

// Helper to format model names nicely
function formatModelName(id: string): string {
  return id
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export class GoogleAdapter implements AIProviderAdapter {
  readonly config: ProviderConfig = PROVIDER_CONFIGS.google;
  private apiKey: string | null = null;

  async initialize(credentials: ProviderCredentials): Promise<void> {
    if (!credentials.apiKey) {
      throw new Error('Google AI API key is required');
    }
    this.apiKey = credentials.apiKey;
  }

  async checkAvailability(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      // Test with a simple request to list models
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this.apiKey) {
      return DEFAULT_MODELS.google;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`
      );

      if (!response.ok) {
        return DEFAULT_MODELS.google;
      }

      const data = await response.json();
      const models: ModelInfo[] = [];

      // Filter for generative models that support generateContent
      for (const model of data.models || []) {
        if (model.supportedGenerationMethods?.includes('generateContent')) {
          const modelId = model.name.replace('models/', '');

          // Skip non-gemini or experimental models
          if (!modelId.startsWith('gemini')) continue;

          models.push({
            id: modelId,
            name: model.displayName || formatModelName(modelId),
            provider: 'google',
            contextWindow: model.inputTokenLimit || 32000,
            maxOutputTokens: model.outputTokenLimit || 8192,
            supportsVision: modelId.includes('vision') || modelId.includes('pro') || modelId.includes('flash'),
            supportsFunctionCalling: true,
            isDefault: modelId === 'gemini-2.0-flash',
          });
        }
      }

      // If we got models, return them; otherwise fall back to defaults
      return models.length > 0 ? models : DEFAULT_MODELS.google;
    } catch {
      return DEFAULT_MODELS.google;
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Google AI not configured');
    }

    const model = request.model || 'gemini-2.0-flash';

    // Convert messages to Gemini format
    const contents = this.convertMessages(request.messages);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: request.maxTokens || 8192,
            temperature: request.temperature ?? 0.7,
            stopSequences: request.stopSequences,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `Google AI error: ${response.status}`);
    }

    const data = await response.json();

    // Extract content from Gemini response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const finishReason = data.candidates?.[0]?.finishReason;

    return {
      content,
      model,
      finishReason,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount || 0,
        completionTokens: data.usageMetadata.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata.totalTokenCount || 0,
      } : undefined,
    };
  }

  async *streamComplete(request: CompletionRequest): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('Google AI not configured');
    }

    const model = request.model || 'gemini-2.0-flash';
    const contents = this.convertMessages(request.messages);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: request.maxTokens || 8192,
            temperature: request.temperature ?? 0.7,
            stopSequences: request.stopSequences,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `Google AI error: ${response.status}`);
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
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                yield text;
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

  private convertMessages(messages: CompletionRequest['messages']): Array<{ role: string; parts: Array<{ text: string }> }> {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Gemini doesn't have a system role - prepend to first user message
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n\n';
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';
      let content = msg.content;

      // Prepend system prompt to first user message
      if (role === 'user' && systemPrompt) {
        content = systemPrompt + content;
        systemPrompt = '';
      }

      contents.push({
        role,
        parts: [{ text: content }],
      });
    }

    return contents;
  }
}
