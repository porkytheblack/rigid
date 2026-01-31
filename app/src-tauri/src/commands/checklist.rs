use tauri::State;

use crate::error::RigidError;
use crate::models::{ChecklistItem, NewChecklistItem, UpdateChecklistItem, ChecklistFilter};
use crate::repositories::ChecklistRepository;

#[tauri::command]
pub async fn create_checklist_item(
    new_item: NewChecklistItem,
    repo: State<'_, ChecklistRepository>,
) -> Result<ChecklistItem, RigidError> {
    repo.create(new_item).await
}

#[tauri::command]
pub async fn get_checklist_item(
    id: String,
    repo: State<'_, ChecklistRepository>,
) -> Result<ChecklistItem, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_checklist_items(
    filter: ChecklistFilter,
    repo: State<'_, ChecklistRepository>,
) -> Result<Vec<ChecklistItem>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn update_checklist_item(
    id: String,
    updates: UpdateChecklistItem,
    repo: State<'_, ChecklistRepository>,
) -> Result<ChecklistItem, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_checklist_item(
    id: String,
    repo: State<'_, ChecklistRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn reorder_checklist_items(
    ids: Vec<String>,
    repo: State<'_, ChecklistRepository>,
) -> Result<(), RigidError> {
    repo.reorder(ids).await
}

#[tauri::command]
pub async fn get_checklist_counts(
    repo: State<'_, ChecklistRepository>,
) -> Result<(i32, i32, i32), RigidError> {
    repo.count_by_status().await
}
