use tauri::State;

use crate::error::RigidError;
use crate::models::{Tag, NewTag, UpdateTag, TaggableType};
use crate::repositories::TagRepository;

#[tauri::command]
pub async fn create_tag(
    new_tag: NewTag,
    repo: State<'_, TagRepository>,
) -> Result<Tag, RigidError> {
    repo.create(new_tag).await
}

#[tauri::command]
pub async fn get_tag(
    id: String,
    repo: State<'_, TagRepository>,
) -> Result<Tag, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_tags(
    repo: State<'_, TagRepository>,
) -> Result<Vec<Tag>, RigidError> {
    repo.list().await
}

#[tauri::command]
pub async fn update_tag(
    id: String,
    updates: UpdateTag,
    repo: State<'_, TagRepository>,
) -> Result<Tag, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_tag(
    id: String,
    repo: State<'_, TagRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn add_tag_to_entity(
    tag_id: String,
    taggable_type: TaggableType,
    taggable_id: String,
    repo: State<'_, TagRepository>,
) -> Result<(), RigidError> {
    repo.add_to_entity(&tag_id, taggable_type, &taggable_id).await
}

#[tauri::command]
pub async fn remove_tag_from_entity(
    tag_id: String,
    taggable_type: TaggableType,
    taggable_id: String,
    repo: State<'_, TagRepository>,
) -> Result<(), RigidError> {
    repo.remove_from_entity(&tag_id, taggable_type, &taggable_id).await
}

#[tauri::command]
pub async fn get_tags_for_entity(
    taggable_type: TaggableType,
    taggable_id: String,
    repo: State<'_, TagRepository>,
) -> Result<Vec<Tag>, RigidError> {
    repo.get_for_entity(taggable_type, &taggable_id).await
}
