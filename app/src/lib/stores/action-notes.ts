import { annotations as annotationCommands } from "@/lib/tauri/commands";
import type {
  Annotation,
  AnnotationSeverity,
  NewAnnotation,
} from "@/lib/tauri/types";
import { deepClone } from "@/lib/utils";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

/**
 * Represents an action note created during recording.
 * These are displayed in the session notes list and are persisted as annotations.
 */
interface SessionNote {
  id: string;
  timestamp_ms: number;
  title: string;
  severity: AnnotationSeverity;
  created_at: string;
}

interface ActionNotesState {
  /** Whether the scratchpad modal is open */
  isOpen: boolean;
  /** Current severity selection for new notes */
  currentSeverity: AnnotationSeverity;
  /** Notes created in the current recording session */
  sessionNotes: SessionNote[];
  /** Whether a note is currently being saved */
  isSaving: boolean;
  /** Error message if save failed */
  error: string | null;
  /** Recording start time for elapsed calculation (set when scratchpad is opened) */
  recordingStartTime: number | null;
}

interface ActionNotesActions {
  /** Open the scratchpad modal */
  openScratchpad: (recordingStartTime?: number) => void;
  /** Close the scratchpad modal */
  closeScratchpad: () => void;
  /** Toggle the scratchpad modal */
  toggleScratchpad: (recordingStartTime?: number) => void;
  /** Set the severity for new notes */
  setSeverity: (severity: AnnotationSeverity) => void;
  /** Add a new note and save to database */
  addNote: (
    content: string,
    recordingId: string,
    elapsedMs: number,
  ) => Promise<Annotation | null>;
  /** Clear all session notes (call when recording stops) */
  clearSession: () => void;
  /** Set the recording start time */
  setRecordingStartTime: (time: number | null) => void;
  /** Clear any error */
  clearError: () => void;
}

type ActionNotesStore = ActionNotesState & ActionNotesActions;

export const useActionNotesStore = create<ActionNotesStore>()(
  immer((set, get) => ({
    // State
    isOpen: false,
    currentSeverity: "info",
    sessionNotes: [],
    isSaving: false,
    error: null,
    recordingStartTime: null,

    // Actions
    openScratchpad: (recordingStartTime?: number) => {
      set((state) => {
        state.isOpen = true;
        if (recordingStartTime !== undefined) {
          state.recordingStartTime = recordingStartTime;
        }
      });
    },

    closeScratchpad: () => {
      set((state) => {
        state.isOpen = false;
      });
    },

    toggleScratchpad: (recordingStartTime?: number) => {
      const { isOpen } = get();
      if (isOpen) {
        get().closeScratchpad();
      } else {
        get().openScratchpad(recordingStartTime);
      }
    },

    setSeverity: (severity) => {
      set((state) => {
        state.currentSeverity = severity;
      });
    },

    addNote: async (content, recordingId, elapsedMs) => {
      if (!content.trim()) {
        return null;
      }

      set((state) => {
        state.isSaving = true;
        state.error = null;
      });

      try {
        const newAnnotation: NewAnnotation = {
          recording_id: recordingId,
          timestamp_ms: elapsedMs,
          title: content.trim(),
          severity: get().currentSeverity,
        };

        const annotation = await annotationCommands.create(newAnnotation);
        const clonedAnnotation = deepClone(annotation);

        // Add to session notes for display
        set((state) => {
          state.sessionNotes.push({
            id: clonedAnnotation.id,
            timestamp_ms: clonedAnnotation.timestamp_ms,
            title: clonedAnnotation.title,
            severity: clonedAnnotation.severity,
            created_at: clonedAnnotation.created_at,
          });
          state.isSaving = false;
          // Reset severity to default after adding note
          state.currentSeverity = "info";
        });

        return clonedAnnotation;
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : String(error);
          state.isSaving = false;
        });
        return null;
      }
    },

    clearSession: () => {
      set((state) => {
        state.sessionNotes = [];
        state.isOpen = false;
        state.currentSeverity = "info";
        state.recordingStartTime = null;
        state.error = null;
      });
    },

    setRecordingStartTime: (time) => {
      set((state) => {
        state.recordingStartTime = time;
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },
  })),
);
