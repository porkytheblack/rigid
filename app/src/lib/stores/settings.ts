import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Setting } from '@/lib/tauri/types';
import { settings as settingsCommands } from '@/lib/tauri/commands';

interface SettingsState {
  items: Record<string, string>;
  loading: boolean;
  error: string | null;
}

interface SettingsActions {
  load: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string) => Promise<void>;
  delete: (key: string) => Promise<void>;
  getBool: (key: string) => Promise<boolean | null>;
  setBool: (key: string, value: boolean) => Promise<void>;
  getInt: (key: string) => Promise<number | null>;
  setInt: (key: string, value: number) => Promise<void>;
  clearError: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  immer((set, get) => ({
    // State
    items: {},
    loading: false,
    error: null,

    // Actions
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const allSettings = await settingsCommands.getAll();
        const items: Record<string, string> = {};
        allSettings.forEach((setting: Setting) => {
          items[setting.key] = setting.value;
        });
        set((state) => {
          state.items = items;
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
      }
    },

    get: async (key) => {
      // Check cache first
      const cached = get().items[key];
      if (cached !== undefined) {
        return cached;
      }

      try {
        const value = await settingsCommands.get(key);
        if (value !== null) {
          set((state) => {
            state.items[key] = value;
          });
        }
        return value;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    set: async (key, value) => {
      const previousValue = get().items[key];

      // Optimistic update
      set((state) => {
        state.items[key] = value;
      });

      try {
        await settingsCommands.set(key, value);
      } catch (error) {
        // Rollback
        set((state) => {
          if (previousValue !== undefined) {
            state.items[key] = previousValue;
          } else {
            delete state.items[key];
          }
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    delete: async (key) => {
      const previousValue = get().items[key];

      // Optimistic update
      set((state) => {
        delete state.items[key];
      });

      try {
        await settingsCommands.delete(key);
      } catch (error) {
        // Rollback
        set((state) => {
          if (previousValue !== undefined) {
            state.items[key] = previousValue;
          }
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    getBool: async (key) => {
      try {
        return await settingsCommands.getBool(key);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    setBool: async (key, value) => {
      const previousValue = get().items[key];

      // Optimistic update
      set((state) => {
        state.items[key] = value ? 'true' : 'false';
      });

      try {
        await settingsCommands.setBool(key, value);
      } catch (error) {
        // Rollback
        set((state) => {
          if (previousValue !== undefined) {
            state.items[key] = previousValue;
          } else {
            delete state.items[key];
          }
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    getInt: async (key) => {
      try {
        return await settingsCommands.getInt(key);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    setInt: async (key, value) => {
      const previousValue = get().items[key];

      // Optimistic update
      set((state) => {
        state.items[key] = value.toString();
      });

      try {
        await settingsCommands.setInt(key, value);
      } catch (error) {
        // Rollback
        set((state) => {
          if (previousValue !== undefined) {
            state.items[key] = previousValue;
          } else {
            delete state.items[key];
          }
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
  }))
);
