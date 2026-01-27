use tauri::State;

use crate::error::TakaError;
use crate::models::Setting;
use crate::repositories::SettingsRepository;

#[tauri::command]
pub async fn get_setting(
    key: String,
    repo: State<'_, SettingsRepository>,
) -> Result<Option<String>, TakaError> {
    repo.get(&key).await
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    repo: State<'_, SettingsRepository>,
) -> Result<(), TakaError> {
    repo.set(&key, &value).await
}

#[tauri::command]
pub async fn delete_setting(
    key: String,
    repo: State<'_, SettingsRepository>,
) -> Result<(), TakaError> {
    repo.delete(&key).await
}

#[tauri::command]
pub async fn get_all_settings(
    repo: State<'_, SettingsRepository>,
) -> Result<Vec<Setting>, TakaError> {
    repo.get_all().await
}

#[tauri::command]
pub async fn get_bool_setting(
    key: String,
    repo: State<'_, SettingsRepository>,
) -> Result<Option<bool>, TakaError> {
    repo.get_bool(&key).await
}

#[tauri::command]
pub async fn set_bool_setting(
    key: String,
    value: bool,
    repo: State<'_, SettingsRepository>,
) -> Result<(), TakaError> {
    repo.set_bool(&key, value).await
}

#[tauri::command]
pub async fn get_int_setting(
    key: String,
    repo: State<'_, SettingsRepository>,
) -> Result<Option<i32>, TakaError> {
    repo.get_int(&key).await
}

#[tauri::command]
pub async fn set_int_setting(
    key: String,
    value: i32,
    repo: State<'_, SettingsRepository>,
) -> Result<(), TakaError> {
    repo.set_int(&key, value).await
}
