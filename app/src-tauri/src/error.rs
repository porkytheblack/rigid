use thiserror::Error;

#[derive(Error, Debug)]
pub enum TakaError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("Entity not found: {entity} with id {id}")]
    NotFound { entity: String, id: String },

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Tauri error: {0}")]
    Tauri(String),

    #[error("AI error: {0}")]
    AI(String),

    #[error("HTTP error: {0}")]
    Http(String),

    #[error("Crypto error: {0}")]
    Crypto(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl From<tauri::Error> for TakaError {
    fn from(err: tauri::Error) -> Self {
        TakaError::Tauri(err.to_string())
    }
}

impl From<reqwest::Error> for TakaError {
    fn from(err: reqwest::Error) -> Self {
        TakaError::Http(err.to_string())
    }
}

// Make TakaError serializable for Tauri IPC
impl serde::Serialize for TakaError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
