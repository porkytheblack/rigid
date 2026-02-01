use serde::{Deserialize, Serialize};
use tauri::State;

use crate::adapters::ai::{
    AICapabilities, AIConfig, AIProvider, AIResponse, CompletionOptions, Message, ProviderStatus,
};
use crate::error::RigidError;
use crate::repositories::SettingsRepository;
use crate::services::{ai as ai_service, AIService};

const API_KEY_PREFIX: &str = "ai.api_key.";
const PROVIDER_SETTING: &str = "ai.provider";
const MODEL_SETTING: &str = "ai.model";

#[derive(Debug, Serialize, Deserialize)]
pub struct AIStatus {
    pub configured: bool,
    pub provider: Option<String>,
    pub capabilities: Option<AICapabilities>,
}

#[tauri::command]
pub async fn check_ai_availability(
    ai_service: State<'_, AIService>,
    settings_repo: State<'_, SettingsRepository>,
) -> Result<Vec<ProviderStatus>, RigidError> {
    let mut api_keys = Vec::new();

    for provider in ["openrouter", "anthropic", "openai"] {
        let key = format!("{}{}", API_KEY_PREFIX, provider);
        if let Ok(Some(encrypted)) = settings_repo.get(&key).await {
            if let Ok(decrypted) = ai_service::decrypt_api_key(&encrypted) {
                let provider_enum: AIProvider = provider.parse().unwrap();
                api_keys.push((provider_enum, decrypted));
            }
        }
    }

    Ok(ai_service.check_all_providers(&api_keys).await)
}

#[tauri::command]
pub async fn get_ai_status(ai_service: State<'_, AIService>) -> Result<AIStatus, RigidError> {
    let configured = ai_service.is_configured().await;
    let provider = ai_service
        .get_current_provider()
        .await
        .map(|p| p.to_string());
    let capabilities = ai_service.capabilities().await;

    Ok(AIStatus {
        configured,
        provider,
        capabilities,
    })
}

#[tauri::command]
pub async fn configure_ai_provider(
    ai_service: State<'_, AIService>,
    settings_repo: State<'_, SettingsRepository>,
    provider: String,
    model: Option<String>,
) -> Result<(), RigidError> {
    let provider_enum: AIProvider = provider
        .parse()
        .map_err(|e: String| RigidError::Validation(e))?;

    let api_key = if provider_enum != AIProvider::Ollama {
        let key = format!("{}{}", API_KEY_PREFIX, provider);
        match settings_repo.get(&key).await? {
            Some(encrypted) => Some(ai_service::decrypt_api_key(&encrypted)?),
            None => None,
        }
    } else {
        None
    };

    let config = AIConfig {
        provider: provider_enum,
        model: model.clone(),
        api_key,
        base_url: None,
    };

    ai_service.configure(config).await?;

    settings_repo.set(PROVIDER_SETTING, &provider).await?;
    if let Some(model) = model {
        settings_repo.set(MODEL_SETTING, &model).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn set_ai_api_key(
    settings_repo: State<'_, SettingsRepository>,
    provider: String,
    api_key: String,
) -> Result<(), RigidError> {
    let _provider_enum: AIProvider = provider
        .parse()
        .map_err(|e: String| RigidError::Validation(e))?;

    let encrypted = ai_service::encrypt_api_key(&api_key)?;
    let key = format!("{}{}", API_KEY_PREFIX, provider);
    settings_repo.set(&key, &encrypted).await?;

    Ok(())
}

#[tauri::command]
pub async fn remove_ai_api_key(
    settings_repo: State<'_, SettingsRepository>,
    provider: String,
) -> Result<(), RigidError> {
    let key = format!("{}{}", API_KEY_PREFIX, provider);
    settings_repo.delete(&key).await?;
    Ok(())
}

#[tauri::command]
pub async fn ai_complete(
    ai_service: State<'_, AIService>,
    messages: Vec<Message>,
    options: Option<CompletionOptions>,
) -> Result<AIResponse, RigidError> {
    ai_service
        .complete(messages, options.unwrap_or_default())
        .await
}

#[tauri::command]
pub async fn ai_describe_screenshot(
    ai_service: State<'_, AIService>,
    image_path: String,
) -> Result<String, RigidError> {
    let image_data = tokio::fs::read(&image_path)
        .await
        .map_err(|e| RigidError::Io(e))?;

    let prompt = "Describe this screenshot in detail. Focus on the UI elements, any text visible, \
                  and what the user appears to be testing or interacting with. \
                  Keep the description concise but informative.";

    ai_service.describe_image(&image_data, prompt).await
}

#[tauri::command]
pub async fn ai_list_models(ai_service: State<'_, AIService>) -> Result<Vec<String>, RigidError> {
    ai_service.list_models().await
}

#[tauri::command]
pub async fn ai_generate_issue_prompt(
    settings_repo: State<'_, SettingsRepository>,
    issue_title: String,
    issue_description: Option<String>,
    steps_to_reproduce: Option<String>,
    expected_behavior: Option<String>,
    actual_behavior: Option<String>,
) -> Result<String, RigidError> {
    let mut prompt = String::new();

    prompt.push_str("# Issue Report\n\n");
    prompt.push_str(&format!("## Title\n{}\n\n", issue_title));

    if let Some(desc) = issue_description {
        prompt.push_str(&format!("## Description\n{}\n\n", desc));
    }

    if let Some(steps) = steps_to_reproduce {
        prompt.push_str(&format!("## Steps to Reproduce\n{}\n\n", steps));
    }

    if let Some(expected) = expected_behavior {
        prompt.push_str(&format!("## Expected Behavior\n{}\n\n", expected));
    }

    if let Some(actual) = actual_behavior {
        prompt.push_str(&format!("## Actual Behavior\n{}\n\n", actual));
    }

    if let Ok(Some(app_name)) = settings_repo.get("app.name").await {
        prompt.push_str(&format!("## Context\nApplication: {}\n", app_name));
    }

    prompt.push_str("\n---\n");
    prompt.push_str("Please help me investigate and fix this issue. ");
    prompt.push_str("Provide suggestions for debugging and potential solutions.");

    Ok(prompt)
}

#[tauri::command]
pub async fn restore_ai_configuration(
    ai_service: State<'_, AIService>,
    settings_repo: State<'_, SettingsRepository>,
) -> Result<bool, RigidError> {
    let provider = match settings_repo.get(PROVIDER_SETTING).await? {
        Some(p) => p,
        None => return Ok(false),
    };

    let provider_enum: AIProvider = match provider.parse() {
        Ok(p) => p,
        Err(_) => return Ok(false),
    };

    let model = settings_repo.get(MODEL_SETTING).await.ok().flatten();

    let api_key = if provider_enum != AIProvider::Ollama {
        let key = format!("{}{}", API_KEY_PREFIX, provider);
        match settings_repo.get(&key).await? {
            Some(encrypted) => ai_service::decrypt_api_key(&encrypted).ok(),
            None => None,
        }
    } else {
        None
    };

    if provider_enum != AIProvider::Ollama && api_key.is_none() {
        return Ok(false);
    }

    let config = AIConfig {
        provider: provider_enum,
        model,
        api_key,
        base_url: None,
    };

    match ai_service.configure(config).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}
