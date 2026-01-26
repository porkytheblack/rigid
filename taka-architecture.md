# Taka Architecture Specification

## Local-First Desktop Application

---

## Overview

Taka is a desktop application built with Tauri and Next.js. Everything runs locally—your data never leaves your machine unless you explicitly choose to use cloud AI services. The app works fully without any AI features enabled; AI is an enhancement layer, not a dependency.

The architecture follows an adapter-based pattern throughout. Storage, AI providers, screen capture, and export formats are all pluggable. This keeps the core logic clean and makes it easy to add new integrations without touching existing code.

---

## Tech Stack

### Core Framework

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Desktop Runtime | Tauri | 2.x | Native desktop shell, system APIs |
| Frontend Framework | Next.js | 15.x | UI rendering, routing |
| UI Library | React | 19.x | Component architecture |
| Language (Frontend) | TypeScript | 5.x | Type safety |
| Language (Backend) | Rust | 1.83+ | Tauri backend, performance-critical ops |

### Data Layer

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Database | SQLite | 3.x | Local persistent storage |
| SQLite Binding | sqlite (Rust crate) | latest | Rust SQLite interface |
| ORM/Query Builder | Drizzle ORM | latest | Type-safe queries from frontend |
| File Storage | Local filesystem | — | Media files, exports |

### UI & Styling

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Component Primitives | Radix UI | latest | Accessible, unstyled components |
| Icons | Lucide React | latest | Consistent icon set |
| State Management | Zustand | 5.x | Lightweight global state |
| Forms | React Hook Form | 7.x | Form state and validation |
| Validation | Zod | 3.x | Schema validation |

### Media Handling

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Screen Capture | scap (Rust crate) | latest | Cross-platform screen/window capture |
| Video Encoding | FFmpeg | 7.x | Video processing, encoding |
| Video Playback | vidstack | latest | React video player component |
| Image Processing | image (Rust crate) | latest | Screenshot processing |

### AI Integration

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Local Models | Ollama | latest | Local LLM inference |
| Cloud Providers | OpenRouter / Direct APIs | — | GPT-4, Claude, etc. |
| Embeddings (Local) | fastembed-rs | latest | Local vector embeddings |

### Testing

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Unit Testing (TS) | Vitest | 2.x | Fast unit tests |
| Component Testing | React Testing Library | latest | Component behavior tests |
| E2E Testing | Playwright | latest | Full app integration tests |
| Rust Testing | Built-in + cargo-nextest | latest | Backend unit/integration tests |
| Coverage | c8 / cargo-llvm-cov | latest | Coverage reporting |

### Build & Dev

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Package Manager | pnpm | 9.x | Fast, efficient deps |
| Bundler | Turbopack (via Next.js) | — | Fast dev builds |
| Linting | ESLint + Biome | latest | Code quality |
| Formatting | Biome | latest | Consistent formatting |
| Git Hooks | lefthook | latest | Pre-commit checks |

---

## Project Structure

```
taka/
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs               # Entry point
│   │   ├── lib.rs                # Library exports
│   │   ├── commands/             # Tauri IPC commands
│   │   │   ├── mod.rs
│   │   │   ├── storage.rs        # Database operations
│   │   │   ├── capture.rs        # Screen/window capture
│   │   │   ├── media.rs          # Video/image processing
│   │   │   ├── ai.rs             # AI provider calls
│   │   │   ├── filesystem.rs     # File operations
│   │   │   └── settings.rs       # App settings
│   │   ├── adapters/             # Backend adapters
│   │   │   ├── mod.rs
│   │   │   ├── capture/          # Screen capture adapters
│   │   │   │   ├── mod.rs
│   │   │   │   ├── scap.rs       # scap implementation
│   │   │   │   └── traits.rs     # CaptureAdapter trait
│   │   │   ├── ai/               # AI provider adapters
│   │   │   │   ├── mod.rs
│   │   │   │   ├── ollama.rs
│   │   │   │   ├── openrouter.rs
│   │   │   │   ├── openai.rs
│   │   │   │   ├── anthropic.rs
│   │   │   │   └── traits.rs     # AIAdapter trait
│   │   │   └── encoding/         # Video encoding adapters
│   │   │       ├── mod.rs
│   │   │       ├── ffmpeg.rs
│   │   │       └── traits.rs
│   │   ├── db/                   # Database layer
│   │   │   ├── mod.rs
│   │   │   ├── schema.rs         # Table definitions
│   │   │   ├── migrations/       # SQL migrations
│   │   │   └── queries/          # Prepared queries
│   │   ├── services/             # Business logic
│   │   │   ├── mod.rs
│   │   │   ├── recording.rs      # Recording session logic
│   │   │   ├── screenshot.rs     # Screenshot logic
│   │   │   ├── issue.rs          # Issue management
│   │   │   └── export.rs         # Export functionality
│   │   ├── models/               # Data structures
│   │   │   ├── mod.rs
│   │   │   ├── session.rs
│   │   │   ├── issue.rs
│   │   │   ├── checklist.rs
│   │   │   ├── codex.rs
│   │   │   └── settings.rs
│   │   └── utils/                # Shared utilities
│   │       ├── mod.rs
│   │       ├── crypto.rs         # Encryption for API keys
│   │       └── paths.rs          # App data paths
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/             # Tauri v2 permissions
│       └── default.json
│
├── src/                          # Next.js frontend
│   ├── app/                      # App router pages
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard
│   │   ├── checklist/
│   │   │   └── page.tsx
│   │   ├── sessions/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── issues/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── codex/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── screenshots/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── components/               # React components
│   │   ├── ui/                   # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── modal.tsx
│   │   │   ├── dropdown.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tag.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   ├── layout/               # Layout components
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── command-palette.tsx
│   │   │   └── breadcrumbs.tsx
│   │   ├── features/             # Feature-specific components
│   │   │   ├── checklist/
│   │   │   │   ├── checklist-item.tsx
│   │   │   │   ├── checklist-list.tsx
│   │   │   │   └── checklist-form.tsx
│   │   │   ├── sessions/
│   │   │   │   ├── session-card.tsx
│   │   │   │   ├── video-player.tsx
│   │   │   │   ├── annotation-marker.tsx
│   │   │   │   └── annotation-list.tsx
│   │   │   ├── issues/
│   │   │   │   ├── issue-row.tsx
│   │   │   │   ├── issue-detail.tsx
│   │   │   │   └── prompt-generator.tsx
│   │   │   ├── codex/
│   │   │   │   ├── codex-entry.tsx
│   │   │   │   └── codex-editor.tsx
│   │   │   ├── screenshots/
│   │   │   │   ├── screenshot-grid.tsx
│   │   │   │   ├── screenshot-annotator.tsx
│   │   │   │   └── capture-overlay.tsx
│   │   │   ├── recording/
│   │   │   │   ├── recording-indicator.tsx
│   │   │   │   ├── source-picker.tsx
│   │   │   │   └── recording-controls.tsx
│   │   │   └── ai/
│   │   │       ├── ai-status.tsx
│   │   │       ├── ai-suggestion.tsx
│   │   │       └── provider-selector.tsx
│   │   └── shared/               # Shared components
│   │       ├── empty-state.tsx
│   │       ├── loading.tsx
│   │       └── error-boundary.tsx
│   │
│   ├── lib/                      # Frontend libraries
│   │   ├── tauri/                # Tauri IPC wrappers
│   │   │   ├── commands.ts       # Type-safe command calls
│   │   │   ├── events.ts         # Event listeners
│   │   │   └── types.ts          # Shared types
│   │   ├── adapters/             # Frontend adapters
│   │   │   ├── storage/          # Storage adapter interface
│   │   │   │   ├── index.ts
│   │   │   │   ├── tauri.ts      # Tauri/SQLite implementation
│   │   │   │   └── types.ts
│   │   │   ├── ai/               # AI adapter interface
│   │   │   │   ├── index.ts
│   │   │   │   ├── client.ts     # AI client factory
│   │   │   │   └── types.ts
│   │   │   └── capture/          # Capture adapter interface
│   │   │       ├── index.ts
│   │   │       └── types.ts
│   │   ├── stores/               # Zustand stores
│   │   │   ├── app.ts            # Global app state
│   │   │   ├── checklist.ts
│   │   │   ├── sessions.ts
│   │   │   ├── issues.ts
│   │   │   ├── codex.ts
│   │   │   ├── recording.ts
│   │   │   └── settings.ts
│   │   ├── hooks/                # Custom React hooks
│   │   │   ├── use-keyboard.ts
│   │   │   ├── use-recording.ts
│   │   │   ├── use-screenshot.ts
│   │   │   ├── use-ai.ts
│   │   │   └── use-debounce.ts
│   │   ├── utils/                # Utility functions
│   │   │   ├── format.ts
│   │   │   ├── time.ts
│   │   │   └── prompt.ts         # Prompt generation helpers
│   │   └── validations/          # Zod schemas
│   │       ├── checklist.ts
│   │       ├── issue.ts
│   │       ├── codex.ts
│   │       └── settings.ts
│   │
│   └── styles/                   # Global styles
│       ├── globals.css
│       └── tokens.css            # CSS custom properties
│
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── utils/
│   ├── integration/              # Integration tests
│   │   ├── tauri/
│   │   └── features/
│   └── e2e/                      # End-to-end tests
│       ├── checklist.spec.ts
│       ├── recording.spec.ts
│       ├── issues.spec.ts
│       └── ...
│
├── scripts/                      # Build/dev scripts
│   ├── dev.ts
│   ├── build.ts
│   └── test.ts
│
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── README.md
```

---

## Core Architecture Patterns

### Adapter Pattern

Every external integration uses an adapter pattern. This provides:

1. **Swappability** — Change implementations without touching business logic
2. **Testability** — Mock adapters for testing
3. **Optionality** — Gracefully handle missing features
4. **Future-proofing** — Add new providers without refactoring

#### Adapter Interface Example (TypeScript)

```typescript
// lib/adapters/ai/types.ts

export interface AIAdapter {
  readonly id: string;
  readonly name: string;
  readonly isAvailable: () => Promise<boolean>;
  
  // Core capabilities
  complete(prompt: string, options?: CompletionOptions): Promise<CompletionResult>;
  
  // Optional capabilities — adapters declare what they support
  readonly capabilities: {
    streaming: boolean;
    vision: boolean;
    embeddings: boolean;
  };
  
  // Optional methods — only implemented if capability is true
  stream?(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
  embedText?(text: string): Promise<number[]>;
  describeImage?(image: Uint8Array): Promise<string>;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface CompletionResult {
  text: string;
  tokensUsed: number;
  model: string;
}
```

#### Adapter Interface Example (Rust)

```rust
// src-tauri/src/adapters/ai/traits.rs

use async_trait::async_trait;

#[async_trait]
pub trait AIAdapter: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    async fn is_available(&self) -> bool;
    
    async fn complete(
        &self,
        prompt: &str,
        options: CompletionOptions,
    ) -> Result<CompletionResult, AIError>;
    
    fn capabilities(&self) -> AICapabilities;
}

pub struct AICapabilities {
    pub streaming: bool,
    pub vision: bool,
    pub embeddings: bool,
}

pub struct CompletionOptions {
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub system_prompt: Option<String>,
}

pub struct CompletionResult {
    pub text: String,
    pub tokens_used: u32,
    pub model: String,
}
```

### Service Layer

Business logic lives in services, which orchestrate adapters and repositories.

```rust
// src-tauri/src/services/recording.rs

pub struct RecordingService {
    capture_adapter: Arc<dyn CaptureAdapter>,
    encoding_adapter: Arc<dyn EncodingAdapter>,
    db: Arc<Database>,
}

impl RecordingService {
    pub async fn start_recording(
        &self,
        source: CaptureSource,
        session_id: Uuid,
    ) -> Result<RecordingHandle, RecordingError> {
        // Validate session exists
        let session = self.db.sessions().get(session_id).await?;
        
        // Start capture
        let capture_stream = self.capture_adapter.start(source).await?;
        
        // Begin encoding
        let output_path = self.get_recording_path(session_id);
        let encoding_handle = self.encoding_adapter
            .encode_stream(capture_stream, output_path)
            .await?;
        
        // Update session state
        self.db.sessions().update_status(session_id, SessionStatus::Recording).await?;
        
        Ok(RecordingHandle {
            session_id,
            encoding_handle,
        })
    }
    
    pub async fn stop_recording(
        &self,
        handle: RecordingHandle,
    ) -> Result<RecordingResult, RecordingError> {
        // Stop encoding
        let result = handle.encoding_handle.finish().await?;
        
        // Update session with recording info
        self.db.sessions().set_recording(
            handle.session_id,
            result.path,
            result.duration,
        ).await?;
        
        Ok(result)
    }
}
```

### Repository Pattern

Data access is abstracted through repositories.

```rust
// src-tauri/src/db/repositories/sessions.rs

pub struct SessionRepository {
    conn: Arc<Connection>,
}

impl SessionRepository {
    pub async fn create(&self, session: NewSession) -> Result<Session, DbError> {
        let id = Uuid::new_v4();
        let now = Utc::now();
        
        sqlx::query!(
            r#"
            INSERT INTO sessions (id, name, version, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
            id,
            session.name,
            session.version,
            SessionStatus::Ready,
            now,
            now,
        )
        .execute(&*self.conn)
        .await?;
        
        self.get(id).await
    }
    
    pub async fn get(&self, id: Uuid) -> Result<Session, DbError> {
        sqlx::query_as!(Session, "SELECT * FROM sessions WHERE id = ?", id)
            .fetch_one(&*self.conn)
            .await
            .map_err(DbError::from)
    }
    
    pub async fn list(&self, filter: SessionFilter) -> Result<Vec<Session>, DbError> {
        // Dynamic query building based on filter
        let mut query = QueryBuilder::new("SELECT * FROM sessions WHERE 1=1");
        
        if let Some(version) = filter.version {
            query.push(" AND version = ").push_bind(version);
        }
        
        if let Some(status) = filter.status {
            query.push(" AND status = ").push_bind(status);
        }
        
        query.push(" ORDER BY created_at DESC");
        
        if let Some(limit) = filter.limit {
            query.push(" LIMIT ").push_bind(limit);
        }
        
        query.build_query_as::<Session>()
            .fetch_all(&*self.conn)
            .await
            .map_err(DbError::from)
    }
}
```

---

## Data Layer

### SQLite Schema

```sql
-- migrations/001_initial.sql

-- Core entities
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT,
    status TEXT NOT NULL DEFAULT 'ready',
    recording_path TEXT,
    duration_ms INTEGER,
    thumbnail_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE annotations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp_ms INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE issues (
    id TEXT PRIMARY KEY,
    number INTEGER NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    version TEXT,
    codex_entry_id TEXT REFERENCES codex_entries(id) ON DELETE SET NULL,
    source_type TEXT, -- 'annotation', 'screenshot', 'manual'
    source_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE checklist_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'untested',
    sort_order INTEGER NOT NULL DEFAULT 0,
    group_name TEXT,
    version TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE codex_entries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT,
    what_it_does TEXT,
    how_it_works TEXT,
    key_files TEXT, -- JSON array
    dependencies TEXT, -- JSON array
    gotchas TEXT,
    is_draft INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE screenshots (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_path TEXT NOT NULL,
    annotated_image_path TEXT,
    annotations_data TEXT, -- JSON for drawing annotations
    version TEXT,
    issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);

-- Tags (polymorphic)
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
);

CREATE TABLE taggables (
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    taggable_type TEXT NOT NULL, -- 'issue', 'checklist_item', 'session', etc.
    taggable_id TEXT NOT NULL,
    PRIMARY KEY (tag_id, taggable_type, taggable_id)
);

-- Versions
CREATE TABLE versions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_current INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

-- Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- AI Provider configs (encrypted values)
CREATE TABLE ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    adapter_type TEXT NOT NULL,
    config_encrypted TEXT NOT NULL, -- Encrypted JSON
    is_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX idx_annotations_session ON annotations(session_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_version ON issues(version);
CREATE INDEX idx_checklist_status ON checklist_items(status);
CREATE INDEX idx_taggables_type_id ON taggables(taggable_type, taggable_id);
CREATE INDEX idx_sessions_version ON sessions(version);
CREATE INDEX idx_sessions_created ON sessions(created_at DESC);
```

### File Storage Structure

```
~/.taka/                          # macOS: ~/Library/Application Support/taka
├── taka.db                       # SQLite database
├── recordings/                   # Session recordings
│   ├── {session_id}/
│   │   ├── recording.mp4
│   │   ├── thumbnail.jpg
│   │   └── clips/                # Extracted clips for annotations
│   │       └── {annotation_id}.mp4
├── screenshots/                  # Screenshot images
│   ├── {screenshot_id}/
│   │   ├── original.png
│   │   └── annotated.png
├── exports/                      # Exported data
└── backups/                      # Automatic backups
```

---

## Tauri IPC Layer

### Command Definitions

```rust
// src-tauri/src/commands/mod.rs

use tauri::State;
use crate::services::*;
use crate::models::*;

// Session commands
#[tauri::command]
pub async fn create_session(
    name: String,
    version: Option<String>,
    services: State<'_, Services>,
) -> Result<Session, CommandError> {
    services.sessions.create(NewSession { name, version }).await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn list_sessions(
    filter: SessionFilter,
    services: State<'_, Services>,
) -> Result<Vec<Session>, CommandError> {
    services.sessions.list(filter).await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn start_recording(
    session_id: String,
    source: CaptureSource,
    services: State<'_, Services>,
) -> Result<(), CommandError> {
    let id = Uuid::parse_str(&session_id)?;
    services.recording.start(id, source).await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn stop_recording(
    session_id: String,
    services: State<'_, Services>,
) -> Result<RecordingResult, CommandError> {
    let id = Uuid::parse_str(&session_id)?;
    services.recording.stop(id).await
        .map_err(CommandError::from)
}

// Screenshot commands
#[tauri::command]
pub async fn take_screenshot(
    source: CaptureSource,
    services: State<'_, Services>,
) -> Result<Screenshot, CommandError> {
    services.screenshot.capture(source).await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn get_capture_sources(
    services: State<'_, Services>,
) -> Result<Vec<CaptureSource>, CommandError> {
    services.capture.list_sources().await
        .map_err(CommandError::from)
}

// AI commands
#[tauri::command]
pub async fn ai_complete(
    prompt: String,
    provider_id: Option<String>,
    options: CompletionOptions,
    services: State<'_, Services>,
) -> Result<CompletionResult, CommandError> {
    services.ai.complete(prompt, provider_id, options).await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn ai_generate_prompt(
    issue_id: String,
    services: State<'_, Services>,
) -> Result<String, CommandError> {
    let id = Uuid::parse_str(&issue_id)?;
    services.ai.generate_issue_prompt(id).await
        .map_err(CommandError::from)
}

#[tauri::command]
pub async fn ai_describe_screenshot(
    screenshot_id: String,
    services: State<'_, Services>,
) -> Result<String, CommandError> {
    let id = Uuid::parse_str(&screenshot_id)?;
    services.ai.describe_screenshot(id).await
        .map_err(CommandError::from)
}
```

### Frontend Command Wrappers

```typescript
// lib/tauri/commands.ts

import { invoke } from '@tauri-apps/api/core';
import type { 
  Session, 
  SessionFilter, 
  CaptureSource,
  Screenshot,
  CompletionOptions,
  CompletionResult 
} from './types';

// Sessions
export const sessions = {
  create: (name: string, version?: string) =>
    invoke<Session>('create_session', { name, version }),
    
  list: (filter: SessionFilter = {}) =>
    invoke<Session[]>('list_sessions', { filter }),
    
  get: (id: string) =>
    invoke<Session>('get_session', { sessionId: id }),
    
  delete: (id: string) =>
    invoke<void>('delete_session', { sessionId: id }),
};

// Recording
export const recording = {
  start: (sessionId: string, source: CaptureSource) =>
    invoke<void>('start_recording', { sessionId, source }),
    
  stop: (sessionId: string) =>
    invoke<RecordingResult>('stop_recording', { sessionId }),
    
  getSources: () =>
    invoke<CaptureSource[]>('get_capture_sources'),
};

// Screenshots
export const screenshots = {
  take: (source: CaptureSource) =>
    invoke<Screenshot>('take_screenshot', { source }),
    
  save: (id: string, annotations: AnnotationData) =>
    invoke<Screenshot>('save_screenshot_annotations', { 
      screenshotId: id, 
      annotations 
    }),
};

// AI (optional - gracefully handles disabled state)
export const ai = {
  complete: (prompt: string, options?: CompletionOptions) =>
    invoke<CompletionResult>('ai_complete', { prompt, options }),
    
  generatePrompt: (issueId: string) =>
    invoke<string>('ai_generate_prompt', { issueId }),
    
  describeScreenshot: (screenshotId: string) =>
    invoke<string>('ai_describe_screenshot', { screenshotId }),
    
  isAvailable: () =>
    invoke<boolean>('ai_is_available'),
};
```

### Event System

```rust
// src-tauri/src/events.rs

use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct RecordingProgress {
    pub session_id: String,
    pub duration_ms: u64,
    pub file_size_bytes: u64,
}

#[derive(Clone, Serialize)]
pub struct RecordingComplete {
    pub session_id: String,
    pub path: String,
    pub duration_ms: u64,
}

pub fn emit_recording_progress(app: &AppHandle, progress: RecordingProgress) {
    app.emit("recording:progress", progress).ok();
}

pub fn emit_recording_complete(app: &AppHandle, result: RecordingComplete) {
    app.emit("recording:complete", result).ok();
}

pub fn emit_ai_status_changed(app: &AppHandle, available: bool) {
    app.emit("ai:status", available).ok();
}
```

```typescript
// lib/tauri/events.ts

import { listen, type UnlistenFn } from '@tauri-apps/api/event';

export interface RecordingProgress {
  sessionId: string;
  durationMs: number;
  fileSizeBytes: number;
}

export interface RecordingComplete {
  sessionId: string;
  path: string;
  durationMs: number;
}

export const events = {
  onRecordingProgress: (callback: (data: RecordingProgress) => void): Promise<UnlistenFn> =>
    listen('recording:progress', (event) => callback(event.payload as RecordingProgress)),
    
  onRecordingComplete: (callback: (data: RecordingComplete) => void): Promise<UnlistenFn> =>
    listen('recording:complete', (event) => callback(event.payload as RecordingComplete)),
    
  onAIStatusChanged: (callback: (available: boolean) => void): Promise<UnlistenFn> =>
    listen('ai:status', (event) => callback(event.payload as boolean)),
};
```

---

## Screen Capture System

### Capture Adapter

```rust
// src-tauri/src/adapters/capture/traits.rs

use async_trait::async_trait;
use tokio::sync::mpsc;

#[derive(Clone, Debug)]
pub enum CaptureSource {
    FullScreen { display_id: u32 },
    Window { window_id: u32, title: String },
    Region { x: i32, y: i32, width: u32, height: u32 },
}

pub struct Frame {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub timestamp_ms: u64,
}

#[async_trait]
pub trait CaptureAdapter: Send + Sync {
    /// List available capture sources
    async fn list_sources(&self) -> Result<Vec<CaptureSource>, CaptureError>;
    
    /// Capture a single frame (for screenshots)
    async fn capture_frame(&self, source: &CaptureSource) -> Result<Frame, CaptureError>;
    
    /// Start continuous capture (for recording)
    async fn start_capture(
        &self,
        source: &CaptureSource,
        fps: u32,
    ) -> Result<mpsc::Receiver<Frame>, CaptureError>;
    
    /// Stop capture
    async fn stop_capture(&self) -> Result<(), CaptureError>;
}
```

### scap Implementation

```rust
// src-tauri/src/adapters/capture/scap.rs

use scap::{
    capturer::{Capturer, Options},
    frame::Frame as ScapFrame,
    Target,
};
use super::traits::*;

pub struct ScapAdapter {
    capturer: Option<Capturer>,
}

impl ScapAdapter {
    pub fn new() -> Self {
        Self { capturer: None }
    }
}

#[async_trait]
impl CaptureAdapter for ScapAdapter {
    async fn list_sources(&self) -> Result<Vec<CaptureSource>, CaptureError> {
        let targets = scap::get_all_targets();
        
        Ok(targets.into_iter().map(|t| match t {
            Target::Display(d) => CaptureSource::FullScreen { 
                display_id: d.id 
            },
            Target::Window(w) => CaptureSource::Window { 
                window_id: w.id,
                title: w.title,
            },
        }).collect())
    }
    
    async fn capture_frame(&self, source: &CaptureSource) -> Result<Frame, CaptureError> {
        let target = source_to_target(source)?;
        
        let options = Options {
            fps: 1, // Single frame
            target: Some(target),
            show_cursor: true,
            show_highlight: false,
            ..Default::default()
        };
        
        let mut capturer = Capturer::new(options);
        capturer.start_capture();
        
        let frame = capturer.get_next_frame()?;
        capturer.stop_capture();
        
        Ok(scap_frame_to_frame(frame))
    }
    
    async fn start_capture(
        &self,
        source: &CaptureSource,
        fps: u32,
    ) -> Result<mpsc::Receiver<Frame>, CaptureError> {
        let target = source_to_target(source)?;
        let (tx, rx) = mpsc::channel(30); // Buffer ~1 second at 30fps
        
        let options = Options {
            fps,
            target: Some(target),
            show_cursor: true,
            show_highlight: false,
            ..Default::default()
        };
        
        let mut capturer = Capturer::new(options);
        capturer.start_capture();
        
        // Spawn capture loop
        tokio::spawn(async move {
            loop {
                match capturer.get_next_frame() {
                    Ok(frame) => {
                        if tx.send(scap_frame_to_frame(frame)).await.is_err() {
                            break; // Receiver dropped
                        }
                    }
                    Err(_) => break,
                }
            }
            capturer.stop_capture();
        });
        
        Ok(rx)
    }
    
    async fn stop_capture(&self) -> Result<(), CaptureError> {
        // Signal stop via channel close
        Ok(())
    }
}
```

### Video Encoding

```rust
// src-tauri/src/adapters/encoding/ffmpeg.rs

use std::process::{Command, Stdio};
use std::io::Write;
use tokio::sync::mpsc;
use super::traits::*;

pub struct FFmpegAdapter {
    ffmpeg_path: String,
}

impl FFmpegAdapter {
    pub fn new() -> Result<Self, EncodingError> {
        // Find ffmpeg in PATH or bundled location
        let ffmpeg_path = which::which("ffmpeg")
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| "ffmpeg".to_string());
        
        Ok(Self { ffmpeg_path })
    }
}

#[async_trait]
impl EncodingAdapter for FFmpegAdapter {
    async fn encode_stream(
        &self,
        mut frames: mpsc::Receiver<Frame>,
        output_path: &str,
        options: EncodingOptions,
    ) -> Result<EncodingHandle, EncodingError> {
        let mut child = Command::new(&self.ffmpeg_path)
            .args([
                "-f", "rawvideo",
                "-pixel_format", "bgra",
                "-video_size", &format!("{}x{}", options.width, options.height),
                "-framerate", &options.fps.to_string(),
                "-i", "-",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-y",
                output_path,
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()?;
        
        let mut stdin = child.stdin.take().unwrap();
        
        tokio::spawn(async move {
            while let Some(frame) = frames.recv().await {
                if stdin.write_all(&frame.data).is_err() {
                    break;
                }
            }
            drop(stdin); // Close pipe, signals EOF to ffmpeg
        });
        
        Ok(EncodingHandle { child })
    }
}
```

---

## AI Integration Layer

### AI Service (Coordinates Adapters)

```rust
// src-tauri/src/services/ai.rs

use crate::adapters::ai::*;
use crate::db::Database;
use std::collections::HashMap;
use std::sync::Arc;

pub struct AIService {
    adapters: HashMap<String, Arc<dyn AIAdapter>>,
    db: Arc<Database>,
    default_provider: Option<String>,
}

impl AIService {
    pub fn new(db: Arc<Database>) -> Self {
        Self {
            adapters: HashMap::new(),
            db,
            default_provider: None,
        }
    }
    
    /// Register an AI adapter
    pub fn register_adapter(&mut self, adapter: Arc<dyn AIAdapter>) {
        self.adapters.insert(adapter.id().to_string(), adapter);
    }
    
    /// Check if any AI provider is available
    pub async fn is_available(&self) -> bool {
        for adapter in self.adapters.values() {
            if adapter.is_available().await {
                return true;
            }
        }
        false
    }
    
    /// Get available providers
    pub async fn list_providers(&self) -> Vec<ProviderInfo> {
        let mut providers = Vec::new();
        
        for adapter in self.adapters.values() {
            providers.push(ProviderInfo {
                id: adapter.id().to_string(),
                name: adapter.name().to_string(),
                available: adapter.is_available().await,
                capabilities: adapter.capabilities(),
            });
        }
        
        providers
    }
    
    /// Complete with specified or default provider
    pub async fn complete(
        &self,
        prompt: String,
        provider_id: Option<String>,
        options: CompletionOptions,
    ) -> Result<CompletionResult, AIError> {
        let adapter = self.get_adapter(provider_id)?;
        
        if !adapter.is_available().await {
            return Err(AIError::ProviderUnavailable);
        }
        
        adapter.complete(&prompt, options).await
    }
    
    /// Generate a prompt for an issue
    pub async fn generate_issue_prompt(
        &self,
        issue_id: Uuid,
    ) -> Result<String, AIError> {
        let issue = self.db.issues().get(issue_id).await?;
        let codex_entry = if let Some(codex_id) = issue.codex_entry_id {
            Some(self.db.codex().get(codex_id).await?)
        } else {
            None
        };
        
        let mut prompt = format!(
            "## Bug Report: {}\n\n**Description:**\n{}\n\n",
            issue.title,
            issue.description.unwrap_or_default()
        );
        
        if let Some(entry) = codex_entry {
            prompt.push_str(&format!(
                "**Related Feature: {}**\n\n{}\n\n",
                entry.title,
                entry.how_it_works.unwrap_or_default()
            ));
            
            if let Some(files) = entry.key_files {
                prompt.push_str(&format!("**Key Files:** {}\n\n", files));
            }
        }
        
        prompt.push_str("Please investigate this issue and suggest a fix.");
        
        Ok(prompt)
    }
    
    /// Describe a screenshot using vision model
    pub async fn describe_screenshot(
        &self,
        screenshot_id: Uuid,
    ) -> Result<String, AIError> {
        // Find adapter with vision capability
        let adapter = self.adapters.values()
            .find(|a| a.capabilities().vision)
            .ok_or(AIError::NoVisionProvider)?;
        
        if !adapter.is_available().await {
            return Err(AIError::ProviderUnavailable);
        }
        
        let screenshot = self.db.screenshots().get(screenshot_id).await?;
        let image_data = tokio::fs::read(&screenshot.image_path).await?;
        
        adapter.describe_image(&image_data).await
    }
    
    fn get_adapter(
        &self,
        provider_id: Option<String>,
    ) -> Result<&Arc<dyn AIAdapter>, AIError> {
        let id = provider_id
            .or_else(|| self.default_provider.clone())
            .ok_or(AIError::NoDefaultProvider)?;
        
        self.adapters.get(&id).ok_or(AIError::ProviderNotFound(id))
    }
}
```

### Ollama Adapter (Local)

```rust
// src-tauri/src/adapters/ai/ollama.rs

use reqwest::Client;
use super::traits::*;

pub struct OllamaAdapter {
    client: Client,
    base_url: String,
    model: String,
}

impl OllamaAdapter {
    pub fn new(model: String) -> Self {
        Self {
            client: Client::new(),
            base_url: "http://localhost:11434".to_string(),
            model,
        }
    }
}

#[async_trait]
impl AIAdapter for OllamaAdapter {
    fn id(&self) -> &str { "ollama" }
    fn name(&self) -> &str { "Ollama (Local)" }
    
    async fn is_available(&self) -> bool {
        self.client
            .get(&format!("{}/api/tags", self.base_url))
            .send()
            .await
            .is_ok()
    }
    
    async fn complete(
        &self,
        prompt: &str,
        options: CompletionOptions,
    ) -> Result<CompletionResult, AIError> {
        let response = self.client
            .post(&format!("{}/api/generate", self.base_url))
            .json(&serde_json::json!({
                "model": self.model,
                "prompt": prompt,
                "stream": false,
                "options": {
                    "temperature": options.temperature.unwrap_or(0.7),
                    "num_predict": options.max_tokens.unwrap_or(2048),
                }
            }))
            .send()
            .await?;
        
        let data: OllamaResponse = response.json().await?;
        
        Ok(CompletionResult {
            text: data.response,
            tokens_used: data.eval_count.unwrap_or(0),
            model: self.model.clone(),
        })
    }
    
    fn capabilities(&self) -> AICapabilities {
        AICapabilities {
            streaming: true,
            vision: self.model.contains("llava") || self.model.contains("vision"),
            embeddings: true,
        }
    }
}
```

### OpenRouter Adapter (Cloud)

```rust
// src-tauri/src/adapters/ai/openrouter.rs

use reqwest::Client;
use super::traits::*;

pub struct OpenRouterAdapter {
    client: Client,
    api_key: String,
    model: String,
}

impl OpenRouterAdapter {
    pub fn new(api_key: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model,
        }
    }
}

#[async_trait]
impl AIAdapter for OpenRouterAdapter {
    fn id(&self) -> &str { "openrouter" }
    fn name(&self) -> &str { "OpenRouter" }
    
    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
    
    async fn complete(
        &self,
        prompt: &str,
        options: CompletionOptions,
    ) -> Result<CompletionResult, AIError> {
        let mut messages = vec![];
        
        if let Some(system) = options.system_prompt {
            messages.push(serde_json::json!({
                "role": "system",
                "content": system
            }));
        }
        
        messages.push(serde_json::json!({
            "role": "user",
            "content": prompt
        }));
        
        let response = self.client
            .post("https://openrouter.ai/api/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("HTTP-Referer", "https://taka.app")
            .header("X-Title", "Taka")
            .json(&serde_json::json!({
                "model": self.model,
                "messages": messages,
                "max_tokens": options.max_tokens.unwrap_or(2048),
                "temperature": options.temperature.unwrap_or(0.7),
            }))
            .send()
            .await?;
        
        let data: OpenRouterResponse = response.json().await?;
        let choice = data.choices.first().ok_or(AIError::EmptyResponse)?;
        
        Ok(CompletionResult {
            text: choice.message.content.clone(),
            tokens_used: data.usage.total_tokens,
            model: self.model.clone(),
        })
    }
    
    fn capabilities(&self) -> AICapabilities {
        AICapabilities {
            streaming: true,
            vision: self.model.contains("vision") || self.model.contains("gpt-4o"),
            embeddings: false,
        }
    }
}
```

### Anthropic Adapter

```rust
// src-tauri/src/adapters/ai/anthropic.rs

use reqwest::Client;
use super::traits::*;

pub struct AnthropicAdapter {
    client: Client,
    api_key: String,
    model: String,
}

impl AnthropicAdapter {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: model.unwrap_or_else(|| "claude-sonnet-4-20250514".to_string()),
        }
    }
}

#[async_trait]
impl AIAdapter for AnthropicAdapter {
    fn id(&self) -> &str { "anthropic" }
    fn name(&self) -> &str { "Anthropic Claude" }
    
    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }
    
    async fn complete(
        &self,
        prompt: &str,
        options: CompletionOptions,
    ) -> Result<CompletionResult, AIError> {
        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&serde_json::json!({
                "model": self.model,
                "max_tokens": options.max_tokens.unwrap_or(2048),
                "system": options.system_prompt,
                "messages": [{
                    "role": "user",
                    "content": prompt
                }]
            }))
            .send()
            .await?;
        
        let data: AnthropicResponse = response.json().await?;
        let text = data.content.first()
            .map(|c| c.text.clone())
            .unwrap_or_default();
        
        Ok(CompletionResult {
            text,
            tokens_used: data.usage.input_tokens + data.usage.output_tokens,
            model: self.model.clone(),
        })
    }
    
    fn capabilities(&self) -> AICapabilities {
        AICapabilities {
            streaming: true,
            vision: true, // Claude supports vision
            embeddings: false,
        }
    }
    
    async fn describe_image(&self, image: &[u8]) -> Result<String, AIError> {
        let base64_image = base64::encode(image);
        
        let response = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&serde_json::json!({
                "model": self.model,
                "max_tokens": 1024,
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": base64_image
                            }
                        },
                        {
                            "type": "text",
                            "text": "Describe what you see in this screenshot. Focus on any UI issues, bugs, or problems that are visible. Be specific about element locations and states."
                        }
                    ]
                }]
            }))
            .send()
            .await?;
        
        let data: AnthropicResponse = response.json().await?;
        
        data.content.first()
            .map(|c| c.text.clone())
            .ok_or(AIError::EmptyResponse)
    }
}
```

### API Key Storage (Encrypted)

```rust
// src-tauri/src/utils/crypto.rs

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::Rng;

const KEY_SIZE: usize = 32;
const NONCE_SIZE: usize = 12;

pub struct Crypto {
    key: [u8; KEY_SIZE],
}

impl Crypto {
    /// Create from machine-specific key derivation
    pub fn from_machine_key() -> Result<Self, CryptoError> {
        // Derive key from machine ID + app identifier
        let machine_id = machine_uid::get()?;
        let salt = b"taka-api-key-encryption";
        
        let mut key = [0u8; KEY_SIZE];
        pbkdf2::pbkdf2_hmac::<sha2::Sha256>(
            machine_id.as_bytes(),
            salt,
            100_000,
            &mut key,
        );
        
        Ok(Self { key })
    }
    
    pub fn encrypt(&self, plaintext: &str) -> Result<String, CryptoError> {
        let cipher = Aes256Gcm::new_from_slice(&self.key)?;
        
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        rand::thread_rng().fill(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())?;
        
        // Prepend nonce to ciphertext
        let mut result = nonce_bytes.to_vec();
        result.extend(ciphertext);
        
        Ok(base64::encode(result))
    }
    
    pub fn decrypt(&self, encrypted: &str) -> Result<String, CryptoError> {
        let data = base64::decode(encrypted)?;
        
        if data.len() < NONCE_SIZE {
            return Err(CryptoError::InvalidData);
        }
        
        let (nonce_bytes, ciphertext) = data.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let cipher = Aes256Gcm::new_from_slice(&self.key)?;
        let plaintext = cipher.decrypt(nonce, ciphertext)?;
        
        String::from_utf8(plaintext).map_err(|_| CryptoError::InvalidData)
    }
}
```

---

## Frontend State Management

### Zustand Store Pattern

```typescript
// lib/stores/issues.ts

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { issues as issuesApi } from '@/lib/tauri/commands';
import type { Issue, IssueFilter, NewIssue } from '@/lib/tauri/types';

interface IssuesState {
  items: Issue[];
  filter: IssueFilter;
  selectedId: string | null;
  loading: boolean;
  error: string | null;
}

interface IssuesActions {
  load: () => Promise<void>;
  setFilter: (filter: Partial<IssueFilter>) => void;
  select: (id: string | null) => void;
  create: (issue: NewIssue) => Promise<Issue>;
  update: (id: string, updates: Partial<Issue>) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export const useIssuesStore = create<IssuesState & IssuesActions>()(
  immer((set, get) => ({
    // State
    items: [],
    filter: { status: 'open' },
    selectedId: null,
    loading: false,
    error: null,
    
    // Actions
    load: async () => {
      set({ loading: true, error: null });
      
      try {
        const items = await issuesApi.list(get().filter);
        set({ items, loading: false });
      } catch (error) {
        set({ error: String(error), loading: false });
      }
    },
    
    setFilter: (filter) => {
      set((state) => {
        state.filter = { ...state.filter, ...filter };
      });
      get().load();
    },
    
    select: (id) => {
      set({ selectedId: id });
    },
    
    create: async (newIssue) => {
      const issue = await issuesApi.create(newIssue);
      
      set((state) => {
        state.items.unshift(issue);
      });
      
      return issue;
    },
    
    update: async (id, updates) => {
      // Optimistic update
      set((state) => {
        const index = state.items.findIndex((i) => i.id === id);
        if (index !== -1) {
          state.items[index] = { ...state.items[index], ...updates };
        }
      });
      
      try {
        await issuesApi.update(id, updates);
      } catch (error) {
        // Rollback on error
        get().load();
        throw error;
      }
    },
    
    delete: async (id) => {
      // Optimistic delete
      const items = get().items;
      set((state) => {
        state.items = state.items.filter((i) => i.id !== id);
      });
      
      try {
        await issuesApi.delete(id);
      } catch (error) {
        // Rollback
        set({ items });
        throw error;
      }
    },
  }))
);
```

### AI Store (Optional Features)

```typescript
// lib/stores/ai.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ai as aiApi } from '@/lib/tauri/commands';
import type { ProviderInfo, CompletionOptions } from '@/lib/tauri/types';

interface AIState {
  available: boolean;
  providers: ProviderInfo[];
  defaultProviderId: string | null;
  loading: boolean;
}

interface AIActions {
  checkAvailability: () => Promise<void>;
  loadProviders: () => Promise<void>;
  setDefaultProvider: (id: string) => void;
  complete: (prompt: string, options?: CompletionOptions) => Promise<string | null>;
  describeScreenshot: (screenshotId: string) => Promise<string | null>;
  generatePrompt: (issueId: string) => Promise<string | null>;
}

export const useAIStore = create<AIState & AIActions>()(
  persist(
    (set, get) => ({
      // State
      available: false,
      providers: [],
      defaultProviderId: null,
      loading: false,
      
      // Actions
      checkAvailability: async () => {
        try {
          const available = await aiApi.isAvailable();
          set({ available });
        } catch {
          set({ available: false });
        }
      },
      
      loadProviders: async () => {
        try {
          const providers = await aiApi.listProviders();
          set({ providers });
        } catch {
          set({ providers: [] });
        }
      },
      
      setDefaultProvider: (id) => {
        set({ defaultProviderId: id });
      },
      
      // Graceful methods — return null if AI unavailable
      complete: async (prompt, options) => {
        if (!get().available) return null;
        
        try {
          const result = await aiApi.complete(prompt, options);
          return result.text;
        } catch {
          return null;
        }
      },
      
      describeScreenshot: async (screenshotId) => {
        if (!get().available) return null;
        
        try {
          return await aiApi.describeScreenshot(screenshotId);
        } catch {
          return null;
        }
      },
      
      generatePrompt: async (issueId) => {
        if (!get().available) return null;
        
        try {
          return await aiApi.generatePrompt(issueId);
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'taka-ai',
      partialize: (state) => ({ defaultProviderId: state.defaultProviderId }),
    }
  )
);
```

---

## Testing Strategy

### Test Pyramid

```
         /\
        /  \        E2E Tests (Playwright)
       /    \       - Critical user flows
      /------\      - 10-20 tests
     /        \
    /  Integ   \    Integration Tests
   /   Tests    \   - Tauri commands
  /--------------\  - Store + API integration
 /                \ - 50-100 tests
/    Unit Tests    \
--------------------
- Components, hooks, utils
- Rust functions
- 200+ tests
```

### Unit Tests (Vitest)

```typescript
// tests/unit/stores/issues.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useIssuesStore } from '@/lib/stores/issues';
import { issues as issuesApi } from '@/lib/tauri/commands';

vi.mock('@/lib/tauri/commands');

describe('Issues Store', () => {
  beforeEach(() => {
    useIssuesStore.setState({
      items: [],
      filter: { status: 'open' },
      selectedId: null,
      loading: false,
      error: null,
    });
  });
  
  describe('load', () => {
    it('fetches issues with current filter', async () => {
      const mockIssues = [
        { id: '1', title: 'Bug 1', status: 'open' },
        { id: '2', title: 'Bug 2', status: 'open' },
      ];
      
      vi.mocked(issuesApi.list).mockResolvedValue(mockIssues);
      
      await useIssuesStore.getState().load();
      
      expect(issuesApi.list).toHaveBeenCalledWith({ status: 'open' });
      expect(useIssuesStore.getState().items).toEqual(mockIssues);
      expect(useIssuesStore.getState().loading).toBe(false);
    });
    
    it('handles errors gracefully', async () => {
      vi.mocked(issuesApi.list).mockRejectedValue(new Error('Network error'));
      
      await useIssuesStore.getState().load();
      
      expect(useIssuesStore.getState().error).toBe('Error: Network error');
      expect(useIssuesStore.getState().loading).toBe(false);
    });
  });
  
  describe('create', () => {
    it('adds new issue to store', async () => {
      const newIssue = { title: 'New Bug', description: 'Broken' };
      const createdIssue = { id: '3', ...newIssue, status: 'open' };
      
      vi.mocked(issuesApi.create).mockResolvedValue(createdIssue);
      
      const result = await useIssuesStore.getState().create(newIssue);
      
      expect(result).toEqual(createdIssue);
      expect(useIssuesStore.getState().items[0]).toEqual(createdIssue);
    });
  });
  
  describe('update (optimistic)', () => {
    it('updates immediately then syncs', async () => {
      useIssuesStore.setState({
        items: [{ id: '1', title: 'Bug', status: 'open' }],
      });
      
      vi.mocked(issuesApi.update).mockResolvedValue(undefined);
      
      const updatePromise = useIssuesStore.getState().update('1', { status: 'fixed' });
      
      // Optimistic update happens immediately
      expect(useIssuesStore.getState().items[0].status).toBe('fixed');
      
      await updatePromise;
      
      expect(issuesApi.update).toHaveBeenCalledWith('1', { status: 'fixed' });
    });
    
    it('rolls back on error', async () => {
      useIssuesStore.setState({
        items: [{ id: '1', title: 'Bug', status: 'open' }],
      });
      
      vi.mocked(issuesApi.update).mockRejectedValue(new Error('Failed'));
      vi.mocked(issuesApi.list).mockResolvedValue([
        { id: '1', title: 'Bug', status: 'open' },
      ]);
      
      await expect(
        useIssuesStore.getState().update('1', { status: 'fixed' })
      ).rejects.toThrow();
      
      // Rollback via reload
      expect(issuesApi.list).toHaveBeenCalled();
    });
  });
});
```

### Component Tests

```typescript
// tests/unit/components/issue-row.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IssueRow } from '@/components/features/issues/issue-row';

describe('IssueRow', () => {
  const mockIssue = {
    id: '1',
    number: 47,
    title: 'Payment button unresponsive',
    status: 'open',
    priority: 'critical',
    version: 'v0.4',
    tags: ['payments'],
    createdAt: '2025-01-26T10:00:00Z',
  };
  
  it('renders issue details', () => {
    render(<IssueRow issue={mockIssue} />);
    
    expect(screen.getByText('#47')).toBeInTheDocument();
    expect(screen.getByText('Payment button unresponsive')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('v0.4')).toBeInTheDocument();
  });
  
  it('shows critical styling for critical issues', () => {
    render(<IssueRow issue={mockIssue} />);
    
    const indicator = screen.getByTestId('priority-indicator');
    expect(indicator).toHaveClass('bg-status-error');
  });
  
  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<IssueRow issue={mockIssue} onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalledWith(mockIssue);
  });
  
  it('shows tag pills', () => {
    render(<IssueRow issue={mockIssue} />);
    
    expect(screen.getByText('payments')).toBeInTheDocument();
  });
});
```

### Integration Tests (Tauri Commands)

```typescript
// tests/integration/tauri/sessions.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { sessions, recording } from '@/lib/tauri/commands';

// These tests run against actual Tauri backend
describe('Sessions Integration', () => {
  let testSessionId: string;
  
  beforeEach(async () => {
    // Create a test session
    const session = await sessions.create('Test Session', 'v0.0-test');
    testSessionId = session.id;
  });
  
  afterEach(async () => {
    // Cleanup
    try {
      await sessions.delete(testSessionId);
    } catch {
      // Ignore if already deleted
    }
  });
  
  it('creates and retrieves a session', async () => {
    const session = await sessions.get(testSessionId);
    
    expect(session.name).toBe('Test Session');
    expect(session.version).toBe('v0.0-test');
    expect(session.status).toBe('ready');
  });
  
  it('lists sessions with filters', async () => {
    const allSessions = await sessions.list({});
    const filteredSessions = await sessions.list({ version: 'v0.0-test' });
    
    expect(allSessions.length).toBeGreaterThanOrEqual(1);
    expect(filteredSessions.every((s) => s.version === 'v0.0-test')).toBe(true);
  });
  
  it('updates session status', async () => {
    await sessions.update(testSessionId, { name: 'Updated Name' });
    
    const session = await sessions.get(testSessionId);
    expect(session.name).toBe('Updated Name');
  });
});

describe('Capture Sources Integration', () => {
  it('lists available capture sources', async () => {
    const sources = await recording.getSources();
    
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThan(0);
    
    // Should have at least one display
    const displays = sources.filter((s) => 'displayId' in s);
    expect(displays.length).toBeGreaterThan(0);
  });
});
```

### Rust Unit Tests

```rust
// src-tauri/src/services/recording.rs

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::capture::MockCaptureAdapter;
    use crate::adapters::encoding::MockEncodingAdapter;
    use tokio::sync::mpsc;
    
    #[tokio::test]
    async fn test_start_recording() {
        let mut capture_mock = MockCaptureAdapter::new();
        let mut encoding_mock = MockEncodingAdapter::new();
        let db = setup_test_db().await;
        
        // Setup mocks
        capture_mock.expect_start_capture()
            .returning(|_, _| {
                let (tx, rx) = mpsc::channel(10);
                Ok(rx)
            });
        
        encoding_mock.expect_encode_stream()
            .returning(|_, _, _| {
                Ok(EncodingHandle::mock())
            });
        
        let service = RecordingService::new(
            Arc::new(capture_mock),
            Arc::new(encoding_mock),
            db,
        );
        
        // Create test session
        let session = db.sessions().create(NewSession {
            name: "Test".into(),
            version: None,
        }).await.unwrap();
        
        // Start recording
        let result = service.start_recording(
            CaptureSource::FullScreen { display_id: 0 },
            session.id,
        ).await;
        
        assert!(result.is_ok());
    }
    
    #[tokio::test]
    async fn test_recording_updates_session_status() {
        // ... similar setup ...
        
        let handle = service.start_recording(source, session.id).await.unwrap();
        
        let updated_session = db.sessions().get(session.id).await.unwrap();
        assert_eq!(updated_session.status, SessionStatus::Recording);
        
        service.stop_recording(handle).await.unwrap();
        
        let final_session = db.sessions().get(session.id).await.unwrap();
        assert_eq!(final_session.status, SessionStatus::Complete);
        assert!(final_session.recording_path.is_some());
    }
}
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/recording.spec.ts

import { test, expect } from '@playwright/test';
import { TakaApp } from './fixtures/taka-app';

test.describe('Recording Flow', () => {
  let app: TakaApp;
  
  test.beforeEach(async ({ page }) => {
    app = new TakaApp(page);
    await app.launch();
  });
  
  test('user can create session and record', async () => {
    // Navigate to sessions
    await app.sidebar.click('Sessions');
    await expect(app.page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
    
    // Start new recording
    await app.page.getByRole('button', { name: 'Start Recording' }).click();
    
    // Session name modal appears
    await expect(app.page.getByRole('dialog')).toBeVisible();
    await app.page.getByLabel('Session name').fill('E2E Test Session');
    await app.page.getByLabel('Version').selectOption('v0.4');
    
    // Select capture source
    await app.page.getByRole('button', { name: 'Select source' }).click();
    await app.page.getByRole('option').first().click();
    
    // Start recording
    await app.page.getByRole('button', { name: 'Start' }).click();
    
    // Recording indicator appears
    await expect(app.page.getByTestId('recording-indicator')).toBeVisible();
    await expect(app.page.getByText('Recording')).toBeVisible();
    
    // Wait a bit
    await app.page.waitForTimeout(2000);
    
    // Stop recording
    await app.page.getByRole('button', { name: 'Stop' }).click();
    
    // Session appears in list
    await expect(app.page.getByText('E2E Test Session')).toBeVisible();
    
    // Open session
    await app.page.getByText('E2E Test Session').click();
    
    // Video player loads
    await expect(app.page.getByTestId('video-player')).toBeVisible();
  });
  
  test('user can annotate recording', async () => {
    // Assume session exists from previous test or fixture
    await app.sidebar.click('Sessions');
    await app.page.getByText('E2E Test Session').click();
    
    // Play video
    await app.page.getByRole('button', { name: 'Play' }).click();
    await app.page.waitForTimeout(1000);
    await app.page.getByRole('button', { name: 'Pause' }).click();
    
    // Add annotation
    await app.page.getByRole('button', { name: 'Add Annotation' }).click();
    
    // Fill annotation form
    await app.page.getByLabel('Title').fill('Test annotation');
    await app.page.getByLabel('Description').fill('Something broken here');
    await app.page.getByRole('button', { name: 'Create Issue' }).check();
    await app.page.getByRole('button', { name: 'Save' }).click();
    
    // Annotation appears
    await expect(app.page.getByText('Test annotation')).toBeVisible();
    
    // Issue created
    await app.sidebar.click('Issues');
    await expect(app.page.getByText('Test annotation')).toBeVisible();
  });
});

// tests/e2e/fixtures/taka-app.ts

import { Page, Locator } from '@playwright/test';

export class TakaApp {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly commandPalette: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.getByTestId('sidebar');
    this.commandPalette = page.getByTestId('command-palette');
  }
  
  async launch() {
    // Tauri apps need special handling
    await this.page.goto('tauri://localhost');
    await this.page.waitForLoadState('domcontentloaded');
  }
  
  async openCommandPalette() {
    await this.page.keyboard.press('Meta+k');
    await this.commandPalette.waitFor({ state: 'visible' });
  }
  
  async runCommand(command: string) {
    await this.openCommandPalette();
    await this.commandPalette.getByRole('textbox').fill(command);
    await this.page.keyboard.press('Enter');
  }
}
```

### Test Configuration

```typescript
// vitest.config.ts

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/types.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Tauri tests can conflict
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html'], ['list']],
  
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        // Tauri-specific configuration
        launchOptions: {
          executablePath: process.env.TAURI_BINARY_PATH,
        },
      },
    },
  ],
  
  // Build app before tests
  webServer: {
    command: 'pnpm tauri build --debug',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## Build & Distribution

### Tauri Configuration

```json
// src-tauri/tauri.conf.json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Taka",
  "version": "0.1.0",
  "identifier": "app.taka.desktop",
  "build": {
    "beforeBuildCommand": "pnpm build",
    "beforeDevCommand": "pnpm dev",
    "frontendDist": "../out",
    "devUrl": "http://localhost:3000"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Taka",
        "width": 1200,
        "height": 800,
        "minWidth": 900,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: data:; media-src 'self' asset:; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "macOS": {
      "entitlements": "./entitlements.plist",
      "exceptionDomain": "",
      "frameworks": [],
      "minimumSystemVersion": "10.15"
    },
    "windows": {
      "certificateThumbprint": null,
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    },
    "linux": {
      "appimage": {
        "bundleMediaFramework": true
      }
    },
    "resources": [
      "resources/*"
    ],
    "externalBin": [
      "binaries/ffmpeg"
    ]
  }
}
```

### Capabilities (Permissions)

```json
// src-tauri/capabilities/default.json
{
  "$schema": "https://schema.tauri.app/config/2/capability",
  "identifier": "default",
  "description": "Default capabilities for Taka",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-maximize",
    "fs:allow-read",
    "fs:allow-write",
    "fs:allow-app-data-dir",
    "dialog:allow-open",
    "dialog:allow-save",
    "shell:allow-open",
    "clipboard:allow-write",
    "clipboard:allow-read",
    "global-shortcut:allow-register",
    "notification:allow-show"
  ]
}
```

---

## Security Considerations

### API Key Protection

1. **Encryption at rest** — All API keys encrypted with machine-derived key
2. **Memory protection** — Keys loaded only when needed, zeroed after use
3. **No logging** — API keys never appear in logs or error messages
4. **No network storage** — Keys never leave the local machine

### Data Protection

1. **Local-first** — All data stored locally in SQLite
2. **No telemetry** — No usage data sent anywhere
3. **Sandboxed filesystem** — App only accesses its own data directory
4. **Capability-based permissions** — Minimal required OS permissions

### Code Signing

1. **macOS** — Signed and notarized for Gatekeeper
2. **Windows** — Signed with EV code signing certificate
3. **Linux** — AppImage with signature verification

---

## Summary

Taka is a local-first desktop application built with Tauri 2 and Next.js 15. The architecture follows an adapter pattern throughout—capture sources, video encoding, and AI providers are all pluggable. All data lives in SQLite with media files on the local filesystem. The AI layer is entirely optional: every feature works without it, but AI enhances screenshot descriptions, prompt generation, and issue analysis when enabled. API keys are encrypted with machine-derived keys and never leave the device. The test suite covers unit tests (Vitest), integration tests (Tauri commands), and E2E tests (Playwright) with 80%+ coverage targets. The app ships as signed binaries for macOS, Windows, and Linux.
