use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Feature {
    pub id: String,
    pub app_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewFeature {
    pub app_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFeature {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize, Default)]
pub struct FeatureFilter {
    pub app_id: Option<String>,
    pub status: Option<String>,
}
