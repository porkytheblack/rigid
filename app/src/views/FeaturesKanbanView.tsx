"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Plus, Flag, X, ChevronRight, Search, Video, Image, Trash2, GripVertical } from "lucide-react";
import { useRouterStore, useFeaturesStore, useExplorationsStore } from "@/lib/stores";
import type { Feature, FeatureStatus, FeaturePriority } from "@/lib/tauri/types";
import { annotations as annotationsApi, screenshots as screenshotsApi, recordings as recordingsApi } from "@/lib/tauri/commands";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface FeaturesKanbanViewProps {
  appId: string;
}

interface LinkedAnnotation {
  id: string;
  type: 'video' | 'screenshot';
  title: string;
  explorationId: string;
  explorationName: string;
  recordingId?: string;
  screenshotId?: string;
  timestamp_ms?: number;
}

const STATUS_COLUMNS: { status: FeatureStatus; label: string; color: string }[] = [
  { status: 'planned', label: 'Planned', color: 'var(--text-tertiary)' },
  { status: 'in_progress', label: 'In Progress', color: 'var(--accent-warning)' },
  { status: 'completed', label: 'Completed', color: 'var(--accent-success)' },
  { status: 'deprecated', label: 'Deprecated', color: 'var(--text-tertiary)' },
];

const PRIORITY_COLORS: Record<FeaturePriority, { bg: string; text: string }> = {
  low: { bg: 'var(--surface-hover)', text: 'var(--text-tertiary)' },
  medium: { bg: 'var(--status-warning-bg)', text: 'var(--accent-warning)' },
  high: { bg: 'var(--status-error-bg)', text: 'var(--accent-error)' },
  critical: { bg: 'var(--status-error-bg)', text: 'var(--accent-error)' },
};

export function FeaturesKanbanView({ appId }: FeaturesKanbanViewProps) {
  const { navigate, goBack, canGoBack } = useRouterStore();
  const { items: features, loadByApp, create, update, delete: deleteFeature } = useFeaturesStore();
  const { items: explorations, loadByApp: loadExplorations } = useExplorationsStore();
  const showConfirmDialog = useConfirm();

  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [linkedAnnotations, setLinkedAnnotations] = useState<LinkedAnnotation[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);

  // Mouse-based drag and drop state (more reliable in Tauri than HTML5 drag API)
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);
  const [dropTargetStatus, setDropTargetStatus] = useState<FeatureStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const columnRefs = useRef<Map<FeatureStatus, HTMLDivElement>>(new Map());

  // Form state for create/edit
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    status: FeatureStatus;
    priority: FeaturePriority;
  }>({
    name: "",
    description: "",
    status: "planned",
    priority: "medium",
  });

  // Load features and explorations
  useEffect(() => {
    if (appId) {
      loadByApp(appId);
      loadExplorations(appId);
    }
  }, [appId, loadByApp, loadExplorations]);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
        setCommandSearch("");
      }
      if (e.key === "Escape") {
        setCommandPaletteOpen(false);
        setSelectedFeature(null);
        setShowCreateModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load linked annotations when a feature is selected
  useEffect(() => {
    if (!selectedFeature) {
      setLinkedAnnotations([]);
      return;
    }

    const loadLinkedAnnotations = async () => {
      setLoadingAnnotations(true);
      const annotations: LinkedAnnotation[] = [];

      try {
        for (const exploration of explorations) {
          const recs = await recordingsApi.listByTest(exploration.id);
          for (const rec of recs) {
            const anns = await annotationsApi.list(rec.id);
            for (const ann of anns) {
              if (ann.feature_id === selectedFeature.id) {
                annotations.push({
                  id: ann.id,
                  type: 'video',
                  title: ann.title,
                  explorationId: exploration.id,
                  explorationName: exploration.name,
                  recordingId: rec.id,
                  timestamp_ms: ann.timestamp_ms,
                });
              }
            }
          }

          const shots = await screenshotsApi.list({ test_id: exploration.id });
          for (const shot of shots) {
            const markers = await screenshotsApi.listMarkers(shot.id);
            for (const marker of markers) {
              if (marker.feature_id === selectedFeature.id) {
                annotations.push({
                  id: marker.id,
                  type: 'screenshot',
                  title: marker.title,
                  explorationId: exploration.id,
                  explorationName: exploration.name,
                  screenshotId: shot.id,
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading linked annotations:", error);
      }

      setLinkedAnnotations(annotations);
      setLoadingAnnotations(false);
    };

    loadLinkedAnnotations();
  }, [selectedFeature, explorations]);

  // Reset form when selected feature changes
  useEffect(() => {
    if (selectedFeature) {
      setFormData({
        name: selectedFeature.name,
        description: selectedFeature.description || "",
        status: selectedFeature.status,
        priority: selectedFeature.priority,
      });
    }
  }, [selectedFeature]);

  // Mouse-based drag handlers (more reliable in Tauri than HTML5 drag API)
  const handleMouseDown = useCallback((e: React.MouseEvent, featureId: string) => {
    // Only start drag on left mouse button
    if (e.button !== 0) return;

    e.preventDefault();
    setDraggedFeatureId(featureId);
    setIsDragging(true);
    setDragPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !draggedFeatureId) return;

    setDragPosition({ x: e.clientX, y: e.clientY });

    // Check which column we're over
    let foundTarget: FeatureStatus | null = null;
    const draggedFeature = features.find(f => f.id === draggedFeatureId);

    columnRefs.current.forEach((element, status) => {
      const rect = element.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom &&
        draggedFeature?.status !== status
      ) {
        foundTarget = status;
      }
    });

    setDropTargetStatus(foundTarget);
  }, [isDragging, draggedFeatureId, features]);

  const handleMouseUp = useCallback(async () => {
    if (!isDragging || !draggedFeatureId) return;

    if (dropTargetStatus) {
      const feature = features.find(f => f.id === draggedFeatureId);
      if (feature && feature.status !== dropTargetStatus) {
        try {
          await update(draggedFeatureId, { status: dropTargetStatus });
        } catch (error) {
          console.error("Error updating feature status:", error);
        }
      }
    }

    setIsDragging(false);
    setDraggedFeatureId(null);
    setDropTargetStatus(null);
  }, [isDragging, draggedFeatureId, dropTargetStatus, features, update]);

  // Global mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'grabbing';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCreateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await create({
        app_id: appId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
      });
      setShowCreateModal(false);
      setFormData({ name: "", description: "", status: "planned", priority: "medium" });
    } catch (error) {
      console.error("Error creating feature:", error);
    }
  };

  const handleUpdateFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeature || !formData.name.trim()) return;

    try {
      await update(selectedFeature.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        status: formData.status,
        priority: formData.priority,
      });
      setSelectedFeature(null);
    } catch (error) {
      console.error("Error updating feature:", error);
    }
  };

  const handleDeleteFeature = async () => {
    if (!selectedFeature) return;

    const confirmed = await showConfirmDialog({
      title: "Delete Feature",
      description: `Are you sure you want to delete "${selectedFeature.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteFeature(selectedFeature.id);
        setSelectedFeature(null);
      } catch (error) {
        console.error("Error deleting feature:", error);
      }
    }
  };

  const navigateToAnnotation = (ann: LinkedAnnotation) => {
    if (ann.type === 'video' && ann.recordingId) {
      navigate({
        name: 'video-editor',
        appId,
        explorationId: ann.explorationId,
        recordingId: ann.recordingId,
        timestamp: ann.timestamp_ms,
      });
    } else if (ann.type === 'screenshot' && ann.screenshotId) {
      navigate({
        name: 'screenshot-editor',
        appId,
        explorationId: ann.explorationId,
        screenshotId: ann.screenshotId,
      });
    }
  };

  const getFeaturesByStatus = (status: FeatureStatus) => {
    return features.filter(f => f.status === status);
  };

  const commands = [
    { id: 'new-feature', label: 'New Feature', action: () => { setShowCreateModal(true); setCommandPaletteOpen(false); } },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  const draggedFeature = draggedFeatureId ? features.find(f => f.id === draggedFeatureId) : null;

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[calc(56px+var(--titlebar-height))] pt-[var(--titlebar-height)] border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {canGoBack() && (
            <button
              onClick={goBack}
              className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-[var(--text-primary)]" />
            <h1 className="font-semibold text-[var(--text-primary)] m-0!">Features</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="h-8 px-3 text-sm text-[var(--text-secondary)] bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors"
          >
            <Search className="w-4 h-4" />
            <kbd className="text-xs">⌘K</kbd>
          </button>
          <button
            onClick={() => {
              setFormData({ name: "", description: "", status: "planned", priority: "medium" });
              setShowCreateModal(true);
            }}
            className="h-8 px-3 bg-[var(--text-primary)] text-[var(--text-inverse)] text-sm font-medium hover:bg-[var(--text-secondary)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Feature
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-4 h-full">
          {STATUS_COLUMNS.map(({ status, label, color }) => {
            const columnFeatures = getFeaturesByStatus(status);
            const isDropTarget = dropTargetStatus === status && draggedFeature?.status !== status;

            return (
              <div
                key={status}
                ref={(el) => {
                  if (el) columnRefs.current.set(status, el);
                  else columnRefs.current.delete(status);
                }}
                data-status={status}
                className={`flex-1 min-w-0 flex flex-col bg-[var(--surface-secondary)] rounded-lg transition-all duration-150 ${
                  isDropTarget ? 'ring-2 ring-[var(--accent-interactive)] bg-[var(--surface-hover)]' : ''
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center gap-2 px-3 py-3 border-b border-[var(--border-default)]">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide flex-1">
                    {label}
                  </h2>
                  <span className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-hover)] px-2 py-0.5 rounded">
                    {columnFeatures.length}
                  </span>
                </div>

                {/* Feature Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnFeatures.map(feature => {
                    const priorityStyle = PRIORITY_COLORS[feature.priority];
                    const isBeingDragged = draggedFeatureId === feature.id;

                    return (
                      <div
                        key={feature.id}
                        onMouseDown={(e) => handleMouseDown(e, feature.id)}
                        onClick={() => !isDragging && setSelectedFeature(feature)}
                        className={`group p-3 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded cursor-grab hover:border-[var(--border-strong)] transition-all ${
                          isBeingDragged ? 'opacity-40' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="w-4 h-4 text-[var(--text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                              {feature.name}
                            </h3>
                            {feature.description && (
                              <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">
                                {feature.description}
                              </p>
                            )}
                            <span
                              className="inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide rounded"
                              style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.text }}
                            >
                              {feature.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {columnFeatures.length === 0 && (
                    <div
                      className={`p-4 text-center text-sm text-[var(--text-tertiary)] border-2 border-dashed rounded transition-colors ${
                        isDropTarget ? 'border-[var(--accent-interactive)] bg-[var(--surface-hover)]' : 'border-[var(--border-default)]'
                      }`}
                    >
                      {isDropTarget ? 'Drop here' : 'No features'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Command Palette */}
      {commandPaletteOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[20vh] z-50"
          onClick={() => setCommandPaletteOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-2xl rounded-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-default)]">
              <Search className="w-5 h-5 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={commandSearch}
                onChange={e => setCommandSearch(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                autoFocus
              />
            </div>
            <div className="py-2">
              {filteredCommands.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-3"
                >
                  <Plus className="w-4 h-4 text-[var(--text-tertiary)]" />
                  {cmd.label}
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">
                  No commands found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Feature Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl rounded-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
              <h2 className="font-semibold text-[var(--text-primary)]">Add Feature</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFeature} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Feature name"
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(d => ({ ...d, status: e.target.value as FeatureStatus }))}
                    className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)]"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData(d => ({ ...d, priority: e.target.value as FeaturePriority }))}
                    className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-medium rounded hover:bg-[var(--surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim()}
                  className="flex-1 px-4 py-2 bg-[var(--text-primary)] text-[var(--text-inverse)] text-sm font-medium rounded hover:bg-[var(--text-secondary)] disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Detail Modal */}
      {selectedFeature && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedFeature(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl rounded-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] sticky top-0 bg-[var(--surface-secondary)]">
              <h2 className="font-semibold text-[var(--text-primary)]">Edit Feature</h2>
              <button onClick={() => setSelectedFeature(null)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateFeature} className="p-6 space-y-4 border-b border-[var(--border-default)]">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                  placeholder="Feature name"
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(d => ({ ...d, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                  className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(d => ({ ...d, status: e.target.value as FeatureStatus }))}
                    className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)]"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData(d => ({ ...d, priority: e.target.value as FeaturePriority }))}
                    className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-strong)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteFeature}
                  className="px-4 py-2 border border-[var(--accent-error)] text-[var(--accent-error)] text-sm font-medium rounded hover:bg-[var(--status-error-bg)] flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => setSelectedFeature(null)}
                  className="px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-medium rounded hover:bg-[var(--surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!formData.name.trim()}
                  className="px-4 py-2 bg-[var(--text-primary)] text-[var(--text-inverse)] text-sm font-medium rounded hover:bg-[var(--text-secondary)] disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>

            {/* Linked Annotations */}
            <div className="p-6">
              <h3 className="font-semibold text-[var(--text-primary)] mb-4">Linked Annotations</h3>

              {loadingAnnotations ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-12 bg-[var(--surface-hover)] animate-pulse rounded" />
                  ))}
                </div>
              ) : linkedAnnotations.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] py-4 text-center border-2 border-dashed border-[var(--border-default)] rounded">
                  No annotations linked to this feature
                </p>
              ) : (
                <div className="space-y-2">
                  {linkedAnnotations.map(ann => (
                    <button
                      key={ann.id}
                      onClick={() => navigateToAnnotation(ann)}
                      className="w-full flex items-center gap-3 p-3 bg-[var(--surface-primary)] border border-[var(--border-default)] rounded hover:border-[var(--border-strong)] text-left"
                    >
                      {ann.type === 'video' ? (
                        <Video className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                      ) : (
                        <Image className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {ann.title}
                        </p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">
                          {ann.explorationName}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating drag preview */}
      {isDragging && draggedFeature && (
        <div
          className="fixed pointer-events-none z-50 w-64 p-3 bg-[var(--surface-primary)] border-2 border-[var(--accent-interactive)] rounded shadow-xl opacity-90"
          style={{
            left: dragPosition.x + 12,
            top: dragPosition.y + 12,
          }}
        >
          <div className="flex items-start gap-2">
            <GripVertical className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
                {draggedFeature.name}
              </h3>
              {draggedFeature.description && (
                <p className="text-xs text-[var(--text-secondary)] truncate">
                  {draggedFeature.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
