"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Plus, Trash2, Flag, MessageSquare, AlertTriangle, CheckCircle, Pencil, X, Scissors, GripVertical, ZoomIn, ZoomOut, Lightbulb, Camera, Copy, Check } from "lucide-react";
import { useRecordingsStore, useRouterStore, useFeaturesStore } from "@/lib/stores";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image } from "@tauri-apps/api/image";
import { annotations as annotationsApi, capture } from "@/lib/tauri/commands";
import type { AnnotationSeverity } from "@/lib/tauri/types";

// Local type for working with annotations in the UI
interface VideoAnnotation {
  id: string;
  timestamp_ms: number;
  title: string;
  description: string;
  severity: AnnotationSeverity;
  is_fixed: boolean;
  feature_id: string | null;
}

interface TrimRange {
  start: number;
  end: number;
}

interface VideoEditorViewProps {
  appId: string;
  explorationId: string;
  recordingId: string;
  initialTimestamp?: number;
}

const severityConfig: Record<AnnotationSeverity, { icon: typeof Flag; color: string; label: string }> = {
  info: { icon: MessageSquare, color: "#3B82F6", label: "Info" },
  warning: { icon: AlertTriangle, color: "#F59E0B", label: "Warning" },
  error: { icon: Flag, color: "#EF4444", label: "Bug" },
  success: { icon: CheckCircle, color: "#10B981", label: "Works" },
  eureka: { icon: Lightbulb, color: "#A855F7", label: "Eureka" },
};

export function VideoEditorView({ appId, explorationId, recordingId, initialTimestamp }: VideoEditorViewProps) {
  const { navigate } = useRouterStore();
  const { items: recordings, update, loadByExploration } = useRecordingsStore();
  const { items: features, loadByApp: loadFeatures } = useFeaturesStore();
  const recording = recordings.find(r => r.id === recordingId);

  // Load recordings for this exploration if not already loaded
  useEffect(() => {
    if (explorationId && !recording) {
      loadByExploration(explorationId);
    }
  }, [explorationId, recording, loadByExploration]);

  // Navigate back to exploration view with recordings tab
  const goBackToRecordings = useCallback(() => {
    navigate({ name: 'exploration', appId, explorationId, tab: 'recordings' });
  }, [navigate, appId, explorationId]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<VideoAnnotation | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<VideoAnnotation | null>(null);
  const [newAnnotation, setNewAnnotation] = useState<Partial<VideoAnnotation>>({
    severity: "info",
    title: "",
    description: "",
    feature_id: null,
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(recording?.name || "");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sidebar resize
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // Timeline zoom
  const [timelineZoom, setTimelineZoom] = useState(1);

  // Trim mode
  const [trimMode, setTrimMode] = useState(false);
  const [trimRange, setTrimRange] = useState<TrimRange | null>(null);
  const [isDraggingTrimStart, setIsDraggingTrimStart] = useState(false);
  const [isDraggingTrimEnd, setIsDraggingTrimEnd] = useState(false);
  const [trimStartInput, setTrimStartInput] = useState("");
  const [trimEndInput, setTrimEndInput] = useState("");

  // Cut mode
  const [showCutModal, setShowCutModal] = useState(false);
  const [cutRange, setCutRange] = useState<TrimRange | null>(null);
  const [cutName, setCutName] = useState("");
  const [cutStartInput, setCutStartInput] = useState("");
  const [cutEndInput, setCutEndInput] = useState("");

  // Toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  // Copy to clipboard state
  const [frameCopied, setFrameCopied] = useState(false);

  // Watch progress tracking
  const watchProgressRef = useRef<number>(recording?.watch_progress_ms || 0);
  const watchProgressSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Show toast helper
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  }, []);

  // Save watch progress to database (debounced)
  const saveWatchProgress = useCallback((progressMs: number) => {
    if (!recordingId || !recording) return;

    // Round to integer (backend expects i64)
    const progressMsInt = Math.round(progressMs);

    // Only save if progress has actually increased (don't go backwards)
    const newProgress = Math.max(watchProgressRef.current, progressMsInt);
    if (newProgress <= watchProgressRef.current) return;

    watchProgressRef.current = newProgress;

    // Debounce the save
    if (watchProgressSaveTimeout.current) {
      clearTimeout(watchProgressSaveTimeout.current);
    }

    watchProgressSaveTimeout.current = setTimeout(async () => {
      try {
        await update(recordingId, { watch_progress_ms: newProgress });
      } catch (err) {
        console.error("Failed to save watch progress:", err);
      }
    }, 2000); // Save every 2 seconds at most
  }, [recordingId, recording, update]);

  // Save watch progress when component unmounts
  useEffect(() => {
    return () => {
      if (watchProgressSaveTimeout.current) {
        clearTimeout(watchProgressSaveTimeout.current);
      }
      // Final save on unmount
      if (watchProgressRef.current > (recording?.watch_progress_ms || 0)) {
        update(recordingId, { watch_progress_ms: watchProgressRef.current }).catch(console.error);
      }
    };
  }, [recordingId, recording?.watch_progress_ms, update]);

  // Load existing annotations from database
  useEffect(() => {
    if (!recordingId) return;

    const loadAnnotations = async () => {
      try {
        const dbAnnotations = await annotationsApi.list(recordingId);
        // Convert database format to local VideoAnnotation format
        const videoAnnotations: VideoAnnotation[] = dbAnnotations.map(a => ({
          id: a.id,
          timestamp_ms: a.timestamp_ms,
          title: a.title,
          description: a.description || "",
          severity: a.severity || "info",
          is_fixed: a.is_fixed || false,
          feature_id: a.feature_id || null,
        }));
        setAnnotations(videoAnnotations);
      } catch (e) {
        console.error("Failed to load annotations:", e);
      }
    };

    loadAnnotations();
  }, [recordingId]);

  // Load features for this app
  useEffect(() => {
    if (appId) {
      loadFeatures(appId);
    }
  }, [appId, loadFeatures]);

  // Update edited title when recording changes
  useEffect(() => {
    if (recording?.name) {
      setEditedTitle(recording.name);
    }
  }, [recording?.name]);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Get video URL
  const getVideoUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    try {
      return convertFileSrc(path);
    } catch {
      return `https://asset.localhost/${encodeURIComponent(path)}`;
    }
  };

  // Load video metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const durationMs = video.duration * 1000;
      setDuration(durationMs);

      // Seek to initial timestamp if provided (e.g., clicking on an annotation)
      if (initialTimestamp !== undefined && initialTimestamp > 0) {
        video.currentTime = initialTimestamp / 1000;
        setCurrentTime(initialTimestamp);
      }
      // Otherwise, resume from saved watch progress if video isn't already watched (< 90%)
      else if (recording?.watch_progress_ms && recording.watch_progress_ms > 0) {
        const watchProgress = recording.watch_progress_ms / durationMs;
        // Only resume if not already watched (< 90%) and not at the very beginning
        if (watchProgress < 0.9 && watchProgress > 0.01) {
          video.currentTime = recording.watch_progress_ms / 1000;
          setCurrentTime(recording.watch_progress_ms);
        }
      }
    };
    const handleTimeUpdate = () => {
      const timeMs = video.currentTime * 1000;
      setCurrentTime(timeMs);
      // Track watch progress
      saveWatchProgress(timeMs);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      // Save final watch progress (100% of video)
      saveWatchProgress(video.duration * 1000);
    };
    const handlePause = () => {
      // Save watch progress when paused
      saveWatchProgress(video.currentTime * 1000);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("pause", handlePause);
    };
  }, [recording?.recording_path, recording?.watch_progress_ms, initialTimestamp, saveWatchProgress]);

  // Auto-save function - now only saves title changes
  // Annotations are saved directly to the database when added/edited/deleted
  const performSave = useCallback(async () => {
    if (!recording) return;
    try {
      // Only update recording name, annotations are handled separately
      if (editedTitle !== recording.name) {
        await update(recordingId, {
          name: editedTitle || recording.name,
        });
      }
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save:", err);
    }
  }, [recordingId, editedTitle, recording, update]);

  // Debounced auto-save
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, performSave]);

  // Mark as changed when title changes
  useEffect(() => {
    if (editedTitle !== recording?.name) {
      setHasUnsavedChanges(true);
    }
  }, [editedTitle, recording?.name]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-5000);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(5000);
          break;
        case "m":
          toggleMute();
          break;
        case "a":
          setShowAddModal(true);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  // Sidebar resize handlers
  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(250, Math.min(500, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const seek = useCallback((ms: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = ms / 1000;
    setCurrentTime(ms);
  }, []);

  const skip = useCallback((ms: number) => {
    seek(Math.max(0, Math.min(duration, currentTime + ms)));
  }, [currentTime, duration, seek]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingTrimStart || isDraggingTrimEnd) return;
    const timeline = timelineRef.current;
    if (!timeline) return;
    const rect = timeline.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  }, [duration, seek, isDraggingTrimStart, isDraggingTrimEnd]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Parse time string (m:ss or mm:ss) to milliseconds
  const parseTime = (timeStr: string): number | null => {
    const match = timeStr.match(/^(\d+):(\d{1,2})$/);
    if (!match) return null;
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    if (seconds >= 60) return null;
    return (minutes * 60 + seconds) * 1000;
  };

  const handleAddAnnotation = useCallback(async () => {
    if (!newAnnotation.title?.trim()) return;

    try {
      // Create annotation in database
      const created = await annotationsApi.create({
        recording_id: recordingId,
        timestamp_ms: Math.round(currentTime),
        title: newAnnotation.title,
        description: newAnnotation.description || null,
        severity: newAnnotation.severity || "info",
        feature_id: newAnnotation.feature_id || null,
      });

      // Convert to local format and add to state
      const annotation: VideoAnnotation = {
        id: created.id,
        timestamp_ms: created.timestamp_ms,
        title: created.title,
        description: created.description || "",
        severity: created.severity || "info",
        is_fixed: created.is_fixed || false,
        feature_id: created.feature_id || null,
      };

      setAnnotations((prev) => [...prev, annotation].sort((a, b) => a.timestamp_ms - b.timestamp_ms));
      setShowAddModal(false);
      setNewAnnotation({ severity: "info", title: "", description: "", feature_id: null });
    } catch (err) {
      console.error("Failed to create annotation:", err);
      showToast("Failed to create annotation");
    }
  }, [currentTime, newAnnotation, recordingId, showToast]);

  const handleEditAnnotation = useCallback(async () => {
    if (!editingAnnotation?.title?.trim()) {
      setShowEditModal(false);
      return;
    }

    try {
      // Update in database
      await annotationsApi.update(editingAnnotation.id, {
        title: editingAnnotation.title,
        description: editingAnnotation.description || null,
        severity: editingAnnotation.severity,
        feature_id: editingAnnotation.feature_id,
      });

      // Update local state
      setAnnotations((prev) => prev.map((a) => a.id === editingAnnotation.id ? editingAnnotation : a));
      setShowEditModal(false);
      setEditingAnnotation(null);
    } catch (err) {
      console.error("Failed to update annotation:", err);
      showToast("Failed to update annotation");
    }
  }, [editingAnnotation, showToast]);

  const handleDeleteAnnotation = useCallback(async (id: string) => {
    try {
      // Delete from database
      await annotationsApi.delete(id);

      // Update local state
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      if (selectedAnnotation?.id === id) {
        setSelectedAnnotation(null);
      }
    } catch (err) {
      console.error("Failed to delete annotation:", err);
      showToast("Failed to delete annotation");
    }
  }, [selectedAnnotation, showToast]);

  const handleToggleFixed = useCallback(async (id: string, currentFixed: boolean) => {
    try {
      // Update in database
      await annotationsApi.update(id, {
        is_fixed: !currentFixed,
      });

      // Update local state
      setAnnotations((prev) => prev.map((a) =>
        a.id === id ? { ...a, is_fixed: !currentFixed } : a
      ));

      showToast(!currentFixed ? "Marked as fixed" : "Marked as not fixed");
    } catch (err) {
      console.error("Failed to toggle fixed status:", err);
      showToast("Failed to update annotation");
    }
  }, [showToast]);

  const handleTitleSubmit = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const jumpToAnnotation = useCallback((annotation: VideoAnnotation) => {
    seek(annotation.timestamp_ms);
    setSelectedAnnotation(annotation);
  }, [seek]);

  // Trim handlers
  const startTrimMode = useCallback(() => {
    setTrimMode(true);
    setTrimRange({ start: 0, end: duration });
    setTrimStartInput(formatTime(0));
    setTrimEndInput(formatTime(duration));
  }, [duration]);

  const cancelTrimMode = useCallback(() => {
    setTrimMode(false);
    setTrimRange(null);
  }, []);

  // Update trim range from input fields
  const handleTrimStartChange = useCallback((value: string) => {
    setTrimStartInput(value);
    const ms = parseTime(value);
    if (ms !== null && trimRange) {
      const clampedStart = Math.max(0, Math.min(ms, trimRange.end - 1000));
      setTrimRange(prev => prev ? { ...prev, start: clampedStart } : null);
    }
  }, [trimRange]);

  const handleTrimEndChange = useCallback((value: string) => {
    setTrimEndInput(value);
    const ms = parseTime(value);
    if (ms !== null && trimRange) {
      const clampedEnd = Math.min(duration, Math.max(ms, trimRange.start + 1000));
      setTrimRange(prev => prev ? { ...prev, end: clampedEnd } : null);
    }
  }, [trimRange, duration]);

  // Apply trim - actually trims the video file using FFmpeg
  const applyTrim = useCallback(async () => {
    if (!trimRange || !recording) return;

    try {
      showToast("Trimming video...");

      // Call Tauri command to trim the video file
      await invoke("trim_video", {
        recordingId: recordingId,
        startMs: Math.round(trimRange.start),
        endMs: Math.round(trimRange.end),
      });

      // Refresh the recordings list to get updated duration
      const { load } = useRecordingsStore.getState();
      await load();

      showToast(`Video trimmed to ${formatTime(trimRange.end - trimRange.start)}`);
      setTrimMode(false);
      setTrimRange(null);
    } catch (err) {
      console.error("Failed to apply trim:", err);
      showToast(`Failed to trim video: ${err}`);
    }
  }, [trimRange, recording, recordingId, showToast]);

  // Handle trim drag
  useEffect(() => {
    if (!isDraggingTrimStart && !isDraggingTrimEnd) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current || !trimRange) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = percent * duration;

      if (isDraggingTrimStart) {
        const newStart = Math.min(time, trimRange.end - 1000);
        setTrimRange((prev) => prev ? { ...prev, start: newStart } : null);
        setTrimStartInput(formatTime(newStart));
      } else if (isDraggingTrimEnd) {
        const newEnd = Math.max(time, trimRange.start + 1000);
        setTrimRange((prev) => prev ? { ...prev, end: newEnd } : null);
        setTrimEndInput(formatTime(newEnd));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingTrimStart(false);
      setIsDraggingTrimEnd(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingTrimStart, isDraggingTrimEnd, duration, trimRange]);

  // Capture frame as screenshot
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !recording) return;

    try {
      const video = videoRef.current;
      const currentTimeMs = Math.round(video.currentTime * 1000);

      // Create a canvas with the video dimensions
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current frame
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast("Failed to create canvas context");
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get base64 PNG data
      const base64Data = canvas.toDataURL('image/png');

      // Save via Tauri command
      const screenshot = await capture.saveVideoFrameScreenshot(
        base64Data,
        appId,
        explorationId,
        null, // Let backend generate title with timestamp
        recordingId,
        currentTimeMs
      );

      showToast(`Screenshot saved at ${formatTime(currentTimeMs)}`);
      console.log("Screenshot created:", screenshot.id);
    } catch (err) {
      console.error("Failed to capture frame:", err);
      showToast(`Failed to capture frame: ${err}`);
    }
  }, [recording, appId, explorationId, recordingId, showToast]);

  // Copy current frame to clipboard
  const copyFrameToClipboard = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;

      // Create a canvas with the video dimensions
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current frame
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        showToast("Failed to create canvas context");
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get raw RGBA pixel data for Tauri clipboard
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Convert Uint8ClampedArray to Uint8Array
      const rgbaData = new Uint8Array(imageData.data.buffer);

      // Create Tauri Image from RGBA data with dimensions
      const tauriImage = await Image.new(rgbaData, canvas.width, canvas.height);

      // Use Tauri's clipboard plugin to write image
      await writeImage(tauriImage);

      setFrameCopied(true);
      setTimeout(() => setFrameCopied(false), 2000);
      showToast("Frame copied to clipboard");
    } catch (err) {
      console.error("Failed to copy frame:", err);
      showToast(`Failed to copy frame: ${err}`);
    }
  }, [showToast]);

  // Cut handlers
  const startCutMode = useCallback(() => {
    const start = currentTime;
    const end = Math.min(currentTime + 30000, duration); // Default 30 seconds
    setCutRange({ start, end });
    setCutStartInput(formatTime(start));
    setCutEndInput(formatTime(end));
    setCutName(`${recording?.name || 'Clip'} - Cut`);
    setShowCutModal(true);
  }, [currentTime, duration, recording?.name]);

  // Update cut range from input fields
  const handleCutStartChange = useCallback((value: string) => {
    setCutStartInput(value);
    const ms = parseTime(value);
    if (ms !== null && cutRange) {
      const clampedStart = Math.max(0, Math.min(ms, cutRange.end - 1000));
      setCutRange(prev => prev ? { ...prev, start: clampedStart } : null);
    }
  }, [cutRange, parseTime]);

  const handleCutEndChange = useCallback((value: string) => {
    setCutEndInput(value);
    const ms = parseTime(value);
    if (ms !== null && cutRange) {
      const clampedEnd = Math.min(duration, Math.max(ms, cutRange.start + 1000));
      setCutRange(prev => prev ? { ...prev, end: clampedEnd } : null);
    }
  }, [cutRange, duration, parseTime]);

  const handleCreateCut = useCallback(async () => {
    if (!cutRange || !cutName.trim() || !recording) return;

    try {
      showToast("Creating clip...");

      // Call Tauri command to cut the video and create a new file
      await invoke("cut_video", {
        recordingId: recordingId,
        startMs: Math.round(cutRange.start),
        endMs: Math.round(cutRange.end),
        newName: cutName,
      });

      // Refresh the recordings list to see the new clip
      const { load } = useRecordingsStore.getState();
      await load();

      const clipDuration = formatTime(cutRange.end - cutRange.start);
      showToast(`Clip "${cutName}" created (${clipDuration})`);

      setShowCutModal(false);
      setCutRange(null);
      setCutName("");
    } catch (err) {
      console.error("Failed to create clip:", err);
      showToast(`Failed to create clip: ${err}`);
    }
  }, [cutRange, cutName, recording, recordingId, showToast]);

  if (!recording) {
    return (
      <div className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[var(--text-heading-md)] font-semibold text-[var(--text-primary)] mb-2">Recording not found</h2>
          <button onClick={goBackToRecordings} className="text-[var(--text-primary)] underline hover:no-underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col">
      {/* Header */}
      <header className="h-[calc(56px+var(--titlebar-height))] pt-[var(--titlebar-height)] border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={goBackToRecordings} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSubmit();
                if (e.key === "Escape") {
                  setEditedTitle(recording.name);
                  setIsEditingTitle(false);
                }
              }}
              className="font-semibold text-[var(--text-primary)] bg-transparent border-b-2 border-[var(--text-primary)] outline-none px-1"
            />
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] px-2 py-1 flex items-center gap-2 group"
            >
              {editedTitle || recording.name}
              <Pencil className="w-3 h-3 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Saving...</span>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="h-8 px-3 border border-[var(--border-default)] text-[var(--text-primary)] font-medium flex items-center gap-2 hover:bg-[var(--surface-hover)]"
          >
            <Plus className="w-4 h-4" />Add Annotation
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Video Player - use min-h-0 to allow flex shrinking */}
          <div className="flex-1 min-h-0 bg-black flex items-center justify-center relative">
            <video
              ref={videoRef}
              src={getVideoUrl(recording.recording_path)}
              className="max-w-full max-h-full object-contain"
              onClick={togglePlay}
            />
            {/* Play/Pause overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                  <Play className="w-8 h-8 text-black ml-1" />
                </div>
              </button>
            )}
          </div>

          {/* Timeline & Controls - fixed height, won't shrink */}
          <div className="flex-shrink-0 border-t border-[var(--border-default)] bg-[var(--surface-secondary)]">
            {/* Main Controls */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-1">
                <button onClick={() => skip(-5000)} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]" title="Back 5s">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={togglePlay} className="p-3 bg-[var(--text-primary)] text-[var(--text-inverse)] hover:opacity-90 rounded-full">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <button onClick={() => skip(5000)} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]" title="Forward 5s">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 text-[var(--text-body-sm)] font-mono">
                <span className="text-[var(--text-primary)] min-w-[4rem]">{formatTime(currentTime)}</span>
                <span className="text-[var(--text-tertiary)]">/</span>
                <span className="text-[var(--text-tertiary)]">{formatTime(duration)}</span>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-[var(--text-primary)]"
                />
              </div>

              <div className="w-px h-6 bg-[var(--border-default)]" />

              {/* Trim & Cut Tools */}
              <div className="flex items-center gap-1">
                {trimMode && trimRange ? (
                  <>
                    <div className="flex items-center gap-2 mr-2">
                      <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Start:</span>
                      <input
                        type="text"
                        value={trimStartInput}
                        onChange={(e) => handleTrimStartChange(e.target.value)}
                        className="w-16 h-7 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-body-sm)] font-mono focus:outline-none focus:border-[var(--text-primary)]"
                      />
                      <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">End:</span>
                      <input
                        type="text"
                        value={trimEndInput}
                        onChange={(e) => handleTrimEndChange(e.target.value)}
                        className="w-16 h-7 px-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-body-sm)] font-mono focus:outline-none focus:border-[var(--text-primary)]"
                      />
                      <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                        ({formatTime(trimRange.end - trimRange.start)})
                      </span>
                    </div>
                    <button
                      onClick={cancelTrimMode}
                      className="h-8 px-3 border border-[var(--border-default)] text-[var(--text-secondary)] font-medium hover:bg-[var(--surface-hover)]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={applyTrim}
                      className="h-8 px-3 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90"
                    >
                      Apply Trim
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={startTrimMode}
                      className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                      title="Trim Video"
                    >
                      <Scissors className="w-5 h-5" />
                    </button>
                    <button
                      onClick={startCutMode}
                      className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                      title="Cut Selection"
                    >
                      <Scissors className="w-5 h-5 rotate-90" />
                    </button>
                  </>
                )}
              </div>

              <div className="w-px h-6 bg-[var(--border-default)]" />

              {/* Capture Frame */}
              <button
                onClick={captureFrame}
                className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Capture Frame as Screenshot"
              >
                <Camera className="w-5 h-5" />
              </button>

              {/* Copy Frame to Clipboard */}
              <button
                onClick={copyFrameToClipboard}
                className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Copy Frame to Clipboard"
              >
                {frameCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </button>

              <div className="w-px h-6 bg-[var(--border-default)]" />

              {/* Timeline Zoom */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTimelineZoom((z) => Math.max(0.5, z - 0.25))}
                  className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                  title="Zoom Out Timeline"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] w-10 text-center">{Math.round(timelineZoom * 100)}%</span>
                <button
                  onClick={() => setTimelineZoom((z) => Math.min(4, z + 0.25))}
                  className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                  title="Zoom In Timeline"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="px-4 py-4 overflow-x-auto">
              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative h-16 bg-[var(--surface-elevated)] cursor-pointer overflow-hidden"
                style={{ minWidth: `${100 * timelineZoom}%` }}
              >
                {/* Progress */}
                <div
                  className="absolute top-0 left-0 h-full bg-[var(--surface-active)] opacity-50"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />

                {/* Trim Range Overlay */}
                {trimMode && trimRange && (
                  <>
                    {/* Darkened areas outside trim */}
                    <div
                      className="absolute top-0 left-0 h-full bg-black/50"
                      style={{ width: `${(trimRange.start / duration) * 100}%` }}
                    />
                    <div
                      className="absolute top-0 right-0 h-full bg-black/50"
                      style={{ width: `${((duration - trimRange.end) / duration) * 100}%` }}
                    />
                    {/* Trim handles */}
                    <div
                      className="absolute top-0 h-full w-1 bg-[var(--accent-warning)] cursor-ew-resize hover:bg-[var(--accent-warning)] z-10"
                      style={{ left: `${(trimRange.start / duration) * 100}%` }}
                      onMouseDown={(e) => { e.stopPropagation(); setIsDraggingTrimStart(true); }}
                    >
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-8 bg-[var(--accent-warning)] rounded flex items-center justify-center">
                        <GripVertical className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div
                      className="absolute top-0 h-full w-1 bg-[var(--accent-warning)] cursor-ew-resize hover:bg-[var(--accent-warning)] z-10"
                      style={{ left: `${(trimRange.end / duration) * 100}%` }}
                      onMouseDown={(e) => { e.stopPropagation(); setIsDraggingTrimEnd(true); }}
                    >
                      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-8 bg-[var(--accent-warning)] rounded flex items-center justify-center">
                        <GripVertical className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </>
                )}

                {/* Playhead */}
                <div
                  className="absolute top-0 w-0.5 h-full bg-[var(--text-primary)] z-20"
                  style={{ left: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute -top-1 -left-2 w-4 h-4 bg-[var(--text-primary)] rotate-45 transform origin-center" />
                </div>

                {/* Annotation Markers */}
                {annotations.map((ann) => {
                  const config = severityConfig[ann.severity];
                  return (
                    <div
                      key={ann.id}
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 cursor-pointer hover:scale-125 transition-transform z-10"
                      style={{
                        left: `${(ann.timestamp_ms / duration) * 100}%`,
                        backgroundColor: config.color,
                        marginLeft: -8,
                        borderRadius: 2,
                      }}
                      onClick={(e) => { e.stopPropagation(); jumpToAnnotation(ann); }}
                      title={ann.title}
                    />
                  );
                })}

                {/* Time markers */}
                <div className="absolute bottom-0 left-0 right-0 h-4 flex justify-between px-1 text-[10px] text-[var(--text-tertiary)]">
                  {Array.from({ length: Math.ceil(duration / 30000) + 1 }).map((_, i) => (
                    <span key={i} style={{ position: 'absolute', left: `${(i * 30000 / duration) * 100}%` }}>
                      {formatTime(i * 30000)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resizable Sidebar */}
        <div className="relative flex flex-shrink-0">
          {/* Resize handle */}
          <div
            className="w-1 bg-transparent hover:bg-[var(--border-strong)] cursor-col-resize transition-colors group flex items-center justify-center"
            onMouseDown={handleSidebarResizeStart}
          >
            <div className="w-4 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-3 h-3 text-[var(--text-tertiary)]" />
            </div>
          </div>

          <aside
            className="border-l border-[var(--border-default)] flex flex-col bg-[var(--surface-secondary)]"
            style={{ width: sidebarWidth }}
          >
            <div className="p-4 border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Annotations</h3>
              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">{annotations.length} markers</p>
            </div>

            <div className="flex-1 overflow-auto">
              {annotations.length === 0 ? (
                <div className="p-8 text-center">
                  <Flag className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-body-sm)] text-[var(--text-secondary)]">No annotations yet</p>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">Press A or click "Add Annotation"</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {annotations.map((ann) => {
                    const config = severityConfig[ann.severity];
                    const Icon = config.icon;
                    const isSelected = selectedAnnotation?.id === ann.id;

                    return (
                      <div
                        key={ann.id}
                        onClick={() => jumpToAnnotation(ann)}
                        className={`p-3 cursor-pointer transition-colors border ${isSelected ? "bg-[var(--surface-hover)] border-l-4" : "bg-[var(--surface-primary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"}`}
                        style={isSelected ? { borderLeftColor: config.color } : {}}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: ann.is_fixed ? "#10B981" : config.color }} />
                            <span className={`font-medium text-[var(--text-body-sm)] truncate ${ann.is_fixed ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"}`}>{ann.title}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAnnotation({ ...ann });
                                setShowEditModal(true);
                              }}
                              className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAnnotation(ann.id); }}
                              className="p-1 hover:bg-[var(--status-error-bg)] text-[var(--text-tertiary)] hover:text-[var(--accent-error)]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] font-mono">{formatTime(ann.timestamp_ms)}</span>
                          <span className="text-[var(--text-caption)] px-1.5 py-0.5" style={{ backgroundColor: `${config.color}20`, color: config.color }}>
                            {config.label}
                          </span>
                          {ann.severity === "error" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleFixed(ann.id, ann.is_fixed); }}
                              className={`text-[var(--text-caption)] px-1.5 py-0.5 flex items-center gap-1 transition-colors ${
                                ann.is_fixed
                                  ? "bg-[#10B98120] text-[#10B981] hover:bg-[#10B98130]"
                                  : "bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--surface-active)]"
                              }`}
                              title={ann.is_fixed ? "Mark as not fixed" : "Mark as fixed"}
                            >
                              <CheckCircle className="w-3 h-3" />
                              {ann.is_fixed ? "Fixed" : "Not Fixed"}
                            </button>
                          )}
                        </div>
                        {ann.description && (
                          <p className="text-[var(--text-caption)] text-[var(--text-secondary)] mt-2 line-clamp-2">{ann.description}</p>
                        )}
                        {ann.feature_id && (() => {
                          const linkedFeature = features.find(f => f.id === ann.feature_id);
                          return linkedFeature ? (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Flag className="w-3 h-3 text-[var(--text-tertiary)]" />
                              <span className="text-[var(--text-caption)] text-[var(--accent-interactive)]">{linkedFeature.name}</span>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Add Annotation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Add Annotation</h3>
                <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">at {formatTime(currentTime)}</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(severityConfig) as AnnotationSeverity[]).map((sev) => {
                    const config = severityConfig[sev];
                    const Icon = config.icon;
                    return (
                      <button
                        key={sev}
                        onClick={() => setNewAnnotation((prev) => ({ ...prev, severity: sev }))}
                        className={`p-2 border flex flex-col items-center gap-1 transition-colors ${newAnnotation.severity === sev ? "border-2" : "border-[var(--border-default)] hover:border-[var(--border-strong)]"}`}
                        style={{
                          borderColor: newAnnotation.severity === sev ? config.color : undefined,
                          backgroundColor: newAnnotation.severity === sev ? `${config.color}15` : undefined,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                        <span className="text-[var(--text-caption)]" style={{ color: config.color }}>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Title</label>
                <input
                  type="text"
                  value={newAnnotation.title || ""}
                  onChange={(e) => setNewAnnotation((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="What did you find?"
                  autoFocus
                  className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Description <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                </label>
                <textarea
                  value={newAnnotation.description || ""}
                  onChange={(e) => setNewAnnotation((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              {features.length > 0 && (
                <div>
                  <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Feature <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                  </label>
                  <select
                    value={newAnnotation.feature_id || ""}
                    onChange={(e) => setNewAnnotation((prev) => ({ ...prev, feature_id: e.target.value || null }))}
                    className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  >
                    <option value="">No feature linked</option>
                    {features.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-[var(--border-default)]">
              <button onClick={() => setShowAddModal(false)} className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]">Cancel</button>
              <button onClick={handleAddAnnotation} disabled={!newAnnotation.title?.trim()} className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90 disabled:opacity-50">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Annotation Modal */}
      {showEditModal && editingAnnotation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">Edit Annotation</h3>
                <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">at {formatTime(editingAnnotation.timestamp_ms)}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(severityConfig) as AnnotationSeverity[]).map((sev) => {
                    const config = severityConfig[sev];
                    const Icon = config.icon;
                    return (
                      <button
                        key={sev}
                        onClick={() => setEditingAnnotation((prev) => prev ? { ...prev, severity: sev } : null)}
                        className={`p-2 border flex flex-col items-center gap-1 transition-colors ${editingAnnotation.severity === sev ? "border-2" : "border-[var(--border-default)] hover:border-[var(--border-strong)]"}`}
                        style={{
                          borderColor: editingAnnotation.severity === sev ? config.color : undefined,
                          backgroundColor: editingAnnotation.severity === sev ? `${config.color}15` : undefined,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                        <span className="text-[var(--text-caption)]" style={{ color: config.color }}>{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Title</label>
                <input
                  type="text"
                  value={editingAnnotation.title}
                  onChange={(e) => setEditingAnnotation((prev) => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="What did you find?"
                  autoFocus
                  className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Description <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                </label>
                <textarea
                  value={editingAnnotation.description}
                  onChange={(e) => setEditingAnnotation((prev) => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              {features.length > 0 && (
                <div>
                  <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Feature <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                  </label>
                  <select
                    value={editingAnnotation.feature_id || ""}
                    onChange={(e) => setEditingAnnotation((prev) => prev ? { ...prev, feature_id: e.target.value || null } : null)}
                    className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                  >
                    <option value="">No feature linked</option>
                    {features.map((feature) => (
                      <option key={feature.id} value={feature.id}>
                        {feature.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t border-[var(--border-default)]">
              <button onClick={() => setShowEditModal(false)} className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]">Cancel</button>
              <button onClick={handleEditAnnotation} disabled={!editingAnnotation.title?.trim()} className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90 disabled:opacity-50">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Cut Modal */}
      {showCutModal && cutRange && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCutModal(false)}>
          <div className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Create Clip</h3>
              <button onClick={() => setShowCutModal(false)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Clip Name</label>
                <input
                  type="text"
                  value={cutName}
                  onChange={(e) => setCutName(e.target.value)}
                  placeholder="Name for the new clip"
                  autoFocus
                  className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Start Time</label>
                  <input
                    type="text"
                    value={cutStartInput}
                    onChange={(e) => handleCutStartChange(e.target.value)}
                    placeholder="0:00"
                    className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
                  />
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">Format: m:ss</p>
                </div>
                <div>
                  <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">End Time</label>
                  <input
                    type="text"
                    value={cutEndInput}
                    onChange={(e) => handleCutEndChange(e.target.value)}
                    placeholder="0:00"
                    className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
                  />
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">Max: {formatTime(duration)}</p>
                </div>
              </div>

              <div className="bg-[var(--surface-primary)] p-3 border border-[var(--border-default)]">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-body-sm)] text-[var(--text-secondary)]">Clip Duration</span>
                  <span className="text-[var(--text-body-sm)] text-[var(--text-primary)] font-mono font-medium">
                    {formatTime(cutRange.end - cutRange.start)}
                  </span>
                </div>
              </div>

              {/* Mini timeline preview */}
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Preview</label>
                <div className="relative h-8 bg-[var(--surface-elevated)] overflow-hidden">
                  {/* Selected range */}
                  <div
                    className="absolute top-0 h-full bg-[var(--text-primary)] opacity-30"
                    style={{
                      left: `${(cutRange.start / duration) * 100}%`,
                      width: `${((cutRange.end - cutRange.start) / duration) * 100}%`,
                    }}
                  />
                  {/* Start marker */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-[#10B981]"
                    style={{ left: `${(cutRange.start / duration) * 100}%` }}
                  />
                  {/* End marker */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-[#EF4444]"
                    style={{ left: `${(cutRange.end / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1">
                  <span>0:00</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-[var(--border-default)]">
              <button onClick={() => setShowCutModal(false)} className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]">Cancel</button>
              <button onClick={handleCreateCut} disabled={!cutName.trim() || cutRange.end <= cutRange.start} className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90 disabled:opacity-50">Create Clip</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-[var(--text-primary)] text-[var(--text-inverse)] px-4 py-3 shadow-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-[#10B981]" />
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
