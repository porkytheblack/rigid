"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  X,
  Scissors,
  ZoomIn,
  ZoomOut,
  Upload,
  Video,
  Image,
  Music,
  Layers,
  Settings,
  Download,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  Grid,
  Undo2,
  Redo2,
  Maximize2,
  FolderOpen,
  Film,
  GripVertical,
  GripHorizontal,
  ChevronsUpDown,
  ChevronUp,
  Check,
  Circle,
  Link2,
  Move,
} from "lucide-react";
import { useRouterStore, useDemosStore } from "@/lib/stores";
import { demoRecordings, demoScreenshots } from "@/lib/tauri/commands";
import type { DemoTrackType, DemoClip, DemoTrack, DemoAsset, DemoBackground, DemoZoomClip, DemoBlurClip, DemoPanClip, Recording, Screenshot, DemoFormat } from "@/lib/tauri/types";
import { DEMO_FORMAT_DIMENSIONS } from "@/lib/tauri/types";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

interface DemoEditorViewProps {
  appId: string;
  demoId: string;
}

// Format time in mm:ss format
const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Format time with frames
const formatTimeWithFrames = (ms: number, fps: number = 60): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor((ms % 1000) / (1000 / fps));
  return `${minutes}:${seconds.toString().padStart(2, "0")}:${frames.toString().padStart(2, "0")}`;
};

// Track type config
const trackTypeConfig: Record<DemoTrackType, { icon: typeof Video; color: string; label: string }> = {
  background: { icon: Layers, color: "#6B7280", label: "Background" },
  video: { icon: Video, color: "#3B82F6", label: "Video" },
  image: { icon: Image, color: "#10B981", label: "Image" },
  audio: { icon: Music, color: "#F59E0B", label: "Audio" },
  zoom: { icon: ZoomIn, color: "#A855F7", label: "Zoom" },
  blur: { icon: Circle, color: "#EC4899", label: "Blur" },
  pan: { icon: Move, color: "#14B8A6", label: "Pan" },
};

// Background presets
const backgroundPresets = {
  gradients: [
    { name: "Sunset", colors: ["#1a1a2e", "#e94560"], angle: 135 },
    { name: "Ocean", colors: ["#2193b0", "#6dd5ed"], angle: 180 },
    { name: "Aurora", colors: ["#1a1a2e", "#4a4a8a", "#8a8aff"], angle: 135 },
    { name: "Midnight", colors: ["#0f0c29", "#302b63", "#24243e"], angle: 180 },
    { name: "Forest", colors: ["#134e5e", "#71b280"], angle: 135 },
    { name: "Warm", colors: ["#ee9ca7", "#ffdde1"], angle: 180 },
  ],
  solids: [
    { name: "Black", color: "#000000" },
    { name: "White", color: "#ffffff" },
    { name: "Dark Gray", color: "#1a1a1a" },
    { name: "Light Gray", color: "#f5f5f5" },
    { name: "Navy", color: "#1e3a5f" },
    { name: "Purple", color: "#2d1b4e" },
  ],
};

export function DemoEditorView({ appId, demoId }: DemoEditorViewProps) {
  const { navigate } = useRouterStore();
  const {
    currentDemo,
    items: demos,
    loadDemo,
    playback,
    canvas,
    timeline,
    play,
    pause,
    seekTo,
    setVolume,
    toggleMute,
    setCanvasZoom,
    setTimelineZoom,
    toggleSnap,
    selectClip,
    selectTrack,
    addTrack,
    updateTrack,
    deleteTrack,
    reorderTracks,
    addClip,
    updateClip,
    deleteClip,
    splitClip,
    duplicateClip,
    addAsset,
    removeAsset,
    setBackground,
    setDemoDuration,
    undo,
    redo,
    canUndo,
    canRedo,
    toggleSafeZones,
    jumpForward,
    jumpBackward,
    addZoomClip,
    updateZoomClip,
    deleteZoomClip,
    selectZoomClip,
    addBlurClip,
    updateBlurClip,
    deleteBlurClip,
    selectBlurClip,
    addPanClip,
    updatePanClip,
    deletePanClip,
    selectPanClip,
    saveDemo,
    updateDemoInfo,
  } = useDemosStore();

  // Get recordings and screenshots linked to this demo
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);

  // Local UI state
  const [showAssets, setShowAssets] = useState(true);
  const [showInspector, setShowInspector] = useState(true);
  const [assetsPanelWidth] = useState(260);
  const [inspectorPanelWidth] = useState(280);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showAddTrackMenu, setShowAddTrackMenu] = useState(false);
  const [showZoomTrackTargetMenu, setShowZoomTrackTargetMenu] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showAppMediaPicker, setShowAppMediaPicker] = useState(false);
  const [draggedAsset, setDraggedAsset] = useState<DemoAsset | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [dragOverTime, setDragOverTime] = useState<number | null>(null);
  const [expandedAssetSections, setExpandedAssetSections] = useState({
    videos: true,
    images: true,
    audio: true,
    appMedia: true,
  });
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [clipDragOffset, setClipDragOffset] = useState(0);
  const [isTrimmingClip, setIsTrimmingClip] = useState<{ clipId: string; edge: "start" | "end" } | null>(null);
  const [isTrimmingBackground, setIsTrimmingBackground] = useState(false);
  const [isDraggingCanvasClip, setIsDraggingCanvasClip] = useState(false);
  const [canvasDragStart, setCanvasDragStart] = useState<{ x: number; y: number; clipX: number; clipY: number } | null>(null);
  const [isDraggingZoomClip, setIsDraggingZoomClip] = useState(false);
  const [zoomClipDragOffset, setZoomClipDragOffset] = useState(0);
  const [isTrimmingZoomClip, setIsTrimmingZoomClip] = useState<{ clipId: string; edge: "start" | "end" } | null>(null);
  const [isDraggingBlurClip, setIsDraggingBlurClip] = useState(false);
  const [blurClipDragOffset, setBlurClipDragOffset] = useState(0);
  const [isTrimmingBlurClip, setIsTrimmingBlurClip] = useState<{ clipId: string; edge: "start" | "end" } | null>(null);
  const [showBlurTrackTargetMenu, setShowBlurTrackTargetMenu] = useState(false);
  const [isDraggingPanClip, setIsDraggingPanClip] = useState(false);
  const [panClipDragOffset, setPanClipDragOffset] = useState(0);
  const [isTrimmingPanClip, setIsTrimmingPanClip] = useState<{ clipId: string; edge: "start" | "end" } | null>(null);
  const [showPanTrackTargetMenu, setShowPanTrackTargetMenu] = useState(false);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    timeline: true,
    inspectorTransform: true,
    inspectorAppearance: true,
    inspectorShadow: false,
    inspectorAudio: true,
    inspectorTiming: true,
  });
  const [timelineHeight, setTimelineHeight] = useState(200);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [trackHeaderWidth, setTrackHeaderWidth] = useState(160);
  const [isResizingTrackHeader, setIsResizingTrackHeader] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [trackHeight, setTrackHeight] = useState(40); // Default track height in pixels (like DaVinci Resolve)

  // Refs
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const draggedAssetRef = useRef<DemoAsset | null>(null); // Ref to persist dragged asset across event timing
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map()); // Audio elements for audio clips
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map()); // Video elements for multi-track sync

  // Navigate back to demo view
  const goBack = useCallback(() => {
    navigate({ name: "demo-view", appId, demoId });
  }, [navigate, appId, demoId]);

  // Load demo on mount
  useEffect(() => {
    if (demoId) {
      // Check if it's a new demo (placeholder ID)
      const existingDemo = demos.find(d => d.id === demoId);
      if (existingDemo) {
        loadDemo(demoId).catch(console.error);
      }
    }
  }, [demoId, loadDemo, demos]);

  // Load recordings and screenshots linked to this demo
  useEffect(() => {
    if (demoId) {
      demoRecordings.listWithData(demoId).then(setRecordings).catch(console.error);
      demoScreenshots.listWithData(demoId).then(setScreenshots).catch(console.error);
    }
  }, [demoId]);

  // Use refs for real-time playback position to avoid triggering effects every frame
  const playbackStateRef = useRef({ currentTimeMs: 0, durationMs: 60000 });
  const rafIdRef = useRef<number | null>(null);
  const lastUiUpdateRef = useRef<number>(0);

  // Sync ref with store when user seeks (when not playing)
  useEffect(() => {
    if (!playback.isPlaying) {
      playbackStateRef.current = { currentTimeMs: playback.currentTimeMs, durationMs: playback.durationMs };
    }
  }, [playback.currentTimeMs, playback.durationMs, playback.isPlaying]);

  // Playback loop using requestAnimationFrame - updates Zustand sparingly (10fps for UI)
  useEffect(() => {
    if (playback.isPlaying) {
      const startTime = performance.now();
      const startPlaybackTime = playbackStateRef.current.currentTimeMs;
      const durationMs = playback.durationMs;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const newTime = startPlaybackTime + elapsed;

        if (newTime >= durationMs) {
          // End of playback
          playbackStateRef.current.currentTimeMs = 0;
          pause();
          seekTo(0);
          return;
        }

        // Update the ref (real-time, no React re-render)
        playbackStateRef.current.currentTimeMs = newTime;

        // Update Zustand sparingly (every 100ms = 10fps) for UI elements like timeline cursor
        if (now - lastUiUpdateRef.current > 100) {
          lastUiUpdateRef.current = now;
          seekTo(newTime);
        }

        rafIdRef.current = requestAnimationFrame(tick);
      };

      rafIdRef.current = requestAnimationFrame(tick);
    } else {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    }

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [playback.isPlaying, playback.durationMs, pause, seekTo]);

  // Track when we last synced video to avoid constant seeking during playback
  const lastVideoSyncRef = useRef<{ clipId: string | null; wasPlaying: boolean }>({ clipId: null, wasPlaying: false });

  // Sync video preview on play/pause transitions (NOT every frame)
  useEffect(() => {
    if (!videoPreviewRef.current || !currentDemo) return;
    const video = videoPreviewRef.current;

    // Get current time from ref (real-time) not from store
    const currentTimeMs = playbackStateRef.current.currentTimeMs;

    // Find the current video clip
    const allVideoClips = currentDemo.clips.filter(clip => {
      if (clip.source_type !== "video") return false;
      const track = currentDemo.tracks.find(t => t.id === clip.track_id);
      return track && track.visible;
    });

    let currentClip = allVideoClips.find(clip =>
      clip.start_time_ms <= currentTimeMs &&
      clip.start_time_ms + clip.duration_ms >= currentTimeMs
    );

    // Gap fill logic for when no clip at current time
    let effectiveTimeMs = currentTimeMs;
    let isGapFill = false;

    if (!currentClip && allVideoClips.length > 0) {
      const clipsBefore = allVideoClips
        .filter(c => c.start_time_ms + c.duration_ms < currentTimeMs)
        .sort((a, b) => (b.start_time_ms + b.duration_ms) - (a.start_time_ms + a.duration_ms));
      const clipsAfter = allVideoClips
        .filter(c => c.start_time_ms > currentTimeMs)
        .sort((a, b) => a.start_time_ms - b.start_time_ms);

      if (clipsBefore.length > 0) {
        currentClip = clipsBefore[0];
        effectiveTimeMs = currentClip.start_time_ms + currentClip.duration_ms - 1;
        isGapFill = true;
      } else if (clipsAfter.length > 0) {
        currentClip = clipsAfter[0];
        effectiveTimeMs = currentClip.start_time_ms;
        isGapFill = true;
      }
    }

    if (currentClip) {
      const clipRelativeTime = effectiveTimeMs - currentClip.start_time_ms;
      const videoTime = ((currentClip.in_point_ms || 0) + clipRelativeTime) / 1000;

      // Sync time when starting playback
      const playStateChanged = lastVideoSyncRef.current.wasPlaying !== playback.isPlaying;
      if (playStateChanged && playback.isPlaying) {
        video.currentTime = videoTime;
      }

      lastVideoSyncRef.current = { clipId: currentClip.id, wasPlaying: playback.isPlaying };

      // Sync play/pause state
      if (isGapFill) {
        if (!video.paused) video.pause();
      } else if (playback.isPlaying && video.paused) {
        video.play().catch(() => {});
      } else if (!playback.isPlaying && !video.paused) {
        video.pause();
      }

      // Sync volume and muted
      video.volume = playback.volume;
      video.muted = playback.isMuted || (currentClip.muted ?? false);
    } else {
      lastVideoSyncRef.current = { clipId: null, wasPlaying: playback.isPlaying };
      if (!video.paused) video.pause();
    }
  }, [playback.isPlaying, playback.volume, playback.isMuted, currentDemo]);

  // Sync video preview when scrubbing (paused only)
  useEffect(() => {
    if (!videoPreviewRef.current || !currentDemo || playback.isPlaying) return;
    const video = videoPreviewRef.current;

    const currentTimeMs = playback.currentTimeMs;

    const allVideoClips = currentDemo.clips.filter(clip => {
      if (clip.source_type !== "video") return false;
      const track = currentDemo.tracks.find(t => t.id === clip.track_id);
      return track && track.visible;
    });

    let currentClip = allVideoClips.find(clip =>
      clip.start_time_ms <= currentTimeMs &&
      clip.start_time_ms + clip.duration_ms >= currentTimeMs
    );

    let effectiveTimeMs = currentTimeMs;
    if (!currentClip && allVideoClips.length > 0) {
      const clipsBefore = allVideoClips
        .filter(c => c.start_time_ms + c.duration_ms < currentTimeMs)
        .sort((a, b) => (b.start_time_ms + b.duration_ms) - (a.start_time_ms + a.duration_ms));
      const clipsAfter = allVideoClips
        .filter(c => c.start_time_ms > currentTimeMs)
        .sort((a, b) => a.start_time_ms - b.start_time_ms);

      if (clipsBefore.length > 0) {
        currentClip = clipsBefore[0];
        effectiveTimeMs = currentClip.start_time_ms + currentClip.duration_ms - 1;
      } else if (clipsAfter.length > 0) {
        currentClip = clipsAfter[0];
        effectiveTimeMs = currentClip.start_time_ms;
      }
    }

    if (currentClip) {
      const clipRelativeTime = effectiveTimeMs - currentClip.start_time_ms;
      const videoTime = ((currentClip.in_point_ms || 0) + clipRelativeTime) / 1000;
      const timeDrift = Math.abs(video.currentTime - videoTime);
      if (timeDrift > 0.05) {
        video.currentTime = videoTime;
      }
    }
  }, [playback.currentTimeMs, playback.isPlaying, currentDemo]);

  // Track previous playing state to detect play/pause changes
  const wasPlayingRef = useRef(false);
  const lastSeekTimeRef = useRef(0);

  // Sync audio clips with playback - only on play/pause/seek, not every frame
  useEffect(() => {
    if (!currentDemo) return;

    const currentTimeMs = playback.currentTimeMs;
    const audioClips = currentDemo.clips.filter(c => c.source_type === "audio");
    const isPlaying = playback.isPlaying;
    const wasPlaying = wasPlayingRef.current;

    // Detect if this is a seek (time jumped significantly while not playing)
    const timeDiff = Math.abs(currentTimeMs - lastSeekTimeRef.current);
    const isSeeking = !isPlaying && timeDiff > 100;

    audioClips.forEach(clip => {
      const track = currentDemo.tracks.find(t => t.id === clip.track_id);
      if (!track || !track.visible || track.muted) {
        const existingAudio = audioElementsRef.current.get(clip.id);
        if (existingAudio && !existingAudio.paused) {
          existingAudio.pause();
        }
        return;
      }

      // If this audio clip is linked to a video, use the video clip's timing for sync
      const linkedVideoClip = clip.linked_clip_id
        ? currentDemo.clips.find(c => c.id === clip.linked_clip_id && c.source_type === "video")
        : null;

      // Use video clip timing if linked, otherwise use audio clip's own timing
      const syncClip = linkedVideoClip || clip;
      const clipStart = syncClip.start_time_ms;
      const clipEnd = syncClip.start_time_ms + syncClip.duration_ms;
      const inPointMs = syncClip.in_point_ms || 0;

      const isClipActive = currentTimeMs >= clipStart && currentTimeMs < clipEnd;

      let audio = audioElementsRef.current.get(clip.id);

      if (isClipActive) {
        if (!audio) {
          audio = new Audio(convertFileSrc(clip.source_path));
          audio.preload = "auto";
          audioElementsRef.current.set(clip.id, audio);
        }

        // Set volume
        const trackVolume = track.volume ?? 1;
        const clipVolume = clip.volume ?? 1;
        audio.volume = playback.isMuted ? 0 : Math.min(1, trackVolume * clipVolume * playback.volume);

        // Only sync time on play start or seek
        if ((isPlaying && !wasPlaying) || isSeeking) {
          const clipRelativeTime = (currentTimeMs - clipStart) / 1000;
          const audioTime = inPointMs / 1000 + clipRelativeTime;
          audio.currentTime = Math.max(0, audioTime);
        }

        // Play/pause
        if (isPlaying && audio.paused) {
          audio.play().catch(() => {});
        } else if (!isPlaying && !audio.paused) {
          audio.pause();
        }
      } else if (audio && !audio.paused) {
        audio.pause();
      }
    });

    // Cleanup removed clips
    const clipIds = new Set(audioClips.map(c => c.id));
    audioElementsRef.current.forEach((audio, id) => {
      if (!clipIds.has(id)) {
        audio.pause();
        audioElementsRef.current.delete(id);
      }
    });

    wasPlayingRef.current = isPlaying;
    lastSeekTimeRef.current = currentTimeMs;
  }, [playback.currentTimeMs, playback.isPlaying, playback.volume, playback.isMuted, currentDemo]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioElementsRef.current.forEach(audio => {
        audio.pause();
        audio.src = "";
      });
      audioElementsRef.current.clear();
    };
  }, []);

  // Track previous video playing state for detecting transitions
  const videoWasPlayingRef = useRef(false);
  const videoLastSeekTimeRef = useRef(0);

  // Sync non-primary video clips (webcam overlays, etc.) - only on play/pause/seek transitions
  useEffect(() => {
    if (!currentDemo) return;

    const currentTimeMs = playback.currentTimeMs;
    const isPlaying = playback.isPlaying;
    const wasPlaying = videoWasPlayingRef.current;

    // Detect play/pause state change
    const playStateChanged = isPlaying !== wasPlaying;

    // Detect seek (significant time jump while paused)
    const timeDiff = Math.abs(currentTimeMs - videoLastSeekTimeRef.current);
    const isSeeking = !isPlaying && timeDiff > 50;

    // Only sync on transitions, not every frame during playback
    if (!playStateChanged && !isSeeking && isPlaying) {
      videoLastSeekTimeRef.current = currentTimeMs;
      return;
    }

    videoElementsRef.current.forEach((video, clipId) => {
      // Skip the main preview - it's handled by the primary sync effect
      if (video === videoPreviewRef.current) return;

      const clip = currentDemo.clips.find(c => c.id === clipId && c.source_type === "video");
      if (!clip) return;

      const track = currentDemo.tracks.find(t => t.id === clip.track_id);
      if (!track || !track.visible) {
        if (!video.paused) video.pause();
        return;
      }

      // Check if this clip is visible at current time
      const clipStart = clip.start_time_ms;
      const clipEnd = clip.start_time_ms + clip.duration_ms;
      const isVisible = currentTimeMs >= clipStart && currentTimeMs < clipEnd;

      if (isVisible) {
        // Calculate video time
        const clipRelativeTime = currentTimeMs - clipStart;
        const videoTime = ((clip.in_point_ms || 0) + clipRelativeTime) / 1000;

        // Sync time on state changes or seeks
        if (playStateChanged || isSeeking) {
          const drift = Math.abs(video.currentTime - videoTime);
          if (drift > 0.05) {
            video.currentTime = Math.max(0, videoTime);
          }
        }

        // Sync play/pause state
        if (isPlaying && video.paused) {
          video.play().catch(() => {});
        } else if (!isPlaying && !video.paused) {
          video.pause();
        }

        // Sync volume and muted
        video.volume = playback.volume;
        video.muted = playback.isMuted || (clip.muted ?? false);
      } else {
        // Pause non-visible clips
        if (!video.paused) {
          video.pause();
        }
      }
    });

    videoWasPlayingRef.current = isPlaying;
    videoLastSeekTimeRef.current = currentTimeMs;
  }, [playback.currentTimeMs, playback.isPlaying, playback.volume, playback.isMuted, currentDemo]);

  // Auto-save demo state to database with debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // Get pendingDeletions from store for auto-save change detection
  const pendingDeletions = useDemosStore((state) => state.pendingDeletions);

  useEffect(() => {
    if (!currentDemo) return;

    // Create a key for change detection (all data that needs to be saved)
    const saveKey = JSON.stringify({
      demo: {
        name: currentDemo.demo.name,
        format: currentDemo.demo.format,
        width: currentDemo.demo.width,
        height: currentDemo.demo.height,
        duration_ms: currentDemo.demo.duration_ms,
      },
      background: currentDemo.background,
      tracks: currentDemo.tracks,
      clips: currentDemo.clips,
      zoomClips: currentDemo.zoomClips,
      blurClips: currentDemo.blurClips,
      assets: currentDemo.assets,
      pendingDeletions,
    });

    // Skip if content hasn't changed
    if (saveKey === lastSavedRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 2 seconds
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDemo();
        lastSavedRef.current = saveKey;
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [currentDemo, saveDemo, pendingDeletions]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isModifier = e.metaKey || e.ctrlKey;

      switch (e.key) {
        case " ":
          e.preventDefault();
          playback.isPlaying ? pause() : play();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) {
            jumpBackward(1000);
          } else {
            jumpBackward(16.67);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) {
            jumpForward(1000);
          } else {
            jumpForward(16.67);
          }
          break;
        case "z":
          if (isModifier) {
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
          }
          break;
        case "s":
          if (!isModifier && canvas.selectedClipId) {
            e.preventDefault();
            splitClip(canvas.selectedClipId, playback.currentTimeMs);
          }
          break;
        case "d":
          if (isModifier && canvas.selectedClipId) {
            e.preventDefault();
            duplicateClip(canvas.selectedClipId);
          }
          break;
        case "Delete":
        case "Backspace":
          if (canvas.selectedZoomClipId) {
            e.preventDefault();
            deleteZoomClip(canvas.selectedZoomClipId);
          } else if (canvas.selectedClipId) {
            e.preventDefault();
            deleteClip(canvas.selectedClipId);
          }
          break;
        case "Home":
          e.preventDefault();
          seekTo(0);
          break;
        case "End":
          e.preventDefault();
          seekTo(playback.durationMs);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [playback.isPlaying, canvas.selectedClipId, canvas.selectedZoomClipId, play, pause, undo, redo, splitClip, duplicateClip, deleteClip, deleteZoomClip, seekTo, jumpForward, jumpBackward, playback.currentTimeMs, playback.durationMs]);

  // Tauri file drag and drop (only for external files, not internal asset drags)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupDragDrop = async () => {
      try {
        const webview = getCurrentWebviewWindow();
        unlisten = await webview.onDragDropEvent(async (event) => {
          // Skip Tauri handling entirely if we're doing an internal drag
          // Internal HTML5 drags also trigger Tauri events, but without useful paths
          if (event.payload.type === "enter" || event.payload.type === "over") {
            // Only show overlay for external files that have actual paths
            // Internal drags may trigger this but won't have paths array
            if ("paths" in event.payload && event.payload.paths && event.payload.paths.length > 0) {
              setIsDraggingFile(true);
            }
          } else if (event.payload.type === "leave") {
            // Only clear if we were showing the external file overlay
            setIsDraggingFile(false);
          } else if (event.payload.type === "drop") {
            setIsDraggingFile(false);
            // Only process if we have actual file paths (external file drop)
            // Internal HTML5 drops won't have paths
            if (currentDemo && "paths" in event.payload && event.payload.paths && event.payload.paths.length > 0) {
              const { video } = await import("@/lib/tauri/commands");
              for (const file of event.payload.paths) {
                const ext = file.split(".").pop()?.toLowerCase() || "";
                let assetType: "video" | "image" | "audio" = "video";
                if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
                  assetType = "image";
                } else if (["mp3", "wav", "aac", "ogg", "m4a"].includes(ext)) {
                  assetType = "audio";
                }

                // Probe media to get duration and has_audio info
                let probeResult = null;
                if (assetType === "video" || assetType === "audio") {
                  try {
                    console.log("[DragDrop] Probing media file:", file);
                    probeResult = await video.probe(file);
                    console.log("[DragDrop] Probe result:", probeResult);
                  } catch (e) {
                    console.error("[DragDrop] Failed to probe media:", file, e);
                  }
                }

                const name = file.split("/").pop() || file;
                console.log("[DragDrop] Adding asset:", name, "duration:", probeResult?.duration_ms);
                addAsset({
                  demo_id: currentDemo.demo.id,
                  name,
                  file_path: file,
                  asset_type: assetType,
                  duration_ms: probeResult?.duration_ms ?? null,
                  width: probeResult?.width ?? null,
                  height: probeResult?.height ?? null,
                  has_audio: probeResult?.has_audio ?? (assetType === "audio" ? true : null),
                });
              }
            }
          }
        });
      } catch (err) {
        console.error("Failed to setup drag drop:", err);
      }
    };

    setupDragDrop();
    return () => {
      if (unlisten) unlisten();
    };
  }, [currentDemo, addAsset]);

  // Timeline resize handler
  useEffect(() => {
    if (!isResizingTimeline) return;

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY - 48; // 48 is header height
      setTimelineHeight(Math.max(100, Math.min(400, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizingTimeline(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingTimeline]);

  // Track header resize handler
  useEffect(() => {
    if (!isResizingTrackHeader) return;

    const handleMouseMove = (e: MouseEvent) => {
      const timelineContainer = timelineContainerRef.current;
      if (!timelineContainer) return;
      const rect = timelineContainer.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;
      setTrackHeaderWidth(Math.max(100, Math.min(300, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizingTrackHeader(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingTrackHeader]);

  // Toggle section helper
  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Handle file import
  const handleImportFiles = useCallback(async () => {
    try {
      const { video } = await import("@/lib/tauri/commands");
      const files = await open({
        multiple: true,
        filters: [
          { name: "Media", extensions: ["mp4", "mov", "webm", "avi", "mkv", "png", "jpg", "jpeg", "webp", "gif", "svg", "mp3", "wav", "aac", "ogg", "m4a"] },
        ],
      });

      if (files && currentDemo) {
        const fileArray = Array.isArray(files) ? files : [files];
        for (const file of fileArray) {
          const ext = file.split(".").pop()?.toLowerCase() || "";
          let assetType: "video" | "image" | "audio" = "video";
          if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
            assetType = "image";
          } else if (["mp3", "wav", "aac", "ogg", "m4a"].includes(ext)) {
            assetType = "audio";
          }

          // Probe media to get duration and has_audio info
          let probeResult = null;
          if (assetType === "video" || assetType === "audio") {
            try {
              console.log("Probing media file:", file);
              probeResult = await video.probe(file);
              console.log("Probe result:", probeResult);
            } catch (e) {
              console.error("Failed to probe media:", file, e);
              // Still add the asset even if probe fails
            }
          }

          const name = file.split("/").pop() || file;
          console.log("Adding asset:", name, "duration:", probeResult?.duration_ms);
          addAsset({
            demo_id: currentDemo.demo.id,
            name,
            file_path: file,
            asset_type: assetType,
            duration_ms: probeResult?.duration_ms ?? null,
            width: probeResult?.width ?? null,
            height: probeResult?.height ?? null,
            has_audio: probeResult?.has_audio ?? (assetType === "audio" ? true : null),
          });
        }
      }
    } catch (err) {
      console.error("Failed to import files:", err);
    }
  }, [currentDemo, addAsset]);

  // Handle adding app recording as asset (supports both screen and webcam recordings)
  const handleAddRecording = useCallback(async (recording: Recording) => {
    if (!currentDemo) return;

    const { video } = await import("@/lib/tauri/commands");

    // Add screen recording if available
    if (recording.recording_path) {
      let hasAudio = null;
      try {
        const probeResult = await video.probe(recording.recording_path);
        hasAudio = probeResult.has_audio;
      } catch (e) {
        console.warn("Failed to probe screen recording:", e);
      }

      addAsset({
        demo_id: currentDemo.demo.id,
        name: recording.name,
        file_path: recording.recording_path,
        asset_type: "video",
        duration_ms: recording.duration_ms || undefined,
        has_audio: hasAudio,
      });
    }

    // Add webcam recording if available (treated as video with audio)
    if (recording.webcam_path) {
      let hasAudio = true; // Webcam recordings typically have audio
      let duration_ms = recording.duration_ms;
      try {
        const probeResult = await video.probe(recording.webcam_path);
        hasAudio = probeResult.has_audio;
        // Use probed duration if available (more accurate for webcam)
        if (probeResult.duration_ms) {
          duration_ms = probeResult.duration_ms;
        }
      } catch (e) {
        console.warn("Failed to probe webcam recording:", e);
      }

      addAsset({
        demo_id: currentDemo.demo.id,
        name: `${recording.name} (Webcam)`,
        file_path: recording.webcam_path,
        asset_type: "video",
        duration_ms: duration_ms || undefined,
        has_audio: hasAudio,
      });
    }

    setShowAppMediaPicker(false);
  }, [currentDemo, addAsset]);

  // Handle adding app screenshot as asset
  const handleAddScreenshot = useCallback((screenshot: Screenshot) => {
    if (!currentDemo || !screenshot.image_path) return;

    addAsset({
      demo_id: currentDemo.demo.id,
      name: screenshot.title || "Screenshot",
      file_path: screenshot.image_path,
      asset_type: "image",
    });
    setShowAppMediaPicker(false);
  }, [currentDemo, addAsset]);

  // Handle timeline click for seeking
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!timelineRef.current || !currentDemo || isDraggingClip || isTrimmingClip) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const clickX = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = clickX / pxPerMs;

      seekTo(Math.max(0, Math.min(clickedTime, playback.durationMs || currentDemo.demo.duration_ms || 60000)));
    },
    [currentDemo, timeline.zoom, seekTo, isDraggingClip, isTrimmingClip, playback.durationMs]
  );

  // Handle playhead drag
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

  // Playhead drag effect
  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !currentDemo) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const time = Math.max(0, Math.min(x / pxPerMs, playback.durationMs || currentDemo.demo.duration_ms || 60000));

      seekTo(time);
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPlayhead, currentDemo, timeline.zoom, seekTo, playback.durationMs]);

  // Handle adding a track
  const handleAddTrack = useCallback(
    (trackType: DemoTrackType, targetTrackId?: string) => {
      if (!currentDemo) return;
      const trackCount = currentDemo.tracks.filter((t) => t.track_type === trackType).length;
      const name = `${trackTypeConfig[trackType].label} ${trackCount + 1}`;
      addTrack({
        demo_id: currentDemo.demo.id,
        track_type: trackType,
        name,
        target_track_id: targetTrackId ?? null,
      });
      setShowAddTrackMenu(false);
      setShowZoomTrackTargetMenu(false);
    },
    [currentDemo, addTrack]
  );

  // Move track up (increase visual priority)
  const moveTrackUp = useCallback((trackId: string) => {
    if (!currentDemo) return;
    const sortedTracks = [...currentDemo.tracks].sort((a, b) => a.sort_order - b.sort_order);
    const trackIndex = sortedTracks.findIndex(t => t.id === trackId);
    if (trackIndex <= 0) return; // Already at top

    // Swap with the track above
    const newOrder = sortedTracks.map(t => t.id);
    [newOrder[trackIndex], newOrder[trackIndex - 1]] = [newOrder[trackIndex - 1], newOrder[trackIndex]];
    reorderTracks(newOrder);
  }, [currentDemo, reorderTracks]);

  // Move track down (decrease visual priority)
  const moveTrackDown = useCallback((trackId: string) => {
    if (!currentDemo) return;
    const sortedTracks = [...currentDemo.tracks].sort((a, b) => a.sort_order - b.sort_order);
    const trackIndex = sortedTracks.findIndex(t => t.id === trackId);
    if (trackIndex >= sortedTracks.length - 1) return; // Already at bottom

    // Swap with the track below
    const newOrder = sortedTracks.map(t => t.id);
    [newOrder[trackIndex], newOrder[trackIndex + 1]] = [newOrder[trackIndex + 1], newOrder[trackIndex]];
    reorderTracks(newOrder);
  }, [currentDemo, reorderTracks]);

  // Mouse position for custom drag
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null);

  // Handle asset drag start (mouse-based, not HTML5 drag)
  const handleAssetMouseDown = useCallback(
    (e: React.MouseEvent, asset: DemoAsset) => {
      // Only left click
      if (e.button !== 0) return;
      e.preventDefault();

      console.log("=== ASSET MOUSE DOWN ===", asset.name, asset.asset_type);
      setDraggedAsset(asset);
      draggedAssetRef.current = asset;
      setDragMousePos({ x: e.clientX, y: e.clientY });
      setIsDraggingFile(false);
    },
    []
  );

  // Global mouse move/up handlers for custom drag
  useEffect(() => {
    if (!draggedAsset) return;

    const handleMouseMove = (e: MouseEvent) => {
      setDragMousePos({ x: e.clientX, y: e.clientY });

      // Check if mouse is over a track
      if (!timelineRef.current || !currentDemo) return;

      const timelineRect = timelineRef.current.getBoundingClientRect();

      // Check if mouse is within the timeline area horizontally
      if (e.clientX < timelineRect.left || e.clientX > timelineRect.right) {
        setDragOverTrackId(null);
        setDragOverTime(null);
        return;
      }

      // Calculate time position
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - timelineRect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const time = Math.max(0, x / pxPerMs);

      // Find which track the mouse is over
      // Track rows start after time ruler (h-6 = 24px) and background track (h-10 = 40px)
      const timeRulerHeight = 24;
      const backgroundTrackHeight = 40;
      const trackHeight = 40;

      const relativeY = e.clientY - timelineRect.top + (timelineContainerRef.current?.scrollTop || 0);

      if (relativeY < timeRulerHeight + backgroundTrackHeight) {
        // Over time ruler or background track
        setDragOverTrackId(null);
        setDragOverTime(time);
        return;
      }

      // Calculate which track index
      const trackIndex = Math.floor((relativeY - timeRulerHeight - backgroundTrackHeight) / trackHeight);
      const sortedTracks = [...currentDemo.tracks].sort((a, b) => a.sort_order - b.sort_order);

      if (trackIndex >= 0 && trackIndex < sortedTracks.length) {
        const track = sortedTracks[trackIndex];
        setDragOverTrackId(track.id);
        setDragOverTime(time);
      } else {
        setDragOverTrackId(null);
        setDragOverTime(time);
      }
    };

    const handleMouseUp = () => {
      console.log("=== MOUSE UP ===", { dragOverTrackId, dragOverTime, asset: draggedAsset?.name });

      const asset = draggedAssetRef.current;

      if (asset && currentDemo && dragOverTrackId) {
        const track = currentDemo.tracks.find((t) => t.id === dragOverTrackId);

        if (track) {
          // Validate asset type matches track type
          const assetTypeToTrackType: Record<string, DemoTrackType> = {
            video: "video",
            image: "image",
            audio: "audio",
          };

          if (assetTypeToTrackType[asset.asset_type] === track.track_type) {
            // Calculate drop time
            let dropTime = dragOverTime ?? 0;

            // Add clip to track
            const duration = asset.duration_ms || 5000;
            const shouldSplitAudio = asset.asset_type === "video" && !!asset.has_audio;

            console.log("Adding clip:", { trackId: track.id, dropTime, asset: asset.name, duration });

            // Add video clip (muted if we're splitting audio)
            const videoClipId = addClip({
              track_id: track.id,
              name: asset.name,
              source_path: asset.file_path,
              source_type: asset.asset_type,
              source_duration_ms: asset.duration_ms || null,
              start_time_ms: Math.round(dropTime),
              duration_ms: duration,
              position_x: currentDemo.demo.width / 2,
              position_y: currentDemo.demo.height / 2,
              scale: 0.8,
              has_audio: asset.has_audio,
              muted: shouldSplitAudio,  // Mute video's audio when splitting
            });
            console.log("Clip added successfully");

            // Split audio from video: if video has audio, also create an audio clip on an audio track
            if (shouldSplitAudio && videoClipId) {
              // Find existing audio track or create a new one
              let audioTrackId: string | null = null;
              const existingAudioTrack = currentDemo.tracks.find((t) => t.track_type === "audio");

              if (existingAudioTrack) {
                audioTrackId = existingAudioTrack.id;
              } else {
                // Create a new audio track and get its ID
                const audioTrackCount = currentDemo.tracks.filter((t) => t.track_type === "audio").length;
                audioTrackId = addTrack({
                  demo_id: currentDemo.demo.id,
                  track_type: "audio",
                  name: `Audio ${audioTrackCount + 1}`,
                });
              }

              if (audioTrackId) {
                // Add audio clip linked to video clip
                const audioClipId = addClip({
                  track_id: audioTrackId,
                  name: `${asset.name} (Audio)`,
                  source_path: asset.file_path,
                  source_type: "audio",
                  source_duration_ms: asset.duration_ms || null,
                  start_time_ms: Math.round(dropTime),
                  duration_ms: duration,
                  position_x: 0,
                  position_y: 0,
                  scale: 1,
                  has_audio: true,
                  linked_clip_id: videoClipId,  // Link audio to video
                });

                // Update video clip to link back to audio clip
                if (audioClipId) {
                  updateClip(videoClipId, { linked_clip_id: audioClipId });
                }
                console.log("Audio track split from video and linked");
              }
            }
          } else {
            console.log("Drop failed: asset type mismatch", { assetType: asset.asset_type, trackType: track.track_type });
          }
        }
      }

      // Clean up drag state
      setDraggedAsset(null);
      draggedAssetRef.current = null;
      setDragOverTrackId(null);
      setDragOverTime(null);
      setDragMousePos(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggedAsset, dragOverTrackId, dragOverTime, currentDemo, addClip, addTrack, timeline.zoom]);

  // Handle clip drag start
  const handleClipDragStart = useCallback(
    (e: React.MouseEvent, clip: DemoClip) => {
      e.stopPropagation();
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = x / pxPerMs;
      const offset = clickedTime - clip.start_time_ms;

      setIsDraggingClip(true);
      setClipDragOffset(offset);
      selectClip(clip.id);
    },
    [timeline.zoom, selectClip]
  );

  // Handle clip drag with snapping
  useEffect(() => {
    if (!isDraggingClip || !canvas.selectedClipId || !currentDemo) return;

    const draggedClip = currentDemo.clips.find(c => c.id === canvas.selectedClipId);
    if (!draggedClip) return;

    // Snap threshold: 15 pixels converted to ms based on zoom
    // pxPerMs = timeline.zoom * 0.1, so msPerPx = 1 / (timeline.zoom * 0.1)
    // 15px threshold = 15 / (timeline.zoom * 0.1) ms
    const pxPerMs = timeline.zoom * 0.1;
    const snapThresholdPx = 15;
    const snapThresholdMs = snapThresholdPx / pxPerMs;

    // Prioritize clips on the same track for snapping
    const sameTrackClips = currentDemo.clips.filter(
      c => c.id !== canvas.selectedClipId && c.track_id === draggedClip.track_id
    );
    // Also consider clips on other tracks for cross-track alignment
    const otherTrackClips = currentDemo.clips.filter(
      c => c.id !== canvas.selectedClipId && c.track_id !== draggedClip.track_id
    );

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      let newStartTime = Math.max(0, (x / pxPerMs) - clipDragOffset);
      const clipDuration = draggedClip.duration_ms;
      let newEndTime = newStartTime + clipDuration;

      // Snapping logic - only run if snap is enabled
      let snapped = false;
      let snapType = "";

      if (timeline.snapEnabled) {
        // First priority: snap to same-track clips (seamless transitions)
        for (const clip of sameTrackClips) {
          const clipStart = clip.start_time_ms;
          const clipEnd = clip.start_time_ms + clip.duration_ms;

          // Snap dragged clip's START to other clip's END (close gap on left)
          if (!snapped && Math.abs(newStartTime - clipEnd) < snapThresholdMs) {
            newStartTime = clipEnd;
            snapped = true;
            snapType = "start-to-end";
          }

          // Snap dragged clip's END to other clip's START (close gap on right)
          if (!snapped && Math.abs(newEndTime - clipStart) < snapThresholdMs) {
            newStartTime = clipStart - clipDuration;
            snapped = true;
            snapType = "end-to-start";
          }
        }

        // Second priority: snap to other track clips for alignment
        if (!snapped) {
          for (const clip of otherTrackClips) {
            const clipStart = clip.start_time_ms;
            const clipEnd = clip.start_time_ms + clip.duration_ms;

            // Snap to starts
            if (!snapped && Math.abs(newStartTime - clipStart) < snapThresholdMs) {
              newStartTime = clipStart;
              snapped = true;
              snapType = "start-to-start";
            }

            // Snap to ends
            if (!snapped && Math.abs(newEndTime - clipEnd) < snapThresholdMs) {
              newStartTime = clipEnd - clipDuration;
              snapped = true;
              snapType = "end-to-end";
            }
          }
        }

        // Snap to timeline start (0) - higher priority
        if (!snapped && Math.abs(newStartTime) < snapThresholdMs) {
          newStartTime = 0;
          snapped = true;
          snapType = "timeline-start";
        }

        // Snap to playhead
        if (!snapped && Math.abs(newStartTime - playback.currentTimeMs) < snapThresholdMs) {
          newStartTime = playback.currentTimeMs;
          snapped = true;
          snapType = "playhead-start";
        } else if (!snapped && Math.abs(newEndTime - playback.currentTimeMs) < snapThresholdMs) {
          newStartTime = playback.currentTimeMs - clipDuration;
          snapped = true;
          snapType = "playhead-end";
        }

        if (snapped) {
          console.log(`[Snap] ${snapType} -> ${Math.round(newStartTime)}ms`);
        }
      }

      const newTime = Math.round(Math.max(0, newStartTime));
      updateClip(canvas.selectedClipId!, { start_time_ms: newTime });

      // Also move linked clip (if any)
      if (draggedClip.linked_clip_id) {
        updateClip(draggedClip.linked_clip_id, { start_time_ms: newTime });
      }
    };

    const handleMouseUp = () => {
      setIsDraggingClip(false);
      setClipDragOffset(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingClip, canvas.selectedClipId, clipDragOffset, timeline.zoom, updateClip, currentDemo, playback.currentTimeMs]);

  // Handle clip trimming
  const handleTrimStart = useCallback(
    (e: React.MouseEvent, clipId: string, edge: "start" | "end") => {
      e.stopPropagation();
      setIsTrimmingClip({ clipId, edge });
      selectClip(clipId);
    },
    [selectClip]
  );

  // Handle trim drag
  useEffect(() => {
    if (!isTrimmingClip || !currentDemo) return;

    const initialClip = currentDemo.clips.find((c) => c.id === isTrimmingClip.clipId);
    if (!initialClip) return;

    // Store initial values for calculations
    const initialStartTime = initialClip.start_time_ms;
    const initialDuration = initialClip.duration_ms;
    const initialInPoint = initialClip.in_point_ms || 0;
    const linkedClipId = initialClip.linked_clip_id;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const newTime = Math.max(0, x / pxPerMs);

      if (isTrimmingClip.edge === "start") {
        const maxStart = initialStartTime + initialDuration - 100;
        const newStart = Math.min(newTime, maxStart);
        const durationDelta = initialStartTime - newStart;
        const updates = {
          start_time_ms: Math.round(newStart),
          duration_ms: Math.round(initialDuration + durationDelta),
          in_point_ms: Math.round(Math.max(0, initialInPoint - durationDelta)),
        };
        updateClip(isTrimmingClip.clipId, updates);
        // Also trim linked clip
        if (linkedClipId) {
          updateClip(linkedClipId, updates);
        }
      } else {
        const newDuration = Math.max(100, newTime - initialStartTime);
        updateClip(isTrimmingClip.clipId, {
          duration_ms: Math.round(newDuration),
        });
        // Also trim linked clip
        if (linkedClipId) {
          updateClip(linkedClipId, {
            duration_ms: Math.round(newDuration),
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsTrimmingClip(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isTrimmingClip, timeline.zoom, updateClip, currentDemo]);

  // Handle background trim (changes demo duration)
  const handleBackgroundTrimStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTrimmingBackground(true);
  }, []);

  useEffect(() => {
    if (!isTrimmingBackground || !currentDemo) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const newDuration = Math.max(1000, x / pxPerMs); // Minimum 1 second

      setDemoDuration(Math.round(newDuration));
    };

    const handleMouseUp = () => {
      setIsTrimmingBackground(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isTrimmingBackground, timeline.zoom, setDemoDuration, currentDemo]);

  // Handle zoom clip drag start
  const handleZoomClipDragStart = useCallback(
    (e: React.MouseEvent, zoomClip: DemoZoomClip) => {
      e.stopPropagation();
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = x / pxPerMs;
      const offset = clickedTime - zoomClip.start_time_ms;

      setIsDraggingZoomClip(true);
      setZoomClipDragOffset(offset);
      selectZoomClip(zoomClip.id);
    },
    [timeline.zoom, selectZoomClip]
  );

  // Handle zoom clip drag
  useEffect(() => {
    if (!isDraggingZoomClip || !canvas.selectedZoomClipId || !currentDemo) return;

    const draggedZoomClip = currentDemo.zoomClips.find(zc => zc.id === canvas.selectedZoomClipId);
    if (!draggedZoomClip) return;

    const pxPerMs = timeline.zoom * 0.1;
    const snapThresholdPx = 15;
    const snapThresholdMs = snapThresholdPx / pxPerMs;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      let newStartTime = Math.max(0, (x / pxPerMs) - zoomClipDragOffset);

      // Snap to playhead
      if (Math.abs(newStartTime - playback.currentTimeMs) < snapThresholdMs) {
        newStartTime = playback.currentTimeMs;
      }

      // Snap to timeline start
      if (Math.abs(newStartTime) < snapThresholdMs) {
        newStartTime = 0;
      }

      updateZoomClip(canvas.selectedZoomClipId!, { start_time_ms: Math.round(Math.max(0, newStartTime)) });
    };

    const handleMouseUp = () => {
      setIsDraggingZoomClip(false);
      setZoomClipDragOffset(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingZoomClip, canvas.selectedZoomClipId, zoomClipDragOffset, timeline.zoom, updateZoomClip, currentDemo, playback.currentTimeMs]);

  // Handle zoom clip trim start
  const handleZoomClipTrimStart = useCallback(
    (e: React.MouseEvent, clipId: string, edge: "start" | "end") => {
      e.stopPropagation();
      setIsTrimmingZoomClip({ clipId, edge });
      selectZoomClip(clipId);
    },
    [selectZoomClip]
  );

  // Handle zoom clip trim drag
  useEffect(() => {
    if (!isTrimmingZoomClip || !currentDemo) return;

    const zoomClip = currentDemo.zoomClips.find((zc) => zc.id === isTrimmingZoomClip.clipId);
    if (!zoomClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const newTime = Math.max(0, x / pxPerMs);

      if (isTrimmingZoomClip.edge === "start") {
        const maxStart = zoomClip.start_time_ms + zoomClip.duration_ms - 100;
        const newStart = Math.min(newTime, maxStart);
        const durationDelta = zoomClip.start_time_ms - newStart;
        updateZoomClip(isTrimmingZoomClip.clipId, {
          start_time_ms: Math.round(newStart),
          duration_ms: Math.round(zoomClip.duration_ms + durationDelta),
        });
      } else {
        const newDuration = Math.max(100, newTime - zoomClip.start_time_ms);
        updateZoomClip(isTrimmingZoomClip.clipId, {
          duration_ms: Math.round(newDuration),
        });
      }
    };

    const handleMouseUp = () => {
      setIsTrimmingZoomClip(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isTrimmingZoomClip, timeline.zoom, updateZoomClip, currentDemo]);

  // Handle click on zoom track to create new zoom clip
  const handleZoomTrackClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      // Don't create if clicking on an existing zoom clip (they stop propagation)
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const clickX = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = Math.max(0, clickX / pxPerMs);

      // Create a new zoom clip at the clicked position with default 2 second duration
      addZoomClip({
        track_id: trackId,
        name: "Zoom",
        start_time_ms: Math.round(clickedTime),
        duration_ms: 2000,
        zoom_scale: 2.0,
        zoom_center_x: 50,
        zoom_center_y: 50,
        ease_in_duration_ms: 300,
        ease_out_duration_ms: 300,
      });
    },
    [timeline.zoom, addZoomClip]
  );

  // Handle click on blur track to create new blur clip
  const handleBlurTrackClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const clickX = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = Math.max(0, clickX / pxPerMs);

      // Create a new blur clip at the clicked position with default 2 second duration
      addBlurClip({
        track_id: trackId,
        name: "Blur",
        start_time_ms: Math.round(clickedTime),
        duration_ms: 2000,
      });
    },
    [timeline.zoom, addBlurClip]
  );

  // Handle blur clip drag start
  const handleBlurClipDragStart = useCallback(
    (e: React.MouseEvent, blurClip: DemoBlurClip) => {
      e.stopPropagation();
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = x / pxPerMs;
      const offset = clickedTime - blurClip.start_time_ms;

      setIsDraggingBlurClip(true);
      setBlurClipDragOffset(offset);
      selectBlurClip(blurClip.id);
    },
    [timeline.zoom, selectBlurClip]
  );

  // Handle blur clip drag
  useEffect(() => {
    if (!isDraggingBlurClip || !canvas.selectedBlurClipId || !currentDemo) return;

    const draggedBlurClip = currentDemo.blurClips.find(bc => bc.id === canvas.selectedBlurClipId);
    if (!draggedBlurClip) return;

    const pxPerMs = timeline.zoom * 0.1;
    const snapThresholdPx = 15;
    const snapThresholdMs = snapThresholdPx / pxPerMs;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      let newStartTime = Math.max(0, (x / pxPerMs) - blurClipDragOffset);

      // Snap to playhead
      if (Math.abs(newStartTime - playback.currentTimeMs) < snapThresholdMs) {
        newStartTime = playback.currentTimeMs;
      }

      // Snap to timeline start
      if (Math.abs(newStartTime) < snapThresholdMs) {
        newStartTime = 0;
      }

      updateBlurClip(canvas.selectedBlurClipId!, { start_time_ms: Math.round(Math.max(0, newStartTime)) });
    };

    const handleMouseUp = () => {
      setIsDraggingBlurClip(false);
      setBlurClipDragOffset(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingBlurClip, canvas.selectedBlurClipId, blurClipDragOffset, timeline.zoom, updateBlurClip, currentDemo, playback.currentTimeMs]);

  // Handle blur clip trim start
  const handleBlurClipTrimStart = useCallback(
    (e: React.MouseEvent, clipId: string, edge: "start" | "end") => {
      e.stopPropagation();
      setIsTrimmingBlurClip({ clipId, edge });
      selectBlurClip(clipId);
    },
    [selectBlurClip]
  );

  // Handle blur clip trim drag
  useEffect(() => {
    if (!isTrimmingBlurClip || !currentDemo) return;

    const blurClip = currentDemo.blurClips.find((bc) => bc.id === isTrimmingBlurClip.clipId);
    if (!blurClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const newTime = Math.max(0, x / pxPerMs);

      if (isTrimmingBlurClip.edge === "start") {
        const maxStart = blurClip.start_time_ms + blurClip.duration_ms - 100;
        const newStart = Math.min(newTime, maxStart);
        const durationDelta = blurClip.start_time_ms - newStart;
        updateBlurClip(isTrimmingBlurClip.clipId, {
          start_time_ms: Math.round(newStart),
          duration_ms: Math.round(blurClip.duration_ms + durationDelta),
        });
      } else {
        const newDuration = Math.max(100, newTime - blurClip.start_time_ms);
        updateBlurClip(isTrimmingBlurClip.clipId, {
          duration_ms: Math.round(newDuration),
        });
      }
    };

    const handleMouseUp = () => {
      setIsTrimmingBlurClip(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isTrimmingBlurClip, timeline.zoom, updateBlurClip, currentDemo]);

  // Handle click on pan track to create a new pan clip
  const handlePanTrackClick = useCallback(
    (e: React.MouseEvent, trackId: string) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const clickX = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = Math.max(0, clickX / pxPerMs);

      // Create a new pan clip at the clicked position with default 2 second duration
      addPanClip({
        track_id: trackId,
        name: "Pan",
        start_time_ms: Math.round(clickedTime),
        duration_ms: 2000,
      });
    },
    [timeline.zoom, addPanClip]
  );

  // Handle pan clip drag start
  const handlePanClipDragStart = useCallback(
    (e: React.MouseEvent, panClip: DemoPanClip) => {
      e.stopPropagation();
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const clickedTime = x / pxPerMs;
      const offset = clickedTime - panClip.start_time_ms;

      setIsDraggingPanClip(true);
      setPanClipDragOffset(offset);
      selectPanClip(panClip.id);
    },
    [timeline.zoom, selectPanClip]
  );

  // Handle pan clip drag
  useEffect(() => {
    if (!isDraggingPanClip || !canvas.selectedPanClipId || !currentDemo) return;

    const draggedPanClip = currentDemo.panClips.find(pc => pc.id === canvas.selectedPanClipId);
    if (!draggedPanClip) return;

    const pxPerMs = timeline.zoom * 0.1;
    const snapThresholdPx = 15;
    const snapThresholdMs = snapThresholdPx / pxPerMs;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      let newStartTime = Math.max(0, (x / pxPerMs) - panClipDragOffset);

      // Snap to playhead
      if (Math.abs(newStartTime - playback.currentTimeMs) < snapThresholdMs) {
        newStartTime = playback.currentTimeMs;
      }

      // Snap to timeline start
      if (Math.abs(newStartTime) < snapThresholdMs) {
        newStartTime = 0;
      }

      updatePanClip(canvas.selectedPanClipId!, { start_time_ms: Math.round(Math.max(0, newStartTime)) });
    };

    const handleMouseUp = () => {
      setIsDraggingPanClip(false);
      setPanClipDragOffset(0);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPanClip, canvas.selectedPanClipId, panClipDragOffset, timeline.zoom, updatePanClip, currentDemo, playback.currentTimeMs]);

  // Handle pan clip trim start
  const handlePanClipTrimStart = useCallback(
    (e: React.MouseEvent, clipId: string, edge: "start" | "end") => {
      e.stopPropagation();
      setIsTrimmingPanClip({ clipId, edge });
      selectPanClip(clipId);
    },
    [selectPanClip]
  );

  // Handle pan clip trim drag
  useEffect(() => {
    if (!isTrimmingPanClip || !currentDemo) return;

    const panClip = currentDemo.panClips.find((pc) => pc.id === isTrimmingPanClip.clipId);
    if (!panClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const scrollLeft = timelineRef.current.scrollLeft;
      const x = e.clientX - rect.left + scrollLeft;
      const pxPerMs = timeline.zoom * 0.1;
      const newTime = Math.max(0, x / pxPerMs);

      if (isTrimmingPanClip.edge === "start") {
        const maxStart = panClip.start_time_ms + panClip.duration_ms - 100;
        const newStart = Math.min(newTime, maxStart);
        const durationDelta = panClip.start_time_ms - newStart;
        updatePanClip(isTrimmingPanClip.clipId, {
          start_time_ms: Math.round(newStart),
          duration_ms: Math.round(panClip.duration_ms + durationDelta),
        });
      } else {
        const newDuration = Math.max(100, newTime - panClip.start_time_ms);
        updatePanClip(isTrimmingPanClip.clipId, {
          duration_ms: Math.round(newDuration),
        });
      }
    };

    const handleMouseUp = () => {
      setIsTrimmingPanClip(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isTrimmingPanClip, timeline.zoom, updatePanClip, currentDemo]);

  // Handle canvas clip drag for repositioning
  const handleCanvasClipDragStart = useCallback((e: React.MouseEvent, clipId: string) => {
    e.stopPropagation();
    if (!currentDemo) return;

    const clip = currentDemo.clips.find(c => c.id === clipId);
    if (!clip) return;

    selectClip(clipId);
    setIsDraggingCanvasClip(true);
    setCanvasDragStart({
      x: e.clientX,
      y: e.clientY,
      clipX: clip.position_x ?? (currentDemo.demo.width / 2),
      clipY: clip.position_y ?? (currentDemo.demo.height / 2),
    });
  }, [currentDemo, selectClip]);

  useEffect(() => {
    if (!isDraggingCanvasClip || !canvasDragStart || !canvas.selectedClipId || !currentDemo || !canvasRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      // Calculate the scale factor from displayed size to actual demo dimensions
      const displayWidth = currentDemo.demo.width * canvas.zoom * 0.5;
      const displayHeight = currentDemo.demo.height * canvas.zoom * 0.5;
      const scaleX = currentDemo.demo.width / displayWidth;
      const scaleY = currentDemo.demo.height / displayHeight;

      // Calculate delta in screen pixels, then convert to demo coordinates
      const deltaX = (e.clientX - canvasDragStart.x) * scaleX;
      const deltaY = (e.clientY - canvasDragStart.y) * scaleY;

      // Calculate new position, clamped to demo bounds
      const newX = Math.max(0, Math.min(currentDemo.demo.width, canvasDragStart.clipX + deltaX));
      const newY = Math.max(0, Math.min(currentDemo.demo.height, canvasDragStart.clipY + deltaY));

      updateClip(canvas.selectedClipId!, {
        position_x: Math.round(newX),
        position_y: Math.round(newY),
      });
    };

    const handleMouseUp = () => {
      setIsDraggingCanvasClip(false);
      setCanvasDragStart(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingCanvasClip, canvasDragStart, canvas.selectedClipId, canvas.zoom, currentDemo, updateClip]);

  // Handle background selection
  const handleSelectGradient = useCallback(
    (gradient: { name: string; colors: string[]; angle: number }) => {
      if (!currentDemo) return;
      setBackground({
        demo_id: currentDemo.demo.id,
        background_type: "gradient",
        gradient_stops: JSON.stringify(gradient.colors.map((c, i) => ({ color: c, position: i / (gradient.colors.length - 1) }))),
        gradient_angle: gradient.angle,
      });
      setShowBackgroundPicker(false);
    },
    [currentDemo, setBackground]
  );

  const handleSelectSolid = useCallback(
    (color: string) => {
      if (!currentDemo) return;
      setBackground({
        demo_id: currentDemo.demo.id,
        background_type: "solid",
        color,
      });
      setShowBackgroundPicker(false);
    },
    [currentDemo, setBackground]
  );

  const handleSelectImage = useCallback(
    (imageUrl: string, attribution?: { name: string; link: string }) => {
      if (!currentDemo) return;
      setBackground({
        demo_id: currentDemo.demo.id,
        background_type: "image",
        image_url: imageUrl,
        image_attribution: attribution ? JSON.stringify(attribution) : undefined,
      });
      setShowBackgroundPicker(false);
    },
    [currentDemo, setBackground]
  );

  // Get video URL for preview
  const getVideoUrl = useCallback((path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    try {
      return convertFileSrc(path);
    } catch {
      return `file://${path}`;
    }
  }, []);

  // Get the currently visible video clip for preview
  const getCurrentVideoClip = useCallback(() => {
    if (!currentDemo) return null;
    const time = playback.currentTimeMs;

    // Find video clips that are visible at current time
    // Use >= for end time to avoid 1-frame gaps at clip boundaries
    const videoTracks = [...currentDemo.tracks.filter(t => t.track_type === "video")].sort((a, b) => b.sort_order - a.sort_order);
    for (const track of videoTracks) {
      if (!track.visible) continue;
      const clip = currentDemo.clips.find(
        c => c.track_id === track.id &&
             c.start_time_ms <= time &&
             c.start_time_ms + c.duration_ms >= time
      );
      if (clip) return clip;
    }
    return null;
  }, [currentDemo, playback.currentTimeMs]);

  // Handle volume change
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setVolume(parseFloat(e.target.value));
    },
    [setVolume]
  );

  // Toggle asset section
  const toggleAssetSection = useCallback((section: keyof typeof expandedAssetSections) => {
    setExpandedAssetSections(prev => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Fit canvas to view - calculate zoom to fit demo in container
  const handleFitCanvas = useCallback(() => {
    if (!canvasRef.current || !currentDemo) return;

    const container = canvasRef.current;
    const containerWidth = container.clientWidth - 48; // Padding
    const containerHeight = container.clientHeight - 48;

    const demoWidth = currentDemo.demo.width;
    const demoHeight = currentDemo.demo.height;

    // Calculate zoom needed to fit (remember display size is demoSize * zoom * 0.5)
    // So: containerWidth = demoWidth * zoom * 0.5
    // Therefore: zoom = containerWidth / (demoWidth * 0.5) = containerWidth * 2 / demoWidth
    const zoomToFitWidth = (containerWidth * 2) / demoWidth;
    const zoomToFitHeight = (containerHeight * 2) / demoHeight;

    // Use the smaller zoom to ensure it fits both dimensions
    const newZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 2); // Cap at 200%
    setCanvasZoom(Math.max(0.25, newZoom));
  }, [currentDemo, setCanvasZoom]);

  // Handle double-click on asset to add to timeline
  const handleAssetDoubleClick = useCallback((asset: DemoAsset) => {
    if (!currentDemo) return;

    // Find or create appropriate track
    const assetTypeToTrackType: Record<string, DemoTrackType> = {
      video: "video",
      image: "image",
      audio: "audio",
    };
    const trackType = assetTypeToTrackType[asset.asset_type];
    let track = currentDemo.tracks.find(t => t.track_type === trackType);

    if (!track) {
      // Create new track
      const trackCount = currentDemo.tracks.filter(t => t.track_type === trackType).length;
      addTrack({
        demo_id: currentDemo.demo.id,
        track_type: trackType,
        name: `${trackTypeConfig[trackType].label} ${trackCount + 1}`,
      });
      // Get the newly created track (it should be the last one of this type)
      track = currentDemo.tracks.find(t => t.track_type === trackType);
    }

    if (!track) return;

    // Add at playhead position
    const duration = asset.duration_ms || 5000;
    const startTime = Math.round(playback.currentTimeMs);
    const shouldSplitAudio = asset.asset_type === "video" && !!asset.has_audio;

    // Add video clip (muted if we're splitting audio)
    const videoClipId = addClip({
      track_id: track.id,
      name: asset.name,
      source_path: asset.file_path,
      source_type: asset.asset_type,
      source_duration_ms: asset.duration_ms || null,
      start_time_ms: startTime,
      duration_ms: duration,
      position_x: currentDemo.demo.width / 2,
      position_y: currentDemo.demo.height / 2,
      scale: 0.8,
      has_audio: asset.has_audio,
      muted: shouldSplitAudio,  // Mute video's audio when splitting
    });

    // Split audio from video: if video has audio, also create an audio clip on an audio track
    if (shouldSplitAudio && videoClipId) {
      // Find existing audio track or create a new one
      let audioTrackId: string | null = null;
      const existingAudioTrack = currentDemo.tracks.find((t) => t.track_type === "audio");

      if (existingAudioTrack) {
        audioTrackId = existingAudioTrack.id;
      } else {
        // Create a new audio track and get its ID
        const audioTrackCount = currentDemo.tracks.filter((t) => t.track_type === "audio").length;
        audioTrackId = addTrack({
          demo_id: currentDemo.demo.id,
          track_type: "audio",
          name: `Audio ${audioTrackCount + 1}`,
        });
      }

      if (audioTrackId) {
        // Add audio clip linked to video clip
        const audioClipId = addClip({
          track_id: audioTrackId,
          name: `${asset.name} (Audio)`,
          source_path: asset.file_path,
          source_type: "audio",
          source_duration_ms: asset.duration_ms || null,
          start_time_ms: startTime,
          duration_ms: duration,
          position_x: 0,
          position_y: 0,
          scale: 1,
          has_audio: true,
          linked_clip_id: videoClipId,  // Link audio to video
        });

        // Update video clip to link back to audio clip
        if (audioClipId) {
          updateClip(videoClipId, { linked_clip_id: audioClipId });
        }
      }
    }
  }, [currentDemo, addTrack, addClip, updateClip, playback.currentTimeMs]);

  // Calculate timeline duration
  const getTimelineDuration = useCallback(() => {
    if (!currentDemo) return 60000;
    let maxEnd = currentDemo.demo.duration_ms || 60000;
    for (const clip of currentDemo.clips) {
      const clipEnd = clip.start_time_ms + clip.duration_ms;
      if (clipEnd > maxEnd) maxEnd = clipEnd;
    }
    return maxEnd + 10000; // Add 10s padding
  }, [currentDemo]);

  if (!currentDemo) {
    return (
      <div className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--text-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading demo...</p>
        </div>
      </div>
    );
  }

  const { demo, background, tracks, clips, assets, zoomClips, blurClips, panClips } = currentDemo;
  const currentVideoClip = getCurrentVideoClip();
  const timelineDuration = getTimelineDuration();

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <header className="h-12 border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0 bg-[var(--surface-secondary)]">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-[var(--text-primary)]">{demo.name}</span>
          <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
            {demo.width} × {demo.height} • {demo.frame_rate}fps
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center border-r border-[var(--border-default)] pr-2 mr-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] disabled:opacity-30"
              title="Undo (⌘Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] disabled:opacity-30"
              title="Redo (⌘⇧Z)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Toggle panels */}
          <button
            onClick={() => setShowAssets(!showAssets)}
            className={`p-1.5 hover:bg-[var(--surface-hover)] ${showAssets ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}
            title="Toggle Assets Panel"
          >
            <FolderOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowInspector(!showInspector)}
            className={`p-1.5 hover:bg-[var(--surface-hover)] ${showInspector ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}
            title="Toggle Inspector Panel"
          >
            <Settings className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-[var(--border-default)] mx-1" />

          {/* Export Button */}
          <button
            onClick={() => setShowExportModal(true)}
            className="h-8 px-4 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium flex items-center gap-2 hover:opacity-90"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Assets Panel */}
        {showAssets && (
          <aside
            className="flex-shrink-0 border-r border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col"
            style={{ width: assetsPanelWidth }}
          >
            <div className="p-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <span className="font-medium text-[var(--text-primary)] text-sm">Assets</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAppMediaPicker(true)}
                  className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                  title="Import from App"
                >
                  <Film className="w-4 h-4" />
                </button>
                <button
                  onClick={handleImportFiles}
                  className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                  title="Import Files"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Import drop zone */}
            <div
              className="p-3 border-b border-[var(--border-default)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                // Handle file drop
              }}
            >
              <div
                onClick={handleImportFiles}
                className="border-2 border-dashed border-[var(--border-default)] p-3 text-center hover:border-[var(--text-tertiary)] transition-colors cursor-pointer"
              >
                <Upload className="w-5 h-5 text-[var(--text-tertiary)] mx-auto mb-1" />
                <p className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                  Import media files
                </p>
              </div>
            </div>

            {/* Asset categories */}
            <div className="flex-1 overflow-auto">
              {/* App Media Section */}
              <div className="border-b border-[var(--border-default)]">
                <button
                  onClick={() => toggleAssetSection("appMedia")}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface-hover)] text-left"
                >
                  {expandedAssetSections.appMedia ? (
                    <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                  )}
                  <Film className="w-3 h-3 text-[var(--accent-interactive)]" />
                  <span className="text-[var(--text-caption)] text-[var(--text-secondary)] uppercase tracking-wide">
                    App Recordings
                  </span>
                  <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] ml-auto">
                    {recordings.length}
                  </span>
                </button>
                {expandedAssetSections.appMedia && (
                  <div className="px-3 pb-2">
                    {recordings.length === 0 ? (
                      <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] italic py-2">
                        No recordings linked to this demo
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {recordings.slice(0, 5).map((recording) => (
                          <div
                            key={recording.id}
                            onClick={() => handleAddRecording(recording)}
                            className="p-2 bg-[var(--surface-primary)] border border-[var(--border-default)] cursor-pointer hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          >
                            <div className="flex items-center gap-2">
                              <Video className="w-3 h-3 text-[#3B82F6]" />
                              <p className="text-[var(--text-body-sm)] text-[var(--text-primary)] truncate flex-1">
                                {recording.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">
                              <span>{recording.duration_ms ? formatTime(recording.duration_ms) : "—"}</span>
                              {recording.webcam_path && (
                                <span className="px-1 py-0.5 bg-[var(--surface-hover)] text-[9px] uppercase">
                                  + Webcam
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                        {recordings.length > 5 && (
                          <button
                            onClick={() => setShowAppMediaPicker(true)}
                            className="w-full p-2 text-[var(--text-caption)] text-[var(--accent-interactive)] hover:underline"
                          >
                            View all {recordings.length} recordings...
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Videos */}
              <div className="border-b border-[var(--border-default)]">
                <button
                  onClick={() => toggleAssetSection("videos")}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface-hover)] text-left"
                >
                  {expandedAssetSections.videos ? (
                    <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                  )}
                  <Video className="w-3 h-3 text-[#3B82F6]" />
                  <span className="text-[var(--text-caption)] text-[var(--text-secondary)] uppercase tracking-wide">
                    Videos
                  </span>
                  <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] ml-auto">
                    {assets.filter(a => a.asset_type === "video").length}
                  </span>
                </button>
                {expandedAssetSections.videos && (
                  <div className="px-3 pb-2">
                    {assets.filter((a) => a.asset_type === "video").length === 0 ? (
                      <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] italic py-2">
                        No videos imported
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {assets
                          .filter((a) => a.asset_type === "video")
                          .map((asset) => (
                            <div
                              key={asset.id}
                              onMouseDown={(e) => handleAssetMouseDown(e, asset)}
                              onDoubleClick={() => handleAssetDoubleClick(asset)}
                              className="p-2 bg-[var(--surface-primary)] border border-[var(--border-default)] cursor-grab hover:border-[var(--border-strong)] group select-none"
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3 h-3 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100" />
                                <p className="text-[var(--text-body-sm)] text-[var(--text-primary)] truncate flex-1">
                                  {asset.name}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-[var(--accent-error)]"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">
                                {asset.duration_ms ? formatTime(asset.duration_ms) : "—"}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="border-b border-[var(--border-default)]">
                <button
                  onClick={() => toggleAssetSection("images")}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface-hover)] text-left"
                >
                  {expandedAssetSections.images ? (
                    <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                  )}
                  <Image className="w-3 h-3 text-[#10B981]" />
                  <span className="text-[var(--text-caption)] text-[var(--text-secondary)] uppercase tracking-wide">
                    Images
                  </span>
                  <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] ml-auto">
                    {assets.filter(a => a.asset_type === "image").length}
                  </span>
                </button>
                {expandedAssetSections.images && (
                  <div className="px-3 pb-2">
                    {assets.filter((a) => a.asset_type === "image").length === 0 ? (
                      <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] italic py-2">
                        No images imported
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1">
                        {assets
                          .filter((a) => a.asset_type === "image")
                          .map((asset) => (
                            <div
                              key={asset.id}
                              onMouseDown={(e) => handleAssetMouseDown(e, asset)}
                              onDoubleClick={() => handleAssetDoubleClick(asset)}
                              className="aspect-video bg-[var(--surface-primary)] border border-[var(--border-default)] cursor-grab hover:border-[var(--border-strong)] flex items-center justify-center relative group overflow-hidden select-none"
                            >
                              {asset.file_path && (
                                <img
                                  src={getVideoUrl(asset.file_path)}
                                  alt={asset.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                className="absolute top-1 right-1 p-0.5 bg-black/50 opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-error)]"
                              >
                                <Trash2 className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Audio */}
              <div className="border-b border-[var(--border-default)]">
                <button
                  onClick={() => toggleAssetSection("audio")}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface-hover)] text-left"
                >
                  {expandedAssetSections.audio ? (
                    <ChevronDown className="w-3 h-3 text-[var(--text-tertiary)]" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)]" />
                  )}
                  <Music className="w-3 h-3 text-[#F59E0B]" />
                  <span className="text-[var(--text-caption)] text-[var(--text-secondary)] uppercase tracking-wide">
                    Audio
                  </span>
                  <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] ml-auto">
                    {assets.filter(a => a.asset_type === "audio").length}
                  </span>
                </button>
                {expandedAssetSections.audio && (
                  <div className="px-3 pb-2">
                    {assets.filter((a) => a.asset_type === "audio").length === 0 ? (
                      <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] italic py-2">
                        No audio imported
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {assets
                          .filter((a) => a.asset_type === "audio")
                          .map((asset) => (
                            <div
                              key={asset.id}
                              onMouseDown={(e) => handleAssetMouseDown(e, asset)}
                              onDoubleClick={() => handleAssetDoubleClick(asset)}
                              className="p-2 bg-[var(--surface-primary)] border border-[var(--border-default)] cursor-grab hover:border-[var(--border-strong)] group select-none"
                            >
                              <div className="flex items-center gap-2">
                                <GripVertical className="w-3 h-3 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100" />
                                <p className="text-[var(--text-body-sm)] text-[var(--text-primary)] truncate flex-1">
                                  {asset.name}
                                </p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                  className="p-0.5 opacity-0 group-hover:opacity-100 hover:text-[var(--accent-error)]"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">
                                {asset.duration_ms ? formatTime(asset.duration_ms) : "—"}
                              </p>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Backgrounds */}
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  <Layers className="w-3 h-3" />
                  Backgrounds
                </div>
                <button
                  onClick={() => setShowBackgroundPicker(true)}
                  className="w-full p-2 border border-dashed border-[var(--border-default)] text-[var(--text-caption)] text-[var(--text-secondary)] hover:border-[var(--text-tertiary)] hover:bg-[var(--surface-hover)]"
                >
                  Choose Background
                </button>
                {background && (
                  <div className="mt-2 p-2 border border-[var(--border-default)] bg-[var(--surface-primary)]">
                    <p className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                      Current: {background.background_type}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 bg-[#1a1a1a] flex items-center justify-center overflow-hidden relative"
          >
            {/* Canvas Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-2 bg-[var(--surface-secondary)]/90 backdrop-blur p-1 z-10">
              <button
                onClick={() => setCanvasZoom(Math.max(0.25, canvas.zoom - 0.1))}
                className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[var(--text-caption)] text-[var(--text-secondary)] w-12 text-center">
                {Math.round(canvas.zoom * 100)}%
              </span>
              <button
                onClick={() => setCanvasZoom(Math.min(2, canvas.zoom + 0.1))}
                className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-[var(--border-default)]" />
              <button
                onClick={handleFitCanvas}
                className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Fit to view"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                onClick={toggleSafeZones}
                className={`p-1 hover:bg-[var(--surface-hover)] ${canvas.showSafeZones ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
                title="Toggle safe zones"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas Preview */}
            <div
              className="bg-[#2a2a2a] shadow-2xl relative overflow-hidden"
              style={{
                width: demo.width * canvas.zoom * 0.5,
                height: demo.height * canvas.zoom * 0.5,
              }}
            >
              {/* Background */}
              {background ? (
                background.background_type === "image" && background.image_url ? (
                  <img
                    src={background.image_url}
                    alt="Background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: background.background_type === "solid"
                        ? background.color || "#000"
                        : background.background_type === "gradient"
                        ? `linear-gradient(${background.gradient_angle || 180}deg, ${
                            background.gradient_stops
                              ? JSON.parse(background.gradient_stops).map((s: {color: string}) => s.color).join(", ")
                              : "#1a1a2e, #4a4a8a"
                          })`
                        : "#000",
                    }}
                  />
                )
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#4a4a8a]" />
              )}

              {/* Video and Image clips - render ALL clips but only show visible ones
                  This keeps video elements mounted to avoid loading delays during transitions */}
              {(() => {
                const allVideoImageClips = clips.filter(c => c.source_type === "video" || c.source_type === "image");

                // Determine which clips should be visible at current time
                const visibleClipIds = new Set(
                  allVideoImageClips
                    .filter(c =>
                      c.start_time_ms <= playback.currentTimeMs &&
                      c.start_time_ms + c.duration_ms >= playback.currentTimeMs
                    )
                    .map(c => c.id)
                );

                // If no clips visible, find nearest clip to show (gap fill)
                let gapFillClipId: string | null = null;
                let gapFillShowAtTime: number = playback.currentTimeMs;

                if (visibleClipIds.size === 0 && allVideoImageClips.length > 0) {
                  const clipsBefore = allVideoImageClips
                    .filter(c => c.start_time_ms + c.duration_ms < playback.currentTimeMs)
                    .sort((a, b) => (b.start_time_ms + b.duration_ms) - (a.start_time_ms + a.duration_ms));
                  const clipsAfter = allVideoImageClips
                    .filter(c => c.start_time_ms > playback.currentTimeMs)
                    .sort((a, b) => a.start_time_ms - b.start_time_ms);

                  if (clipsBefore.length > 0) {
                    gapFillClipId = clipsBefore[0].id;
                    gapFillShowAtTime = clipsBefore[0].start_time_ms + clipsBefore[0].duration_ms - 1;
                  } else if (clipsAfter.length > 0) {
                    gapFillClipId = clipsAfter[0].id;
                    gapFillShowAtTime = clipsAfter[0].start_time_ms;
                  }
                }

                // Build clip render info for ALL clips
                const allClipsWithInfo = allVideoImageClips.map(clip => {
                  const track = tracks.find(t => t.id === clip.track_id);
                  const isVisible = visibleClipIds.has(clip.id) || clip.id === gapFillClipId;
                  const showAtTime = clip.id === gapFillClipId ? gapFillShowAtTime : playback.currentTimeMs;
                  return {
                    clip,
                    track,
                    sortOrder: track?.sort_order ?? 0,
                    trackVisible: track?.visible ?? true,
                    isVisible,
                    showAtTime,
                  };
                }).sort((a, b) => a.sortOrder - b.sortOrder);

                // Render ALL clips, but only show visible ones (keeps video elements mounted for smooth transitions)
                // z-index calculation: lower sort_order = top of timeline = higher z-index (on top visually)
                const maxSortOrder = Math.max(...tracks.map(t => t.sort_order), 0);
                return allClipsWithInfo.map(({ clip, track, trackVisible, isVisible, showAtTime }) => {
                  // Skip if track is hidden
                  if (!trackVisible) return null;
                  // Convert pixel position to percentage of canvas
                  const canvasWidth = currentDemo.demo.width;
                  const canvasHeight = currentDemo.demo.height;
                  const posXPercent = clip.position_x != null ? (clip.position_x / canvasWidth) * 100 : 50;
                  const posYPercent = clip.position_y != null ? (clip.position_y / canvasHeight) * 100 : 50;

                  // Use showAtTime for the effective playback position (handles gap fill)
                  const effectiveTime = showAtTime;

                  // Calculate zoom effect - check zoom tracks first, then fall back to clip-level zoom
                  let currentZoom = 1;
                  let zoomTransformOrigin = "center center";
                  let hasZoomEffect = false;

                  // First, check for zoom clips from zoom tracks that target this clip's track
                  const zoomTracksTargetingThisTrack = tracks.filter(
                    t => t.track_type === "zoom" && t.target_track_id === clip.track_id && t.visible
                  );
                  for (const zoomTrack of zoomTracksTargetingThisTrack) {
                    // Find zoom clips on this track that are active at current time
                    const activeZoomClip = zoomClips.find(
                      zc => zc.track_id === zoomTrack.id &&
                        effectiveTime >= zc.start_time_ms &&
                        effectiveTime < zc.start_time_ms + zc.duration_ms
                    );
                    if (activeZoomClip) {
                      hasZoomEffect = true;
                      const zoomClipTime = effectiveTime - activeZoomClip.start_time_ms;
                      const targetZoom = activeZoomClip.zoom_scale;
                      const easeInDuration = activeZoomClip.ease_in_duration_ms;
                      const easeOutDuration = activeZoomClip.ease_out_duration_ms;
                      const easeOutStart = activeZoomClip.duration_ms - easeOutDuration;

                      zoomTransformOrigin = `${activeZoomClip.zoom_center_x}% ${activeZoomClip.zoom_center_y}%`;

                      if (zoomClipTime < easeInDuration) {
                        // Easing in
                        const progress = zoomClipTime / easeInDuration;
                        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                        currentZoom = 1 + (targetZoom - 1) * eased;
                      } else if (zoomClipTime < easeOutStart) {
                        // Holding at zoomed state
                        currentZoom = targetZoom;
                      } else {
                        // Easing out
                        const progress = (zoomClipTime - easeOutStart) / easeOutDuration;
                        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                        currentZoom = targetZoom - (targetZoom - 1) * eased;
                      }
                      break; // Use first matching zoom clip
                    }
                  }

                  // Fall back to clip-level zoom if no zoom track effect
                  if (!hasZoomEffect && clip.zoom_enabled) {
                    hasZoomEffect = true;
                    const clipTime = effectiveTime - clip.start_time_ms;
                    const zoomInStart = clip.zoom_in_start_ms ?? 0;
                    const zoomInDuration = clip.zoom_in_duration_ms ?? 500;
                    const zoomInEnd = zoomInStart + zoomInDuration;
                    const zoomOutStart = clip.zoom_out_start_ms ?? (clip.duration_ms - 500);
                    const zoomOutDuration = clip.zoom_out_duration_ms ?? 500;
                    const zoomOutEnd = zoomOutStart + zoomOutDuration;
                    const targetZoom = clip.zoom_scale ?? 2;
                    const centerX = clip.zoom_center_x ?? 50;
                    const centerY = clip.zoom_center_y ?? 50;

                    zoomTransformOrigin = `${centerX}% ${centerY}%`;

                    if (clipTime < zoomInStart) {
                      // Before zoom in starts
                      currentZoom = 1;
                    } else if (clipTime < zoomInEnd) {
                      // During zoom in (ease in-out)
                      const progress = (clipTime - zoomInStart) / zoomInDuration;
                      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                      currentZoom = 1 + (targetZoom - 1) * eased;
                    } else if (clipTime < zoomOutStart) {
                      // Holding at zoomed state
                      currentZoom = targetZoom;
                    } else if (clipTime < zoomOutEnd) {
                      // During zoom out (ease in-out)
                      const progress = (clipTime - zoomOutStart) / zoomOutDuration;
                      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                      currentZoom = targetZoom - (targetZoom - 1) * eased;
                    } else {
                      // After zoom out
                      currentZoom = 1;
                    }
                  }

                  // Calculate pan effect - check pan tracks targeting this clip's track
                  let panOffsetX = 0; // Percentage offset from center (0 = no pan)
                  let panOffsetY = 0;
                  let hasPanEffect = false;

                  const panTracksTargetingThisTrack = tracks.filter(
                    t => t.track_type === "pan" && t.target_track_id === clip.track_id && t.visible
                  );
                  for (const panTrack of panTracksTargetingThisTrack) {
                    // Find pan clips on this track that are active at current time
                    const activePanClip = panClips.find(
                      pc => pc.track_id === panTrack.id &&
                        effectiveTime >= pc.start_time_ms &&
                        effectiveTime < pc.start_time_ms + pc.duration_ms
                    );
                    if (activePanClip) {
                      hasPanEffect = true;
                      const panClipTime = effectiveTime - activePanClip.start_time_ms;
                      const panDuration = activePanClip.duration_ms;
                      const easeInDuration = activePanClip.ease_in_duration_ms;
                      const easeOutDuration = activePanClip.ease_out_duration_ms;
                      const easeOutStart = panDuration - easeOutDuration;

                      // Calculate interpolation progress with easing
                      let progress = panClipTime / panDuration;

                      // Apply ease-in-out based on position in clip
                      if (panClipTime < easeInDuration && easeInDuration > 0) {
                        // Easing in at start
                        const easeProgress = panClipTime / easeInDuration;
                        const eased = easeProgress < 0.5 ? 2 * easeProgress * easeProgress : 1 - Math.pow(-2 * easeProgress + 2, 2) / 2;
                        progress = eased * (easeInDuration / panDuration);
                      } else if (panClipTime >= easeOutStart && easeOutDuration > 0) {
                        // Easing out at end
                        const easeProgress = (panClipTime - easeOutStart) / easeOutDuration;
                        const eased = easeProgress < 0.5 ? 2 * easeProgress * easeProgress : 1 - Math.pow(-2 * easeProgress + 2, 2) / 2;
                        progress = (easeOutStart / panDuration) + eased * (easeOutDuration / panDuration);
                      }

                      // Interpolate from start to end position
                      // Position is 0-100%, where 50% = center, 0% = left/top edge, 100% = right/bottom edge
                      // Convert to offset from center (-50 to +50)
                      const startOffsetX = activePanClip.start_x - 50;
                      const startOffsetY = activePanClip.start_y - 50;
                      const endOffsetX = activePanClip.end_x - 50;
                      const endOffsetY = activePanClip.end_y - 50;

                      panOffsetX = startOffsetX + (endOffsetX - startOffsetX) * progress;
                      panOffsetY = startOffsetY + (endOffsetY - startOffsetY) * progress;
                      break; // Use first matching pan clip
                    }
                  }

                  // Build combined transform string
                  const transforms: string[] = [];
                  if (hasZoomEffect) {
                    transforms.push(`scale(${currentZoom})`);
                  }
                  if (hasPanEffect) {
                    // Pan offset is percentage of container, translate by that amount
                    transforms.push(`translate(${panOffsetX}%, ${panOffsetY}%)`);
                  }
                  const combinedTransform = transforms.length > 0 ? transforms.join(' ') : undefined;
                  const hasEffect = hasZoomEffect || hasPanEffect;

                  return (
                    <div
                      key={clip.id}
                      className={`absolute cursor-move ${canvas.selectedClipId === clip.id && isVisible ? "ring-2 ring-white" : ""}`}
                      style={{
                        left: `${posXPercent}%`,
                        top: `${posYPercent}%`,
                        transform: `translate(-50%, -50%)`,
                        width: `${(clip.scale || 0.8) * 100}%`,
                        height: `${(clip.scale || 0.8) * 100}%`,
                        opacity: isVisible ? (clip.opacity ?? 1) : 0, // Hide non-visible clips with opacity
                        // z-index: lower sort_order = top of timeline = higher z-index (on top visually)
                        zIndex: isVisible ? maxSortOrder - (track?.sort_order ?? 0) + 1 : -1,
                        boxShadow: isVisible && clip.shadow_enabled
                          ? `0 ${clip.shadow_offset_y || 10}px ${clip.shadow_blur || 20}px rgba(0,0,0,${clip.shadow_opacity || 0.25})`
                          : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: hasEffect ? "hidden" : undefined, // Hide overflow during zoom/pan
                        pointerEvents: isVisible ? "auto" : "none", // Disable interaction for hidden clips
                      }}
                      onMouseDown={(e) => isVisible && handleCanvasClipDragStart(e, clip.id)}
                    >
                      {clip.source_type === "video" ? (
                        <video
                          key={clip.id}
                          ref={(el) => {
                            // Set the main preview ref if this is the current video clip
                            if (isVisible && clip.id === currentVideoClip?.id && el) {
                              videoPreviewRef.current = el;
                            }
                            // Track all video elements for sync
                            if (el) {
                              videoElementsRef.current.set(clip.id, el);
                            } else {
                              videoElementsRef.current.delete(clip.id);
                            }
                          }}
                          src={getVideoUrl(clip.source_path)}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            clipPath: `inset(${clip.crop_top ?? 0}% ${clip.crop_right ?? 0}% ${clip.crop_bottom ?? 0}% ${clip.crop_left ?? 0}%${clip.corner_radius ? ` round ${clip.corner_radius}px` : ""})`,
                            transform: combinedTransform,
                            transformOrigin: zoomTransformOrigin,
                            transition: playback.isPlaying ? "none" : "transform 0.1s ease-out",
                            pointerEvents: "none",
                          }}
                          muted={playback.isMuted || clip.muted}
                          playsInline
                          preload="auto"
                          onLoadedMetadata={(e) => {
                            e.currentTarget.volume = playback.volume;
                          }}
                          onError={(e) => {
                            console.error("Video load error:", clip.source_path, e);
                          }}
                        />
                      ) : (
                        <img
                          src={getVideoUrl(clip.source_path)}
                          alt={clip.name}
                          draggable={false}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            clipPath: `inset(${clip.crop_top ?? 0}% ${clip.crop_right ?? 0}% ${clip.crop_bottom ?? 0}% ${clip.crop_left ?? 0}%${clip.corner_radius ? ` round ${clip.corner_radius}px` : ""})`,
                            transform: combinedTransform,
                            transformOrigin: zoomTransformOrigin,
                            transition: playback.isPlaying ? "none" : "transform 0.1s ease-out",
                            pointerEvents: "none", // Allow clicks to pass through to parent for dragging
                          }}
                        />
                      )}
                    </div>
                  );
                });
              })()}

              {/* Safe zones overlay */}
              {canvas.showSafeZones && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-[10%] border border-dashed border-white/30" />
                  <div className="absolute inset-[5%] border border-dashed border-white/20" />
                </div>
              )}

              {/* Blur regions overlay */}
              {(() => {
                const showAtTime = playback.currentTimeMs;
                // Find all active blur clips at current time, with their track info
                const activeBlurClips = blurClips
                  .map(bc => {
                    const blurTrack = tracks.find(t => t.id === bc.track_id);
                    return { blurClip: bc, blurTrack };
                  })
                  .filter(({ blurTrack }) => {
                    if (!blurTrack || !blurTrack.visible) return false;
                    return true;
                  })
                  .filter(({ blurClip }) => {
                    return showAtTime >= blurClip.start_time_ms && showAtTime < blurClip.start_time_ms + blurClip.duration_ms;
                  });

                // For z-index: lower sort_order = top of timeline = should be on top (higher z-index)
                // Use same calculation as video clips so blur can layer properly WITH video clips
                const maxSortOrder = Math.max(...tracks.map(t => t.sort_order), 0);

                return activeBlurClips.map(({ blurClip, blurTrack }) => {
                  // z-index: invert sort_order so top of timeline = higher z-index
                  // Use same scale as video clips (maxSortOrder - sort_order + 1)
                  const zIndex = maxSortOrder - (blurTrack?.sort_order ?? 0) + 1;
                  // Calculate eased intensity
                  const clipTime = showAtTime - blurClip.start_time_ms;
                  const easeInDuration = blurClip.ease_in_duration_ms;
                  const easeOutDuration = blurClip.ease_out_duration_ms;
                  const easeOutStart = blurClip.duration_ms - easeOutDuration;

                  let intensity = blurClip.blur_intensity;
                  if (clipTime < easeInDuration) {
                    const progress = clipTime / easeInDuration;
                    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    intensity = blurClip.blur_intensity * eased;
                  } else if (clipTime >= easeOutStart) {
                    const progress = (clipTime - easeOutStart) / easeOutDuration;
                    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
                    intensity = blurClip.blur_intensity * (1 - eased);
                  }

                  // Calculate region position and size
                  const regionLeft = blurClip.region_x - blurClip.region_width / 2;
                  const regionTop = blurClip.region_y - blurClip.region_height / 2;
                  const cornerRadiusPercent = Math.min(blurClip.corner_radius, 50);
                  const borderRadius = cornerRadiusPercent >= 50
                    ? "50%"
                    : `${(cornerRadiusPercent / 50) * Math.min(blurClip.region_width, blurClip.region_height) / 2}%`;

                  const isSelected = canvas.selectedBlurClipId === blurClip.id;

                  return (
                    <div
                      key={blurClip.id}
                      className={`absolute pointer-events-none ${isSelected ? "ring-2 ring-[#EC4899]" : ""}`}
                      style={{
                        left: `${regionLeft}%`,
                        top: `${regionTop}%`,
                        width: `${blurClip.region_width}%`,
                        height: `${blurClip.region_height}%`,
                        borderRadius,
                        backdropFilter: `blur(${intensity * 0.2}px)`,
                        backgroundColor: `rgba(236, 72, 153, ${intensity * 0.003})`,
                        border: isSelected ? "none" : "1px dashed rgba(236, 72, 153, 0.5)",
                        zIndex,
                      }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Circle className="w-4 h-4 text-[#EC4899]" />
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              {/* No content placeholder */}
              {clips.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/50">
                    <Video className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Drag media to timeline</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="h-12 border-t border-[var(--border-default)] bg-[var(--surface-secondary)] flex items-center justify-center gap-4 px-4">
            <div className="flex items-center gap-1">
              <button
                onClick={() => seekTo(0)}
                className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Go to start (Home)"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => (playback.isPlaying ? pause() : play())}
                className="p-2 bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 rounded-full"
              >
                {playback.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>
              <button
                onClick={() => seekTo(timelineDuration)}
                className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Go to end (End)"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-[var(--text-primary)]">
                {formatTimeWithFrames(playback.currentTimeMs, demo.frame_rate)}
              </span>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span className="text-[var(--text-tertiary)]">
                {formatTimeWithFrames(timelineDuration, demo.frame_rate)}
              </span>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
              >
                {playback.isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={playback.isMuted ? 0 : playback.volume}
                onChange={handleVolumeChange}
                className="w-20 accent-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Inspector Panel */}
        {showInspector && (
          <aside
            className="flex-shrink-0 border-l border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col"
            style={{ width: inspectorPanelWidth }}
          >
            <div className="p-3 border-b border-[var(--border-default)]">
              <span className="font-medium text-[var(--text-primary)] text-sm">Inspector</span>
            </div>

            <div className="flex-1 overflow-auto p-3">
              {(() => {
                // Find the selected items - check they actually exist
                const selectedBlurClip = canvas.selectedBlurClipId
                  ? blurClips.find((bc) => bc.id === canvas.selectedBlurClipId)
                  : null;
                const selectedPanClip = canvas.selectedPanClipId
                  ? panClips.find((pc) => pc.id === canvas.selectedPanClipId)
                  : null;
                const selectedZoomClip = canvas.selectedZoomClipId
                  ? zoomClips.find((zc) => zc.id === canvas.selectedZoomClipId)
                  : null;
                const selectedClip = canvas.selectedClipId
                  ? clips.find((c) => c.id === canvas.selectedClipId)
                  : null;
                const selectedTrack = timeline.selectedTrackId
                  ? tracks.find((t) => t.id === timeline.selectedTrackId)
                  : null;

                if (selectedPanClip) {
                  return (
                    <PanClipInspector
                      panClip={selectedPanClip}
                      onUpdate={(updates) => updatePanClip(selectedPanClip.id, updates)}
                      onDelete={() => deletePanClip(selectedPanClip.id)}
                    />
                  );
                }
                if (selectedBlurClip) {
                  return (
                    <BlurClipInspector
                      blurClip={selectedBlurClip}
                      onUpdate={(updates) => updateBlurClip(selectedBlurClip.id, updates)}
                      onDelete={() => deleteBlurClip(selectedBlurClip.id)}
                    />
                  );
                }
                if (selectedZoomClip) {
                  return (
                    <ZoomClipInspector
                      zoomClip={selectedZoomClip}
                      onUpdate={(updates) => updateZoomClip(selectedZoomClip.id, updates)}
                      onDelete={() => deleteZoomClip(selectedZoomClip.id)}
                    />
                  );
                }
                if (selectedClip) {
                  return (
                    <ClipInspector
                      clip={selectedClip}
                      onUpdate={(updates) => updateClip(selectedClip.id, updates)}
                      onDelete={() => deleteClip(selectedClip.id)}
                      onDuplicate={() => duplicateClip(selectedClip.id)}
                      onSplit={() => splitClip(selectedClip.id, playback.currentTimeMs)}
                      onUnlink={() => {
                        if (selectedClip.linked_clip_id) {
                          // Unlink both clips from each other - but DON'T unmute the video
                          // Like DaVinci Resolve: unlink just means they can move independently
                          // The video stays muted, audio track is the only sound source
                          updateClip(selectedClip.id, { linked_clip_id: null });
                          updateClip(selectedClip.linked_clip_id, { linked_clip_id: null });
                        }
                      }}
                    />
                  );
                }
                if (selectedTrack) {
                  return (
                    <TrackInspector
                      track={selectedTrack}
                      onUpdate={(updates) => updateTrack(selectedTrack.id, updates)}
                      onDelete={() => deleteTrack(selectedTrack.id)}
                    />
                  );
                }
                // Default: show demo info inspector
                return (
                  <DemoInfoInspector
                    name={demo.name}
                    format={demo.format}
                    width={demo.width}
                    height={demo.height}
                    duration_ms={demo.duration_ms}
                    onUpdate={updateDemoInfo}
                  />
                );
              })()}
            </div>
          </aside>
        )}
      </div>

      {/* Timeline */}
      <div
        className="border-t border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col flex-shrink-0"
        style={{ height: expandedSections.timeline ? timelineHeight : 40 }}
      >
        {/* Resize handle - visible grip bar */}
        <div
          onMouseDown={() => expandedSections.timeline && setIsResizingTimeline(true)}
          className={`h-2 flex items-center justify-center border-b border-[var(--border-default)] ${
            expandedSections.timeline
              ? "cursor-ns-resize hover:bg-[var(--surface-hover)] group"
              : ""
          }`}
        >
          {expandedSections.timeline && (
            <GripHorizontal className="w-6 h-3 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]" />
          )}
        </div>

        {/* Timeline Header */}
        <div className="h-10 border-b border-[var(--border-default)] flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSection("timeline")}
              className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] flex items-center gap-1"
              title={expandedSections.timeline ? "Collapse timeline" : "Expand timeline"}
            >
              {expandedSections.timeline ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
            <span className="font-medium text-[var(--text-primary)] text-sm">Timeline</span>

            {/* Add Track Button */}
            <div className="relative">
              <button
                onClick={() => setShowAddTrackMenu(!showAddTrackMenu)}
                className="h-7 px-2 border border-[var(--border-default)] text-[var(--text-secondary)] text-sm flex items-center gap-1 hover:bg-[var(--surface-hover)]"
              >
                <Plus className="w-3 h-3" />
                Add Track
                <ChevronDown className="w-3 h-3" />
              </button>

              {showAddTrackMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setShowAddTrackMenu(false); setShowZoomTrackTargetMenu(false); setShowBlurTrackTargetMenu(false); setShowPanTrackTargetMenu(false); }} />
                  <div className="absolute top-full left-0 mt-1 w-40 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg z-20">
                    <button
                      onClick={() => handleAddTrack("video")}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    >
                      <Video className="w-4 h-4 text-[#3B82F6]" />
                      Video Track
                    </button>
                    <button
                      onClick={() => handleAddTrack("image")}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    >
                      <Image className="w-4 h-4 text-[#10B981]" />
                      Image Track
                    </button>
                    <button
                      onClick={() => handleAddTrack("audio")}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    >
                      <Music className="w-4 h-4 text-[#F59E0B]" />
                      Audio Track
                    </button>
                    <div className="border-t border-[var(--border-default)] my-1" />
                    <div className="relative">
                      <button
                        onClick={() => setShowZoomTrackTargetMenu(!showZoomTrackTargetMenu)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                      >
                        <ZoomIn className="w-4 h-4 text-[#A855F7]" />
                        Zoom Track
                        <ChevronRight className="w-3 h-3 ml-auto" />
                      </button>
                      {showZoomTrackTargetMenu && (
                        <div className="absolute left-full top-0 ml-1 w-48 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg z-30">
                          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border-default)]">
                            Select target track:
                          </div>
                          {currentDemo?.tracks
                            .filter(t => t.track_type === 'video' || t.track_type === 'image')
                            .map(track => (
                              <button
                                key={track.id}
                                onClick={() => handleAddTrack("zoom", track.id)}
                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                              >
                                {track.track_type === 'video' ? (
                                  <Video className="w-4 h-4 text-[#3B82F6]" />
                                ) : (
                                  <Image className="w-4 h-4 text-[#10B981]" />
                                )}
                                {track.name}
                              </button>
                            ))}
                          {currentDemo?.tracks.filter(t => t.track_type === 'video' || t.track_type === 'image').length === 0 && (
                            <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                              No video/image tracks
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowBlurTrackTargetMenu(!showBlurTrackTargetMenu)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                      >
                        <Circle className="w-4 h-4 text-[#EC4899]" />
                        Blur Track
                        <ChevronRight className="w-3 h-3 ml-auto" />
                      </button>
                      {showBlurTrackTargetMenu && (
                        <div className="absolute left-full top-0 ml-1 w-48 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg z-30">
                          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border-default)]">
                            Select target track:
                          </div>
                          {currentDemo?.tracks
                            .filter(t => t.track_type === 'video' || t.track_type === 'image')
                            .map(track => (
                              <button
                                key={track.id}
                                onClick={() => handleAddTrack("blur", track.id)}
                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                              >
                                {track.track_type === 'video' ? (
                                  <Video className="w-4 h-4 text-[#3B82F6]" />
                                ) : (
                                  <Image className="w-4 h-4 text-[#10B981]" />
                                )}
                                {track.name}
                              </button>
                            ))}
                          {currentDemo?.tracks.filter(t => t.track_type === 'video' || t.track_type === 'image').length === 0 && (
                            <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                              No video/image tracks
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowPanTrackTargetMenu(!showPanTrackTargetMenu)}
                        className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                      >
                        <Move className="w-4 h-4 text-[#14B8A6]" />
                        Pan Track
                        <ChevronRight className="w-3 h-3 ml-auto" />
                      </button>
                      {showPanTrackTargetMenu && (
                        <div className="absolute left-full top-0 ml-1 w-48 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg z-30">
                          <div className="px-3 py-1.5 text-xs text-[var(--text-secondary)] border-b border-[var(--border-default)]">
                            Select target track:
                          </div>
                          {currentDemo?.tracks
                            .filter(t => t.track_type === 'video' || t.track_type === 'image')
                            .map(track => (
                              <button
                                key={track.id}
                                onClick={() => handleAddTrack("pan", track.id)}
                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-hover)] text-[var(--text-primary)]"
                              >
                                {track.track_type === 'video' ? (
                                  <Video className="w-4 h-4 text-[#3B82F6]" />
                                ) : (
                                  <Image className="w-4 h-4 text-[#10B981]" />
                                )}
                                {track.name}
                              </button>
                            ))}
                          {currentDemo?.tracks.filter(t => t.track_type === 'video' || t.track_type === 'image').length === 0 && (
                            <div className="px-3 py-2 text-sm text-[var(--text-secondary)]">
                              No video/image tracks
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Snap toggle */}
            <button
              onClick={toggleSnap}
              className={`h-7 px-2 border text-sm flex items-center gap-1 ${
                timeline.snapEnabled
                  ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-secondary)]"
              } hover:bg-[var(--surface-hover)]`}
            >
              Snap
            </button>

            {/* Track height control */}
            <div className="flex items-center gap-1 border-r border-[var(--border-default)] pr-2 mr-2">
              <ChevronsUpDown className="w-3 h-3 text-[var(--text-tertiary)]" />
              <input
                type="range"
                min="24"
                max="80"
                value={trackHeight}
                onChange={(e) => setTrackHeight(Number(e.target.value))}
                className="w-16 h-1 accent-[var(--accent-interactive)]"
                title="Track height"
              />
            </div>

            {/* Timeline zoom */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTimelineZoom(Math.max(0.001, timeline.zoom * 0.5))}
                className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Zoom out (scroll to zoom)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] w-12 text-center">
                {timeline.zoom >= 0.1 ? `${Math.round(timeline.zoom * 100)}%` : `${(timeline.zoom * 100).toFixed(1)}%`}
              </span>
              <button
                onClick={() => setTimelineZoom(Math.min(10, timeline.zoom * 2))}
                className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Zoom in (scroll to zoom)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        {expandedSections.timeline && (
        <div ref={timelineContainerRef} className="flex-1 flex overflow-hidden">
          {/* Track Headers */}
          <div
            className="flex-shrink-0 border-r border-[var(--border-default)] overflow-y-auto relative"
            style={{ width: trackHeaderWidth }}
          >
            {/* Spacer to align with time ruler */}
            <div className="h-6 border-b border-[var(--border-default)] bg-[var(--surface-secondary)]" />

            {/* Resize handle */}
            <div
              onMouseDown={() => setIsResizingTrackHeader(true)}
              className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-[var(--accent-primary)] z-10"
            />

            {/* Background track header */}
            <div
              onClick={() => setShowBackgroundPicker(true)}
              className="px-2 border-b border-[var(--border-default)] flex items-center gap-2 bg-[var(--surface-primary)] cursor-pointer hover:bg-[var(--surface-hover)]"
              style={{ height: `${trackHeight}px` }}
            >
              <Lock className="w-3 h-3 text-[var(--text-tertiary)]" />
              <span className="text-[var(--text-body-sm)] text-[var(--text-secondary)]">
                Background
              </span>
            </div>

            {/* Track headers */}
            {[...tracks]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((track) => {
                const config = trackTypeConfig[track.track_type];
                const Icon = config.icon;
                return (
                  <div
                    key={track.id}
                    onClick={() => selectTrack(track.id)}
                    className={`px-2 border-b border-[var(--border-default)] flex items-center gap-2 cursor-pointer ${
                      timeline.selectedTrackId === track.id
                        ? "bg-[var(--surface-hover)]"
                        : "bg-[var(--surface-primary)] hover:bg-[var(--surface-hover)]"
                    }`}
                    style={{ height: `${trackHeight}px` }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); updateTrack(track.id, { visible: !track.visible }); }}
                      className="p-0.5 hover:bg-[var(--surface-active)]"
                    >
                      {track.visible ? (
                        <Eye className="w-3 h-3 text-[var(--text-secondary)]" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-[var(--text-tertiary)]" />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateTrack(track.id, { locked: !track.locked }); }}
                      className="p-0.5 hover:bg-[var(--surface-active)]"
                    >
                      {track.locked ? (
                        <Lock className="w-3 h-3 text-[var(--text-tertiary)]" />
                      ) : (
                        <Unlock className="w-3 h-3 text-[var(--text-secondary)]" />
                      )}
                    </button>
                    {/* Mute button for audio and video tracks */}
                    {(track.track_type === "audio" || track.track_type === "video") && (
                      <button
                        onClick={(e) => { e.stopPropagation(); updateTrack(track.id, { muted: !track.muted }); }}
                        className="p-0.5 hover:bg-[var(--surface-active)]"
                        title={track.muted ? "Unmute" : "Mute"}
                      >
                        {track.muted ? (
                          <VolumeX className="w-3 h-3 text-[var(--text-tertiary)]" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-[var(--text-secondary)]" />
                        )}
                      </button>
                    )}
                    <Icon className="w-3 h-3" style={{ color: config.color }} />
                    <span className="text-[var(--text-body-sm)] text-[var(--text-primary)] truncate flex-1">
                      {track.name}
                    </span>
                    {/* Add zoom clip button for zoom tracks */}
                    {track.track_type === "zoom" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addZoomClip({
                            track_id: track.id,
                            name: "Zoom",
                            start_time_ms: Math.round(playback.currentTimeMs),
                            duration_ms: 2000,
                            zoom_scale: 2.0,
                            zoom_center_x: 50,
                            zoom_center_y: 50,
                            ease_in_duration_ms: 300,
                            ease_out_duration_ms: 300,
                          });
                        }}
                        className="p-0.5 hover:bg-[var(--surface-active)] text-[#A855F7]"
                        title="Add zoom clip at playhead"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    {/* Add blur clip button for blur tracks */}
                    {track.track_type === "blur" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addBlurClip({
                            track_id: track.id,
                            name: "Blur",
                            start_time_ms: Math.round(playback.currentTimeMs),
                            duration_ms: 2000,
                          });
                        }}
                        className="p-0.5 hover:bg-[var(--surface-active)] text-[#EC4899]"
                        title="Add blur clip at playhead"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    {/* Add pan clip button for pan tracks */}
                    {track.track_type === "pan" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addPanClip({
                            track_id: track.id,
                            name: "Pan",
                            start_time_ms: Math.round(playback.currentTimeMs),
                            duration_ms: 2000,
                          });
                        }}
                        className="p-0.5 hover:bg-[var(--surface-active)] text-[#14B8A6]"
                        title="Add pan clip at playhead"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                    {/* Track reorder buttons */}
                    <div className="flex flex-col ml-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); moveTrackUp(track.id); }}
                        className="p-0.5 hover:bg-[var(--surface-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                        title="Move track up"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); moveTrackDown(track.id); }}
                        className="p-0.5 hover:bg-[var(--surface-active)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                        title="Move track down"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

            {/* Add track hint if no tracks */}
            {tracks.length === 0 && (
              <div className={`h-20 px-2 border-b border-dashed flex flex-col items-center justify-center gap-2 ${
                draggedAsset
                  ? "border-[var(--accent-interactive)] bg-[var(--accent-interactive)]/10"
                  : "border-[var(--border-default)] bg-[var(--surface-primary)]"
              }`}>
                {draggedAsset ? (
                  <span className="text-[var(--text-caption)] text-[var(--accent-interactive)]">
                    Drop here to create track
                  </span>
                ) : (
                  <>
                    <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                      Add a track to get started
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAddTrack("video")}
                        className="px-2 py-1 text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] flex items-center gap-1"
                      >
                        <Video className="w-3 h-3 text-[#3B82F6]" />
                        Video
                      </button>
                      <button
                        onClick={() => handleAddTrack("image")}
                        className="px-2 py-1 text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] flex items-center gap-1"
                      >
                        <Image className="w-3 h-3 text-[#10B981]" />
                        Image
                      </button>
                      <button
                        onClick={() => handleAddTrack("audio")}
                        className="px-2 py-1 text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] flex items-center gap-1"
                      >
                        <Music className="w-3 h-3 text-[#F59E0B]" />
                        Audio
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Timeline Tracks */}
          <div
            ref={timelineContainerRef}
            className={`flex-1 overflow-auto relative ${draggedAsset ? "bg-[var(--surface-hover)]/30" : ""}`}
            onWheel={(e) => {
              // Trackpad pinch-to-zoom (sends ctrlKey=true on macOS) or Ctrl/Cmd + scroll
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                // Use smaller factor for smoother trackpad zooming
                const sensitivity = Math.abs(e.deltaY) < 10 ? 0.02 : 0.1;
                const zoomDelta = -e.deltaY * sensitivity;
                const newZoom = Math.max(0.001, Math.min(10, timeline.zoom * (1 + zoomDelta)));
                setTimelineZoom(newZoom);
              }
            }}
          >
            <div
              ref={timelineRef}
              onClick={handleTimelineClick}
              className="min-h-full"
              style={{ width: `${Math.max(100, timelineDuration * timeline.zoom * 0.1)}px` }}
            >
              {/* Time ruler - adaptive based on zoom level */}
              <div className="h-6 border-b border-[var(--border-default)] sticky top-0 bg-[var(--surface-secondary)] z-10">
                <div className="h-full relative">
                  {/* Determine tick interval based on zoom level */}
                  {(() => {
                    // Calculate appropriate tick interval based on zoom
                    // Supports zoom from 0.001 (0.1%) to 10 (1000%)
                    let majorInterval: number;
                    let minorDivisions: number;
                    if (timeline.zoom >= 5) {
                      majorInterval = 1000; // 1 second
                      minorDivisions = 10; // Show 100ms ticks
                    } else if (timeline.zoom >= 2) {
                      majorInterval = 1000; // 1 second
                      minorDivisions = 4; // Show 250ms ticks
                    } else if (timeline.zoom >= 1) {
                      majorInterval = 2000; // 2 seconds
                      minorDivisions = 4;
                    } else if (timeline.zoom >= 0.5) {
                      majorInterval = 5000; // 5 seconds
                      minorDivisions = 5;
                    } else if (timeline.zoom >= 0.25) {
                      majorInterval = 10000; // 10 seconds
                      minorDivisions = 5;
                    } else if (timeline.zoom >= 0.1) {
                      majorInterval = 30000; // 30 seconds
                      minorDivisions = 6;
                    } else if (timeline.zoom >= 0.05) {
                      majorInterval = 60000; // 1 minute
                      minorDivisions = 6;
                    } else if (timeline.zoom >= 0.02) {
                      majorInterval = 120000; // 2 minutes
                      minorDivisions = 4;
                    } else if (timeline.zoom >= 0.01) {
                      majorInterval = 300000; // 5 minutes
                      minorDivisions = 5;
                    } else if (timeline.zoom >= 0.005) {
                      majorInterval = 600000; // 10 minutes
                      minorDivisions = 5;
                    } else if (timeline.zoom >= 0.002) {
                      majorInterval = 1800000; // 30 minutes
                      minorDivisions = 6;
                    } else {
                      majorInterval = 3600000; // 1 hour
                      minorDivisions = 6;
                    }
                    const minorInterval = majorInterval / minorDivisions;
                    const numTicks = Math.ceil(timelineDuration / minorInterval) + 1;

                    return Array.from({ length: numTicks }).map((_, i) => {
                      const timeMs = i * minorInterval;
                      const isMajor = timeMs % majorInterval === 0;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 h-full flex flex-col justify-end"
                          style={{ left: `${timeMs * timeline.zoom * 0.1}px` }}
                        >
                          <div className={`w-px ${isMajor ? "h-3 bg-[var(--border-strong)]" : "h-2 bg-[var(--border-default)]"}`} />
                          {isMajor && (
                            <span className="text-[10px] text-[var(--text-tertiary)] ml-1 whitespace-nowrap">
                              {formatTime(timeMs)}
                            </span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Track rows */}
              <div className="relative">
                {/* Background track */}
                <div
                  className="border-b border-[var(--border-default)] relative"
                  style={{ height: `${trackHeight}px` }}
                >
                  <div
                    className="h-full opacity-60 relative group"
                    style={{
                      background: background?.background_type === "gradient" && background.gradient_stops
                        ? `linear-gradient(90deg, ${JSON.parse(background.gradient_stops).map((s: {color: string}) => s.color).join(", ")})`
                        : background?.color || "linear-gradient(90deg, #1a1a2e, #4a4a8a)",
                      width: `${demo.duration_ms * timeline.zoom * 0.1}px`,
                    }}
                  >
                    {/* Background name */}
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-[10px] text-white/80 truncate">Background ({formatTime(demo.duration_ms)})</span>
                    </div>
                    {/* Trim handle (right edge only - trims demo duration) */}
                    <div
                      onMouseDown={handleBackgroundTrimStart}
                      className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize z-10 bg-white/0 hover:bg-white/40 transition-colors"
                    >
                      <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/80 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Video/Image/Audio/Zoom tracks */}
                {[...tracks]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((track) => (
                    <div
                      key={track.id}
                      className={`border-b border-[var(--border-default)] relative ${
                        dragOverTrackId === track.id ? "bg-[var(--accent-interactive)]/20" : ""
                      } ${track.track_type === "zoom" || track.track_type === "blur" || track.track_type === "pan" ? "cursor-crosshair" : ""}`}
                      style={{ height: `${trackHeight}px` }}
                      onClick={track.track_type === "zoom" ? (e) => handleZoomTrackClick(e, track.id) : track.track_type === "blur" ? (e) => handleBlurTrackClick(e, track.id) : track.track_type === "pan" ? (e) => handlePanTrackClick(e, track.id) : undefined}
                    >
                      {/* Drop indicator */}
                      {dragOverTrackId === track.id && dragOverTime !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[var(--accent-interactive)] z-10"
                          style={{ left: `${dragOverTime * timeline.zoom * 0.1}px` }}
                        />
                      )}

                      {/* Clips on this track - regular clips for non-zoom/blur/pan tracks */}
                      {track.track_type !== "zoom" && track.track_type !== "blur" && track.track_type !== "pan" && clips
                        .filter((c) => c.track_id === track.id)
                        .map((clip) => {
                          const config = trackTypeConfig[track.track_type];
                          const clipWidth = clip.duration_ms * timeline.zoom * 0.1;
                          return (
                            <div
                              key={clip.id}
                              onMouseDown={(e) => !track.locked && handleClipDragStart(e, clip)}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectClip(clip.id);
                              }}
                              className={`absolute top-1 bottom-1 cursor-pointer group ${
                                canvas.selectedClipId === clip.id
                                  ? "ring-2 ring-white"
                                  : ""
                              }`}
                              style={{
                                left: `${clip.start_time_ms * timeline.zoom * 0.1}px`,
                                width: `${clipWidth}px`,
                                backgroundColor: config.color,
                                opacity: track.visible ? 0.9 : 0.4,
                              }}
                            >
                              {/* Trim handles - show on hover or when selected */}
                              {!track.locked && (
                                <>
                                  <div
                                    onMouseDown={(e) => handleTrimStart(e, clip.id, "start")}
                                    className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedClipId === clip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                  <div
                                    onMouseDown={(e) => handleTrimStart(e, clip.id, "end")}
                                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedClipId === clip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                </>
                              )}

                              {/* Clip content */}
                              <div className="px-2 py-1 text-[10px] text-white truncate h-full flex items-center">
                                {clip.name}
                              </div>
                            </div>
                          );
                        })}

                      {/* Zoom clips on zoom tracks */}
                      {track.track_type === "zoom" && zoomClips
                        .filter((zc) => zc.track_id === track.id)
                        .map((zoomClip) => {
                          const config = trackTypeConfig["zoom"];
                          const clipWidth = zoomClip.duration_ms * timeline.zoom * 0.1;
                          return (
                            <div
                              key={zoomClip.id}
                              onMouseDown={(e) => !track.locked && handleZoomClipDragStart(e, zoomClip)}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectZoomClip(zoomClip.id);
                              }}
                              className={`absolute top-1 bottom-1 cursor-pointer group ${
                                canvas.selectedZoomClipId === zoomClip.id
                                  ? "ring-2 ring-white"
                                  : ""
                              }`}
                              style={{
                                left: `${zoomClip.start_time_ms * timeline.zoom * 0.1}px`,
                                width: `${clipWidth}px`,
                                backgroundColor: config.color,
                                opacity: track.visible ? 0.9 : 0.4,
                              }}
                            >
                              {/* Trim handles for zoom clips */}
                              {!track.locked && (
                                <>
                                  <div
                                    onMouseDown={(e) => handleZoomClipTrimStart(e, zoomClip.id, "start")}
                                    className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedZoomClipId === zoomClip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                  <div
                                    onMouseDown={(e) => handleZoomClipTrimStart(e, zoomClip.id, "end")}
                                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedZoomClipId === zoomClip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                </>
                              )}

                              {/* Zoom clip content - shows scale */}
                              <div className="px-2 py-1 text-[10px] text-white truncate h-full flex items-center gap-1">
                                <ZoomIn className="w-3 h-3" />
                                {zoomClip.zoom_scale}x
                              </div>
                            </div>
                          );
                        })}

                      {/* Blur clips on blur tracks */}
                      {track.track_type === "blur" && blurClips
                        .filter((bc) => bc.track_id === track.id)
                        .map((blurClip) => {
                          const config = trackTypeConfig["blur"];
                          const clipWidth = blurClip.duration_ms * timeline.zoom * 0.1;
                          return (
                            <div
                              key={blurClip.id}
                              onMouseDown={(e) => !track.locked && handleBlurClipDragStart(e, blurClip)}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectBlurClip(blurClip.id);
                              }}
                              className={`absolute top-1 bottom-1 cursor-pointer group ${
                                canvas.selectedBlurClipId === blurClip.id
                                  ? "ring-2 ring-white"
                                  : ""
                              }`}
                              style={{
                                left: `${blurClip.start_time_ms * timeline.zoom * 0.1}px`,
                                width: `${clipWidth}px`,
                                backgroundColor: config.color,
                                opacity: track.visible ? 0.9 : 0.4,
                              }}
                            >
                              {/* Trim handles for blur clips */}
                              {!track.locked && (
                                <>
                                  <div
                                    onMouseDown={(e) => handleBlurClipTrimStart(e, blurClip.id, "start")}
                                    className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedBlurClipId === blurClip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                  <div
                                    onMouseDown={(e) => handleBlurClipTrimStart(e, blurClip.id, "end")}
                                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedBlurClipId === blurClip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                </>
                              )}

                              {/* Blur clip content - shows intensity */}
                              <div className="px-2 py-1 text-[10px] text-white truncate h-full flex items-center gap-1">
                                <Circle className="w-3 h-3" />
                                {blurClip.blur_intensity}%
                              </div>
                            </div>
                          );
                        })}

                      {/* Pan clips on pan tracks */}
                      {track.track_type === "pan" && panClips
                        .filter((pc) => pc.track_id === track.id)
                        .map((panClip) => {
                          const config = trackTypeConfig["pan"];
                          const clipWidth = panClip.duration_ms * timeline.zoom * 0.1;
                          return (
                            <div
                              key={panClip.id}
                              onMouseDown={(e) => !track.locked && handlePanClipDragStart(e, panClip)}
                              onClick={(e) => {
                                e.stopPropagation();
                                selectPanClip(panClip.id);
                              }}
                              className={`absolute top-1 bottom-1 cursor-pointer group ${
                                canvas.selectedPanClipId === panClip.id
                                  ? "ring-2 ring-white"
                                  : ""
                              }`}
                              style={{
                                left: `${panClip.start_time_ms * timeline.zoom * 0.1}px`,
                                width: `${clipWidth}px`,
                                backgroundColor: config.color,
                                opacity: track.visible ? 0.9 : 0.4,
                              }}
                            >
                              {/* Trim handles for pan clips */}
                              {!track.locked && (
                                <>
                                  <div
                                    onMouseDown={(e) => handlePanClipTrimStart(e, panClip.id, "start")}
                                    className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedPanClipId === panClip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                  <div
                                    onMouseDown={(e) => handlePanClipTrimStart(e, panClip.id, "end")}
                                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10 transition-opacity ${
                                      canvas.selectedPanClipId === panClip.id
                                        ? "bg-white/40"
                                        : "bg-white/0 group-hover:bg-white/20"
                                    }`}
                                  >
                                    <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-3 bg-white/60 rounded-full opacity-0 group-hover:opacity-100" />
                                  </div>
                                </>
                              )}

                              {/* Pan clip content - shows start/end positions */}
                              <div className="px-2 py-1 text-[10px] text-white truncate h-full flex items-center gap-1">
                                <Move className="w-3 h-3" />
                                {Math.round(panClip.start_x)},{Math.round(panClip.start_y)} → {Math.round(panClip.end_x)},{Math.round(panClip.end_y)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[var(--text-primary)] z-20"
                  style={{
                    left: `${playback.currentTimeMs * timeline.zoom * 0.1}px`,
                  }}
                >
                  {/* Draggable playhead handle */}
                  <div
                    onMouseDown={handlePlayheadMouseDown}
                    className="absolute -top-1 -left-2 w-4 h-3 bg-[var(--text-primary)] cursor-ew-resize hover:bg-white"
                    style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Drag and drop overlay - only show for external file drags, not internal asset drags */}
      {isDraggingFile && !draggedAsset && (
        <div className="fixed inset-0 bg-[var(--accent-interactive)]/20 border-2 border-dashed border-[var(--accent-interactive)] z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-[var(--surface-secondary)] p-6 shadow-xl">
            <Upload className="w-12 h-12 text-[var(--accent-interactive)] mx-auto mb-3" />
            <p className="text-[var(--text-primary)] font-medium text-center">Drop files to import</p>
            <p className="text-[var(--text-secondary)] text-sm text-center mt-1">Videos, images, or audio files</p>
          </div>
        </div>
      )}

      {/* Background Picker Modal */}
      {showBackgroundPicker && (
        <BackgroundPicker
          onClose={() => setShowBackgroundPicker(false)}
          onSelectGradient={handleSelectGradient}
          onSelectSolid={handleSelectSolid}
          onSelectImage={handleSelectImage}
        />
      )}

      {/* App Media Picker Modal */}
      {showAppMediaPicker && (
        <AppMediaPicker
          recordings={recordings}
          screenshots={screenshots}
          onClose={() => setShowAppMediaPicker(false)}
          onSelectRecording={handleAddRecording}
          onSelectScreenshot={handleAddScreenshot}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          demo={demo}
          background={background}
          tracks={tracks}
          clips={clips}
          zoomClips={zoomClips}
          blurClips={blurClips}
          panClips={panClips}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Drag indicator - follows cursor when dragging asset */}
      {draggedAsset && dragMousePos && (
        <div
          className="fixed pointer-events-none z-50 bg-[var(--surface-secondary)] border border-[var(--accent-interactive)] shadow-lg px-3 py-2 rounded"
          style={{
            left: dragMousePos.x + 12,
            top: dragMousePos.y + 12,
          }}
        >
          <div className="flex items-center gap-2">
            {draggedAsset.asset_type === "video" && <Video className="w-4 h-4 text-[#3B82F6]" />}
            {draggedAsset.asset_type === "image" && <Image className="w-4 h-4 text-[#10B981]" />}
            {draggedAsset.asset_type === "audio" && <Music className="w-4 h-4 text-[#F59E0B]" />}
            <span className="text-[var(--text-body-sm)] text-[var(--text-primary)] max-w-[150px] truncate">
              {draggedAsset.name}
            </span>
          </div>
          {dragOverTrackId && (
            <div className="text-[var(--text-caption)] text-[var(--accent-interactive)] mt-1">
              Drop to add clip
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  defaultExpanded = false,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-[var(--border-default)] pb-3 mb-3 last:border-b-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 text-left hover:bg-[var(--surface-hover)] -mx-1 px-1 py-1 rounded transition-colors group"
      >
        <div className={`p-0.5 rounded transition-colors ${isExpanded ? "bg-[var(--surface-active)]" : "bg-transparent group-hover:bg-[var(--surface-active)]"}`}>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
          ) : (
            <ChevronRight className="w-3 h-3 text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]" />
          )}
        </div>
        <h4 className="text-[var(--text-caption)] text-[var(--text-secondary)] uppercase tracking-wide flex-1">
          {title}
        </h4>
        <ChevronsUpDown className="w-3 h-3 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100" />
      </button>
      {isExpanded && <div className="mt-2 space-y-2 pl-1">{children}</div>}
    </div>
  );
}

// Clip Inspector Component
function ClipInspector({
  clip,
  onUpdate,
  onDelete,
  onDuplicate,
  onSplit,
  onUnlink,
}: {
  clip: DemoClip;
  onUpdate: (updates: Partial<DemoClip>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSplit: () => void;
  onUnlink?: () => void;
}) {
  if (!clip) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1">{clip.name}</h3>
        <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
          {clip.source_type} • {formatTime(clip.duration_ms)}
          {clip.linked_clip_id && " • Linked"}
        </p>
      </div>

      {/* Linked clip indicator and unlink button */}
      {clip.linked_clip_id && onUnlink && (
        <div className="flex items-center gap-2 p-2 bg-[var(--surface-primary)] border border-[var(--border-default)]">
          <Link2 className="w-4 h-4 text-[var(--accent-interactive)]" />
          <span className="text-[var(--text-body-sm)] text-[var(--text-secondary)] flex-1">
            {clip.source_type === "video" ? "Linked to audio" : "Linked to video"}
          </span>
          <button
            onClick={onUnlink}
            className="px-2 py-1 text-xs border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            title="Unlink clips"
          >
            Unlink
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 pb-3 border-b border-[var(--border-default)]">
        <button
          onClick={onSplit}
          className="flex-1 h-8 border border-[var(--border-default)] text-[var(--text-secondary)] text-sm flex items-center justify-center gap-1 hover:bg-[var(--surface-hover)]"
          title="Split at playhead (S)"
        >
          <Scissors className="w-3 h-3" />
          Split
        </button>
        <button
          onClick={onDuplicate}
          className="flex-1 h-8 border border-[var(--border-default)] text-[var(--text-secondary)] text-sm flex items-center justify-center gap-1 hover:bg-[var(--surface-hover)]"
          title="Duplicate (⌘D)"
        >
          Duplicate
        </button>
        <button
          onClick={onDelete}
          className="h-8 px-2 border border-[var(--accent-error)] text-[var(--accent-error)] text-sm flex items-center justify-center hover:bg-[var(--status-error-bg)]"
          title="Delete (Delete)"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Timing */}
      <CollapsibleSection title="Timing" defaultExpanded={true}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Start</label>
            <input
              type="text"
              value={formatTime(clip.start_time_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Duration</label>
            <input
              type="text"
              value={formatTime(clip.duration_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Transform (only for video/image) */}
      {clip.source_type !== "audio" && (
        <CollapsibleSection title="Transform" defaultExpanded={true}>
          <div>
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Scale</label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.01"
              value={clip.scale ?? 1}
              onChange={(e) => onUpdate({ scale: parseFloat(e.target.value) })}
              className="w-full accent-[var(--text-primary)]"
            />
            <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
              {Math.round((clip.scale ?? 1) * 100)}%
            </span>
          </div>
        </CollapsibleSection>
      )}

      {/* Crop (only for video/image) */}
      {clip.source_type !== "audio" && (
        <CollapsibleSection title="Crop" defaultExpanded={false}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Top</label>
              <input
                type="range"
                min="0"
                max="50"
                value={clip.crop_top ?? 0}
                onChange={(e) => onUpdate({ crop_top: parseInt(e.target.value) })}
                className="w-full accent-[var(--text-primary)]"
              />
              <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                {clip.crop_top ?? 0}%
              </span>
            </div>
            <div>
              <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Bottom</label>
              <input
                type="range"
                min="0"
                max="50"
                value={clip.crop_bottom ?? 0}
                onChange={(e) => onUpdate({ crop_bottom: parseInt(e.target.value) })}
                className="w-full accent-[var(--text-primary)]"
              />
              <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                {clip.crop_bottom ?? 0}%
              </span>
            </div>
            <div>
              <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Left</label>
              <input
                type="range"
                min="0"
                max="50"
                value={clip.crop_left ?? 0}
                onChange={(e) => onUpdate({ crop_left: parseInt(e.target.value) })}
                className="w-full accent-[var(--text-primary)]"
              />
              <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                {clip.crop_left ?? 0}%
              </span>
            </div>
            <div>
              <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Right</label>
              <input
                type="range"
                min="0"
                max="50"
                value={clip.crop_right ?? 0}
                onChange={(e) => onUpdate({ crop_right: parseInt(e.target.value) })}
                className="w-full accent-[var(--text-primary)]"
              />
              <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                {clip.crop_right ?? 0}%
              </span>
            </div>
          </div>
          {(clip.crop_top || clip.crop_bottom || clip.crop_left || clip.crop_right) ? (
            <button
              onClick={() => onUpdate({ crop_top: 0, crop_bottom: 0, crop_left: 0, crop_right: 0 })}
              className="w-full mt-2 h-7 border border-[var(--border-default)] text-[var(--text-secondary)] text-xs hover:bg-[var(--surface-hover)]"
            >
              Reset Crop
            </button>
          ) : null}
        </CollapsibleSection>
      )}

      {/* Appearance (only for video/image) */}
      {clip.source_type !== "audio" && (
        <CollapsibleSection title="Appearance" defaultExpanded={true}>
          <div>
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
              Corner Radius
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={clip.corner_radius ?? 0}
              onChange={(e) => onUpdate({ corner_radius: parseInt(e.target.value) })}
              className="w-full accent-[var(--text-primary)]"
            />
            <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
              {clip.corner_radius ?? 0}px
            </span>
          </div>
          <div>
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={clip.opacity ?? 1}
              onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-[var(--text-primary)]"
            />
            <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
              {Math.round((clip.opacity ?? 1) * 100)}%
            </span>
          </div>
        </CollapsibleSection>
      )}

      {/* Shadow (only for video/image) */}
      {clip.source_type !== "audio" && (
        <CollapsibleSection title="Shadow" defaultExpanded={false}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">Enabled</span>
            <button
              onClick={() => onUpdate({ shadow_enabled: !clip.shadow_enabled })}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                clip.shadow_enabled ? "bg-[var(--text-primary)]" : "bg-[var(--surface-active)]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  clip.shadow_enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {clip.shadow_enabled && (
            <>
              <div>
                <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Blur</label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={clip.shadow_blur ?? 20}
                  onChange={(e) => onUpdate({ shadow_blur: parseInt(e.target.value) })}
                  className="w-full accent-[var(--text-primary)]"
                />
                <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                  {clip.shadow_blur ?? 20}px
                </span>
              </div>
              <div>
                <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={clip.shadow_opacity ?? 0.25}
                  onChange={(e) => onUpdate({ shadow_opacity: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--text-primary)]"
                />
                <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                  {Math.round((clip.shadow_opacity ?? 0.25) * 100)}%
                </span>
              </div>
            </>
          )}
        </CollapsibleSection>
      )}

      {/* Audio (only for video/audio) */}
      {clip.source_type !== "image" && (
        <CollapsibleSection title="Audio" defaultExpanded={true}>
          <div>
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Volume</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={clip.volume ?? 1}
              onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
              className="w-full accent-[var(--text-primary)]"
            />
            <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
              {Math.round((clip.volume ?? 1) * 100)}%
            </span>
          </div>
        </CollapsibleSection>
      )}

      {/* Zoom Effect (only for video/image) */}
      {clip.source_type !== "audio" && (
        <CollapsibleSection title="Zoom Effect" defaultExpanded={false}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">Enabled</span>
            <button
              onClick={() => onUpdate({
                zoom_enabled: !clip.zoom_enabled,
                // Set defaults when enabling
                ...((!clip.zoom_enabled) ? {
                  zoom_scale: 2,
                  zoom_center_x: 50,
                  zoom_center_y: 50,
                  zoom_in_start_ms: 0,
                  zoom_in_duration_ms: 500,
                  zoom_out_start_ms: Math.max(0, clip.duration_ms - 500),
                  zoom_out_duration_ms: 500,
                } : {})
              })}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                clip.zoom_enabled ? "bg-[var(--text-primary)]" : "bg-[var(--surface-active)]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  clip.zoom_enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          {clip.zoom_enabled && (
            <>
              <div>
                <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Zoom Scale</label>
                <input
                  type="range"
                  min="1.1"
                  max="4"
                  step="0.1"
                  value={clip.zoom_scale ?? 2}
                  onChange={(e) => onUpdate({ zoom_scale: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--text-primary)]"
                />
                <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                  {((clip.zoom_scale ?? 2) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Center X</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={clip.zoom_center_x ?? 50}
                    onChange={(e) => onUpdate({ zoom_center_x: parseInt(e.target.value) })}
                    className="w-full accent-[var(--text-primary)]"
                  />
                  <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                    {clip.zoom_center_x ?? 50}%
                  </span>
                </div>
                <div>
                  <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Center Y</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={clip.zoom_center_y ?? 50}
                    onChange={(e) => onUpdate({ zoom_center_y: parseInt(e.target.value) })}
                    className="w-full accent-[var(--text-primary)]"
                  />
                  <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
                    {clip.zoom_center_y ?? 50}%
                  </span>
                </div>
              </div>
              <div className="border-t border-[var(--border-default)] pt-2 mt-2">
                <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Zoom In</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Start (ms)</label>
                    <input
                      type="number"
                      min="0"
                      max={clip.duration_ms}
                      value={clip.zoom_in_start_ms ?? 0}
                      onChange={(e) => onUpdate({ zoom_in_start_ms: parseInt(e.target.value) || 0 })}
                      className="w-full h-7 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Duration (ms)</label>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      value={clip.zoom_in_duration_ms ?? 500}
                      onChange={(e) => onUpdate({ zoom_in_duration_ms: parseInt(e.target.value) || 100 })}
                      className="w-full h-7 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--border-default)] pt-2 mt-2">
                <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Zoom Out</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div>
                    <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Start (ms)</label>
                    <input
                      type="number"
                      min="0"
                      max={clip.duration_ms}
                      value={clip.zoom_out_start_ms ?? Math.max(0, clip.duration_ms - 500)}
                      onChange={(e) => onUpdate({ zoom_out_start_ms: parseInt(e.target.value) || 0 })}
                      className="w-full h-7 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Duration (ms)</label>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      value={clip.zoom_out_duration_ms ?? 500}
                      onChange={(e) => onUpdate({ zoom_out_duration_ms: parseInt(e.target.value) || 100 })}
                      className="w-full h-7 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}

// Track Inspector Component
function TrackInspector({
  track,
  onUpdate,
  onDelete,
}: {
  track: DemoTrack;
  onUpdate: (updates: Partial<DemoTrack>) => void;
  onDelete: () => void;
}) {
  if (!track) return null;

  const config = trackTypeConfig[track.track_type];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-default)]">
        <div className="p-2 rounded" style={{ backgroundColor: `${config.color}20` }}>
          <config.icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={track.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full font-medium text-[var(--text-primary)] text-sm bg-transparent border-none focus:outline-none"
          />
          <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
            {config.label} Track
          </p>
        </div>
      </div>

      <CollapsibleSection title="Properties" defaultExpanded={true}>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-body-sm)] text-[var(--text-secondary)]">Visible</span>
          <button
            onClick={() => onUpdate({ visible: !track.visible })}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              track.visible ? "bg-[var(--text-primary)]" : "bg-[var(--surface-active)]"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                track.visible ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[var(--text-body-sm)] text-[var(--text-secondary)]">Locked</span>
          <button
            onClick={() => onUpdate({ locked: !track.locked })}
            className={`w-10 h-5 rounded-full relative transition-colors ${
              track.locked ? "bg-[var(--text-primary)]" : "bg-[var(--surface-active)]"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                track.locked ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        {track.track_type === "audio" && (
          <div>
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Track Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume ?? 1}
              onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
              className="w-full accent-[var(--text-primary)]"
            />
          </div>
        )}
      </CollapsibleSection>

      <button
        onClick={onDelete}
        className="w-full h-8 border border-[var(--accent-error)] text-[var(--accent-error)] text-sm flex items-center justify-center gap-2 hover:bg-[var(--status-error-bg)]"
      >
        <Trash2 className="w-3 h-3" />
        Delete Track
      </button>
    </div>
  );
}

// Zoom Clip Inspector Component
function ZoomClipInspector({
  zoomClip,
  onUpdate,
  onDelete,
}: {
  zoomClip: DemoZoomClip;
  onUpdate: (updates: Partial<DemoZoomClip>) => void;
  onDelete: () => void;
}) {
  if (!zoomClip) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1 flex items-center gap-2">
          <ZoomIn className="w-4 h-4 text-[#A855F7]" />
          Zoom Effect
        </h3>
        <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
          {formatTime(zoomClip.duration_ms)}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 pb-3 border-b border-[var(--border-default)]">
        <button
          onClick={onDelete}
          className="flex-1 h-8 border border-[var(--accent-error)] text-[var(--accent-error)] text-sm flex items-center justify-center gap-1 hover:bg-[var(--status-error-bg)]"
          title="Delete (Delete)"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>

      {/* Timing */}
      <CollapsibleSection title="Timing" defaultExpanded={true}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Start</label>
            <input
              type="text"
              value={formatTime(zoomClip.start_time_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Duration</label>
            <input
              type="text"
              value={formatTime(zoomClip.duration_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Zoom Settings */}
      <CollapsibleSection title="Zoom" defaultExpanded={true}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Scale</label>
          <input
            type="range"
            min="1"
            max="4"
            step="0.1"
            value={zoomClip.zoom_scale}
            onChange={(e) => onUpdate({ zoom_scale: parseFloat(e.target.value) })}
            className="w-full accent-[#A855F7]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {zoomClip.zoom_scale.toFixed(1)}x ({Math.round(zoomClip.zoom_scale * 100)}%)
          </span>
        </div>
      </CollapsibleSection>

      {/* Focus Point */}
      <CollapsibleSection title="Focus Point" defaultExpanded={true}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Horizontal (X)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={zoomClip.zoom_center_x}
            onChange={(e) => onUpdate({ zoom_center_x: parseInt(e.target.value) })}
            className="w-full accent-[#A855F7]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {zoomClip.zoom_center_x}%
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Vertical (Y)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={zoomClip.zoom_center_y}
            onChange={(e) => onUpdate({ zoom_center_y: parseInt(e.target.value) })}
            className="w-full accent-[#A855F7]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {zoomClip.zoom_center_y}%
          </span>
        </div>
        <button
          onClick={() => onUpdate({ zoom_center_x: 50, zoom_center_y: 50 })}
          className="w-full mt-2 h-7 border border-[var(--border-default)] text-[var(--text-secondary)] text-xs hover:bg-[var(--surface-hover)]"
        >
          Center Focus Point
        </button>
      </CollapsibleSection>

      {/* Easing */}
      <CollapsibleSection title="Easing" defaultExpanded={false}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Ease In</label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={zoomClip.ease_in_duration_ms}
            onChange={(e) => onUpdate({ ease_in_duration_ms: parseInt(e.target.value) })}
            className="w-full accent-[#A855F7]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {zoomClip.ease_in_duration_ms}ms
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Ease Out</label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={zoomClip.ease_out_duration_ms}
            onChange={(e) => onUpdate({ ease_out_duration_ms: parseInt(e.target.value) })}
            className="w-full accent-[#A855F7]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {zoomClip.ease_out_duration_ms}ms
          </span>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// Blur Clip Inspector Component
function BlurClipInspector({
  blurClip,
  onUpdate,
  onDelete,
}: {
  blurClip: DemoBlurClip;
  onUpdate: (updates: Partial<DemoBlurClip>) => void;
  onDelete: () => void;
}) {
  if (!blurClip) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1 flex items-center gap-2">
          <Circle className="w-4 h-4 text-[#EC4899]" />
          Blur Effect
        </h3>
        <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
          {formatTime(blurClip.duration_ms)}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 pb-3 border-b border-[var(--border-default)]">
        <button
          onClick={onDelete}
          className="flex-1 h-8 border border-[var(--accent-error)] text-[var(--accent-error)] text-sm flex items-center justify-center gap-1 hover:bg-[var(--status-error-bg)]"
          title="Delete (Delete)"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>

      {/* Timing */}
      <CollapsibleSection title="Timing" defaultExpanded={true}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Start</label>
            <input
              type="text"
              value={formatTime(blurClip.start_time_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Duration</label>
            <input
              type="text"
              value={formatTime(blurClip.duration_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Blur Settings */}
      <CollapsibleSection title="Blur" defaultExpanded={true}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Intensity</label>
          <input
            type="range"
            min="0"
            max="100"
            value={blurClip.blur_intensity}
            onChange={(e) => onUpdate({ blur_intensity: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.blur_intensity}%
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Mode:</label>
          <button
            onClick={() => onUpdate({ blur_inside: true })}
            className={`px-2 py-1 text-xs ${
              blurClip.blur_inside
                ? "bg-[#EC4899] text-white"
                : "bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-secondary)]"
            }`}
          >
            Blur Inside
          </button>
          <button
            onClick={() => onUpdate({ blur_inside: false })}
            className={`px-2 py-1 text-xs ${
              !blurClip.blur_inside
                ? "bg-[#EC4899] text-white"
                : "bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-secondary)]"
            }`}
          >
            Blur Outside
          </button>
        </div>
      </CollapsibleSection>

      {/* Region Position */}
      <CollapsibleSection title="Region Position" defaultExpanded={true}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Horizontal (X)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={blurClip.region_x}
            onChange={(e) => onUpdate({ region_x: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.region_x}%
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Vertical (Y)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={blurClip.region_y}
            onChange={(e) => onUpdate({ region_y: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.region_y}%
          </span>
        </div>
        <button
          onClick={() => onUpdate({ region_x: 50, region_y: 50 })}
          className="w-full mt-2 h-7 border border-[var(--border-default)] text-[var(--text-secondary)] text-xs hover:bg-[var(--surface-hover)]"
        >
          Center Region
        </button>
      </CollapsibleSection>

      {/* Region Size */}
      <CollapsibleSection title="Region Size" defaultExpanded={true}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Width</label>
          <input
            type="range"
            min="5"
            max="100"
            value={blurClip.region_width}
            onChange={(e) => onUpdate({ region_width: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.region_width}%
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Height</label>
          <input
            type="range"
            min="5"
            max="100"
            value={blurClip.region_height}
            onChange={(e) => onUpdate({ region_height: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.region_height}%
          </span>
        </div>
      </CollapsibleSection>

      {/* Corner Radius */}
      <CollapsibleSection title="Corner Radius" defaultExpanded={false}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Radius</label>
          <input
            type="range"
            min="0"
            max="100"
            value={blurClip.corner_radius}
            onChange={(e) => onUpdate({ corner_radius: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.corner_radius}% {blurClip.corner_radius >= 50 ? "(Circle)" : blurClip.corner_radius > 0 ? "(Rounded)" : "(Rectangle)"}
          </span>
        </div>
      </CollapsibleSection>

      {/* Easing */}
      <CollapsibleSection title="Easing" defaultExpanded={false}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Ease In</label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={blurClip.ease_in_duration_ms}
            onChange={(e) => onUpdate({ ease_in_duration_ms: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.ease_in_duration_ms}ms
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Ease Out</label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={blurClip.ease_out_duration_ms}
            onChange={(e) => onUpdate({ ease_out_duration_ms: parseInt(e.target.value) })}
            className="w-full accent-[#EC4899]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {blurClip.ease_out_duration_ms}ms
          </span>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// Pan Clip Inspector Component
function PanClipInspector({
  panClip,
  onUpdate,
  onDelete,
}: {
  panClip: DemoPanClip;
  onUpdate: (updates: Partial<DemoPanClip>) => void;
  onDelete: () => void;
}) {
  if (!panClip) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1 flex items-center gap-2">
          <Move className="w-4 h-4 text-[#14B8A6]" />
          Pan Effect
        </h3>
        <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
          {formatTime(panClip.duration_ms)}
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 pb-3 border-b border-[var(--border-default)]">
        <button
          onClick={onDelete}
          className="flex-1 h-8 border border-[var(--accent-error)] text-[var(--accent-error)] text-sm flex items-center justify-center gap-1 hover:bg-[var(--status-error-bg)]"
          title="Delete (Delete)"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>

      {/* Timing */}
      <CollapsibleSection title="Timing" defaultExpanded={true}>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Start</label>
            <input
              type="text"
              value={formatTime(panClip.start_time_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Duration</label>
            <input
              type="text"
              value={formatTime(panClip.duration_ms)}
              readOnly
              className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Start Position */}
      <CollapsibleSection title="Start Position" defaultExpanded={true}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Horizontal (X)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={panClip.start_x}
            onChange={(e) => onUpdate({ start_x: parseInt(e.target.value) })}
            className="w-full accent-[#14B8A6]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {panClip.start_x}%
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Vertical (Y)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={panClip.start_y}
            onChange={(e) => onUpdate({ start_y: parseInt(e.target.value) })}
            className="w-full accent-[#14B8A6]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {panClip.start_y}%
          </span>
        </div>
        <button
          onClick={() => onUpdate({ start_x: 50, start_y: 50 })}
          className="w-full mt-2 h-7 border border-[var(--border-default)] text-[var(--text-secondary)] text-xs hover:bg-[var(--surface-hover)]"
        >
          Center Start
        </button>
      </CollapsibleSection>

      {/* End Position */}
      <CollapsibleSection title="End Position" defaultExpanded={true}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Horizontal (X)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={panClip.end_x}
            onChange={(e) => onUpdate({ end_x: parseInt(e.target.value) })}
            className="w-full accent-[#14B8A6]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {panClip.end_x}%
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Vertical (Y)</label>
          <input
            type="range"
            min="0"
            max="100"
            value={panClip.end_y}
            onChange={(e) => onUpdate({ end_y: parseInt(e.target.value) })}
            className="w-full accent-[#14B8A6]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {panClip.end_y}%
          </span>
        </div>
        <button
          onClick={() => onUpdate({ end_x: 50, end_y: 50 })}
          className="w-full mt-2 h-7 border border-[var(--border-default)] text-[var(--text-secondary)] text-xs hover:bg-[var(--surface-hover)]"
        >
          Center End
        </button>
      </CollapsibleSection>

      {/* Easing */}
      <CollapsibleSection title="Easing" defaultExpanded={false}>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Ease In</label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={panClip.ease_in_duration_ms}
            onChange={(e) => onUpdate({ ease_in_duration_ms: parseInt(e.target.value) })}
            className="w-full accent-[#14B8A6]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {panClip.ease_in_duration_ms}ms
          </span>
        </div>
        <div>
          <label className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Ease Out</label>
          <input
            type="range"
            min="0"
            max="2000"
            step="50"
            value={panClip.ease_out_duration_ms}
            onChange={(e) => onUpdate({ ease_out_duration_ms: parseInt(e.target.value) })}
            className="w-full accent-[#14B8A6]"
          />
          <span className="text-[var(--text-caption)] text-[var(--text-secondary)]">
            {panClip.ease_out_duration_ms}ms
          </span>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// Background Picker Component
function BackgroundPicker({
  onClose,
  onSelectGradient,
  onSelectSolid,
  onSelectImage,
}: {
  onClose: () => void;
  onSelectGradient: (gradient: { name: string; colors: string[]; angle: number }) => void;
  onSelectSolid: (color: string) => void;
  onSelectImage?: (url: string, attribution?: { name: string; link: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<"presets" | "unsplash">("presets");
  const [unsplashApiKey, setUnsplashApiKey] = useState("");
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState<Array<{
    id: string;
    urls: { small: string; regular: string; full: string };
    user: { name: string; links: { html: string } };
    alt_description: string | null;
  }>>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [unsplashError, setUnsplashError] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Load API key from settings on mount
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const { useSettingsStore } = await import("@/lib/stores/settings");
        const key = await useSettingsStore.getState().get("unsplash_api_key");
        if (key) {
          setUnsplashApiKey(key);
        }
      } catch (e) {
        console.error("Failed to load Unsplash API key:", e);
      }
    };
    loadApiKey();
  }, []);

  const saveApiKey = async () => {
    try {
      const { useSettingsStore } = await import("@/lib/stores/settings");
      await useSettingsStore.getState().set("unsplash_api_key", unsplashApiKey);
      setShowApiKeyInput(false);
    } catch (e) {
      console.error("Failed to save Unsplash API key:", e);
    }
  };

  const searchUnsplash = async () => {
    if (!unsplashApiKey) {
      setUnsplashError("Please enter your Unsplash API key");
      setShowApiKeyInput(true);
      return;
    }
    if (!unsplashQuery.trim()) {
      setUnsplashError("Please enter a search query");
      return;
    }

    setUnsplashLoading(true);
    setUnsplashError(null);

    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=12&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${unsplashApiKey}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setUnsplashError("Invalid API key. Please check your Unsplash API key.");
          setShowApiKeyInput(true);
        } else {
          setUnsplashError(`Search failed: ${response.statusText}`);
        }
        setUnsplashResults([]);
        return;
      }

      const data = await response.json();
      setUnsplashResults(data.results || []);
      if (data.results?.length === 0) {
        setUnsplashError("No images found for this search");
      }
    } catch (e) {
      setUnsplashError("Failed to search Unsplash. Please check your connection.");
      console.error("Unsplash search error:", e);
    } finally {
      setUnsplashLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface-secondary)] border border-[var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Choose Background</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-default)]">
          <button
            onClick={() => setActiveTab("presets")}
            className={`flex-1 px-4 py-2 text-sm ${
              activeTab === "presets"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--accent-interactive)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Presets
          </button>
          <button
            onClick={() => setActiveTab("unsplash")}
            className={`flex-1 px-4 py-2 text-sm ${
              activeTab === "unsplash"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--accent-interactive)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Unsplash
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[60vh] overflow-auto">
          {activeTab === "presets" ? (
            <>
              {/* Gradients */}
              <div>
                <h4 className="text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  Gradients
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {backgroundPresets.gradients.map((gradient) => (
                    <button
                      key={gradient.name}
                      onClick={() => onSelectGradient(gradient)}
                      className="aspect-video border border-[var(--border-default)] hover:border-[var(--text-primary)] overflow-hidden"
                    >
                      <div
                        className="w-full h-full"
                        style={{
                          background: `linear-gradient(${gradient.angle}deg, ${gradient.colors.join(", ")})`,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Solid Colors */}
              <div>
                <h4 className="text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  Solid Colors
                </h4>
                <div className="grid grid-cols-6 gap-2">
                  {backgroundPresets.solids.map((solid) => (
                    <button
                      key={solid.name}
                      onClick={() => onSelectSolid(solid.color)}
                      className="aspect-square border border-[var(--border-default)] hover:border-[var(--text-primary)]"
                      style={{ backgroundColor: solid.color }}
                      title={solid.name}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* API Key Settings */}
              {showApiKeyInput && (
                <div className="p-3 bg-[var(--surface-primary)] border border-[var(--border-default)] mb-4">
                  <label className="text-[var(--text-caption)] text-[var(--text-tertiary)] block mb-1">
                    Unsplash API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={unsplashApiKey}
                      onChange={(e) => setUnsplashApiKey(e.target.value)}
                      placeholder="Enter your Unsplash API key"
                      className="flex-1 h-8 px-2 bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                    />
                    <button
                      onClick={saveApiKey}
                      className="px-3 h-8 bg-[var(--accent-interactive)] text-white text-sm hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">
                    Get your API key at{" "}
                    <a
                      href="https://unsplash.com/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent-interactive)] hover:underline"
                    >
                      unsplash.com/developers
                    </a>
                  </p>
                </div>
              )}

              {/* Search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={unsplashQuery}
                  onChange={(e) => setUnsplashQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUnsplash()}
                  placeholder="Search Unsplash..."
                  className="flex-1 h-9 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
                />
                <button
                  onClick={searchUnsplash}
                  disabled={unsplashLoading}
                  className="px-4 h-9 bg-[var(--accent-interactive)] text-white text-sm hover:opacity-90 disabled:opacity-50"
                >
                  {unsplashLoading ? "..." : "Search"}
                </button>
                <button
                  onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  className="p-2 h-9 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  title="API Key Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              {/* Error */}
              {unsplashError && (
                <div className="p-2 bg-[var(--status-error-bg)] text-[var(--accent-error)] text-sm">
                  {unsplashError}
                </div>
              )}

              {/* Results */}
              {unsplashResults.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {unsplashResults.map((photo) => (
                    <button
                      key={photo.id}
                      onClick={() => {
                        if (onSelectImage) {
                          onSelectImage(photo.urls.regular, {
                            name: photo.user.name,
                            link: photo.user.links.html,
                          });
                        }
                      }}
                      className="aspect-video border border-[var(--border-default)] hover:border-[var(--text-primary)] overflow-hidden relative group"
                      title={photo.alt_description || "Unsplash photo"}
                    >
                      <img
                        src={photo.urls.small}
                        alt={photo.alt_description || "Unsplash photo"}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        by {photo.user.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {unsplashResults.length === 0 && !unsplashError && !unsplashLoading && (
                <div className="text-center py-8 text-[var(--text-tertiary)]">
                  <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Search for free photos on Unsplash</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// App Media Picker Component
function AppMediaPicker({
  recordings,
  screenshots,
  onClose,
  onSelectRecording,
  onSelectScreenshot,
}: {
  recordings: Recording[];
  screenshots: Screenshot[];
  onClose: () => void;
  onSelectRecording: (recording: Recording) => void;
  onSelectScreenshot: (screenshot: Screenshot) => void;
}) {
  const [tab, setTab] = useState<"recordings" | "screenshots">("recordings");

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Import from App</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-default)]">
          <button
            onClick={() => setTab("recordings")}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              tab === "recordings"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            <Video className="w-4 h-4 inline mr-2" />
            Recordings ({recordings.length})
          </button>
          <button
            onClick={() => setTab("screenshots")}
            className={`flex-1 px-4 py-2 text-sm font-medium ${
              tab === "screenshots"
                ? "text-[var(--text-primary)] border-b-2 border-[var(--text-primary)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            <Image className="w-4 h-4 inline mr-2" />
            Screenshots ({screenshots.length})
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-auto">
          {tab === "recordings" ? (
            recordings.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-[var(--text-secondary)]">No recordings linked to this demo</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recordings.map((recording) => (
                  <button
                    key={recording.id}
                    onClick={() => onSelectRecording(recording)}
                    className="w-full p-3 bg-[var(--surface-primary)] border border-[var(--border-default)] hover:border-[var(--text-primary)] text-left flex items-center gap-3"
                  >
                    <div className="w-12 h-12 bg-[var(--surface-hover)] flex items-center justify-center flex-shrink-0">
                      <Video className="w-6 h-6 text-[#3B82F6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text-primary)] truncate">{recording.name}</p>
                      <div className="flex items-center gap-2 text-[var(--text-caption)] text-[var(--text-tertiary)]">
                        <span>{recording.duration_ms ? formatTime(recording.duration_ms) : "—"}</span>
                        {recording.webcam_path && (
                          <span className="px-1.5 py-0.5 bg-[var(--surface-hover)] text-[10px] uppercase">
                            + Webcam
                          </span>
                        )}
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-[var(--text-tertiary)]" />
                  </button>
                ))}
              </div>
            )
          ) : (
            screenshots.length === 0 ? (
              <div className="text-center py-8">
                <Image className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-2" />
                <p className="text-[var(--text-secondary)]">No screenshots linked to this demo</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {screenshots.map((screenshot) => (
                  <button
                    key={screenshot.id}
                    onClick={() => onSelectScreenshot(screenshot)}
                    className="aspect-video bg-[var(--surface-primary)] border border-[var(--border-default)] hover:border-[var(--text-primary)] overflow-hidden relative group"
                  >
                    {screenshot.image_path && (
                      <img
                        src={`file://${screenshot.image_path}`}
                        alt={screenshot.title || "Screenshot"}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                      <Plus className="w-6 h-6 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// Export Modal Component
function ExportModal({
  demo,
  background,
  tracks,
  clips,
  zoomClips,
  blurClips,
  panClips,
  onClose,
}: {
  demo: { id: string; name: string; width: number; height: number; frame_rate: number; duration_ms: number };
  background: DemoBackground | null;
  tracks: DemoTrack[];
  clips: DemoClip[];
  zoomClips: DemoZoomClip[];
  blurClips: DemoBlurClip[];
  panClips: DemoPanClip[];
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"mp4" | "webm">("mp4");
  const [quality, setQuality] = useState<"draft" | "good" | "high" | "max">("good");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState(false);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);
    setExportError(null);
    setProgress(10);

    try {
      // Use Tauri's save dialog to get the output path
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { homeDir } = await import("@tauri-apps/api/path");

      const home = await homeDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const defaultName = `${demo.name || "demo"}_${timestamp}.${format}`;

      const selectedPath = await save({
        defaultPath: `${home}/Downloads/${defaultName}`,
        filters: [
          { name: format.toUpperCase(), extensions: [format] }
        ],
      });

      if (!selectedPath) {
        setIsExporting(false);
        return; // User cancelled
      }

      setProgress(20);
      setExportPath(selectedPath);

      // Build render clips from timeline clips (video, image, and audio)
      // Ensure all time values are integers for Rust backend
      // For z_index: lower sort_order = top of timeline = should be visually on top (higher z_index)
      const maxSortOrder = Math.max(...tracks.map(t => t.sort_order), 0);
      const renderClips = clips
        .filter(c => c.source_type === "video" || c.source_type === "image" || c.source_type === "audio")
        .map(clip => {
          const track = tracks.find(t => t.id === clip.track_id);
          // Invert sort_order so that top of timeline (lower sort_order) = higher z_index (on top)
          const z_index = maxSortOrder - (track?.sort_order ?? 0);
          return {
            source_path: clip.source_path,
            source_type: clip.source_type,
            start_time_ms: Math.round(clip.start_time_ms),
            duration_ms: Math.round(clip.duration_ms),
            in_point_ms: Math.round(clip.in_point_ms || 0),
            position_x: clip.position_x,
            position_y: clip.position_y,
            scale: clip.scale,
            opacity: clip.opacity,
            corner_radius: clip.corner_radius,
            crop_top: clip.crop_top,
            crop_bottom: clip.crop_bottom,
            crop_left: clip.crop_left,
            crop_right: clip.crop_right,
            z_index,
            has_audio: clip.has_audio ?? (clip.source_type === "audio" ? true : null), // Use probed has_audio, fallback for audio clips
            track_id: clip.track_id, // Include track_id for zoom clip linking
            muted: clip.muted ?? false, // Whether to mute audio from this clip (for split audio)
          };
        });

      // Build render zoom clips from zoom tracks
      // Find zoom tracks and their associated zoom clips
      console.log("EXPORT DEBUG: All zoom clips:", zoomClips);
      console.log("EXPORT DEBUG: All tracks:", tracks.map(t => ({ id: t.id, type: t.track_type, target: t.target_track_id, visible: t.visible })));
      console.log("EXPORT DEBUG: All video clips:", clips.filter(c => c.source_type === "video").map(c => ({ id: c.id, track_id: c.track_id })));

      const renderZoomClips = zoomClips
        .filter(zc => {
          const zoomTrack = tracks.find(t => t.id === zc.track_id);
          const passes = zoomTrack && zoomTrack.visible && zoomTrack.target_track_id;
          console.log("EXPORT DEBUG: Zoom clip filter:", {
            zc_id: zc.id,
            zc_track_id: zc.track_id,
            zoomTrack_found: !!zoomTrack,
            zoomTrack_visible: zoomTrack?.visible,
            zoomTrack_target: zoomTrack?.target_track_id,
            passes
          });
          return passes;
        })
        .map(zc => {
          const zoomTrack = tracks.find(t => t.id === zc.track_id)!;
          const result = {
            target_track_id: zoomTrack.target_track_id!,
            start_time_ms: Math.round(zc.start_time_ms),
            duration_ms: Math.round(zc.duration_ms),
            zoom_scale: zc.zoom_scale,
            zoom_center_x: zc.zoom_center_x,
            zoom_center_y: zc.zoom_center_y,
            ease_in_duration_ms: Math.round(zc.ease_in_duration_ms),
            ease_out_duration_ms: Math.round(zc.ease_out_duration_ms),
          };
          console.log("EXPORT DEBUG: Mapped zoom clip:", result);
          return result;
        });

      console.log("EXPORT DEBUG: Final renderZoomClips:", renderZoomClips);

      // Build render config
      const { demoRender } = await import("@/lib/tauri/commands");

      setProgress(30);

      const config = {
        width: demo.width,
        height: demo.height,
        frame_rate: demo.frame_rate,
        duration_ms: Math.round(demo.duration_ms || 60000),
        format: format as "mp4" | "webm",
        quality: quality as "draft" | "good" | "high" | "max",
        output_path: selectedPath,
        background: background ? {
          background_type: background.background_type,
          color: background.color,
          gradient_stops: background.gradient_stops,
          gradient_angle: background.gradient_angle,
          image_url: background.image_url ?? null,
          media_path: background.media_path ?? null,
        } : null,
        clips: renderClips,
        zoom_clips: renderZoomClips.length > 0 ? renderZoomClips : null,
        blur_clips: (() => {
          // Build render blur clips from blur tracks
          const renderBlurClips = blurClips
            .filter(bc => {
              const blurTrack = tracks.find(t => t.id === bc.track_id);
              return blurTrack && blurTrack.visible;
            })
            .map(bc => {
              const blurTrack = tracks.find(t => t.id === bc.track_id);
              // z_index: lower sort_order = top of timeline = higher z_index (on top)
              const z_index = maxSortOrder - (blurTrack?.sort_order ?? 0);
              return {
                start_time_ms: Math.round(bc.start_time_ms),
                duration_ms: Math.round(bc.duration_ms),
                blur_intensity: bc.blur_intensity,
                region_x: bc.region_x,
                region_y: bc.region_y,
                region_width: bc.region_width,
                region_height: bc.region_height,
                corner_radius: bc.corner_radius,
                ease_in_duration_ms: Math.round(bc.ease_in_duration_ms),
                ease_out_duration_ms: Math.round(bc.ease_out_duration_ms),
                z_index,
              };
            });
          return renderBlurClips.length > 0 ? renderBlurClips : null;
        })(),
        pan_clips: (() => {
          // Build render pan clips from pan tracks
          const renderPanClips = panClips
            .filter(pc => {
              const panTrack = tracks.find(t => t.id === pc.track_id);
              return panTrack && panTrack.visible;
            })
            .map(pc => {
              const panTrack = tracks.find(t => t.id === pc.track_id);
              // z_index: lower sort_order = top of timeline = higher z_index (on top)
              const z_index = maxSortOrder - (panTrack?.sort_order ?? 0);
              return {
                start_time_ms: Math.round(pc.start_time_ms),
                duration_ms: Math.round(pc.duration_ms),
                start_x: pc.start_x,
                start_y: pc.start_y,
                end_x: pc.end_x,
                end_y: pc.end_y,
                ease_in_duration_ms: Math.round(pc.ease_in_duration_ms),
                ease_out_duration_ms: Math.round(pc.ease_out_duration_ms),
                z_index,
              };
            });
          return renderPanClips.length > 0 ? renderPanClips : null;
        })(),
      };

      setProgress(50);

      // Call the render command
      await demoRender.render(config);

      setProgress(100);
      setIsExporting(false);
      setExportComplete(true);
    } catch (err) {
      console.error("Export failed:", err);
      setExportError(err instanceof Error ? err.message : String(err));
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--surface-secondary)] border border-[var(--border-default)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h3 className="font-semibold text-[var(--text-primary)]">Export Video</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {exportError ? (
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--status-error-bg)] flex items-center justify-center">
                <X className="w-6 h-6 text-[var(--accent-error)]" />
              </div>
            </div>
            <h4 className="text-center text-[var(--text-primary)] font-medium mb-2">Export Failed</h4>
            <div className="bg-[var(--surface-primary)] p-3 border border-[var(--accent-error)] text-sm text-[var(--accent-error)] break-all font-mono max-h-40 overflow-auto">
              {exportError}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setExportError(null); setProgress(0); }}
                className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        ) : exportComplete ? (
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[var(--status-success-bg)] flex items-center justify-center">
                <Check className="w-6 h-6 text-[var(--status-success)]" />
              </div>
            </div>
            <h4 className="text-center text-[var(--text-primary)] font-medium mb-2">Export Complete</h4>
            <p className="text-center text-[var(--text-caption)] text-[var(--text-tertiary)] mb-4">
              Your video has been exported successfully.
            </p>
            {exportPath && (
              <div className="bg-[var(--surface-primary)] p-3 border border-[var(--border-default)] text-sm text-[var(--text-secondary)] break-all font-mono">
                {exportPath}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        ) : isExporting ? (
          <div className="p-6">
            <div className="mb-4">
              <div className="h-2 bg-[var(--surface-active)] overflow-hidden">
                <div
                  className="h-full bg-[var(--text-primary)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <p className="text-center text-[var(--text-secondary)]">
              Exporting... {progress}%
            </p>
            <p className="text-center text-[var(--text-caption)] text-[var(--text-tertiary)] mt-2">
              This may take a few minutes
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 space-y-4">
              {/* Format */}
              <div>
                <label className="block text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat("mp4")}
                    className={`p-3 border text-center ${
                      format === "mp4"
                        ? "border-[var(--text-primary)] bg-[var(--surface-hover)]"
                        : "border-[var(--border-default)]"
                    }`}
                  >
                    <p className="font-medium text-[var(--text-primary)]">MP4</p>
                    <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                      H.264 / AAC
                    </p>
                  </button>
                  <button
                    onClick={() => setFormat("webm")}
                    className={`p-3 border text-center ${
                      format === "webm"
                        ? "border-[var(--text-primary)] bg-[var(--surface-hover)]"
                        : "border-[var(--border-default)]"
                    }`}
                  >
                    <p className="font-medium text-[var(--text-primary)]">WebM</p>
                    <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                      VP9 / Opus
                    </p>
                  </button>
                </div>
              </div>

              {/* Quality */}
              <div>
                <label className="block text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">
                  Quality
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["draft", "good", "high", "max"] as const).map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`p-2 border text-center ${
                        quality === q
                          ? "border-[var(--text-primary)] bg-[var(--surface-hover)]"
                          : "border-[var(--border-default)]"
                      }`}
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                        {q}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="bg-[var(--surface-primary)] p-3 border border-[var(--border-default)]">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)]">Resolution</span>
                  <span className="text-[var(--text-primary)]">
                    {demo.width} × {demo.height}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[var(--text-secondary)]">Frame Rate</span>
                  <span className="text-[var(--text-primary)]">{demo.frame_rate} fps</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Est. Size</span>
                  <span className="text-[var(--text-primary)]">
                    ~{quality === "draft" ? "50" : quality === "good" ? "85" : quality === "high" ? "150" : "300"} MB
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-[var(--border-default)]">
              <button
                onClick={onClose}
                className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90"
              >
                Export
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Demo Info Inspector Component
function DemoInfoInspector({
  name,
  format,
  width,
  height,
  duration_ms,
  onUpdate,
}: {
  name: string;
  format: DemoFormat;
  width: number;
  height: number;
  duration_ms: number;
  onUpdate: (updates: { name?: string; format?: DemoFormat }) => void;
}) {
  const [localName, setLocalName] = useState(name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sync local name with prop when it changes externally
  useEffect(() => {
    setLocalName(name);
  }, [name]);

  const handleNameBlur = () => {
    if (localName.trim() !== name) {
      onUpdate({ name: localName.trim() });
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      nameInputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalName(name);
      nameInputRef.current?.blur();
    }
  };

  const formatOptions: { format: DemoFormat; label: string; dimensions: string }[] = [
    { format: "youtube", label: "YouTube", dimensions: "1920 × 1080" },
    { format: "youtube_4k", label: "YouTube 4K", dimensions: "3840 × 2160" },
    { format: "tiktok", label: "TikTok / Reels", dimensions: "1080 × 1920" },
    { format: "square", label: "Square", dimensions: "1080 × 1080" },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1 flex items-center gap-2">
          <Film className="w-4 h-4 text-[var(--accent-interactive)]" />
          Demo Settings
        </h3>
        <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
          {width} × {height} • {formatTime(duration_ms)}
        </p>
      </div>

      {/* Name */}
      <div className="pb-3 border-b border-[var(--border-default)]">
        <label className="text-[var(--text-caption)] text-[var(--text-tertiary)] block mb-1">Name</label>
        <input
          ref={nameInputRef}
          type="text"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          className="w-full h-8 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm"
          placeholder="Demo name..."
        />
      </div>

      {/* Format */}
      <div>
        <label className="text-[var(--text-caption)] text-[var(--text-tertiary)] block mb-2">Format</label>
        <div className="space-y-1">
          {formatOptions.map((option) => (
            <button
              key={option.format}
              onClick={() => onUpdate({ format: option.format })}
              className={`w-full p-2 text-left text-sm flex items-center justify-between ${
                format === option.format
                  ? "bg-[var(--accent-interactive)] text-white"
                  : "bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              }`}
            >
              <span>{option.label}</span>
              <span className={format === option.format ? "text-white/80" : "text-[var(--text-tertiary)]"}>
                {option.dimensions}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
