import { useActionNotesStore, useRecordingsStore } from "@/lib/stores";
import { useEffect } from "react";

/**
 * Global keyboard shortcut handler for recording-related actions.
 *
 * Shortcuts:
 * - Cmd/Ctrl+N: Toggle action notes scratchpad (only when recording)
 *
 * This hook should be called once in the app root to register global shortcuts.
 */
export function useRecordingShortcuts() {
  const { isRecording } = useRecordingsStore();
  const { toggleScratchpad, recordingStartTime } = useActionNotesStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd/Ctrl+N
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        // Only handle when recording is active
        if (isRecording) {
          e.preventDefault();
          // Pass recording start time from store (set by RecordingIndicator)
          toggleScratchpad(recordingStartTime ?? undefined);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, toggleScratchpad, recordingStartTime]);
}
