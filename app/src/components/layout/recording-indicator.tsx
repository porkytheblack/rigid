"use client";

import { RigidCharacterMini } from "@/components/ui/rigid-character";
import { useActionNotesStore, useRecordingsStore } from "@/lib/stores";
import { Square, StickyNote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function RecordingIndicator() {
  const { isRecording, stopRecording } = useRecordingsStore();
  const { openScratchpad, setRecordingStartTime, clearSession } =
    useActionNotesStore();
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Reset start time when recording starts
  useEffect(() => {
    if (isRecording) {
      startTimeRef.current = Date.now();
      setRecordingStartTime(startTimeRef.current);
    } else {
      // Clear session when recording stops
      clearSession();
    }
  }, [isRecording, setRecordingStartTime, clearSession]);

  useEffect(() => {
    if (!isRecording) {
      setElapsed(0);
      return;
    }

    // Update every second
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  if (!isRecording) {
    return null;
  }

  const formatElapsed = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  };

  const handleOpenScratchpad = () => {
    openScratchpad(startTimeRef.current);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--status-error)]/10 border border-[var(--status-error)]/20">
        {/* Animated character watching the recording */}
        <RigidCharacterMini animation="pulse" size={18} />
        <div className="w-2 h-2 bg-[var(--status-error)] recording-indicator-pulse" />
        <span className="text-sm font-medium text-[var(--status-error)]">
          REC
        </span>
        <span className="text-sm font-mono text-[var(--status-error)]">
          {formatElapsed(elapsed)}
        </span>
      </div>
      <button
        type="button"
        onClick={handleOpenScratchpad}
        className="p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors btn-animated"
        title="Add Note (Cmd+N)"
      >
        <StickyNote className="w-3 h-3" />
      </button>
      <button
        type="button"
        onClick={() => stopRecording()}
        className="p-1.5 bg-[var(--status-error)] text-white hover:opacity-90 transition-opacity btn-animated"
        title="Stop Recording"
      >
        <Square className="w-3 h-3" />
      </button>
    </div>
  );
}
