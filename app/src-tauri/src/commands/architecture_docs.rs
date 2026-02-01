use tauri::State;

use crate::error::RigidError;
use crate::models::{
    ArchitectureDoc, NewArchitectureDoc, UpdateArchitectureDoc, ArchitectureDocWithBlocks,
    ArchitectureDocBlock, NewArchitectureDocBlock, UpdateArchitectureDocBlock,
};
use crate::repositories::ArchitectureDocRepository;

// ============ Architecture Doc Commands ============

#[tauri::command]
pub async fn create_architecture_doc(
    new_doc: NewArchitectureDoc,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<ArchitectureDoc, RigidError> {
    repo.create(new_doc).await
}

#[tauri::command]
pub async fn get_architecture_doc(
    id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<ArchitectureDoc, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn get_architecture_doc_with_blocks(
    id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<ArchitectureDocWithBlocks, RigidError> {
    repo.get_with_blocks(&id).await
}

#[tauri::command]
pub async fn list_architecture_docs(
    app_id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<Vec<ArchitectureDoc>, RigidError> {
    repo.list_by_app(&app_id).await
}

#[tauri::command]
pub async fn update_architecture_doc(
    id: String,
    updates: UpdateArchitectureDoc,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<ArchitectureDoc, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_architecture_doc(
    id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn count_architecture_docs(
    app_id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<i32, RigidError> {
    repo.count_by_app(&app_id).await
}

#[tauri::command]
pub async fn reorder_architecture_docs(
    doc_ids: Vec<String>,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<(), RigidError> {
    repo.reorder(doc_ids).await
}

// ============ Block Commands ============

#[tauri::command]
pub async fn create_architecture_doc_block(
    new_block: NewArchitectureDocBlock,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<ArchitectureDocBlock, RigidError> {
    repo.create_block(new_block).await
}

#[tauri::command]
pub async fn get_architecture_doc_block(
    id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<ArchitectureDocBlock, RigidError> {
    repo.get_block(&id).await
}

#[tauri::command]
pub async fn list_architecture_doc_blocks(
    doc_id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<Vec<ArchitectureDocBlock>, RigidError> {
    repo.list_blocks(&doc_id).await
}

#[tauri::command]
pub async fn update_architecture_doc_block(
    id: String,
    updates: UpdateArchitectureDocBlock,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<ArchitectureDocBlock, RigidError> {
    repo.update_block(&id, updates).await
}

#[tauri::command]
pub async fn delete_architecture_doc_block(
    id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<(), RigidError> {
    repo.delete_block(&id).await
}

#[tauri::command]
pub async fn delete_all_architecture_doc_blocks(
    doc_id: String,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<(), RigidError> {
    repo.delete_all_blocks(&doc_id).await
}

#[tauri::command]
pub async fn bulk_replace_architecture_doc_blocks(
    doc_id: String,
    blocks: Vec<NewArchitectureDocBlock>,
    repo: State<'_, ArchitectureDocRepository>,
) -> Result<Vec<ArchitectureDocBlock>, RigidError> {
    repo.bulk_replace_blocks(&doc_id, blocks).await
}
