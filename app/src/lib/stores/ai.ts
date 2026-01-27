import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  AIProvider,
  AICapabilities,
  ProviderStatus,
  Message,
  CompletionOptions,
  AIResponse,
} from '@/lib/tauri/types';
import { ai as aiCommands } from '@/lib/tauri/commands';

interface AIState {
  configured: boolean;
  currentProvider: AIProvider | null;
  capabilities: AICapabilities | null;
  providerStatuses: ProviderStatus[];
  models: string[];
  loading: boolean;
  error: string | null;
}

interface AIActions {
  checkAvailability: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  configureProvider: (provider: AIProvider, model?: string) => Promise<void>;
  setApiKey: (provider: AIProvider, apiKey: string) => Promise<void>;
  removeApiKey: (provider: AIProvider) => Promise<void>;
  complete: (messages: Message[], options?: CompletionOptions) => Promise<AIResponse>;
  describeScreenshot: (imagePath: string) => Promise<string>;
  loadModels: () => Promise<void>;
  restoreConfiguration: () => Promise<boolean>;
  clearError: () => void;
}

type AIStore = AIState & AIActions;

export const useAIStore = create<AIStore>()(
  immer((set, get) => ({
    // State
    configured: false,
    currentProvider: null,
    capabilities: null,
    providerStatuses: [],
    models: [],
    loading: false,
    error: null,

    // Actions
    checkAvailability: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const statuses = await aiCommands.checkAvailability();
        set((state) => {
          state.providerStatuses = statuses;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
      }
    },

    refreshStatus: async () => {
      try {
        const status = await aiCommands.getStatus();
        set((state) => {
          state.configured = status.configured;
          state.currentProvider = status.provider as AIProvider | null;
          state.capabilities = status.capabilities;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
      }
    },

    configureProvider: async (provider, model) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        await aiCommands.configureProvider(provider, model);
        await get().refreshStatus();
        await get().loadModels();
        set((state) => {
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    setApiKey: async (provider, apiKey) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        await aiCommands.setApiKey(provider, apiKey);
        await get().checkAvailability();
        set((state) => {
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    removeApiKey: async (provider) => {
      try {
        await aiCommands.removeApiKey(provider);
        await get().checkAvailability();
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    complete: async (messages, options) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const response = await aiCommands.complete(messages, options);
        set((state) => {
          state.loading = false;
        });
        return response;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    describeScreenshot: async (imagePath) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const description = await aiCommands.describeScreenshot(imagePath);
        set((state) => {
          state.loading = false;
        });
        return description;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    loadModels: async () => {
      try {
        const models = await aiCommands.listModels();
        set((state) => {
          state.models = models;
        });
      } catch (error) {
        // Non-critical, just log
        console.warn('Failed to load models:', error);
      }
    },

    restoreConfiguration: async () => {
      try {
        const restored = await aiCommands.restoreConfiguration();
        if (restored) {
          await get().refreshStatus();
          await get().loadModels();
        }
        return restored;
      } catch (error) {
        console.warn('Failed to restore AI configuration:', error);
        return false;
      }
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
  }))
);
