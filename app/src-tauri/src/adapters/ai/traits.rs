use async_trait::async_trait;

use super::types::{AICapabilities, AIResponse, CompletionOptions, Message};
use crate::error::RigidError;

#[async_trait]
pub trait AIAdapter: Send + Sync {
    fn name(&self) -> &'static str;

    fn capabilities(&self) -> AICapabilities;

    async fn is_available(&self) -> bool;

    async fn list_models(&self) -> Result<Vec<String>, RigidError>;

    async fn complete(
        &self,
        messages: Vec<Message>,
        options: CompletionOptions,
    ) -> Result<AIResponse, RigidError>;

    async fn describe_image(
        &self,
        image_data: &[u8],
        prompt: &str,
    ) -> Result<String, RigidError>;
}
