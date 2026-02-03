import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { DownloadEvent } from '@tauri-apps/plugin-updater';

/**
 * Update status states representing the lifecycle of an app update
 */
export type UpdateStatus =
  | 'idle'           // No update activity
  | 'checking'       // Actively checking for updates
  | 'available'      // Update found and ready to download
  | 'downloading'    // Currently downloading the update
  | 'ready'          // Download complete, ready to install
  | 'error';         // An error occurred during the update process

/**
 * Information about an available update
 */
export interface UpdateInfo {
  version: string;
  currentVersion: string;
  releaseNotes?: string;
  releaseDate?: string;
}

/**
 * Download progress information
 */
export interface DownloadProgress {
  downloaded: number;     // Bytes downloaded
  total: number | null;   // Total bytes (null if unknown)
  percent: number;        // Progress percentage (0-100)
}

interface UpdateState {
  status: UpdateStatus;
  updateInfo: UpdateInfo | null;
  progress: DownloadProgress | null;
  error: string | null;

  // UI state
  dismissed: boolean;           // User has dismissed the notification
  lastChecked: number | null;   // Timestamp of last check
}

interface UpdateActions {
  /** Check for available updates */
  checkForUpdates: () => Promise<void>;

  /** Start downloading the update */
  downloadUpdate: () => Promise<void>;

  /** Install the update and restart the app */
  installAndRestart: () => Promise<void>;

  /** Dismiss the notification (hide it) */
  dismiss: () => void;

  /** Show the notification again after dismissing */
  showNotification: () => void;

  /** Reset state (e.g., after an error) */
  reset: () => void;

  /** Set error state */
  setError: (error: string) => void;

  /** Clear error */
  clearError: () => void;
}

type UpdateStore = UpdateState & UpdateActions;

// Initial state
const initialState: UpdateState = {
  status: 'idle',
  updateInfo: null,
  progress: null,
  error: null,
  dismissed: false,
  lastChecked: null,
};

export const useUpdateStore = create<UpdateStore>()(
  immer((set, get) => ({
    // State
    ...initialState,

    // Actions
    checkForUpdates: async () => {
      const state = get();

      // Don't check if already checking or downloading
      if (state.status === 'checking' || state.status === 'downloading') {
        return;
      }

      set((draft) => {
        draft.status = 'checking';
        draft.error = null;
      });

      try {
        // Dynamic import to avoid issues during SSR/build
        const { check } = await import('@tauri-apps/plugin-updater');
        const { getVersion } = await import('@tauri-apps/api/app');

        const currentVersion = await getVersion();
        const update = await check();

        set((draft) => {
          draft.lastChecked = Date.now();
        });

        if (update) {
          set((draft) => {
            draft.status = 'available';
            draft.updateInfo = {
              version: update.version,
              currentVersion,
              releaseNotes: update.body ?? undefined,
              releaseDate: update.date ?? undefined,
            };
            draft.dismissed = false; // Show notification for new update
          });
        } else {
          set((draft) => {
            draft.status = 'idle';
            draft.updateInfo = null;
          });
        }
      } catch (error) {
        console.error('Failed to check for updates:', error);
        set((draft) => {
          draft.status = 'error';
          draft.error = error instanceof Error ? error.message : 'Failed to check for updates';
        });
      }
    },

    downloadUpdate: async () => {
      const state = get();

      if (state.status !== 'available') {
        return;
      }

      set((draft) => {
        draft.status = 'downloading';
        draft.progress = { downloaded: 0, total: null, percent: 0 };
        draft.error = null;
      });

      try {
        const { check } = await import('@tauri-apps/plugin-updater');
        const update = await check();

        if (!update) {
          throw new Error('Update no longer available');
        }

        // Download with progress tracking
        await update.downloadAndInstall((progress: DownloadEvent) => {
          if (progress.event === 'Started') {
            set((draft) => {
              draft.progress = {
                downloaded: 0,
                total: progress.data.contentLength ?? null,
                percent: 0,
              };
            });
          } else if (progress.event === 'Progress') {
            set((draft) => {
              if (draft.progress) {
                draft.progress.downloaded += progress.data.chunkLength;
                if (draft.progress.total) {
                  draft.progress.percent = Math.round(
                    (draft.progress.downloaded / draft.progress.total) * 100
                  );
                }
              }
            });
          } else if (progress.event === 'Finished') {
            set((draft) => {
              draft.status = 'ready';
              if (draft.progress) {
                draft.progress.percent = 100;
              }
            });
          }
        });

        set((draft) => {
          draft.status = 'ready';
        });
      } catch (error) {
        console.error('Failed to download update:', error);
        set((draft) => {
          draft.status = 'error';
          draft.error = error instanceof Error ? error.message : 'Failed to download update';
          draft.progress = null;
        });
      }
    },

    installAndRestart: async () => {
      const state = get();

      if (state.status !== 'ready') {
        return;
      }

      try {
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      } catch (error) {
        console.error('Failed to restart app:', error);
        set((draft) => {
          draft.status = 'error';
          draft.error = error instanceof Error ? error.message : 'Failed to restart application';
        });
      }
    },

    dismiss: () => {
      set((draft) => {
        draft.dismissed = true;
      });
    },

    showNotification: () => {
      set((draft) => {
        draft.dismissed = false;
      });
    },

    reset: () => {
      set((draft) => {
        Object.assign(draft, initialState);
      });
    },

    setError: (error: string) => {
      set((draft) => {
        draft.status = 'error';
        draft.error = error;
      });
    },

    clearError: () => {
      set((draft) => {
        draft.error = null;
        // If we were in error state, go back to idle or available
        if (draft.status === 'error') {
          draft.status = draft.updateInfo ? 'available' : 'idle';
        }
      });
    },
  }))
);

// Selector helpers
export const selectIsUpdateAvailable = (state: UpdateStore) =>
  state.status === 'available' || state.status === 'downloading' || state.status === 'ready';

export const selectShouldShowNotification = (state: UpdateStore) =>
  selectIsUpdateAvailable(state) && !state.dismissed;

export const selectDownloadPercent = (state: UpdateStore) =>
  state.progress?.percent ?? 0;
