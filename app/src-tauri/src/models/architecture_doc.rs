use serde::{Deserialize, Serialize};

// ============ Architecture Document ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ArchitectureDoc {
    pub id: String,
    pub app_id: String,
    pub name: String,
    pub icon: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewArchitectureDoc {
    pub app_id: String,
    pub name: String,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateArchitectureDoc {
    pub name: Option<String>,
    pub icon: Option<String>,
    pub sort_order: Option<i32>,
}

// ============ Architecture Document Block ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ArchitectureDocBlock {
    pub id: String,
    pub doc_id: String,
    pub block_type: String,
    pub content: String,
    pub checked: Option<i32>,
    pub language: Option<String>,
    pub callout_type: Option<String>,
    pub image_path: Option<String>,
    pub image_caption: Option<String>,
    pub collapsed: Option<i32>,
    pub mermaid_code: Option<String>,
    pub indent_level: i32,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewArchitectureDocBlock {
    pub doc_id: String,
    pub block_type: String,
    pub content: Option<String>,
    pub checked: Option<bool>,
    pub language: Option<String>,
    pub callout_type: Option<String>,
    pub image_path: Option<String>,
    pub image_caption: Option<String>,
    pub collapsed: Option<bool>,
    pub mermaid_code: Option<String>,
    pub indent_level: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateArchitectureDocBlock {
    pub block_type: Option<String>,
    pub content: Option<String>,
    pub checked: Option<bool>,
    pub language: Option<String>,
    pub callout_type: Option<String>,
    pub image_path: Option<String>,
    pub image_caption: Option<String>,
    pub collapsed: Option<bool>,
    pub mermaid_code: Option<String>,
    pub indent_level: Option<i32>,
    pub sort_order: Option<i32>,
}

// ============ Full doc with blocks ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArchitectureDocWithBlocks {
    pub doc: ArchitectureDoc,
    pub blocks: Vec<ArchitectureDocBlock>,
}
