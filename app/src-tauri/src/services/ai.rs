use std::sync::Arc;
use tokio::sync::RwLock;

use crate::adapters::ai::{
    AIAdapter, AICapabilities, AIConfig, AIProvider, AIResponse, AnthropicAdapter,
    CompletionOptions, Message, OllamaAdapter, OpenAIAdapter, OpenRouterAdapter, ProviderStatus,
};
use crate::error::TakaError;
use crate::utils::crypto;

pub struct AIService {
    current_adapter: Arc<RwLock<Option<Box<dyn AIAdapter>>>>,
    current_provider: Arc<RwLock<Option<AIProvider>>>,
}

impl AIService {
    pub fn new() -> Self {
        Self {
            current_adapter: Arc::new(RwLock::new(None)),
            current_provider: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn check_provider_availability(
        &self,
        provider: AIProvider,
        api_key: Option<&str>,
    ) -> ProviderStatus {
        let adapter = self.create_adapter(provider, api_key, None);

        let available = adapter.is_available().await;
        let models = if available {
            adapter.list_models().await.unwrap_or_default()
        } else {
            vec![]
        };

        let error = if !available && api_key.is_none() && provider != AIProvider::Ollama {
            Some("API key required".to_string())
        } else if !available && provider == AIProvider::Ollama {
            Some("Ollama is not running. Start it with 'ollama serve'".to_string())
        } else {
            None
        };

        ProviderStatus {
            provider,
            available,
            capabilities: adapter.capabilities(),
            models,
            error,
        }
    }

    pub async fn check_all_providers(
        &self,
        api_keys: &[(AIProvider, String)],
    ) -> Vec<ProviderStatus> {
        let mut statuses = Vec::new();

        for provider in [
            AIProvider::Ollama,
            AIProvider::OpenRouter,
            AIProvider::Anthropic,
            AIProvider::OpenAI,
        ] {
            let api_key = api_keys
                .iter()
                .find(|(p, _)| *p == provider)
                .map(|(_, k)| k.as_str());

            statuses.push(self.check_provider_availability(provider, api_key).await);
        }

        statuses
    }

    pub async fn configure(&self, config: AIConfig) -> Result<(), TakaError> {
        let adapter = self.create_adapter(
            config.provider,
            config.api_key.as_deref(),
            config.model.as_deref(),
        );

        if !adapter.is_available().await {
            return Err(TakaError::AI(format!(
                "Provider {} is not available",
                config.provider
            )));
        }

        let mut current = self.current_adapter.write().await;
        *current = Some(adapter);

        let mut provider = self.current_provider.write().await;
        *provider = Some(config.provider);

        Ok(())
    }

    pub async fn get_current_provider(&self) -> Option<AIProvider> {
        *self.current_provider.read().await
    }

    pub async fn is_configured(&self) -> bool {
        self.current_adapter.read().await.is_some()
    }

    pub async fn capabilities(&self) -> Option<AICapabilities> {
        self.current_adapter
            .read()
            .await
            .as_ref()
            .map(|a| a.capabilities())
    }

    pub async fn complete(
        &self,
        messages: Vec<Message>,
        options: CompletionOptions,
    ) -> Result<AIResponse, TakaError> {
        let adapter = self.current_adapter.read().await;
        let adapter = adapter
            .as_ref()
            .ok_or_else(|| TakaError::AI("No AI provider configured".to_string()))?;

        adapter.complete(messages, options).await
    }

    pub async fn describe_image(
        &self,
        image_data: &[u8],
        prompt: &str,
    ) -> Result<String, TakaError> {
        let adapter = self.current_adapter.read().await;
        let adapter = adapter
            .as_ref()
            .ok_or_else(|| TakaError::AI("No AI provider configured".to_string()))?;

        if !adapter.capabilities().vision {
            return Err(TakaError::AI(
                "Current provider does not support vision".to_string(),
            ));
        }

        adapter.describe_image(image_data, prompt).await
    }

    pub async fn list_models(&self) -> Result<Vec<String>, TakaError> {
        let adapter = self.current_adapter.read().await;
        let adapter = adapter
            .as_ref()
            .ok_or_else(|| TakaError::AI("No AI provider configured".to_string()))?;

        adapter.list_models().await
    }

    fn create_adapter(
        &self,
        provider: AIProvider,
        api_key: Option<&str>,
        model: Option<&str>,
    ) -> Box<dyn AIAdapter> {
        match provider {
            AIProvider::Ollama => {
                Box::new(OllamaAdapter::new(None, model.map(|s| s.to_string())))
            }
            AIProvider::OpenRouter => Box::new(OpenRouterAdapter::new(
                api_key.unwrap_or_default().to_string(),
                model.map(|s| s.to_string()),
            )),
            AIProvider::Anthropic => Box::new(AnthropicAdapter::new(
                api_key.unwrap_or_default().to_string(),
                model.map(|s| s.to_string()),
            )),
            AIProvider::OpenAI => Box::new(OpenAIAdapter::new(
                api_key.unwrap_or_default().to_string(),
                model.map(|s| s.to_string()),
            )),
        }
    }
}

impl Default for AIService {
    fn default() -> Self {
        Self::new()
    }
}

pub fn encrypt_api_key(key: &str) -> Result<String, TakaError> {
    crypto::encrypt(key)
}

pub fn decrypt_api_key(encrypted: &str) -> Result<String, TakaError> {
    crypto::decrypt(encrypted)
}
