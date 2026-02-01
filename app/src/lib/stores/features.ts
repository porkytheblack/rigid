import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Feature, FeatureFilter, NewFeature, UpdateFeature } from '@/lib/tauri/types';
import { features as featureCommands } from '@/lib/tauri/commands';

interface FeaturesState {
  items: Feature[];
  selectedId: string | null;
  currentAppId: string | null;
  loading: boolean;
  error: string | null;
}

interface FeaturesActions {
  loadByApp: (appId: string) => Promise<void>;
  select: (id: string | null) => void;
  create: (data: NewFeature) => Promise<Feature>;
  update: (id: string, updates: UpdateFeature) => Promise<Feature>;
  delete: (id: string) => Promise<void>;
  reorder: (featureIds: string[]) => Promise<void>;
  getById: (id: string) => Feature | undefined;
  clearError: () => void;
  clear: () => void;
}

type FeaturesStore = FeaturesState & FeaturesActions;

export const useFeaturesStore = create<FeaturesStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    currentAppId: null,
    loading: false,
    error: null,

    // Actions
    loadByApp: async (appId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.currentAppId = appId;
      });

      try {
        const items = await featureCommands.listByApp(appId);
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
        const feature = await featureCommands.create(data);
        set((state) => {
          state.items.push(feature);
          state.loading = false;
        });
        return feature;
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
          state.items[index] = { ...state.items[index], ...updates } as Feature;
        }
      });

      try {
        const feature = await featureCommands.update(id, updates);
        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = feature;
          }
        });
        return feature;
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
        await featureCommands.delete(id);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    reorder: async (featureIds) => {
      const appId = get().currentAppId;
      if (!appId) return;

      const previousItems = get().items;

      // Optimistic update - reorder items locally
      set((state) => {
        const itemMap = new Map(state.items.map(item => [item.id, item]));
        state.items = featureIds
          .map(id => itemMap.get(id))
          .filter((item): item is Feature => item !== undefined);
      });

      try {
        await featureCommands.reorder(appId, featureIds);
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

    clear: () => {
      set((state) => {
        state.items = [];
        state.selectedId = null;
        state.currentAppId = null;
        state.loading = false;
        state.error = null;
      });
    },
  }))
);
