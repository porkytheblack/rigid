import { invoke } from '@tauri-apps/api/core';
import type {
  App,
  NewApp,
  UpdateApp,
  AppFilter,
  Test,
  NewTest,
  UpdateTest,
  TestFilter,
  Recording,
  NewRecording,
  UpdateRecording,
  RecordingFilter,
  Annotation,
  NewAnnotation,
  UpdateAnnotation,
  Issue,
  NewIssue,
  UpdateIssue,
  IssueFilter,
  ChecklistItem,
  NewChecklistItem,
  UpdateChecklistItem,
  ChecklistFilter,
  Screenshot,
  NewScreenshot,
  UpdateScreenshot,
  ScreenshotFilter,
  ScreenshotDrawing,
  NewScreenshotDrawing,
  ScreenshotMarker,
  NewScreenshotMarker,
  UpdateScreenshotMarker,
  DocumentBlock,
  NewDocumentBlock,
  UpdateDocumentBlock,
  ExplorationTodo,
  NewExplorationTodo,
  UpdateExplorationTodo,
  Tag,
  NewTag,
  UpdateTag,
  TaggableType,
  Setting,
  AIProvider,
  ProviderStatus,
  AIStatus,
  Message,
  CompletionOptions,
  AIResponse,
  Diagram,
  NewDiagram,
  UpdateDiagram,
  DiagramFilter,
  DiagramWithData,
  DiagramNode,
  NewDiagramNode,
  UpdateDiagramNode,
  DiagramEdge,
  NewDiagramEdge,
  UpdateDiagramEdge,
  NodeAttachment,
  NewNodeAttachment,
  ArchitectureDoc,
  NewArchitectureDoc,
  UpdateArchitectureDoc,
  ArchitectureDocWithBlocks,
  ArchitectureDocBlock,
  NewArchitectureDocBlock,
  UpdateArchitectureDocBlock,
  NativeRecordingOptions,
  NativeScreenshotOptions,
  NativeWindowInfo,
  NativeDisplayInfo,
  Demo,
  NewDemo,
  UpdateDemo,
  DemoFilter,
  DemoWithData,
  DemoBackground,
  NewDemoBackground,
  UpdateDemoBackground,
  DemoTrack,
  NewDemoTrack,
  UpdateDemoTrack,
  DemoClip,
  NewDemoClip,
  UpdateDemoClip,
  DemoAsset,
  NewDemoAsset,
  UpdateDemoAsset,
  DemoExportConfig,
  DemoZoomClip,
  NewDemoZoomClip,
  UpdateDemoZoomClip,
  DemoBlurClip,
  NewDemoBlurClip,
  UpdateDemoBlurClip,
  DemoPanClip,
  NewDemoPanClip,
  UpdateDemoPanClip,
  DemoRecording,
  NewDemoRecording,
  DemoScreenshot,
  NewDemoScreenshot,
} from './types';

// =============================================================================
// Platform Detection
// =============================================================================

let _isMacOS: boolean | null = null;

/** Check if running on macOS (cached) */
async function isMacOS(): Promise<boolean> {
  if (_isMacOS === null) {
    try {
      // Dynamic import to avoid issues if plugin not available
      // @ts-expect-error - module may not be installed but we have a fallback
      const { platform } = await import('@tauri-apps/plugin-os');
      _isMacOS = platform() === 'macos';
    } catch {
      // Fallback: check navigator
      _isMacOS = navigator.platform.toLowerCase().includes('mac');
    }
  }
  return _isMacOS;
}

// App commands
export const apps = {
  create: (newApp: NewApp) =>
    invoke<App>('create_app', { newApp }),

  get: (id: string) =>
    invoke<App>('get_app', { id }),

  list: (filter: AppFilter = {}) =>
    invoke<App[]>('list_apps', { filter }),

  update: (id: string, updates: UpdateApp) =>
    invoke<App>('update_app', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_app', { id }),

  count: () =>
    invoke<number>('count_apps'),
};

// Test commands
export const tests = {
  create: (newTest: NewTest) =>
    invoke<Test>('create_test', { newTest }),

  get: (id: string) =>
    invoke<Test>('get_test', { id }),

  list: (filter: TestFilter = {}) =>
    invoke<Test[]>('list_tests', { filter }),

  listByApp: (appId: string) =>
    invoke<Test[]>('list_tests_by_app', { appId }),

  update: (id: string, updates: UpdateTest) =>
    invoke<Test>('update_test', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_test', { id }),

  countByApp: (appId: string) =>
    invoke<number>('count_tests_by_app', { appId }),

  countByStatus: (status: string) =>
    invoke<number>('count_tests_by_status', { status }),
};

// Recording commands
export const recordings = {
  create: (newRecording: NewRecording) =>
    invoke<Recording>('create_recording', { newRecording }),

  get: (id: string) =>
    invoke<Recording>('get_recording', { id }),

  list: (filter: RecordingFilter = {}) =>
    invoke<Recording[]>('list_recordings', { filter }),

  listByTest: (testId: string) =>
    invoke<Recording[]>('list_recordings_by_test', { testId }),

  update: (id: string, updates: UpdateRecording) =>
    invoke<Recording>('update_recording', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_recording', { id }),
};

// Annotation commands
export const annotations = {
  create: (newAnnotation: NewAnnotation) =>
    invoke<Annotation>('create_annotation', { newAnnotation }),

  get: (id: string) =>
    invoke<Annotation>('get_annotation', { id }),

  list: (recordingId: string) =>
    invoke<Annotation[]>('list_annotations', { recordingId }),

  update: (id: string, updates: UpdateAnnotation) =>
    invoke<Annotation>('update_annotation', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_annotation', { id }),
};

// Window bounds type
export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Window info type
export interface WindowInfo {
  id: number;
  name: string;
  owner: string;
  window_id: number | null;  // CGWindowID for screenshots
  bounds: WindowBounds | null;  // Window bounds for region recording
}

// Display info type
export interface DisplayInfo {
  id: number;
  name: string;
  width: number;
  height: number;
  is_main: boolean;
}

// Audio device type
export interface AudioDevice {
  id: string;
  name: string;
  is_default: boolean;
}

// Webcam audio device type (ffmpeg avfoundation indexed)
export interface WebcamAudioDevice {
  index: string;  // "0", "1", "2", etc. or "none"
  name: string;
}

// Webcam video device type (camera)
export interface WebcamVideoDevice {
  index: string;  // "0", "1", "2", etc.
  name: string;
}

// Recording options
export interface RecordingOptions {
  explorationId?: string | null;  // Frontend uses explorationId
  testId?: string | null;  // Backend uses testId (legacy alias)
  appId?: string | null;  // App ID for app-level recordings (without exploration)
  name?: string | null;
  windowId?: number | null;
  bounds?: WindowBounds | null;
  displayId?: number | null;
  audioDevice?: string | null;  // "none", "system", or device ID
  showCursor?: boolean;
  recordWebcam?: boolean;  // Record webcam alongside screen
  webcamAudioDevice?: string | null;  // Audio device index for webcam ("0", "1", "none")
  webcamVideoDevice?: string | null;  // Video device index for webcam ("0", "1")
}

// Capture commands
export const capture = {
  screenshot: (appId?: string | null, explorationId?: string | null, title?: string | null) =>
    invoke<Screenshot>('capture_screenshot', { appId, testId: explorationId, title }),

  fullscreenScreenshot: (appId?: string | null, explorationId?: string | null, title?: string | null) =>
    invoke<Screenshot>('capture_fullscreen_screenshot', { appId, testId: explorationId, title }),

  windowScreenshot: (
    appId: string | null,
    explorationId: string | null,
    title: string | null,
    windowOwner: string,
    windowName: string,
    windowId?: number | null
  ) =>
    invoke<Screenshot>('capture_window_screenshot', {
      appId,
      testId: explorationId,
      title,
      windowOwner,
      windowName,
      windowId,
    }),

  listWindows: () =>
    invoke<WindowInfo[]>('list_windows'),

  listDisplays: () =>
    invoke<DisplayInfo[]>('list_displays'),

  listAudioDevices: () =>
    invoke<AudioDevice[]>('list_audio_devices'),

  listWebcamAudioDevices: () =>
    invoke<WebcamAudioDevice[]>('list_webcam_audio_devices'),

  listWebcamVideoDevices: () =>
    invoke<WebcamVideoDevice[]>('list_webcam_video_devices'),

  startRecording: (options: RecordingOptions = {}) =>
    invoke<Recording>('start_recording', {
      appId: options.appId ?? null,
      testId: options.explorationId ?? options.testId ?? null,
      name: options.name ?? null,
      windowId: options.windowId ?? null,
      boundsX: options.bounds?.x ?? null,
      boundsY: options.bounds?.y ?? null,
      boundsWidth: options.bounds?.width ?? null,
      boundsHeight: options.bounds?.height ?? null,
      displayId: options.displayId ?? null,
      audioDevice: options.audioDevice ?? null,
      showCursor: options.showCursor ?? null,
      recordWebcam: options.recordWebcam ?? null,
      webcamAudioDevice: options.webcamAudioDevice ?? null,
      webcamVideoDevice: options.webcamVideoDevice ?? null,
    }),

  stopRecording: () =>
    invoke<Recording>('stop_recording'),

  isRecording: () =>
    invoke<boolean>('is_recording'),

  getCurrentRecordingId: () =>
    invoke<string | null>('get_current_recording_id'),

  cancelRecording: () =>
    invoke<void>('cancel_recording'),

  exportAsset: (sourcePath: string, filename?: string | null) =>
    invoke<string>('export_asset', { sourcePath, filename }),

  openPrivacySettings: (setting: 'microphone' | 'screen_recording' | 'camera') =>
    invoke<void>('open_privacy_settings', { setting }),

  // Permission checks and requests
  checkCameraPermission: () =>
    invoke<string>('check_camera_permission'),

  requestCameraPermission: () =>
    invoke<void>('request_camera_permission'),

  checkMicrophonePermission: () =>
    invoke<string>('check_microphone_permission'),

  requestMicrophonePermission: () =>
    invoke<void>('request_microphone_permission'),
};

// Issue commands
export const issues = {
  create: (newIssue: NewIssue) =>
    invoke<Issue>('create_issue', { newIssue }),

  get: (id: string) =>
    invoke<Issue>('get_issue', { id }),

  getByNumber: (number: number) =>
    invoke<Issue>('get_issue_by_number', { number }),

  list: (filter: IssueFilter = {}) =>
    invoke<Issue[]>('list_issues', { filter }),

  update: (id: string, updates: UpdateIssue) =>
    invoke<Issue>('update_issue', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_issue', { id }),

  countByStatus: (status: string) =>
    invoke<number>('count_issues_by_status', { status }),

  countByPriority: (priority: string) =>
    invoke<number>('count_issues_by_priority', { priority }),
};

// Checklist commands
export const checklist = {
  create: (newItem: NewChecklistItem) =>
    invoke<ChecklistItem>('create_checklist_item', { newItem }),

  get: (id: string) =>
    invoke<ChecklistItem>('get_checklist_item', { id }),

  list: (filter: ChecklistFilter = {}) =>
    invoke<ChecklistItem[]>('list_checklist_items', { filter }),

  update: (id: string, updates: UpdateChecklistItem) =>
    invoke<ChecklistItem>('update_checklist_item', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_checklist_item', { id }),

  reorder: (ids: string[]) =>
    invoke<void>('reorder_checklist_items', { ids }),

  getCounts: () =>
    invoke<[number, number, number]>('get_checklist_counts'),
};

// Screenshot commands
export const screenshots = {
  create: (newScreenshot: NewScreenshot) =>
    invoke<Screenshot>('create_screenshot', { newScreenshot }),

  get: (id: string) =>
    invoke<Screenshot>('get_screenshot', { id }),

  list: (filter: ScreenshotFilter = {}) =>
    invoke<Screenshot[]>('list_screenshots', { filter }),

  update: (id: string, updates: UpdateScreenshot) =>
    invoke<Screenshot>('update_screenshot', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_screenshot', { id }),

  // Drawing operations
  createDrawing: (newDrawing: NewScreenshotDrawing) =>
    invoke<ScreenshotDrawing>('create_screenshot_drawing', { newDrawing }),

  listDrawings: (screenshotId: string) =>
    invoke<ScreenshotDrawing[]>('list_screenshot_drawings', { screenshotId }),

  deleteDrawing: (id: string) =>
    invoke<void>('delete_screenshot_drawing', { id }),

  deleteAllDrawings: (screenshotId: string) =>
    invoke<void>('delete_all_screenshot_drawings', { screenshotId }),

  bulkCreateDrawings: (drawings: NewScreenshotDrawing[]) =>
    invoke<ScreenshotDrawing[]>('bulk_create_screenshot_drawings', { drawings }),

  bulkReplaceDrawings: (screenshotId: string, drawings: NewScreenshotDrawing[]) =>
    invoke<ScreenshotDrawing[]>('bulk_replace_screenshot_drawings', { screenshotId, drawings }),

  // Marker operations
  createMarker: (newMarker: NewScreenshotMarker) =>
    invoke<ScreenshotMarker>('create_screenshot_marker', { newMarker }),

  getMarker: (id: string) =>
    invoke<ScreenshotMarker>('get_screenshot_marker', { id }),

  listMarkers: (screenshotId: string) =>
    invoke<ScreenshotMarker[]>('list_screenshot_markers', { screenshotId }),

  listMarkersByTest: (testId: string) =>
    invoke<ScreenshotMarker[]>('list_screenshot_markers_by_test', { testId }),

  updateMarker: (id: string, updates: UpdateScreenshotMarker) =>
    invoke<ScreenshotMarker>('update_screenshot_marker', { id, updates }),

  deleteMarker: (id: string) =>
    invoke<void>('delete_screenshot_marker', { id }),

  deleteAllMarkers: (screenshotId: string) =>
    invoke<void>('delete_all_screenshot_markers', { screenshotId }),

  bulkCreateMarkers: (markers: NewScreenshotMarker[]) =>
    invoke<ScreenshotMarker[]>('bulk_create_screenshot_markers', { markers }),

  bulkReplaceMarkers: (screenshotId: string, markers: NewScreenshotMarker[]) =>
    invoke<ScreenshotMarker[]>('bulk_replace_screenshot_markers', { screenshotId, markers }),
};

// Tag commands
export const tags = {
  create: (newTag: NewTag) =>
    invoke<Tag>('create_tag', { newTag }),

  get: (id: string) =>
    invoke<Tag>('get_tag', { id }),

  list: () =>
    invoke<Tag[]>('list_tags'),

  update: (id: string, updates: UpdateTag) =>
    invoke<Tag>('update_tag', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_tag', { id }),

  addToEntity: (tagId: string, taggableType: TaggableType, taggableId: string) =>
    invoke<void>('add_tag_to_entity', { tagId, taggableType, taggableId }),

  removeFromEntity: (tagId: string, taggableType: TaggableType, taggableId: string) =>
    invoke<void>('remove_tag_from_entity', { tagId, taggableType, taggableId }),

  getForEntity: (taggableType: TaggableType, taggableId: string) =>
    invoke<Tag[]>('get_tags_for_entity', { taggableType, taggableId }),
};

// Settings commands
export const settings = {
  get: (key: string) =>
    invoke<string | null>('get_setting', { key }),

  set: (key: string, value: string) =>
    invoke<void>('set_setting', { key, value }),

  delete: (key: string) =>
    invoke<void>('delete_setting', { key }),

  getAll: () =>
    invoke<Setting[]>('get_all_settings'),

  getBool: (key: string) =>
    invoke<boolean | null>('get_bool_setting', { key }),

  setBool: (key: string, value: boolean) =>
    invoke<void>('set_bool_setting', { key, value }),

  getInt: (key: string) =>
    invoke<number | null>('get_int_setting', { key }),

  setInt: (key: string, value: number) =>
    invoke<void>('set_int_setting', { key, value }),
};

// App info commands
export interface AppInfo {
  name: string;
  version: string;
  data_dir: string;
}

export const appInfo = {
  greet: (name: string) =>
    invoke<string>('greet', { name }),

  getInfo: () =>
    invoke<AppInfo>('get_app_info'),
};

// AI commands
export const ai = {
  checkAvailability: () =>
    invoke<ProviderStatus[]>('check_ai_availability'),

  getStatus: () =>
    invoke<AIStatus>('get_ai_status'),

  configureProvider: (provider: AIProvider, model?: string | null) =>
    invoke<void>('configure_ai_provider', { provider, model }),

  setApiKey: (provider: AIProvider, apiKey: string) =>
    invoke<void>('set_ai_api_key', { provider, apiKey }),

  removeApiKey: (provider: AIProvider) =>
    invoke<void>('remove_ai_api_key', { provider }),

  complete: (messages: Message[], options?: CompletionOptions | null) =>
    invoke<AIResponse>('ai_complete', { messages, options }),

  describeScreenshot: (imagePath: string) =>
    invoke<string>('ai_describe_screenshot', { imagePath }),

  listModels: () =>
    invoke<string[]>('ai_list_models'),

  generateIssuePrompt: (
    issueTitle: string,
    issueDescription?: string | null,
    stepsToReproduce?: string | null,
    expectedBehavior?: string | null,
    actualBehavior?: string | null
  ) =>
    invoke<string>('ai_generate_issue_prompt', {
      issueTitle,
      issueDescription,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
    }),

  restoreConfiguration: () =>
    invoke<boolean>('restore_ai_configuration'),
};

// Document block commands (block-based editor content)
export const documentBlocks = {
  create: (newBlock: NewDocumentBlock) =>
    invoke<DocumentBlock>('create_document_block', { newBlock }),

  get: (id: string) =>
    invoke<DocumentBlock>('get_document_block', { id }),

  list: (testId: string) =>
    invoke<DocumentBlock[]>('list_document_blocks', { testId }),

  update: (id: string, updates: UpdateDocumentBlock) =>
    invoke<DocumentBlock>('update_document_block', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_document_block', { id }),

  deleteAll: (testId: string) =>
    invoke<void>('delete_all_document_blocks', { testId }),

  bulkReplace: (testId: string, blocks: NewDocumentBlock[]) =>
    invoke<DocumentBlock[]>('bulk_replace_document_blocks', { testId, blocks }),
};

// Exploration todo commands (sidebar checklist in doc tab)
export const explorationTodos = {
  create: (newTodo: NewExplorationTodo) =>
    invoke<ExplorationTodo>('create_exploration_todo', { newTodo }),

  get: (id: string) =>
    invoke<ExplorationTodo>('get_exploration_todo', { id }),

  list: (testId: string) =>
    invoke<ExplorationTodo[]>('list_exploration_todos', { testId }),

  update: (id: string, updates: UpdateExplorationTodo) =>
    invoke<ExplorationTodo>('update_exploration_todo', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_exploration_todo', { id }),

  deleteAll: (testId: string) =>
    invoke<void>('delete_all_exploration_todos', { testId }),

  bulkReplace: (testId: string, todos: NewExplorationTodo[]) =>
    invoke<ExplorationTodo[]>('bulk_replace_exploration_todos', { testId, todos }),
};

// Media probe result
export interface MediaProbeResult {
  has_audio: boolean;
  has_video: boolean;
  duration_ms: number | null;
  width: number | null;
  height: number | null;
}

// Video processing commands
export const video = {
  trim: (sourcePath: string, outputPath: string, startMs: number, endMs: number) =>
    invoke<string>('trim_video', { sourcePath, outputPath, startMs, endMs }),

  cut: (sourcePath: string, outputPath: string, startMs: number, endMs: number) =>
    invoke<string>('cut_video', { sourcePath, outputPath, startMs, endMs }),

  probe: (path: string) =>
    invoke<MediaProbeResult>('probe_media', { path }),
};

// Demo rendering types
export interface RenderClip {
  source_path: string;
  source_type: 'video' | 'image' | 'audio';
  start_time_ms: number;
  duration_ms: number;
  in_point_ms: number;
  position_x: number | null;
  position_y: number | null;
  scale: number | null;
  opacity: number | null;
  corner_radius: number | null;
  crop_top: number | null;
  crop_bottom: number | null;
  crop_left: number | null;
  crop_right: number | null;
  z_index: number;
  has_audio: boolean | null; // Whether video clip has audio track
}

export interface RenderBackground {
  background_type: string;
  color: string | null;
  gradient_stops: string | null;
  gradient_angle: number | null;
  image_url: string | null; // External URL (e.g., Unsplash)
  media_path: string | null; // Local file path
}

export interface RenderDemoConfig {
  width: number;
  height: number;
  frame_rate: number;
  duration_ms: number;
  format: 'mp4' | 'webm';
  quality: 'draft' | 'good' | 'high' | 'max';
  output_path: string;
  background: RenderBackground | null;
  clips: RenderClip[];
}

// Export progress event types
export interface ExportStarted {
  export_id: string;
  output_path: string;
  total_frames: number;
  duration_ms: number;
}

export interface ExportProgress {
  export_id: string;
  percent: number;
  stage: string;
  current_frame: number;
  total_frames: number;
  fps: number;
  elapsed_secs: number;
  estimated_remaining_secs: number | null;
}

export interface ExportComplete {
  export_id: string;
  success: boolean;
  output_path: string | null;
  error: string | null;
}

// Demo rendering commands
export const demoRender = {
  render: (config: RenderDemoConfig) =>
    invoke<string>('render_demo', { config }),

  /** Start a background render that emits progress events */
  renderBackground: (exportId: string, config: RenderDemoConfig) =>
    invoke<string>('render_demo_background', { exportId, config }),
  /** Render using native AVFoundation compositor (macOS only, much faster) */
  renderNative: (exportId: string, config: RenderDemoConfig) =>
    invoke<string>('render_demo_native', { exportId, config }),
};

// Diagram commands (mind maps, user flows, dependency graphs)
export const diagrams = {
  create: (newDiagram: NewDiagram) =>
    invoke<Diagram>('create_diagram', { newDiagram }),

  get: (id: string) =>
    invoke<Diagram>('get_diagram', { id }),

  getWithData: (id: string) =>
    invoke<DiagramWithData>('get_diagram_with_data', { id }),

  list: (filter: DiagramFilter = {}) =>
    invoke<Diagram[]>('list_diagrams', { filter }),

  listByTest: (testId: string) =>
    invoke<Diagram[]>('list_diagrams_by_test', { testId }),

  listByArchitectureDoc: (docId: string) =>
    invoke<Diagram[]>('list_diagrams_by_architecture_doc', { docId }),

  update: (id: string, updates: UpdateDiagram) =>
    invoke<Diagram>('update_diagram', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_diagram', { id }),

  countByTest: (testId: string) =>
    invoke<number>('count_diagrams_by_test', { testId }),

  // Node operations
  createNode: (newNode: NewDiagramNode) =>
    invoke<DiagramNode>('create_diagram_node', { newNode }),

  getNode: (id: string) =>
    invoke<DiagramNode>('get_diagram_node', { id }),

  listNodes: (diagramId: string) =>
    invoke<DiagramNode[]>('list_diagram_nodes', { diagramId }),

  updateNode: (id: string, updates: UpdateDiagramNode) =>
    invoke<DiagramNode>('update_diagram_node', { id, updates }),

  deleteNode: (id: string) =>
    invoke<void>('delete_diagram_node', { id }),

  bulkUpdateNodes: (updates: [string, UpdateDiagramNode][]) =>
    invoke<void>('bulk_update_diagram_nodes', { updates }),

  // Edge operations
  createEdge: (newEdge: NewDiagramEdge) =>
    invoke<DiagramEdge>('create_diagram_edge', { newEdge }),

  getEdge: (id: string) =>
    invoke<DiagramEdge>('get_diagram_edge', { id }),

  listEdges: (diagramId: string) =>
    invoke<DiagramEdge[]>('list_diagram_edges', { diagramId }),

  updateEdge: (id: string, updates: UpdateDiagramEdge) =>
    invoke<DiagramEdge>('update_diagram_edge', { id, updates }),

  deleteEdge: (id: string) =>
    invoke<void>('delete_diagram_edge', { id }),

  // Attachment operations
  createAttachment: (newAttachment: NewNodeAttachment) =>
    invoke<NodeAttachment>('create_node_attachment', { newAttachment }),

  getAttachment: (id: string) =>
    invoke<NodeAttachment>('get_node_attachment', { id }),

  listAttachments: (nodeId: string) =>
    invoke<NodeAttachment[]>('list_node_attachments', { nodeId }),

  deleteAttachment: (id: string) =>
    invoke<void>('delete_node_attachment', { id }),

  deleteAllAttachments: (nodeId: string) =>
    invoke<void>('delete_all_node_attachments', { nodeId }),
};

// Architecture document commands
export const architectureDocs = {
  create: (newDoc: NewArchitectureDoc) =>
    invoke<ArchitectureDoc>('create_architecture_doc', { newDoc }),

  get: (id: string) =>
    invoke<ArchitectureDoc>('get_architecture_doc', { id }),

  getWithBlocks: (id: string) =>
    invoke<ArchitectureDocWithBlocks>('get_architecture_doc_with_blocks', { id }),

  list: (appId: string) =>
    invoke<ArchitectureDoc[]>('list_architecture_docs', { appId }),

  update: (id: string, updates: UpdateArchitectureDoc) =>
    invoke<ArchitectureDoc>('update_architecture_doc', { id, updates }),

  delete: (id: string) =>
    invoke<void>('delete_architecture_doc', { id }),

  count: (appId: string) =>
    invoke<number>('count_architecture_docs', { appId }),

  reorder: (docIds: string[]) =>
    invoke<void>('reorder_architecture_docs', { docIds }),

  // Block operations
  createBlock: (newBlock: NewArchitectureDocBlock) =>
    invoke<ArchitectureDocBlock>('create_architecture_doc_block', { newBlock }),

  getBlock: (id: string) =>
    invoke<ArchitectureDocBlock>('get_architecture_doc_block', { id }),

  listBlocks: (docId: string) =>
    invoke<ArchitectureDocBlock[]>('list_architecture_doc_blocks', { docId }),

  updateBlock: (id: string, updates: UpdateArchitectureDocBlock) =>
    invoke<ArchitectureDocBlock>('update_architecture_doc_block', { id, updates }),

  deleteBlock: (id: string) =>
    invoke<void>('delete_architecture_doc_block', { id }),

  deleteAllBlocks: (docId: string) =>
    invoke<void>('delete_all_architecture_doc_blocks', { docId }),

  bulkReplaceBlocks: (docId: string, blocks: NewArchitectureDocBlock[]) =>
    invoke<ArchitectureDocBlock[]>('bulk_replace_architecture_doc_blocks', { docId, blocks }),
};

// =============================================================================
// Native Capture Commands (ScreenCaptureKit on macOS, fallback on other platforms)
// =============================================================================

/** Extended recording options with native capture settings */
export interface HighQualityRecordingOptions extends RecordingOptions {
  /** Native capture options (macOS only) */
  native?: NativeRecordingOptions | null;
  /** Force use of fallback capture even on macOS */
  forceFallback?: boolean;
}

/** Extended screenshot options with native capture settings */
export interface HighQualityScreenshotOptions {
  appId?: string | null;
  explorationId?: string | null;
  title?: string | null;
  windowId?: number | null;
  displayId?: number | null;
  region?: { x: number; y: number; width: number; height: number } | null;
  /** Native capture options (macOS only) */
  native?: NativeScreenshotOptions | null;
  /** Force use of fallback capture even on macOS */
  forceFallback?: boolean;
}

// Raw native capture commands (direct Tauri invocations)
const nativeCaptureRaw = {
  // Permission management
  checkPermission: () =>
    invoke<boolean>('check_native_capture_permission'),

  requestPermission: () =>
    invoke<void>('request_native_capture_permission'),

  // Window/display enumeration
  listWindows: () =>
    invoke<NativeWindowInfo[]>('list_windows_native'),

  listDisplays: () =>
    invoke<NativeDisplayInfo[]>('list_displays_native'),

  // Recording (macOS only)
  startRecording: (
    appId: string | null,
    testId: string | null,
    name: string | null,
    windowId: number | null,
    displayId: number | null,
    region: [number, number, number, number] | null,
    options: {
      codec?: string | null;
      bitrate?: number | null;
      fps?: number | null;
      keyframe_interval?: number | null;
      retina_capture?: boolean | null;
      capture_cursor?: boolean | null;
      capture_audio?: boolean | null;
    } | null
  ) =>
    invoke<Recording>('start_native_recording', {
      appId,
      testId,
      name,
      windowId,
      displayId,
      region,
      options,
    }),

  stopRecording: () =>
    invoke<Recording>('stop_native_recording'),

  cancelRecording: () =>
    invoke<void>('cancel_native_recording'),

  isRecording: () =>
    invoke<boolean>('is_native_recording'),

  getRecordingId: () =>
    invoke<string | null>('get_native_recording_id'),

  getRecordingDuration: () =>
    invoke<number>('get_native_recording_duration'),

  // Screenshot (macOS only)
  captureScreenshot: (
    appId: string | null,
    testId: string | null,
    title: string | null,
    windowId: number | null,
    displayId: number | null,
    region: [number, number, number, number] | null,
    options: {
      retina_capture?: boolean | null;
      capture_cursor?: boolean | null;
    } | null
  ) =>
    invoke<Screenshot>('capture_native_screenshot', {
      appId,
      testId,
      title,
      windowId,
      displayId,
      region,
      options,
    }),
};

/**
 * High-quality capture adapter that uses native ScreenCaptureKit on macOS
 * and falls back to screencapture CLI on other platforms.
 *
 * Features on macOS:
 * - Native Retina resolution capture (2x backing pixels)
 * - 60 FPS video with timestamp-driven encoding
 * - HEVC/ProRes codec support
 * - Explicit bitrate and keyframe control
 */
export const nativeCapture = {
  /**
   * Check if native high-quality capture is available.
   * Returns true on macOS 12.3+, false on other platforms.
   */
  isAvailable: async (): Promise<boolean> => {
    if (!(await isMacOS())) return false;
    try {
      return await nativeCaptureRaw.checkPermission();
    } catch {
      return false;
    }
  },

  /**
   * Check screen capture permission status.
   * On non-macOS platforms, always returns true.
   */
  checkPermission: async (): Promise<boolean> => {
    if (!(await isMacOS())) return true;
    return nativeCaptureRaw.checkPermission();
  },

  /**
   * Request screen capture permission (opens system dialog on macOS).
   * No-op on other platforms.
   */
  requestPermission: async (): Promise<void> => {
    if (!(await isMacOS())) return;
    return nativeCaptureRaw.requestPermission();
  },

  /**
   * List all capturable windows with native backing scale info.
   * On macOS: Uses ScreenCaptureKit for accurate window info.
   * On other platforms: Falls back to AppleScript-based enumeration.
   */
  listWindows: async (): Promise<NativeWindowInfo[]> => {
    const macOS = await isMacOS();
    console.log('[nativeCapture.listWindows] isMacOS:', macOS);

    if (macOS) {
      try {
        console.log('[nativeCapture.listWindows] Calling native list_windows_native...');
        const windows = await nativeCaptureRaw.listWindows();
        console.log('[nativeCapture.listWindows] Native returned', windows.length, 'windows');
        return windows;
      } catch (err) {
        console.error('[nativeCapture.listWindows] Native failed:', err);
        // Fall through to legacy
      }
    }
    // Fallback: convert legacy WindowInfo to NativeWindowInfo
    console.log('[nativeCapture.listWindows] Using legacy fallback...');
    const windows = await capture.listWindows();
    console.log('[nativeCapture.listWindows] Legacy returned', windows.length, 'windows');
    return windows.map(w => ({
      window_id: w.window_id ?? w.id,
      title: w.name,
      owner_name: w.owner,
      x: w.bounds?.x ?? 0,
      y: w.bounds?.y ?? 0,
      width: w.bounds?.width ?? 0,
      height: w.bounds?.height ?? 0,
      backing_scale_factor: 2.0, // Assume retina
    }));
  },

  /**
   * List all displays with native backing scale info.
   * On macOS: Uses ScreenCaptureKit for accurate display info.
   * On other platforms: Falls back to system_profiler-based enumeration.
   */
  listDisplays: async (): Promise<NativeDisplayInfo[]> => {
    if (await isMacOS()) {
      try {
        return await nativeCaptureRaw.listDisplays();
      } catch {
        // Fall through to legacy
      }
    }
    // Fallback: convert legacy DisplayInfo to NativeDisplayInfo
    const displays = await capture.listDisplays();
    return displays.map(d => ({
      display_id: d.id,
      name: d.name,
      width: d.width,
      height: d.height,
      backing_scale_factor: 2.0, // Assume retina
      is_main: d.is_main,
    }));
  },

  /**
   * Start a high-quality recording.
   * On macOS: Uses ScreenCaptureKit with configurable codec, bitrate, FPS.
   * On other platforms: Falls back to screencapture -v.
   */
  startRecording: async (options: HighQualityRecordingOptions = {}): Promise<Recording> => {
    const useMacOS = (await isMacOS()) && !options.forceFallback;

    if (useMacOS) {
      try {
        const region = options.bounds
          ? [options.bounds.x, options.bounds.y, options.bounds.width, options.bounds.height] as [number, number, number, number]
          : null;

        const nativeOpts = options.native ? {
          codec: options.native.codec ?? null,
          bitrate: options.native.bitrate ?? null,
          fps: options.native.fps ?? null,
          keyframe_interval: options.native.keyframeInterval ?? null,
          retina_capture: options.native.retinaCapture ?? null,
          capture_cursor: options.native.captureCursor ?? null,
          capture_audio: options.native.captureAudio ?? null,
        } : null;

        return await nativeCaptureRaw.startRecording(
          options.appId ?? null,
          options.explorationId ?? options.testId ?? null,
          options.name ?? null,
          options.windowId ?? null,
          options.displayId ?? null,
          region,
          nativeOpts
        );
      } catch (error) {
        // If native fails, fall through to legacy
        console.warn('Native recording failed, falling back to screencapture:', error);
      }
    }

    // Fallback to legacy capture
    return capture.startRecording(options);
  },

  /**
   * Stop the current recording.
   * Automatically uses the correct stop method based on which capture is active.
   */
  stopRecording: async (): Promise<Recording> => {
    if (await isMacOS()) {
      try {
        // Check if native recording is active
        const isNativeRecording = await nativeCaptureRaw.isRecording();
        if (isNativeRecording) {
          return await nativeCaptureRaw.stopRecording();
        }
      } catch {
        // Fall through to legacy
      }
    }
    return capture.stopRecording();
  },

  /**
   * Cancel the current recording without saving.
   */
  cancelRecording: async (): Promise<void> => {
    if (await isMacOS()) {
      try {
        const isNativeRecording = await nativeCaptureRaw.isRecording();
        if (isNativeRecording) {
          return await nativeCaptureRaw.cancelRecording();
        }
      } catch {
        // Fall through to legacy
      }
    }
    return capture.cancelRecording();
  },

  /**
   * Check if currently recording.
   */
  isRecording: async (): Promise<boolean> => {
    if (await isMacOS()) {
      try {
        const isNative = await nativeCaptureRaw.isRecording();
        if (isNative) return true;
      } catch {
        // Fall through
      }
    }
    return capture.isRecording();
  },

  /**
   * Get the current recording ID.
   */
  getRecordingId: async (): Promise<string | null> => {
    if (await isMacOS()) {
      try {
        const nativeId = await nativeCaptureRaw.getRecordingId();
        if (nativeId) return nativeId;
      } catch {
        // Fall through
      }
    }
    return capture.getCurrentRecordingId();
  },

  /**
   * Get current recording duration in milliseconds.
   */
  getRecordingDuration: async (): Promise<number> => {
    if (await isMacOS()) {
      try {
        return await nativeCaptureRaw.getRecordingDuration();
      } catch {
        return 0;
      }
    }
    return 0; // Legacy doesn't support duration polling
  },

  /**
   * Capture a high-quality screenshot.
   * On macOS: Uses ScreenCaptureKit at native retina resolution.
   * On other platforms: Falls back to screencapture CLI.
   */
  captureScreenshot: async (options: HighQualityScreenshotOptions = {}): Promise<Screenshot> => {
    const useMacOS = (await isMacOS()) && !options.forceFallback;

    if (useMacOS) {
      try {
        const region = options.region
          ? [options.region.x, options.region.y, options.region.width, options.region.height] as [number, number, number, number]
          : null;

        const nativeOpts = options.native ? {
          retina_capture: options.native.retinaCapture ?? null,
          capture_cursor: options.native.captureCursor ?? null,
        } : null;

        return await nativeCaptureRaw.captureScreenshot(
          options.appId ?? null,
          options.explorationId ?? null,
          options.title ?? null,
          options.windowId ?? null,
          options.displayId ?? null,
          region,
          nativeOpts
        );
      } catch (error) {
        console.warn('Native screenshot failed, falling back to screencapture:', error);
      }
    }

    // Fallback to legacy capture
    if (options.windowId) {
      // Need window info for legacy capture
      const windows = await capture.listWindows();
      const window = windows.find(w => w.window_id === options.windowId || w.id === options.windowId);
      if (window) {
        return capture.windowScreenshot(
          options.appId ?? null,
          options.explorationId ?? null,
          options.title ?? null,
          window.owner,
          window.name,
          window.window_id
        );
      }
    }

    if (options.displayId || options.region) {
      // Full screen for display/region (legacy doesn't support region crop)
      return capture.fullscreenScreenshot(options.appId ?? null, options.explorationId ?? null, options.title ?? null);
    }

    // Interactive selection
    return capture.screenshot(options.appId ?? null, options.explorationId ?? null, options.title ?? null);
  },
};

// =============================================================================
// Demo Commands
// =============================================================================

export const demos = {
  list: async (filter: DemoFilter) => await invoke<Demo[]>('demos_list', { filter }),
  get: async (id: string) => await invoke<Demo>('demos_get', { id }),
  getWithData: async (id: string) => await invoke<DemoWithData>('demos_get_with_data', { id }),
  create: async (data: NewDemo) => await invoke<Demo>('demos_create', { data }),
  update: async (id: string, updates: UpdateDemo) => await invoke<Demo>('demos_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demos_delete', { id }),
};

export const demoBackgrounds = {
  get: async (demoId: string) => await invoke<DemoBackground | null>('demo_backgrounds_get', { demoId }),
  create: async (data: NewDemoBackground) => await invoke<DemoBackground>('demo_backgrounds_create', { data }),
  update: async (id: string, updates: UpdateDemoBackground) => await invoke<DemoBackground>('demo_backgrounds_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demo_backgrounds_delete', { id }),
};

export const demoTracks = {
  list: async (demoId: string) => await invoke<DemoTrack[]>('demo_tracks_list', { demoId }),
  create: async (data: NewDemoTrack) => await invoke<DemoTrack>('demo_tracks_create', { data }),
  update: async (id: string, updates: UpdateDemoTrack) => await invoke<DemoTrack>('demo_tracks_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demo_tracks_delete', { id }),
  reorder: async (demoId: string, trackIds: string[]) => await invoke<void>('demo_tracks_reorder', { demoId, trackIds }),
};

export const demoClips = {
  list: async (trackId: string) => await invoke<DemoClip[]>('demo_clips_list', { trackId }),
  create: async (data: NewDemoClip) => await invoke<DemoClip>('demo_clips_create', { data }),
  update: async (id: string, updates: UpdateDemoClip) => await invoke<DemoClip>('demo_clips_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demo_clips_delete', { id }),
};

export const demoZoomClips = {
  list: async (trackId: string) => await invoke<DemoZoomClip[]>('demo_zoom_clips_list', { trackId }),
  create: async (data: NewDemoZoomClip) => await invoke<DemoZoomClip>('demo_zoom_clips_create', { data }),
  update: async (id: string, updates: UpdateDemoZoomClip) => await invoke<DemoZoomClip>('demo_zoom_clips_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demo_zoom_clips_delete', { id }),
};

export const demoBlurClips = {
  list: async (trackId: string) => await invoke<DemoBlurClip[]>('demo_blur_clips_list', { trackId }),
  create: async (data: NewDemoBlurClip) => await invoke<DemoBlurClip>('demo_blur_clips_create', { data }),
  update: async (id: string, updates: UpdateDemoBlurClip) => await invoke<DemoBlurClip>('demo_blur_clips_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demo_blur_clips_delete', { id }),
};

export const demoPanClips = {
  list: async (trackId: string) => await invoke<DemoPanClip[]>('demo_pan_clips_list', { trackId }),
  create: async (data: NewDemoPanClip) => await invoke<DemoPanClip>('demo_pan_clips_create', { data }),
  update: async (id: string, updates: UpdateDemoPanClip) => await invoke<DemoPanClip>('demo_pan_clips_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demo_pan_clips_delete', { id }),
};

export const demoAssets = {
  list: async (demoId: string) => await invoke<DemoAsset[]>('demo_assets_list', { demoId }),
  create: async (data: NewDemoAsset) => await invoke<DemoAsset>('demo_assets_create', { data }),
  update: async (id: string, updates: UpdateDemoAsset) => await invoke<DemoAsset>('demo_assets_update', { id, updates }),
  delete: async (id: string) => await invoke<void>('demo_assets_delete', { id }),
};

export const demoRecordings = {
  list: async (demoId: string) => await invoke<DemoRecording[]>('demo_recordings_list', { demoId }),
  listWithData: async (demoId: string) => await invoke<Recording[]>('demo_recordings_list_with_data', { demoId }),
  add: async (data: NewDemoRecording) => await invoke<DemoRecording>('demo_recordings_add', { data }),
  remove: async (demoId: string, recordingId: string) => await invoke<void>('demo_recordings_remove', { demoId, recordingId }),
};

export const demoScreenshots = {
  list: async (demoId: string) => await invoke<DemoScreenshot[]>('demo_screenshots_list', { demoId }),
  listWithData: async (demoId: string) => await invoke<Screenshot[]>('demo_screenshots_list_with_data', { demoId }),
  add: async (data: NewDemoScreenshot) => await invoke<DemoScreenshot>('demo_screenshots_add', { data }),
  remove: async (demoId: string, screenshotId: string) => await invoke<void>('demo_screenshots_remove', { demoId, screenshotId }),
};

export const demoExport = {
  start: async (demoId: string, config: DemoExportConfig) => await invoke<string>('demo_export_start', { demoId, config }),
  progress: async (exportId: string) => await invoke<{ progress: number; status: string }>('demo_export_progress', { exportId }),
  cancel: async (exportId: string) => await invoke<void>('demo_export_cancel', { exportId }),
};

// Re-export types for convenience
export type {
  NativeRecordingOptions,
  NativeScreenshotOptions,
  NativeWindowInfo,
  NativeDisplayInfo,
  Demo,
  NewDemo,
  UpdateDemo,
  DemoFilter,
  DemoWithData,
  DemoBackground,
  NewDemoBackground,
  UpdateDemoBackground,
  DemoTrack,
  NewDemoTrack,
  UpdateDemoTrack,
  DemoClip,
  NewDemoClip,
  UpdateDemoClip,
  DemoAsset,
  NewDemoAsset,
  UpdateDemoAsset,
  DemoExportConfig,
  DemoRecording,
  NewDemoRecording,
  DemoScreenshot,
  NewDemoScreenshot,
} from './types';
