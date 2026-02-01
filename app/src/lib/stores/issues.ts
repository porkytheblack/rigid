import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Issue, IssueFilter, NewIssue, UpdateIssue } from '@/lib/tauri/types';
import { issues as issueCommands } from '@/lib/tauri/commands';
import { deepClone } from '@/lib/utils';

interface IssuesState {
  items: Issue[];
  selectedId: string | null;
  filter: IssueFilter;
  loading: boolean;
  error: string | null;
}

interface IssuesActions {
  load: (filter?: IssueFilter) => Promise<void>;
  setFilter: (filter: IssueFilter) => void;
  select: (id: string | null) => void;
  create: (data: NewIssue) => Promise<Issue>;
  update: (id: string, updates: UpdateIssue) => Promise<Issue>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Issue | undefined;
  clearError: () => void;
}

type IssuesStore = IssuesState & IssuesActions;

export const useIssuesStore = create<IssuesStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    filter: {},
    loading: false,
    error: null,

    // Actions
    load: async (filter?: IssueFilter) => {
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
        const items = await issueCommands.list(filter || get().filter);
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
        const issue = await issueCommands.create(data);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedIssue = deepClone(issue);
        set((state) => {
          state.items.unshift(clonedIssue);
          state.loading = false;
        });
        return clonedIssue;
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
        const index = state.items.findIndex((item: Issue) => item.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates } as Issue;
        }
      });

      try {
        const issue = await issueCommands.update(id, updates);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedIssue = deepClone(issue);
        set((state) => {
          const index = state.items.findIndex((item: Issue) => item.id === id);
          if (index !== -1) {
            state.items[index] = clonedIssue;
          }
        });
        return clonedIssue;
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
        state.items = state.items.filter((item: Issue) => item.id !== id);
        if (state.selectedId === id) {
          state.selectedId = null;
        }
      });

      try {
        await issueCommands.delete(id);
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
