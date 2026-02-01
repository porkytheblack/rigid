"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Search, FolderOpen, Settings, MoreHorizontal, Trash2, Pencil, X, Command, Loader2 } from "lucide-react";
import { useAppsStore, useRouterStore } from "@/lib/stores";
import type { NewApp } from "@/lib/tauri/types";
import { RigidLogo } from "@/components/ui/rigid-logo";
import { RigidCharacterMini } from "@/components/ui/rigid-character";
import { Editor, type Block, createBlock, blocksToPlainText, parseMarkdownToBlocks } from "@/components/editor";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { CardSkeleton } from "@/components/ui/loading-state";

export function HomeView() {
  const { items: apps, loading, load, create, update: updateApp, delete: deleteApp } = useAppsStore();
  const { navigate } = useRouterStore();
  const { addToast } = useToast();
  const showConfirmDialog = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApp, setEditingApp] = useState<{ id: string; name: string; description: string | null } | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newAppData, setNewAppData] = useState<NewApp>({ name: "" });
  const [contextMenuApp, setContextMenuApp] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Block editor state for description
  const [createDescBlocks, setCreateDescBlocks] = useState<Block[]>([createBlock('paragraph', '')]);
  const [editDescBlocks, setEditDescBlocks] = useState<Block[]>([createBlock('paragraph', '')]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (showSearchModal && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchModal]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal(true);
      }
      if (e.key === "Escape") {
        setShowSearchModal(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredApps = apps.filter(
    (app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppData.name.trim()) {
      setFormError(true);
      setTimeout(() => setFormError(false), 500);
      return;
    }

    setIsSubmitting(true);
    setFormError(false);

    try {
      // Convert blocks to plain text for storage
      const descriptionText = blocksToPlainText(createDescBlocks).trim() || undefined;
      const app = await create({ ...newAppData, description: descriptionText });
      addToast({
        type: "success",
        title: "App created!",
        description: `${app.name} is ready to explore.`,
      });
      setShowCreateModal(false);
      setNewAppData({ name: "" });
      setCreateDescBlocks([createBlock('paragraph', '')]);
      navigate({ name: "app", appId: app.id });
    } catch (err) {
      console.error("Failed to create app:", err);
      addToast({
        type: "error",
        title: "Failed to create app",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
      setFormError(true);
      setTimeout(() => setFormError(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApp = async (id: string) => {
    const confirmed = await showConfirmDialog({
      title: "Delete App",
      description: "Are you sure you want to delete this app? All explorations and data will be lost.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "destructive",
    });

    if (confirmed) {
      try {
        await deleteApp(id);
        setContextMenuApp(null);
        addToast({
          type: "success",
          title: "App deleted",
          description: "The app and all its data have been removed.",
        });
      } catch (err) {
        console.error("Failed to delete app:", err);
        addToast({
          type: "error",
          title: "Failed to delete app",
          description: err instanceof Error ? err.message : "Something went wrong",
        });
      }
    }
  };

  const handleEditApp = (app: { id: string; name: string; description: string | null }) => {
    setEditingApp({ id: app.id, name: app.name, description: app.description });
    // Parse existing description into blocks for editor
    if (app.description) {
      setEditDescBlocks(parseMarkdownToBlocks(app.description));
    } else {
      setEditDescBlocks([createBlock('paragraph', '')]);
    }
    setShowEditModal(true);
    setContextMenuApp(null);
  };

  const handleUpdateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp || !editingApp.name.trim()) {
      setFormError(true);
      setTimeout(() => setFormError(false), 500);
      return;
    }

    setIsSubmitting(true);
    setFormError(false);

    try {
      // Convert blocks to plain text for storage
      const descriptionText = blocksToPlainText(editDescBlocks).trim() || null;
      await updateApp(editingApp.id, {
        name: editingApp.name,
        description: descriptionText,
      });
      addToast({
        type: "success",
        title: "App updated!",
        description: `${editingApp.name} has been updated.`,
      });
      setShowEditModal(false);
      setEditingApp(null);
      setEditDescBlocks([createBlock('paragraph', '')]);
    } catch (err) {
      console.error("Failed to update app:", err);
      addToast({
        type: "error",
        title: "Failed to update app",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
      setFormError(true);
      setTimeout(() => setFormError(false), 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearchSelect = (appId: string) => {
    setShowSearchModal(false);
    setSearchQuery("");
    navigate({ name: "app", appId });
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

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden">
      {/* Context menu backdrop - must be first so it's behind everything */}
      {contextMenuApp && <div className="fixed inset-0 z-[5]" onClick={() => setContextMenuApp(null)} />}

      {/* Header - Clean navigation bar */}
      <header className="h-[var(--header-height)] border-b border-[var(--border-default)] flex items-center justify-between px-8 flex-shrink-0">
        <div className="flex items-center gap-4">
          <RigidLogo size={32} />
          <span className="font-bold text-[var(--text-primary)] text-lg tracking-tight">Rigid</span>
        </div>
        <button
          onClick={() => navigate({ name: "settings" })}
          className="p-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-0 pb-32">
        <div className="max-w-6xl mx-auto px-8 py-16">
          {/* Hero Title */}
          <h1 className="text-[var(--text-display-md)] font-bold text-[var(--text-primary)] tracking-tight mb-4">
            Your Apps
          </h1>
          <p className="text-[var(--text-body-lg)] text-[var(--text-secondary)] mb-16 max-w-2xl">
            Manage your QA explorations, capture screenshots and recordings, and track features and bugs across all your applications.
          </p>

          {loading && apps.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Existing Apps */}
              {filteredApps.map((app, index) => (
                <div
                  key={app.id}
                  onClick={() => navigate({ name: "app", appId: app.id })}
                  className={`group relative bg-[var(--surface-secondary)] border border-[var(--border-default)] p-6 hover:border-[var(--border-strong)] cursor-pointer card-animated card-stagger-enter ${contextMenuApp === app.id ? 'z-[10]' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* App Initial */}
                  <div className="w-12 h-12 bg-[var(--text-primary)] flex items-center justify-center mb-5">
                    <span className="text-[var(--text-inverse)] font-bold text-xl">{app.name.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* App Info */}
                  <h3 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-2 tracking-tight">
                    {app.name}
                  </h3>
                  {app.description && (
                    <p className="text-[var(--text-body-sm)] text-[var(--text-secondary)] line-clamp-2 mb-4">
                      {app.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
                    <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide">
                      Updated {formatDate(app.updated_at)}
                    </p>
                  </div>

                  {/* Context Menu Button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setContextMenuApp(contextMenuApp === app.id ? null : app.id); }}
                    className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] transition-all"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {/* Context Menu Dropdown */}
                  {contextMenuApp === app.id && (
                    <div className="absolute top-12 right-4 w-44 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg py-1 z-[10]" onClick={(e) => e.stopPropagation()}>
                      <button className="w-full px-4 py-2.5 text-left text-[var(--text-body-sm)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-3" onClick={() => handleEditApp(app)}>
                        <Pencil className="w-4 h-4" />Edit
                      </button>
                      <button className="w-full px-4 py-2.5 text-left text-[var(--text-body-sm)] text-[var(--accent-error)] hover:bg-[var(--surface-hover)] flex items-center gap-3" onClick={() => handleDeleteApp(app.id)}>
                        <Trash2 className="w-4 h-4" />Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Create New App Card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-full min-h-48 border-2 border-dashed border-[var(--border-default)] hover:border-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-12 h-12 border-2 border-[var(--border-default)] group-hover:border-[var(--text-primary)] group-hover:bg-[var(--text-primary)] flex items-center justify-center transition-all">
                  <Plus className="w-6 h-6 text-[var(--text-tertiary)] group-hover:text-[var(--text-inverse)] transition-colors" />
                </div>
                <span className="text-[var(--text-body-md)] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  New App
                </span>
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredApps.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FolderOpen className="w-16 h-16 text-[var(--text-tertiary)] mb-6" />
              <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] mb-2">No apps found</h2>
              <p className="text-[var(--text-body-md)] text-[var(--text-secondary)]">Try adjusting your search</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Menu Bar - Sharp dock */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-1 p-2 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg">
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-3 h-11 px-5 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <Search className="w-4 h-4" />
            <span className="text-[var(--text-body-sm)]">Search</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-caption)] text-[var(--text-tertiary)]">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>
          <div className="w-px h-7 bg-[var(--border-default)]" />
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 h-11 px-5 bg-[var(--text-primary)] hover:bg-[var(--text-secondary)] transition-colors text-[var(--text-inverse)]"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[var(--text-body-sm)] font-semibold">New</span>
          </button>
        </div>
      </div>

      {/* Search Command Palette Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 pt-[20vh]" onClick={() => { setShowSearchModal(false); setSearchQuery(""); }}>
          <div className="w-full max-w-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {/* Search Input */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)]">
              <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search apps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none text-[var(--text-body-lg)]"
              />
              <button onClick={() => { setShowSearchModal(false); setSearchQuery(""); }} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-auto">
              {filteredApps.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-[var(--text-body-md)] text-[var(--text-secondary)]">
                    {searchQuery ? "No apps found" : "Start typing to search"}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredApps.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => handleSearchSelect(app.id)}
                      className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[var(--surface-hover)] transition-colors text-left border-b border-[var(--border-subtle)] last:border-b-0"
                    >
                      <div className="w-10 h-10 bg-[var(--text-primary)] flex items-center justify-center flex-shrink-0">
                        <span className="text-[var(--text-inverse)] font-bold">{app.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{app.name}</p>
                        {app.description && <p className="text-[var(--text-body-sm)] text-[var(--text-tertiary)] truncate">{app.description}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-[var(--border-default)] bg-[var(--surface-primary)]">
              <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-secondary)] border border-[var(--border-default)]">Enter</kbd> to select
                <span className="mx-2">·</span>
                <kbd className="px-1.5 py-0.5 bg-[var(--surface-secondary)] border border-[var(--border-default)]">Esc</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create App Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8 modal-backdrop-animated" onClick={() => { if (!isSubmitting) { setShowCreateModal(false); setCreateDescBlocks([createBlock('paragraph', '')]); } }}>
          <div className="w-full max-w-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl modal-content-animated" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header with Character */}
            <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between">
              <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] tracking-tight">Create New App</h2>
              <RigidCharacterMini
                animation={isSubmitting ? "work" : formError ? "shake" : "idle"}
                size={28}
              />
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateApp} className="p-6 space-y-6">
              <div>
                <label className="block text-[var(--text-caption)] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  value={newAppData.name}
                  onChange={(e) => setNewAppData({ ...newAppData, name: e.target.value })}
                  placeholder="My Awesome App"
                  autoFocus
                  disabled={isSubmitting}
                  className={`w-full h-12 px-4 bg-[var(--surface-primary)] border text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] focus:border-2 transition-all input-animated ${formError && !newAppData.name.trim() ? 'input-error-shake border-[var(--status-error)]' : 'border-[var(--border-default)]'}`}
                />
              </div>
              <div>
                <label className="block text-[var(--text-caption)] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Description <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                </label>
                <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] min-h-[200px] max-h-[300px] overflow-y-auto p-3">
                  <Editor
                    initialBlocks={createDescBlocks}
                    onChange={setCreateDescBlocks}
                    placeholder="Brief description of your app..."
                    readOnly={isSubmitting}
                    autoFocus={false}
                    compact={true}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateDescBlocks([createBlock('paragraph', '')]); }}
                  disabled={isSubmitting}
                  className="flex-1 h-12 border border-[var(--border-strong)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-all btn-animated disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAppData.name.trim() || isSubmitting}
                  className="flex-1 h-12 bg-[var(--text-primary)] text-[var(--text-inverse)] font-semibold hover:bg-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-animated flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create App"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit App Modal */}
      {showEditModal && editingApp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8 modal-backdrop-animated" onClick={() => { if (!isSubmitting) { setShowEditModal(false); setEditingApp(null); setEditDescBlocks([createBlock('paragraph', '')]); } }}>
          <div className="w-full max-w-2xl bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl modal-content-animated" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header with Character */}
            <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between">
              <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] tracking-tight">Edit App</h2>
              <RigidCharacterMini
                animation={isSubmitting ? "work" : formError ? "shake" : "idle"}
                size={28}
              />
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateApp} className="p-6 space-y-6">
              <div>
                <label className="block text-[var(--text-caption)] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  App Name
                </label>
                <input
                  type="text"
                  value={editingApp.name}
                  onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                  placeholder="My Awesome App"
                  autoFocus
                  disabled={isSubmitting}
                  className={`w-full h-12 px-4 bg-[var(--surface-primary)] border text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] focus:border-2 transition-all input-animated ${formError && !editingApp.name.trim() ? 'input-error-shake border-[var(--status-error)]' : 'border-[var(--border-default)]'}`}
                />
              </div>
              <div>
                <label className="block text-[var(--text-caption)] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Description <span className="text-[var(--text-tertiary)] normal-case">(optional)</span>
                </label>
                <div className="bg-[var(--surface-primary)] border border-[var(--border-default)] min-h-[200px] max-h-[300px] overflow-y-auto p-3">
                  <Editor
                    initialBlocks={editDescBlocks}
                    onChange={setEditDescBlocks}
                    placeholder="Brief description of your app..."
                    readOnly={isSubmitting}
                    autoFocus={false}
                    compact={true}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingApp(null); setEditDescBlocks([createBlock('paragraph', '')]); }}
                  disabled={isSubmitting}
                  className="flex-1 h-12 border border-[var(--border-strong)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-all btn-animated disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!editingApp.name.trim() || isSubmitting}
                  className="flex-1 h-12 bg-[var(--text-primary)] text-[var(--text-inverse)] font-semibold hover:bg-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-animated flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
