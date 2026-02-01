use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Issue {
    pub id: String,
    pub test_id: Option<String>,
    pub number: i32,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub screenshot_id: Option<String>,
    pub recording_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewIssue {
    pub test_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub priority: Option<String>,
    pub screenshot_id: Option<String>,
    pub recording_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateIssue {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub screenshot_id: Option<String>,
    pub recording_id: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct IssueFilter {
    pub test_id: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub limit: Option<i32>,
}
