use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Tag {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
pub struct NewTag {
    pub name: String,
    pub color: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTag {
    pub name: Option<String>,
    pub color: Option<String>,
}

// Taggable types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaggableType {
    Session,
    Issue,
    ChecklistItem,
    CodexEntry,
    Screenshot,
}

impl TaggableType {
    pub fn as_str(&self) -> &'static str {
        match self {
            TaggableType::Session => "session",
            TaggableType::Issue => "issue",
            TaggableType::ChecklistItem => "checklist_item",
            TaggableType::CodexEntry => "codex_entry",
            TaggableType::Screenshot => "screenshot",
        }
    }
}

impl std::fmt::Display for TaggableType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}
