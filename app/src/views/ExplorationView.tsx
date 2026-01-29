"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Camera, Video, Square, Image as ImageIcon, Settings, Clock, FileText, CheckCircle, AlertCircle, Trash2, Play, Monitor, X, Loader2, RefreshCw, Download, Mic, MicOff, MousePointer2, Bug, MessageSquare, ChevronLeft, ChevronRight, CheckSquare, Film, Upload, GitBranch, Plus } from "lucide-react";
import { useAppsStore, useExplorationsStore, useRecordingsStore, useScreenshotsStore, useRouterStore, useSettingsStore, useDiagramsStore } from "@/lib/stores";
import { capture as captureCommands, screenshots as screenshotsApi, recordings as recordingsApi, documentBlocks as documentBlocksApi, explorationTodos as explorationTodosApi, annotations as annotationsApi, type WindowInfo, type DisplayInfo, type AudioDevice } from "@/lib/tauri/commands";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { copyFile } from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";
import type { UpdateExploration, ScreenshotMarker, Annotation } from "@/lib/tauri/types";
import { Editor as BlockEditor, type Block } from "@/components/editor";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ExplorationCommandPalette, useExplorationCommandPalette } from "@/components/explorations";
import { useArchitectureDocsStore } from "@/lib/stores";

type ExplorationStatus = "draft" | "in_progress" | "passed" | "failed";

const statusConfig: Record<ExplorationStatus, { icon: typeof Clock; color: string; label: string }> = {
  draft: { icon: FileText, color: "var(--text-tertiary)", label: "Draft" },
  in_progress: { icon: Clock, color: "var(--accent-warning)", label: "In Progress" },
  passed: { icon: CheckCircle, color: "var(--accent-success)", label: "Completed" },
  failed: { icon: AlertCircle, color: "var(--accent-error)", label: "Issues Found" },
};

type Tab = "doc" | "checklist" | "annotations" | "screenshots" | "recordings" | "diagrams";
type PickerMode = "screenshot" | "recording";
type AnnotationSeverity = "info" | "warning" | "error" | "success";

const annotationSeverityConfig: Record<AnnotationSeverity, { color: string; bgColor: string; label: string }> = {
  info: { color: "#3B82F6", bgColor: "rgba(59, 130, 246, 0.15)", label: "Info" },
  warning: { color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.15)", label: "Warning" },
  error: { color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.15)", label: "Bug" },
  success: { color: "#10B981", bgColor: "rgba(16, 185, 129, 0.15)", label: "Works" },
};

interface ExplorationViewProps {
  appId: string;
  explorationId: string;
  initialTab?: 'doc' | 'annotations' | 'screenshots' | 'recordings' | 'diagrams';
}

export function ExplorationView({ appId, explorationId, initialTab }: ExplorationViewProps) {
  const { navigate } = useRouterStore();
  const confirm = useConfirm();
  const { addToast } = useToast();

  // Navigate back to app grid view
  const goBackToApp = useCallback(() => {
    navigate({ name: 'app', appId });
  }, [navigate, appId]);
  const { getById: getAppById, load: loadApps } = useAppsStore();
  const { getById: getExplorationById, load: loadExplorations, update: updateExploration } = useExplorationsStore();
  const { items: recordings, isRecording, loadByExploration: loadRecordings, startRecording, stopRecording, cancelRecording, checkRecordingStatus, delete: deleteRecording } = useRecordingsStore();

  const { items: screenshots, loading: screenshotsLoading, load: loadScreenshots, delete: deleteScreenshot } = useScreenshotsStore();
  const { items: diagrams, loading: diagramsLoading, loadByExploration: loadDiagrams, create: createDiagram, delete: deleteDiagram } = useDiagramsStore();
  const { create: createArchitectureDoc } = useArchitectureDocsStore();

  // Command palette for quick creation
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useExplorationCommandPalette();

  // Screenshot markers from database
  const [screenshotMarkers, setScreenshotMarkers] = useState<ScreenshotMarker[]>([]);

  // Recording annotations from database
  const [recordingAnnotations, setRecordingAnnotations] = useState<Array<Annotation & { sourceName: string }>>([]);

  // Collect all annotations from recordings and screenshots for the annotations tab
  const allAnnotations = [
    // Recording annotations from database
    ...recordingAnnotations.map(a => ({
      id: a.id,
      timestamp_ms: a.timestamp_ms,
      title: a.title,
      description: a.description || '',
      severity: a.severity || 'info',
      sourceId: a.recording_id,
      sourceName: a.sourceName,
      sourceType: 'recording' as const
    })),
    // Screenshot markers from database
    ...screenshotMarkers.map(marker => {
      const screenshot = screenshots.find(s => s.id === marker.screenshot_id);
      return {
        id: marker.id,
        title: marker.title,
        description: marker.description || '',
        severity: marker.severity || 'info',
        sourceId: marker.screenshot_id,
        sourceName: screenshot?.title || 'Screenshot',
        sourceType: 'screenshot' as const
      };
    })
  ];

  // Categorize annotations by severity for the kanban view
  const bugAnnotations = allAnnotations.filter(a => a.severity === 'error');
  const otherAnnotations = allAnnotations.filter(a => a.severity !== 'error');
  const { items: settings, load: loadSettings } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<Tab>(initialTab || "doc");
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
  // Checklist blocks for the todo-only editor
  const [checklistBlocks, setChecklistBlocks] = useState<Block[]>([]);
  const [checklistInitialized, setChecklistInitialized] = useState(false);

  // Document blocks for the block-based editor
  const [documentBlocks, setDocumentBlocks] = useState<Block[]>([]);
  const [blocksInitialized, setBlocksInitialized] = useState(false);
  // Track the last loaded exploration ID to reload when switching
  const [loadedExplorationId, setLoadedExplorationId] = useState<string | null>(null);

  const app = getAppById(appId);
  const exploration = getExplorationById(explorationId);

  // Load document blocks and checklist from database
  useEffect(() => {
    // Reset when switching to a different exploration
    if (explorationId !== loadedExplorationId) {
      setBlocksInitialized(false);
      setChecklistInitialized(false);
      setLoadedExplorationId(explorationId);
      return;
    }

    // Load document blocks from database
    const loadData = async () => {
      try {
        // Load document blocks
        const dbBlocks = await documentBlocksApi.list(explorationId);
        if (dbBlocks.length > 0) {
          // Convert DB format to editor Block format
          const blocks: Block[] = dbBlocks.map(b => ({
            id: b.id,
            type: b.block_type as Block['type'],
            content: b.content,
            meta: {
              checked: b.checked === 1,
              language: b.language || undefined,
              calloutType: (b.callout_type as 'info' | 'warning' | 'error' | 'success') || undefined,
              src: b.image_path || undefined,
              caption: b.image_caption || undefined,
              expanded: b.collapsed !== 1,
            }
          }));
          setDocumentBlocks(blocks);
        } else {
          setDocumentBlocks([]);
        }
        setBlocksInitialized(true);

        // Load checklist todos
        const dbTodos = await explorationTodosApi.list(explorationId);
        if (dbTodos.length > 0) {
          // Convert DB format to editor Block format
          const todos: Block[] = dbTodos.map(t => ({
            id: t.id,
            type: 'todo' as const,
            content: t.content,
            meta: { checked: t.checked === 1 }
          }));
          setChecklistBlocks(todos);
        } else {
          // Start with one empty todo item
          setChecklistBlocks([{
            id: crypto.randomUUID(),
            type: 'todo',
            content: '',
            meta: { checked: false }
          }]);
        }
        setChecklistInitialized(true);
      } catch (err) {
        console.error("Failed to load document data:", err);
        setDocumentBlocks([]);
        setChecklistBlocks([{
          id: crypto.randomUUID(),
          type: 'todo',
          content: '',
          meta: { checked: false }
        }]);
        setBlocksInitialized(true);
        setChecklistInitialized(true);
      }
    };

    loadData();
  }, [explorationId, loadedExplorationId]);

  // Load screenshot markers from database
  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const markers = await screenshotsApi.listMarkersByTest(explorationId);
        setScreenshotMarkers(markers);
      } catch (err) {
        console.error("Failed to load screenshot markers:", err);
      }
    };
    loadMarkers();
  }, [explorationId, screenshots]);

  // Load recording annotations from database
  useEffect(() => {
    const loadRecordingAnnotations = async () => {
      try {
        // Filter recordings to only those belonging to this exploration
        const explorationRecordings = recordings.filter(r => r.test_id === explorationId);

        // Load annotations for all recordings in this exploration
        const allAnnotations: Array<Annotation & { sourceName: string }> = [];
        for (const recording of explorationRecordings) {
          const annotations = await annotationsApi.list(recording.id);
          allAnnotations.push(...annotations.map(a => ({
            ...a,
            sourceName: recording.name
          })));
        }
        setRecordingAnnotations(allAnnotations);
      } catch (err) {
        console.error("Failed to load recording annotations:", err);
      }
    };
    // Filter recordings to only those belonging to this exploration
    const explorationRecordings = recordings.filter(r => r.test_id === explorationId);
    if (explorationRecordings.length > 0) {
      loadRecordingAnnotations();
    } else {
      setRecordingAnnotations([]);
    }
  }, [recordings, explorationId]);

  // Auto-save document blocks and checklist blocks with debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  useEffect(() => {
    if (!blocksInitialized || !checklistInitialized) return;

    // Create a key for change detection
    const saveKey = JSON.stringify({ documentBlocks, checklistBlocks });

    // Skip if content hasn't changed
    if (saveKey === lastSavedRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Save document blocks to database
        // Filter out block types not supported in database (video, file, table)
        const supportedTypes = ['paragraph', 'heading1', 'heading2', 'heading3', 'quote', 'bulletList', 'numberedList', 'todo', 'code', 'image', 'divider', 'callout', 'toggle'];
        const dbBlocks = documentBlocks
          .filter(b => supportedTypes.includes(b.type))
          .map((b, i) => ({
            test_id: explorationId,
            block_type: b.type as 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'quote' | 'bulletList' | 'numberedList' | 'todo' | 'code' | 'image' | 'divider' | 'callout' | 'toggle',
            content: b.content || '',
            checked: b.meta?.checked ? true : undefined,
            language: b.meta?.language || undefined,
            callout_type: b.meta?.calloutType || undefined,
            image_path: b.meta?.src || undefined,
            image_caption: b.meta?.caption || undefined,
            collapsed: b.meta?.expanded === false ? true : undefined,
            indent_level: 0,
            sort_order: i,
          }));
        await documentBlocksApi.bulkReplace(explorationId, dbBlocks);

        // Save checklist todos to database
        const dbTodos = checklistBlocks.map((t, i) => ({
          test_id: explorationId,
          content: t.content || '',
          checked: t.meta?.checked ? true : undefined,
          sort_order: i,
        }));
        await explorationTodosApi.bulkReplace(explorationId, dbTodos);

        lastSavedRef.current = saveKey;
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [documentBlocks, checklistBlocks, blocksInitialized, checklistInitialized, explorationId]);

  // Initialize recording settings from stored settings
  useEffect(() => {
    if (settings["record_audio"] === "true") {
      setSelectedAudioDevice("microphone");
    }
    if (settings["show_cursor"] === "false") {
      setShowCursorInRecording(false);
    }
  }, [settings]);

  useEffect(() => {
    loadApps();
    loadExplorations();
    loadSettings();
    checkRecordingStatus();
  }, [loadApps, loadExplorations, loadSettings, checkRecordingStatus]);

  useEffect(() => {
    if (explorationId) {
      loadRecordings(explorationId);
      loadScreenshots({ test_id: explorationId });
      loadDiagrams(explorationId);
    }
  }, [explorationId, loadRecordings, loadScreenshots, loadDiagrams]);

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
        await captureCommands.windowScreenshot(
          appId, // App ID for screenshots linked to this exploration
          explorationId,
          `${window.owner} - ${window.name}`,
          window.owner,
          window.name,
          window.window_id
        );
        loadScreenshots({ test_id: explorationId });
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
          appId, // Include appId for app-level association
          explorationId,
          name: `${selectedWindow.owner} - ${selectedWindow.name}`,
          windowId: selectedWindow.window_id,
          bounds: selectedWindow.bounds,
          audioDevice: selectedAudioDevice,
          showCursor: showCursorInRecording,
        });
      } else if (selectedDisplay) {
        await startRecording({
          appId, // Include appId for app-level association
          explorationId,
          name: selectedDisplay.name,
          displayId: selectedDisplay.id,
          audioDevice: selectedAudioDevice,
          showCursor: showCursorInRecording,
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
      await stopRecording();
      setTimeout(() => loadRecordings(explorationId), 500);
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
      loadRecordings(explorationId);
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

  const handleStatusChange = async (newStatus: ExplorationStatus) => {
    if (!exploration) return;
    try {
      await updateExploration(explorationId, { status: newStatus } as UpdateExploration);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDeleteScreenshot = async (id: string) => {
    if (deletingIds.has(id)) return;

    const confirmed = await confirm({
      title: "Delete Screenshot",
      description: "Are you sure you want to delete this screenshot? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await deleteScreenshot(id);
      addToast({
        type: "success",
        title: "Screenshot deleted",
        description: "The screenshot has been removed.",
      });
    } catch (err) {
      console.error("Failed to delete screenshot:", err);
      addToast({
        type: "error",
        title: "Failed to delete",
        description: "Could not delete the screenshot. Please try again.",
      });
    } finally {
      setDeletingIds(prev => {
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

  const handleDeleteRecording = async (id: string) => {
    if (deletingIds.has(id)) return;

    const confirmed = await confirm({
      title: "Delete Recording",
      description: "Are you sure you want to delete this recording? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await deleteRecording(id);
      addToast({
        type: "success",
        title: "Recording deleted",
        description: "The recording has been removed.",
      });
    } catch (err) {
      console.error("Failed to delete recording:", err);
      addToast({
        type: "error",
        title: "Failed to delete",
        description: "Could not delete the recording. Please try again.",
      });
    } finally {
      setDeletingIds(prev => {
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
        filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] }],
      });

      if (!selected) return;

      const sourcePath = selected as string;
      const fileName = sourcePath.split('/').pop() || `imported_${Date.now()}.png`;
      const dataDir = await appDataDir();
      const destPath = await join(dataDir, "screenshots", `${crypto.randomUUID()}_${fileName}`);

      // Copy file to app data directory
      await copyFile(sourcePath, destPath);

      // Create screenshot record
      await screenshotsApi.create({
        test_id: explorationId,
        title: fileName.replace(/\.[^/.]+$/, ""),
        image_path: destPath,
      });

      // Reload screenshots
      loadScreenshots({ test_id: explorationId });

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
        filters: [{ name: "Videos", extensions: ["mp4", "mov", "webm", "avi", "mkv"] }],
      });

      if (!selected) return;

      const sourcePath = selected as string;
      const fileName = sourcePath.split('/').pop() || `imported_${Date.now()}.mp4`;
      const dataDir = await appDataDir();
      const destPath = await join(dataDir, "recordings", `${crypto.randomUUID()}_${fileName}`);

      // Copy file to app data directory
      await copyFile(sourcePath, destPath);

      // Create recording record
      await recordingsApi.create({
        test_id: explorationId,
        name: fileName.replace(/\.[^/.]+$/, ""),
      });

      // Get the created recording and update its path
      const newRecordings = await recordingsApi.listByTest(explorationId);
      const newRecording = newRecordings.find(r => r.name === fileName.replace(/\.[^/.]+$/, ""));
      if (newRecording) {
        await recordingsApi.update(newRecording.id, {
          recording_path: destPath,
          status: "completed",
        });
      }

      // Reload recordings
      loadRecordings(explorationId);

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

  // Handle creating graph from command palette
  const handleCreateGraph = useCallback(async (name: string, _nodeType: string) => {
    try {
      const diagram = await createDiagram({ test_id: explorationId, name, diagram_type: "mindmap" });
      addToast({ type: "success", title: "Graph created", description: `"${name}" has been created.` });
      // Navigate to the new diagram
      navigate({ name: "diagram-editor", appId, explorationId, diagramId: diagram.id });
    } catch (err) {
      console.error("Failed to create graph:", err);
      addToast({ type: "error", title: "Failed to create graph", description: "Please try again." });
    }
  }, [createDiagram, explorationId, appId, navigate, addToast]);

  // Handle creating architecture doc from command palette
  const handleCreateArchitectureDoc = useCallback(async (name: string) => {
    try {
      const doc = await createArchitectureDoc({ app_id: appId, name });
      addToast({ type: "success", title: "Architecture doc created", description: `"${name}" has been created.` });
      // Navigate to the new doc
      navigate({ name: "architecture-doc", appId, docId: doc.id });
    } catch (err) {
      console.error("Failed to create architecture doc:", err);
      addToast({ type: "error", title: "Failed to create doc", description: "Please try again." });
    }
  }, [createArchitectureDoc, appId, navigate, addToast]);

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return "0:00";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getStatusConfig = (status: string) => statusConfig[status as ExplorationStatus] || statusConfig.draft;

  const getAssetUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    try {
      return convertFileSrc(path);
    } catch (e) {
      const encodedPath = encodeURIComponent(path);
      return `https://asset.localhost/${encodedPath}`;
    }
  };

  if (!exploration && explorationId) {
    return (
      <div className="h-screen bg-[var(--surface-primary)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[var(--text-heading-md)] font-semibold text-[var(--text-primary)] mb-2">Exploration not found</h2>
          <button onClick={() => navigate({ name: "app", appId })} className="text-[var(--text-primary)] underline hover:no-underline">Go back to app</button>
        </div>
      </div>
    );
  }

  const status = exploration ? getStatusConfig(exploration.status) : statusConfig.draft;
  const StatusIcon = status.icon;
  const completedRecordings = recordings.filter(r => r.recording_path && (r.status === 'completed' || r.status === 'recording'));

  const navItems = [
    { id: "doc" as Tab, icon: FileText, label: "Document" },
    { id: "diagrams" as Tab, icon: GitBranch, label: "Diagrams", count: diagrams.length },
    { id: "annotations" as Tab, icon: Bug, label: "Annotations" },
    { id: "screenshots" as Tab, icon: ImageIcon, label: "Screenshots", count: screenshots.length },
    { id: "recordings" as Tab, icon: Film, label: "Recordings", count: completedRecordings.length },
  ];

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[var(--header-height)] border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0 bg-[var(--surface-primary)]">
        <div className="flex items-center gap-3">
          <button onClick={goBackToApp} className="p-2 -ml-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[var(--text-primary)] flex items-center justify-center">
              <span className="text-[var(--text-inverse)] font-bold text-sm">{app?.name.charAt(0).toUpperCase() || "?"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-body-sm)]">
              <button onClick={() => navigate({ name: "app", appId })} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">{app?.name || "..."}</button>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span className="font-semibold text-[var(--text-primary)]">{exploration?.name || "Loading..."}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={exploration?.status || "draft"} onChange={(e) => handleStatusChange(e.target.value as ExplorationStatus)} className="appearance-none h-8 pl-8 pr-6 text-[var(--text-caption)] font-medium uppercase tracking-wide border border-[var(--border-default)] bg-[var(--surface-secondary)] cursor-pointer focus:outline-none focus:border-[var(--border-strong)]" style={{ color: status.color }}>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="passed">Completed</option>
              <option value="failed">Issues Found</option>
            </select>
            <StatusIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: status.color }} />
          </div>
          <button onClick={() => navigate({ name: "settings" })} className="p-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-12' : 'w-52'} border-r border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col transition-all duration-200 flex-shrink-0`}>
          {/* Sidebar Toggle */}
          <div className={`p-2 border-b border-[var(--border-default)] flex ${sidebarCollapsed ? 'justify-center' : 'justify-end'}`}>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
                  className={`w-full flex items-center gap-3 px-3 py-2 transition-colors ${isActive ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]'}`}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <>
                      <span className="text-[var(--text-body-sm)] font-medium flex-1 text-left">{item.label}</span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className={`px-1.5 py-0.5 text-[var(--text-caption)] ${isActive ? 'bg-[var(--text-inverse)] text-[var(--text-primary)]' : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)]'}`}>{item.count}</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>

        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-auto min-h-0 ${activeTab !== "doc" ? "pb-24" : ""}`}>
          {/* Document Tab - Block-based Editor with Checklist sidebar */}
          {activeTab === "doc" && (
            <div className="h-full flex">
              {/* Main Editor */}
              <div className="flex-1 h-full overflow-auto">
                <BlockEditor
                  initialBlocks={documentBlocks.length > 0 ? documentBlocks : undefined}
                  onChange={setDocumentBlocks}
                  placeholder="Start writing your exploration notes... Type '/' for commands"
                  autoFocus
                  className="h-full"
                  screenshots={screenshots.map(s => ({
                    id: s.id,
                    title: s.title,
                    imagePath: getAssetUrl(s.image_path) || ''
                  }))}
                />
              </div>

              {/* Checklist Sidebar */}
              <div className="w-80 border-l border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col h-full">
                {/* Checklist Header */}
                <div className="flex-shrink-0 border-b border-[var(--border-default)] px-4 py-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[var(--text-primary)]" />
                  <span className="text-[var(--text-body-sm)] font-semibold text-[var(--text-primary)]">Checklist</span>
                </div>

                {/* Checklist Items */}
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {checklistBlocks.map((block, index) => (
                    <div key={block.id} className="flex items-start gap-3 p-3 bg-[var(--surface-primary)] border border-[var(--border-default)]">
                      <button
                        type="button"
                        onClick={() => {
                          const newBlocks = [...checklistBlocks];
                          newBlocks[index] = {
                            ...block,
                            meta: { ...block.meta, checked: !block.meta?.checked }
                          };
                          setChecklistBlocks(newBlocks);
                        }}
                        className={`flex-shrink-0 w-5 h-5 mt-0.5 border flex items-center justify-center transition-colors ${
                          block.meta?.checked
                            ? 'bg-[var(--text-primary)] border-[var(--text-primary)]'
                            : 'border-[var(--border-default)] hover:border-[var(--text-secondary)]'
                        }`}
                      >
                        {block.meta?.checked && (
                          <svg className="w-3 h-3 text-[var(--text-inverse)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <textarea
                        value={block.content}
                        onChange={(e) => {
                          const newBlocks = [...checklistBlocks];
                          newBlocks[index] = { ...block, content: e.target.value };
                          setChecklistBlocks(newBlocks);
                          // Auto-resize textarea
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            // Add new item after this one
                            const newBlocks = [...checklistBlocks];
                            newBlocks.splice(index + 1, 0, {
                              id: crypto.randomUUID(),
                              type: 'todo',
                              content: '',
                              meta: { checked: false }
                            });
                            setChecklistBlocks(newBlocks);
                            // Focus the new item
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('[data-checklist-input]');
                              const nextInput = inputs[index + 1] as HTMLTextAreaElement;
                              nextInput?.focus();
                            }, 0);
                          } else if (e.key === 'Backspace' && block.content === '' && checklistBlocks.length > 1) {
                            e.preventDefault();
                            const newBlocks = checklistBlocks.filter((_, i) => i !== index);
                            setChecklistBlocks(newBlocks);
                            // Focus previous item
                            setTimeout(() => {
                              const inputs = document.querySelectorAll('[data-checklist-input]');
                              const prevInput = inputs[Math.max(0, index - 1)] as HTMLTextAreaElement;
                              prevInput?.focus();
                            }, 0);
                          }
                        }}
                        ref={(el) => {
                          // Auto-resize on mount
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                          }
                        }}
                        placeholder="Add a task..."
                        rows={1}
                        data-checklist-input
                        className={`flex-1 bg-transparent text-[var(--text-body-sm)] outline-none placeholder:text-[var(--text-tertiary)] resize-none overflow-hidden ${
                          block.meta?.checked ? 'line-through text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]'
                        }`}
                      />
                    </div>
                  ))}
                </div>

                {/* Add Task Button */}
                <div className="flex-shrink-0 p-3 border-t border-[var(--border-default)]">
                  <button
                    onClick={() => {
                      setChecklistBlocks([...checklistBlocks, {
                        id: crypto.randomUUID(),
                        type: 'todo',
                        content: '',
                        meta: { checked: false }
                      }]);
                      // Focus the new item
                      setTimeout(() => {
                        const inputs = document.querySelectorAll('[data-checklist-input]');
                        const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
                        lastInput?.focus();
                      }, 0);
                    }}
                    className="w-full px-3 py-2 border border-dashed border-[var(--border-default)] text-[var(--text-body-sm)] text-[var(--text-secondary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Add Task
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Annotations Tab */}
          {activeTab === "annotations" && (
            <div className="p-6">
              {/* Bugs Section */}
              <div className="mb-8">
                <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Bug className="w-5 h-5 text-[var(--accent-error)]" />
                  Bugs ({bugAnnotations.length})
                </h2>
                {bugAnnotations.length === 0 ? (
                  <div className="bg-[var(--surface-secondary)] border border-[var(--border-default)] p-6 text-center">
                    <Bug className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">No bugs reported</h3>
                    <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">Add annotations with &quot;error&quot; severity to screenshots or recordings to report bugs.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bugAnnotations.map((annotation) => (
                      <div
                        key={annotation.id}
                        onClick={() => {
                          if (annotation.sourceType === 'screenshot') {
                            navigate({ name: 'screenshot-editor', appId, explorationId, screenshotId: annotation.sourceId });
                          } else {
                            navigate({ name: 'video-editor', appId, explorationId, recordingId: annotation.sourceId, timestamp: annotation.timestamp_ms });
                          }
                        }}
                        className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--accent-error)] cursor-pointer transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Bug className="w-5 h-5 text-[var(--accent-error)] flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] truncate">{annotation.title}</h3>
                            {annotation.description && (
                              <p className="text-[var(--text-body-sm)] text-[var(--text-secondary)] mt-1 line-clamp-2">{annotation.description}</p>
                            )}
                            <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
                              {annotation.sourceType === 'screenshot' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                              {annotation.sourceName}
                              {annotation.sourceType === 'recording' && annotation.timestamp_ms !== undefined && (
                                <span className="ml-2 font-mono">@ {Math.floor(annotation.timestamp_ms / 60000)}:{String(Math.floor((annotation.timestamp_ms % 60000) / 1000)).padStart(2, '0')}</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Other Annotations */}
              <div>
                <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[var(--text-primary)]" />
                  Other Annotations ({otherAnnotations.length})
                </h2>
                {otherAnnotations.length === 0 ? (
                  <div className="bg-[var(--surface-secondary)] border border-[var(--border-default)] p-6 text-center">
                    <MessageSquare className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                    <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">No annotations yet</h3>
                    <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">Annotations from screenshots and recordings will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {otherAnnotations.map((annotation) => {
                      const severityConfig = annotationSeverityConfig[annotation.severity as AnnotationSeverity] || annotationSeverityConfig.info;
                      return (
                        <div
                          key={annotation.id}
                          onClick={() => {
                            if (annotation.sourceType === 'screenshot') {
                              navigate({ name: 'screenshot-editor', appId, explorationId, screenshotId: annotation.sourceId });
                            } else {
                              navigate({ name: 'video-editor', appId, explorationId, recordingId: annotation.sourceId, timestamp: annotation.timestamp_ms });
                            }
                          }}
                          className="p-4 bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] cursor-pointer transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <MessageSquare className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: severityConfig.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] truncate">{annotation.title}</h3>
                                <span
                                  className="text-[var(--text-caption)] px-1.5 py-0.5 rounded text-xs font-medium"
                                  style={{ backgroundColor: severityConfig.bgColor, color: severityConfig.color }}
                                >
                                  {severityConfig.label}
                                </span>
                              </div>
                              {annotation.description && (
                                <p className="text-[var(--text-body-sm)] text-[var(--text-secondary)] mt-1 line-clamp-2">{annotation.description}</p>
                              )}
                              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
                                {annotation.sourceType === 'screenshot' ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                                {annotation.sourceName}
                                {annotation.sourceType === 'recording' && annotation.timestamp_ms !== undefined && (
                                  <span className="ml-2 font-mono">@ {Math.floor(annotation.timestamp_ms / 60000)}:{String(Math.floor((annotation.timestamp_ms % 60000) / 1000)).padStart(2, '0')}</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Screenshots Tab */}
          {activeTab === "screenshots" && (
            <div className="p-6">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-6">Screenshots</h2>
              {screenshotsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] animate-pulse" />)}
                </div>
              ) : screenshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Camera className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                  <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">No screenshots yet</h3>
                  <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] mb-4">Use the bottom menu bar to capture screenshots.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {screenshots.map((screenshot) => {
                    const assetUrl = getAssetUrl(screenshot.image_path);
                    const isDeleting = deletingIds.has(screenshot.id);
                    return (
                      <div key={screenshot.id} onClick={() => !isDeleting && navigate({ name: "screenshot-editor", appId, explorationId, screenshotId: screenshot.id })} className={`group relative aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden transition-all ${isDeleting ? 'opacity-50 cursor-wait' : 'hover:border-[var(--border-strong)] cursor-pointer'}`}>
                        {assetUrl ? (
                          <img src={assetUrl} alt={screenshot.title || "Screenshot"} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-[var(--text-tertiary)]" /></div>
                        )}
                        {isDeleting && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white text-[var(--text-body-sm)] font-medium truncate">{screenshot.title || "Screenshot"}</p>
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => { e.stopPropagation(); handleExportAsset(screenshot.image_path, `${screenshot.title || 'screenshot'}.png`); }} className="p-1.5 bg-black/50 text-white hover:bg-black/70">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteScreenshot(screenshot.id); }} disabled={isDeleting} className="p-1.5 bg-black/50 text-white hover:bg-black/70 disabled:cursor-wait">
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recordings Tab */}
          {activeTab === "recordings" && (
            <div className="p-6">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-6">Screen Recordings</h2>
              {completedRecordings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Video className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                  <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">No recordings yet</h3>
                  <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] mb-4">Use the bottom menu bar to start recording.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {completedRecordings.map((recording) => {
                    const videoUrl = getAssetUrl(recording.recording_path);
                    const isInProgress = recording.status === 'recording';
                    const isDeleting = deletingIds.has(recording.id);
                    return (
                      <div key={recording.id} onClick={() => !isInProgress && !isDeleting && navigate({ name: "video-editor", appId, explorationId, recordingId: recording.id })} className={`group relative aspect-video bg-[var(--surface-secondary)] border overflow-hidden transition-all ${isDeleting ? 'opacity-50 cursor-wait' : isInProgress ? 'border-[var(--accent-error)] cursor-default' : 'border-[var(--border-default)] hover:border-[var(--border-strong)] cursor-pointer'}`}>
                        {videoUrl ? (
                          <video src={videoUrl} className="w-full h-full object-cover" muted preload="metadata" onLoadedMetadata={(e) => { e.currentTarget.currentTime = Math.min(1, e.currentTarget.duration / 2); }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[var(--surface-elevated)]"><Video className="w-8 h-8 text-[var(--text-tertiary)]" /></div>
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
                            <p className="text-white text-[var(--text-body-sm)] font-medium truncate">{recording.name}</p>
                            {recording.duration_ms && <p className="text-white/70 text-[var(--text-caption)]">{formatDuration(recording.duration_ms)}</p>}
                          </div>
                        </div>
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-[var(--text-caption)] flex items-center gap-1">
                          {isInProgress ? (
                            <><div className="w-2 h-2 bg-[var(--accent-error)] animate-pulse" />Recording...</>
                          ) : (
                            <><Video className="w-3 h-3" />{recording.duration_ms ? formatDuration(recording.duration_ms) : "Video"}</>
                          )}
                        </div>
                        {!isInProgress && (
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {recording.recording_path && (
                              <button onClick={(e) => { e.stopPropagation(); handleExportAsset(recording.recording_path!, `${recording.name || 'recording'}.mov`); }} className="p-1.5 bg-black/50 text-white hover:bg-black/70">
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteRecording(recording.id); }} disabled={isDeleting} className="p-1.5 bg-black/50 text-white hover:bg-black/70 disabled:cursor-wait">
                              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Diagrams Tab */}
          {activeTab === "diagrams" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">Graphs</h2>
                <button
                  onClick={openCommandPalette}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--text-primary)] text-[var(--text-inverse)] text-[var(--text-body-sm)] font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  New Graph
                </button>
              </div>

              {diagramsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] animate-pulse" />)}
                </div>
              ) : diagrams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <GitBranch className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                  <h3 className="text-[var(--text-body-md)] font-medium text-[var(--text-primary)] mb-2">No graphs yet</h3>
                  <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] mb-4 max-w-md">
                    Create graphs to map out ideas, document flows, and visualize relationships between concepts.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {diagrams.map((diagram) => {
                    const isDeleting = deletingIds.has(diagram.id);
                    return (
                      <div
                        key={diagram.id}
                        onClick={() => !isDeleting && navigate({ name: "diagram-editor", appId, explorationId, diagramId: diagram.id })}
                        className={`group relative aspect-video bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden transition-all ${isDeleting ? 'opacity-50 cursor-wait' : 'hover:border-[var(--border-strong)] cursor-pointer'}`}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                          <GitBranch className="w-8 h-8 text-[var(--text-tertiary)] mb-2" />
                          <p className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)] text-center truncate max-w-full">{diagram.name}</p>
                          <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Graph</p>
                        </div>
                        {isDeleting && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (deletingIds.has(diagram.id)) return;
                              const confirmed = await confirm({
                                title: "Delete Diagram",
                                description: "Are you sure you want to delete this diagram? This action cannot be undone.",
                                confirmLabel: "Delete",
                                cancelLabel: "Cancel",
                                variant: "destructive",
                              });
                              if (!confirmed) return;
                              setDeletingIds(prev => new Set(prev).add(diagram.id));
                              try {
                                await deleteDiagram(diagram.id);
                                addToast({ type: "success", title: "Diagram deleted", description: "The diagram has been removed." });
                              } catch (err) {
                                console.error("Failed to delete diagram:", err);
                                addToast({ type: "error", title: "Failed to delete", description: "Could not delete the diagram. Please try again." });
                              } finally {
                                setDeletingIds(prev => { const next = new Set(prev); next.delete(diagram.id); return next; });
                              }
                            }}
                            disabled={isDeleting}
                            className="p-1.5 bg-black/50 text-white hover:bg-black/70 disabled:cursor-wait"
                          >
                            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* Bottom Menu Bar - Floating Dock Style (hidden on doc tab) */}
      {activeTab !== "doc" && (
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
                <span className="text-[var(--text-body-sm)] text-[var(--accent-error)] font-medium">Recording</span>
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
      )}

      {/* Window Picker Modal */}
      {showWindowPicker && !showRecordingSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseWindowPicker}>
          <div className="w-full max-w-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">
                {pickerMode === "screenshot" ? "Select Window to Capture" : "Select App to Record"}
              </h2>
              <button onClick={handleCloseWindowPicker} className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-96 overflow-auto">
              {loadingWindows ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 text-[var(--text-primary)] animate-spin" />
                  <span className="ml-3 text-[var(--text-secondary)]">Loading windows...</span>
                </div>
              ) : windows.length === 0 ? (
                <div className="p-8 text-center">
                  <Monitor className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-[var(--text-secondary)]">No windows found</p>
                  <button onClick={loadWindows} className="mt-3 text-[var(--text-primary)] underline hover:no-underline text-[var(--text-body-sm)]">Refresh</button>
                </div>
              ) : (
                <div className="p-2">
                  {pickerMode === "recording" && displays.length > 0 && (
                    <div className="border-b border-[var(--border-default)] mb-2 pb-2">
                      <p className="px-3 py-1 text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">Screens</p>
                      {displays.map((display) => (
                        <button key={display.id} onClick={() => handleSelectDisplay(display)} className="w-full p-3 text-left hover:bg-[var(--surface-hover)] transition-colors flex items-start gap-3">
                          <Monitor className="w-5 h-5 text-[var(--text-primary)] mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[var(--text-primary)]">{display.name}</p>
                            <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">{display.width} x {display.height}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {pickerMode === "recording" && windows.length > 0 && (
                    <p className="px-3 py-1 text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">Windows</p>
                  )}
                  {windows.map((window) => (
                    <button key={`${window.id}-${window.window_id}`} onClick={() => handleCaptureWindow(window)} className="w-full p-3 text-left hover:bg-[var(--surface-hover)] transition-colors flex items-start gap-3">
                      <Monitor className="w-5 h-5 text-[var(--text-tertiary)] mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate">{window.name || "Untitled"}</p>
                        <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] truncate">{window.owner}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--border-default)] bg-[var(--surface-primary)] flex items-center justify-between">
              <button onClick={loadWindows} disabled={loadingWindows} className="text-[var(--text-body-sm)] text-[var(--text-primary)] underline hover:no-underline disabled:opacity-50 flex items-center gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingWindows ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                {pickerMode === "screenshot" ? "Click a window to capture it" : "Click an app to configure recording"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recording Setup Modal */}
      {showRecordingSetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCancelRecordingSetup}>
          <div className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">Recording Settings</h2>
              <button onClick={handleCancelRecordingSetup} className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
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
                      {selectedWindow ? `${selectedWindow.owner} - ${selectedWindow.name}` : selectedDisplay?.name || "Screen"}
                    </p>
                    <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)]">{selectedWindow ? "Window" : "Full Screen"}</p>
                  </div>
                  <button onClick={() => setShowRecordingSetup(false)} className="text-[var(--text-body-sm)] text-[var(--text-primary)] underline hover:no-underline">Change</button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">Audio Source</label>
                  <div className="flex items-center gap-2">
                    <button onClick={async () => { const audioList = await captureCommands.listAudioDevices(); setAudioDevices(audioList); }} className="text-[var(--text-caption)] text-[var(--text-primary)] underline hover:no-underline flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />Refresh
                    </button>
                    <button onClick={() => captureCommands.openPrivacySettings("microphone")} className="text-[var(--text-caption)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">Grant Access</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {audioDevices.map((device) => (
                    <button key={device.id} onClick={() => setSelectedAudioDevice(device.id)} className={`w-full p-3 border text-left flex items-center gap-3 transition-colors ${selectedAudioDevice === device.id ? "border-[var(--border-strong)] bg-[var(--surface-hover)]" : "border-[var(--border-default)] hover:border-[var(--border-strong)]"}`}>
                      {device.id === "none" ? <MicOff className="w-5 h-5 text-[var(--text-tertiary)]" /> : <Mic className="w-5 h-5 text-[var(--text-tertiary)]" />}
                      <span className={selectedAudioDevice === device.id ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-primary)]"}>{device.name}</span>
                      {device.is_default && <span className="ml-auto text-[var(--text-caption)] text-[var(--text-tertiary)]">Default</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <MousePointer2 className="w-5 h-5 text-[var(--text-tertiary)]" />
                  <span className="text-[var(--text-primary)]">Show cursor</span>
                </div>
                <button onClick={() => setShowCursorInRecording(!showCursorInRecording)} className={`relative h-6 w-11 transition-colors ${showCursorInRecording ? "bg-[var(--text-primary)]" : "bg-[var(--surface-active)]"}`}>
                  <span className={`absolute left-0.5 top-0.5 h-5 w-5 bg-white shadow transition-transform ${showCursorInRecording ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-[var(--border-default)] bg-[var(--surface-primary)] flex items-center justify-end gap-3">
              <button onClick={handleCancelRecordingSetup} className="px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]">Cancel</button>
              <button onClick={handleStartRecordingWithSetup} className="px-4 py-2 bg-[var(--accent-error)] text-white font-medium flex items-center gap-2 hover:opacity-90">
                <Video className="w-4 h-4" />Start Recording
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowUploadModal(false)}>
          <div className="w-full max-w-sm bg-[var(--surface-secondary)] border border-[var(--border-default)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)]">Upload File</h2>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
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
                  <h3 className="font-medium text-[var(--text-primary)]">Image</h3>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">PNG, JPG, GIF, WebP</p>
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
                  <h3 className="font-medium text-[var(--text-primary)]">Video</h3>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">MP4, MOV, WebM, AVI, MKV</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette for creating graphs and docs */}
      <ExplorationCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onCreateGraph={handleCreateGraph}
        onCreateArchitectureDoc={handleCreateArchitectureDoc}
      />
    </div>
  );
}
