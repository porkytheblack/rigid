-- Taka Database Schema v2
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

-- Screenshots (captured images per test)
CREATE TABLE IF NOT EXISTS screenshots (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Recordings (screen recordings per test)
CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    recording_path TEXT,
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
