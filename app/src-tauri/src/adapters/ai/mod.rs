mod traits;
mod types;
mod ollama;
mod openrouter;
mod anthropic;
mod openai;

pub use traits::AIAdapter;
pub use types::*;
pub use ollama::OllamaAdapter;
pub use openrouter::OpenRouterAdapter;
pub use anthropic::AnthropicAdapter;
pub use openai::OpenAIAdapter;
