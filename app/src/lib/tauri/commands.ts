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
} from './types';

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

// Recording options
export interface RecordingOptions {
  explorationId?: string | null;  // Frontend uses explorationId
  testId?: string | null;  // Backend uses testId (legacy alias)
  name?: string | null;
  windowId?: number | null;
  bounds?: WindowBounds | null;
  displayId?: number | null;
  audioDevice?: string | null;  // "none", "system", or device ID
  showCursor?: boolean;
}

// Capture commands
export const capture = {
  screenshot: (explorationId?: string | null, title?: string | null) =>
    invoke<Screenshot>('capture_screenshot', { testId: explorationId, title }),

  fullscreenScreenshot: (explorationId?: string | null, title?: string | null) =>
    invoke<Screenshot>('capture_fullscreen_screenshot', { testId: explorationId, title }),

  windowScreenshot: (
    explorationId: string | null,
    title: string | null,
    windowOwner: string,
    windowName: string,
    windowId?: number | null
  ) =>
    invoke<Screenshot>('capture_window_screenshot', {
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

  startRecording: (options: RecordingOptions = {}) =>
    invoke<Recording>('start_recording', {
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

// Video processing commands
export const video = {
  trim: (sourcePath: string, outputPath: string, startMs: number, endMs: number) =>
    invoke<string>('trim_video', { sourcePath, outputPath, startMs, endMs }),

  cut: (sourcePath: string, outputPath: string, startMs: number, endMs: number) =>
    invoke<string>('cut_video', { sourcePath, outputPath, startMs, endMs }),
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
