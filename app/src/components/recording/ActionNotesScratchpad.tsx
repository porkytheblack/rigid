"use client";

import { useToast } from "@/components/ui/toast";
import { useActionNotesStore, useRecordingsStore } from "@/lib/stores";
import type { AnnotationSeverity } from "@/lib/tauri/types";
import {
  AlertTriangle,
  CheckCircle,
  Flag,
  Lightbulb,
  MessageSquare,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Severity configuration matching VideoEditorView for consistency
 */
const severityConfig: Record<
  AnnotationSeverity,
  { icon: typeof MessageSquare; color: string; label: string }
> = {
  info: { icon: MessageSquare, color: "#3B82F6", label: "Info" },
  warning: { icon: AlertTriangle, color: "#F59E0B", label: "Warning" },
  error: { icon: Flag, color: "#EF4444", label: "Bug" },
  success: { icon: CheckCircle, color: "#22C55E", label: "Works" },
  eureka: { icon: Lightbulb, color: "#A855F7", label: "Eureka" },
};

/**
 * Format elapsed milliseconds to a readable time string (e.g., "2:34")
 */
function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

/**
 * ActionNotesScratchpad - A non-blocking floating modal for quick note-taking during recording.
 *
 * Features:
 * - Positioned in bottom-right corner above recording indicator
 * - Simple textarea with severity selector
 * - Auto-captures timestamp when note is created
 * - Saves immediately to prevent data loss
 * - No backdrop - user can interact with rest of app
 */
export function ActionNotesScratchpad() {
  const { addToast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [content, setContent] = useState("");
  const [mounted, setMounted] = useState(false);

  const {
    isOpen,
    currentSeverity,
    isSaving,
    recordingStartTime,
    closeScratchpad,
    setSeverity,
    addNote,
  } = useActionNotesStore();

  const { currentRecordingId, isRecording } = useRecordingsStore();

  // Calculate elapsed time
  const [elapsed, setElapsed] = useState(0);

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update elapsed time when open
  useEffect(() => {
    if (!isOpen || !recordingStartTime) return;

    const updateElapsed = () => {
      setElapsed(Date.now() - recordingStartTime);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isOpen, recordingStartTime]);

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Close scratchpad when recording stops
  useEffect(() => {
    if (!isRecording && isOpen) {
      closeScratchpad();
    }
  }, [isRecording, isOpen, closeScratchpad]);

  const handleSubmit = async () => {
    if (!content.trim() || !currentRecordingId || isSaving) return;

    const result = await addNote(content, currentRecordingId, elapsed);

    if (result) {
      addToast({
        type: "success",
        title: "Note saved",
        description: `at ${formatElapsed(elapsed)}`,
        duration: 2000,
      });
      setContent("");
      // Keep scratchpad open for more notes
    } else {
      addToast({
        type: "error",
        title: "Failed to save note",
        duration: 3000,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl+Enter to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    // Escape to close
    if (e.key === "Escape") {
      e.preventDefault();
      closeScratchpad();
    }
  };

  if (!mounted || !isOpen) return null;

  const scratchpad = (
    <div
      className="fixed z-40 animate-in slide-in-from-right-2 duration-200"
      style={{
        bottom: "80px", // Above recording indicator
        right: "24px",
        width: "320px",
      }}
    >
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-body-sm)] font-medium text-[var(--text-primary)]">
              Quick Note
            </span>
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
              at {formatElapsed(elapsed)}
            </span>
          </div>
          <button
            type="button"
            onClick={closeScratchpad}
            className="p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Severity selector */}
          <div className="grid grid-cols-5 gap-1.5">
            {(Object.keys(severityConfig) as AnnotationSeverity[]).map(
              (sev) => {
                const config = severityConfig[sev];
                const Icon = config.icon;
                const isSelected = currentSeverity === sev;
                return (
                  <button
                    type="button"
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={`p-1.5 border flex flex-col items-center gap-0.5 transition-colors ${
                      isSelected
                        ? "border-2"
                        : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                    }`}
                    style={{
                      borderColor: isSelected ? config.color : undefined,
                      backgroundColor: isSelected
                        ? `${config.color}15`
                        : undefined,
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{ color: config.color }}
                    />
                    <span
                      className="text-[10px] leading-tight"
                      style={{ color: config.color }}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What did you notice?"
            rows={3}
            className="w-full px-2 py-1.5 bg-[var(--surface-primary)] border border-[var(--border-default)] text-[var(--text-body-sm)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--text-primary)]"
          />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-caption)] text-[var(--text-tertiary)]">
              {"\u2318"}+Enter to save
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!content.trim() || isSaving}
              className="px-3 py-1 bg-[var(--text-primary)] text-[var(--surface-primary)] text-[var(--text-body-sm)] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Add Note"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(scratchpad, document.body);
}
