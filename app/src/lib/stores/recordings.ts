import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Recording, RecordingFilter, NewRecording, UpdateRecording } from '@/lib/tauri/types';
import { recordings as recordingCommands, capture, type RecordingOptions } from '@/lib/tauri/commands';
import { deepClone } from '@/lib/utils';

interface RecordingsState {
  items: Recording[];
  selectedId: string | null;
  filter: RecordingFilter;
  loading: boolean;
  isRecording: boolean;
  currentRecordingId: string | null;
  error: string | null;
}

interface RecordingsActions {
  load: () => Promise<void>;
  loadByExploration: (explorationId: string) => Promise<void>;
  loadByApp: (appId: string) => Promise<void>;
  loadByTest: (testId: string) => Promise<void>;  // Legacy alias
  setFilter: (filter: RecordingFilter) => void;
  select: (id: string | null) => void;
  create: (data: NewRecording) => Promise<Recording>;
  update: (id: string, updates: UpdateRecording) => Promise<Recording>;
  delete: (id: string) => Promise<void>;
  // Recording controls
  startRecording: (options?: RecordingOptions) => Promise<Recording>;
  stopRecording: () => Promise<Recording>;
  cancelRecording: () => Promise<void>;
  checkRecordingStatus: () => Promise<void>;
  getById: (id: string) => Recording | undefined;
  clearError: () => void;
}

type RecordingsStore = RecordingsState & RecordingsActions;

export const useRecordingsStore = create<RecordingsStore>()(
  immer((set, get) => ({
    // State
    items: [],
    selectedId: null,
    filter: {},
    loading: false,
    isRecording: false,
    currentRecordingId: null,
    error: null,

    // Actions
    load: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const items = await recordingCommands.list(get().filter);
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

    loadByExploration: async (explorationId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.filter = { ...state.filter, test_id: explorationId };
      });

      try {
        const items = await recordingCommands.listByTest(explorationId);
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
        const items = await recordingCommands.list({ app_id: appId });
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

    // Legacy alias
    loadByTest: async (testId: string) => {
      return get().loadByExploration(testId);
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
        const recording = await recordingCommands.create(data);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedRecording = deepClone(recording);
        set((state) => {
          state.items.unshift(clonedRecording);
          state.loading = false;
        });
        return clonedRecording;
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
          state.items[index] = { ...state.items[index], ...updates } as Recording;
        }
      });

      try {
        const recording = await recordingCommands.update(id, updates);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedRecording = deepClone(recording);
        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = clonedRecording;
          }
        });
        return clonedRecording;
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
        await recordingCommands.delete(id);
      } catch (error) {
        // Rollback
        set((state) => {
          state.items = previousItems;
          state.error = error instanceof Error ? error.message : String(error);
        });
        throw error;
      }
    },

    startRecording: async (options = {}) => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const recording = await capture.startRecording(options);
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedRecording = deepClone(recording);
        set((state) => {
          state.items.unshift(clonedRecording);
          state.isRecording = true;
          state.currentRecordingId = clonedRecording.id;
          state.loading = false;
        });
        return clonedRecording;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    stopRecording: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        const recording = await capture.stopRecording();
        // Deep clone to avoid frozen Tauri objects in Immer state
        const clonedRecording = deepClone(recording);
        set((state) => {
          const index = state.items.findIndex((item) => item.id === clonedRecording.id);
          if (index !== -1) {
            state.items[index] = clonedRecording;
          }
          state.isRecording = false;
          state.currentRecordingId = null;
          state.loading = false;
        });
        return clonedRecording;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.loading = false;
        });
        throw error;
      }
    },

    cancelRecording: async () => {
      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        await capture.cancelRecording();
        set((state) => {
          state.isRecording = false;
          state.currentRecordingId = null;
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

    checkRecordingStatus: async () => {
      try {
        const isRecording = await capture.isRecording();
        const currentRecordingId = await capture.getCurrentRecordingId();
        set((state) => {
          state.isRecording = isRecording;
          state.currentRecordingId = currentRecordingId;
        });
      } catch (error) {
        // Ignore errors when checking status
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
