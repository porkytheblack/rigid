// TypeScript types matching Rust models

// App types
export interface App {
  id: string;
  name: string;
  description: string | null;
  requirements: string | null;
  icon_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewApp {
  name: string;
  description?: string | null;
  requirements?: string | null;
  icon_path?: string | null;
}

export interface UpdateApp {
  name?: string | null;
  description?: string | null;
  requirements?: string | null;
  icon_path?: string | null;
}

export interface AppFilter {
  search?: string | null;
  limit?: number | null;
}

// Exploration types (maps to "test" in backend/database)
export type ExplorationStatus = 'draft' | 'active' | 'completed';

export interface Exploration {
  id: string;
  app_id: string;
  name: string;
  status: ExplorationStatus;
  created_at: string;
  updated_at: string;
}

export interface NewExploration {
  app_id: string;
  name: string;
}

export interface UpdateExploration {
  name?: string | null;
  status?: ExplorationStatus | null;
}

export interface ExplorationFilter {
  app_id?: string | null;
  status?: ExplorationStatus | null;
  limit?: number | null;
}

// Legacy type aliases for backend compatibility
export type TestStatus = ExplorationStatus;
export type Test = Exploration;
export type NewTest = NewExploration;
export type UpdateTest = UpdateExploration;
export type TestFilter = ExplorationFilter;

// Recording types
export type RecordingStatus = 'ready' | 'recording' | 'completed';

export interface Recording {
  id: string;
  test_id: string | null;
  name: string;
  status: RecordingStatus;
  recording_path: string | null;
  duration_ms: number | null;
  thumbnail_path: string | null;
  annotations_data: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewRecording {
  test_id?: string | null;
  name: string;
}

export interface UpdateRecording {
  name?: string | null;
  status?: RecordingStatus | null;
  recording_path?: string | null;
  duration_ms?: number | null;
  thumbnail_path?: string | null;
  annotations_data?: string | null;
}

export interface RecordingFilter {
  test_id?: string | null;
  app_id?: string | null;
  status?: RecordingStatus | null;
  limit?: number | null;
}

// Annotation types
export type AnnotationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface Annotation {
  id: string;
  recording_id: string;
  timestamp_ms: number;
  title: string;
  description: string | null;
  severity: AnnotationSeverity;
  issue_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewAnnotation {
  recording_id: string;
  timestamp_ms: number;
  title: string;
  description?: string | null;
  severity?: AnnotationSeverity;
  issue_id?: string | null;
}

export interface UpdateAnnotation {
  title?: string | null;
  description?: string | null;
  severity?: AnnotationSeverity | null;
  issue_id?: string | null;
}

// Issue types
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
export type IssuePriority = 'critical' | 'high' | 'medium' | 'low';

export interface Issue {
  id: string;
  test_id: string | null;
  number: number;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  screenshot_id: string | null;
  recording_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewIssue {
  test_id?: string | null;
  title: string;
  description?: string | null;
  priority?: IssuePriority;
  screenshot_id?: string | null;
  recording_id?: string | null;
}

export interface UpdateIssue {
  title?: string | null;
  description?: string | null;
  status?: IssueStatus | null;
  priority?: IssuePriority | null;
  screenshot_id?: string | null;
  recording_id?: string | null;
}

export interface IssueFilter {
  test_id?: string | null;
  status?: IssueStatus | null;
  priority?: IssuePriority | null;
  limit?: number | null;
}

// Checklist types
export type ChecklistStatus = 'untested' | 'passing' | 'failing' | 'blocked' | 'skipped';

export interface ChecklistItem {
  id: string;
  test_id: string | null;
  title: string;
  description: string | null;
  status: ChecklistStatus;
  sort_order: number;
  group_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewChecklistItem {
  test_id?: string | null;
  title: string;
  description?: string | null;
  group_name?: string | null;
  sort_order?: number;
}

export interface UpdateChecklistItem {
  title?: string | null;
  description?: string | null;
  status?: ChecklistStatus | null;
  group_name?: string | null;
  sort_order?: number | null;
}

export interface ChecklistFilter {
  test_id?: string | null;
  status?: ChecklistStatus | null;
  group_name?: string | null;
}

// Screenshot types
export interface Screenshot {
  id: string;
  test_id: string | null;
  title: string;
  description: string | null;
  image_path: string;
  created_at: string;
}

export interface NewScreenshot {
  test_id?: string | null;
  title: string;
  description?: string | null;
  image_path: string;
}

export interface UpdateScreenshot {
  title?: string | null;
  description?: string | null;
}

export interface ScreenshotFilter {
  test_id?: string | null;
  app_id?: string | null;
  limit?: number | null;
}

// Screenshot drawing types (for arrow, rectangle, circle, text, freehand annotations)
export type DrawingToolType = 'arrow' | 'rectangle' | 'circle' | 'text' | 'freehand' | 'eraser';

export interface ScreenshotDrawing {
  id: string;
  screenshot_id: string;
  tool_type: DrawingToolType;
  color: string;
  stroke_width: number;
  points: string | null; // JSON array of {x, y} for freehand
  start_x: number | null;
  start_y: number | null;
  end_x: number | null;
  end_y: number | null;
  text_content: string | null;
  font_size: number | null;
  sort_order: number;
  created_at: string;
}

export interface NewScreenshotDrawing {
  screenshot_id: string;
  tool_type: DrawingToolType;
  color: string;
  stroke_width?: number;
  points?: string | null;
  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  text_content?: string | null;
  font_size?: number | null;
  sort_order?: number;
}

// Screenshot marker types (labeled annotations with title, description, severity)
export type MarkerSeverity = 'info' | 'warning' | 'error' | 'success';

export interface ScreenshotMarker {
  id: string;
  screenshot_id: string;
  title: string;
  description: string | null;
  severity: MarkerSeverity;
  position_x: number;
  position_y: number;
  issue_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewScreenshotMarker {
  screenshot_id: string;
  title: string;
  description?: string | null;
  severity?: MarkerSeverity;
  position_x: number;
  position_y: number;
  issue_id?: string | null;
}

export interface UpdateScreenshotMarker {
  title?: string | null;
  description?: string | null;
  severity?: MarkerSeverity | null;
  position_x?: number | null;
  position_y?: number | null;
  issue_id?: string | null;
}

// Tag types
export type TaggableType = 'app' | 'test' | 'recording' | 'issue' | 'checklist_item' | 'screenshot';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface NewTag {
  name: string;
  color: string;
}

export interface UpdateTag {
  name?: string | null;
  color?: string | null;
}

// Setting types
export interface Setting {
  key: string;
  value: string;
}

// Count result types
export interface StatusCounts {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  wont_fix: number;
}

export interface PriorityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface ChecklistCounts {
  passing: number;
  failing: number;
  untested: number;
}

// AI types
export type AIProvider = 'ollama' | 'openrouter' | 'anthropic' | 'openai';

export interface AICapabilities {
  streaming: boolean;
  vision: boolean;
  embeddings: boolean;
  function_calling: boolean;
}

export interface ProviderStatus {
  provider: AIProvider;
  available: boolean;
  capabilities: AICapabilities;
  models: string[];
  error: string | null;
}

export interface AIStatus {
  configured: boolean;
  provider: string | null;
  capabilities: AICapabilities | null;
}

export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
}

export interface CompletionOptions {
  model?: string | null;
  max_tokens?: number | null;
  temperature?: number | null;
  stop_sequences?: string[] | null;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: TokenUsage | null;
  finish_reason: string | null;
}

// Document block types (block-based editor content for tests/explorations)
export type DocumentBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'quote'
  | 'bulletList'
  | 'numberedList'
  | 'todo'
  | 'code'
  | 'image'
  | 'divider'
  | 'callout'
  | 'toggle';

export type DocumentCalloutType = 'info' | 'warning' | 'success' | 'error';

export interface DocumentBlock {
  id: string;
  test_id: string;
  block_type: DocumentBlockType;
  content: string;
  checked: number | null; // 0 or 1 for todo blocks
  language: string | null; // for code blocks
  callout_type: DocumentCalloutType | null; // for callout blocks
  image_path: string | null; // for image blocks
  image_caption: string | null; // caption for image blocks
  collapsed: number | null; // 0 or 1 for toggle blocks
  indent_level: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewDocumentBlock {
  test_id: string;
  block_type: DocumentBlockType;
  content?: string | null;
  checked?: boolean | null;
  language?: string | null;
  callout_type?: DocumentCalloutType | null;
  image_path?: string | null;
  image_caption?: string | null;
  collapsed?: boolean | null;
  indent_level?: number | null;
  sort_order?: number | null;
}

export interface UpdateDocumentBlock {
  block_type?: DocumentBlockType | null;
  content?: string | null;
  checked?: boolean | null;
  language?: string | null;
  callout_type?: DocumentCalloutType | null;
  image_path?: string | null;
  image_caption?: string | null;
  collapsed?: boolean | null;
  indent_level?: number | null;
  sort_order?: number | null;
}

// Exploration todo types (sidebar checklist in doc tab)
export interface ExplorationTodo {
  id: string;
  test_id: string;
  content: string;
  checked: number; // 0 or 1
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewExplorationTodo {
  test_id: string;
  content?: string | null;
  checked?: boolean | null;
  sort_order?: number | null;
}

export interface UpdateExplorationTodo {
  content?: string | null;
  checked?: boolean | null;
  sort_order?: number | null;
}

// Diagram types (mind maps, user flows, dependency graphs)
export type DiagramType = 'mindmap' | 'userflow' | 'dependency';

export interface Diagram {
  id: string;
  test_id: string | null;
  architecture_doc_id: string | null;
  name: string;
  diagram_type: DiagramType;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  created_at: string;
  updated_at: string;
}

export interface NewDiagram {
  test_id?: string | null;
  architecture_doc_id?: string | null;
  name: string;
  diagram_type: DiagramType;
  viewport_x?: number | null;
  viewport_y?: number | null;
  viewport_zoom?: number | null;
}

export interface UpdateDiagram {
  name?: string | null;
  viewport_x?: number | null;
  viewport_y?: number | null;
  viewport_zoom?: number | null;
}

export interface DiagramFilter {
  test_id?: string | null;
  architecture_doc_id?: string | null;
  diagram_type?: DiagramType | null;
}

// Diagram node types
export interface DiagramNode {
  id: string;
  diagram_id: string;
  node_type: string;
  label: string;
  notes: string | null;
  position_x: number;
  position_y: number;
  width: number | null;
  height: number | null;
  style_data: string | null; // JSON
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewDiagramNode {
  diagram_id: string;
  node_type: string;
  label?: string | null;
  notes?: string | null;
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  style_data?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
}

export interface UpdateDiagramNode {
  node_type?: string | null;
  label?: string | null;
  notes?: string | null;
  position_x?: number | null;
  position_y?: number | null;
  width?: number | null;
  height?: number | null;
  style_data?: string | null;
  parent_id?: string | null;
  sort_order?: number | null;
}

// Diagram edge types
export interface DiagramEdge {
  id: string;
  diagram_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  label: string | null;
  style_data: string | null; // JSON
  created_at: string;
}

export interface NewDiagramEdge {
  diagram_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type?: string | null;
  label?: string | null;
  style_data?: string | null;
}

export interface UpdateDiagramEdge {
  edge_type?: string | null;
  label?: string | null;
  style_data?: string | null;
}

// Node attachment types (screenshots/recordings linked to nodes)
export type AttachmentType = 'screenshot' | 'recording';

export interface NodeAttachment {
  id: string;
  node_id: string;
  attachment_type: AttachmentType;
  screenshot_id: string | null;
  recording_id: string | null;
  timestamp_ms: number | null;
  sort_order: number;
  created_at: string;
}

export interface NewNodeAttachment {
  node_id: string;
  attachment_type: AttachmentType;
  screenshot_id?: string | null;
  recording_id?: string | null;
  timestamp_ms?: number | null;
  sort_order?: number | null;
}

// Diagram with data (full diagram including nodes and edges)
export interface DiagramWithData {
  diagram: Diagram;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

// Architecture document types
export interface ArchitectureDoc {
  id: string;
  app_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewArchitectureDoc {
  app_id: string;
  name: string;
  icon?: string | null;
  sort_order?: number | null;
}

export interface UpdateArchitectureDoc {
  name?: string | null;
  icon?: string | null;
  sort_order?: number | null;
}

// Architecture document block types (similar to DocumentBlock but with mermaid support)
export type ArchitectureDocBlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'quote'
  | 'bulletList'
  | 'numberedList'
  | 'todo'
  | 'code'
  | 'image'
  | 'divider'
  | 'callout'
  | 'toggle'
  | 'mermaid';

export interface ArchitectureDocBlock {
  id: string;
  doc_id: string;
  block_type: ArchitectureDocBlockType;
  content: string;
  checked: number | null;
  language: string | null;
  callout_type: DocumentCalloutType | null;
  image_path: string | null;
  image_caption: string | null;
  collapsed: number | null;
  mermaid_code: string | null;
  indent_level: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewArchitectureDocBlock {
  doc_id: string;
  block_type: ArchitectureDocBlockType;
  content?: string | null;
  checked?: boolean | null;
  language?: string | null;
  callout_type?: DocumentCalloutType | null;
  image_path?: string | null;
  image_caption?: string | null;
  collapsed?: boolean | null;
  mermaid_code?: string | null;
  indent_level?: number | null;
  sort_order?: number | null;
}

export interface UpdateArchitectureDocBlock {
  block_type?: ArchitectureDocBlockType | null;
  content?: string | null;
  checked?: boolean | null;
  language?: string | null;
  callout_type?: DocumentCalloutType | null;
  image_path?: string | null;
  image_caption?: string | null;
  collapsed?: boolean | null;
  mermaid_code?: string | null;
  indent_level?: number | null;
  sort_order?: number | null;
}

// Architecture doc with blocks
export interface ArchitectureDocWithBlocks {
  doc: ArchitectureDoc;
  blocks: ArchitectureDocBlock[];
}
