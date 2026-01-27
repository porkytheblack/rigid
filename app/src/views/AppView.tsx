"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Plus, Search, Settings, MoreHorizontal, Trash2, Pencil, FileText, CheckCircle, Clock, AlertCircle, X, Command, Compass } from "lucide-react";
import { useAppsStore, useExplorationsStore, useRouterStore } from "@/lib/stores";
import type { NewExploration } from "@/lib/tauri/types";

type ExplorationStatus = "draft" | "in_progress" | "passed" | "failed";

const statusConfig: Record<ExplorationStatus, { icon: typeof Clock; color: string; bgColor: string; label: string }> = {
  draft: { icon: FileText, color: "var(--text-tertiary)", bgColor: "var(--surface-hover)", label: "Draft" },
  in_progress: { icon: Clock, color: "var(--accent-warning)", bgColor: "var(--status-warning-bg)", label: "In Progress" },
  passed: { icon: CheckCircle, color: "var(--accent-success)", bgColor: "var(--status-success-bg)", label: "Completed" },
  failed: { icon: AlertCircle, color: "var(--accent-error)", bgColor: "var(--status-error-bg)", label: "Issues Found" },
};

interface AppViewProps {
  appId: string;
}

export function AppView({ appId }: AppViewProps) {
  const { navigate } = useRouterStore();
  const { items: apps, load: loadApps, getById: getAppById } = useAppsStore();
  const { items: explorations, loading, loadByApp, create, delete: deleteExploration } = useExplorationsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newExplorationData, setNewExplorationData] = useState<NewExploration>({ app_id: appId, name: "" });
  const [contextMenuExploration, setContextMenuExploration] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const app = getAppById(appId);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  useEffect(() => {
    if (appId) {
      loadByApp(appId);
      setNewExplorationData((prev) => ({ ...prev, app_id: appId }));
    }
  }, [appId, loadByApp]);

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

  const filteredExplorations = explorations.filter(
    (exploration) =>
      exploration.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateExploration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExplorationData.name.trim()) return;

    try {
      const exploration = await create(newExplorationData);
      setShowCreateModal(false);
      setNewExplorationData({ app_id: appId, name: "" });
      navigate({ name: "exploration", appId, explorationId: exploration.id });
    } catch (err) {
      console.error("Failed to create exploration:", err);
    }
  };

  const handleDeleteExploration = async (id: string) => {
    if (confirm("Delete this exploration?")) {
      try {
        await deleteExploration(id);
        setContextMenuExploration(null);
      } catch (err) {
        console.error("Failed to delete exploration:", err);
      }
    }
  };

  const handleSearchSelect = (explorationId: string) => {
    setShowSearchModal(false);
    setSearchQuery("");
    navigate({ name: "exploration", appId, explorationId });
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

  const getStatusConfig = (status: string) => statusConfig[status as ExplorationStatus] || statusConfig.draft;

  if (!app && apps.length > 0) {
    return (
      <div className="h-screen bg-[var(--surface-primary)] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] mb-4">App not found</h2>
          <button onClick={() => navigate({ name: "home" })} className="text-[var(--accent-interactive)] hover:underline">Go back home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[var(--surface-primary)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-[var(--header-height)] border-b border-[var(--border-default)] flex items-center justify-between px-8 flex-shrink-0">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate({ name: "home" })} className="p-2 -ml-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--text-primary)] flex items-center justify-center">
              <span className="text-[var(--text-inverse)] font-bold text-lg">{app?.name.charAt(0).toUpperCase() || "?"}</span>
            </div>
            <div>
              <h1 className="font-bold text-[var(--text-primary)] text-lg tracking-tight">{app?.name || "Loading..."}</h1>
              {app?.description && <p className="text-[var(--text-caption)] text-[var(--text-secondary)] max-w-xs truncate">{app.description}</p>}
            </div>
          </div>
        </div>
        <button onClick={() => navigate({ name: "settings" })} className="p-2 hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]">
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-h-0 pb-32">
        <div className="max-w-6xl mx-auto px-8 py-16">
          {/* Title */}
          <h2 className="text-[var(--text-display-md)] font-bold text-[var(--text-primary)] tracking-tight mb-4">Explorations</h2>
          <p className="text-[var(--text-body-lg)] text-[var(--text-secondary)] mb-16 max-w-2xl">
            Each exploration is a focused QA session. Capture screenshots, record your screen, and document bugs as you test.
          </p>

          {loading && explorations.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 bg-[var(--surface-secondary)] border border-[var(--border-default)] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Existing Explorations */}
              {filteredExplorations.map((exploration) => {
                const status = getStatusConfig(exploration.status);
                const StatusIcon = status.icon;
                return (
                  <div
                    key={exploration.id}
                    onClick={() => navigate({ name: "exploration", appId, explorationId: exploration.id })}
                    className="group relative bg-[var(--surface-secondary)] border border-[var(--border-default)] p-6 hover:border-[var(--border-strong)] transition-all cursor-pointer"
                  >
                    {/* Status Badge */}
                    <div
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-[var(--text-caption)] font-semibold uppercase tracking-wide mb-4"
                      style={{ backgroundColor: status.bgColor, color: status.color }}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {status.label}
                    </div>

                    {/* Exploration Info */}
                    <h3 className="text-[var(--text-heading-sm)] font-semibold text-[var(--text-primary)] mb-2 tracking-tight line-clamp-2">
                      {exploration.name}
                    </h3>

                    {/* Metadata */}
                    <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
                      <p className="text-[var(--text-caption)] text-[var(--text-tertiary)] uppercase tracking-wide">
                        Updated {formatDate(exploration.updated_at)}
                      </p>
                    </div>

                    {/* Context Menu Button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setContextMenuExploration(contextMenuExploration === exploration.id ? null : exploration.id); }}
                      className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] transition-all"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Context Menu Dropdown */}
                    {contextMenuExploration === exploration.id && (
                      <div className="absolute top-12 right-4 w-44 bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-lg py-1 z-10" onClick={(e) => e.stopPropagation()}>
                        <button className="w-full px-4 py-2.5 text-left text-[var(--text-body-sm)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-3" onClick={() => setContextMenuExploration(null)}>
                          <Pencil className="w-4 h-4" />Edit
                        </button>
                        <button className="w-full px-4 py-2.5 text-left text-[var(--text-body-sm)] text-[var(--accent-error)] hover:bg-[var(--surface-hover)] flex items-center gap-3" onClick={() => handleDeleteExploration(exploration.id)}>
                          <Trash2 className="w-4 h-4" />Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Create New Exploration Card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="h-full min-h-56 border-2 border-dashed border-[var(--border-default)] hover:border-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-12 h-12 border-2 border-[var(--border-default)] group-hover:border-[var(--text-primary)] group-hover:bg-[var(--text-primary)] flex items-center justify-center transition-all">
                  <Plus className="w-6 h-6 text-[var(--text-tertiary)] group-hover:text-[var(--text-inverse)] transition-colors" />
                </div>
                <span className="text-[var(--text-body-md)] font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                  New Exploration
                </span>
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredExplorations.length === 0 && searchQuery && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Compass className="w-16 h-16 text-[var(--text-tertiary)] mb-6" />
              <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] mb-2">No explorations found</h2>
              <p className="text-[var(--text-body-md)] text-[var(--text-secondary)]">Try adjusting your search</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Menu Bar */}
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
            <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border-default)]">
              <Search className="w-5 h-5 text-[var(--text-tertiary)]" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search explorations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none text-[var(--text-body-lg)]"
              />
              <button onClick={() => { setShowSearchModal(false); setSearchQuery(""); }} className="p-2 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-auto">
              {filteredExplorations.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-[var(--text-body-md)] text-[var(--text-secondary)]">
                    {searchQuery ? "No explorations found" : "Start typing to search"}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredExplorations.map((exploration) => {
                    const status = getStatusConfig(exploration.status);
                    const StatusIcon = status.icon;
                    return (
                      <button
                        key={exploration.id}
                        onClick={() => handleSearchSelect(exploration.id)}
                        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[var(--surface-hover)] transition-colors text-left border-b border-[var(--border-subtle)] last:border-b-0"
                      >
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: status.bgColor }}>
                          <StatusIcon className="w-5 h-5" style={{ color: status.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{exploration.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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

      {/* Create Exploration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-8" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg bg-[var(--surface-secondary)] border border-[var(--border-default)] shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-[var(--border-default)]">
              <h2 className="text-[var(--text-heading-md)] font-bold text-[var(--text-primary)] tracking-tight">New Exploration</h2>
            </div>
            <form onSubmit={handleCreateExploration} className="p-6 space-y-6">
              <div>
                <label className="block text-[var(--text-caption)] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newExplorationData.name}
                  onChange={(e) => setNewExplorationData({ ...newExplorationData, name: e.target.value })}
                  placeholder="Login Flow Exploration"
                  autoFocus
                  className="w-full h-12 px-4 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--text-primary)] focus:border-2 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 h-12 border border-[var(--border-strong)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newExplorationData.name.trim()}
                  className="flex-1 h-12 bg-[var(--text-primary)] text-[var(--text-inverse)] font-semibold hover:bg-[var(--text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {contextMenuExploration && <div className="fixed inset-0 z-0" onClick={() => setContextMenuExploration(null)} />}
    </div>
  );
}
