import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Exploration, ExplorationFilter, NewExploration, UpdateExploration } from '@/lib/tauri/types';
import { tests as explorationCommands } from '@/lib/tauri/commands';
import { deepClone } from '@/lib/utils';

interface ExplorationsState {
  items: Exploration[];
  selectedId: string | null;
  filter: ExplorationFilter;
  loading: boolean;
  error: string | null;
}

interface ExplorationsActions {
  load: () => Promise<void>;
  loadByApp: (appId: string) => Promise<void>;
  setFilter: (filter: ExplorationFilter) => void;
  select: (id: string | null) => void;
  create: (data: NewExploration) => Promise<Exploration>;
  update: (id: string, updates: UpdateExploration) => Promise<Exploration>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Exploration | undefined;
  clearError: () => void;
}

type ExplorationsStore = ExplorationsState & ExplorationsActions;

export const useExplorationsStore = create<ExplorationsStore>()(
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
        const items = await explorationCommands.list(get().filter);
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

    loadByApp: async (appId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.filter = { ...state.filter, app_id: appId };
      });

      try {
        const items = await explorationCommands.listByApp(appId);
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
        const exploration = await explorationCommands.create(data);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedExploration = deepClone(exploration);
        set((state) => {
          state.items.unshift(clonedExploration);
          state.loading = false;
        });
        return clonedExploration;
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
          state.items[index] = { ...state.items[index], ...updates } as Exploration;
        }
      });

      try {
        const exploration = await explorationCommands.update(id, updates);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedExploration = deepClone(exploration);
        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = clonedExploration;
          }
        });
        return clonedExploration;
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
        await explorationCommands.delete(id);
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

// Legacy export for backward compatibility
export const useTestsStore = useExplorationsStore;
