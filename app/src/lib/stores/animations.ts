import { create } from 'zustand';
import type { RigidAnimation } from '@/components/ui/rigid-character';

interface AnimationFeedback {
  id: string;
  type: 'success' | 'error' | 'loading' | 'info';
  animation: RigidAnimation;
  message?: string;
  timestamp: number;
}

interface AnimationsState {
  // Global character state
  globalAnimation: RigidAnimation;
  isWorking: boolean;

  // Feedback queue
  feedbackQueue: AnimationFeedback[];
  currentFeedback: AnimationFeedback | null;

  // UI state for animations
  showCharacter: boolean;
}

interface AnimationsActions {
  // Set global animation state
  setGlobalAnimation: (animation: RigidAnimation) => void;
  setWorking: (working: boolean) => void;

  // Feedback methods
  triggerSuccess: (message?: string) => void;
  triggerError: (message?: string) => void;
  triggerLoading: (message?: string) => void;
  triggerInfo: (message?: string) => void;
  clearFeedback: () => void;

  // Character visibility
  setShowCharacter: (show: boolean) => void;

  // Reset to idle state
  resetToIdle: () => void;
}

type AnimationsStore = AnimationsState & AnimationsActions;

const FEEDBACK_DURATION = 2000; // ms

export const useAnimationsStore = create<AnimationsStore>()((set, get) => ({
  // Initial state
  globalAnimation: 'idle',
  isWorking: false,
  feedbackQueue: [],
  currentFeedback: null,
  showCharacter: true,

  // Actions
  setGlobalAnimation: (animation) => {
    set({ globalAnimation: animation });
  },

  setWorking: (working) => {
    set({
      isWorking: working,
      globalAnimation: working ? 'work' : 'idle',
    });
  },

  triggerSuccess: (message) => {
    const feedback: AnimationFeedback = {
      id: crypto.randomUUID(),
      type: 'success',
      animation: 'celebrate',
      message,
      timestamp: Date.now(),
    };

    set({
      currentFeedback: feedback,
      globalAnimation: 'celebrate',
    });

    // Auto-clear after duration
    setTimeout(() => {
      const state = get();
      if (state.currentFeedback?.id === feedback.id) {
        set({
          currentFeedback: null,
          globalAnimation: state.isWorking ? 'work' : 'idle',
        });
      }
    }, FEEDBACK_DURATION);
  },

  triggerError: (message) => {
    const feedback: AnimationFeedback = {
      id: crypto.randomUUID(),
      type: 'error',
      animation: 'shake',
      message,
      timestamp: Date.now(),
    };

    set({
      currentFeedback: feedback,
      globalAnimation: 'shake',
    });

    // Auto-clear after duration (shorter for shake)
    setTimeout(() => {
      const state = get();
      if (state.currentFeedback?.id === feedback.id) {
        set({
          currentFeedback: null,
          globalAnimation: 'sad',
        });

        // Return to idle after sad animation
        setTimeout(() => {
          const newState = get();
          if (newState.globalAnimation === 'sad') {
            set({ globalAnimation: newState.isWorking ? 'work' : 'idle' });
          }
        }, 1500);
      }
    }, 600);
  },

  triggerLoading: (message) => {
    const feedback: AnimationFeedback = {
      id: crypto.randomUUID(),
      type: 'loading',
      animation: 'work',
      message,
      timestamp: Date.now(),
    };

    set({
      currentFeedback: feedback,
      globalAnimation: 'work',
      isWorking: true,
    });
  },

  triggerInfo: (message) => {
    const feedback: AnimationFeedback = {
      id: crypto.randomUUID(),
      type: 'info',
      animation: 'wave',
      message,
      timestamp: Date.now(),
    };

    set({
      currentFeedback: feedback,
      globalAnimation: 'wave',
    });

    // Auto-clear after duration
    setTimeout(() => {
      const state = get();
      if (state.currentFeedback?.id === feedback.id) {
        set({
          currentFeedback: null,
          globalAnimation: state.isWorking ? 'work' : 'idle',
        });
      }
    }, FEEDBACK_DURATION);
  },

  clearFeedback: () => {
    const state = get();
    set({
      currentFeedback: null,
      globalAnimation: state.isWorking ? 'work' : 'idle',
      isWorking: false,
    });
  },

  setShowCharacter: (show) => {
    set({ showCharacter: show });
  },

  resetToIdle: () => {
    set({
      globalAnimation: 'idle',
      isWorking: false,
      currentFeedback: null,
    });
  },
}));

// Custom hook for animation feedback tied to async operations
export function useAnimationFeedback() {
  const { triggerSuccess, triggerError, triggerLoading, clearFeedback } = useAnimationsStore();

  const withFeedback = async <T>(
    operation: () => Promise<T>,
    options?: {
      loadingMessage?: string;
      successMessage?: string;
      errorMessage?: string;
    }
  ): Promise<T> => {
    triggerLoading(options?.loadingMessage);

    try {
      const result = await operation();
      triggerSuccess(options?.successMessage);
      return result;
    } catch (error) {
      triggerError(options?.errorMessage || (error instanceof Error ? error.message : 'An error occurred'));
      throw error;
    }
  };

  return { withFeedback, triggerSuccess, triggerError, triggerLoading, clearFeedback };
}
