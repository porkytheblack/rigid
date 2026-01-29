"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Camera,
  Video,
  Square,
  Image as ImageIcon,
  Settings,
  Trash2,
  Play,
  Monitor,
  X,
  Loader2,
  RefreshCw,
  Download,
  Mic,
  MicOff,
  MousePointer2,
  Film,
  Upload,
  Plus,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useAppsStore,
  useRecordingsStore,
  useScreenshotsStore,
  useRouterStore,
  useSettingsStore,
  useDemosStore,
} from "@/lib/stores";
import {
  capture as captureCommands,
  screenshots as screenshotsApi,
  recordings as recordingsApi,
  demoRecordings as demoRecordingsApi,
  demoScreenshots as demoScreenshotsApi,
  type WindowInfo,
  type DisplayInfo,
  type AudioDevice,
} from "@/lib/tauri/commands";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { Demo, DemoFormat, Recording, Screenshot } from "@/lib/tauri/types";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

type Tab = "recordings" | "screenshots" | "videos";
type PickerMode = "screenshot" | "recording";

interface DemoViewProps {
  appId: string;
  demoId: string;
}

export function DemoView({ appId, demoId }: DemoViewProps) {
  const { navigate } = useRouterStore();
  const confirm = useConfirm();
  const { addToast } = useToast();

  // Navigate back to app grid view
  const goBackToApp = useCallback(() => {
    navigate({ name: "app", appId });
  }, [navigate, appId]);

  const { getById: getAppById, load: loadApps } = useAppsStore();
  const {
    items: allRecordings,
    isRecording,
    loadByApp: loadRecordings,
    startRecording,
    stopRecording,
    cancelRecording,
    checkRecordingStatus,
    delete: deleteRecording,
  } = useRecordingsStore();
  const {
    items: allScreenshots,
    loading: screenshotsLoading,
    loadByApp: loadScreenshots,
    delete: deleteScreenshot,
  } = useScreenshotsStore();
  const {
    items: demos,
    loadByApp: loadDemos,
    getById: getDemoById,
    create: createDemo,
    delete: deleteDemo,
  } = useDemosStore();
  const { items: settings, load: loadSettings } = useSettingsStore();

  // Demo-specific recordings and screenshots (linked to this demo)
  const [demoRecordings, setDemoRecordings] = useState<Recording[]>([]);
  const [demoScreenshots, setDemoScreenshots] = useState<Screenshot[]>([]);
  const [loadingDemoMedia, setLoadingDemoMedia] = useState(false);

  // Available recordings/screenshots for this app (to add to demo)
  const appRecordings = allRecordings.filter((r) => r.app_id === appId);
  const appScreenshots = allScreenshots.filter((s) => s.app_id === appId);

  // Get the current demo
  const demo = getDemoById(demoId);

  // Video player state
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const [editingRecordingId, setEditingRecordingId] = useState<string | null>(null);
  const [editingRecordingName, setEditingRecordingName] = useState("");

  // Screenshot viewer state
  const [viewingScreenshot, setViewingScreenshot] = useState<Screenshot | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>("recordings");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [showWindowPicker, setShowWindowPicker] = useState(false);
  const [showRecordingSetup, setShowRecordingSetup] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("screenshot");
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingWindows, setLoadingWindows] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [selectedWindow, setSelectedWindow] = useState<WindowInfo | null>(null);
  const [selectedDisplay, setSelectedDisplay] = useState<DisplayInfo | null>(null);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>("none");
  const [showCursorInRecording, setShowCursorInRecording] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [recordWithWebcam, setRecordWithWebcam] = useState(false);

  const app = getAppById(appId);

  // Load data on mount
  useEffect(() => {
    loadApps();
    loadSettings();
    checkRecordingStatus();
  }, [loadApps, loadSettings, checkRecordingStatus]);

  useEffect(() => {
    if (appId) {
      loadRecordings(appId);
      loadScreenshots(appId);
      loadDemos(appId);
    }
  }, [appId, loadRecordings, loadScreenshots, loadDemos]);

  // Load demo-specific recordings and screenshots
  const loadDemoMedia = useCallback(async () => {
    if (!demoId) return;
    setLoadingDemoMedia(true);
    try {
      const [recordings, screenshots] = await Promise.all([
        demoRecordingsApi.listWithData(demoId),
        demoScreenshotsApi.listWithData(demoId),
      ]);
      setDemoRecordings(recordings);
      setDemoScreenshots(screenshots);
    } catch (err) {
      console.error("Failed to load demo media:", err);
    } finally {
      setLoadingDemoMedia(false);
    }
  }, [demoId]);

  useEffect(() => {
    loadDemoMedia();
  }, [loadDemoMedia]);

  // Initialize recording settings from stored settings
  useEffect(() => {
    if (settings["record_audio"] === "true") {
      setSelectedAudioDevice("microphone");
    }
    if (settings["show_cursor"] === "false") {
      setShowCursorInRecording(false);
    }
  }, [settings]);

  const loadWindows = async () => {
    setLoadingWindows(true);
    try {
      const [windowList, displayList, audioList] = await Promise.all([
        captureCommands.listWindows(),
        captureCommands.listDisplays(),
        captureCommands.listAudioDevices(),
      ]);
      setWindows(windowList);
      setDisplays(displayList);
      setAudioDevices(audioList);
    } catch (err) {
      console.error("Failed to list windows:", err);
    } finally {
      setLoadingWindows(false);
    }
  };

  const handleOpenWindowPicker = async (mode: PickerMode) => {
    setPickerMode(mode);
    setShowWindowPicker(true);
    await loadWindows();
  };

  // Close window picker and clean up any pending state
  const handleCloseWindowPicker = () => {
    setShowWindowPicker(false);
    // Reset any capture state if we were in the middle of something
    if (capturing) {
      setCapturing(false);
      addToast({
        type: "info",
        title: "Screenshot cancelled",
        description: "The screenshot capture was cancelled.",
      });
    }
  };

  const handleCaptureWindow = async (window: WindowInfo) => {
    if (pickerMode === "screenshot") {
      setShowWindowPicker(false);
      setCapturing(true);
      try {
        // Capture screenshot for the app (not tied to exploration)
        const screenshot = await captureCommands.windowScreenshot(
          appId, // App ID for app-level screenshot
          null, // No exploration ID
          `${window.owner} - ${window.name}`,
          window.owner,
          window.name,
          window.window_id
        );
        // Link the new screenshot to this demo
        if (screenshot?.id) {
          await demoScreenshotsApi.add({ demo_id: demoId, screenshot_id: screenshot.id });
          await loadDemoMedia();
        }
        loadScreenshots(appId);
        addToast({
          type: "success",
          title: "Screenshot captured",
          description: "The screenshot has been saved.",
        });
      } catch (err) {
        const errorMessage = String(err);
        // Check if this was a user cancellation (e.g., pressing Escape)
        if (errorMessage.includes("cancelled") || errorMessage.includes("canceled")) {
          addToast({
            type: "info",
            title: "Screenshot cancelled",
            description: "The screenshot capture was cancelled.",
          });
        } else {
          console.error("Failed to capture window screenshot:", err);
          addToast({
            type: "error",
            title: "Screenshot failed",
            description: "Could not capture the screenshot. Please try again.",
          });
        }
      } finally {
        setCapturing(false);
      }
    } else {
      setSelectedWindow(window);
      setSelectedDisplay(null);
      setShowRecordingSetup(true);
    }
  };

  const handleSelectDisplay = (display: DisplayInfo) => {
    setSelectedDisplay(display);
    setSelectedWindow(null);
    setShowRecordingSetup(true);
  };

  const handleStartRecordingWithSetup = async () => {
    setShowWindowPicker(false);
    setShowRecordingSetup(false);

    try {
      if (selectedWindow) {
        await startRecording({
          appId, // Record at app level, not exploration level
          explorationId: null, // Pass null for app-level recordings (no exploration)
          name: `${selectedWindow.owner} - ${selectedWindow.name}`,
          windowId: selectedWindow.window_id,
          bounds: selectedWindow.bounds,
          audioDevice: selectedAudioDevice,
          showCursor: showCursorInRecording,
          recordWebcam: recordWithWebcam,
        });
      } else if (selectedDisplay) {
        await startRecording({
          appId,
          explorationId: null, // Pass null for app-level recordings (no exploration)
          name: selectedDisplay.name,
          displayId: selectedDisplay.id,
          audioDevice: selectedAudioDevice,
          showCursor: showCursorInRecording,
          recordWebcam: recordWithWebcam,
        });
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
    }

    setSelectedWindow(null);
    setSelectedDisplay(null);
  };

  const handleCancelRecordingSetup = () => {
    setShowRecordingSetup(false);
    setShowWindowPicker(false);
    setSelectedWindow(null);
    setSelectedDisplay(null);
    addToast({
      type: "info",
      title: "Recording cancelled",
      description: "The recording setup was cancelled.",
    });
  };

  const handleStopRecording = async () => {
    try {
      const recording = await stopRecording();
      // Link the new recording to this demo
      if (recording?.id) {
        await demoRecordingsApi.add({ demo_id: demoId, recording_id: recording.id });
        await loadDemoMedia();
      }
      setTimeout(() => loadRecordings(appId), 500);
    } catch (err) {
      console.error("Failed to stop recording:", err);
      try {
        await cancelRecording();
      } catch (cancelErr) {
        console.error("Failed to cancel recording:", cancelErr);
      }
    }
  };

  const handleCancelRecording = async () => {
    try {
      await cancelRecording();
      loadRecordings(appId);
      addToast({
        type: "info",
        title: "Recording cancelled",
        description: "The recording has been discarded.",
      });
    } catch (err) {
      console.error("Failed to cancel recording:", err);
      addToast({
        type: "error",
        title: "Cancel failed",
        description: "Could not cancel the recording. Please try again.",
      });
    }
  };

  const handleRemoveScreenshotFromDemo = async (id: string) => {
    if (deletingIds.has(id)) return;

    const confirmed = await confirm({
      title: "Remove Screenshot",
      description:
        "Are you sure you want to remove this screenshot from the demo? The screenshot will still exist in the app.",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeletingIds((prev: Set<string>) => new Set(prev).add(id));
    try {
      await demoScreenshotsApi.remove(demoId, id);
      await loadDemoMedia();
      addToast({
        type: "success",
        title: "Screenshot removed",
        description: "The screenshot has been removed from the demo.",
      });
    } catch (err) {
      console.error("Failed to delete screenshot:", err);
      addToast({
        type: "error",
        title: "Failed to delete",
        description: "Could not delete the screenshot. Please try again.",
      });
    } finally {
      setDeletingIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleExportAsset = async (sourcePath: string, name: string) => {
    try {
      const exportedPath = await captureCommands.exportAsset(sourcePath, name);
      addToast({
        type: "success",
        title: "Export successful",
        description: `Saved to ${exportedPath}`,
      });
    } catch (err) {
      console.error("Failed to export:", err);
      addToast({
        type: "error",
        title: "Export failed",
        description: "Could not export the file. Please try again.",
      });
    }
  };

  const handleRemoveRecordingFromDemo = async (id: string) => {
    if (deletingIds.has(id)) return;

    const confirmed = await confirm({
      title: "Remove Recording",
      description:
        "Are you sure you want to remove this recording from the demo? The recording will still exist in the app.",
      confirmLabel: "Remove",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeletingIds((prev: Set<string>) => new Set(prev).add(id));
    try {
      await demoRecordingsApi.remove(demoId, id);
      await loadDemoMedia();
      addToast({
        type: "success",
        title: "Recording removed",
        description: "The recording has been removed from the demo.",
      });
    } catch (err) {
      console.error("Failed to remove recording:", err);
      addToast({
        type: "error",
        title: "Failed to remove",
        description: "Could not remove the recording. Please try again.",
      });
    } finally {
      setDeletingIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // Import screenshot from file
  const handleImportScreenshot = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] },
        ],
      });

      if (!selected) return;

      const sourcePath = selected as string;
      const fileName =
        sourcePath.split("/").pop() || `imported_${Date.now()}.png`;
      const dataDir = await appDataDir();
      const destPath = await join(
        dataDir,
        "screenshots",
        `${crypto.randomUUID()}_${fileName}`
      );

      // Copy file to app data directory
      await copyFile(sourcePath, destPath);

      // Create screenshot record (app-level, not exploration)
      // Note: Screenshots without test_id are app-level and fetched via app filter
      await screenshotsApi.create({
        test_id: null,
        title: fileName.replace(/\.[^/.]+$/, ""),
        image_path: destPath,
      });

      // Reload screenshots
      loadScreenshots(appId);

      addToast({
        type: "success",
        title: "Screenshot imported",
        description: "The image has been added to your screenshots.",
      });
    } catch (err) {
      console.error("Failed to import screenshot:", err);
      addToast({
        type: "error",
        title: "Import failed",
        description: "Could not import the image. Please try again.",
      });
    }
  };

  // Import video from file
  const handleImportVideo = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Videos", extensions: ["mp4", "mov", "webm", "avi", "mkv"] },
        ],
      });

      if (!selected) return;

      const sourcePath = selected as string;
      const fileName =
        sourcePath.split("/").pop() || `imported_${Date.now()}.mp4`;
      const dataDir = await appDataDir();
      const destPath = await join(
        dataDir,
        "recordings",
        `${crypto.randomUUID()}_${fileName}`
      );

      // Copy file to app data directory
      await copyFile(sourcePath, destPath);

      // Create recording record (app-level - no test_id)
      const newRecording = await recordingsApi.create({
        test_id: null,
        name: fileName.replace(/\.[^/.]+$/, ""),
      });

      // Update the recording with path and status
      await recordingsApi.update(newRecording.id, {
        recording_path: destPath,
        status: "completed",
      });

      // Reload recordings
      loadRecordings(appId);

      addToast({
        type: "success",
        title: "Video imported",
        description: "The video has been added to your recordings.",
      });
    } catch (err) {
      console.error("Failed to import video:", err);
      addToast({
        type: "error",
        title: "Import failed",
        description: "Could not import the video. Please try again.",
      });
    }
  };

  // Create a new demo video
  const handleCreateDemoVideo = async () => {
    try {
      const newDemo = await createDemo({
        app_id: appId,
        name: `Demo Video ${demos.filter((d: Demo) => d.app_id === appId).length + 1}`,
        format: "landscape_16_9" as DemoFormat,
        width: 1920,
        height: 1080,
        frame_rate: 60,
      });
      // Navigate to the demo editor
      navigate({ name: "demo-editor", appId, demoId: newDemo.id });
    } catch (err) {
      console.error("Failed to create demo:", err);
      addToast({
        type: "error",
        title: "Failed to create video",
        description: "Could not create a new demo video. Please try again.",
      });
    }
  };

  // Delete a demo video
  const handleDeleteDemoVideo = async (demoToDelete: Demo) => {
    if (deletingIds.has(demoToDelete.id)) return;

    const confirmed = await confirm({
      title: "Delete Demo Video",
      description:
        "Are you sure you want to delete this demo video? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeletingIds((prev: Set<string>) => new Set(prev).add(demoToDelete.id));
    try {
      await deleteDemo(demoToDelete.id);
      addToast({
        type: "success",
        title: "Demo deleted",
        description: "The demo video has been removed.",
      });
    } catch (err) {
      console.error("Failed to delete demo:", err);
      addToast({
        type: "error",
        title: "Failed to delete",
        description: "Could not delete the demo video. Please try again.",
      });
    } finally {
      setDeletingIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.delete(demoToDelete.id);
        return next;
      });
    }
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getAssetUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    try {
      return convertFileSrc(path);
    } catch (e) {
      const encodedPath = encodeURIComponent(path);
      return `https://asset.localhost/${encodedPath}`;
    }
  };

  // Use demo-specific recordings (completed ones only)
  const completedRecordings = demoRecordings.filter(
    (r) => r.recording_path && (r.status === "completed" || r.status === "recording")
  );

  // Filter demos for this app
  const appDemos = demos.filter((d: Demo) => d.app_id === appId);

  const navItems = [
    {
      id: "recordings" as Tab,
      icon: Film,
      label: "Recordings",
      count: completedRecordings.length,
    },
    {
      id: "screenshots" as Tab,
      icon: ImageIcon,
      label: "Screenshots",
      count: demoScreenshots.length,
    },
    {
      id: "videos" as Tab,
      icon: Video,
      label: "Videos",
      count: appDemos.length,
    },
  ];

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[var(--header-height)] border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0 bg-[var(--surface-primary)]">
        <div className="flex items-center gap-3">
          <button
            onClick={goBackToApp}
            className="p-2 -ml-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[var(--text-primary)] flex items-center justify-center">
              <span className="text-[var(--text-inverse)] font-bold text-sm">
                {app?.name.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-body-sm)]">
              <button
                onClick={() => navigate({ name: "app", appId })}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {app?.name || "..."}
              </button>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span className="font-semibold text-[var(--text-primary)]">
                Demo
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ name: "settings" })}
            className="p-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? "w-12" : "w-52"
          } border-r border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col transition-all duration-200 flex-shrink-0`}
        >
          {/* Sidebar Toggle Button */}
          <div
            className={`p-2 border-b border-[var(--border-default)] flex ${
              sidebarCollapsed ? "justify-center" : "justify-end"
            }`}
          >
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-[var(--text-primary)] text-[var(--text-inverse)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="text-[var(--text-body-sm)] font-medium flex-1 text-left">
                        {item.label}
                      </span>
                      {item.count !== undefined && item.count > 0 && (
                        <span
                          className={`px-1.5 py-0.5 text-[var(--text-caption)] ${
                            isActive
                              ? "bg-[var(--text-inverse)] text-[var(--text-primary)]"
                              : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-h-0 pb-24">
            {/* Recordings Tab */}
            {activeTab === "recordings" && (
              <div className="p-6">
                <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-6">
                  Screen Recordings
                </h2>
                {completedRecordings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Video className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                    <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">
                      No recordings yet
                    </h3>
                    <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] mb-4">
                      Use the bottom menu bar to start recording.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {completedRecordings.map((recording) => {
                      const videoUrl = getAssetUrl(recording.recording_path);
                      const webcamUrl = getAssetUrl(recording.webcam_path);
                      const isInProgress = recording.status === "recording";
                      const isDeleting = deletingIds.has(recording.id);
                      return (
                        <div
                          key={recording.id}
                          className={`group relative aspect-video bg-[var(--surface-secondary)] border overflow-hidden transition-all ${
                            isDeleting
                              ? "opacity-50 cursor-wait"
                              : isInProgress
                              ? "border-[var(--accent-error)] cursor-default"
                              : "border-[var(--border-default)] hover:border-[var(--border-strong)] cursor-pointer"
                          }`}
                        >
                          {videoUrl ? (
                            <video
                              src={videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                              onLoadedMetadata={(e) => {
                                e.currentTarget.currentTime = Math.min(
                                  1,
                                  e.currentTarget.duration / 2
                                );
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--surface-elevated)]">
                              <Video className="w-8 h-8 text-[var(--text-tertiary)]" />
                            </div>
                          )}
                          {/* Webcam Picture-in-Picture Preview */}
                          {webcamUrl && (
                            <div className="absolute bottom-2 right-2 w-16 h-12 rounded-full overflow-hidden border-2 border-white/50 shadow-lg">
                              <video
                                src={webcamUrl}
                                className="w-full h-full object-cover"
                                muted
                                preload="metadata"
                                onLoadedMetadata={(e) => {
                                  e.currentTarget.currentTime = Math.min(
                                    1,
                                    e.currentTarget.duration / 2
                                  );
                                }}
                              />
                            </div>
                          )}
                          {isDeleting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                          {!isInProgress && !isDeleting && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-5 h-5 text-white ml-0.5" />
                              </div>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white text-[var(--text-body-sm)] font-medium truncate">
                                {recording.name}
                              </p>
                              {recording.duration_ms && (
                                <p className="text-white/70 text-[var(--text-caption)]">
                                  {formatDuration(recording.duration_ms)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="absolute top-2 left-2 flex items-center gap-1">
                            <div className="px-2 py-1 bg-black/50 text-white text-[var(--text-caption)] flex items-center gap-1">
                              {isInProgress ? (
                                <>
                                  <div className="w-2 h-2 bg-[var(--accent-error)] animate-pulse" />
                                  Recording...
                                </>
                              ) : (
                                <>
                                  <Video className="w-3 h-3" />
                                  {recording.duration_ms
                                    ? formatDuration(recording.duration_ms)
                                    : "Video"}
                                </>
                              )}
                            </div>
                            {/* Webcam indicator badge */}
                            {recording.webcam_path && (
                              <div className="px-2 py-1 bg-black/50 text-white text-[var(--text-caption)] flex items-center gap-1">
                                <User className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          {!isInProgress && (
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              {recording.recording_path && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExportAsset(
                                      recording.recording_path!,
                                      `${recording.name || "recording"}.mov`
                                    );
                                  }}
                                  className="p-1.5 bg-black/50 text-white hover:bg-black/70"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveRecordingFromDemo(recording.id);
                                }}
                                disabled={isDeleting}
                                className="p-1.5 bg-black/50 text-white hover:bg-black/70 disabled:cursor-wait"
                              >
                                {isDeleting ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          )}
                          {/* Click overlay for playback */}
                          <div
                            className="absolute inset-0"
                            onClick={() => setPlayingRecording(recording)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Screenshots Tab */}
            {activeTab === "screenshots" && (
              <div className="p-6">
                <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-6">
                  Screenshots
                </h2>
                {screenshotsLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] animate-pulse"
                      />
                    ))}
                  </div>
                ) : demoScreenshots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Camera className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                    <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">
                      No screenshots yet
                    </h3>
                    <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] mb-4">
                      Use the bottom menu bar to capture screenshots.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {demoScreenshots.map((screenshot) => {
                      const assetUrl = getAssetUrl(screenshot.image_path);
                      const isDeleting = deletingIds.has(screenshot.id);
                      return (
                        <div
                          key={screenshot.id}
                          className={`group relative aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden transition-all ${
                            isDeleting
                              ? "opacity-50 cursor-wait"
                              : "hover:border-[var(--border-strong)] cursor-pointer"
                          }`}
                        >
                          {assetUrl ? (
                            <img
                              src={assetUrl}
                              alt={screenshot.title || "Screenshot"}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-[var(--text-tertiary)]" />
                            </div>
                          )}
                          {isDeleting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                              <p className="text-white text-[var(--text-body-sm)] font-medium truncate">
                                {screenshot.title || "Screenshot"}
                              </p>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportAsset(
                                  screenshot.image_path,
                                  `${screenshot.title || "screenshot"}.png`
                                );
                              }}
                              className="p-1.5 bg-black/50 text-white hover:bg-black/70"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveScreenshotFromDemo(screenshot.id);
                              }}
                              disabled={isDeleting}
                              className="p-1.5 bg-black/50 text-white hover:bg-black/70 disabled:cursor-wait"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {/* Click overlay for viewing */}
                          <div
                            className="absolute inset-0"
                            onClick={() => setViewingScreenshot(screenshot)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Videos Tab (Demo Videos) */}
            {activeTab === "videos" && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
                    Demo Videos
                  </h2>
                  <button
                    onClick={handleCreateDemoVideo}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--text-primary)] text-[var(--text-inverse)] text-[var(--text-body-sm)] font-medium hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-4 h-4" />
                    Create Video
                  </button>
                </div>

                {appDemos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Film className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                    <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">
                      No demo videos yet
                    </h3>
                    <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] mb-4 max-w-md">
                      Create demo videos using your recordings and screenshots.
                      Click &quot;Create Video&quot; to open the video editor.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {appDemos.map((demoItem) => {
                      const isDeleting = deletingIds.has(demoItem.id);
                      return (
                        <div
                          key={demoItem.id}
                          onClick={() =>
                            !isDeleting &&
                            navigate({
                              name: "demo-editor",
                              appId,
                              demoId: demoItem.id,
                            })
                          }
                          className={`group relative aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden transition-all ${
                            isDeleting
                              ? "opacity-50 cursor-wait"
                              : "hover:border-[var(--border-strong)] cursor-pointer"
                          }`}
                        >
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                            <Film className="w-8 h-8 text-[var(--text-tertiary)] mb-2" />
                            <p className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)] text-center truncate max-w-full">
                              {demoItem.name}
                            </p>
                            <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                              {formatDuration(demoItem.duration_ms)} &bull;{" "}
                              {demoItem.width}x{demoItem.height}
                            </p>
                          </div>
                          {isDeleting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDemoVideo(demoItem);
                              }}
                              disabled={isDeleting}
                              className="p-1.5 bg-black/50 text-white hover:bg-black/70 disabled:cursor-wait"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
        </main>
      </div>

      {/* Bottom Menu Bar - Floating Dock Style */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg">
          <button
            onClick={() => handleOpenWindowPicker("screenshot")}
            disabled={capturing}
            className="flex items-center gap-2 h-10 px-4 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)] disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span className="text-[var(--text-body-sm)]">Screenshot</span>
          </button>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {isRecording ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--status-error-bg)]">
                <div className="w-2 h-2 bg-[var(--accent-error)] animate-pulse" />
                <span className="text-[var(--text-body-sm)] text-[var(--accent-error)] font-medium">
                  Recording
                </span>
              </div>
              <button
                onClick={handleCancelRecording}
                className="h-10 px-3 border border-[var(--accent-error)] text-[var(--accent-error)] hover:bg-[var(--accent-error)]/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleStopRecording}
                className="flex items-center gap-2 h-10 px-4 bg-[var(--accent-error)] text-white font-medium hover:opacity-90 transition-opacity"
              >
                <Square className="w-4 h-4" />
                <span className="text-[var(--text-body-sm)]">Stop</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleOpenWindowPicker("recording")}
              className="flex items-center gap-2 h-10 px-4 bg-[var(--accent-error)] text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Video className="w-4 h-4" />
              <span className="text-[var(--text-body-sm)]">Record</span>
            </button>
          )}

          <div className="w-px h-6 bg-[var(--border-default)]" />

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 h-10 px-4 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <Upload className="w-4 h-4" />
            <span className="text-[var(--text-body-sm)]">Upload</span>
          </button>
        </div>
      </div>

      {/* Window Picker Modal */}
      {showWindowPicker && !showRecordingSetup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseWindowPicker}
        >
          <div
            className="w-full max-w-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
                {pickerMode === "screenshot"
                  ? "Select Window to Capture"
                  : "Select App to Record"}
              </h2>
              <button
                onClick={handleCloseWindowPicker}
                className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-auto">
              {loadingWindows ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 text-[var(--text-primary)] animate-spin" />
                  <span className="ml-3 text-[var(--text-secondary)]">
                    Loading windows...
                  </span>
                </div>
              ) : windows.length === 0 ? (
                <div className="p-8 text-center">
                  <Monitor className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No windows found</p>
                  <button
                    onClick={loadWindows}
                    className="mt-3 text-[var(--text-primary)] underline hover:no-underline text-[var(--text-body-sm)]"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="p-2">
                  {pickerMode === "recording" && displays.length > 0 && (
                    <div className="border-b border-[var(--border-default)] mb-2 pb-2">
                      <p className="px-3 py-1 text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">
                        Screens
                      </p>
                      {displays.map((display) => (
                        <button
                          key={display.id}
                          onClick={() => handleSelectDisplay(display)}
                          className="w-full p-3 text-left hover:bg-[var(--surface-hover)] transition-colors flex items-start gap-3"
                        >
                          <Monitor className="w-5 h-5 text-[var(--text-primary)] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[var(--text-primary)]">
                              {display.name}
                            </p>
                            <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                              {display.width} x {display.height}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {pickerMode === "recording" && windows.length > 0 && (
                    <p className="px-3 py-1 text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">
                      Windows
                    </p>
                  )}
                  {windows.map((window) => (
                    <button
                      key={`${window.id}-${window.window_id}`}
                      onClick={() => handleCaptureWindow(window)}
                      className="w-full p-3 text-left hover:bg-[var(--surface-hover)] transition-colors flex items-start gap-3"
                    >
                      <Monitor className="w-5 h-5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate">
                          {window.name || "Untitled"}
                        </p>
                        <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] truncate">
                          {window.owner}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--border-default)] bg-[var(--surface-primary)] flex items-center justify-between">
              <button
                onClick={loadWindows}
                disabled={loadingWindows}
                className="text-[var(--text-body-sm)] text-[var(--text-primary)] underline hover:no-underline disabled:opacity-50 flex items-center gap-1"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingWindows ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                {pickerMode === "screenshot"
                  ? "Click a window to capture it"
                  : "Click an app to configure recording"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recording Setup Modal */}
      {showRecordingSetup && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCancelRecordingSetup}
        >
          <div
            className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
                Recording Settings
              </h2>
              <button
                onClick={handleCancelRecordingSetup}
                className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="p-3 bg-[var(--surface-primary)] border border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--text-primary)] flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-[var(--text-inverse)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--text-primary)] truncate">
                      {selectedWindow
                        ? `${selectedWindow.owner} - ${selectedWindow.name}`
                        : selectedDisplay?.name || "Screen"}
                    </p>
                    <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">
                      {selectedWindow ? "Window" : "Full Screen"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRecordingSetup(false)}
                    className="text-[var(--text-body-sm)] text-[var(--text-primary)] underline hover:no-underline"
                  >
                    Change
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
                    Audio Source
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const audioList = await captureCommands.listAudioDevices();
                        setAudioDevices(audioList);
                      }}
                      className="text-[var(--text-caption)] text-[var(--text-primary)] underline hover:no-underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                    <button
                      onClick={() =>
                        captureCommands.openPrivacySettings("microphone")
                      }
                      className="text-[var(--text-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    >
                      Grant Access
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {audioDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => setSelectedAudioDevice(device.id)}
                      className={`w-full p-3 border text-left flex items-center gap-3 transition-colors ${
                        selectedAudioDevice === device.id
                          ? "border-[var(--border-strong)] bg-[var(--surface-hover)]"
                          : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {device.id === "none" ? (
                        <MicOff className="w-5 h-5 text-[var(--text-tertiary)]" />
                      ) : (
                        <Mic className="w-5 h-5 text-[var(--text-tertiary)]" />
                      )}
                      <span
                        className={
                          selectedAudioDevice === device.id
                            ? "text-[var(--text-primary)] font-medium"
                            : "text-[var(--text-primary)]"
                        }
                      >
                        {device.name}
                      </span>
                      {device.is_default && (
                        <span className="ml-auto text-[var(--text-caption)] text-[var(--text-tertiary)]">
                          Default
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <MousePointer2 className="w-5 h-5 text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-primary)]">Show cursor</span>
                </div>
                <button
                  onClick={() => setShowCursorInRecording(!showCursorInRecording)}
                  className={`relative h-6 w-11 transition-colors ${
                    showCursorInRecording
                      ? "bg-[var(--text-primary)]"
                      : "bg-[var(--surface-active)]"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 bg-white shadow transition-transform ${
                      showCursorInRecording ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Webcam/Face Recording Option */}
              <div className="flex items-center justify-between p-3 border border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-primary)]">
                    Record with webcam
                  </span>
                </div>
                <button
                  onClick={() => setRecordWithWebcam(!recordWithWebcam)}
                  className={`relative h-6 w-11 transition-colors ${
                    recordWithWebcam
                      ? "bg-[var(--text-primary)]"
                      : "bg-[var(--surface-active)]"
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 bg-white shadow transition-transform ${
                      recordWithWebcam ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border-default)] bg-[var(--surface-primary)] flex items-center justify-end gap-3">
              <button
                onClick={handleCancelRecordingSetup}
                className="px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRecordingWithSetup}
                className="px-4 py-2 bg-[var(--accent-error)] text-white font-medium flex items-center gap-2 hover:opacity-90"
              >
                <Video className="w-4 h-4" />
                Start Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="w-full max-w-sm bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
                Upload File
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  handleImportScreenshot();
                }}
                className="w-full p-4 border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-[var(--surface-elevated)] flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-[var(--text-primary)]">
                    Image
                  </h3>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                    PNG, JPG, GIF, WebP
                  </p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  handleImportVideo();
                }}
                className="w-full p-4 border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] transition-colors flex items-center gap-4"
              >
                <div className="w-12 h-12 bg-[var(--surface-elevated)] flex items-center justify-center">
                  <Film className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-[var(--text-primary)]">
                    Video
                  </h3>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                    MP4, MOV, WebM, AVI, MKV
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {playingRecording && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPlayingRecording(null)}
        >
          <div
            className="relative w-full max-w-5xl bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => setPlayingRecording(null)}
                className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-black">
              <video
                src={getAssetUrl(playingRecording.recording_path)}
                className="w-full h-full"
                controls
                autoPlay
              />
              {/* Webcam Picture-in-Picture */}
              {playingRecording.webcam_path && (
                <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden border-2 border-white/50 shadow-lg">
                  <video
                    src={getAssetUrl(playingRecording.webcam_path)}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted
                  />
                </div>
              )}
            </div>
            <div className="p-4 bg-[var(--surface-secondary)]">
              <h3 className="text-[var(--text-heading-sm)] font-medium text-[var(--text-primary)]">
                {playingRecording.name}
              </h3>
              {playingRecording.duration_ms && (
                <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] mt-1">
                  {formatDuration(playingRecording.duration_ms)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {viewingScreenshot && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingScreenshot(null)}
        >
          <div
            className="relative w-full max-w-5xl bg-black rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                onClick={() => {
                  handleExportAsset(
                    viewingScreenshot.image_path,
                    `${viewingScreenshot.title || "screenshot"}.png`
                  );
                }}
                className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewingScreenshot(null)}
                className="p-2 bg-black/50 text-white hover:bg-black/70 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={getAssetUrl(viewingScreenshot.image_path)}
              alt={viewingScreenshot.title || "Screenshot"}
              className="w-full h-auto max-h-[80vh] object-contain"
            />
            <div className="p-4 bg-[var(--surface-secondary)]">
              <h3 className="text-[var(--text-heading-sm)] font-medium text-[var(--text-primary)]">
                {viewingScreenshot.title || "Screenshot"}
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
