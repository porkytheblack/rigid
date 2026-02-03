"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Settings, Pencil, Check, X, GitBranch, Plus, Trash2, MoreHorizontal, FileText } from "lucide-react";
import { useArchitectureDocsStore, useRouterStore, useDiagramsStore, useScreenshotsStore } from "@/lib/stores";
import { Editor as BlockEditor, type Block, getBlockText } from "@/components/editor";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

interface ArchitectureDocViewProps {
  appId: string;
  docId: string;
}

type Tab = "doc" | "diagrams";

const navItems: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "doc", label: "Document", icon: FileText },
  { id: "diagrams", label: "Graphs", icon: GitBranch },
];

export function ArchitectureDocView({ appId, docId }: ArchitectureDocViewProps) {
  const { navigate } = useRouterStore();
  const { currentDoc, loadDoc, update: updateDoc, bulkReplaceBlocks } = useArchitectureDocsStore();
  const { items: diagrams, loading: diagramsLoading, loadByArchitectureDoc: loadDiagrams, create: createDiagram, delete: deleteDiagram } = useDiagramsStore();
  const { items: screenshots, loadByApp: loadScreenshots } = useScreenshotsStore();
  const confirm = useConfirm();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("doc");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [documentBlocks, setDocumentBlocks] = useState<Block[]>([]);
  const [blocksInitialized, setBlocksInitialized] = useState(false);
  const [loadedDocId, setLoadedDocId] = useState<string | null>(null);
  const [showCreateDiagramModal, setShowCreateDiagramModal] = useState(false);
  const [newDiagramName, setNewDiagramName] = useState("");
  const [contextMenuDiagram, setContextMenuDiagram] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // Navigate back to app view
  const goBackToApp = useCallback(() => {
    navigate({ name: "app", appId });
  }, [navigate, appId]);

  // Load document, diagrams, and screenshots
  useEffect(() => {
    if (docId !== loadedDocId) {
      setBlocksInitialized(false);
      setLoadedDocId(docId);
      loadDoc(docId);
      loadDiagrams(docId);
      loadScreenshots(appId);
    }
  }, [docId, loadedDocId, loadDoc, loadDiagrams, appId, loadScreenshots]);

  // Helper to convert file paths to asset URLs
  const getAssetUrl = (path: string | null | undefined): string | undefined => {
    if (!path) return undefined;
    try {
      return convertFileSrc(path);
    } catch (e) {
      const encodedPath = encodeURIComponent(path);
      return `https://asset.localhost/${encodedPath}`;
    }
  };

  const handleCreateDiagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagramName.trim()) return;

    try {
      const diagram = await createDiagram({
        architecture_doc_id: docId,
        name: newDiagramName.trim(),
        diagram_type: "mindmap", // Default type for backend compatibility
      });
      setShowCreateDiagramModal(false);
      setNewDiagramName("");
      navigate({ name: "architecture-diagram-editor", appId, docId, diagramId: diagram.id });
    } catch (err) {
      console.error("Failed to create diagram:", err);
    }
  };

  const handleDeleteDiagram = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Graph",
      description: "Are you sure you want to delete this graph? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await deleteDiagram(id);
      setContextMenuDiagram(null);
      addToast({ type: "success", title: "Graph deleted" });
    } catch (err) {
      console.error("Failed to delete diagram:", err);
      addToast({ type: "error", title: "Failed to delete graph" });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Initialize blocks from currentDoc
  useEffect(() => {
    if (currentDoc && currentDoc.doc.id === docId && !blocksInitialized) {
      setEditedTitle(currentDoc.doc.name);

      const blocks: Block[] = currentDoc.blocks.map((b) => ({
        id: b.id,
        type: b.block_type as Block["type"],
        content: b.content || "",
        meta: {
          checked: b.checked === 1,
          language: b.language || undefined,
          calloutType: (b.callout_type as "info" | "warning" | "error" | "success") || undefined,
          mermaidCode: b.mermaid_code || undefined,
          src: b.image_path || undefined,
          caption: b.image_caption || undefined,
          expanded: b.collapsed !== 1, // collapsed in DB means not expanded
        },
      }));
      setDocumentBlocks(blocks);

      // Set the initial save key so we don't trigger a save on first load
      lastSavedRef.current = JSON.stringify(blocks);
      setBlocksInitialized(true);
    }
  }, [currentDoc, docId, blocksInitialized]);

  // Auto-save blocks with debouncing
  useEffect(() => {
    if (!blocksInitialized || !currentDoc) return;

    const saveKey = JSON.stringify(documentBlocks);
    if (saveKey === lastSavedRef.current) return;

    // Don't save empty blocks if nothing has been typed yet
    // (prevents accidental deletion of content on page load race conditions)
    if (documentBlocks.length === 0 && currentDoc.blocks.length > 0) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const supportedTypes = ["paragraph", "heading1", "heading2", "heading3", "quote", "bulletList", "numberedList", "todo", "code", "divider", "callout", "mermaid", "toggle", "image"];
        const dbBlocks = documentBlocks
          .filter((b) => supportedTypes.includes(b.type))
          .map((b, i) => ({
            doc_id: docId,
            block_type: b.type as "paragraph" | "heading1" | "heading2" | "heading3" | "quote" | "bulletList" | "numberedList" | "todo" | "code" | "divider" | "callout" | "mermaid" | "toggle" | "image",
            content: getBlockText(b) || "",
            checked: b.meta?.checked ? true : undefined,
            language: b.meta?.language || undefined,
            callout_type: b.meta?.calloutType || undefined,
            mermaid_code: b.type === "mermaid" ? (b.meta?.mermaidCode || "") : undefined,
            collapsed: b.type === "toggle" ? (b.meta?.expanded === false) : undefined,
            image_path: b.type === "image" ? (b.meta?.src || undefined) : undefined,
            image_caption: b.type === "image" ? (b.meta?.caption || undefined) : undefined,
            sort_order: i,
          }));
        await bulkReplaceBlocks(docId, dbBlocks);
        lastSavedRef.current = saveKey;
        console.log("Auto-saved blocks:", dbBlocks.length);
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [documentBlocks, blocksInitialized, docId, currentDoc, bulkReplaceBlocks]);

  // Focus title input when editing
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = async () => {
    if (!currentDoc || !editedTitle.trim()) return;

    try {
      await updateDoc(docId, { name: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (err) {
      console.error("Failed to update title:", err);
    }
  };

  if (!currentDoc || currentDoc.doc.id !== docId) {
    return (
      <div className="h-screen bg-[var(--surface-primary)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--text-secondary)]">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[var(--header-height)] border-b border-[var(--border-default)] flex items-center justify-between px-4 flex-shrink-0 bg-[var(--surface-primary)]">
        <div className="flex items-center gap-3">
          <button onClick={goBackToApp} className="p-2 -ml-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]">
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
                {currentDoc.doc.name}
                <Pencil className="w-3 h-3 opacity-50" />
              </button>
            )}
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase">Architecture Doc</span>
          </div>
        </div>
        <button onClick={() => navigate({ name: "settings" })} className="p-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]">
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-56 border-r border-[var(--border-default)] bg-[var(--surface-secondary)] flex flex-col flex-shrink-0">
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const count = item.id === "diagrams" ? diagrams.length : 0;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-[var(--text-body-sm)] font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {count > 0 && (
                    <span className="px-1.5 py-0.5 bg-[var(--surface-primary)] text-[var(--text-caption)] text-[var(--text-tertiary)] rounded">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Graphs Quick List in Sidebar */}
          {diagrams.length > 0 && (
            <div className="border-t border-[var(--border-default)] p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[var(--text-caption)] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Graphs
                </span>
                <button
                  onClick={() => setShowCreateDiagramModal(true)}
                  className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-auto">
                {diagrams.slice(0, 10).map((diagram) => (
                  <button
                    key={diagram.id}
                    onClick={() => navigate({ name: "architecture-diagram-editor", appId, docId, diagramId: diagram.id })}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-[var(--text-body-sm)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors truncate"
                  >
                    <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{diagram.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-h-0">
          {activeTab === "doc" ? (
            blocksInitialized ? (
              <BlockEditor
                key={docId} // Force remount when doc changes
                initialBlocks={documentBlocks.length > 0 ? documentBlocks : undefined}
                onChange={setDocumentBlocks}
                placeholder="Start documenting your architecture... Type '/' for commands"
                autoFocus
                className="h-full"
                screenshots={screenshots.map(s => ({
                  id: s.id,
                  title: s.title,
                  imagePath: getAssetUrl(s.image_path) || ''
                }))}
                showCopyButton
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-[var(--text-tertiary)]">Loading...</div>
              </div>
            )
          ) : (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)]">Graphs</h2>
                  <p className="text-[var(--text-body-sm)] text-[var(--text-secondary)] mt-1">
                    Visual graphs for this architecture document
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateDiagramModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--text-primary)] text-[var(--text-inverse)] text-[var(--text-body-sm)] font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  New Graph
                </button>
              </div>

              {diagramsLoading && diagrams.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-[var(--surface-secondary)] border border-[var(--border-default)] animate-pulse" />
                  ))}
                </div>
              ) : diagrams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <GitBranch className="w-12 h-12 text-[var(--text-tertiary)] mb-4" />
                  <h3 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-2">No graphs yet</h3>
                  <p className="text-[var(--text-body-sm)] text-[var(--text-secondary)] mb-4">Create visual graphs to complement your architecture documentation</p>
                  <button
                    onClick={() => setShowCreateDiagramModal(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-body-sm)] font-medium hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Graph
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {diagrams.map((diagram) => (
                    <div
                      key={diagram.id}
                      onClick={() => navigate({ name: "architecture-diagram-editor", appId, docId, diagramId: diagram.id })}
                      className="group relative p-4 bg-[var(--surface-secondary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] cursor-pointer transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-[var(--surface-hover)] flex items-center justify-center text-[var(--text-secondary)]">
                          <GitBranch className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-[var(--text-body-sm)] font-semibold text-[var(--text-primary)] truncate">{diagram.name}</h3>
                          <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">Graph</p>
                        </div>
                      </div>
                      <p className="mt-3 text-[var(--text-caption)] text-[var(--text-tertiary)]">
                        Updated {formatDate(diagram.updated_at)}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setContextMenuDiagram(contextMenuDiagram === diagram.id ? null : diagram.id); }}
                        className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] transition-all"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {contextMenuDiagram === diagram.id && (
                        <div className="absolute top-8 right-2 w-36 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg py-1 z-10" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="w-full px-3 py-2 text-left text-[var(--text-body-sm)] text-[var(--accent-error)] hover:bg-[var(--surface-hover)] flex items-center gap-2"
                            onClick={() => handleDeleteDiagram(diagram.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {contextMenuDiagram && <div className="fixed inset-0 z-0" onClick={() => setContextMenuDiagram(null)} />}

      {/* Create Graph Modal */}
      {showCreateDiagramModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8" onClick={() => setShowCreateDiagramModal(false)}>
          <div className="w-full max-w-md bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] tracking-tight">New Graph</h2>
            </div>
            <form onSubmit={handleCreateDiagram} className="p-6 space-y-6">
              <div>
                <label className="block text-[var(--text-caption)] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newDiagramName}
                  onChange={(e) => setNewDiagramName(e.target.value)}
                  placeholder="System Architecture Graph"
                  autoFocus
                  className="w-full h-12 px-4 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] focus:border-2 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateDiagramModal(false)}
                  className="flex-1 h-12 border border-[var(--border-strong)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDiagramName.trim()}
                  className="flex-1 h-12 bg-[var(--text-primary)] text-[var(--text-inverse)] font-semibold hover:bg-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
