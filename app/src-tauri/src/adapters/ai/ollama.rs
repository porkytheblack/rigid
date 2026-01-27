use async_trait::async_trait;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::traits::AIAdapter;
use super::types::{AICapabilities, AIResponse, CompletionOptions, Message, Role, TokenUsage};
use crate::error::TakaError;

const DEFAULT_BASE_URL: &str = "http://localhost:11434";
const DEFAULT_MODEL: &str = "llama3.2";
const VISION_MODELS: &[&str] = &["llava", "llava:13b", "llava:34b", "bakllava", "llava-llama3"];

#[derive(Debug, Clone, Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    images: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    options: Option<OllamaOptions>,
}

#[derive(Debug, Clone, Serialize)]
struct OllamaOptions {
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    num_predict: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stop: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaChatResponse {
    message: OllamaResponseMessage,
    model: String,
    done: bool,
    #[serde(default)]
    prompt_eval_count: Option<u32>,
    #[serde(default)]
    eval_count: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaResponseMessage {
    role: String,
    content: String,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Clone, Deserialize)]
struct OllamaModel {
    name: String,
}

pub struct OllamaAdapter {
    client: Client,
    base_url: String,
    model: String,
}

impl OllamaAdapter {
    pub fn new(base_url: Option<String>, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.unwrap_or_else(|| DEFAULT_BASE_URL.to_string()),
            model: model.unwrap_or_else(|| DEFAULT_MODEL.to_string()),
        }
    }

    fn is_vision_model(&self, model: &str) -> bool {
        VISION_MODELS.iter().any(|vm| model.starts_with(vm))
    }
}

#[async_trait]
impl AIAdapter for OllamaAdapter {
    fn name(&self) -> &'static str {
        "Ollama"
    }

    fn capabilities(&self) -> AICapabilities {
        AICapabilities {
            streaming: true,
            vision: self.is_vision_model(&self.model),
            embeddings: true,
            function_calling: false,
        }
    }

    async fn is_available(&self) -> bool {
        let url = format!("{}/api/tags", self.base_url);
        match self.client.get(&url).send().await {
            Ok(response) => response.status().is_success(),
            Err(_) => false,
        }
    }

    async fn list_models(&self) -> Result<Vec<String>, TakaError> {
        let url = format!("{}/api/tags", self.base_url);
        let response = self
            .client
            .get(&url)
            .send()
            .await?
            .json::<OllamaTagsResponse>()
            .await?;

        Ok(response.models.into_iter().map(|m| m.name).collect())
    }

    async fn complete(
        &self,
        messages: Vec<Message>,
        options: CompletionOptions,
    ) -> Result<AIResponse, TakaError> {
        let url = format!("{}/api/chat", self.base_url);

        let ollama_messages: Vec<OllamaMessage> = messages
            .into_iter()
            .map(|m| OllamaMessage {
                role: match m.role {
                    Role::System => "system".to_string(),
                    Role::User => "user".to_string(),
                    Role::Assistant => "assistant".to_string(),
                },
                content: m.content,
                images: None,
            })
            .collect();

        let request = OllamaChatRequest {
            model: options.model.unwrap_or_else(|| self.model.clone()),
            messages: ollama_messages,
            stream: false,
            options: Some(OllamaOptions {
                temperature: options.temperature,
                num_predict: options.max_tokens,
                stop: options.stop_sequences,
            }),
        };

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(TakaError::AI(format!(
                "Ollama API error ({}): {}",
                status, text
            )));
        }

        let ollama_response: OllamaChatResponse = response.json().await?;

        let usage = match (ollama_response.prompt_eval_count, ollama_response.eval_count) {
            (Some(prompt), Some(completion)) => Some(TokenUsage {
                prompt_tokens: prompt,
                completion_tokens: completion,
                total_tokens: prompt + completion,
            }),
            _ => None,
        };

        Ok(AIResponse {
            content: ollama_response.message.content,
            model: ollama_response.model,
            usage,
            finish_reason: if ollama_response.done {
                Some("stop".to_string())
            } else {
                None
            },
        })
    }

    async fn describe_image(&self, image_data: &[u8], prompt: &str) -> Result<String, TakaError> {
        if !self.is_vision_model(&self.model) {
            return Err(TakaError::AI(format!(
                "Model {} does not support vision. Use llava, bakllava, or another vision model.",
                self.model
            )));
        }

        let url = format!("{}/api/chat", self.base_url);
        let image_base64 = BASE64.encode(image_data);

        let request = OllamaChatRequest {
            model: self.model.clone(),
            messages: vec![OllamaMessage {
                role: "user".to_string(),
                content: prompt.to_string(),
                images: Some(vec![image_base64]),
            }],
            stream: false,
            options: Some(OllamaOptions {
                temperature: Some(0.7),
                num_predict: Some(512),
                stop: None,
            }),
        };

        let response = self.client.post(&url).json(&request).send().await?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(TakaError::AI(format!(
                "Ollama API error ({}): {}",
                status, text
            )));
        }

        let ollama_response: OllamaChatResponse = response.json().await?;
        Ok(ollama_response.message.content)
    }
}
