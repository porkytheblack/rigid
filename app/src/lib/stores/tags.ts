import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Tag, NewTag, UpdateTag, TaggableType } from '@/lib/tauri/types';
import { tags as tagCommands } from '@/lib/tauri/commands';
import { deepClone } from '@/lib/utils';

interface TagsState {
  items: Tag[];
  loading: boolean;
  error: string | null;
}

interface TagsActions {
  load: () => Promise<void>;
  create: (data: NewTag) => Promise<Tag>;
  update: (id: string, updates: UpdateTag) => Promise<Tag>;
  delete: (id: string) => Promise<void>;
  addToEntity: (tagId: string, type: TaggableType, entityId: string) => Promise<void>;
  removeFromEntity: (tagId: string, type: TaggableType, entityId: string) => Promise<void>;
  getForEntity: (type: TaggableType, entityId: string) => Promise<Tag[]>;
  clearError: () => void;
}

type TagsStore = TagsState & TagsActions;

export const useTagsStore = create<TagsStore>()(
  immer((set, get) => ({
    // State
    items: [],
    loading: false,
    error: null,

    // Actions
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const items = await tagCommands.list();
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

    create: async (data) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const tag = await tagCommands.create(data);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedTag = deepClone(tag);
        set((state) => {
          state.items.push(clonedTag);
          state.items.sort((a: Tag, b: Tag) => a.name.localeCompare(b.name));
          state.loading = false;
        });
        return clonedTag;
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
        const index = state.items.findIndex((item: Tag) => item.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates } as Tag;
        }
      });

      try {
        const tag = await tagCommands.update(id, updates);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedTag = deepClone(tag);
        set((state) => {
          const index = state.items.findIndex((item: Tag) => item.id === id);
          if (index !== -1) {
            state.items[index] = clonedTag;
          }
          state.items.sort((a: Tag, b: Tag) => a.name.localeCompare(b.name));
        });
        return clonedTag;
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
        state.items = state.items.filter((item: Tag) => item.id !== id);
      });

      try {
        await tagCommands.delete(id);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    addToEntity: async (tagId, type, entityId) => {
      try {
        await tagCommands.addToEntity(tagId, type, entityId);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    removeFromEntity: async (tagId, type, entityId) => {
      try {
        await tagCommands.removeFromEntity(tagId, type, entityId);
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    getForEntity: async (type, entityId) => {
      try {
        return await tagCommands.getForEntity(type, entityId);
      } catch (error) {
        set((state) => {
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
