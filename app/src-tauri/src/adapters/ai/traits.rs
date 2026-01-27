use async_trait::async_trait;

use super::types::{AICapabilities, AIResponse, CompletionOptions, Message};
use crate::error::TakaError;

#[async_trait]
pub trait AIAdapter: Send + Sync {
    fn name(&self) -> &'static str;

    fn capabilities(&self) -> AICapabilities;

    async fn is_available(&self) -> bool;

    async fn list_models(&self) -> Result<Vec<String>, TakaError>;

    async fn complete(
        &self,
        messages: Vec<Message>,
        options: CompletionOptions,
    ) -> Result<AIResponse, TakaError>;

    async fn describe_image(
        &self,
        image_data: &[u8],
        prompt: &str,
    ) -> Result<String, TakaError>;
}
