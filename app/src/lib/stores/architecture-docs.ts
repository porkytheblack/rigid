import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  ArchitectureDoc,
  NewArchitectureDoc,
  UpdateArchitectureDoc,
  ArchitectureDocWithBlocks,
  ArchitectureDocBlock,
  NewArchitectureDocBlock,
  UpdateArchitectureDocBlock,
} from '@/lib/tauri/types';
import { architectureDocs as archDocCommands } from '@/lib/tauri/commands';

interface ArchitectureDocsState {
  items: ArchitectureDoc[];
  selectedId: string | null;
  currentDoc: ArchitectureDocWithBlocks | null;
  appId: string | null;
  loading: boolean;
  error: string | null;
}

interface ArchitectureDocsActions {
  loadByApp: (appId: string) => Promise<void>;
  loadDoc: (id: string) => Promise<ArchitectureDocWithBlocks>;
  select: (id: string | null) => void;
  create: (data: NewArchitectureDoc) => Promise<ArchitectureDoc>;
  update: (id: string, updates: UpdateArchitectureDoc) => Promise<ArchitectureDoc>;
  delete: (id: string) => Promise<void>;
  reorder: (docIds: string[]) => Promise<void>;
  getById: (id: string) => ArchitectureDoc | undefined;
  clearError: () => void;
  clearCurrentDoc: () => void;

  // Block operations
  createBlock: (block: NewArchitectureDocBlock) => Promise<ArchitectureDocBlock>;
  updateBlock: (id: string, updates: UpdateArchitectureDocBlock) => Promise<ArchitectureDocBlock>;
  deleteBlock: (id: string) => Promise<void>;
  bulkReplaceBlocks: (docId: string, blocks: NewArchitectureDocBlock[]) => Promise<ArchitectureDocBlock[]>;
}

type ArchitectureDocsStore = ArchitectureDocsState & ArchitectureDocsActions;

export const useArchitectureDocsStore = create<ArchitectureDocsStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    currentDoc: null,
    appId: null,
    loading: false,
    error: null,

    // Actions
    loadByApp: async (appId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.appId = appId;
      });

      try {
        const items = await archDocCommands.list(appId);
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

    loadDoc: async (id: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const docWithBlocks = await archDocCommands.getWithBlocks(id);
        set((state) => {
          state.currentDoc = docWithBlocks;
          state.selectedId = id;
          state.loading = false;
        });
        return docWithBlocks;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
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
        const doc = await archDocCommands.create(data);
        set((state) => {
          state.items.push(doc);
          state.loading = false;
        });
        return doc;
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
          state.items[index] = { ...state.items[index], ...updates } as ArchitectureDoc;
        }
        if (state.currentDoc?.doc.id === id) {
          state.currentDoc.doc = { ...state.currentDoc.doc, ...updates } as ArchitectureDoc;
        }
      });

      try {
        const doc = await archDocCommands.update(id, updates);
        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = doc;
          }
          if (state.currentDoc?.doc.id === id) {
            state.currentDoc.doc = doc;
          }
        });
        return doc;
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
        if (state.currentDoc?.doc.id === id) {
          state.currentDoc = null;
        }
      });

      try {
        await archDocCommands.delete(id);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    reorder: async (docIds) => {
      const previousItems = get().items;

      // Optimistic update
      set((state) => {
        const reorderedItems: ArchitectureDoc[] = [];
        for (const id of docIds) {
          const item = state.items.find((i) => i.id === id);
          if (item) {
            reorderedItems.push(item);
          }
        }
        state.items = reorderedItems;
      });

      try {
        await archDocCommands.reorder(docIds);
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

    clearCurrentDoc: () => {
      set((state) => {
        state.currentDoc = null;
        state.selectedId = null;
      });
    },

    // Block operations
    createBlock: async (block) => {
      try {
        const newBlock = await archDocCommands.createBlock(block);
        set((state) => {
          if (state.currentDoc && state.currentDoc.doc.id === block.doc_id) {
            state.currentDoc.blocks.push(newBlock);
          }
        });
        return newBlock;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    updateBlock: async (id, updates) => {
      try {
        const updatedBlock = await archDocCommands.updateBlock(id, updates);
        set((state) => {
          if (state.currentDoc) {
            const index = state.currentDoc.blocks.findIndex((b) => b.id === id);
            if (index !== -1) {
              state.currentDoc.blocks[index] = updatedBlock;
            }
          }
        });
        return updatedBlock;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    deleteBlock: async (id) => {
      try {
        await archDocCommands.deleteBlock(id);
        set((state) => {
          if (state.currentDoc) {
            state.currentDoc.blocks = state.currentDoc.blocks.filter((b) => b.id !== id);
          }
        });
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    bulkReplaceBlocks: async (docId, blocks) => {
      try {
        const newBlocks = await archDocCommands.bulkReplaceBlocks(docId, blocks);
        set((state) => {
          if (state.currentDoc && state.currentDoc.doc.id === docId) {
            state.currentDoc.blocks = newBlocks;
          }
        });
        return newBlocks;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },
  }))
);
