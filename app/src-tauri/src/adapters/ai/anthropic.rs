use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::traits::AIAdapter;
use super::types::{AICapabilities, AIResponse, CompletionOptions, Message, Role, TokenUsage};
use crate::error::RigidError;

const BASE_URL: &str = "https://api.anthropic.com/v1";
const API_VERSION: &str = "2023-06-01";
const DEFAULT_MODEL: &str = "claude-3-5-sonnet-20241022";

#[derive(Debug, Clone, Serialize)]
struct AnthropicMessage {
    role: String,
    content: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
struct AnthropicRequest {
    model: String,
    messages: Vec<AnthropicMessage>,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop_sequences: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
    model: String,
    stop_reason: Option<String>,
    usage: AnthropicUsage,
}

#[derive(Debug, Clone, Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

pub struct AnthropicAdapter {
    client: Client,
    api_key: String,
    model: String,
}

impl AnthropicAdapter {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            model: model.unwrap_or_else(|| DEFAULT_MODEL.to_string()),
        }
    }

    fn is_vision_model(&self, model: &str) -> bool {
        model.contains("claude-3")
    }
}

#[async_trait]
impl AIAdapter for AnthropicAdapter {
    fn name(&self) -> &'static str {
        "Anthropic"
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
        Ok(vec![
            "claude-3-5-sonnet-20241022".to_string(),
            "claude-3-5-haiku-20241022".to_string(),
            "claude-3-opus-20240229".to_string(),
            "claude-3-sonnet-20240229".to_string(),
            "claude-3-haiku-20240307".to_string(),
        ])
    }

    async fn complete(
        &self,
        messages: Vec<Message>,
        options: CompletionOptions,
    ) -> Result<AIResponse, RigidError> {
        let url = format!("{}/messages", BASE_URL);

        let mut system_prompt: Option<String> = None;
        let mut anthropic_messages: Vec<AnthropicMessage> = Vec::new();

        for m in messages {
            match m.role {
                Role::System => {
                    system_prompt = Some(m.content);
                }
                Role::User => {
                    anthropic_messages.push(AnthropicMessage {
                        role: "user".to_string(),
                        content: serde_json::Value::String(m.content),
                    });
                }
                Role::Assistant => {
                    anthropic_messages.push(AnthropicMessage {
                        role: "assistant".to_string(),
                        content: serde_json::Value::String(m.content),
                    });
                }
            }
        }

        let request = AnthropicRequest {
            model: options.model.unwrap_or_else(|| self.model.clone()),
            messages: anthropic_messages,
            max_tokens: options.max_tokens.unwrap_or(1024),
            system: system_prompt,
            temperature: options.temperature,
            stop_sequences: options.stop_sequences,
        };

        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", API_VERSION)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(RigidError::AI(format!(
                "Anthropic API error ({}): {}",
                status, text
            )));
        }

        let anthropic_response: AnthropicResponse = response.json().await?;

        let content = anthropic_response
            .content
            .into_iter()
            .filter_map(|c| {
                if c.content_type == "text" {
                    c.text
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("");

        Ok(AIResponse {
            content,
            model: anthropic_response.model,
            usage: Some(TokenUsage {
                prompt_tokens: anthropic_response.usage.input_tokens,
                completion_tokens: anthropic_response.usage.output_tokens,
                total_tokens: anthropic_response.usage.input_tokens
                    + anthropic_response.usage.output_tokens,
            }),
            finish_reason: anthropic_response.stop_reason,
        })
    }

    async fn describe_image(&self, image_data: &[u8], prompt: &str) -> Result<String, RigidError> {
        if !self.is_vision_model(&self.model) {
            return Err(RigidError::AI(format!(
                "Model {} does not support vision. Use a Claude 3 model.",
                self.model
            )));
        }

        let url = format!("{}/messages", BASE_URL);
        let image_base64 = BASE64.encode(image_data);

        let content = serde_json::json!([
            {
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": image_base64
                }
            },
            {
                "type": "text",
                "text": prompt
            }
        ]);

        let request = AnthropicRequest {
            model: self.model.clone(),
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content,
            }],
            max_tokens: 512,
            system: None,
            temperature: Some(0.7),
            stop_sequences: None,
        };

        let response = self
            .client
            .post(&url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", API_VERSION)
            .header("content-type", "application/json")
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(RigidError::AI(format!(
                "Anthropic API error ({}): {}",
                status, text
            )));
        }

        let anthropic_response: AnthropicResponse = response.json().await?;
        let content = anthropic_response
            .content
            .into_iter()
            .filter_map(|c| {
                if c.content_type == "text" {
                    c.text
                } else {
                    None
                }
            })
            .collect::<Vec<_>>()
            .join("");

        Ok(content)
    }
}
