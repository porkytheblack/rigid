use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

impl Message {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: Role::System,
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: Role::User,
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: Role::Assistant,
            content: content.into(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompletionOptions {
    pub model: Option<String>,
    pub max_tokens: Option<u32>,
    pub temperature: Option<f32>,
    pub stop_sequences: Option<Vec<String>>,
}

impl Default for CompletionOptions {
    fn default() -> Self {
        Self {
            model: None,
            max_tokens: Some(1024),
            temperature: Some(0.7),
            stop_sequences: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<TokenUsage>,
    pub finish_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AIProvider {
    Ollama,
    OpenRouter,
    Anthropic,
    OpenAI,
}

impl std::fmt::Display for AIProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AIProvider::Ollama => write!(f, "ollama"),
            AIProvider::OpenRouter => write!(f, "openrouter"),
            AIProvider::Anthropic => write!(f, "anthropic"),
            AIProvider::OpenAI => write!(f, "openai"),
        }
    }
}

impl std::str::FromStr for AIProvider {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "ollama" => Ok(AIProvider::Ollama),
            "openrouter" => Ok(AIProvider::OpenRouter),
            "anthropic" => Ok(AIProvider::Anthropic),
            "openai" => Ok(AIProvider::OpenAI),
            _ => Err(format!("Unknown AI provider: {}", s)),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AICapabilities {
    pub streaming: bool,
    pub vision: bool,
    pub embeddings: bool,
    pub function_calling: bool,
}

impl Default for AICapabilities {
    fn default() -> Self {
        Self {
            streaming: false,
            vision: false,
            embeddings: false,
            function_calling: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub provider: AIProvider,
    pub available: bool,
    pub capabilities: AICapabilities,
    pub models: Vec<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub provider: AIProvider,
    pub model: Option<String>,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
}
