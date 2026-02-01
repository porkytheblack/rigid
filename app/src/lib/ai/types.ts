// AI Feature Types
import type {
  AIProvider,
  App,
  Exploration,
  Screenshot,
  ScreenshotMarker,
  Recording,
  Annotation,
  DocumentBlock,
  ArchitectureDocWithBlocks,
  Issue,
  Feature,
  DiagramWithData,
  ChecklistItem,
  Demo,
  DemoWithData,
} from '@/lib/tauri/types';
import type { Route } from '@/lib/stores/router';

// =============================================================================
// AI Modes
// =============================================================================

export type AIMode = 'qa' | 'fix-prompt' | 'session-resume' | 'summary';

// =============================================================================
// Conversation & Messages
// =============================================================================

export interface Conversation {
  id: string;
  title: string;
  mode: AIMode;
  createdAt: number;
  updatedAt: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: Citation[];
  isStreaming?: boolean;
  error?: string;
}

export interface Citation {
  type: CitationType;
  id: string;
  title: string;
  snippet?: string;
  route?: Route;
}

export type CitationType =
  | 'exploration'
  | 'screenshot'
  | 'recording'
  | 'annotation'
  | 'architecture_doc'
  | 'issue'
  | 'feature'
  | 'document'
  | 'diagram'
  | 'checklist'
  | 'demo';

// =============================================================================
// AI Settings
// =============================================================================

export interface AISettings {
  provider: AIProvider | null;
  model: string | null;
  maxTokens: number;
  temperature: number;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: null,
  model: null,
  maxTokens: 8192,
  temperature: 0.7,
};

// =============================================================================
// Context Data
// =============================================================================

export interface ContextData {
  route: Route;
  app?: App;
  exploration?: Exploration;
  screenshots?: Screenshot[];
  screenshotMarkers?: ScreenshotMarker[];
  recordings?: Recording[];
  annotations?: Annotation[];
  documentBlocks?: DocumentBlock[];
  architectureDoc?: ArchitectureDocWithBlocks;
  issues?: Issue[];
  features?: Feature[];
  diagrams?: DiagramWithData[];
  checklistItems?: ChecklistItem[];
  demo?: Demo;
  demoWithData?: DemoWithData;
  // Maps for enriched context (marker/annotation -> screenshot/recording lookups)
  screenshotMap?: Map<string, Screenshot>;
  recordingMap?: Map<string, Recording>;
}

// =============================================================================
// Session History (for Session Resumption)
// =============================================================================

export interface SessionHistoryEntry {
  route: Route;
  timestamp: number;
  action?: 'viewed' | 'edited' | 'created';
}

export interface SessionSummary {
  lastVisitedRoutes: Route[];
  recentlyEditedItems: RecentItem[];
  incompleteWork: IncompleteItem[];
  suggestedNextSteps: string[];
}

export interface RecentItem {
  type: 'exploration' | 'issue' | 'feature' | 'screenshot' | 'recording';
  id: string;
  title: string;
  updatedAt: string;
}

export interface IncompleteItem {
  type: 'issue' | 'feature' | 'checklist';
  id: string;
  title: string;
  reason: string;
}

// =============================================================================
// Fix Prompt Context
// =============================================================================

export interface FixPromptContext {
  issue: Issue;
  linkedScreenshot?: Screenshot;
  linkedRecording?: Recording;
  screenshotMarkers?: ScreenshotMarker[];
  annotations?: Annotation[];
  relatedExploration?: Exploration;
  relatedFeature?: Feature;
}

// =============================================================================
// Rigid Character States
// =============================================================================

export type RigidAIState = 'idle' | 'thinking' | 'working' | 'success' | 'error';

export function mapAIStateToAnimation(state: RigidAIState): 'idle' | 'think' | 'work' | 'celebrate' | 'sad' {
  switch (state) {
    case 'idle':
      return 'idle';
    case 'thinking':
      return 'think';
    case 'working':
      return 'work';
    case 'success':
      return 'celebrate';
    case 'error':
      return 'sad';
    default:
      return 'idle';
  }
}
