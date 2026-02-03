"use client";

import { useEffect, useCallback } from "react";
import {
  Download,
  X,
  RefreshCw,
  ArrowDownToLine,
  Loader2,
} from "lucide-react";
import { useUpdateStore, selectShouldShowNotification } from "@/lib/stores/update";
import { RigidCharacterMini } from "@/components/ui/rigid-character";

/**
 * UpdateNotification Component
 *
 * A non-intrusive toast-like notification that appears when an app update is available.
 * Slides in from the bottom-right corner and allows users to:
 * - View what version is available
 * - Download the update with progress feedback
 * - Restart to apply the update
 * - Dismiss the notification (they can update later)
 *
 * Design principles:
 * - Non-blocking: Never forces the user to update
 * - Progressive disclosure: Shows more detail as user engages
 * - Graceful error handling: Clear feedback when things go wrong
 */
export function UpdateNotification() {
  const status = useUpdateStore((s) => s.status);
  const updateInfo = useUpdateStore((s) => s.updateInfo);
  const progress = useUpdateStore((s) => s.progress);
  const error = useUpdateStore((s) => s.error);
  const shouldShow = useUpdateStore(selectShouldShowNotification);

  const checkForUpdates = useUpdateStore((s) => s.checkForUpdates);
  const downloadUpdate = useUpdateStore((s) => s.downloadUpdate);
  const installAndRestart = useUpdateStore((s) => s.installAndRestart);
  const dismiss = useUpdateStore((s) => s.dismiss);
  const clearError = useUpdateStore((s) => s.clearError);

  // Check for updates on mount and periodically (every 4 hours)
  useEffect(() => {
    // Initial check after a short delay to not block app startup
    const initialTimeout = setTimeout(() => {
      checkForUpdates();
    }, 5000);

    // Periodic checks
    const interval = setInterval(
      () => {
        checkForUpdates();
      },
      4 * 60 * 60 * 1000 // 4 hours
    );

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  // Handle primary action based on current status
  const handlePrimaryAction = useCallback(() => {
    switch (status) {
      case "available":
        downloadUpdate();
        break;
      case "ready":
        installAndRestart();
        break;
      case "error":
        clearError();
        checkForUpdates();
        break;
    }
  }, [status, downloadUpdate, installAndRestart, clearError, checkForUpdates]);

  // Don't render if nothing to show
  if (!shouldShow && status !== "error") {
    return null;
  }

  // Error state notification
  if (status === "error" && error) {
    return (
      <div className="fixed bottom-4 right-4 z-[var(--z-toast)] w-80 toast-animated-enter">
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xl">
          {/* Header */}
          <div className="flex items-start gap-3 p-4 border-b border-[var(--border-default)]">
            <div className="flex-shrink-0 mt-0.5">
              <RigidCharacterMini animation="sad" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
                Update Failed
              </p>
              <p className="mt-1 text-[var(--text-caption)] text-[var(--text-tertiary)] line-clamp-2">
                {error}
              </p>
            </div>
            <button
              onClick={dismiss}
              className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors btn-animated"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 p-3">
            <button
              onClick={handlePrimaryAction}
              className="flex-1 h-8 px-3 bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-primary)] text-[var(--text-body-sm)] font-medium hover:bg-[var(--surface-hover)] transition-colors btn-animated flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <button
              onClick={dismiss}
              className="h-8 px-3 text-[var(--text-tertiary)] text-[var(--text-body-sm)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if dismissed
  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-toast)] w-80 toast-animated-enter">
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xl">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-[var(--border-default)]">
          <div className="flex-shrink-0 mt-0.5">
            <StatusIcon status={status} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
              <StatusTitle status={status} />
            </p>
            <p className="mt-1 text-[var(--text-caption)] text-[var(--text-tertiary)]">
              <StatusDescription
                status={status}
                updateInfo={updateInfo}
              />
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors btn-animated"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar (visible during download) */}
        {status === "downloading" && progress && (
          <div className="px-4 py-2 border-b border-[var(--border-default)]">
            <div className="h-1.5 bg-[var(--surface-active)] overflow-hidden">
              <div
                className="h-full bg-[var(--text-primary)] transition-all duration-300 ease-out"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[var(--text-caption)] text-[var(--text-tertiary)]">
              <span>{progress.percent}%</span>
              {progress.total && (
                <span>{formatBytes(progress.downloaded)} / {formatBytes(progress.total)}</span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={handlePrimaryAction}
            disabled={status === "downloading"}
            className="flex-1 h-8 px-3 bg-[var(--text-primary)] text-[var(--text-inverse)] text-[var(--text-body-sm)] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all btn-animated flex items-center justify-center gap-2"
          >
            <PrimaryActionContent status={status} />
          </button>
          {status !== "downloading" && (
            <button
              onClick={dismiss}
              className="h-8 px-3 text-[var(--text-tertiary)] text-[var(--text-body-sm)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Later
            </button>
          )}
        </div>

        {/* Version info footer (when update is available) */}
        {updateInfo && status === "available" && (
          <div className="px-4 pb-3 pt-0">
            <p className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
              {updateInfo.currentVersion} &rarr; {updateInfo.version}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Status-dependent icon component
 */
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "available":
      return <RigidCharacterMini animation="wave" size={20} />;
    case "downloading":
      return <RigidCharacterMini animation="work" size={20} />;
    case "ready":
      return <RigidCharacterMini animation="celebrate" size={20} />;
    default:
      return <Download className="w-5 h-5 text-[var(--text-secondary)]" />;
  }
}

/**
 * Status-dependent title text
 */
function StatusTitle({ status }: { status: string }) {
  switch (status) {
    case "available":
      return "Update Available";
    case "downloading":
      return "Downloading Update";
    case "ready":
      return "Ready to Restart";
    default:
      return "Update";
  }
}

/**
 * Status-dependent description text
 */
function StatusDescription({
  status,
  updateInfo,
}: {
  status: string;
  updateInfo: { version: string; releaseNotes?: string } | null;
}) {
  switch (status) {
    case "available":
      return `Version ${updateInfo?.version ?? "Unknown"} is ready to download`;
    case "downloading":
      return "Please wait while the update downloads...";
    case "ready":
      return "Restart the app to apply the update";
    default:
      return "";
  }
}

/**
 * Primary action button content based on status
 */
function PrimaryActionContent({ status }: { status: string }) {
  switch (status) {
    case "available":
      return (
        <>
          <ArrowDownToLine className="w-3.5 h-3.5" />
          Download Update
        </>
      );
    case "downloading":
      return (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Downloading...
        </>
      );
    case "ready":
      return (
        <>
          <RefreshCw className="w-3.5 h-3.5" />
          Restart Now
        </>
      );
    default:
      return "Update";
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
