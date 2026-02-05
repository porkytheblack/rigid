"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Pencil, X, Check, Settings, Image as ImageIcon, Film } from "lucide-react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useRouterStore, useScreenshotsStore, useRecordingsStore, useDiagramsStore } from "@/lib/stores";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  DiagramCanvas,
  useDiagram,
  graphNodeTypes,
  nodeTypeConfig,
  nodeTypeNames,
  NodeCommandPalette,
  useNodeCommandPalette,
} from "@/components/diagrams";
import type { NodeAttachment } from "@/lib/tauri/types";

interface ArchitectureDiagramEditorViewProps {
  appId: string;
  docId: string;
  diagramId: string;
}

function ArchitectureDiagramEditorContent({ appId, docId, diagramId }: ArchitectureDiagramEditorViewProps) {
  const { navigate } = useRouterStore();
  const confirm = useConfirm();
  const { addToast } = useToast();
  const { listAttachments, addAttachment, deleteAttachment } = useDiagramsStore();
  const { items: screenshots, loadByApp: loadScreenshots } = useScreenshotsStore();
  const { items: recordings, loadByApp: loadRecordings } = useRecordingsStore();

  // Use the diagram hook for all diagram state - simplified to use 'graph' node type
  const {
    nodes,
    edges,
    isLoading,
    diagramName,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    updateNodeLabel,
    updateNodeNotes,
    updateNodeType,
    updateNodeMedia,
    deleteEdge,
    updateDiagramName,
  } = useDiagram({ diagramId });

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [selectedNodeAttachments, setSelectedNodeAttachments] = useState<NodeAttachment[]>([]);
  const [showNodePanel, setShowNodePanel] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(diagramName);
  const [editingNodeLabel, setEditingNodeLabel] = useState<string | null>(null);
  const [editingNodeNotes, setEditingNodeNotes] = useState<string>("");
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Command palette for quick node creation
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useNodeCommandPalette();

  // Handle adding node from command palette
  const handleCommandPaletteSelect = useCallback(
    async (nodeType: string, label: string) => {
      await addNode(label, nodeType);
      addToast({ type: "success", title: `${label} node added` });
    },
    [addNode, addToast]
  );

  // Update title when diagram loads
  useEffect(() => {
    setEditedTitle(diagramName);
  }, [diagramName]);

  // Load screenshots and recordings for attachments
  useEffect(() => {
    loadScreenshots(appId);
    loadRecordings(appId);
  }, [appId, loadScreenshots, loadRecordings]);

  // Load attachments for selected node
  useEffect(() => {
    if (selectedNodeId) {
      listAttachments(selectedNodeId).then(setSelectedNodeAttachments);
    } else {
      setSelectedNodeAttachments([]);
    }
  }, [selectedNodeId, listAttachments]);

  // Update node media when attachments change
  useEffect(() => {
    if (!selectedNodeId || selectedNodeAttachments.length === 0) {
      if (selectedNodeId) {
        updateNodeMedia(selectedNodeId, undefined, undefined);
      }
      return;
    }

    // Find the first screenshot and recording attachments
    const screenshotAttachment = selectedNodeAttachments.find((a) => a.attachment_type === "screenshot");
    const recordingAttachment = selectedNodeAttachments.find((a) => a.attachment_type === "recording");

    const screenshot = screenshotAttachment
      ? screenshots.find((s) => s.id === screenshotAttachment.screenshot_id)
      : null;
    const recording = recordingAttachment
      ? recordings.find((r) => r.id === recordingAttachment.recording_id)
      : null;

    const imageUrl = screenshot?.image_path ? convertFileSrc(screenshot.image_path) : undefined;
    const videoUrl = recording?.recording_path ? convertFileSrc(recording.recording_path) : undefined;

    updateNodeMedia(selectedNodeId, imageUrl, videoUrl);
  }, [selectedNodeId, selectedNodeAttachments, screenshots, recordings, updateNodeMedia]);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Handle sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = window.innerWidth - e.clientX;
        setSidebarWidth(Math.max(200, Math.min(400, newWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };

    if (isResizingSidebar) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar]);

  // Navigation
  const goBack = useCallback(() => {
    navigate({ name: "architecture-doc", appId, docId });
  }, [navigate, appId, docId]);

  // Node event handlers
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedEdgeId(null);
    setShowNodePanel(true);
    setContextMenu(null);
  }, []);

  const handleEdgeClick = useCallback((edgeId: string) => {
    setSelectedEdgeId(edgeId);
    setSelectedNodeId(null);
    setShowNodePanel(false);
    setContextMenu(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setShowNodePanel(false);
    setContextMenu(null);
  }, []);

  const handleNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    setContextMenu({ x, y, nodeId });
    setSelectedNodeId(nodeId);
  }, []);

  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    await deleteEdge(edgeId);
    setSelectedEdgeId(null);
    addToast({ type: "success", title: "Connection deleted" });
  }, [deleteEdge, addToast]);

  const handleDeleteNode = useCallback(async () => {
    if (!selectedNodeId) return;

    const confirmed = await confirm({
      title: "Delete Node",
      description: "Are you sure you want to delete this node? All connected edges will also be removed.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    await deleteNode(selectedNodeId);
    setSelectedNodeId(null);
    setShowNodePanel(false);
    addToast({ type: "success", title: "Node deleted" });
  }, [selectedNodeId, confirm, deleteNode, addToast]);

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== diagramName) {
      await updateDiagramName(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleAddNode = () => {
    openCommandPalette();
  };

  // Get selected node data
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (isLoading && nodes.length === 0) {
    return (
      <div className="h-screen bg-[var(--surface-primary)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-secondary)]">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[var(--titlebar-area-height)] pt-[var(--titlebar-height)] border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0 bg-[var(--surface-primary)]">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 -ml-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  className="bg-[var(--surface-secondary)] border border-[var(--border-default)] px-2 py-1 text-[var(--text-body-sm)] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
                />
                <button onClick={handleTitleSave} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingTitle(false)} className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-[var(--text-body-sm)] font-semibold text-[var(--text-primary)] hover:text-[var(--text-secondary)] flex items-center gap-2"
              >
                {diagramName || "Untitled"}
                <Pencil className="w-3 h-3 opacity-50" />
              </button>
            )}
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase">
              Graph
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddNode}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--text-inverse)] text-[var(--text-body-sm)] font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Node
          </button>
          <button
            onClick={() => navigate({ name: "settings" })}
            className="p-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 h-full relative">
          <DiagramCanvas
            nodes={nodes}
            edges={edges}
            nodeTypes={graphNodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onPaneClick={handlePaneClick}
            onNodeContextMenu={handleNodeContextMenu}
            selectedEdgeId={selectedEdgeId}
            onDeleteEdge={handleDeleteEdge}
          />

          {/* Selected Edge Indicator */}
          {selectedEdgeId && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg px-4 py-2 flex items-center gap-3 z-50">
              <span className="text-[var(--text-body-sm)] text-[var(--text-primary)]">Connection selected</span>
              <button
                onClick={() => handleDeleteEdge(selectedEdgeId)}
                className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[var(--text-body-sm)] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">or press Delete key</span>
            </div>
          )}

          {/* Context Menu */}
          {contextMenu && (
            <div
              className="fixed bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg py-1 z-[100]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
            >
              <button
                onClick={() => {
                  setShowNodePanel(true);
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-[var(--text-body-sm)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-2"
              >
                <Pencil className="w-4 h-4" />
                Edit Properties
              </button>
              <button
                onClick={() => {
                  handleDeleteNode();
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-[var(--text-body-sm)] text-red-400 hover:bg-[var(--surface-hover)] flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Node
              </button>
            </div>
          )}
        </div>

        {/* Node Panel */}
        {showNodePanel && selectedNode && (
          <>
            <div
              className="w-1 cursor-col-resize bg-transparent hover:bg-[var(--border-strong)] transition-colors"
              onMouseDown={() => setIsResizingSidebar(true)}
            />

            <aside
              className="h-full border-l border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col overflow-hidden"
              style={{ width: sidebarWidth }}
            >
              <div className="flex-shrink-0 border-b border-[var(--border-default)] px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-[var(--text-body-sm)] font-semibold text-[var(--text-primary)]">
                    {(selectedNode.data as { label: string }).label}
                  </h3>
                  <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Node Properties</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDeleteNode}
                    className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--accent-error)] transition-colors"
                    title="Delete Node"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowNodePanel(false)}
                    className="p-1.5 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-6">
                {/* Node Type Section */}
                <div>
                  <h4 className="text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Type</h4>
                  <div className="grid grid-cols-4 gap-1.5">
                    {nodeTypeNames.map((typeName) => {
                      const config = nodeTypeConfig[typeName];
                      const Icon = config.icon;
                      const currentType = (selectedNode.data as { nodeType?: string }).nodeType || "default";
                      const isSelected = currentType === typeName;
                      return (
                        <button
                          key={typeName}
                          onClick={() => {
                            if (selectedNodeId) {
                              updateNodeType(selectedNodeId, typeName);
                            }
                          }}
                          className={`flex flex-col items-center gap-1 p-2 border transition-colors ${
                            isSelected
                              ? "border-white/40 bg-white/10"
                              : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                          }`}
                          title={config.label}
                        >
                          <Icon className="w-4 h-4" style={{ color: config.color }} />
                          <span className="text-[10px] text-[var(--text-tertiary)] truncate w-full text-center">
                            {config.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Node Label Section */}
                <div>
                  <h4 className="text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Label</h4>
                  <input
                    type="text"
                    value={editingNodeLabel ?? (selectedNode.data as { label: string }).label}
                    onChange={(e) => setEditingNodeLabel(e.target.value)}
                    onBlur={() => {
                      if (editingNodeLabel !== null && selectedNodeId) {
                        updateNodeLabel(selectedNodeId, editingNodeLabel);
                        setEditingNodeLabel(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && editingNodeLabel !== null && selectedNodeId) {
                        updateNodeLabel(selectedNodeId, editingNodeLabel);
                        setEditingNodeLabel(null);
                      }
                    }}
                    className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-body-sm)] text-[var(--text-primary)] focus:border-[var(--border-strong)] outline-none"
                  />
                </div>

                {/* Description Section */}
                <div>
                  <h4 className="text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">Description</h4>
                  <textarea
                    value={editingNodeNotes || (selectedNode.data as { notes?: string }).notes || ""}
                    onChange={(e) => setEditingNodeNotes(e.target.value)}
                    onBlur={() => {
                      if (selectedNodeId) {
                        updateNodeNotes(selectedNodeId, editingNodeNotes);
                        setEditingNodeNotes("");
                      }
                    }}
                    placeholder="Add a description for this node..."
                    rows={3}
                    className="w-full px-3 py-2 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-body-sm)] text-[var(--text-primary)] focus:border-[var(--border-strong)] outline-none resize-none"
                  />
                </div>

                {/* Media Section - Visual Picker */}
                <div>
                  <h4 className="text-[var(--text-caption)] font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3">Media</h4>

                  {/* Current Attachments with Preview */}
                  {selectedNodeAttachments.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {selectedNodeAttachments.map((attachment) => {
                        const screenshot = attachment.attachment_type === "screenshot"
                          ? screenshots.find((s) => s.id === attachment.screenshot_id)
                          : null;
                        const recording = attachment.attachment_type === "recording"
                          ? recordings.find((r) => r.id === attachment.recording_id)
                          : null;
                        const imagePath = screenshot?.image_path;
                        const videoPath = recording?.recording_path;

                        return (
                          <div
                            key={attachment.id}
                            className="relative group bg-[var(--surface-primary)] border border-[var(--border-default)] overflow-hidden"
                          >
                            {/* Preview */}
                            <div className="h-20 bg-black/20 flex items-center justify-center">
                              {imagePath && (
                                <img
                                  src={convertFileSrc(imagePath)}
                                  alt={screenshot?.title || "Screenshot"}
                                  className="w-full h-full object-cover"
                                />
                              )}
                              {videoPath && (
                                <video
                                  src={convertFileSrc(videoPath)}
                                  className="w-full h-full object-cover"
                                  muted
                                  preload="metadata"
                                />
                              )}
                              {!imagePath && !videoPath && (
                                attachment.attachment_type === "screenshot" ? (
                                  <ImageIcon className="w-8 h-8 text-[var(--text-tertiary)]" />
                                ) : (
                                  <Film className="w-8 h-8 text-[var(--text-tertiary)]" />
                                )
                              )}
                            </div>
                            {/* Info bar */}
                            <div className="flex items-center justify-between px-2 py-1.5 bg-[var(--surface-secondary)]">
                              <span className="text-[11px] text-[var(--text-secondary)] truncate">
                                {screenshot?.title || recording?.name || (attachment.attachment_type === "screenshot" ? "Screenshot" : "Recording")}
                              </span>
                              <button
                                onClick={async () => {
                                  await deleteAttachment(attachment.id);
                                  setSelectedNodeAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
                                  addToast({ type: "success", title: "Media removed" });
                                }}
                                className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--accent-error)]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Media - Visual Grid */}
                  {(screenshots.length > 0 || recordings.length > 0) && (
                    <div className="space-y-3">
                      {/* Screenshots Grid */}
                      {screenshots.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <ImageIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">Screenshots</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {screenshots.slice(0, 6).map((s) => {
                              const isAttached = selectedNodeAttachments.some(
                                (a) => a.attachment_type === "screenshot" && a.screenshot_id === s.id
                              );
                              return (
                                <button
                                  key={s.id}
                                  disabled={isAttached}
                                  onClick={async () => {
                                    if (!selectedNodeId || isAttached) return;
                                    const newAttachment = await addAttachment({
                                      node_id: selectedNodeId,
                                      attachment_type: "screenshot",
                                      screenshot_id: s.id,
                                    });
                                    setSelectedNodeAttachments((prev) => [...prev, newAttachment]);
                                    addToast({ type: "success", title: "Screenshot attached" });
                                  }}
                                  className={`aspect-video bg-black/20 border overflow-hidden transition-all ${
                                    isAttached
                                      ? "border-green-500/50 opacity-50 cursor-not-allowed"
                                      : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:ring-1 hover:ring-white/20"
                                  }`}
                                  title={isAttached ? "Already attached" : s.title || "Click to attach"}
                                >
                                  <img
                                    src={convertFileSrc(s.image_path)}
                                    alt={s.title || "Screenshot"}
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              );
                            })}
                          </div>
                          {screenshots.length > 6 && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                              +{screenshots.length - 6} more screenshots
                            </p>
                          )}
                        </div>
                      )}

                      {/* Recordings Grid */}
                      {recordings.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Film className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                            <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide">Recordings</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {recordings.filter((r) => r.recording_path).slice(0, 6).map((r) => {
                              const isAttached = selectedNodeAttachments.some(
                                (a) => a.attachment_type === "recording" && a.recording_id === r.id
                              );
                              return (
                                <button
                                  key={r.id}
                                  disabled={isAttached}
                                  onClick={async () => {
                                    if (!selectedNodeId || isAttached) return;
                                    const newAttachment = await addAttachment({
                                      node_id: selectedNodeId,
                                      attachment_type: "recording",
                                      recording_id: r.id,
                                    });
                                    setSelectedNodeAttachments((prev) => [...prev, newAttachment]);
                                    addToast({ type: "success", title: "Recording attached" });
                                  }}
                                  className={`aspect-video bg-black/20 border overflow-hidden flex items-center justify-center transition-all ${
                                    isAttached
                                      ? "border-green-500/50 opacity-50 cursor-not-allowed"
                                      : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:ring-1 hover:ring-white/20"
                                  }`}
                                  title={isAttached ? "Already attached" : r.name || "Click to attach"}
                                >
                                  {r.thumbnail_path ? (
                                    <img
                                      src={convertFileSrc(r.thumbnail_path)}
                                      alt={r.name || "Recording"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Film className="w-5 h-5 text-[var(--text-tertiary)]" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {recordings.filter((r) => r.recording_path).length > 6 && (
                            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">
                              +{recordings.filter((r) => r.recording_path).length - 6} more recordings
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {screenshots.length === 0 && recordings.length === 0 && (
                    <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                      No screenshots or recordings available for this app.
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </>
        )}
      </div>

      {/* Node Command Palette */}
      <NodeCommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        onSelect={handleCommandPaletteSelect}
      />
    </div>
  );
}

export function ArchitectureDiagramEditorView(props: ArchitectureDiagramEditorViewProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureDiagramEditorContent {...props} />
    </ReactFlowProvider>
  );
}
