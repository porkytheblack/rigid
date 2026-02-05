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
  app_id: string | null;
  test_id: string | null;
  name: string;
  status: RecordingStatus;
  recording_path: string | null;
  webcam_path: string | null;
  duration_ms: number | null;
  thumbnail_path: string | null;
  watch_progress_ms: number | null;
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
  webcam_path?: string | null;
  duration_ms?: number | null;
  thumbnail_path?: string | null;
  watch_progress_ms?: number | null;
}

export interface RecordingFilter {
  test_id?: string | null;
  app_id?: string | null;
  status?: RecordingStatus | null;
  limit?: number | null;
}

// Annotation types
export type AnnotationSeverity = 'info' | 'warning' | 'error' | 'success' | 'eureka';

export interface Annotation {
  id: string;
  recording_id: string;
  timestamp_ms: number;
  title: string;
  description: string | null;
  severity: AnnotationSeverity;
  is_fixed: boolean;
  issue_id: string | null;
  feature_id: string | null;
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
  feature_id?: string | null;
}

export interface UpdateAnnotation {
  title?: string | null;
  description?: string | null;
  severity?: AnnotationSeverity | null;
  is_fixed?: boolean | null;
  issue_id?: string | null;
  feature_id?: string | null;
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
  app_id: string | null;
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
export type MarkerSeverity = 'info' | 'warning' | 'error' | 'success' | 'eureka';

export interface ScreenshotMarker {
  id: string;
  screenshot_id: string;
  title: string;
  description: string | null;
  severity: MarkerSeverity;
  is_fixed: boolean;
  position_x: number;
  position_y: number;
  issue_id: string | null;
  feature_id: string | null;
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
  feature_id?: string | null;
}

export interface UpdateScreenshotMarker {
  title?: string | null;
  description?: string | null;
  severity?: MarkerSeverity | null;
  is_fixed?: boolean | null;
  position_x?: number | null;
  position_y?: number | null;
  issue_id?: string | null;
  feature_id?: string | null;
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

export type DocumentCalloutType = 'info' | 'warning' | 'success' | 'error' | 'tip' | 'note';

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

// =============================================================================
// Native Capture Types (ScreenCaptureKit on macOS)
// =============================================================================

/** Video codec for native recording */
export type NativeVideoCodec = 'h264' | 'hevc' | 'prores422' | 'prores422hq';

/** Native recording configuration options */
export interface NativeRecordingOptions {
  /** Video codec: "h264", "hevc", "prores422", "prores422hq" (default: hevc) */
  codec?: NativeVideoCodec | null;
  /** Bitrate in bits per second (e.g., 20000000 for 20 Mbps) */
  bitrate?: number | null;
  /** Frames per second (default: 60) */
  fps?: number | null;
  /** Keyframe interval in frames (default: 60 = 1 second at 60fps) */
  keyframeInterval?: number | null;
  /** Capture at retina resolution (default: true) */
  retinaCapture?: boolean | null;
  /** Include cursor in capture (default: true) */
  captureCursor?: boolean | null;
  /** Include audio (default: false) */
  captureAudio?: boolean | null;
}

/** Native screenshot configuration options */
export interface NativeScreenshotOptions {
  /** Capture at retina resolution (default: true) */
  retinaCapture?: boolean | null;
  /** Include cursor in capture (default: false) */
  captureCursor?: boolean | null;
}

/** Window info from native ScreenCaptureKit */
export interface NativeWindowInfo {
  window_id: number;
  title: string;
  owner_name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backing_scale_factor: number;
}

/** Display info from native ScreenCaptureKit */
export interface NativeDisplayInfo {
  display_id: number;
  name: string;
  width: number;
  height: number;
  backing_scale_factor: number;
  is_main: boolean;
}

// =============================================================================
// Demo Video Editor Types
// =============================================================================

/** Demo project format presets */
export type DemoFormat = 'youtube' | 'youtube_4k' | 'tiktok' | 'square' | 'custom';

/** Format dimensions mapping */
export const DEMO_FORMAT_DIMENSIONS: Record<DemoFormat, { width: number; height: number; label: string }> = {
  youtube: { width: 1920, height: 1080, label: 'YouTube (1920×1080)' },
  youtube_4k: { width: 3840, height: 2160, label: 'YouTube 4K (3840×2160)' },
  tiktok: { width: 1080, height: 1920, label: 'TikTok/Reels (1080×1920)' },
  square: { width: 1080, height: 1080, label: 'Square (1080×1080)' },
  custom: { width: 1920, height: 1080, label: 'Custom' },
};

/** Demo project - main container for a video demo */
export interface Demo {
  id: string;
  app_id: string;
  name: string;
  format: DemoFormat;
  width: number;
  height: number;
  frame_rate: number;
  duration_ms: number;
  thumbnail_path: string | null;
  export_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewDemo {
  app_id: string;
  name: string;
  format?: DemoFormat;
  width?: number;
  height?: number;
  frame_rate?: number;
}

export interface UpdateDemo {
  name?: string | null;
  format?: DemoFormat | null;
  width?: number | null;
  height?: number | null;
  frame_rate?: number | null;
  duration_ms?: number | null;
  thumbnail_path?: string | null;
  export_path?: string | null;
}

export interface DemoFilter {
  app_id?: string | null;
  limit?: number | null;
}

/** Background type for demo canvas */
export type DemoBackgroundType = 'solid' | 'gradient' | 'pattern' | 'image' | 'video' | 'blur';

/** Gradient direction */
export type GradientDirection = 'vertical' | 'horizontal' | 'diagonal' | 'radial';

/** Demo background configuration */
export interface DemoBackground {
  id: string;
  demo_id: string;
  background_type: DemoBackgroundType;
  // Solid color
  color: string | null;
  // Gradient
  gradient_stops: string | null; // JSON array of { color: string, position: number }
  gradient_direction: GradientDirection | null;
  gradient_angle: number | null;
  // Pattern
  pattern_type: string | null;
  pattern_color: string | null;
  pattern_scale: number | null;
  // Image/Video
  media_path: string | null;
  media_scale: number | null;
  media_position_x: number | null;
  media_position_y: number | null;
  // Unsplash/URL image
  image_url: string | null;
  image_attribution: string | null; // JSON { name: string, link: string }
  created_at: string;
  updated_at: string;
}

export interface NewDemoBackground {
  demo_id: string;
  background_type: DemoBackgroundType;
  color?: string | null;
  gradient_stops?: string | null;
  gradient_direction?: GradientDirection | null;
  gradient_angle?: number | null;
  pattern_type?: string | null;
  pattern_color?: string | null;
  pattern_scale?: number | null;
  media_path?: string | null;
  media_scale?: number | null;
  media_position_x?: number | null;
  media_position_y?: number | null;
  image_url?: string | null;
  image_attribution?: string | null;
}

export interface UpdateDemoBackground {
  background_type?: DemoBackgroundType | null;
  color?: string | null;
  gradient_stops?: string | null;
  gradient_direction?: GradientDirection | null;
  gradient_angle?: number | null;
  pattern_type?: string | null;
  pattern_color?: string | null;
  pattern_scale?: number | null;
  media_path?: string | null;
  media_scale?: number | null;
  media_position_x?: number | null;
  media_position_y?: number | null;
  image_url?: string | null;
  image_attribution?: string | null;
}

/** Track type in timeline */
export type DemoTrackType = 'background' | 'video' | 'image' | 'audio' | 'zoom' | 'blur' | 'pan' | 'transform';

/** Easing type for animations */
export type TransformEasingType = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';

/** Demo timeline track */
export interface DemoTrack {
  id: string;
  demo_id: string;
  track_type: DemoTrackType;
  name: string;
  locked: boolean;
  visible: boolean;
  muted: boolean;
  volume: number;
  sort_order: number;
  /** For zoom tracks - references the target video/image track */
  target_track_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewDemoTrack {
  id?: string;  // Allow client to provide ID for consistency
  demo_id: string;
  track_type: DemoTrackType;
  name: string;
  sort_order?: number;
  target_track_id?: string | null;
}

export interface UpdateDemoTrack {
  name?: string | null;
  locked?: boolean | null;
  visible?: boolean | null;
  muted?: boolean | null;
  volume?: number | null;
  sort_order?: number | null;
  target_track_id?: string | null;
}

/** Zoom clip - keyframe region on a zoom track */
export interface DemoZoomClip {
  id: string;
  track_id: string;
  name: string;
  /** When the zoom effect starts on the timeline */
  start_time_ms: number;
  /** Total duration of the zoom effect */
  duration_ms: number;
  /** Target zoom scale (e.g., 2.0 for 200%) */
  zoom_scale: number;
  /** X position of zoom focus (0-100%) */
  zoom_center_x: number;
  /** Y position of zoom focus (0-100%) */
  zoom_center_y: number;
  /** Duration to zoom in (from start) */
  ease_in_duration_ms: number;
  /** Duration to zoom out (before end) */
  ease_out_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface NewDemoZoomClip {
  id?: string; // Allow client to provide ID for consistency
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  zoom_scale?: number;
  zoom_center_x?: number;
  zoom_center_y?: number;
  ease_in_duration_ms?: number;
  ease_out_duration_ms?: number;
}

export interface UpdateDemoZoomClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  zoom_scale?: number | null;
  zoom_center_x?: number | null;
  zoom_center_y?: number | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

/** Blur clip - blur region on a blur track */
export interface DemoBlurClip {
  id: string;
  track_id: string;
  name: string;
  /** When the blur effect starts on the timeline */
  start_time_ms: number;
  /** Total duration of the blur effect */
  duration_ms: number;
  /** Blur intensity/radius (0-100) */
  blur_intensity: number;
  /** X position of blur region center (0-100%) */
  region_x: number;
  /** Y position of blur region center (0-100%) */
  region_y: number;
  /** Width of blur region (0-100% of canvas) */
  region_width: number;
  /** Height of blur region (0-100% of canvas) */
  region_height: number;
  /** Corner radius of blur region (0-100) */
  corner_radius: number;
  /** Whether to blur inside (true) or outside (false) the region */
  blur_inside: boolean;
  /** Duration to fade in blur */
  ease_in_duration_ms: number;
  /** Duration to fade out blur */
  ease_out_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface NewDemoBlurClip {
  id?: string; // Allow client to provide ID for consistency
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  blur_intensity?: number;
  region_x?: number;
  region_y?: number;
  region_width?: number;
  region_height?: number;
  corner_radius?: number;
  blur_inside?: boolean;
  ease_in_duration_ms?: number;
  ease_out_duration_ms?: number;
}

export interface UpdateDemoBlurClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  blur_intensity?: number | null;
  region_x?: number | null;
  region_y?: number | null;
  region_width?: number | null;
  region_height?: number | null;
  corner_radius?: number | null;
  blur_inside?: boolean | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

/** Demo pan clip - pan/move effect applied to a target track */
export interface DemoPanClip {
  id: string;
  track_id: string;
  name: string;
  /** When the pan effect starts on the timeline */
  start_time_ms: number;
  /** Total duration of the pan effect */
  duration_ms: number;
  /** Starting X position (0-100% of canvas, 50 = center) */
  start_x: number;
  /** Starting Y position (0-100% of canvas, 50 = center) */
  start_y: number;
  /** Ending X position (0-100% of canvas) */
  end_x: number;
  /** Ending Y position (0-100% of canvas) */
  end_y: number;
  /** Duration to ease into the pan */
  ease_in_duration_ms: number;
  /** Duration to ease out of the pan */
  ease_out_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface NewDemoPanClip {
  id?: string; // Allow client to provide ID for consistency
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  start_x?: number;
  start_y?: number;
  end_x?: number;
  end_y?: number;
  ease_in_duration_ms?: number;
  ease_out_duration_ms?: number;
}

export interface UpdateDemoPanClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

/** Transform keyframe - individual keyframe within a transform clip */
export interface TransformKeyframe {
  id: string;
  /** Time within clip relative to clip start (in milliseconds) */
  time_ms: number;
  /** X position offset in pixels (null means inherit from previous keyframe or default) */
  position_x: number | null;
  /** Y position offset in pixels (null means inherit from previous keyframe or default) */
  position_y: number | null;
  /** X scale factor (1.0 = 100%, null means inherit) */
  scale_x: number | null;
  /** Y scale factor (1.0 = 100%, null means inherit) */
  scale_y: number | null;
  /** Rotation in degrees (null means inherit) */
  rotation: number | null;
  /** Opacity from 0 to 1 (null means inherit) */
  opacity: number | null;
  /** Easing curve to use when interpolating TO the next keyframe */
  easing: TransformEasingType | null;
}

/** Demo transform clip - keyframe-based animation on a transform track */
export interface DemoTransformClip {
  id: string;
  track_id: string;
  name: string;
  /** When the transform effect starts on the timeline */
  start_time_ms: number;
  /** Total duration of the transform effect */
  duration_ms: number;
  /** Array of keyframes defining the animation */
  keyframes: TransformKeyframe[];
  created_at: string;
  updated_at: string;
}

export interface NewDemoTransformClip {
  id?: string;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  keyframes?: TransformKeyframe[];
}

export interface UpdateDemoTransformClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  keyframes?: TransformKeyframe[] | null;
}

/** Demo clip - media element on a track */
export interface DemoClip {
  id: string;
  track_id: string;
  name: string;
  // Source media
  source_path: string;
  source_type: 'video' | 'image' | 'audio';
  source_duration_ms: number | null;
  // Timeline position
  start_time_ms: number;
  duration_ms: number;
  // Source trim (in/out points)
  in_point_ms: number;
  out_point_ms: number | null;
  // Transform (for video/image)
  position_x: number | null;
  position_y: number | null;
  scale: number | null;
  rotation: number | null;
  // Crop
  crop_top: number | null;
  crop_bottom: number | null;
  crop_left: number | null;
  crop_right: number | null;
  // Appearance
  corner_radius: number | null;
  opacity: number | null;
  // Shadow
  shadow_enabled: boolean;
  shadow_blur: number | null;
  shadow_offset_x: number | null;
  shadow_offset_y: number | null;
  shadow_color: string | null;
  shadow_opacity: number | null;
  // Border
  border_enabled: boolean;
  border_width: number | null;
  border_color: string | null;
  // Audio
  volume: number | null;
  audio_fade_in_ms: number | null;
  audio_fade_out_ms: number | null;
  // Speed
  speed: number | null;
  // Freeze frame (still image from video)
  freeze_frame: boolean;
  freeze_frame_time_ms: number | null;
  // Entrance/exit transitions
  transition_in_type: string | null; // fade, slide_up, slide_down, slide_left, slide_right, scale, blur
  transition_in_duration_ms: number | null;
  transition_out_type: string | null;
  transition_out_duration_ms: number | null;
  // Zoom effect (for demo highlights)
  zoom_enabled: boolean;
  zoom_scale: number | null;       // Target zoom scale (e.g., 2.0 for 200%)
  zoom_center_x: number | null;    // X position of zoom focus (0-100%)
  zoom_center_y: number | null;    // Y position of zoom focus (0-100%)
  zoom_in_start_ms: number | null; // When zoom in starts (offset from clip start)
  zoom_in_duration_ms: number | null; // Duration of zoom in animation
  zoom_out_start_ms: number | null;   // When zoom out starts (offset from clip start)
  zoom_out_duration_ms: number | null; // Duration of zoom out animation
  // Media info (detected via ffprobe)
  has_audio: boolean | null;
  // Clip linking (for split audio/video)
  linked_clip_id: string | null;  // ID of linked clip (audio links to video, video links to audio)
  muted: boolean;  // Mute audio in this clip (used when audio is split out)
  created_at: string;
  updated_at: string;
}

export interface NewDemoClip {
  id?: string;  // Allow client to provide ID for consistency
  track_id: string;
  name: string;
  source_path: string;
  source_type: 'video' | 'image' | 'audio';
  source_duration_ms?: number | null;
  start_time_ms: number;
  duration_ms: number;
  in_point_ms?: number;
  position_x?: number | null;
  position_y?: number | null;
  scale?: number | null;
  speed?: number | null;
  has_audio?: boolean | null;
  linked_clip_id?: string | null;
  muted?: boolean;
}

export interface UpdateDemoClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  in_point_ms?: number | null;
  out_point_ms?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  scale?: number | null;
  rotation?: number | null;
  crop_top?: number | null;
  crop_bottom?: number | null;
  crop_left?: number | null;
  crop_right?: number | null;
  corner_radius?: number | null;
  opacity?: number | null;
  shadow_enabled?: boolean | null;
  shadow_blur?: number | null;
  shadow_offset_x?: number | null;
  shadow_offset_y?: number | null;
  shadow_color?: string | null;
  shadow_opacity?: number | null;
  border_enabled?: boolean | null;
  border_width?: number | null;
  border_color?: string | null;
  volume?: number | null;
  audio_fade_in_ms?: number | null;
  audio_fade_out_ms?: number | null;
  speed?: number | null;
  freeze_frame?: boolean | null;
  freeze_frame_time_ms?: number | null;
  transition_in_type?: string | null;
  transition_in_duration_ms?: number | null;
  transition_out_type?: string | null;
  transition_out_duration_ms?: number | null;
  linked_clip_id?: string | null;
  muted?: boolean | null;
}

/** Demo asset - imported media file */
export interface DemoAsset {
  id: string;
  demo_id: string;
  name: string;
  file_path: string;
  asset_type: 'video' | 'image' | 'audio';
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  thumbnail_path: string | null;
  file_size: number | null;
  has_audio: boolean | null;
  created_at: string;
}

export interface NewDemoAsset {
  id?: string; // Allow client to provide ID for consistency
  demo_id: string;
  name: string;
  file_path: string;
  asset_type: 'video' | 'image' | 'audio';
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
  thumbnail_path?: string | null;
  file_size?: number | null;
  has_audio?: boolean | null;
}

export interface UpdateDemoAsset {
  name?: string | null;
  thumbnail_path?: string | null;
}

// Demo Recording Link (associates a recording with a demo)
export interface DemoRecording {
  id: string;
  demo_id: string;
  recording_id: string;
  sort_order: number;
  created_at: string;
}

export interface NewDemoRecording {
  demo_id: string;
  recording_id: string;
  sort_order?: number | null;
}

// Demo Screenshot Link (associates a screenshot with a demo)
export interface DemoScreenshot {
  id: string;
  demo_id: string;
  screenshot_id: string;
  sort_order: number;
  created_at: string;
}

export interface NewDemoScreenshot {
  demo_id: string;
  screenshot_id: string;
  sort_order?: number | null;
}

// Demo Video (video project with its own isolated editor state)
// Videos are independent entities under demos - each has its own tracks, clips, assets, etc.
export interface DemoVideo {
  id: string;
  demo_id: string;
  name: string;
  file_path: string;
  thumbnail_path: string | null;
  duration_ms: number;
  width: number;
  height: number;
  frame_rate: number;
  file_size: number | null;
  format: string;
  created_at: string;
  updated_at: string;
}

export interface NewDemoVideo {
  demo_id: string;
  name: string;
  file_path?: string | null;
  thumbnail_path?: string | null;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
  frame_rate?: number | null;
  file_size?: number | null;
  format?: string | null;
}

export interface UpdateDemoVideo {
  name?: string | null;
  file_path?: string | null;
  thumbnail_path?: string | null;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
  frame_rate?: number | null;
}

/** Export quality preset */
export type DemoExportQuality = 'draft' | 'good' | 'high' | 'max';

/** Export format */
export type DemoExportFormat = 'mp4' | 'webm';

/** Export configuration */
export interface DemoExportConfig {
  format: DemoExportFormat;
  quality: DemoExportQuality;
  width: number;
  height: number;
  frame_rate: number;
  output_path: string;
}

/** Full demo with all related data */
export interface DemoWithData {
  demo: Demo;
  background: DemoBackground | null;
  tracks: DemoTrack[];
  clips: DemoClip[];
  zoomClips: DemoZoomClip[];
  blurClips: DemoBlurClip[];
  panClips: DemoPanClip[];
  transformClips: DemoTransformClip[];
  assets: DemoAsset[];
}

// Feature types
export type FeatureStatus = 'planned' | 'in_progress' | 'completed' | 'deprecated';
export type FeaturePriority = 'low' | 'medium' | 'high' | 'critical';

export interface Feature {
  id: string;
  app_id: string;
  name: string;
  description: string | null;
  status: FeatureStatus;
  priority: FeaturePriority;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewFeature {
  app_id: string;
  name: string;
  description?: string | null;
  status?: FeatureStatus | null;
  priority?: FeaturePriority | null;
}

export interface UpdateFeature {
  name?: string | null;
  description?: string | null;
  status?: FeatureStatus | null;
  priority?: FeaturePriority | null;
  sort_order?: number | null;
}

export interface FeatureFilter {
  app_id?: string | null;
  status?: FeatureStatus | null;
}

// ============ Video Editor State Types ============

export interface VideoWithData {
  video: DemoVideo;
  background: VideoBackground | null;
  tracks: VideoTrack[];
  clips: VideoClip[];
  zoomClips: VideoZoomClip[];
  blurClips: VideoBlurClip[];
  panClips: VideoPanClip[];
  transformClips: VideoTransformClip[];
  assets: VideoAsset[];
}

export interface VideoBackground {
  id: string;
  video_id: string;
  background_type: string;
  color: string | null;
  gradient_stops: string | null;
  gradient_direction: string | null;
  gradient_angle: number | null;
  pattern_type: string | null;
  pattern_color: string | null;
  pattern_scale: number | null;
  media_path: string | null;
  media_scale: number | null;
  media_position_x: number | null;
  media_position_y: number | null;
  image_url: string | null;
  image_attribution: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewVideoBackground {
  video_id: string;
  background_type: string;
  color?: string | null;
  gradient_stops?: string | null;
  gradient_direction?: string | null;
  gradient_angle?: number | null;
  pattern_type?: string | null;
  pattern_color?: string | null;
  pattern_scale?: number | null;
  media_path?: string | null;
  media_scale?: number | null;
  media_position_x?: number | null;
  media_position_y?: number | null;
  image_url?: string | null;
  image_attribution?: string | null;
}

export interface UpdateVideoBackground {
  background_type?: string | null;
  color?: string | null;
  gradient_stops?: string | null;
  gradient_direction?: string | null;
  gradient_angle?: number | null;
  pattern_type?: string | null;
  pattern_color?: string | null;
  pattern_scale?: number | null;
  media_path?: string | null;
  media_scale?: number | null;
  media_position_x?: number | null;
  media_position_y?: number | null;
  image_url?: string | null;
  image_attribution?: string | null;
}

export interface VideoTrack {
  id: string;
  video_id: string;
  track_type: string;
  name: string;
  locked: boolean;
  visible: boolean;
  muted: boolean;
  volume: number;
  sort_order: number;
  target_track_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewVideoTrack {
  id?: string | null;
  video_id: string;
  track_type: string;
  name: string;
  locked?: boolean | null;
  visible?: boolean | null;
  muted?: boolean | null;
  volume?: number | null;
  sort_order?: number | null;
  target_track_id?: string | null;
}

export interface UpdateVideoTrack {
  name?: string | null;
  locked?: boolean | null;
  visible?: boolean | null;
  muted?: boolean | null;
  volume?: number | null;
  sort_order?: number | null;
  target_track_id?: string | null;
}

export interface VideoClip {
  id: string;
  track_id: string;
  name: string;
  source_path: string;
  source_type: string;
  source_duration_ms: number | null;
  start_time_ms: number;
  duration_ms: number;
  in_point_ms: number;
  out_point_ms: number | null;
  position_x: number | null;
  position_y: number | null;
  scale: number | null;
  rotation: number | null;
  crop_top: number | null;
  crop_bottom: number | null;
  crop_left: number | null;
  crop_right: number | null;
  corner_radius: number | null;
  opacity: number | null;
  shadow_enabled: boolean;
  shadow_blur: number | null;
  shadow_offset_x: number | null;
  shadow_offset_y: number | null;
  shadow_color: string | null;
  shadow_opacity: number | null;
  border_enabled: boolean;
  border_width: number | null;
  border_color: string | null;
  volume: number;
  muted: boolean;
  speed: number;
  freeze_frame: boolean;
  freeze_frame_time_ms: number | null;
  transition_in_type: string | null;
  transition_in_duration_ms: number | null;
  transition_out_type: string | null;
  transition_out_duration_ms: number | null;
  audio_fade_in_ms: number | null;
  audio_fade_out_ms: number | null;
  linked_clip_id: string | null;
  has_audio: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface NewVideoClip {
  id?: string | null;
  track_id: string;
  name: string;
  source_path: string;
  source_type: string;
  duration_ms: number;
  source_duration_ms?: number | null;
  start_time_ms?: number | null;
  in_point_ms?: number | null;
  out_point_ms?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  scale?: number | null;
  rotation?: number | null;
  crop_top?: number | null;
  crop_bottom?: number | null;
  crop_left?: number | null;
  crop_right?: number | null;
  corner_radius?: number | null;
  opacity?: number | null;
  shadow_enabled?: boolean | null;
  shadow_blur?: number | null;
  shadow_offset_x?: number | null;
  shadow_offset_y?: number | null;
  shadow_color?: string | null;
  shadow_opacity?: number | null;
  border_enabled?: boolean | null;
  border_width?: number | null;
  border_color?: string | null;
  volume?: number | null;
  muted?: boolean | null;
  speed?: number | null;
  freeze_frame?: boolean | null;
  freeze_frame_time_ms?: number | null;
  transition_in_type?: string | null;
  transition_in_duration_ms?: number | null;
  transition_out_type?: string | null;
  transition_out_duration_ms?: number | null;
  audio_fade_in_ms?: number | null;
  audio_fade_out_ms?: number | null;
  linked_clip_id?: string | null;
  has_audio?: boolean | null;
}

export interface UpdateVideoClip {
  track_id?: string | null;
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  in_point_ms?: number | null;
  out_point_ms?: number | null;
  position_x?: number | null;
  position_y?: number | null;
  scale?: number | null;
  rotation?: number | null;
  crop_top?: number | null;
  crop_bottom?: number | null;
  crop_left?: number | null;
  crop_right?: number | null;
  corner_radius?: number | null;
  opacity?: number | null;
  shadow_enabled?: boolean | null;
  shadow_blur?: number | null;
  shadow_offset_x?: number | null;
  shadow_offset_y?: number | null;
  shadow_color?: string | null;
  shadow_opacity?: number | null;
  border_enabled?: boolean | null;
  border_width?: number | null;
  border_color?: string | null;
  volume?: number | null;
  muted?: boolean | null;
  speed?: number | null;
  freeze_frame?: boolean | null;
  freeze_frame_time_ms?: number | null;
  transition_in_type?: string | null;
  transition_in_duration_ms?: number | null;
  transition_out_type?: string | null;
  transition_out_duration_ms?: number | null;
  audio_fade_in_ms?: number | null;
  audio_fade_out_ms?: number | null;
  linked_clip_id?: string | null;
}

export interface VideoZoomClip {
  id: string;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  zoom_scale: number;
  zoom_center_x: number;
  zoom_center_y: number;
  ease_in_duration_ms: number;
  ease_out_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface NewVideoZoomClip {
  id?: string | null;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  zoom_scale?: number | null;
  zoom_center_x?: number | null;
  zoom_center_y?: number | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

export interface UpdateVideoZoomClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  zoom_scale?: number | null;
  zoom_center_x?: number | null;
  zoom_center_y?: number | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

export interface VideoBlurClip {
  id: string;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  blur_intensity: number;
  region_x: number;
  region_y: number;
  region_width: number;
  region_height: number;
  corner_radius: number;
  blur_inside: boolean;
  ease_in_duration_ms: number;
  ease_out_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface NewVideoBlurClip {
  id?: string | null;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  blur_intensity?: number | null;
  region_x?: number | null;
  region_y?: number | null;
  region_width?: number | null;
  region_height?: number | null;
  corner_radius?: number | null;
  blur_inside?: boolean | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

export interface UpdateVideoBlurClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  blur_intensity?: number | null;
  region_x?: number | null;
  region_y?: number | null;
  region_width?: number | null;
  region_height?: number | null;
  corner_radius?: number | null;
  blur_inside?: boolean | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

export interface VideoPanClip {
  id: string;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  start_x: number;
  start_y: number;
  end_x: number;
  end_y: number;
  ease_in_duration_ms: number;
  ease_out_duration_ms: number;
  created_at: string;
  updated_at: string;
}

export interface NewVideoPanClip {
  id?: string | null;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

export interface UpdateVideoPanClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  start_x?: number | null;
  start_y?: number | null;
  end_x?: number | null;
  end_y?: number | null;
  ease_in_duration_ms?: number | null;
  ease_out_duration_ms?: number | null;
}

export interface VideoTransformClip {
  id: string;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  keyframes: TransformKeyframe[];
  created_at: string;
  updated_at: string;
}

export interface NewVideoTransformClip {
  id?: string | null;
  track_id: string;
  name: string;
  start_time_ms: number;
  duration_ms: number;
  keyframes?: TransformKeyframe[];
}

export interface UpdateVideoTransformClip {
  name?: string | null;
  start_time_ms?: number | null;
  duration_ms?: number | null;
  keyframes?: TransformKeyframe[] | null;
}

export interface VideoAsset {
  id: string;
  video_id: string;
  name: string;
  file_path: string;
  asset_type: string;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
  thumbnail_path: string | null;
  file_size: number | null;
  has_audio: boolean | null;
  created_at: string;
}

export interface NewVideoAsset {
  id?: string | null;
  video_id: string;
  name: string;
  file_path: string;
  asset_type: string;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
  thumbnail_path?: string | null;
  file_size?: number | null;
  has_audio?: boolean | null;
}

export interface UpdateVideoAsset {
  name?: string | null;
  thumbnail_path?: string | null;
}
