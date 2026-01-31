use tauri::State;

use crate::error::RigidError;
use crate::models::{
    Screenshot, NewScreenshot, UpdateScreenshot, ScreenshotFilter,
    ScreenshotDrawing, NewScreenshotDrawing,
    ScreenshotMarker, NewScreenshotMarker, UpdateScreenshotMarker,
};
use crate::repositories::ScreenshotRepository;

#[tauri::command]
pub async fn create_screenshot(
    new_screenshot: NewScreenshot,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    repo.create(new_screenshot).await
}

#[tauri::command]
pub async fn get_screenshot(
    id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_screenshots(
    filter: ScreenshotFilter,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<Screenshot>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn update_screenshot(
    id: String,
    updates: UpdateScreenshot,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_screenshot(
    id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

// ==================== Screenshot Drawing Commands ====================

#[tauri::command]
pub async fn create_screenshot_drawing(
    new_drawing: NewScreenshotDrawing,
    repo: State<'_, ScreenshotRepository>,
) -> Result<ScreenshotDrawing, RigidError> {
    repo.create_drawing(new_drawing).await
}

#[tauri::command]
pub async fn list_screenshot_drawings(
    screenshot_id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<ScreenshotDrawing>, RigidError> {
    repo.list_drawings(&screenshot_id).await
}

#[tauri::command]
pub async fn delete_screenshot_drawing(
    id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<(), RigidError> {
    repo.delete_drawing(&id).await
}

#[tauri::command]
pub async fn delete_all_screenshot_drawings(
    screenshot_id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<(), RigidError> {
    repo.delete_all_drawings(&screenshot_id).await
}

#[tauri::command]
pub async fn bulk_create_screenshot_drawings(
    drawings: Vec<NewScreenshotDrawing>,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<ScreenshotDrawing>, RigidError> {
    repo.bulk_create_drawings(drawings).await
}

#[tauri::command]
pub async fn bulk_replace_screenshot_drawings(
    screenshot_id: String,
    drawings: Vec<NewScreenshotDrawing>,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<ScreenshotDrawing>, RigidError> {
    repo.delete_all_drawings(&screenshot_id).await?;
    repo.bulk_create_drawings(drawings).await
}

// ==================== Screenshot Marker Commands ====================

#[tauri::command]
pub async fn create_screenshot_marker(
    new_marker: NewScreenshotMarker,
    repo: State<'_, ScreenshotRepository>,
) -> Result<ScreenshotMarker, RigidError> {
    repo.create_marker(new_marker).await
}

#[tauri::command]
pub async fn get_screenshot_marker(
    id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<ScreenshotMarker, RigidError> {
    repo.get_marker(&id).await
}

#[tauri::command]
pub async fn list_screenshot_markers(
    screenshot_id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<ScreenshotMarker>, RigidError> {
    repo.list_markers(&screenshot_id).await
}

#[tauri::command]
pub async fn list_screenshot_markers_by_test(
    test_id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<ScreenshotMarker>, RigidError> {
    repo.list_markers_by_test(&test_id).await
}

#[tauri::command]
pub async fn update_screenshot_marker(
    id: String,
    updates: UpdateScreenshotMarker,
    repo: State<'_, ScreenshotRepository>,
) -> Result<ScreenshotMarker, RigidError> {
    repo.update_marker(&id, updates).await
}

#[tauri::command]
pub async fn delete_screenshot_marker(
    id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<(), RigidError> {
    repo.delete_marker(&id).await
}

#[tauri::command]
pub async fn delete_all_screenshot_markers(
    screenshot_id: String,
    repo: State<'_, ScreenshotRepository>,
) -> Result<(), RigidError> {
    repo.delete_all_markers(&screenshot_id).await
}

#[tauri::command]
pub async fn bulk_create_screenshot_markers(
    markers: Vec<NewScreenshotMarker>,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<ScreenshotMarker>, RigidError> {
    repo.bulk_create_markers(markers).await
}

#[tauri::command]
pub async fn bulk_replace_screenshot_markers(
    screenshot_id: String,
    markers: Vec<NewScreenshotMarker>,
    repo: State<'_, ScreenshotRepository>,
) -> Result<Vec<ScreenshotMarker>, RigidError> {
    repo.delete_all_markers(&screenshot_id).await?;
    repo.bulk_create_markers(markers).await
}
