import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ChecklistItem, ChecklistFilter, NewChecklistItem, UpdateChecklistItem } from '@/lib/tauri/types';
import { checklist as checklistCommands } from '@/lib/tauri/commands';

interface ChecklistState {
  items: ChecklistItem[];
  selectedId: string | null;
  filter: ChecklistFilter;
  loading: boolean;
  error: string | null;
  counts: { untested: number; passed: number; failed: number } | null;
}

interface ChecklistActions {
  load: () => Promise<void>;
  setFilter: (filter: ChecklistFilter) => void;
  select: (id: string | null) => void;
  create: (data: NewChecklistItem) => Promise<ChecklistItem>;
  update: (id: string, updates: UpdateChecklistItem) => Promise<ChecklistItem>;
  delete: (id: string) => Promise<void>;
  reorder: (ids: string[]) => Promise<void>;
  loadCounts: () => Promise<void>;
  clearError: () => void;
}

type ChecklistStore = ChecklistState & ChecklistActions;

export const useChecklistStore = create<ChecklistStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    filter: {},
    loading: false,
    error: null,
    counts: null,

    // Actions
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const items = await checklistCommands.list(get().filter);
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
        const item = await checklistCommands.create(data);
        set((state) => {
          state.items.push(item);
          state.loading = false;
        });
        get().loadCounts();
        return item;
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
        const index = state.items.findIndex((item: ChecklistItem) => item.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates } as ChecklistItem;
        }
      });

      try {
        const item = await checklistCommands.update(id, updates);
        set((state) => {
          const index = state.items.findIndex((item: ChecklistItem) => item.id === id);
          if (index !== -1) {
            state.items[index] = item;
          }
        });
        get().loadCounts();
        return item;
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
        state.items = state.items.filter((item: ChecklistItem) => item.id !== id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
      });

      try {
        await checklistCommands.delete(id);
        get().loadCounts();
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    reorder: async (ids) => {
      const previousItems = get().items;

      // Optimistic update
      set((state) => {
        const reordered: ChecklistItem[] = [];
        ids.forEach((itemId, index) => {
          const item = state.items.find((i: ChecklistItem) => i.id === itemId);
          if (item) {
            reordered.push({ ...item, sort_order: index });
          }
        });
        state.items = reordered;
      });

      try {
        await checklistCommands.reorder(ids);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    loadCounts: async () => {
      try {
        const [untested, passed, failed] = await checklistCommands.getCounts();
        set((state) => {
          state.counts = { untested, passed, failed };
        });
      } catch (error) {
        console.error('Failed to load checklist counts:', error);
      }
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
  }))
);
