use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{Recording, NewRecording, UpdateRecording, RecordingFilter, Annotation, NewAnnotation, UpdateAnnotation};

#[derive(Clone)]
pub struct RecordingRepository {
    pool: DbPool,
}

impl RecordingRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new: NewRecording) -> Result<Recording, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO recordings (id, test_id, name, status, created_at, updated_at)
             VALUES (?, ?, ?, 'ready', ?, ?)"
        )
        .bind(&id)
        .bind(&new.test_id)
        .bind(&new.name)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Recording, TakaError> {
        sqlx::query_as::<_, Recording>("SELECT * FROM recordings WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Recording".into(),
                id: id.into(),
            })
    }

    pub async fn list(&self, filter: RecordingFilter) -> Result<Vec<Recording>, TakaError> {
        let mut sql = String::from("SELECT * FROM recordings WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref test_id) = filter.test_id {
            sql.push_str(" AND test_id = ?");
            bindings.push(test_id.clone());
        }

        if let Some(ref status) = filter.status {
            sql.push_str(" AND status = ?");
            bindings.push(status.clone());
        }

        sql.push_str(" ORDER BY created_at DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        let mut query = sqlx::query_as::<_, Recording>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn list_by_test(&self, test_id: &str) -> Result<Vec<Recording>, TakaError> {
        self.list(RecordingFilter {
            test_id: Some(test_id.to_string()),
            status: None,
            limit: None,
        }).await
    }

    pub async fn update(&self, id: &str, updates: UpdateRecording) -> Result<Recording, TakaError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE recordings SET
                name = COALESCE(?, name),
                status = COALESCE(?, status),
                recording_path = COALESCE(?, recording_path),
                duration_ms = COALESCE(?, duration_ms),
                thumbnail_path = COALESCE(?, thumbnail_path),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(&updates.status)
        .bind(&updates.recording_path)
        .bind(&updates.duration_ms)
        .bind(&updates.thumbnail_path)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM recordings WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "Recording".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    // Annotation methods
    pub async fn create_annotation(&self, new: NewAnnotation) -> Result<Annotation, TakaError> {
        // Verify recording exists
        self.get(&new.recording_id).await?;

        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO annotations (id, recording_id, timestamp_ms, title, description, severity, issue_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.recording_id)
        .bind(new.timestamp_ms)
        .bind(&new.title)
        .bind(&new.description)
        .bind(new.severity.as_deref().unwrap_or("info"))
        .bind(&new.issue_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_annotation(&id).await
    }

    pub async fn get_annotation(&self, id: &str) -> Result<Annotation, TakaError> {
        sqlx::query_as::<_, Annotation>("SELECT * FROM annotations WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Annotation".into(),
                id: id.into(),
            })
    }

    pub async fn list_annotations(&self, recording_id: &str) -> Result<Vec<Annotation>, TakaError> {
        Ok(sqlx::query_as::<_, Annotation>(
            "SELECT * FROM annotations WHERE recording_id = ? ORDER BY timestamp_ms ASC"
        )
        .bind(recording_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update_annotation(&self, id: &str, updates: UpdateAnnotation) -> Result<Annotation, TakaError> {
        self.get_annotation(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE annotations SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                severity = COALESCE(?, severity),
                issue_id = COALESCE(?, issue_id),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.title)
        .bind(&updates.description)
        .bind(&updates.severity)
        .bind(&updates.issue_id)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_annotation(id).await
    }

    pub async fn delete_annotation(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM annotations WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "Annotation".into(),
                id: id.into(),
            });
        }

        Ok(())
    }
}
