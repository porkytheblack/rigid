import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { App, AppFilter, NewApp, UpdateApp } from '@/lib/tauri/types';
import { apps as appCommands } from '@/lib/tauri/commands';
import { deepClone } from '@/lib/utils';

interface AppsState {
  items: App[];
  selectedId: string | null;
  filter: AppFilter;
  loading: boolean;
  error: string | null;
}

interface AppsActions {
  load: () => Promise<void>;
  setFilter: (filter: AppFilter) => void;
  select: (id: string | null) => void;
  create: (data: NewApp) => Promise<App>;
  update: (id: string, updates: UpdateApp) => Promise<App>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => App | undefined;
  clearError: () => void;
}

type AppsStore = AppsState & AppsActions;

export const useAppsStore = create<AppsStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    filter: {},
    loading: false,
    error: null,

    // Actions
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const items = await appCommands.list(get().filter);
        // Deep clone to avoid frozen Tauri objects in Immer state
        set((state) => {
          state.items = deepClone(items);
          state.loading = false;
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
      }
    },

    setFilter: (filter) => {
      set((state) => {
        state.filter = filter;
      });
      get().load();
    },

    select: (id) => {
      set((state) => {
        state.selectedId = id;
      });
    },

    create: async (data) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const app = await appCommands.create(data);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedApp = deepClone(app);
        set((state) => {
          state.items.unshift(clonedApp);
          state.loading = false;
        });
        return clonedApp;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    update: async (id, updates) => {
      const previousItems = get().items;

      // Optimistic update
      set((state) => {
        const index = state.items.findIndex((item) => item.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates } as App;
        }
      });

      try {
        const app = await appCommands.update(id, updates);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedApp = deepClone(app);
        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = clonedApp;
          }
        });
        return clonedApp;
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    delete: async (id) => {
      const previousItems = get().items;

      // Optimistic update
      set((state) => {
        state.items = state.items.filter((item) => item.id !== id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
      });

      try {
        await appCommands.delete(id);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    getById: (id) => {
      return get().items.find((item) => item.id === id);
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
  }))
);
