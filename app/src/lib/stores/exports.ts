import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import type { ExportStarted, ExportProgress, ExportComplete } from '@/lib/tauri/commands';

export interface Export {
  id: string;
  status: 'pending' | 'encoding' | 'complete' | 'error';
  outputPath: string;
  totalFrames: number;
  durationMs: number;
  progress: number;
  currentFrame: number;
  fps: number;
  elapsedSecs: number;
  estimatedRemainingSecs: number | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

interface ExportsState {
  exports: Record<string, Export>;
  activeExportId: string | null;
  listeners: UnlistenFn[];
  initialized: boolean;
}

interface ExportsActions {
  /** Initialize event listeners - call once at app startup */
  init: () => Promise<void>;
  /** Cleanup event listeners */
  cleanup: () => void;
  /** Add a new export (called when starting export) */
  addExport: (id: string, outputPath: string, durationMs: number, totalFrames: number) => void;
  /** Get export by ID */
  getExport: (id: string) => Export | undefined;
  /** Get all active (non-complete) exports */
  getActiveExports: () => Export[];
  /** Get the most recent export */
  getMostRecentExport: () => Export | undefined;
  /** Clear completed/errored exports */
  clearCompleted: () => void;
  /** Clear a specific export */
  clearExport: (id: string) => void;
  /** Check if any export is in progress */
  hasActiveExport: () => boolean;
}

type ExportsStore = ExportsState & ExportsActions;

export const useExportsStore = create<ExportsStore>()(
  immer((set, get) => ({
    // State
    exports: {},
    activeExportId: null,
    listeners: [],
    initialized: false,

    // Actions
    init: async () => {
      if (get().initialized) return;

      const listeners: UnlistenFn[] = [];

      // Listen for export started events
      listeners.push(
        await listen<ExportStarted>('export-started', (event) => {
          const { export_id, output_path, total_frames, duration_ms } = event.payload;
          set((state) => {
            state.exports[export_id] = {
              id: export_id,
              status: 'pending',
              outputPath: output_path,
              totalFrames: total_frames,
              durationMs: duration_ms,
              progress: 0,
              currentFrame: 0,
              fps: 0,
              elapsedSecs: 0,
              estimatedRemainingSecs: null,
              error: null,
              startedAt: Date.now(),
              completedAt: null,
            };
            state.activeExportId = export_id;
          });
        })
      );

      // Listen for export progress events
      listeners.push(
        await listen<ExportProgress>('export-progress', (event) => {
          const {
            export_id,
            percent,
            stage,
            current_frame,
            total_frames,
            fps,
            elapsed_secs,
            estimated_remaining_secs
          } = event.payload;

          set((state) => {
            const exp = state.exports[export_id];
            if (exp) {
              exp.status = 'encoding';
              exp.progress = percent;
              exp.currentFrame = current_frame;
              exp.totalFrames = total_frames;
              exp.fps = fps;
              exp.elapsedSecs = elapsed_secs;
              exp.estimatedRemainingSecs = estimated_remaining_secs;
            }
          });
        })
      );

      // Listen for export complete events
      listeners.push(
        await listen<ExportComplete>('export-complete', async (event) => {
          const { export_id, success, output_path, error } = event.payload;

          set((state) => {
            const exp = state.exports[export_id];
            if (exp) {
              exp.status = success ? 'complete' : 'error';
              exp.progress = success ? 100 : exp.progress;
              exp.error = error;
              exp.completedAt = Date.now();
              if (output_path) {
                exp.outputPath = output_path;
              }
            }
            if (state.activeExportId === export_id) {
              state.activeExportId = null;
            }
          });

          // Send system notification
          try {
            let permissionGranted = await isPermissionGranted();
            if (!permissionGranted) {
              const permission = await requestPermission();
              permissionGranted = permission === 'granted';
            }
            if (permissionGranted) {
              if (success) {
                sendNotification({
                  title: 'Export Complete',
                  body: `Your video has been exported successfully.`,
                });
              } else {
                sendNotification({
                  title: 'Export Failed',
                  body: error || 'An error occurred during export.',
                });
              }
            }
          } catch (e) {
            console.error('Failed to send notification:', e);
          }
        })
      );

      set((state) => {
        state.listeners = listeners;
        state.initialized = true;
      });
    },

    cleanup: () => {
      const { listeners } = get();
      listeners.forEach((unlisten) => unlisten());
      set((state) => {
        state.listeners = [];
        state.initialized = false;
      });
    },

    addExport: (id, outputPath, durationMs, totalFrames) => {
      set((state) => {
        state.exports[id] = {
          id,
          status: 'pending',
          outputPath,
          totalFrames,
          durationMs,
          progress: 0,
          currentFrame: 0,
          fps: 0,
          elapsedSecs: 0,
          estimatedRemainingSecs: null,
          error: null,
          startedAt: Date.now(),
          completedAt: null,
        };
        state.activeExportId = id;
      });
    },

    getExport: (id) => {
      return get().exports[id];
    },

    getActiveExports: () => {
      const { exports } = get();
      return Object.values(exports).filter(
        (e) => e.status === 'pending' || e.status === 'encoding'
      );
    },

    getMostRecentExport: () => {
      const { exports } = get();
      const sorted = Object.values(exports).sort((a, b) => b.startedAt - a.startedAt);
      return sorted[0];
    },

    clearCompleted: () => {
      set((state) => {
        Object.keys(state.exports).forEach((id) => {
          if (state.exports[id].status === 'complete' || state.exports[id].status === 'error') {
            delete state.exports[id];
          }
        });
      });
    },

    clearExport: (id) => {
      set((state) => {
        delete state.exports[id];
        if (state.activeExportId === id) {
          state.activeExportId = null;
        }
      });
    },

    hasActiveExport: () => {
      return get().getActiveExports().length > 0;
    },
  }))
);
