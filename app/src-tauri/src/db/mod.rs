use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;

use crate::error::RigidError;

pub type DbPool = SqlitePool;

const SCHEMA: &str = include_str!("schema.sql");
const CURRENT_VERSION: i32 = 13;

/// Initialize the database connection and run migrations
pub async fn init_database(app_data_dir: PathBuf) -> Result<DbPool, RigidError> {
    let db_path = app_data_dir.join("rigid.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    // Create connection pool (single connection for SQLite)
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&db_url)
        .await?;

    // Enable WAL mode for better concurrent read performance
    sqlx::query("PRAGMA journal_mode=WAL;")
        .execute(&pool)
        .await?;

    // Enable foreign keys
    sqlx::query("PRAGMA foreign_keys=ON;")
        .execute(&pool)
        .await?;

    // Run migrations
    run_migrations(&pool).await?;

    Ok(pool)
}

/// Run database migrations
async fn run_migrations(pool: &DbPool) -> Result<(), RigidError> {
    // First, ensure _migrations table exists (must happen before querying it)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            applied_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Now safely check current version
    let current_version: i32 = sqlx::query_scalar(
        "SELECT COALESCE(MAX(version), 0) FROM _migrations"
    )
    .fetch_one(pool)
    .await?;

    // Apply migrations based on current version
    if current_version < CURRENT_VERSION {
        // If upgrading from v1, drop old tables first
        if current_version == 1 {
            let old_tables = [
                "annotations", "taggables", "screenshots", "checklist_items",
                "issues", "sessions", "codex_entries", "versions", "ai_providers"
            ];
            for table in old_tables {
                let _ = sqlx::query(&format!("DROP TABLE IF EXISTS {}", table))
                    .execute(pool)
                    .await;
            }
        }

        // If upgrading from v2, we need to:
        // 1. Add new tables for drawings, markers, document blocks, todos
        // 2. Remove annotations_data column from screenshots (SQLite doesn't support DROP COLUMN easily, so we recreate)
        // 3. Remove description column from tests
        if current_version == 2 {
            // Run v2 to v3 migration
            run_v2_to_v3_migration(pool).await?;
            // Then run v3 to v4 migration
            run_v3_to_v4_migration(pool).await?;
            // Then run v4 to v5 migration
            run_v4_to_v5_migration(pool).await?;
        } else if current_version == 3 {
            // Run v3 to v4 migration, then v4 to v5
            run_v3_to_v4_migration(pool).await?;
            run_v4_to_v5_migration(pool).await?;
        } else if current_version == 4 {
            // Run v4 to v5 migration, then v5 to v6, then v6 to v7
            run_v4_to_v5_migration(pool).await?;
            run_v5_to_v6_migration(pool).await?;
            run_v6_to_v7_migration(pool).await?;
        } else if current_version == 5 {
            // Run v5 to v6 migration, then v6 to v7
            run_v5_to_v6_migration(pool).await?;
            run_v6_to_v7_migration(pool).await?;
        } else if current_version == 6 {
            // Run v6 to v7, v7 to v8, v8 to v9, then v9 to v10
            run_v6_to_v7_migration(pool).await?;
            run_v7_to_v8_migration(pool).await?;
            run_v8_to_v9_migration(pool).await?;
            run_v9_to_v10_migration(pool).await?;
        } else if current_version == 7 {
            // Run v7 to v8, v8 to v9, then v9 to v10
            run_v7_to_v8_migration(pool).await?;
            run_v8_to_v9_migration(pool).await?;
            run_v9_to_v10_migration(pool).await?;
        } else if current_version == 8 {
            // Run v8 to v9, then v9 to v10
            run_v8_to_v9_migration(pool).await?;
            run_v9_to_v10_migration(pool).await?;
        } else if current_version == 9 {
            // Run v9 to v10, then v10 to v11, then v11 to v12
            run_v9_to_v10_migration(pool).await?;
            run_v10_to_v11_migration(pool).await?;
            run_v11_to_v12_migration(pool).await?;
        } else if current_version == 10 {
            // Run v10 to v11, then v11 to v12
            run_v10_to_v11_migration(pool).await?;
            run_v11_to_v12_migration(pool).await?;
        } else if current_version == 11 {
            // Run v11 to v12, then v12 to v13
            run_v11_to_v12_migration(pool).await?;
            run_v12_to_v13_migration(pool).await?;
        } else if current_version == 12 {
            // Run v12 to v13 migration only (add demo_videos table)
            run_v12_to_v13_migration(pool).await?;
        } else {
            // Fresh install or from v1 - apply full schema
            for statement in SCHEMA.split(';') {
                // Strip comment lines from the statement
                let sql: String = statement
                    .lines()
                    .filter(|line| {
                        let trimmed_line = line.trim();
                        !trimmed_line.is_empty() && !trimmed_line.starts_with("--")
                    })
                    .collect::<Vec<_>>()
                    .join("\n");

                let sql = sql.trim();

                // Skip empty statements and the _migrations table we already created
                if sql.is_empty() || sql.contains("CREATE TABLE IF NOT EXISTS _migrations") {
                    continue;
                }

                if let Err(e) = sqlx::query(sql).execute(pool).await {
                    eprintln!("Migration failed on statement:\n{}\nError: {}", sql, e);
                    return Err(e.into());
                }
            }
        }

        // Record migration
        sqlx::query(
            "INSERT OR REPLACE INTO _migrations (version, applied_at) VALUES (?, datetime('now'))"
        )
        .bind(CURRENT_VERSION)
        .execute(pool)
        .await?;
    }

    Ok(())
}

/// Migration from v2 to v3: Add new tables for granular storage
async fn run_v2_to_v3_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Create new tables (these are additive, won't conflict with existing data)

    // Screenshot drawings table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS screenshot_drawings (
            id TEXT PRIMARY KEY,
            screenshot_id TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
            tool_type TEXT NOT NULL,
            color TEXT NOT NULL,
            stroke_width INTEGER NOT NULL DEFAULT 3,
            points TEXT,
            start_x REAL,
            start_y REAL,
            end_x REAL,
            end_y REAL,
            text_content TEXT,
            font_size INTEGER,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Screenshot markers table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS screenshot_markers (
            id TEXT PRIMARY KEY,
            screenshot_id TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            description TEXT,
            severity TEXT NOT NULL DEFAULT 'info',
            position_x REAL NOT NULL,
            position_y REAL NOT NULL,
            issue_id TEXT REFERENCES issues(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Document blocks table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS document_blocks (
            id TEXT PRIMARY KEY,
            test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
            block_type TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            checked INTEGER,
            language TEXT,
            callout_type TEXT,
            image_path TEXT,
            collapsed INTEGER,
            indent_level INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Exploration todos table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS exploration_todos (
            id TEXT PRIMARY KEY,
            test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
            content TEXT NOT NULL DEFAULT '',
            checked INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Create indexes for the new tables
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_screenshot_drawings_screenshot ON screenshot_drawings(screenshot_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_screenshot_markers_screenshot ON screenshot_markers(screenshot_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_document_blocks_test ON document_blocks(test_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_exploration_todos_test ON exploration_todos(test_id)")
        .execute(pool)
        .await?;

    Ok(())
}

/// Migration from v3 to v4: Add image_caption column to document_blocks
async fn run_v3_to_v4_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Add image_caption column to document_blocks table
    // SQLite allows adding columns with ALTER TABLE
    sqlx::query("ALTER TABLE document_blocks ADD COLUMN image_caption TEXT")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists

    Ok(())
}

/// Migration from v4 to v5: Add diagrams, nodes, edges, attachments, and architecture docs tables
async fn run_v4_to_v5_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Diagrams table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS diagrams (
            id TEXT PRIMARY KEY,
            test_id TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            diagram_type TEXT NOT NULL,
            viewport_x REAL NOT NULL DEFAULT 0,
            viewport_y REAL NOT NULL DEFAULT 0,
            viewport_zoom REAL NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Diagram nodes table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS diagram_nodes (
            id TEXT PRIMARY KEY,
            diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
            node_type TEXT NOT NULL,
            label TEXT NOT NULL DEFAULT '',
            notes TEXT,
            position_x REAL NOT NULL DEFAULT 0,
            position_y REAL NOT NULL DEFAULT 0,
            width REAL,
            height REAL,
            style_data TEXT,
            parent_id TEXT REFERENCES diagram_nodes(id) ON DELETE SET NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Diagram edges table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS diagram_edges (
            id TEXT PRIMARY KEY,
            diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
            source_node_id TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
            target_node_id TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
            edge_type TEXT NOT NULL DEFAULT 'default',
            label TEXT,
            style_data TEXT,
            created_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Node attachments table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS node_attachments (
            id TEXT PRIMARY KEY,
            node_id TEXT NOT NULL REFERENCES diagram_nodes(id) ON DELETE CASCADE,
            attachment_type TEXT NOT NULL,
            screenshot_id TEXT REFERENCES screenshots(id) ON DELETE CASCADE,
            recording_id TEXT REFERENCES recordings(id) ON DELETE CASCADE,
            timestamp_ms INTEGER,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Architecture docs table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS architecture_docs (
            id TEXT PRIMARY KEY,
            app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            icon TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Architecture doc blocks table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS architecture_doc_blocks (
            id TEXT PRIMARY KEY,
            doc_id TEXT NOT NULL REFERENCES architecture_docs(id) ON DELETE CASCADE,
            block_type TEXT NOT NULL,
            content TEXT NOT NULL DEFAULT '',
            checked INTEGER,
            language TEXT,
            callout_type TEXT,
            image_path TEXT,
            image_caption TEXT,
            collapsed INTEGER,
            mermaid_code TEXT,
            indent_level INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagrams_test ON diagrams(test_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagrams_type ON diagrams(diagram_type)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagram_nodes_diagram ON diagram_nodes(diagram_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagram_nodes_parent ON diagram_nodes(parent_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagram_edges_diagram ON diagram_edges(diagram_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagram_edges_source ON diagram_edges(source_node_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagram_edges_target ON diagram_edges(target_node_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_node_attachments_node ON node_attachments(node_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_architecture_docs_app ON architecture_docs(app_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_architecture_doc_blocks_doc ON architecture_doc_blocks(doc_id)")
        .execute(pool)
        .await?;

    Ok(())
}

/// Migration from v5 to v6: Add architecture_doc_id to diagrams
async fn run_v5_to_v6_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Add architecture_doc_id column to diagrams table
    sqlx::query("ALTER TABLE diagrams ADD COLUMN architecture_doc_id TEXT REFERENCES architecture_docs(id) ON DELETE CASCADE")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists

    // Create index for the new column
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagrams_arch_doc ON diagrams(architecture_doc_id)")
        .execute(pool)
        .await?;

    Ok(())
}

/// Migration from v6 to v7: Make test_id nullable in diagrams table
/// SQLite doesn't support ALTER COLUMN, so we need to recreate the table
async fn run_v6_to_v7_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Check if test_id is still NOT NULL (needs migration)
    let test_id_info: Option<(i32,)> = sqlx::query_as(
        "SELECT \"notnull\" FROM pragma_table_info('diagrams') WHERE name = 'test_id'"
    )
    .fetch_optional(pool)
    .await?;

    // If test_id notnull = 0 (nullable), we don't need to do anything
    let needs_table_recreation = test_id_info.map(|(notnull,)| notnull == 1).unwrap_or(false);

    if !needs_table_recreation {
        return Ok(());
    }

    // Create new table with nullable test_id
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS diagrams_new (
            id TEXT PRIMARY KEY,
            test_id TEXT REFERENCES tests(id) ON DELETE CASCADE,
            architecture_doc_id TEXT REFERENCES architecture_docs(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            diagram_type TEXT NOT NULL,
            viewport_x REAL NOT NULL DEFAULT 0,
            viewport_y REAL NOT NULL DEFAULT 0,
            viewport_zoom REAL NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Copy existing data (architecture_doc_id should exist from v6 migration)
    sqlx::query(
        "INSERT INTO diagrams_new (id, test_id, architecture_doc_id, name, diagram_type, viewport_x, viewport_y, viewport_zoom, created_at, updated_at)
         SELECT id, test_id, architecture_doc_id, name, diagram_type, viewport_x, viewport_y, viewport_zoom, created_at, updated_at FROM diagrams"
    )
    .execute(pool)
    .await?;

    // Drop old table
    sqlx::query("DROP TABLE diagrams")
        .execute(pool)
        .await?;

    // Rename new table
    sqlx::query("ALTER TABLE diagrams_new RENAME TO diagrams")
        .execute(pool)
        .await?;

    // Recreate indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagrams_test ON diagrams(test_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_diagrams_arch_doc ON diagrams(architecture_doc_id)")
        .execute(pool)
        .await?;

    Ok(())
}

/// Migration from v7 to v8: Add demo video editor tables
async fn run_v7_to_v8_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Demos table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demos (
            id TEXT PRIMARY KEY,
            app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            format TEXT NOT NULL DEFAULT 'youtube',
            width INTEGER NOT NULL DEFAULT 1920,
            height INTEGER NOT NULL DEFAULT 1080,
            frame_rate INTEGER NOT NULL DEFAULT 60,
            duration_ms INTEGER NOT NULL DEFAULT 60000,
            thumbnail_path TEXT,
            export_path TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Demo backgrounds table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_backgrounds (
            id TEXT PRIMARY KEY,
            demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
            background_type TEXT NOT NULL DEFAULT 'solid',
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
        )"
    )
    .execute(pool)
    .await?;

    // Demo tracks table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_tracks (
            id TEXT PRIMARY KEY,
            demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
            track_type TEXT NOT NULL,
            name TEXT NOT NULL,
            locked INTEGER NOT NULL DEFAULT 0,
            visible INTEGER NOT NULL DEFAULT 1,
            muted INTEGER NOT NULL DEFAULT 0,
            volume REAL NOT NULL DEFAULT 1.0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            target_track_id TEXT REFERENCES demo_tracks(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Demo clips table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_clips (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL REFERENCES demo_tracks(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            source_path TEXT NOT NULL,
            source_type TEXT NOT NULL,
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
            volume REAL NOT NULL DEFAULT 1.0,
            muted INTEGER NOT NULL DEFAULT 0,
            linked_clip_id TEXT REFERENCES demo_clips(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Demo zoom clips table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_zoom_clips (
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
        )"
    )
    .execute(pool)
    .await?;

    // Demo blur clips table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_blur_clips (
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
        )"
    )
    .execute(pool)
    .await?;

    // Demo assets table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_assets (
            id TEXT PRIMARY KEY,
            demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            asset_type TEXT NOT NULL,
            duration_ms INTEGER,
            width INTEGER,
            height INTEGER,
            thumbnail_path TEXT,
            file_size INTEGER,
            has_audio INTEGER,
            created_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demos_app ON demos(app_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demos_created ON demos(created_at DESC)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_backgrounds_demo ON demo_backgrounds(demo_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_tracks_demo ON demo_tracks(demo_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_tracks_sort ON demo_tracks(sort_order)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_clips_track ON demo_clips(track_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_clips_start ON demo_clips(start_time_ms)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_zoom_clips_track ON demo_zoom_clips(track_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_blur_clips_track ON demo_blur_clips(track_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_assets_demo ON demo_assets(demo_id)")
        .execute(pool)
        .await?;

    Ok(())
}

/// Migration from v8 to v9: Add app_id to screenshots and recordings tables
/// This allows screenshots/recordings to exist independently of explorations (tests)
async fn run_v8_to_v9_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Add app_id column to screenshots table
    sqlx::query("ALTER TABLE screenshots ADD COLUMN app_id TEXT REFERENCES apps(id) ON DELETE CASCADE")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists

    // Add app_id column to recordings table
    sqlx::query("ALTER TABLE recordings ADD COLUMN app_id TEXT REFERENCES apps(id) ON DELETE CASCADE")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists

    // Create indexes for app_id
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_screenshots_app ON screenshots(app_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_recordings_app ON recordings(app_id)")
        .execute(pool)
        .await?;

    // Backfill app_id from test_id -> tests.app_id for existing records
    sqlx::query(
        "UPDATE screenshots SET app_id = (
            SELECT t.app_id FROM tests t WHERE t.id = screenshots.test_id
        ) WHERE test_id IS NOT NULL AND app_id IS NULL"
    )
    .execute(pool)
    .await?;

    sqlx::query(
        "UPDATE recordings SET app_id = (
            SELECT t.app_id FROM tests t WHERE t.id = recordings.test_id
        ) WHERE test_id IS NOT NULL AND app_id IS NULL"
    )
    .execute(pool)
    .await?;

    Ok(())
}

/// Migration from v9 to v10: Add webcam_path to recordings table
/// This allows storing webcam recordings alongside screen recordings
async fn run_v9_to_v10_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Add webcam_path column to recordings table
    sqlx::query("ALTER TABLE recordings ADD COLUMN webcam_path TEXT")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists

    Ok(())
}

/// Migration from v10 to v11: Add demo_recordings and demo_screenshots link tables
/// This allows associating recordings and screenshots with specific demos
async fn run_v10_to_v11_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Demo recordings link table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_recordings (
            id TEXT PRIMARY KEY,
            demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
            recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            UNIQUE(demo_id, recording_id)
        )"
    )
    .execute(pool)
    .await?;

    // Demo screenshots link table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_screenshots (
            id TEXT PRIMARY KEY,
            demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
            screenshot_id TEXT NOT NULL REFERENCES screenshots(id) ON DELETE CASCADE,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            UNIQUE(demo_id, screenshot_id)
        )"
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_recordings_demo ON demo_recordings(demo_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_recordings_recording ON demo_recordings(recording_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_screenshots_demo ON demo_screenshots(demo_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_screenshots_screenshot ON demo_screenshots(screenshot_id)")
        .execute(pool)
        .await?;

    Ok(())
}

/// Migration from v11 to v12: Add demo_pan_clips table
async fn run_v11_to_v12_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Demo pan clips table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_pan_clips (
            id TEXT PRIMARY KEY,
            track_id TEXT NOT NULL REFERENCES demo_tracks(id) ON DELETE CASCADE,
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
        )"
    )
    .execute(pool)
    .await?;

    // Create index
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_pan_clips_track ON demo_pan_clips(track_id)")
        .execute(pool)
        .await?;

    Ok(())
}

/// Migration from v12 to v13: Add demo_videos table
/// This allows storing exported video outputs for a demo
async fn run_v12_to_v13_migration(pool: &DbPool) -> Result<(), RigidError> {
    // Demo videos table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS demo_videos (
            id TEXT PRIMARY KEY,
            demo_id TEXT NOT NULL REFERENCES demos(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            thumbnail_path TEXT,
            duration_ms INTEGER NOT NULL,
            width INTEGER NOT NULL,
            height INTEGER NOT NULL,
            file_size INTEGER,
            format TEXT NOT NULL DEFAULT 'mp4',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_videos_demo ON demo_videos(demo_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_demo_videos_created ON demo_videos(created_at DESC)")
        .execute(pool)
        .await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_init_database() {
        let temp_dir = TempDir::new().unwrap();
        let pool = init_database(temp_dir.path().to_path_buf()).await.unwrap();

        // Verify new tables exist
        let tables: Vec<(String,)> = sqlx::query_as(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        let table_names: Vec<&str> = tables.iter().map(|(n,)| n.as_str()).collect();

        assert!(table_names.contains(&"apps"));
        assert!(table_names.contains(&"tests"));
        assert!(table_names.contains(&"recordings"));
        assert!(table_names.contains(&"screenshots"));
        assert!(table_names.contains(&"issues"));
        assert!(table_names.contains(&"checklist_items"));
        assert!(table_names.contains(&"annotations"));
        assert!(table_names.contains(&"tags"));
        assert!(table_names.contains(&"settings"));
    }

    #[tokio::test]
    async fn test_migrations_idempotent() {
        let temp_dir = TempDir::new().unwrap();

        // Initialize twice
        let pool1 = init_database(temp_dir.path().to_path_buf()).await.unwrap();
        drop(pool1);

        let pool2 = init_database(temp_dir.path().to_path_buf()).await.unwrap();

        // Should still work
        let version: (i32,) = sqlx::query_as("SELECT MAX(version) FROM _migrations")
            .fetch_one(&pool2)
            .await
            .unwrap();

        assert_eq!(version.0, CURRENT_VERSION);
    }
}
