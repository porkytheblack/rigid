use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct App {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub icon_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewApp {
    pub name: String,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub icon_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApp {
    pub name: Option<String>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub icon_path: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct AppFilter {
    pub search: Option<String>,
    pub limit: Option<i32>,
}
