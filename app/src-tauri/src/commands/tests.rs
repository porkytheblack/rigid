use tauri::State;

use crate::error::RigidError;
use crate::models::{Test, NewTest, UpdateTest, TestFilter};
use crate::repositories::TestRepository;

#[tauri::command]
pub async fn create_test(
    new_test: NewTest,
    repo: State<'_, TestRepository>,
) -> Result<Test, RigidError> {
    repo.create(new_test).await
}

#[tauri::command]
pub async fn get_test(
    id: String,
    repo: State<'_, TestRepository>,
) -> Result<Test, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_tests(
    filter: TestFilter,
    repo: State<'_, TestRepository>,
) -> Result<Vec<Test>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn list_tests_by_app(
    app_id: String,
    repo: State<'_, TestRepository>,
) -> Result<Vec<Test>, RigidError> {
    repo.list_by_app(&app_id).await
}

#[tauri::command]
pub async fn update_test(
    id: String,
    updates: UpdateTest,
    repo: State<'_, TestRepository>,
) -> Result<Test, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_test(
    id: String,
    repo: State<'_, TestRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn count_tests_by_app(
    app_id: String,
    repo: State<'_, TestRepository>,
) -> Result<i32, RigidError> {
    repo.count_by_app(&app_id).await
}

#[tauri::command]
pub async fn count_tests_by_status(
    status: String,
    repo: State<'_, TestRepository>,
) -> Result<i32, RigidError> {
    repo.count_by_status(&status).await
}
