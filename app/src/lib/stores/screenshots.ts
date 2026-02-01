import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Screenshot, ScreenshotFilter, NewScreenshot, UpdateScreenshot } from '@/lib/tauri/types';
import { screenshots as screenshotCommands, capture as captureCommands } from '@/lib/tauri/commands';
import { deepClone } from '@/lib/utils';

interface ScreenshotsState {
  items: Screenshot[];
  selectedId: string | null;
  filter: ScreenshotFilter;
  loading: boolean;
  error: string | null;
}

interface ScreenshotsActions {
  load: (filter?: ScreenshotFilter) => Promise<void>;
  loadByApp: (appId: string) => Promise<void>;
  setFilter: (filter: ScreenshotFilter) => void;
  select: (id: string | null) => void;
  create: (data: NewScreenshot) => Promise<Screenshot>;
  update: (id: string, updates: UpdateScreenshot) => Promise<Screenshot>;
  delete: (id: string) => Promise<void>;
  capture: (testId?: string | null, title?: string | null) => Promise<Screenshot>;
  clearError: () => void;
}

type ScreenshotsStore = ScreenshotsState & ScreenshotsActions;

export const useScreenshotsStore = create<ScreenshotsStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    filter: {},
    loading: false,
    error: null,

    // Actions
    load: async (filter?: ScreenshotFilter) => {
      // If filter is provided, update the stored filter
      if (filter) {
        set((state) => {
          state.filter = filter;
        });
      }

      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const items = await screenshotCommands.list(filter || get().filter);
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
        state.filter = { app_id: appId };
      });

      try {
        const items = await screenshotCommands.list({ app_id: appId });
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
        const screenshot = await screenshotCommands.create(data);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedScreenshot = deepClone(screenshot);
        set((state) => {
          state.items.unshift(clonedScreenshot);
          state.loading = false;
        });
        return clonedScreenshot;
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
        const index = state.items.findIndex((item: Screenshot) => item.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates } as Screenshot;
        }
      });

      try {
        const screenshot = await screenshotCommands.update(id, updates);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedScreenshot = deepClone(screenshot);
        set((state) => {
          const index = state.items.findIndex((item: Screenshot) => item.id === id);
          if (index !== -1) {
            state.items[index] = clonedScreenshot;
          }
        });
        return clonedScreenshot;
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
        state.items = state.items.filter((item: Screenshot) => item.id !== id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
      });

      try {
        await screenshotCommands.delete(id);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    capture: async (testId, title) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const screenshot = await captureCommands.screenshot(testId, title);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedScreenshot = deepClone(screenshot);
        set((state) => {
          state.items.unshift(clonedScreenshot);
          state.loading = false;
        });
        return clonedScreenshot;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
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
