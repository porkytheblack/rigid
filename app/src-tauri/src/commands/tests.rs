use tauri::State;

use crate::error::TakaError;
use crate::models::{Test, NewTest, UpdateTest, TestFilter};
use crate::repositories::TestRepository;

#[tauri::command]
pub async fn create_test(
    new_test: NewTest,
    repo: State<'_, TestRepository>,
) -> Result<Test, TakaError> {
    repo.create(new_test).await
}

#[tauri::command]
pub async fn get_test(
    id: String,
    repo: State<'_, TestRepository>,
) -> Result<Test, TakaError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_tests(
    filter: TestFilter,
    repo: State<'_, TestRepository>,
) -> Result<Vec<Test>, TakaError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn list_tests_by_app(
    app_id: String,
    repo: State<'_, TestRepository>,
) -> Result<Vec<Test>, TakaError> {
    repo.list_by_app(&app_id).await
}

#[tauri::command]
pub async fn update_test(
    id: String,
    updates: UpdateTest,
    repo: State<'_, TestRepository>,
) -> Result<Test, TakaError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_test(
    id: String,
    repo: State<'_, TestRepository>,
) -> Result<(), TakaError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn count_tests_by_app(
    app_id: String,
    repo: State<'_, TestRepository>,
) -> Result<i32, TakaError> {
    repo.count_by_app(&app_id).await
}

#[tauri::command]
pub async fn count_tests_by_status(
    status: String,
    repo: State<'_, TestRepository>,
) -> Result<i32, TakaError> {
    repo.count_by_status(&status).await
}
