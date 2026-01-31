import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Demo,
  NewDemo,
  UpdateDemo,
  DemoWithData,
  DemoBackground,
  NewDemoBackground,
  DemoTrack,
  NewDemoTrack,
  DemoClip,
  NewDemoClip,
  DemoAsset,
  NewDemoAsset,
  DemoZoomClip,
  NewDemoZoomClip,
  DemoBlurClip,
  NewDemoBlurClip,
  DemoPanClip,
  NewDemoPanClip,
  DemoFormat,
} from '@/lib/tauri/types';
import { DEMO_FORMAT_DIMENSIONS } from '@/lib/tauri/types';
import {
  demos as demosApi,
  demoBackgrounds as demoBackgroundsApi,
  demoTracks as demoTracksApi,
  demoClips as demoClipsApi,
  demoZoomClips as demoZoomClipsApi,
  demoBlurClips as demoBlurClipsApi,
  demoPanClips as demoPanClipsApi,
  demoAssets as demoAssetsApi,
} from '@/lib/tauri/commands';

// =============================================================================
// Demo Editor State Types
// =============================================================================

export interface PlaybackState {
  isPlaying: boolean;
  currentTimeMs: number;
  durationMs: number;
  volume: number;
  isMuted: boolean;
  isLooping: boolean;
}

export interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  showSafeZones: boolean;
  selectedClipId: string | null;
  selectedClipIds: string[];
  selectedZoomClipId: string | null;
  selectedBlurClipId: string | null;
  selectedPanClipId: string | null;
}

export interface TimelineState {
  zoom: number;
  scrollX: number;
  snapEnabled: boolean;
  selectedTrackId: string | null;
}

export interface HistoryEntry {
  timestamp: number;
  action: string;
  state: DemoWithData;
}

// =============================================================================
// Demo Store
// =============================================================================

interface PendingDeletions {
  clips: string[];
  zoomClips: string[];
  blurClips: string[];
  panClips: string[];
  assets: string[];
  tracks: string[];
}

interface DemosState {
  // List of demos for the current app
  items: Demo[];
  appId: string | null;
  loading: boolean;
  error: string | null;

  // Currently loaded demo project
  currentDemo: DemoWithData | null;
  selectedDemoId: string | null;

  // Editor state
  playback: PlaybackState;
  canvas: CanvasState;
  timeline: TimelineState;

  // Undo/redo history
  history: HistoryEntry[];
  historyIndex: number;

  // Track items that need to be deleted from database
  pendingDeletions: PendingDeletions;
}

interface DemosActions {
  // Demo CRUD
  loadByApp: (appId: string) => Promise<void>;
  loadDemo: (id: string) => Promise<DemoWithData>;
  select: (id: string | null) => void;
  create: (data: NewDemo) => Promise<Demo>;
  update: (id: string, updates: UpdateDemo) => Promise<Demo>;
  delete: (id: string) => Promise<void>;
  getById: (id: string) => Demo | undefined;
  clearError: () => void;
  clearCurrentDemo: () => void;

  // Save/persist operations
  saveDemo: () => Promise<void>;
  updateDemoInfo: (updates: { name?: string; format?: DemoFormat }) => Promise<void>;

  // Demo duration
  setDemoDuration: (durationMs: number) => void;

  // Background operations
  setBackground: (background: NewDemoBackground) => void;
  updateBackground: (updates: Partial<DemoBackground>) => void;

  // Track operations
  addTrack: (track: NewDemoTrack) => string | null;  // Returns the new track ID
  updateTrack: (id: string, updates: Partial<DemoTrack>) => void;
  deleteTrack: (id: string) => void;
  reorderTracks: (trackIds: string[]) => void;

  // Clip operations
  addClip: (clip: NewDemoClip) => string | null;  // Returns the new clip ID
  updateClip: (id: string, updates: Partial<DemoClip>) => void;
  deleteClip: (id: string) => void;
  moveClip: (id: string, trackId: string, startTimeMs: number) => void;
  trimClip: (id: string, inPointMs: number, outPointMs: number) => void;
  splitClip: (id: string, atTimeMs: number) => void;
  duplicateClip: (id: string) => void;

  // Asset operations
  addAsset: (asset: NewDemoAsset) => void;
  removeAsset: (id: string) => void;
  renameAsset: (id: string, name: string) => void;

  // Zoom clip operations
  addZoomClip: (clip: NewDemoZoomClip) => void;
  updateZoomClip: (id: string, updates: Partial<DemoZoomClip>) => void;
  deleteZoomClip: (id: string) => void;
  selectZoomClip: (id: string | null) => void;

  // Blur clip operations
  addBlurClip: (clip: NewDemoBlurClip) => void;
  updateBlurClip: (id: string, updates: Partial<DemoBlurClip>) => void;
  deleteBlurClip: (id: string) => void;
  selectBlurClip: (id: string | null) => void;

  // Pan clip operations
  addPanClip: (clip: NewDemoPanClip) => void;
  updatePanClip: (id: string, updates: Partial<DemoPanClip>) => void;
  deletePanClip: (id: string) => void;
  selectPanClip: (id: string | null) => void;

  // Playback controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (timeMs: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLoop: () => void;
  jumpForward: (ms?: number) => void;
  jumpBackward: (ms?: number) => void;
  nextFrame: () => void;
  previousFrame: () => void;

  // Canvas controls
  setCanvasZoom: (zoom: number) => void;
  fitCanvas: () => void;
  resetCanvas: () => void;
  selectClip: (id: string | null) => void;
  selectClips: (ids: string[]) => void;
  toggleSafeZones: () => void;

  // Timeline controls
  setTimelineZoom: (zoom: number) => void;
  setTimelineScroll: (scrollX: number) => void;
  toggleSnap: () => void;
  selectTrack: (id: string | null) => void;

  // History (undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: (action: string) => void;
}

type DemosStore = DemosState & DemosActions;

// Generate a simple UUID
const generateId = (): string => {
  return 'xxxx-xxxx-xxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
};

export const useDemosStore = create<DemosStore>()(
  immer((set, get) => ({
    // ==========================================================================
    // State
    // ==========================================================================
    items: [],
    appId: null,
    loading: false,
    error: null,
    currentDemo: null,
    selectedDemoId: null,

    playback: {
      isPlaying: false,
      currentTimeMs: 0,
      durationMs: 0,
      volume: 1,
      isMuted: false,
      isLooping: false,
    },

    canvas: {
      zoom: 1,
      panX: 0,
      panY: 0,
      showSafeZones: false,
      selectedClipId: null,
      selectedClipIds: [],
      selectedZoomClipId: null,
      selectedBlurClipId: null,
      selectedPanClipId: null,
    },

    timeline: {
      zoom: 1,
      scrollX: 0,
      snapEnabled: true,
      selectedTrackId: null,
    },

    history: [],
    historyIndex: -1,

    pendingDeletions: {
      clips: [],
      zoomClips: [],
      blurClips: [],
      panClips: [],
      assets: [],
      tracks: [],
    },

    // ==========================================================================
    // Demo CRUD Actions
    // ==========================================================================

    loadByApp: async (appId: string) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.appId = appId;
      });

      try {
        const demos = await demosApi.list({ app_id: appId });
        set((state) => {
          state.items = demos;
          state.loading = false;
        });
      } catch (err) {
        console.error('Failed to load demos:', err);
        set((state) => {
          state.error = String(err);
          state.loading = false;
        });
      }
    },

    loadDemo: async (id: string) => {
      // If we already have this demo loaded with data, just return it
      const existingCurrentDemo = get().currentDemo;
      if (existingCurrentDemo && existingCurrentDemo.demo.id === id) {
        set((state) => {
          state.selectedDemoId = id;
        });
        return existingCurrentDemo;
      }

      set((state) => {
        state.loading = true;
        state.error = null;
      });

      try {
        // Load the demo with all its data from the database
        // Note: Default tracks are created in the create() function, not here
        // loadDemo should only load existing data
        const demoWithData = await demosApi.getWithData(id);

        set((state) => {
          state.currentDemo = demoWithData;
          state.selectedDemoId = id;
          state.playback.durationMs = demoWithData.demo.duration_ms || 60000;
          state.loading = false;
          // Clear pending deletions when loading a new demo
          state.pendingDeletions = {
            clips: [],
            zoomClips: [],
            blurClips: [],
            panClips: [],
            assets: [],
            tracks: [],
          };
        });

        return demoWithData;
      } catch (err) {
        console.error('Failed to load demo:', err);
        set((state) => {
          state.error = String(err);
          state.loading = false;
        });
        throw err;
      }
    },

    select: (id) => {
      set((state) => {
        state.selectedDemoId = id;
      });
    },

    create: async (data) => {
      try {
        // Create the demo in the database
        // Note: No default tracks are created - user must explicitly add tracks
        const newDemo = await demosApi.create(data);

        // Create DemoWithData for immediate use (no default tracks)
        const demoWithData: DemoWithData = {
          demo: newDemo,
          background: null,
          tracks: [],
          clips: [],
          zoomClips: [],
          blurClips: [],
          panClips: [],
          assets: [],
        };

        set((state) => {
          state.items.push(newDemo);
          state.currentDemo = demoWithData;
          state.selectedDemoId = newDemo.id;
          state.playback.durationMs = newDemo.duration_ms;
          // Clear pending deletions when creating a new demo
          state.pendingDeletions = {
            clips: [],
            zoomClips: [],
            blurClips: [],
            panClips: [],
            assets: [],
            tracks: [],
          };
        });

        return newDemo;
      } catch (err) {
        console.error('Failed to create demo:', err);
        throw err;
      }
    },

    update: async (id, updates) => {
      try {
        // Update in the database
        const updatedDemo = await demosApi.update(id, updates);

        // Update local state
        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = updatedDemo;
          }
          if (state.currentDemo?.demo.id === id) {
            state.currentDemo.demo = updatedDemo;
          }
        });

        return updatedDemo;
      } catch (err) {
        console.error('Failed to update demo:', err);
        throw err;
      }
    },

    delete: async (id) => {
      try {
        // Delete from the database
        await demosApi.delete(id);

        // Update local state
        set((state) => {
          state.items = state.items.filter((item) => item.id !== id);
          if (state.selectedDemoId === id) {
            state.selectedDemoId = null;
          }
          if (state.currentDemo?.demo.id === id) {
            state.currentDemo = null;
          }
        });
      } catch (err) {
        console.error('Failed to delete demo:', err);
        throw err;
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

    clearCurrentDemo: () => {
      set((state) => {
        state.currentDemo = null;
        state.selectedDemoId = null;
        state.playback = {
          isPlaying: false,
          currentTimeMs: 0,
          durationMs: 0,
          volume: 1,
          isMuted: false,
          isLooping: false,
        };
        state.canvas = {
          zoom: 1,
          panX: 0,
          panY: 0,
          showSafeZones: false,
          selectedClipId: null,
          selectedClipIds: [],
          selectedZoomClipId: null,
          selectedBlurClipId: null,
          selectedPanClipId: null,
        };
        state.timeline = {
          zoom: 1,
          scrollX: 0,
          snapEnabled: true,
          selectedTrackId: null,
        };
        state.history = [];
        state.historyIndex = -1;
      });
    },

    // ==========================================================================
    // Save/Persist Operations
    // ==========================================================================

    saveDemo: async () => {
      const currentDemo = get().currentDemo;
      if (!currentDemo) return;

      try {
        // Save the demo itself
        await demosApi.update(currentDemo.demo.id, {
          name: currentDemo.demo.name,
          format: currentDemo.demo.format,
          width: currentDemo.demo.width,
          height: currentDemo.demo.height,
          frame_rate: currentDemo.demo.frame_rate,
          duration_ms: currentDemo.demo.duration_ms,
        });

        // Process pending deletions first
        const { pendingDeletions } = get();

        // First, clear linked_clip_id references to avoid FK constraint failures
        // We need to clear links both FROM clips being deleted and TO clips being deleted
        if (pendingDeletions.clips.length > 0) {
          // Clear linked_clip_id on all remaining clips that might reference deleted clips
          for (const clip of currentDemo.clips) {
            if (clip.linked_clip_id && pendingDeletions.clips.includes(clip.linked_clip_id)) {
              try {
                await demoClipsApi.update(clip.id, { linked_clip_id: null });
              } catch {
                // Ignore - clip might not exist in DB
              }
            }
          }
          // Clear linked_clip_id on clips being deleted (in case something else references them)
          for (const clipId of pendingDeletions.clips) {
            try {
              await demoClipsApi.update(clipId, { linked_clip_id: null });
            } catch {
              // Ignore - clip might not exist in DB
            }
          }
        }

        // Delete clips (now safe since linked_clip_id references are cleared)
        for (const clipId of pendingDeletions.clips) {
          try {
            await demoClipsApi.delete(clipId);
          } catch {
            // Ignore errors - clip might not exist in DB yet
          }
        }

        // Delete zoom clips
        for (const zoomClipId of pendingDeletions.zoomClips) {
          try {
            await demoZoomClipsApi.delete(zoomClipId);
          } catch {
            // Ignore errors - zoom clip might not exist in DB yet
          }
        }

        // Delete blur clips
        for (const blurClipId of pendingDeletions.blurClips) {
          try {
            await demoBlurClipsApi.delete(blurClipId);
          } catch {
            // Ignore errors - blur clip might not exist in DB yet
          }
        }

        // Delete pan clips
        for (const panClipId of pendingDeletions.panClips) {
          try {
            await demoPanClipsApi.delete(panClipId);
          } catch {
            // Ignore errors - pan clip might not exist in DB yet
          }
        }

        // Delete assets
        for (const assetId of pendingDeletions.assets) {
          try {
            await demoAssetsApi.delete(assetId);
          } catch {
            // Ignore errors - asset might not exist in DB yet
          }
        }

        // Delete tracks last (after clips are deleted)
        for (const trackId of pendingDeletions.tracks) {
          try {
            await demoTracksApi.delete(trackId);
          } catch {
            // Ignore errors - track might not exist in DB yet
          }
        }

        // Clear pending deletions after processing
        set((state) => {
          state.pendingDeletions = {
            clips: [],
            zoomClips: [],
            blurClips: [],
            panClips: [],
            assets: [],
            tracks: [],
          };
        });

        // Save background if exists
        if (currentDemo.background) {
          const backgroundData = {
            background_type: currentDemo.background.background_type,
            color: currentDemo.background.color,
            gradient_stops: currentDemo.background.gradient_stops,
            gradient_direction: currentDemo.background.gradient_direction,
            gradient_angle: currentDemo.background.gradient_angle,
            pattern_type: currentDemo.background.pattern_type,
            pattern_color: currentDemo.background.pattern_color,
            pattern_scale: currentDemo.background.pattern_scale,
            media_path: currentDemo.background.media_path,
            media_scale: currentDemo.background.media_scale,
            media_position_x: currentDemo.background.media_position_x,
            media_position_y: currentDemo.background.media_position_y,
            image_url: currentDemo.background.image_url,
            image_attribution: currentDemo.background.image_attribution,
          };
          try {
            await demoBackgroundsApi.update(currentDemo.background.id, backgroundData);
          } catch {
            // Background might not exist yet, try to create it
            const createdBackground = await demoBackgroundsApi.create({
              demo_id: currentDemo.demo.id,
              ...backgroundData,
            });
            // Update local state with the server-generated ID
            set((state) => {
              if (state.currentDemo) {
                state.currentDemo.background = createdBackground;
              }
            });
          }
        }

        // Save tracks
        for (const track of currentDemo.tracks) {
          try {
            await demoTracksApi.update(track.id, {
              name: track.name,
              locked: track.locked,
              visible: track.visible,
              muted: track.muted,
              volume: track.volume,
              sort_order: track.sort_order,
              target_track_id: track.target_track_id,
            });
          } catch {
            // Track might not exist yet, try to create it
            await demoTracksApi.create({
              id: track.id,  // Use client-provided ID for consistency
              demo_id: currentDemo.demo.id,
              track_type: track.track_type,
              name: track.name,
              sort_order: track.sort_order,
              target_track_id: track.target_track_id,
            });
          }
        }

        // Save clips - first pass: create/update without linked_clip_id to avoid FK constraint issues
        const clipsWithLinks: Array<{ id: string; linked_clip_id: string }> = [];
        for (const clip of currentDemo.clips) {
          // Track clips that have linked_clip_id for second pass
          if (clip.linked_clip_id) {
            clipsWithLinks.push({ id: clip.id, linked_clip_id: clip.linked_clip_id });
          }

          try {
            await demoClipsApi.update(clip.id, {
              name: clip.name,
              start_time_ms: clip.start_time_ms,
              duration_ms: clip.duration_ms,
              in_point_ms: clip.in_point_ms,
              out_point_ms: clip.out_point_ms,
              position_x: clip.position_x,
              position_y: clip.position_y,
              scale: clip.scale,
              opacity: clip.opacity,
              speed: clip.speed,
              corner_radius: clip.corner_radius,
              shadow_enabled: clip.shadow_enabled,
              shadow_blur: clip.shadow_blur,
              shadow_opacity: clip.shadow_opacity,
              shadow_offset_x: clip.shadow_offset_x,
              shadow_offset_y: clip.shadow_offset_y,
              crop_top: clip.crop_top,
              crop_bottom: clip.crop_bottom,
              crop_left: clip.crop_left,
              crop_right: clip.crop_right,
              // Freeze frame
              freeze_frame: clip.freeze_frame,
              freeze_frame_time_ms: clip.freeze_frame_time_ms,
              // Transitions
              transition_in_type: clip.transition_in_type,
              transition_in_duration_ms: clip.transition_in_duration_ms,
              transition_out_type: clip.transition_out_type,
              transition_out_duration_ms: clip.transition_out_duration_ms,
              // Audio fade
              audio_fade_in_ms: clip.audio_fade_in_ms,
              audio_fade_out_ms: clip.audio_fade_out_ms,
              // Don't set linked_clip_id here - will be set in second pass
              muted: clip.muted,
            });
          } catch {
            // Clip might not exist yet, try to create it (without linked_clip_id)
            await demoClipsApi.create({
              id: clip.id,  // Use client-provided ID for consistency
              track_id: clip.track_id,
              name: clip.name,
              source_path: clip.source_path,
              source_type: clip.source_type,
              start_time_ms: clip.start_time_ms,
              duration_ms: clip.duration_ms,
              in_point_ms: clip.in_point_ms,
              position_x: clip.position_x,
              position_y: clip.position_y,
              scale: clip.scale,
              speed: clip.speed,
              has_audio: clip.has_audio,
              // Don't set linked_clip_id here - will be set in second pass
              muted: clip.muted,
            });
          }
        }

        // Second pass: update linked_clip_id for clips that have links
        for (const { id, linked_clip_id } of clipsWithLinks) {
          try {
            await demoClipsApi.update(id, { linked_clip_id });
          } catch (err) {
            console.warn('Failed to set linked_clip_id for clip:', id, err);
          }
        }

        // Save zoom clips
        for (const zoomClip of currentDemo.zoomClips) {
          try {
            await demoZoomClipsApi.update(zoomClip.id, {
              name: zoomClip.name,
              start_time_ms: zoomClip.start_time_ms,
              duration_ms: zoomClip.duration_ms,
              zoom_scale: zoomClip.zoom_scale,
              zoom_center_x: zoomClip.zoom_center_x,
              zoom_center_y: zoomClip.zoom_center_y,
              ease_in_duration_ms: zoomClip.ease_in_duration_ms,
              ease_out_duration_ms: zoomClip.ease_out_duration_ms,
            });
          } catch {
            // Zoom clip might not exist yet, try to create it
            await demoZoomClipsApi.create({
              id: zoomClip.id, // Use client-provided ID for consistency
              track_id: zoomClip.track_id,
              name: zoomClip.name,
              start_time_ms: zoomClip.start_time_ms,
              duration_ms: zoomClip.duration_ms,
              zoom_scale: zoomClip.zoom_scale,
              zoom_center_x: zoomClip.zoom_center_x,
              zoom_center_y: zoomClip.zoom_center_y,
              ease_in_duration_ms: zoomClip.ease_in_duration_ms,
              ease_out_duration_ms: zoomClip.ease_out_duration_ms,
            });
          }
        }

        // Save blur clips
        for (const blurClip of currentDemo.blurClips) {
          try {
            await demoBlurClipsApi.update(blurClip.id, {
              name: blurClip.name,
              start_time_ms: blurClip.start_time_ms,
              duration_ms: blurClip.duration_ms,
              blur_intensity: blurClip.blur_intensity,
              region_x: blurClip.region_x,
              region_y: blurClip.region_y,
              region_width: blurClip.region_width,
              region_height: blurClip.region_height,
              corner_radius: blurClip.corner_radius,
              blur_inside: blurClip.blur_inside,
              ease_in_duration_ms: blurClip.ease_in_duration_ms,
              ease_out_duration_ms: blurClip.ease_out_duration_ms,
            });
          } catch {
            // Blur clip might not exist yet, try to create it
            await demoBlurClipsApi.create({
              id: blurClip.id, // Use client-provided ID for consistency
              track_id: blurClip.track_id,
              name: blurClip.name,
              start_time_ms: blurClip.start_time_ms,
              duration_ms: blurClip.duration_ms,
              blur_intensity: blurClip.blur_intensity,
              region_x: blurClip.region_x,
              region_y: blurClip.region_y,
              region_width: blurClip.region_width,
              region_height: blurClip.region_height,
              corner_radius: blurClip.corner_radius,
              blur_inside: blurClip.blur_inside,
              ease_in_duration_ms: blurClip.ease_in_duration_ms,
              ease_out_duration_ms: blurClip.ease_out_duration_ms,
            });
          }
        }

        // Save pan clips
        for (const panClip of currentDemo.panClips) {
          try {
            await demoPanClipsApi.update(panClip.id, {
              name: panClip.name,
              start_time_ms: panClip.start_time_ms,
              duration_ms: panClip.duration_ms,
              start_x: panClip.start_x,
              start_y: panClip.start_y,
              end_x: panClip.end_x,
              end_y: panClip.end_y,
              ease_in_duration_ms: panClip.ease_in_duration_ms,
              ease_out_duration_ms: panClip.ease_out_duration_ms,
            });
          } catch {
            // Pan clip might not exist yet, try to create it
            await demoPanClipsApi.create({
              id: panClip.id, // Use client-provided ID for consistency
              track_id: panClip.track_id,
              name: panClip.name,
              start_time_ms: panClip.start_time_ms,
              duration_ms: panClip.duration_ms,
              start_x: panClip.start_x,
              start_y: panClip.start_y,
              end_x: panClip.end_x,
              end_y: panClip.end_y,
              ease_in_duration_ms: panClip.ease_in_duration_ms,
              ease_out_duration_ms: panClip.ease_out_duration_ms,
            });
          }
        }

        // Save assets
        for (const asset of currentDemo.assets) {
          try {
            await demoAssetsApi.update(asset.id, {
              name: asset.name,
              thumbnail_path: asset.thumbnail_path,
            });
          } catch {
            // Asset might not exist yet, try to create it
            await demoAssetsApi.create({
              id: asset.id, // Use client-provided ID for consistency
              demo_id: currentDemo.demo.id,
              name: asset.name,
              file_path: asset.file_path,
              asset_type: asset.asset_type,
              duration_ms: asset.duration_ms,
              width: asset.width,
              height: asset.height,
              thumbnail_path: asset.thumbnail_path,
              file_size: asset.file_size,
              has_audio: asset.has_audio,
            });
          }
        }

        console.log('Demo saved successfully');
      } catch (error) {
        console.error('Failed to save demo:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to save demo';
        });
        throw error;
      }
    },

    updateDemoInfo: async (updates) => {
      const currentDemo = get().currentDemo;
      if (!currentDemo) return;

      // Calculate new dimensions if format is being changed
      let dimensionUpdates: { width?: number; height?: number } = {};
      if (updates.format && updates.format !== 'custom') {
        const dimensions = DEMO_FORMAT_DIMENSIONS[updates.format];
        dimensionUpdates = { width: dimensions.width, height: dimensions.height };
      }

      const fullUpdates: UpdateDemo = {
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.format !== undefined ? { format: updates.format } : {}),
        ...dimensionUpdates,
      };

      // Optimistic update
      set((state) => {
        if (state.currentDemo) {
          if (updates.name !== undefined) {
            state.currentDemo.demo.name = updates.name;
          }
          if (updates.format !== undefined) {
            state.currentDemo.demo.format = updates.format;
            if (dimensionUpdates.width) {
              state.currentDemo.demo.width = dimensionUpdates.width;
            }
            if (dimensionUpdates.height) {
              state.currentDemo.demo.height = dimensionUpdates.height;
            }
          }
          state.currentDemo.demo.updated_at = new Date().toISOString();
        }
        // Also update in items list
        const index = state.items.findIndex((d) => d.id === currentDemo.demo.id);
        if (index !== -1) {
          if (updates.name !== undefined) {
            state.items[index].name = updates.name;
          }
          if (updates.format !== undefined) {
            state.items[index].format = updates.format;
            if (dimensionUpdates.width) {
              state.items[index].width = dimensionUpdates.width;
            }
            if (dimensionUpdates.height) {
              state.items[index].height = dimensionUpdates.height;
            }
          }
          state.items[index].updated_at = new Date().toISOString();
        }
      });

      try {
        await demosApi.update(currentDemo.demo.id, fullUpdates);
      } catch (error) {
        console.error('Failed to update demo info:', error);
        // Could add rollback logic here
        throw error;
      }
    },

    // ==========================================================================
    // Demo Duration
    // ==========================================================================

    setDemoDuration: (durationMs) => {
      if (!get().currentDemo) return;
      get().pushHistory('Set demo duration');

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.demo.duration_ms = durationMs;
          state.playback.durationMs = durationMs;
        }
      });
    },

    // ==========================================================================
    // Background Operations
    // ==========================================================================

    setBackground: (background) => {
      if (!get().currentDemo) return;
      get().pushHistory('Set background');

      const existingBackground = get().currentDemo?.background;
      const newBackground: DemoBackground = {
        // Preserve existing ID if updating, otherwise generate new one
        id: existingBackground?.id ?? generateId(),
        demo_id: background.demo_id,
        background_type: background.background_type,
        color: background.color ?? null,
        gradient_stops: background.gradient_stops ?? null,
        gradient_direction: background.gradient_direction ?? null,
        gradient_angle: background.gradient_angle ?? null,
        pattern_type: background.pattern_type ?? null,
        pattern_color: background.pattern_color ?? null,
        pattern_scale: background.pattern_scale ?? null,
        media_path: background.media_path ?? null,
        media_scale: background.media_scale ?? null,
        media_position_x: background.media_position_x ?? null,
        media_position_y: background.media_position_y ?? null,
        image_url: background.image_url ?? null,
        image_attribution: background.image_attribution ?? null,
        // Preserve existing created_at if updating
        created_at: existingBackground?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.background = newBackground;
        }
      });
    },

    updateBackground: (updates) => {
      if (!get().currentDemo?.background) return;
      get().pushHistory('Update background');

      set((state) => {
        if (state.currentDemo?.background) {
          state.currentDemo.background = {
            ...state.currentDemo.background,
            ...updates,
            updated_at: new Date().toISOString(),
          };
        }
      });
    },

    // ==========================================================================
    // Track Operations
    // ==========================================================================

    addTrack: (track) => {
      if (!get().currentDemo) return null;
      get().pushHistory('Add track');

      const newTrack: DemoTrack = {
        id: generateId(),
        demo_id: track.demo_id,
        track_type: track.track_type,
        name: track.name,
        locked: false,
        visible: true,
        muted: false,
        volume: 1,
        sort_order: track.sort_order ?? get().currentDemo!.tracks.length,
        target_track_id: track.target_track_id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.tracks.push(newTrack);
        }
      });

      return newTrack.id;
    },

    updateTrack: (id, updates) => {
      if (!get().currentDemo) return;
      get().pushHistory('Update track');

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.tracks.findIndex((t) => t.id === id);
          if (index !== -1) {
            state.currentDemo.tracks[index] = {
              ...state.currentDemo.tracks[index],
              ...updates,
              updated_at: new Date().toISOString(),
            };
          }
        }
      });
    },

    deleteTrack: (id) => {
      if (!get().currentDemo) return;
      get().pushHistory('Delete track');

      // Get clips that will be deleted with this track
      const clipsToDelete = get().currentDemo!.clips.filter(c => c.track_id === id);
      const clipIdsToDelete = clipsToDelete.map(c => c.id);
      const zoomClipsToDelete = get().currentDemo!.zoomClips.filter(zc => zc.track_id === id);
      const blurClipsToDelete = get().currentDemo!.blurClips.filter(bc => bc.track_id === id);

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.tracks = state.currentDemo.tracks.filter(
            (t) => t.id !== id
          );
          // Track track deletion for database sync
          if (!state.pendingDeletions.tracks.includes(id)) {
            state.pendingDeletions.tracks.push(id);
          }

          // Clear linked_clip_id references from other clips that point to clips being deleted
          for (const clip of state.currentDemo.clips) {
            if (clip.linked_clip_id && clipIdsToDelete.includes(clip.linked_clip_id)) {
              clip.linked_clip_id = null;
            }
          }

          // Also remove clips on this track
          state.currentDemo.clips = state.currentDemo.clips.filter(
            (c) => c.track_id !== id
          );
          // Track clip deletions
          for (const clip of clipsToDelete) {
            if (!state.pendingDeletions.clips.includes(clip.id)) {
              state.pendingDeletions.clips.push(clip.id);
            }
          }

          // Also remove zoom clips on this track
          state.currentDemo.zoomClips = state.currentDemo.zoomClips.filter(
            (zc) => zc.track_id !== id
          );
          for (const zc of zoomClipsToDelete) {
            if (!state.pendingDeletions.zoomClips.includes(zc.id)) {
              state.pendingDeletions.zoomClips.push(zc.id);
            }
          }

          // Also remove blur clips on this track
          state.currentDemo.blurClips = state.currentDemo.blurClips.filter(
            (bc) => bc.track_id !== id
          );
          for (const bc of blurClipsToDelete) {
            if (!state.pendingDeletions.blurClips.includes(bc.id)) {
              state.pendingDeletions.blurClips.push(bc.id);
            }
          }

          // Clear track selection if this track was selected
          if (state.timeline.selectedTrackId === id) {
            state.timeline.selectedTrackId = null;
          }
        }
      });
    },

    reorderTracks: (trackIds) => {
      if (!get().currentDemo) return;
      get().pushHistory('Reorder tracks');

      set((state) => {
        if (state.currentDemo) {
          const reorderedTracks: DemoTrack[] = [];
          for (let i = 0; i < trackIds.length; i++) {
            const track = state.currentDemo.tracks.find(
              (t) => t.id === trackIds[i]
            );
            if (track) {
              reorderedTracks.push({ ...track, sort_order: i });
            }
          }
          state.currentDemo.tracks = reorderedTracks;
        }
      });
    },

    // ==========================================================================
    // Clip Operations
    // ==========================================================================

    addClip: (clip) => {
      if (!get().currentDemo) return null;
      get().pushHistory('Add clip');

      const newClip: DemoClip = {
        id: generateId(),
        track_id: clip.track_id,
        name: clip.name,
        source_path: clip.source_path,
        source_type: clip.source_type,
        source_duration_ms: clip.source_duration_ms ?? null,
        start_time_ms: clip.start_time_ms,
        duration_ms: clip.duration_ms,
        in_point_ms: clip.in_point_ms ?? 0,
        out_point_ms: clip.source_duration_ms ?? null,
        position_x: clip.position_x ?? null,
        position_y: clip.position_y ?? null,
        scale: clip.scale ?? 1,
        rotation: null,
        crop_top: null,
        crop_bottom: null,
        crop_left: null,
        crop_right: null,
        corner_radius: null,
        opacity: 1,
        shadow_enabled: false,
        shadow_blur: null,
        shadow_offset_x: null,
        shadow_offset_y: null,
        shadow_color: null,
        shadow_opacity: null,
        border_enabled: false,
        border_width: null,
        border_color: null,
        volume: 1,
        audio_fade_in_ms: null,
        audio_fade_out_ms: null,
        speed: 1,
        freeze_frame: false,
        freeze_frame_time_ms: null,
        transition_in_type: null,
        transition_in_duration_ms: null,
        transition_out_type: null,
        transition_out_duration_ms: null,
        zoom_enabled: false,
        zoom_scale: null,
        zoom_center_x: null,
        zoom_center_y: null,
        zoom_in_start_ms: null,
        zoom_in_duration_ms: null,
        zoom_out_start_ms: null,
        zoom_out_duration_ms: null,
        has_audio: clip.has_audio ?? null,
        linked_clip_id: clip.linked_clip_id ?? null,
        muted: clip.muted ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.clips.push(newClip);
          // Update demo duration if needed
          const clipEnd = newClip.start_time_ms + newClip.duration_ms;
          if (clipEnd > state.currentDemo.demo.duration_ms) {
            state.currentDemo.demo.duration_ms = clipEnd;
            state.playback.durationMs = clipEnd;
          }
        }
      });

      return newClip.id;
    },

    updateClip: (id, updates) => {
      if (!get().currentDemo) return;
      get().pushHistory('Update clip');

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.clips.findIndex((c) => c.id === id);
          if (index !== -1) {
            const clip = state.currentDemo.clips[index];
            let finalUpdates = { ...updates };

            // When speed changes, adjust duration_ms accordingly
            // The same source content should play faster/slower, changing the timeline duration
            // Example: 10s source at 1x = 10s timeline, at 2x = 5s timeline (same content, plays faster)
            if (updates.speed !== undefined && updates.speed !== null && clip.source_type === 'video') {
              const oldSpeed = clip.speed ?? 1;
              const newSpeed = Math.max(0.25, Math.min(4, updates.speed));

              if (Math.abs(oldSpeed - newSpeed) > 0.001) {
                // Calculate the source content duration currently being shown
                // sourceContentShown = duration_ms * oldSpeed
                // To show the same source content at new speed: newDuration = sourceContentShown / newSpeed
                // Simplified: newDuration = duration_ms * oldSpeed / newSpeed
                const newDuration = Math.round(clip.duration_ms * oldSpeed / newSpeed);

                finalUpdates.duration_ms = newDuration;
              }
            }

            state.currentDemo.clips[index] = {
              ...clip,
              ...finalUpdates,
              updated_at: new Date().toISOString(),
            };
          }
        }
      });
    },

    deleteClip: (id) => {
      if (!get().currentDemo) return;
      get().pushHistory('Delete clip');

      // Find the clip being deleted to check for linked clip
      const clipToDelete = get().currentDemo!.clips.find(c => c.id === id);
      const linkedClipId = clipToDelete?.linked_clip_id;

      // Check if we're deleting an audio clip that's linked to a video
      const linkedClip = linkedClipId
        ? get().currentDemo!.clips.find(c => c.id === linkedClipId)
        : null;
      const isDeletingAudioLinkedToVideo =
        clipToDelete?.source_type === 'audio' && linkedClip?.source_type === 'video';

      set((state) => {
        if (state.currentDemo) {
          // Delete the clip
          state.currentDemo.clips = state.currentDemo.clips.filter(
            (c) => c.id !== id
          );
          // Track deletion for database sync
          if (!state.pendingDeletions.clips.includes(id)) {
            state.pendingDeletions.clips.push(id);
          }

          if (isDeletingAudioLinkedToVideo && linkedClipId) {
            // Just unlink the video, but keep it muted - no audio should play
            // Like DaVinci Resolve: deleting audio means silence, not video's embedded audio
            const videoIndex = state.currentDemo.clips.findIndex(c => c.id === linkedClipId);
            if (videoIndex !== -1) {
              state.currentDemo.clips[videoIndex].linked_clip_id = null;
              // Keep muted: true - the video's embedded audio should never play
            }
          } else if (linkedClipId) {
            // Delete linked clip (for other cases like deleting video deletes audio too)
            state.currentDemo.clips = state.currentDemo.clips.filter(
              (c) => c.id !== linkedClipId
            );
            // Track linked clip deletion too
            if (!state.pendingDeletions.clips.includes(linkedClipId)) {
              state.pendingDeletions.clips.push(linkedClipId);
            }
          }

          // Deselect if selected
          const deletedIds = isDeletingAudioLinkedToVideo ? [id] : [id, linkedClipId].filter(Boolean);
          if (deletedIds.includes(state.canvas.selectedClipId)) {
            state.canvas.selectedClipId = null;
          }
          state.canvas.selectedClipIds = state.canvas.selectedClipIds.filter(
            (clipId) => !deletedIds.includes(clipId)
          );
        }
      });
    },

    moveClip: (id, trackId, startTimeMs) => {
      if (!get().currentDemo) return;
      get().pushHistory('Move clip');

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.clips.findIndex((c) => c.id === id);
          if (index !== -1) {
            state.currentDemo.clips[index].track_id = trackId;
            state.currentDemo.clips[index].start_time_ms = startTimeMs;
            state.currentDemo.clips[index].updated_at = new Date().toISOString();
          }
        }
      });
    },

    trimClip: (id, inPointMs, outPointMs) => {
      if (!get().currentDemo) return;
      get().pushHistory('Trim clip');

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.clips.findIndex((c) => c.id === id);
          if (index !== -1) {
            state.currentDemo.clips[index].in_point_ms = inPointMs;
            state.currentDemo.clips[index].out_point_ms = outPointMs;
            state.currentDemo.clips[index].duration_ms = outPointMs - inPointMs;
            state.currentDemo.clips[index].updated_at = new Date().toISOString();
          }
        }
      });
    },

    splitClip: (id, atTimeMs) => {
      if (!get().currentDemo) return;
      const clip = get().currentDemo!.clips.find((c) => c.id === id);
      if (!clip) return;

      // Round the split time to ensure integer values
      const splitTime = Math.round(atTimeMs);

      // Check if split point is within clip
      const clipEnd = clip.start_time_ms + clip.duration_ms;
      if (splitTime <= clip.start_time_ms || splitTime >= clipEnd) return;

      get().pushHistory('Split clip');

      const firstDuration = Math.round(splitTime - clip.start_time_ms);
      const secondDuration = Math.round(clip.duration_ms - firstDuration);
      const splitInPoint = Math.round(
        clip.in_point_ms + firstDuration * (clip.speed ?? 1)
      );

      // Generate IDs for the second clips
      const secondClipId = generateId();
      let secondLinkedClipId: string | null = null;

      // Check if there's a linked clip that also needs to be split
      const linkedClip = clip.linked_clip_id
        ? get().currentDemo!.clips.find((c) => c.id === clip.linked_clip_id)
        : null;

      if (linkedClip) {
        secondLinkedClipId = generateId();
      }

      const secondClip: DemoClip = {
        ...clip,
        id: secondClipId,
        start_time_ms: splitTime,
        duration_ms: secondDuration,
        in_point_ms: splitInPoint,
        name: `${clip.name} (2)`,
        linked_clip_id: secondLinkedClipId, // Link to second linked clip
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create second linked clip if needed
      // For linked clips (video/audio pairs), use the SAME timing values
      // so they stay perfectly synchronized
      let secondLinkedClip: DemoClip | null = null;
      if (linkedClip && secondLinkedClipId) {
        secondLinkedClip = {
          ...linkedClip,
          id: secondLinkedClipId,
          start_time_ms: splitTime,
          duration_ms: secondDuration,
          in_point_ms: splitInPoint,  // Use same in_point as main clip for sync
          name: `${linkedClip.name} (2)`,
          linked_clip_id: secondClipId, // Link back to second main clip
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }

      set((state) => {
        if (state.currentDemo) {
          // Update first clip
          const index = state.currentDemo.clips.findIndex((c) => c.id === id);
          if (index !== -1) {
            state.currentDemo.clips[index].duration_ms = firstDuration;
            state.currentDemo.clips[index].out_point_ms = splitInPoint;
            state.currentDemo.clips[index].updated_at = new Date().toISOString();
            // Keep linked_clip_id pointing to the first linked clip (unchanged)
          }

          // Update first linked clip if it exists
          // Use the SAME timing values as the main clip for sync
          if (linkedClip) {
            const linkedIndex = state.currentDemo.clips.findIndex(
              (c) => c.id === linkedClip.id
            );
            if (linkedIndex !== -1) {
              state.currentDemo.clips[linkedIndex].duration_ms = firstDuration;
              state.currentDemo.clips[linkedIndex].out_point_ms = splitInPoint;  // Same as main clip
              state.currentDemo.clips[linkedIndex].in_point_ms = clip.in_point_ms;  // Sync in_point too
              state.currentDemo.clips[linkedIndex].updated_at = new Date().toISOString();
              // Keep linked_clip_id pointing to the first main clip (unchanged)
            }
          }

          // Add second clip
          state.currentDemo.clips.push(secondClip);

          // Add second linked clip if it exists
          if (secondLinkedClip) {
            state.currentDemo.clips.push(secondLinkedClip);
          }
        }
      });
    },

    duplicateClip: (id) => {
      if (!get().currentDemo) return;
      const clip = get().currentDemo!.clips.find((c) => c.id === id);
      if (!clip) return;

      get().pushHistory('Duplicate clip');

      const duplicatedClip: DemoClip = {
        ...clip,
        id: generateId(),
        start_time_ms: Math.round(clip.start_time_ms + clip.duration_ms),
        name: `${clip.name} (copy)`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.clips.push(duplicatedClip);
        }
      });
    },

    // ==========================================================================
    // Asset Operations
    // ==========================================================================

    addAsset: (asset) => {
      if (!get().currentDemo) return;

      const newAsset: DemoAsset = {
        id: generateId(),
        demo_id: asset.demo_id,
        name: asset.name,
        file_path: asset.file_path,
        asset_type: asset.asset_type,
        duration_ms: asset.duration_ms ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
        thumbnail_path: asset.thumbnail_path ?? null,
        file_size: asset.file_size ?? null,
        has_audio: asset.has_audio ?? null,
        created_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.assets.push(newAsset);
        }
      });
    },

    removeAsset: (id) => {
      if (!get().currentDemo) return;

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.assets = state.currentDemo.assets.filter(
            (a) => a.id !== id
          );
          // Track deletion for database sync
          if (!state.pendingDeletions.assets.includes(id)) {
            state.pendingDeletions.assets.push(id);
          }
        }
      });
    },

    renameAsset: (id, name) => {
      if (!get().currentDemo) return;

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.assets.findIndex((a) => a.id === id);
          if (index !== -1) {
            state.currentDemo.assets[index].name = name;
          }
        }
      });
    },

    // ==========================================================================
    // Zoom Clip Operations
    // ==========================================================================

    addZoomClip: (clip) => {
      if (!get().currentDemo) return;
      get().pushHistory('Add zoom clip');

      const newZoomClip: DemoZoomClip = {
        id: generateId(),
        track_id: clip.track_id,
        name: clip.name,
        start_time_ms: clip.start_time_ms,
        duration_ms: clip.duration_ms,
        zoom_scale: clip.zoom_scale ?? 2.0,
        zoom_center_x: clip.zoom_center_x ?? 50,
        zoom_center_y: clip.zoom_center_y ?? 50,
        ease_in_duration_ms: clip.ease_in_duration_ms ?? 300,
        ease_out_duration_ms: clip.ease_out_duration_ms ?? 300,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.zoomClips.push(newZoomClip);
          state.canvas.selectedZoomClipId = newZoomClip.id;
          state.canvas.selectedClipId = null; // Deselect regular clips
        }
      });
    },

    updateZoomClip: (id, updates) => {
      if (!get().currentDemo) return;
      get().pushHistory('Update zoom clip');

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.zoomClips.findIndex((zc) => zc.id === id);
          if (index !== -1) {
            state.currentDemo.zoomClips[index] = {
              ...state.currentDemo.zoomClips[index],
              ...updates,
              updated_at: new Date().toISOString(),
            };
          }
        }
      });
    },

    deleteZoomClip: (id) => {
      if (!get().currentDemo) return;
      get().pushHistory('Delete zoom clip');

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.zoomClips = state.currentDemo.zoomClips.filter(
            (zc) => zc.id !== id
          );
          if (state.canvas.selectedZoomClipId === id) {
            state.canvas.selectedZoomClipId = null;
          }
          // Track deletion for database sync
          if (!state.pendingDeletions.zoomClips.includes(id)) {
            state.pendingDeletions.zoomClips.push(id);
          }
        }
      });
    },

    selectZoomClip: (id) => {
      set((state) => {
        state.canvas.selectedZoomClipId = id;
        if (id) {
          state.canvas.selectedClipId = null; // Deselect regular clips when selecting zoom clip
          state.canvas.selectedBlurClipId = null; // Deselect blur clips
          state.canvas.selectedPanClipId = null; // Deselect pan clips
        }
      });
    },

    // ==========================================================================
    // Blur Clip Operations
    // ==========================================================================

    addBlurClip: (clip) => {
      if (!get().currentDemo) return;
      get().pushHistory('Add blur clip');

      const newBlurClip: DemoBlurClip = {
        id: generateId(),
        track_id: clip.track_id,
        name: clip.name,
        start_time_ms: clip.start_time_ms,
        duration_ms: clip.duration_ms,
        blur_intensity: clip.blur_intensity ?? 20,
        region_x: clip.region_x ?? 50,
        region_y: clip.region_y ?? 50,
        region_width: clip.region_width ?? 30,
        region_height: clip.region_height ?? 30,
        corner_radius: clip.corner_radius ?? 0,
        blur_inside: clip.blur_inside ?? true,
        ease_in_duration_ms: clip.ease_in_duration_ms ?? 300,
        ease_out_duration_ms: clip.ease_out_duration_ms ?? 300,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.blurClips.push(newBlurClip);
          state.canvas.selectedBlurClipId = newBlurClip.id;
          state.canvas.selectedClipId = null;
          state.canvas.selectedZoomClipId = null;
        }
      });
    },

    updateBlurClip: (id, updates) => {
      if (!get().currentDemo) return;
      get().pushHistory('Update blur clip');

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.blurClips.findIndex((bc) => bc.id === id);
          if (index !== -1) {
            state.currentDemo.blurClips[index] = {
              ...state.currentDemo.blurClips[index],
              ...updates,
              updated_at: new Date().toISOString(),
            };
          }
        }
      });
    },

    deleteBlurClip: (id) => {
      if (!get().currentDemo) return;
      get().pushHistory('Delete blur clip');

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.blurClips = state.currentDemo.blurClips.filter(
            (bc) => bc.id !== id
          );
          if (state.canvas.selectedBlurClipId === id) {
            state.canvas.selectedBlurClipId = null;
          }
          // Track deletion for database sync
          if (!state.pendingDeletions.blurClips.includes(id)) {
            state.pendingDeletions.blurClips.push(id);
          }
        }
      });
    },

    selectBlurClip: (id) => {
      set((state) => {
        state.canvas.selectedBlurClipId = id;
        if (id) {
          state.canvas.selectedClipId = null; // Deselect regular clips
          state.canvas.selectedZoomClipId = null; // Deselect zoom clips
          state.canvas.selectedPanClipId = null; // Deselect pan clips
        }
      });
    },

    // ==========================================================================
    // Pan Clip Operations
    // ==========================================================================

    addPanClip: (clip) => {
      if (!get().currentDemo) return;
      get().pushHistory('Add pan clip');

      const newPanClip: DemoPanClip = {
        id: generateId(),
        track_id: clip.track_id,
        name: clip.name,
        start_time_ms: clip.start_time_ms,
        duration_ms: clip.duration_ms,
        start_x: clip.start_x ?? 50,
        start_y: clip.start_y ?? 50,
        end_x: clip.end_x ?? 50,
        end_y: clip.end_y ?? 50,
        ease_in_duration_ms: clip.ease_in_duration_ms ?? 300,
        ease_out_duration_ms: clip.ease_out_duration_ms ?? 300,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.panClips.push(newPanClip);
          state.canvas.selectedPanClipId = newPanClip.id;
          state.canvas.selectedClipId = null;
          state.canvas.selectedZoomClipId = null;
          state.canvas.selectedBlurClipId = null;
        }
      });
    },

    updatePanClip: (id, updates) => {
      if (!get().currentDemo) return;
      get().pushHistory('Update pan clip');

      set((state) => {
        if (state.currentDemo) {
          const index = state.currentDemo.panClips.findIndex((pc) => pc.id === id);
          if (index !== -1) {
            state.currentDemo.panClips[index] = {
              ...state.currentDemo.panClips[index],
              ...updates,
              updated_at: new Date().toISOString(),
            };
          }
        }
      });
    },

    deletePanClip: (id) => {
      if (!get().currentDemo) return;
      get().pushHistory('Delete pan clip');

      set((state) => {
        if (state.currentDemo) {
          state.currentDemo.panClips = state.currentDemo.panClips.filter(
            (pc) => pc.id !== id
          );
          if (state.canvas.selectedPanClipId === id) {
            state.canvas.selectedPanClipId = null;
          }
          // Track deletion for database sync
          if (!state.pendingDeletions.panClips.includes(id)) {
            state.pendingDeletions.panClips.push(id);
          }
        }
      });
    },

    selectPanClip: (id) => {
      set((state) => {
        state.canvas.selectedPanClipId = id;
        if (id) {
          state.canvas.selectedClipId = null; // Deselect regular clips
          state.canvas.selectedZoomClipId = null; // Deselect zoom clips
          state.canvas.selectedBlurClipId = null; // Deselect blur clips
        }
      });
    },

    // ==========================================================================
    // Playback Controls
    // ==========================================================================

    play: () => {
      set((state) => {
        state.playback.isPlaying = true;
      });
    },

    pause: () => {
      set((state) => {
        state.playback.isPlaying = false;
      });
    },

    stop: () => {
      set((state) => {
        state.playback.isPlaying = false;
        state.playback.currentTimeMs = 0;
      });
    },

    seekTo: (timeMs) => {
      set((state) => {
        state.playback.currentTimeMs = Math.max(
          0,
          Math.min(timeMs, state.playback.durationMs)
        );
      });
    },

    setVolume: (volume) => {
      set((state) => {
        state.playback.volume = Math.max(0, Math.min(1, volume));
      });
    },

    toggleMute: () => {
      set((state) => {
        state.playback.isMuted = !state.playback.isMuted;
      });
    },

    toggleLoop: () => {
      set((state) => {
        state.playback.isLooping = !state.playback.isLooping;
      });
    },

    jumpForward: (ms = 10000) => {
      const { currentTimeMs, durationMs } = get().playback;
      set((state) => {
        state.playback.currentTimeMs = Math.min(currentTimeMs + ms, durationMs);
      });
    },

    jumpBackward: (ms = 10000) => {
      const { currentTimeMs } = get().playback;
      set((state) => {
        state.playback.currentTimeMs = Math.max(currentTimeMs - ms, 0);
      });
    },

    nextFrame: () => {
      // Assuming 60fps, 1 frame = ~16.67ms
      const frameMs = 1000 / (get().currentDemo?.demo.frame_rate ?? 60);
      get().jumpForward(frameMs);
    },

    previousFrame: () => {
      const frameMs = 1000 / (get().currentDemo?.demo.frame_rate ?? 60);
      get().jumpBackward(frameMs);
    },

    // ==========================================================================
    // Canvas Controls
    // ==========================================================================

    setCanvasZoom: (zoom) => {
      set((state) => {
        state.canvas.zoom = Math.max(0.1, Math.min(4, zoom));
      });
    },

    fitCanvas: () => {
      set((state) => {
        // Reset to fit view - actual calculation would depend on container size
        state.canvas.zoom = 1;
        state.canvas.panX = 0;
        state.canvas.panY = 0;
      });
    },

    resetCanvas: () => {
      set((state) => {
        state.canvas.zoom = 1;
        state.canvas.panX = 0;
        state.canvas.panY = 0;
      });
    },

    selectClip: (id) => {
      set((state) => {
        state.canvas.selectedClipId = id;
        state.canvas.selectedClipIds = id ? [id] : [];
        if (id) {
          state.canvas.selectedZoomClipId = null;
          state.canvas.selectedBlurClipId = null;
          state.canvas.selectedPanClipId = null;
        }
      });
    },

    selectClips: (ids) => {
      set((state) => {
        state.canvas.selectedClipIds = ids;
        state.canvas.selectedClipId = ids.length === 1 ? ids[0] : null;
        if (ids.length > 0) {
          state.canvas.selectedZoomClipId = null;
          state.canvas.selectedBlurClipId = null;
          state.canvas.selectedPanClipId = null;
        }
      });
    },

    toggleSafeZones: () => {
      set((state) => {
        state.canvas.showSafeZones = !state.canvas.showSafeZones;
      });
    },

    // ==========================================================================
    // Timeline Controls
    // ==========================================================================

    setTimelineZoom: (zoom) => {
      set((state) => {
        // Allow zoom from 0.001 (0.1%) to 10 (1000%) for very long timelines
        state.timeline.zoom = Math.max(0.001, Math.min(10, zoom));
      });
    },

    setTimelineScroll: (scrollX) => {
      set((state) => {
        state.timeline.scrollX = Math.max(0, scrollX);
      });
    },

    toggleSnap: () => {
      set((state) => {
        state.timeline.snapEnabled = !state.timeline.snapEnabled;
      });
    },

    selectTrack: (id) => {
      set((state) => {
        state.timeline.selectedTrackId = id;
        // Clear clip selections when selecting a track so TrackInspector shows
        if (id) {
          state.canvas.selectedClipId = null;
          state.canvas.selectedClipIds = [];
          state.canvas.selectedZoomClipId = null;
          state.canvas.selectedBlurClipId = null;
        }
      });
    },

    // ==========================================================================
    // History (Undo/Redo)
    // ==========================================================================

    undo: () => {
      const { history, historyIndex, currentDemo } = get();
      if (historyIndex > 0 && currentDemo) {
        set((state) => {
          state.historyIndex = historyIndex - 1;
          state.currentDemo = JSON.parse(
            JSON.stringify(history[historyIndex - 1].state)
          );
        });
      }
    },

    redo: () => {
      const { history, historyIndex, currentDemo } = get();
      if (historyIndex < history.length - 1 && currentDemo) {
        set((state) => {
          state.historyIndex = historyIndex + 1;
          state.currentDemo = JSON.parse(
            JSON.stringify(history[historyIndex + 1].state)
          );
        });
      }
    },

    canUndo: () => {
      return get().historyIndex > 0;
    },

    canRedo: () => {
      return get().historyIndex < get().history.length - 1;
    },

    pushHistory: (action) => {
      const { currentDemo, history, historyIndex } = get();
      if (!currentDemo) return;

      const entry: HistoryEntry = {
        timestamp: Date.now(),
        action,
        state: JSON.parse(JSON.stringify(currentDemo)),
      };

      set((state) => {
        // Truncate any redo history
        state.history = history.slice(0, historyIndex + 1);
        state.history.push(entry);
        state.historyIndex = state.history.length - 1;

        // Limit history size
        if (state.history.length > 50) {
          state.history = state.history.slice(-50);
          state.historyIndex = state.history.length - 1;
        }
      });
    },
  }))
);
