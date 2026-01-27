use tauri::State;

use crate::error::TakaError;
use crate::models::{
    DocumentBlock, NewDocumentBlock, UpdateDocumentBlock,
    ExplorationTodo, NewExplorationTodo, UpdateExplorationTodo,
};
use crate::repositories::DocumentRepository;

// ==================== Document Block Commands ====================

#[tauri::command]
pub async fn create_document_block(
    new_block: NewDocumentBlock,
    repo: State<'_, DocumentRepository>,
) -> Result<DocumentBlock, TakaError> {
    repo.create_block(new_block).await
}

#[tauri::command]
pub async fn get_document_block(
    id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<DocumentBlock, TakaError> {
    repo.get_block(&id).await
}

#[tauri::command]
pub async fn list_document_blocks(
    test_id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<Vec<DocumentBlock>, TakaError> {
    repo.list_blocks(&test_id).await
}

#[tauri::command]
pub async fn update_document_block(
    id: String,
    updates: UpdateDocumentBlock,
    repo: State<'_, DocumentRepository>,
) -> Result<DocumentBlock, TakaError> {
    repo.update_block(&id, updates).await
}

#[tauri::command]
pub async fn delete_document_block(
    id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<(), TakaError> {
    repo.delete_block(&id).await
}

#[tauri::command]
pub async fn delete_all_document_blocks(
    test_id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<(), TakaError> {
    repo.delete_all_blocks(&test_id).await
}

#[tauri::command]
pub async fn bulk_replace_document_blocks(
    test_id: String,
    blocks: Vec<NewDocumentBlock>,
    repo: State<'_, DocumentRepository>,
) -> Result<Vec<DocumentBlock>, TakaError> {
    repo.bulk_replace_blocks(&test_id, blocks).await
}

// ==================== Exploration Todo Commands ====================

#[tauri::command]
pub async fn create_exploration_todo(
    new_todo: NewExplorationTodo,
    repo: State<'_, DocumentRepository>,
) -> Result<ExplorationTodo, TakaError> {
    repo.create_todo(new_todo).await
}

#[tauri::command]
pub async fn get_exploration_todo(
    id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<ExplorationTodo, TakaError> {
    repo.get_todo(&id).await
}

#[tauri::command]
pub async fn list_exploration_todos(
    test_id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<Vec<ExplorationTodo>, TakaError> {
    repo.list_todos(&test_id).await
}

#[tauri::command]
pub async fn update_exploration_todo(
    id: String,
    updates: UpdateExplorationTodo,
    repo: State<'_, DocumentRepository>,
) -> Result<ExplorationTodo, TakaError> {
    repo.update_todo(&id, updates).await
}

#[tauri::command]
pub async fn delete_exploration_todo(
    id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<(), TakaError> {
    repo.delete_todo(&id).await
}

#[tauri::command]
pub async fn delete_all_exploration_todos(
    test_id: String,
    repo: State<'_, DocumentRepository>,
) -> Result<(), TakaError> {
    repo.delete_all_todos(&test_id).await
}

#[tauri::command]
pub async fn bulk_replace_exploration_todos(
    test_id: String,
    todos: Vec<NewExplorationTodo>,
    repo: State<'_, DocumentRepository>,
) -> Result<Vec<ExplorationTodo>, TakaError> {
    repo.bulk_replace_todos(&test_id, todos).await
}
