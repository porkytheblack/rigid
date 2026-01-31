use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::traits::AIAdapter;
use super::types::{AICapabilities, AIResponse, CompletionOptions, Message, Role, TokenUsage};
use crate::error::RigidError;

const BASE_URL: &str = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL: &str = "anthropic/claude-3.5-sonnet";

#[derive(Debug, Clone, Serialize)]
struct OpenRouterMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<OpenRouterMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenRouterResponse {
    choices: Vec<OpenRouterChoice>,
    model: String,
    usage: Option<OpenRouterUsage>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenRouterChoice {
    message: OpenRouterResponseMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenRouterResponseMessage {
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenRouterUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenRouterModelsResponse {
    data: Vec<OpenRouterModel>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenRouterModel {
    id: String,
}

pub struct OpenRouterAdapter {
    client: Client,
    api_key: String,
    model: String,
}

impl OpenRouterAdapter {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: model.unwrap_or_else(|| DEFAULT_MODEL.to_string()),
        }
    }

    fn is_vision_model(&self, model: &str) -> bool {
        model.contains("vision")
            || model.contains("claude-3")
            || model.contains("gpt-4o")
            || model.contains("gpt-4-turbo")
    }
}

#[async_trait]
impl AIAdapter for OpenRouterAdapter {
    fn name(&self) -> &'static str {
        "OpenRouter"
    }

    fn capabilities(&self) -> AICapabilities {
        AICapabilities {
            streaming: true,
            vision: self.is_vision_model(&self.model),
            embeddings: false,
            function_calling: true,
        }
    }

    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn list_models(&self) -> Result<Vec<String>, RigidError> {
        let url = format!("{}/models", BASE_URL);
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Ok(vec![DEFAULT_MODEL.to_string()]);
        }

        let models: OpenRouterModelsResponse = response.json().await?;
        Ok(models.data.into_iter().map(|m| m.id).collect())
    }

    async fn complete(
        &self,
        messages: Vec<Message>,
        options: CompletionOptions,
    ) -> Result<AIResponse, RigidError> {
        let url = format!("{}/chat/completions", BASE_URL);

        let openrouter_messages: Vec<OpenRouterMessage> = messages
            .into_iter()
            .map(|m| OpenRouterMessage {
                role: match m.role {
                    Role::System => "system".to_string(),
                    Role::User => "user".to_string(),
                    Role::Assistant => "assistant".to_string(),
                },
                content: serde_json::Value::String(m.content),
            })
            .collect();

        let request = OpenRouterRequest {
            model: options.model.unwrap_or_else(|| self.model.clone()),
            messages: openrouter_messages,
            max_tokens: options.max_tokens,
            temperature: options.temperature,
            stop: options.stop_sequences,
        };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("HTTP-Referer", "https://rigid.systems")
            .header("X-Title", "Rigid")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(RigidError::AI(format!(
                "OpenRouter API error ({}): {}",
                status, text
            )));
        }

        let openrouter_response: OpenRouterResponse = response.json().await?;

        let choice = openrouter_response
            .choices
            .first()
            .ok_or_else(|| RigidError::AI("No response from OpenRouter".to_string()))?;

        let usage = openrouter_response.usage.map(|u| TokenUsage {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        });

        Ok(AIResponse {
            content: choice.message.content.clone(),
            model: openrouter_response.model,
            usage,
            finish_reason: choice.finish_reason.clone(),
        })
    }

    async fn describe_image(&self, image_data: &[u8], prompt: &str) -> Result<String, RigidError> {
        if !self.is_vision_model(&self.model) {
            return Err(RigidError::AI(format!(
                "Model {} does not support vision. Use a vision-capable model like claude-3.5-sonnet or gpt-4o.",
                self.model
            )));
        }

        let url = format!("{}/chat/completions", BASE_URL);
        let image_base64 = BASE64.encode(image_data);

        let content = serde_json::json!([
            {
                "type": "text",
                "text": prompt
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": format!("data:image/png;base64,{}", image_base64)
                }
            }
        ]);

        let request = OpenRouterRequest {
            model: self.model.clone(),
            messages: vec![OpenRouterMessage {
                role: "user".to_string(),
                content,
            }],
            max_tokens: Some(512),
            temperature: Some(0.7),
            stop: None,
        };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("HTTP-Referer", "https://rigid.systems")
            .header("X-Title", "Rigid")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(RigidError::AI(format!(
                "OpenRouter API error ({}): {}",
                status, text
            )));
        }

        let openrouter_response: OpenRouterResponse = response.json().await?;
        let choice = openrouter_response
            .choices
            .first()
            .ok_or_else(|| RigidError::AI("No response from OpenRouter".to_string()))?;

        Ok(choice.message.content.clone())
    }
}
