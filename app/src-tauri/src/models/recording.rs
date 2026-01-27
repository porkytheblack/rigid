use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Recording {
    pub id: String,
    pub test_id: Option<String>,
    pub name: String,
    pub status: String,
    pub recording_path: Option<String>,
    pub duration_ms: Option<i64>,
    pub thumbnail_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewRecording {
    pub test_id: Option<String>,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRecording {
    pub name: Option<String>,
    pub status: Option<String>,
    pub recording_path: Option<String>,
    pub duration_ms: Option<i64>,
    pub thumbnail_path: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct RecordingFilter {
    pub test_id: Option<String>,
    pub app_id: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i32>,
}

// Annotation model (belongs to Recording)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Annotation {
    pub id: String,
    pub recording_id: String,
    pub timestamp_ms: i64,
    pub title: String,
    pub description: Option<String>,
    pub severity: String,
    pub issue_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewAnnotation {
    pub recording_id: String,
    pub timestamp_ms: i64,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub issue_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAnnotation {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub issue_id: Option<String>,
}
