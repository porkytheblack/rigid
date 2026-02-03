"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Undo, Redo, Circle, Square, ArrowUpRight, Type, Pencil, ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, Flag, MessageSquare, AlertTriangle, CheckCircle, Lightbulb, Pencil as PencilIcon, X, Eraser, GripVertical, Copy, Check } from "lucide-react";
import { useScreenshotsStore, useRouterStore, useFeaturesStore } from "@/lib/stores";
import { screenshots as screenshotsApi } from "@/lib/tauri/commands";
import { convertFileSrc } from "@tauri-apps/api/core";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { Image as TauriImage } from "@tauri-apps/api/image";
import type { MarkerSeverity, DrawingToolType } from "@/lib/tauri/types";

type Tool = DrawingToolType;
type AnnotationColor = "#EF4444" | "#F59E0B" | "#10B981" | "#3B82F6" | "#8B5CF6" | "#EC4899";
type AnnotationSeverity = "info" | "warning" | "error" | "success" | "eureka";

interface Point {
  x: number;
  y: number;
}

interface DrawAnnotation {
  id: string;
  type: Tool;
  color: AnnotationColor;
  strokeWidth: number;
  points?: Point[];
  start?: Point;
  end?: Point;
  text?: string;
  fontSize?: number;
}

interface MarkerAnnotation {
  id: string;
  title: string;
  description: string;
  severity: AnnotationSeverity;
  is_fixed: boolean;
  position: Point; // Position on the image where marker is placed
  feature_id: string | null;
}

interface ScreenshotEditorViewProps {
  appId: string;
  explorationId: string;
  screenshotId: string;
}

const colors: AnnotationColor[] = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899"];

const severityConfig: Record<AnnotationSeverity, { icon: typeof Flag; color: string; label: string }> = {
  info: { icon: MessageSquare, color: "#3B82F6", label: "Info" },
  warning: { icon: AlertTriangle, color: "#F59E0B", label: "Warning" },
  error: { icon: Flag, color: "#EF4444", label: "Bug" },
  success: { icon: CheckCircle, color: "#10B981", label: "Works" },
  eureka: { icon: Lightbulb, color: "#A855F7", label: "Eureka" },
};

export function ScreenshotEditorView({ appId, explorationId, screenshotId }: ScreenshotEditorViewProps) {
  const { navigate } = useRouterStore();
  const { items: screenshots, update } = useScreenshotsStore();
  const { items: features, loadByApp: loadFeatures } = useFeaturesStore();
  const screenshot = screenshots.find(s => s.id === screenshotId);

  // Navigate back to exploration view with screenshots tab
  const goBackToScreenshots = useCallback(() => {
    navigate({ name: 'exploration', appId, explorationId, tab: 'screenshots' });
  }, [navigate, appId, explorationId]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("arrow");
  const [color, setColor] = useState<AnnotationColor>("#EF4444");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [drawAnnotations, setDrawAnnotations] = useState<DrawAnnotation[]>([]);
  const [markerAnnotations, setMarkerAnnotations] = useState<MarkerAnnotation[]>([]);
  const [undoStack, setUndoStack] = useState<DrawAnnotation[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawAnnotation[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<DrawAnnotation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [initialZoomSet, setInitialZoomSet] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: "" });
  const textInputRef = useRef<HTMLInputElement>(null);
  const textInputReadyRef = useRef(false);

  // Title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(screenshot?.title || "");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Marker annotations modal
  const [showAddMarkerModal, setShowAddMarkerModal] = useState(false);
  const [pendingMarkerPosition, setPendingMarkerPosition] = useState<Point | null>(null);
  const [newMarker, setNewMarker] = useState<Partial<MarkerAnnotation>>({
    severity: "info",
    title: "",
    description: "",
    feature_id: null,
  });
  const [selectedMarker, setSelectedMarker] = useState<MarkerAnnotation | null>(null);
  const [showEditMarkerModal, setShowEditMarkerModal] = useState(false);
  const [editingMarker, setEditingMarker] = useState<MarkerAnnotation | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(288); // 18rem = 288px default
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });

  // Show toast helper
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  }, []);

  // Load existing annotations from database
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        // Load drawings
        const dbDrawings = await screenshotsApi.listDrawings(screenshotId);
        const drawings: DrawAnnotation[] = dbDrawings.map(d => ({
          id: d.id,
          type: d.tool_type as Tool,
          color: d.color as AnnotationColor,
          strokeWidth: d.stroke_width,
          points: d.points ? JSON.parse(d.points) : undefined,
          start: d.start_x !== null && d.start_y !== null ? { x: d.start_x, y: d.start_y } : undefined,
          end: d.end_x !== null && d.end_y !== null ? { x: d.end_x, y: d.end_y } : undefined,
          text: d.text_content || undefined,
          fontSize: d.font_size || undefined,
        }));
        setDrawAnnotations(drawings);

        // Load markers
        const dbMarkers = await screenshotsApi.listMarkers(screenshotId);
        const markers: MarkerAnnotation[] = dbMarkers.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description || '',
          severity: m.severity as AnnotationSeverity,
          is_fixed: m.is_fixed || false,
          position: { x: m.position_x, y: m.position_y },
          feature_id: m.feature_id || null,
        }));
        setMarkerAnnotations(markers);
      } catch (e) {
        console.error("Failed to load annotations:", e);
      }
    };
    loadAnnotations();
  }, [screenshotId]);

  // Load features for this app
  useEffect(() => {
    if (appId) {
      loadFeatures(appId);
    }
  }, [appId, loadFeatures]);

  // Update edited title when screenshot changes
  useEffect(() => {
    if (screenshot?.title) {
      setEditedTitle(screenshot.title);
    }
  }, [screenshot?.title]);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Load image and calculate initial zoom
  useEffect(() => {
    if (screenshot?.image_path) {
      const img = new Image();
      // Set crossOrigin to allow getImageData() for clipboard copy
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setImageLoaded(true);
        imageRef.current = img;
      };
      img.onerror = (e) => {
        console.error("Failed to load image:", e);
      };
      try {
        const url = convertFileSrc(screenshot.image_path);
        img.src = url;
      } catch {
        const fallbackUrl = `https://asset.localhost/${encodeURIComponent(screenshot.image_path)}`;
        img.src = fallbackUrl;
      }
    }
  }, [screenshot?.image_path]);

  // Calculate initial zoom to fit image within 90% of container
  useEffect(() => {
    if (imageLoaded && containerRef.current && !initialZoomSet && imageDimensions.width > 0) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 64; // Subtract padding
      const containerHeight = container.clientHeight - 64;

      const scaleX = containerWidth / imageDimensions.width;
      const scaleY = containerHeight / imageDimensions.height;

      // Use the smaller scale to fit within container, then apply 90%
      const fitZoom = Math.min(scaleX, scaleY) * 0.9;

      // Cap at 1 (don't zoom in beyond 100% by default)
      setZoom(Math.min(fitZoom, 1));
      setInitialZoomSet(true);
    }
  }, [imageLoaded, imageDimensions, initialZoomSet]);

  // Render canvas
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = imageDimensions.width;
    canvas.height = imageDimensions.height;

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw annotations
    [...drawAnnotations, currentAnnotation].filter(Boolean).forEach((ann) => {
      if (!ann) return;
      ctx.strokeStyle = ann.color;
      ctx.fillStyle = ann.color;
      ctx.lineWidth = ann.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      switch (ann.type) {
        case "freehand":
          if (ann.points && ann.points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(ann.points[0].x, ann.points[0].y);
            ann.points.forEach((p) => ctx.lineTo(p.x, p.y));
            ctx.stroke();
          }
          break;

        case "arrow":
          if (ann.start && ann.end) {
            const headLength = 15;
            const dx = ann.end.x - ann.start.x;
            const dy = ann.end.y - ann.start.y;
            const angle = Math.atan2(dy, dx);

            ctx.beginPath();
            ctx.moveTo(ann.start.x, ann.start.y);
            ctx.lineTo(ann.end.x, ann.end.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(ann.end.x, ann.end.y);
            ctx.lineTo(ann.end.x - headLength * Math.cos(angle - Math.PI / 6), ann.end.y - headLength * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(ann.end.x, ann.end.y);
            ctx.lineTo(ann.end.x - headLength * Math.cos(angle + Math.PI / 6), ann.end.y - headLength * Math.sin(angle + Math.PI / 6));
            ctx.stroke();
          }
          break;

        case "rectangle":
          if (ann.start && ann.end) {
            ctx.beginPath();
            ctx.strokeRect(ann.start.x, ann.start.y, ann.end.x - ann.start.x, ann.end.y - ann.start.y);
          }
          break;

        case "circle":
          if (ann.start && ann.end) {
            const rx = Math.abs(ann.end.x - ann.start.x) / 2;
            const ry = Math.abs(ann.end.y - ann.start.y) / 2;
            const cx = ann.start.x + (ann.end.x - ann.start.x) / 2;
            const cy = ann.start.y + (ann.end.y - ann.start.y) / 2;
            ctx.beginPath();
            ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
            ctx.stroke();
          }
          break;

        case "text":
          if (ann.start && ann.text) {
            ctx.font = `bold ${ann.fontSize || 24}px 'Sora', system-ui, sans-serif`;
            ctx.fillText(ann.text, ann.start.x, ann.start.y);
          }
          break;
      }
    });

    // Draw marker positions on canvas
    markerAnnotations.forEach((marker, index) => {
      const config = severityConfig[marker.severity];
      ctx.beginPath();
      ctx.arc(marker.position.x, marker.position.y, 16, 0, 2 * Math.PI);
      // Use green for fixed markers
      ctx.fillStyle = marker.is_fixed ? "#10B981" : config.color;
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), marker.position.x, marker.position.y);
    });
  }, [drawAnnotations, currentAnnotation, imageLoaded, imageDimensions, markerAnnotations]);

  const getCanvasPoint = useCallback((e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // rect is already scaled by CSS transform, so we need to account for that
    // The actual canvas size is imageDimensions, displayed at rect size (scaled by zoom)
    const scaleX = imageDimensions.width / rect.width;
    const scaleY = imageDimensions.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, [imageDimensions]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const point = getCanvasPoint(e);

    if (tool === "text") {
      textInputReadyRef.current = false;
      setTextInput({ visible: true, x: point.x, y: point.y, value: "" });
      // Focus the input after a small delay to ensure it's mounted
      setTimeout(() => {
        textInputRef.current?.focus();
        textInputReadyRef.current = true;
      }, 50);
      return;
    }

    setIsDrawing(true);
    const newAnnotation: DrawAnnotation = {
      id: crypto.randomUUID(),
      type: tool,
      color,
      strokeWidth,
      ...(tool === "freehand" ? { points: [point] } : { start: point, end: point }),
    };
    setCurrentAnnotation(newAnnotation);
  }, [tool, color, strokeWidth, getCanvasPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentAnnotation) return;

    const point = getCanvasPoint(e);

    if (currentAnnotation.type === "freehand") {
      setCurrentAnnotation((prev) => prev ? { ...prev, points: [...(prev.points || []), point] } : null);
    } else {
      setCurrentAnnotation((prev) => prev ? { ...prev, end: point } : null);
    }
  }, [isDrawing, currentAnnotation, getCanvasPoint]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentAnnotation) return;

    setUndoStack((prev) => [...prev, drawAnnotations]);
    setRedoStack([]);
    setDrawAnnotations((prev) => [...prev, currentAnnotation]);
    setCurrentAnnotation(null);
    setIsDrawing(false);
  }, [isDrawing, currentAnnotation, drawAnnotations]);

  const handleTextSubmit = useCallback(() => {
    textInputReadyRef.current = false;
    if (!textInput.value.trim()) {
      setTextInput({ visible: false, x: 0, y: 0, value: "" });
      return;
    }

    const newAnnotation: DrawAnnotation = {
      id: crypto.randomUUID(),
      type: "text",
      color,
      strokeWidth,
      fontSize: 24,
      start: { x: textInput.x, y: textInput.y + 24 }, // Offset to position below cursor
      text: textInput.value,
    };

    setUndoStack((prev) => [...prev, drawAnnotations]);
    setRedoStack([]);
    setDrawAnnotations((prev) => [...prev, newAnnotation]);
    setTextInput({ visible: false, x: 0, y: 0, value: "" });
  }, [textInput, color, strokeWidth, drawAnnotations]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, drawAnnotations]);
    setDrawAnnotations(previous);
    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack, drawAnnotations]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, drawAnnotations]);
    setDrawAnnotations(next);
    setRedoStack((prev) => prev.slice(0, -1));
  }, [redoStack, drawAnnotations]);

  // Auto-save function
  const performSave = useCallback(async () => {
    try {
      // Save title if changed
      if (editedTitle !== screenshot?.title) {
        await update(screenshotId, {
          title: editedTitle || screenshot?.title,
        });
      }

      // Save drawings to database
      const dbDrawings = drawAnnotations.map((d, i) => ({
        screenshot_id: screenshotId,
        tool_type: d.type as DrawingToolType,
        color: d.color,
        stroke_width: d.strokeWidth,
        points: d.points ? JSON.stringify(d.points) : undefined,
        start_x: d.start?.x,
        start_y: d.start?.y,
        end_x: d.end?.x,
        end_y: d.end?.y,
        text_content: d.text,
        font_size: d.fontSize,
        sort_order: i,
      }));
      await screenshotsApi.bulkReplaceDrawings(screenshotId, dbDrawings);

      // Save markers to database
      const dbMarkers = markerAnnotations.map(m => ({
        screenshot_id: screenshotId,
        title: m.title,
        description: m.description || undefined,
        severity: m.severity as MarkerSeverity,
        position_x: m.position.x,
        position_y: m.position.y,
        feature_id: m.feature_id || undefined,
      }));
      await screenshotsApi.bulkReplaceMarkers(screenshotId, dbMarkers);

      setHasUnsavedChanges(false);
    } catch (err) {
      console.error("Failed to save:", err);
    }
  }, [screenshotId, drawAnnotations, markerAnnotations, editedTitle, screenshot?.title, update]);

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

  // Mark as changed when annotations change
  useEffect(() => {
    // Skip on initial load
    if (drawAnnotations.length === 0 && markerAnnotations.length === 0) return;
    setHasUnsavedChanges(true);
  }, [drawAnnotations, markerAnnotations]);

  // Mark as changed when title changes
  useEffect(() => {
    if (editedTitle !== screenshot?.title) {
      setHasUnsavedChanges(true);
    }
  }, [editedTitle, screenshot?.title]);

  // Handle eraser click on annotation
  const handleEraserClick = useCallback((e: React.MouseEvent) => {
    if (tool !== "eraser") return;

    const point = getCanvasPoint(e);

    // Check if clicking on a draw annotation
    const clickedIndex = drawAnnotations.findIndex((ann) => {
      if (ann.type === "freehand" && ann.points) {
        return ann.points.some((p) => Math.abs(p.x - point.x) < 10 && Math.abs(p.y - point.y) < 10);
      }
      if (ann.start && ann.end) {
        // Check if point is near the annotation's bounding box
        const minX = Math.min(ann.start.x, ann.end.x) - 10;
        const maxX = Math.max(ann.start.x, ann.end.x) + 10;
        const minY = Math.min(ann.start.y, ann.end.y) - 10;
        const maxY = Math.max(ann.start.y, ann.end.y) + 10;
        return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
      }
      return false;
    });

    if (clickedIndex >= 0) {
      setUndoStack((prev) => [...prev, drawAnnotations]);
      setRedoStack([]);
      setDrawAnnotations((prev) => prev.filter((_, i) => i !== clickedIndex));
    }
  }, [tool, getCanvasPoint, drawAnnotations]);

  // Update marker from edit modal
  const handleEditMarkerSubmit = useCallback(() => {
    if (!editingMarker?.title?.trim()) {
      setShowEditMarkerModal(false);
      return;
    }

    setMarkerAnnotations((prev) => prev.map((m) => m.id === editingMarker.id ? editingMarker : m));
    setShowEditMarkerModal(false);
    setEditingMarker(null);
  }, [editingMarker]);

  // Pinch-to-zoom handler
  const handleWheel = useCallback((e: WheelEvent) => {
    // Check if it's a pinch gesture (ctrlKey is true for trackpad pinch)
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.01;
      setZoom((z) => Math.max(0.1, Math.min(3, z + delta)));
    }
  }, []);

  // Attach wheel listener to container for pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [handleWheel]);

  // Sidebar resize handlers
  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSidebar(true);
  }, []);

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(200, Math.min(600, newWidth)));
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

  const handleTitleSubmit = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const handleAddMarker = useCallback(() => {
    // Add marker at center of visible area
    const centerX = imageDimensions.width / 2;
    const centerY = imageDimensions.height / 2;
    setPendingMarkerPosition({ x: centerX, y: centerY });
    setShowAddMarkerModal(true);
  }, [imageDimensions]);

  const handleMarkerSubmit = useCallback(() => {
    if (!newMarker.title?.trim() || !pendingMarkerPosition) {
      setShowAddMarkerModal(false);
      return;
    }

    const marker: MarkerAnnotation = {
      id: crypto.randomUUID(),
      title: newMarker.title,
      description: newMarker.description || "",
      severity: newMarker.severity || "info",
      is_fixed: false,
      position: pendingMarkerPosition,
      feature_id: newMarker.feature_id || null,
    };

    setMarkerAnnotations((prev) => [...prev, marker]);
    setNewMarker({ severity: "info", title: "", description: "", feature_id: null });
    setPendingMarkerPosition(null);
    setShowAddMarkerModal(false);
  }, [newMarker, pendingMarkerPosition]);

  const handleDeleteMarker = useCallback((id: string) => {
    setMarkerAnnotations((prev) => prev.filter((m) => m.id !== id));
    if (selectedMarker?.id === id) {
      setSelectedMarker(null);
    }
  }, [selectedMarker]);

  const handleToggleFixed = useCallback((id: string, currentFixed: boolean) => {
    setMarkerAnnotations((prev) => prev.map((m) =>
      m.id === id ? { ...m, is_fixed: !currentFixed } : m
    ));
    setHasUnsavedChanges(true);
    showToast(!currentFixed ? "Marked as fixed" : "Marked as not fixed");
  }, [showToast]);

  const resetView = useCallback(() => {
    if (containerRef.current && imageDimensions.width > 0) {
      const container = containerRef.current;
      const containerWidth = container.clientWidth - 64;
      const containerHeight = container.clientHeight - 64;

      const scaleX = containerWidth / imageDimensions.width;
      const scaleY = containerHeight / imageDimensions.height;

      setZoom(Math.min(Math.min(scaleX, scaleY) * 0.9, 1));
    }
  }, [imageDimensions]);

  // Copy screenshot to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }

      // Get raw RGBA pixel data for Tauri clipboard
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Convert Uint8ClampedArray to Uint8Array
      const rgbaData = new Uint8Array(imageData.data.buffer);

      // Create Tauri Image from RGBA data with dimensions
      const tauriImage = await TauriImage.new(rgbaData, canvas.width, canvas.height);

      // Use Tauri's clipboard plugin to write image
      await writeImage(tauriImage);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Screenshot copied to clipboard");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      showToast(`Failed to copy: ${err}`);
    }
  }, [showToast]);

  if (!screenshot) {
    return (
      <div className="min-h-screen bg-[var(--surface-primary)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[var(--text-heading-md)] font-semibold text-[var(--text-primary)] mb-2">Screenshot not found</h2>
          <button onClick={goBackToScreenshots} className="text-[var(--text-primary)] underline hover:no-underline">Go back</button>
        </div>
      </div>
    );
  }

  const tools: { id: Tool; icon: typeof Pencil; label: string }[] = [
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { id: "rectangle", icon: Square, label: "Rectangle" },
    { id: "circle", icon: Circle, label: "Circle" },
    { id: "text", icon: Type, label: "Text" },
    { id: "freehand", icon: Pencil, label: "Freehand" },
    { id: "eraser", icon: Eraser, label: "Eraser" },
  ];

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={goBackToScreenshots} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
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
                  setEditedTitle(screenshot.title);
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
              {editedTitle || screenshot.title || "Screenshot"}
              <PencilIcon className="w-3 h-3 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Saving...</span>
          )}
          <button onClick={undo} disabled={undoStack.length === 0} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] disabled:opacity-30" title="Undo (Cmd+Z)">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] disabled:opacity-30" title="Redo (Cmd+Shift+Z)">
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbar */}
        <aside className="w-14 border-r border-[var(--border-default)] flex flex-col items-center py-3 gap-1 flex-shrink-0 bg-[var(--surface-secondary)]">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`w-10 h-10 flex items-center justify-center transition-colors ${tool === t.id ? "bg-[var(--text-primary)] text-[var(--text-inverse)]" : "hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"}`}
              title={t.label}
            >
              <t.icon className="w-4 h-4" />
            </button>
          ))}

          <div className="w-8 h-px bg-[var(--border-default)] my-2" />

          {/* Colors */}
          <div className="flex flex-col gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 mx-auto transition-transform ${color === c ? "scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: c, outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }}
              />
            ))}
          </div>

          <div className="w-8 h-px bg-[var(--border-default)] my-2" />

          {/* Stroke width */}
          <div className="flex flex-col gap-1 items-center">
            {[2, 3, 5].map((w) => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`w-8 h-8 flex items-center justify-center transition-colors ${strokeWidth === w ? "bg-[var(--surface-hover)]" : "hover:bg-[var(--surface-hover)]"}`}
              >
                <div className="bg-[var(--text-primary)]" style={{ width: w * 2, height: w * 2 }} />
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Zoom controls */}
          <button onClick={() => setZoom((z) => Math.min(z + 0.25, 3))} className="w-10 h-10 flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]" title="Zoom In">
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))} className="w-10 h-10 flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]" title="Zoom Out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={resetView} className="w-10 h-10 flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]" title="Fit to Screen">
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-[var(--border-default)]" />

          {/* Copy to Clipboard */}
          <button
            onClick={copyToClipboard}
            className="w-10 h-10 flex items-center justify-center hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
            title="Copy to Clipboard"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </aside>

        {/* Canvas Area - Infinite with dotted background */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto"
          style={{
            backgroundImage: `radial-gradient(circle, var(--border-default) 1px, transparent 1px)`,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: 'center center',
          }}
        >
          {/* Large container to allow scrolling beyond image */}
          <div
            className="flex items-center justify-center"
            style={{
              minWidth: `calc(100% + ${imageDimensions.width * zoom}px)`,
              minHeight: `calc(100% + ${imageDimensions.height * zoom}px)`,
              padding: `${Math.max(200, imageDimensions.height * zoom * 0.5)}px ${Math.max(200, imageDimensions.width * zoom * 0.5)}px`,
            }}
          >
            <div style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }} className="relative">
              <canvas
                ref={canvasRef}
                className={`shadow-2xl ${tool === "eraser" ? "cursor-pointer" : "cursor-crosshair"}`}
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.1)',
                }}
                onMouseDown={(e) => {
                  if (tool === "eraser") {
                    handleEraserClick(e);
                  } else {
                    handleMouseDown(e);
                  }
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />

            {/* Text input overlay */}
            {textInput.visible && (
              <input
                ref={textInputRef}
                type="text"
                value={textInput.value}
                onChange={(e) => setTextInput((prev) => ({ ...prev, value: e.target.value }))}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") {
                    handleTextSubmit();
                  }
                  if (e.key === "Escape") {
                    textInputReadyRef.current = false;
                    setTextInput({ visible: false, x: 0, y: 0, value: "" });
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onBlur={() => {
                  // Only submit if the input is ready (prevents immediate blur on mount)
                  if (textInputReadyRef.current) {
                    handleTextSubmit();
                  }
                }}
                className="absolute bg-[var(--surface-primary)] border-2 px-2 py-1 outline-none text-lg font-bold z-10"
                style={{
                  left: textInput.x,
                  top: textInput.y,
                  color,
                  borderColor: color,
                  minWidth: 150,
                  fontFamily: "'Sora', system-ui, sans-serif",
                }}
                placeholder="Type here..."
              />
            )}
            </div>
          </div>
        </div>

        {/* Resizable Annotations Sidebar */}
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
            className="border-l border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col overflow-hidden"
            style={{ width: sidebarWidth }}
          >
            <div className="flex items-center justify-between p-3 border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)] text-[var(--text-body-sm)]">Annotations</h3>
              <button
                onClick={handleAddMarker}
                className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                title="Add Annotation"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-2 space-y-2">
              {markerAnnotations.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-tertiary)] text-[var(--text-body-sm)]">
                  <p>No annotations yet</p>
                  <p className="text-[var(--text-caption)] mt-1">Click + to add one</p>
                </div>
              ) : (
                markerAnnotations.map((marker, index) => {
                  const config = severityConfig[marker.severity];
                  const Icon = config.icon;
                  const isSelected = selectedMarker?.id === marker.id;

                  return (
                    <div
                      key={marker.id}
                      className={`p-3 border transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-[var(--surface-hover)] border-[var(--text-primary)]"
                          : "bg-[var(--surface-primary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      }`}
                      onClick={() => setSelectedMarker(isSelected ? null : marker)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-6 h-6 flex items-center justify-center text-white text-[var(--text-caption)] font-bold flex-shrink-0"
                          style={{ backgroundColor: marker.is_fixed ? "#10B981" : config.color }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: marker.is_fixed ? "#10B981" : config.color }} />
                            <span className="text-[var(--text-caption)] font-medium uppercase" style={{ color: marker.is_fixed ? "#10B981" : config.color }}>
                              {config.label}
                            </span>
                            {marker.severity === "error" && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleFixed(marker.id, marker.is_fixed); }}
                                className={`text-[var(--text-caption)] px-1.5 py-0.5 flex items-center gap-1 transition-colors ${
                                  marker.is_fixed
                                    ? "bg-[#10B98120] text-[#10B981] hover:bg-[#10B98130]"
                                    : "bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:bg-[var(--surface-active)]"
                                }`}
                                title={marker.is_fixed ? "Mark as not fixed" : "Mark as fixed"}
                              >
                                <CheckCircle className="w-3 h-3" />
                                {marker.is_fixed ? "Fixed" : "Not Fixed"}
                              </button>
                            )}
                          </div>
                          <p className={`font-medium text-[var(--text-body-sm)] truncate ${marker.is_fixed ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"}`}>
                            {marker.title}
                          </p>
                          {marker.description && (
                            <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] mt-1 line-clamp-2">
                              {marker.description}
                            </p>
                          )}
                          {marker.feature_id && (() => {
                            const linkedFeature = features.find(f => f.id === marker.feature_id);
                            return linkedFeature ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Flag className="w-3 h-3 text-[var(--text-tertiary)]" />
                                <span className="text-[var(--text-caption)] text-[var(--accent-interactive)]">{linkedFeature.name}</span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingMarker({ ...marker });
                              setShowEditMarkerModal(true);
                            }}
                            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
                            title="Edit"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteMarker(marker.id);
                            }}
                            className="p-1 hover:bg-[var(--status-error-bg)] text-[var(--text-tertiary)] hover:text-[var(--accent-error)]"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Add Marker Modal */}
      {showAddMarkerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddMarkerModal(false)}>
          <div className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Add Annotation</h3>
              <button onClick={() => setShowAddMarkerModal(false)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Severity selector */}
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Type
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(severityConfig) as AnnotationSeverity[]).map((s) => {
                    const config = severityConfig[s];
                    const Icon = config.icon;
                    return (
                      <button
                        key={s}
                        onClick={() => setNewMarker((prev) => ({ ...prev, severity: s }))}
                        className={`p-2 border flex flex-col items-center gap-1 transition-colors ${
                          newMarker.severity === s
                            ? "border-2"
                            : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                        }`}
                        style={{
                          borderColor: newMarker.severity === s ? config.color : undefined,
                          backgroundColor: newMarker.severity === s ? `${config.color}15` : undefined,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                        <span className="text-[var(--text-caption)]" style={{ color: config.color }}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newMarker.title || ""}
                  onChange={(e) => setNewMarker((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="What did you find?"
                  className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Description <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                </label>
                <textarea
                  value={newMarker.description || ""}
                  onChange={(e) => setNewMarker((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              {/* Feature selector */}
              {features.length > 0 && (
                <div>
                  <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Feature <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                  </label>
                  <select
                    value={newMarker.feature_id || ""}
                    onChange={(e) => setNewMarker((prev) => ({ ...prev, feature_id: e.target.value || null }))}
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
              <button
                onClick={() => setShowAddMarkerModal(false)}
                className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkerSubmit}
                disabled={!newMarker.title?.trim()}
                className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90 disabled:opacity-50"
              >
                Add Annotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Marker Modal */}
      {showEditMarkerModal && editingMarker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditMarkerModal(false)}>
          <div className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h3 className="font-semibold text-[var(--text-primary)]">Edit Annotation</h3>
              <button onClick={() => setShowEditMarkerModal(false)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Severity selector */}
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Type
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(Object.keys(severityConfig) as AnnotationSeverity[]).map((s) => {
                    const config = severityConfig[s];
                    const Icon = config.icon;
                    return (
                      <button
                        key={s}
                        onClick={() => setEditingMarker((prev) => prev ? { ...prev, severity: s } : null)}
                        className={`p-2 border flex flex-col items-center gap-1 transition-colors ${
                          editingMarker.severity === s
                            ? "border-2"
                            : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                        }`}
                        style={{
                          borderColor: editingMarker.severity === s ? config.color : undefined,
                          backgroundColor: editingMarker.severity === s ? `${config.color}15` : undefined,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                        <span className="text-[var(--text-caption)]" style={{ color: config.color }}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editingMarker.title}
                  onChange={(e) => setEditingMarker((prev) => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="What did you find?"
                  className="w-full h-10 px-3 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)]"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Description <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                </label>
                <textarea
                  value={editingMarker.description}
                  onChange={(e) => setEditingMarker((prev) => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Add more details..."
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              {/* Feature selector */}
              {features.length > 0 && (
                <div>
                  <label className="block text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                    Feature <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                  </label>
                  <select
                    value={editingMarker.feature_id || ""}
                    onChange={(e) => setEditingMarker((prev) => prev ? { ...prev, feature_id: e.target.value || null } : null)}
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
              <button
                onClick={() => setShowEditMarkerModal(false)}
                className="flex-1 h-10 border border-[var(--border-default)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMarkerSubmit}
                disabled={!editingMarker.title?.trim()}
                className="flex-1 h-10 bg-[var(--text-primary)] text-[var(--text-inverse)] font-medium hover:opacity-90 disabled:opacity-50"
              >
                Save Changes
              </button>
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
