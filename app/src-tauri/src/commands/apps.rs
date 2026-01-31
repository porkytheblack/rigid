use tauri::State;

use crate::error::RigidError;
use crate::models::{App, NewApp, UpdateApp, AppFilter};
use crate::repositories::AppRepository;

#[tauri::command]
pub async fn create_app(
    new_app: NewApp,
    repo: State<'_, AppRepository>,
) -> Result<App, RigidError> {
    repo.create(new_app).await
}

#[tauri::command]
pub async fn get_app(
    id: String,
    repo: State<'_, AppRepository>,
) -> Result<App, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_apps(
    filter: AppFilter,
    repo: State<'_, AppRepository>,
) -> Result<Vec<App>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn update_app(
    id: String,
    updates: UpdateApp,
    repo: State<'_, AppRepository>,
) -> Result<App, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_app(
    id: String,
    repo: State<'_, AppRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn count_apps(
    repo: State<'_, AppRepository>,
) -> Result<i32, RigidError> {
    repo.count().await
}
