use tauri::State;

use crate::error::TakaError;
use crate::models::{
    Demo, NewDemo, UpdateDemo, DemoFilter, DemoWithData,
    DemoBackground, NewDemoBackground, UpdateDemoBackground,
    DemoTrack, NewDemoTrack, UpdateDemoTrack,
    DemoClip, NewDemoClip, UpdateDemoClip,
    DemoZoomClip, NewDemoZoomClip, UpdateDemoZoomClip,
    DemoBlurClip, NewDemoBlurClip, UpdateDemoBlurClip,
    DemoAsset, NewDemoAsset, UpdateDemoAsset,
};
use crate::repositories::DemoRepository;

// ============ Demo Commands ============

#[tauri::command]
pub async fn demos_list(
    filter: DemoFilter,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<Demo>, TakaError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn demos_get(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Demo, TakaError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn demos_get_with_data(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<DemoWithData, TakaError> {
    repo.get_with_data(&id).await
}

#[tauri::command]
pub async fn demos_create(
    data: NewDemo,
    repo: State<'_, DemoRepository>,
) -> Result<Demo, TakaError> {
    repo.create(data).await
}

#[tauri::command]
pub async fn demos_update(
    id: String,
    updates: UpdateDemo,
    repo: State<'_, DemoRepository>,
) -> Result<Demo, TakaError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn demos_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.delete(&id).await
}

// ============ Background Commands ============

#[tauri::command]
pub async fn demo_backgrounds_get(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Option<DemoBackground>, TakaError> {
    repo.get_background(&demo_id).await
}

#[tauri::command]
pub async fn demo_backgrounds_create(
    data: NewDemoBackground,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBackground, TakaError> {
    repo.create_background(data).await
}

#[tauri::command]
pub async fn demo_backgrounds_update(
    id: String,
    updates: UpdateDemoBackground,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBackground, TakaError> {
    repo.update_background(&id, updates).await
}

#[tauri::command]
pub async fn demo_backgrounds_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.delete_background(&id).await
}

// ============ Track Commands ============

#[tauri::command]
pub async fn demo_tracks_list(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoTrack>, TakaError> {
    repo.list_tracks(&demo_id).await
}

#[tauri::command]
pub async fn demo_tracks_create(
    data: NewDemoTrack,
    repo: State<'_, DemoRepository>,
) -> Result<DemoTrack, TakaError> {
    repo.create_track(data).await
}

#[tauri::command]
pub async fn demo_tracks_update(
    id: String,
    updates: UpdateDemoTrack,
    repo: State<'_, DemoRepository>,
) -> Result<DemoTrack, TakaError> {
    repo.update_track(&id, updates).await
}

#[tauri::command]
pub async fn demo_tracks_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.delete_track(&id).await
}

#[tauri::command]
pub async fn demo_tracks_reorder(
    demo_id: String,
    track_ids: Vec<String>,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.reorder_tracks(&demo_id, track_ids).await
}

// ============ Clip Commands ============

#[tauri::command]
pub async fn demo_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoClip>, TakaError> {
    repo.list_clips(&track_id).await
}

#[tauri::command]
pub async fn demo_clips_create(
    data: NewDemoClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoClip, TakaError> {
    repo.create_clip(data).await
}

#[tauri::command]
pub async fn demo_clips_update(
    id: String,
    updates: UpdateDemoClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoClip, TakaError> {
    repo.update_clip(&id, updates).await
}

#[tauri::command]
pub async fn demo_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.delete_clip(&id).await
}

// ============ Zoom Clip Commands ============

#[tauri::command]
pub async fn demo_zoom_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoZoomClip>, TakaError> {
    repo.list_zoom_clips(&track_id).await
}

#[tauri::command]
pub async fn demo_zoom_clips_create(
    data: NewDemoZoomClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoZoomClip, TakaError> {
    repo.create_zoom_clip(data).await
}

#[tauri::command]
pub async fn demo_zoom_clips_update(
    id: String,
    updates: UpdateDemoZoomClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoZoomClip, TakaError> {
    repo.update_zoom_clip(&id, updates).await
}

#[tauri::command]
pub async fn demo_zoom_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.delete_zoom_clip(&id).await
}

// ============ Blur Clip Commands ============

#[tauri::command]
pub async fn demo_blur_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoBlurClip>, TakaError> {
    repo.list_blur_clips(&track_id).await
}

#[tauri::command]
pub async fn demo_blur_clips_create(
    data: NewDemoBlurClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBlurClip, TakaError> {
    repo.create_blur_clip(data).await
}

#[tauri::command]
pub async fn demo_blur_clips_update(
    id: String,
    updates: UpdateDemoBlurClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBlurClip, TakaError> {
    repo.update_blur_clip(&id, updates).await
}

#[tauri::command]
pub async fn demo_blur_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.delete_blur_clip(&id).await
}

// ============ Asset Commands ============

#[tauri::command]
pub async fn demo_assets_list(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoAsset>, TakaError> {
    repo.list_assets(&demo_id).await
}

#[tauri::command]
pub async fn demo_assets_create(
    data: NewDemoAsset,
    repo: State<'_, DemoRepository>,
) -> Result<DemoAsset, TakaError> {
    repo.create_asset(data).await
}

#[tauri::command]
pub async fn demo_assets_update(
    id: String,
    updates: UpdateDemoAsset,
    repo: State<'_, DemoRepository>,
) -> Result<DemoAsset, TakaError> {
    repo.update_asset(&id, updates).await
}

#[tauri::command]
pub async fn demo_assets_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), TakaError> {
    repo.delete_asset(&id).await
}
