-- Rigid Database Schema v2
-- Local-first SQLite database for testing companion
-- Restructured with App > Test hierarchy

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Tags (reusable labels)
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
);

-- Apps (applications under test)
CREATE TABLE IF NOT EXISTS apps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    requirements TEXT,
    icon_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Tests (testing sessions under an app)
CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Document blocks (block-based editor content for tests/explorations)
CREATE TABLE IF NOT EXISTS document_blocks (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL, -- paragraph, heading1, heading2, heading3, quote, bulletList, numberedList, todo, code, image, divider, callout, toggle
    content TEXT NOT NULL DEFAULT '',
    -- Meta fields for different block types
    checked INTEGER, -- for todo blocks
    language TEXT, -- for code blocks
    callout_type TEXT, -- for callout blocks (info, warning, success, error)
    image_path TEXT, -- for image blocks
    image_caption TEXT, -- caption for image blocks
    collapsed INTEGER, -- for toggle blocks
    indent_level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Exploration checklist items (sidebar checklist in doc tab)
CREATE TABLE IF NOT EXISTS exploration_todos (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    checked INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Checklist items (testing requirements per test)
CREATE TABLE IF NOT EXISTS checklist_items (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'untested',
    sort_order INTEGER NOT NULL DEFAULT 0,
    group_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Screenshots (captured images - can belong to app directly or through exploration/test)
CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    app_id TEXT REFERENCES apps(id) ON DELETE CASCADE,
    test_id TEXT REFERENCES tests(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_path TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Screenshot drawing annotations (arrows, rectangles, circles, text, freehand)
CREATE TABLE IF NOT EXISTS screenshot_drawings (
    id TEXT PRIMARY KEY,
    screenshot_id TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
    tool_type TEXT NOT NULL, -- arrow, rectangle, circle, text, freehand, eraser
    color TEXT NOT NULL,
    stroke_width INTEGER NOT NULL DEFAULT 3,
    points TEXT, -- JSON array of {x, y} for freehand
    start_x REAL,
    start_y REAL,
    end_x REAL,
    end_y REAL,
    text_content TEXT,
    font_size INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Screenshot markers (labeled annotations with title, description, severity)
CREATE TABLE IF NOT EXISTS screenshot_markers (
    id TEXT PRIMARY KEY,
    screenshot_id TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
    feature_id TEXT REFERENCES features(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Recordings (screen recordings - can belong to app directly or through exploration/test)
CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    app_id TEXT REFERENCES apps(id) ON DELETE CASCADE,
    test_id TEXT REFERENCES tests(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    recording_path TEXT,
    webcam_path TEXT,
    duration_ms INTEGER,
    thumbnail_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Issues (bugs found during test)
CREATE TABLE IF NOT EXISTS issues (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    screenshot_id TEXT REFERENCES screenshots(id) ON DELETE SET NULL,
    recording_id TEXT REFERENCES recordings(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Annotations (timestamped markers on recordings)
CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    timestamp_ms INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
    feature_id TEXT REFERENCES features(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Taggables (polymorphic tag associations)
CREATE TABLE IF NOT EXISTS taggables (
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    taggable_type TEXT NOT NULL,
    taggable_id TEXT NOT NULL,
    PRIMARY KEY (tag_id, taggable_type, taggable_id)
);

-- AI Providers (encrypted configurations)
CREATE TABLE IF NOT EXISTS ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    adapter_type TEXT NOT NULL,
    config_encrypted TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_apps_name ON apps(name);
CREATE INDEX IF NOT EXISTS idx_apps_created ON apps(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tests_app ON tests(app_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_created ON tests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checklist_test ON checklist_items(test_id);
CREATE INDEX IF NOT EXISTS idx_checklist_status ON checklist_items(status);
CREATE INDEX IF NOT EXISTS idx_checklist_sort ON checklist_items(sort_order);

CREATE INDEX IF NOT EXISTS idx_screenshots_app ON screenshots(app_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_test ON screenshots(test_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_created ON screenshots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_screenshot_drawings_screenshot ON screenshot_drawings(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_drawings_sort ON screenshot_drawings(sort_order);

CREATE INDEX IF NOT EXISTS idx_screenshot_markers_screenshot ON screenshot_markers(screenshot_id);
CREATE INDEX IF NOT EXISTS idx_screenshot_markers_severity ON screenshot_markers(severity);

CREATE INDEX IF NOT EXISTS idx_document_blocks_test ON document_blocks(test_id);
CREATE INDEX IF NOT EXISTS idx_document_blocks_sort ON document_blocks(sort_order);

CREATE INDEX IF NOT EXISTS idx_exploration_todos_test ON exploration_todos(test_id);
CREATE INDEX IF NOT EXISTS idx_exploration_todos_sort ON exploration_todos(sort_order);

CREATE INDEX IF NOT EXISTS idx_recordings_app ON recordings(app_id);
CREATE INDEX IF NOT EXISTS idx_recordings_test ON recordings(test_id);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_created ON recordings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_issues_test ON issues(test_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues(priority);
CREATE INDEX IF NOT EXISTS idx_issues_number ON issues(number);

CREATE INDEX IF NOT EXISTS idx_annotations_recording ON annotations(recording_id);
CREATE INDEX IF NOT EXISTS idx_annotations_timestamp ON annotations(timestamp_ms);

CREATE INDEX IF NOT EXISTS idx_taggables_type_id ON taggables(taggable_type, taggable_id);

-- Diagrams (mind maps, user flows, dependency graphs)
-- Can belong to either a test/exploration OR an architecture doc
CREATE TABLE IF NOT EXISTS diagrams (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
    architecture_doc_id TEXT REFERENCES architecture_docs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    diagram_type TEXT NOT NULL, -- 'mindmap' | 'userflow' | 'dependency'
    viewport_x REAL NOT NULL DEFAULT 0,
    viewport_y REAL NOT NULL DEFAULT 0,
    viewport_zoom REAL NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Diagram nodes
CREATE TABLE IF NOT EXISTS diagram_nodes (
    id TEXT PRIMARY KEY,
    diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    node_type TEXT NOT NULL, -- varies by diagram type
    label TEXT NOT NULL DEFAULT '',
    notes TEXT,
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    width REAL,
    height REAL,
    style_data TEXT, -- JSON for colors, icons, etc.
    parent_id TEXT REFERENCES diagram_nodes(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Diagram edges (connections between nodes)
CREATE TABLE IF NOT EXISTS diagram_edges (
    id TEXT PRIMARY KEY,
    diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
    target_node_id TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
    edge_type TEXT NOT NULL DEFAULT 'default', -- 'default', 'conditional', 'dependency'
    label TEXT,
    style_data TEXT, -- JSON for line style, color, animated
    created_at TEXT NOT NULL
);

-- Node attachments (link screenshots/recordings to nodes)
CREATE TABLE IF NOT EXISTS node_attachments (
    id TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
    attachment_type TEXT NOT NULL, -- 'screenshot' | 'recording'
    screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
    recording_id TEXT REFERENCES recordings(id) ON DELETE CASCADE,
    timestamp_ms INTEGER, -- For recordings, specific timestamp
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Architecture documents (app-level, not exploration-level)
CREATE TABLE IF NOT EXISTS architecture_docs (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Architecture document blocks (reuses same structure as document_blocks)
CREATE TABLE IF NOT EXISTS architecture_doc_blocks (
    id TEXT PRIMARY KEY,
    doc_id TEXT NOT NULL REFERENCES architecture_docs(id) ON DELETE CASCADE,
    block_type TEXT NOT NULL, -- Same types as document_blocks + 'mermaid'
    content TEXT NOT NULL DEFAULT '',
    checked INTEGER,
    language TEXT,
    callout_type TEXT,
    image_path TEXT,
    image_caption TEXT,
    collapsed INTEGER,
    mermaid_code TEXT, -- For mermaid blocks
    indent_level INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes for diagrams
CREATE INDEX IF NOT EXISTS idx_diagrams_test ON diagrams(test_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_arch_doc ON diagrams(architecture_doc_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_type ON diagrams(diagram_type);
CREATE INDEX IF NOT EXISTS idx_diagram_nodes_diagram ON diagram_nodes(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_nodes_parent ON diagram_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_diagram_edges_diagram ON diagram_edges(diagram_id);
CREATE INDEX IF NOT EXISTS idx_diagram_edges_source ON diagram_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_diagram_edges_target ON diagram_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_node_attachments_node ON node_attachments(node_id);
CREATE INDEX IF NOT EXISTS idx_architecture_docs_app ON architecture_docs(app_id);
CREATE INDEX IF NOT EXISTS idx_architecture_doc_blocks_doc ON architecture_doc_blocks(doc_id);

-- =============================================================================
-- Demo Video Editor Tables
-- =============================================================================

-- Demos (video demo projects)
CREATE TABLE IF NOT EXISTS demos (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'youtube', -- youtube, youtube_4k, tiktok, square, custom
    width INTEGER NOT NULL DEFAULT 1920,
    height INTEGER NOT NULL DEFAULT 1080,
    frame_rate INTEGER NOT NULL DEFAULT 60,
    duration_ms INTEGER NOT NULL DEFAULT 60000,
    thumbnail_path TEXT,
    export_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Demo backgrounds (canvas background configuration)
CREATE TABLE IF NOT EXISTS demo_backgrounds (
    id TEXT PRIMARY KEY,
    demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
    background_type TEXT NOT NULL DEFAULT 'solid', -- solid, gradient, pattern, image, video, blur
    -- Solid color
    color TEXT,
    -- Gradient
    gradient_stops TEXT, -- JSON array of { color: string, position: number }
    gradient_direction TEXT, -- vertical, horizontal, diagonal, radial
    gradient_angle REAL,
    -- Pattern
    pattern_type TEXT,
    pattern_color TEXT,
    pattern_scale REAL,
    -- Image/Video
    media_path TEXT,
    media_scale REAL,
    media_position_x REAL,
    media_position_y REAL,
    -- Unsplash/URL image
    image_url TEXT,
    image_attribution TEXT, -- JSON { name: string, link: string }
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Demo tracks (timeline tracks)
CREATE TABLE IF NOT EXISTS demo_tracks (
    id TEXT PRIMARY KEY,
    demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
    track_type TEXT NOT NULL, -- video, image, audio, zoom, blur, pan
    name TEXT NOT NULL,
    locked INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    muted INTEGER NOT NULL DEFAULT 0,
    volume REAL NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    target_track_id TEXT REFERENCES demo_tracks(id) ON DELETE SET NULL, -- For zoom/blur tracks
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Demo clips (media clips on tracks)
CREATE TABLE IF NOT EXISTS demo_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES demo_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    -- Source media
    source_path TEXT NOT NULL,
    source_type TEXT NOT NULL, -- video, image, audio
    source_duration_ms INTEGER,
    -- Timeline position
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    -- Source trim (in/out points)
    in_point_ms INTEGER NOT NULL DEFAULT 0,
    out_point_ms INTEGER,
    -- Transform (for video/image)
    position_x REAL,
    position_y REAL,
    scale REAL,
    rotation REAL,
    -- Crop
    crop_top REAL,
    crop_bottom REAL,
    crop_left REAL,
    crop_right REAL,
    -- Appearance
    corner_radius REAL,
    opacity REAL,
    -- Shadow
    shadow_enabled INTEGER NOT NULL DEFAULT 0,
    shadow_blur REAL,
    shadow_offset_x REAL,
    shadow_offset_y REAL,
    shadow_color TEXT,
    -- Audio
    volume REAL NOT NULL DEFAULT 1.0,
    muted INTEGER NOT NULL DEFAULT 0,
    -- Playback speed
    speed REAL NOT NULL DEFAULT 1.0,
    -- Freeze frame (still image from video)
    freeze_frame INTEGER NOT NULL DEFAULT 0,
    freeze_frame_time_ms INTEGER,
    -- Entrance/exit transitions (for product launch videos)
    transition_in_type TEXT, -- fade, slide_up, slide_down, slide_left, slide_right, scale, blur
    transition_in_duration_ms INTEGER,
    transition_out_type TEXT,
    transition_out_duration_ms INTEGER,
    -- Audio fade
    audio_fade_in_ms INTEGER,
    audio_fade_out_ms INTEGER,
    -- Linked clips (for video with audio)
    linked_clip_id TEXT REFERENCES demo_clips(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Demo zoom clips (zoom effect clips)
CREATE TABLE IF NOT EXISTS demo_zoom_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES demo_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    zoom_scale REAL NOT NULL DEFAULT 1.5,
    zoom_center_x REAL NOT NULL DEFAULT 50.0,
    zoom_center_y REAL NOT NULL DEFAULT 50.0,
    ease_in_duration_ms INTEGER NOT NULL DEFAULT 300,
    ease_out_duration_ms INTEGER NOT NULL DEFAULT 300,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Demo blur clips (blur effect clips)
CREATE TABLE IF NOT EXISTS demo_blur_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES demo_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    blur_intensity REAL NOT NULL DEFAULT 20.0,
    region_x REAL NOT NULL DEFAULT 50.0,
    region_y REAL NOT NULL DEFAULT 50.0,
    region_width REAL NOT NULL DEFAULT 30.0,
    region_height REAL NOT NULL DEFAULT 30.0,
    corner_radius REAL NOT NULL DEFAULT 0.0,
    blur_inside INTEGER NOT NULL DEFAULT 1,
    ease_in_duration_ms INTEGER NOT NULL DEFAULT 0,
    ease_out_duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Demo pan clips (pan/move effect clips)
CREATE TABLE IF NOT EXISTS demo_pan_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES demo_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    -- Start position (percentage of canvas, 50 = center)
    start_x REAL NOT NULL DEFAULT 50.0,
    start_y REAL NOT NULL DEFAULT 50.0,
    -- End position (percentage of canvas)
    end_x REAL NOT NULL DEFAULT 50.0,
    end_y REAL NOT NULL DEFAULT 50.0,
    -- Easing
    ease_in_duration_ms INTEGER NOT NULL DEFAULT 300,
    ease_out_duration_ms INTEGER NOT NULL DEFAULT 300,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Demo assets (imported media files)
CREATE TABLE IF NOT EXISTS demo_assets (
    id TEXT PRIMARY KEY,
    demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- video, image, audio
    duration_ms INTEGER,
    width INTEGER,
    height INTEGER,
    thumbnail_path TEXT,
    file_size INTEGER,
    has_audio INTEGER,
    created_at TEXT NOT NULL
);

-- Demo recordings (link table to associate recordings with demos)
CREATE TABLE IF NOT EXISTS demo_recordings (
    id TEXT PRIMARY KEY,
    demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
    recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(demo_id, recording_id)
);

-- Demo screenshots (link table to associate screenshots with demos)
CREATE TABLE IF NOT EXISTS demo_screenshots (
    id TEXT PRIMARY KEY,
    demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
    screenshot_id TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(demo_id, screenshot_id)
);

-- Demo indexes
CREATE INDEX IF NOT EXISTS idx_demos_app ON demos(app_id);
CREATE INDEX IF NOT EXISTS idx_demos_created ON demos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demo_backgrounds_demo ON demo_backgrounds(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_tracks_demo ON demo_tracks(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_tracks_sort ON demo_tracks(sort_order);
CREATE INDEX IF NOT EXISTS idx_demo_clips_track ON demo_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_demo_clips_start ON demo_clips(start_time_ms);
CREATE INDEX IF NOT EXISTS idx_demo_zoom_clips_track ON demo_zoom_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_demo_blur_clips_track ON demo_blur_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_demo_pan_clips_track ON demo_pan_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_demo_assets_demo ON demo_assets(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_recordings_demo ON demo_recordings(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_recordings_recording ON demo_recordings(recording_id);
CREATE INDEX IF NOT EXISTS idx_demo_screenshots_demo ON demo_screenshots(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_screenshots_screenshot ON demo_screenshots(screenshot_id);

-- Demo videos (video projects within a demo, each with its own editor state)
-- Videos are independent entities under demos with their own isolated editor state
CREATE TABLE IF NOT EXISTS demo_videos (
    id TEXT PRIMARY KEY,
    demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    width INTEGER NOT NULL DEFAULT 1920,
    height INTEGER NOT NULL DEFAULT 1080,
    frame_rate INTEGER NOT NULL DEFAULT 60,
    file_size INTEGER,
    format TEXT NOT NULL DEFAULT 'mp4', -- mp4, webm, etc.
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_demo_videos_demo ON demo_videos(demo_id);
CREATE INDEX IF NOT EXISTS idx_demo_videos_created ON demo_videos(created_at DESC);

-- =============================================================================
-- Video Editor State Tables (isolated per-video editor state)
-- These mirror the demo editor tables but are keyed to video_id
-- =============================================================================

-- Video backgrounds (canvas background configuration per video)
CREATE TABLE IF NOT EXISTS video_backgrounds (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES demo_videos(id) ON DELETE CASCADE,
    background_type TEXT NOT NULL DEFAULT 'solid', -- solid, gradient, pattern, image, video, blur
    color TEXT,
    gradient_stops TEXT,
    gradient_direction TEXT,
    gradient_angle REAL,
    pattern_type TEXT,
    pattern_color TEXT,
    pattern_scale REAL,
    media_path TEXT,
    media_scale REAL,
    media_position_x REAL,
    media_position_y REAL,
    image_url TEXT,
    image_attribution TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Video tracks (timeline tracks per video)
CREATE TABLE IF NOT EXISTS video_tracks (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES demo_videos(id) ON DELETE CASCADE,
    track_type TEXT NOT NULL, -- video, image, audio, zoom, blur, pan
    name TEXT NOT NULL,
    locked INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    muted INTEGER NOT NULL DEFAULT 0,
    volume REAL NOT NULL DEFAULT 1.0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    target_track_id TEXT REFERENCES video_tracks(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Video clips (media clips on tracks per video)
CREATE TABLE IF NOT EXISTS video_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES video_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_path TEXT NOT NULL,
    source_type TEXT NOT NULL, -- video, image, audio
    source_duration_ms INTEGER,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    in_point_ms INTEGER NOT NULL DEFAULT 0,
    out_point_ms INTEGER,
    position_x REAL,
    position_y REAL,
    scale REAL,
    rotation REAL,
    crop_top REAL,
    crop_bottom REAL,
    crop_left REAL,
    crop_right REAL,
    corner_radius REAL,
    opacity REAL,
    shadow_enabled INTEGER NOT NULL DEFAULT 0,
    shadow_blur REAL,
    shadow_offset_x REAL,
    shadow_offset_y REAL,
    shadow_color TEXT,
    shadow_opacity REAL,
    border_enabled INTEGER NOT NULL DEFAULT 0,
    border_width REAL,
    border_color TEXT,
    volume REAL NOT NULL DEFAULT 1.0,
    muted INTEGER NOT NULL DEFAULT 0,
    speed REAL NOT NULL DEFAULT 1.0,
    freeze_frame INTEGER NOT NULL DEFAULT 0,
    freeze_frame_time_ms INTEGER,
    transition_in_type TEXT,
    transition_in_duration_ms INTEGER,
    transition_out_type TEXT,
    transition_out_duration_ms INTEGER,
    audio_fade_in_ms INTEGER,
    audio_fade_out_ms INTEGER,
    linked_clip_id TEXT REFERENCES video_clips(id) ON DELETE SET NULL,
    has_audio INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Video zoom clips (zoom effect clips per video)
CREATE TABLE IF NOT EXISTS video_zoom_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES video_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    zoom_scale REAL NOT NULL DEFAULT 1.5,
    zoom_center_x REAL NOT NULL DEFAULT 50.0,
    zoom_center_y REAL NOT NULL DEFAULT 50.0,
    ease_in_duration_ms INTEGER NOT NULL DEFAULT 300,
    ease_out_duration_ms INTEGER NOT NULL DEFAULT 300,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Video blur clips (blur effect clips per video)
CREATE TABLE IF NOT EXISTS video_blur_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES video_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    blur_intensity REAL NOT NULL DEFAULT 20.0,
    region_x REAL NOT NULL DEFAULT 50.0,
    region_y REAL NOT NULL DEFAULT 50.0,
    region_width REAL NOT NULL DEFAULT 30.0,
    region_height REAL NOT NULL DEFAULT 30.0,
    corner_radius REAL NOT NULL DEFAULT 0.0,
    blur_inside INTEGER NOT NULL DEFAULT 1,
    ease_in_duration_ms INTEGER NOT NULL DEFAULT 0,
    ease_out_duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Video pan clips (pan/move effect clips per video)
CREATE TABLE IF NOT EXISTS video_pan_clips (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL REFERENCES video_tracks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time_ms INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    start_x REAL NOT NULL DEFAULT 50.0,
    start_y REAL NOT NULL DEFAULT 50.0,
    end_x REAL NOT NULL DEFAULT 50.0,
    end_y REAL NOT NULL DEFAULT 50.0,
    ease_in_duration_ms INTEGER NOT NULL DEFAULT 300,
    ease_out_duration_ms INTEGER NOT NULL DEFAULT 300,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Video assets (imported media files per video)
CREATE TABLE IF NOT EXISTS video_assets (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES demo_videos(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- video, image, audio
    duration_ms INTEGER,
    width INTEGER,
    height INTEGER,
    thumbnail_path TEXT,
    file_size INTEGER,
    has_audio INTEGER,
    created_at TEXT NOT NULL
);

-- Video editor indexes
CREATE INDEX IF NOT EXISTS idx_video_backgrounds_video ON video_backgrounds(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tracks_video ON video_tracks(video_id);
CREATE INDEX IF NOT EXISTS idx_video_tracks_sort ON video_tracks(sort_order);
CREATE INDEX IF NOT EXISTS idx_video_clips_track ON video_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_video_clips_start ON video_clips(start_time_ms);
CREATE INDEX IF NOT EXISTS idx_video_zoom_clips_track ON video_zoom_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_video_blur_clips_track ON video_blur_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_video_pan_clips_track ON video_pan_clips(track_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_video ON video_assets(video_id);

-- =============================================================================
-- Features (app-wide primitives for documentation and annotations)
-- =============================================================================

-- Features (app-level feature tracking)
CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planned', -- planned, in_progress, completed, deprecated
    priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_features_app ON features(app_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON features(status);
CREATE INDEX IF NOT EXISTS idx_features_sort ON features(sort_order);
