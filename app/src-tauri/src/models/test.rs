use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Test {
    pub id: String,
    pub app_id: String,
    pub name: String,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewTest {
    pub app_id: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTest {
    pub name: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct TestFilter {
    pub app_id: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i32>,
}
