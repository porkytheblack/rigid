use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ChecklistItem {
    pub id: String,
    pub test_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub sort_order: i32,
    pub group_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewChecklistItem {
    pub test_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub group_name: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChecklistItem {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub group_name: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, Default)]
pub struct ChecklistFilter {
    pub test_id: Option<String>,
    pub status: Option<String>,
    pub group_name: Option<String>,
}
