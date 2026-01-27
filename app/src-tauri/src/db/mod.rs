use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::path::PathBuf;

use crate::error::TakaError;

pub type DbPool = SqlitePool;

const SCHEMA: &str = include_str!("schema.sql");
const CURRENT_VERSION: i32 = 7;

/// Initialize the database connection and run migrations
pub async fn init_database(app_data_dir: PathBuf) -> Result<DbPool, TakaError> {
    let db_path = app_data_dir.join("taka.db");
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
async fn run_migrations(pool: &DbPool) -> Result<(), TakaError> {
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
            // Run v6 to v7 migration only (fix test_id nullable)
            run_v6_to_v7_migration(pool).await?;
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
async fn run_v2_to_v3_migration(pool: &DbPool) -> Result<(), TakaError> {
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
async fn run_v3_to_v4_migration(pool: &DbPool) -> Result<(), TakaError> {
    // Add image_caption column to document_blocks table
    // SQLite allows adding columns with ALTER TABLE
    sqlx::query("ALTER TABLE document_blocks ADD COLUMN image_caption TEXT")
        .execute(pool)
        .await
        .ok(); // Ignore error if column already exists

    Ok(())
}

/// Migration from v4 to v5: Add diagrams, nodes, edges, attachments, and architecture docs tables
async fn run_v4_to_v5_migration(pool: &DbPool) -> Result<(), TakaError> {
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
async fn run_v5_to_v6_migration(pool: &DbPool) -> Result<(), TakaError> {
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
async fn run_v6_to_v7_migration(pool: &DbPool) -> Result<(), TakaError> {
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
