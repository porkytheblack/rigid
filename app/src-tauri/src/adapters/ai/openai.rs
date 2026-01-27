use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::traits::AIAdapter;
use super::types::{AICapabilities, AIResponse, CompletionOptions, Message, Role, TokenUsage};
use crate::error::TakaError;

const BASE_URL: &str = "https://api.openai.com/v1";
const DEFAULT_MODEL: &str = "gpt-4o";

#[derive(Debug, Clone, Serialize)]
struct OpenAIMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
struct OpenAIRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAIResponse {
    choices: Vec<OpenAIChoice>,
    model: String,
    usage: Option<OpenAIUsage>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAIChoice {
    message: OpenAIResponseMessage,
    finish_reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAIResponseMessage {
    content: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAIModelsResponse {
    data: Vec<OpenAIModel>,
}

#[derive(Debug, Clone, Deserialize)]
struct OpenAIModel {
    id: String,
}

pub struct OpenAIAdapter {
    client: Client,
    api_key: String,
    model: String,
}

impl OpenAIAdapter {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: model.unwrap_or_else(|| DEFAULT_MODEL.to_string()),
        }
    }

    fn is_vision_model(&self, model: &str) -> bool {
        model.contains("gpt-4o")
            || model.contains("gpt-4-turbo")
            || model.contains("gpt-4-vision")
    }
}

#[async_trait]
impl AIAdapter for OpenAIAdapter {
    fn name(&self) -> &'static str {
        "OpenAI"
    }

    fn capabilities(&self) -> AICapabilities {
        AICapabilities {
            streaming: true,
            vision: self.is_vision_model(&self.model),
            embeddings: true,
            function_calling: true,
        }
    }

    async fn is_available(&self) -> bool {
        !self.api_key.is_empty()
    }

    async fn list_models(&self) -> Result<Vec<String>, TakaError> {
        let url = format!("{}/models", BASE_URL);
        let response = self
            .client
            .get(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await?;

        if !response.status().is_success() {
            return Ok(vec![
                "gpt-4o".to_string(),
                "gpt-4o-mini".to_string(),
                "gpt-4-turbo".to_string(),
                "gpt-3.5-turbo".to_string(),
            ]);
        }

        let models: OpenAIModelsResponse = response.json().await?;
        let gpt_models: Vec<String> = models
            .data
            .into_iter()
            .map(|m| m.id)
            .filter(|id| id.starts_with("gpt-"))
            .collect();

        Ok(gpt_models)
    }

    async fn complete(
        &self,
        messages: Vec<Message>,
        options: CompletionOptions,
    ) -> Result<AIResponse, TakaError> {
        let url = format!("{}/chat/completions", BASE_URL);

        let openai_messages: Vec<OpenAIMessage> = messages
            .into_iter()
            .map(|m| OpenAIMessage {
                role: match m.role {
                    Role::System => "system".to_string(),
                    Role::User => "user".to_string(),
                    Role::Assistant => "assistant".to_string(),
                },
                content: serde_json::Value::String(m.content),
            })
            .collect();

        let request = OpenAIRequest {
            model: options.model.unwrap_or_else(|| self.model.clone()),
            messages: openai_messages,
            max_tokens: options.max_tokens,
            temperature: options.temperature,
            stop: options.stop_sequences,
        };

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(TakaError::AI(format!(
                "OpenAI API error ({}): {}",
                status, text
            )));
        }

        let openai_response: OpenAIResponse = response.json().await?;

        let choice = openai_response
            .choices
            .first()
            .ok_or_else(|| TakaError::AI("No response from OpenAI".to_string()))?;

        let usage = openai_response.usage.map(|u| TokenUsage {
            prompt_tokens: u.prompt_tokens,
            completion_tokens: u.completion_tokens,
            total_tokens: u.total_tokens,
        });

        Ok(AIResponse {
            content: choice.message.content.clone().unwrap_or_default(),
            model: openai_response.model,
            usage,
            finish_reason: choice.finish_reason.clone(),
        })
    }

    async fn describe_image(&self, image_data: &[u8], prompt: &str) -> Result<String, TakaError> {
        if !self.is_vision_model(&self.model) {
            return Err(TakaError::AI(format!(
                "Model {} does not support vision. Use gpt-4o, gpt-4-turbo, or another vision model.",
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

        let request = OpenAIRequest {
            model: self.model.clone(),
            messages: vec![OpenAIMessage {
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
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(TakaError::AI(format!(
                "OpenAI API error ({}): {}",
                status, text
            )));
        }

        let openai_response: OpenAIResponse = response.json().await?;
        let choice = openai_response
            .choices
            .first()
            .ok_or_else(|| TakaError::AI("No response from OpenAI".to_string()))?;

        Ok(choice.message.content.clone().unwrap_or_default())
    }
}
