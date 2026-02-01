use serde::{Deserialize, Serialize};

// Document blocks (block-based editor content for tests/explorations)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DocumentBlock {
    pub id: String,
    pub test_id: String,
    pub block_type: String, // paragraph, heading1, heading2, heading3, quote, bulletList, numberedList, todo, code, image, divider, callout, toggle
    pub content: String,
    // Meta fields for different block types
    pub checked: Option<i32>, // for todo blocks (0 or 1)
    pub language: Option<String>, // for code blocks
    pub callout_type: Option<String>, // for callout blocks (info, warning, success, error)
    pub image_path: Option<String>, // for image blocks
    pub image_caption: Option<String>, // caption for image blocks
    pub collapsed: Option<i32>, // for toggle blocks (0 or 1)
    pub indent_level: i32,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDocumentBlock {
    pub test_id: String,
    pub block_type: String,
    pub content: Option<String>,
    pub checked: Option<bool>,
    pub language: Option<String>,
    pub callout_type: Option<String>,
    pub image_path: Option<String>,
    pub image_caption: Option<String>,
    pub collapsed: Option<bool>,
    pub indent_level: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDocumentBlock {
    pub block_type: Option<String>,
    pub content: Option<String>,
    pub checked: Option<bool>,
    pub language: Option<String>,
    pub callout_type: Option<String>,
    pub image_path: Option<String>,
    pub image_caption: Option<String>,
    pub collapsed: Option<bool>,
    pub indent_level: Option<i32>,
    pub sort_order: Option<i32>,
}

// Exploration checklist items (sidebar checklist in doc tab)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ExplorationTodo {
    pub id: String,
    pub test_id: String,
    pub content: String,
    pub checked: i32, // 0 or 1
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewExplorationTodo {
    pub test_id: String,
    pub content: Option<String>,
    pub checked: Option<bool>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExplorationTodo {
    pub content: Option<String>,
    pub checked: Option<bool>,
    pub sort_order: Option<i32>,
}
