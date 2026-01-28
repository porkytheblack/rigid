import { create } from 'zustand';

export type Route =
  | { name: 'home' }
  | { name: 'app'; appId: string }
  | { name: 'exploration'; appId: string; explorationId: string; tab?: 'doc' | 'annotations' | 'screenshots' | 'recordings' | 'diagrams' }
  | { name: 'screenshot-editor'; appId: string; explorationId: string; screenshotId: string }
  | { name: 'video-editor'; appId: string; explorationId: string; recordingId: string; timestamp?: number }
  | { name: 'diagram-editor'; appId: string; explorationId: string; diagramId: string }
  | { name: 'architecture-doc'; appId: string; docId: string }
  | { name: 'architecture-diagram-editor'; appId: string; docId: string; diagramId: string }
  | { name: 'demo-editor'; appId: string; demoId: string }
  | { name: 'settings' };

interface RouterState {
  route: Route;
  history: Route[];
}

interface RouterActions {
  navigate: (route: Route) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}

type RouterStore = RouterState & RouterActions;

export const useRouterStore = create<RouterStore>((set, get) => ({
  route: { name: 'home' },
  history: [],

  navigate: (route) => {
    const current = get().route;
    set((state) => ({
      route,
      history: [...state.history, current],
    }));
  },

  goBack: () => {
    const history = get().history;
    if (history.length === 0) return;

    const previous = history[history.length - 1];
    set({
      route: previous,
      history: history.slice(0, -1),
    });
  },

  canGoBack: () => get().history.length > 0,
}));
