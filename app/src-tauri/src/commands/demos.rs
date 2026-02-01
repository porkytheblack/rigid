use tauri::State;

use crate::error::RigidError;
use crate::models::{
    Demo, NewDemo, UpdateDemo, DemoFilter, DemoWithData,
    DemoBackground, NewDemoBackground, UpdateDemoBackground,
    DemoTrack, NewDemoTrack, UpdateDemoTrack,
    DemoClip, NewDemoClip, UpdateDemoClip,
    DemoZoomClip, NewDemoZoomClip, UpdateDemoZoomClip,
    DemoBlurClip, NewDemoBlurClip, UpdateDemoBlurClip,
    DemoPanClip, NewDemoPanClip, UpdateDemoPanClip,
    DemoAsset, NewDemoAsset, UpdateDemoAsset,
    DemoRecording, NewDemoRecording,
    DemoScreenshot, NewDemoScreenshot,
    DemoVideo, NewDemoVideo, UpdateDemoVideo,
    Recording, Screenshot,
    // Video editor types
    VideoWithData,
    VideoBackground, NewVideoBackground, UpdateVideoBackground,
    VideoTrack, NewVideoTrack, UpdateVideoTrack,
    VideoClip, NewVideoClip, UpdateVideoClip,
    VideoZoomClip, NewVideoZoomClip, UpdateVideoZoomClip,
    VideoBlurClip, NewVideoBlurClip, UpdateVideoBlurClip,
    VideoPanClip, NewVideoPanClip, UpdateVideoPanClip,
    VideoAsset, NewVideoAsset, UpdateVideoAsset,
};
use crate::repositories::DemoRepository;

// ============ Demo Commands ============

#[tauri::command]
pub async fn demos_list(
    filter: DemoFilter,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<Demo>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn demos_get(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Demo, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn demos_get_with_data(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<DemoWithData, RigidError> {
    repo.get_with_data(&id).await
}

#[tauri::command]
pub async fn demos_create(
    data: NewDemo,
    repo: State<'_, DemoRepository>,
) -> Result<Demo, RigidError> {
    repo.create(data).await
}

#[tauri::command]
pub async fn demos_update(
    id: String,
    updates: UpdateDemo,
    repo: State<'_, DemoRepository>,
) -> Result<Demo, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn demos_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

// ============ Background Commands ============

#[tauri::command]
pub async fn demo_backgrounds_get(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Option<DemoBackground>, RigidError> {
    repo.get_background(&demo_id).await
}

#[tauri::command]
pub async fn demo_backgrounds_create(
    data: NewDemoBackground,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBackground, RigidError> {
    repo.create_background(data).await
}

#[tauri::command]
pub async fn demo_backgrounds_update(
    id: String,
    updates: UpdateDemoBackground,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBackground, RigidError> {
    repo.update_background(&id, updates).await
}

#[tauri::command]
pub async fn demo_backgrounds_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_background(&id).await
}

// ============ Track Commands ============

#[tauri::command]
pub async fn demo_tracks_list(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoTrack>, RigidError> {
    repo.list_tracks(&demo_id).await
}

#[tauri::command]
pub async fn demo_tracks_create(
    data: NewDemoTrack,
    repo: State<'_, DemoRepository>,
) -> Result<DemoTrack, RigidError> {
    repo.create_track(data).await
}

#[tauri::command]
pub async fn demo_tracks_update(
    id: String,
    updates: UpdateDemoTrack,
    repo: State<'_, DemoRepository>,
) -> Result<DemoTrack, RigidError> {
    repo.update_track(&id, updates).await
}

#[tauri::command]
pub async fn demo_tracks_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_track(&id).await
}

#[tauri::command]
pub async fn demo_tracks_reorder(
    demo_id: String,
    track_ids: Vec<String>,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.reorder_tracks(&demo_id, track_ids).await
}

// ============ Clip Commands ============

#[tauri::command]
pub async fn demo_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoClip>, RigidError> {
    repo.list_clips(&track_id).await
}

#[tauri::command]
pub async fn demo_clips_create(
    data: NewDemoClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoClip, RigidError> {
    repo.create_clip(data).await
}

#[tauri::command]
pub async fn demo_clips_update(
    id: String,
    updates: UpdateDemoClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoClip, RigidError> {
    repo.update_clip(&id, updates).await
}

#[tauri::command]
pub async fn demo_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_clip(&id).await
}

// ============ Zoom Clip Commands ============

#[tauri::command]
pub async fn demo_zoom_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoZoomClip>, RigidError> {
    repo.list_zoom_clips(&track_id).await
}

#[tauri::command]
pub async fn demo_zoom_clips_create(
    data: NewDemoZoomClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoZoomClip, RigidError> {
    repo.create_zoom_clip(data).await
}

#[tauri::command]
pub async fn demo_zoom_clips_update(
    id: String,
    updates: UpdateDemoZoomClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoZoomClip, RigidError> {
    repo.update_zoom_clip(&id, updates).await
}

#[tauri::command]
pub async fn demo_zoom_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_zoom_clip(&id).await
}

// ============ Blur Clip Commands ============

#[tauri::command]
pub async fn demo_blur_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoBlurClip>, RigidError> {
    repo.list_blur_clips(&track_id).await
}

#[tauri::command]
pub async fn demo_blur_clips_create(
    data: NewDemoBlurClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBlurClip, RigidError> {
    repo.create_blur_clip(data).await
}

#[tauri::command]
pub async fn demo_blur_clips_update(
    id: String,
    updates: UpdateDemoBlurClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoBlurClip, RigidError> {
    repo.update_blur_clip(&id, updates).await
}

#[tauri::command]
pub async fn demo_blur_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_blur_clip(&id).await
}

// ============ Pan Clip Commands ============

#[tauri::command]
pub async fn demo_pan_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoPanClip>, RigidError> {
    repo.list_pan_clips(&track_id).await
}

#[tauri::command]
pub async fn demo_pan_clips_create(
    data: NewDemoPanClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoPanClip, RigidError> {
    repo.create_pan_clip(data).await
}

#[tauri::command]
pub async fn demo_pan_clips_update(
    id: String,
    updates: UpdateDemoPanClip,
    repo: State<'_, DemoRepository>,
) -> Result<DemoPanClip, RigidError> {
    repo.update_pan_clip(&id, updates).await
}

#[tauri::command]
pub async fn demo_pan_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_pan_clip(&id).await
}

// ============ Asset Commands ============

#[tauri::command]
pub async fn demo_assets_list(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoAsset>, RigidError> {
    repo.list_assets(&demo_id).await
}

#[tauri::command]
pub async fn demo_assets_create(
    data: NewDemoAsset,
    repo: State<'_, DemoRepository>,
) -> Result<DemoAsset, RigidError> {
    repo.create_asset(data).await
}

#[tauri::command]
pub async fn demo_assets_update(
    id: String,
    updates: UpdateDemoAsset,
    repo: State<'_, DemoRepository>,
) -> Result<DemoAsset, RigidError> {
    repo.update_asset(&id, updates).await
}

#[tauri::command]
pub async fn demo_assets_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_asset(&id).await
}

// ============ Demo Recording Link Commands ============

#[tauri::command]
pub async fn demo_recordings_list(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoRecording>, RigidError> {
    repo.list_demo_recordings(&demo_id).await
}

#[tauri::command]
pub async fn demo_recordings_list_with_data(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<Recording>, RigidError> {
    repo.list_demo_recordings_with_data(&demo_id).await
}

#[tauri::command]
pub async fn demo_recordings_add(
    data: NewDemoRecording,
    repo: State<'_, DemoRepository>,
) -> Result<DemoRecording, RigidError> {
    repo.add_demo_recording(data).await
}

#[tauri::command]
pub async fn demo_recordings_remove(
    demo_id: String,
    recording_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.remove_demo_recording(&demo_id, &recording_id).await
}

// ============ Demo Screenshot Link Commands ============

#[tauri::command]
pub async fn demo_screenshots_list(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoScreenshot>, RigidError> {
    repo.list_demo_screenshots(&demo_id).await
}

#[tauri::command]
pub async fn demo_screenshots_list_with_data(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<Screenshot>, RigidError> {
    repo.list_demo_screenshots_with_data(&demo_id).await
}

#[tauri::command]
pub async fn demo_screenshots_add(
    data: NewDemoScreenshot,
    repo: State<'_, DemoRepository>,
) -> Result<DemoScreenshot, RigidError> {
    repo.add_demo_screenshot(data).await
}

#[tauri::command]
pub async fn demo_screenshots_remove(
    demo_id: String,
    screenshot_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.remove_demo_screenshot(&demo_id, &screenshot_id).await
}

// ============ Demo Video Commands ============

#[tauri::command]
pub async fn demo_videos_list(
    demo_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<DemoVideo>, RigidError> {
    repo.list_demo_videos(&demo_id).await
}

#[tauri::command]
pub async fn demo_videos_get(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<DemoVideo, RigidError> {
    repo.get_demo_video(&id).await
}

#[tauri::command]
pub async fn demo_videos_create(
    data: NewDemoVideo,
    repo: State<'_, DemoRepository>,
) -> Result<DemoVideo, RigidError> {
    repo.create_demo_video(data).await
}

#[tauri::command]
pub async fn demo_videos_update(
    id: String,
    data: UpdateDemoVideo,
    repo: State<'_, DemoRepository>,
) -> Result<DemoVideo, RigidError> {
    repo.update_demo_video(&id, data).await
}

#[tauri::command]
pub async fn demo_videos_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_demo_video(&id).await
}

// ============ Video Editor State Commands ============

#[tauri::command]
pub async fn video_editor_get_with_data(
    video_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<VideoWithData, RigidError> {
    repo.get_video_with_data(&video_id).await
}

// ============ Video Background Commands ============

#[tauri::command]
pub async fn video_backgrounds_get(
    video_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Option<VideoBackground>, RigidError> {
    repo.get_video_background(&video_id).await
}

#[tauri::command]
pub async fn video_backgrounds_create(
    data: NewVideoBackground,
    repo: State<'_, DemoRepository>,
) -> Result<VideoBackground, RigidError> {
    repo.create_video_background(data).await
}

#[tauri::command]
pub async fn video_backgrounds_update(
    id: String,
    updates: UpdateVideoBackground,
    repo: State<'_, DemoRepository>,
) -> Result<VideoBackground, RigidError> {
    repo.update_video_background(&id, updates).await
}

#[tauri::command]
pub async fn video_backgrounds_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_video_background(&id).await
}

// ============ Video Track Commands ============

#[tauri::command]
pub async fn video_tracks_list(
    video_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<VideoTrack>, RigidError> {
    repo.list_video_tracks(&video_id).await
}

#[tauri::command]
pub async fn video_tracks_create(
    data: NewVideoTrack,
    repo: State<'_, DemoRepository>,
) -> Result<VideoTrack, RigidError> {
    repo.create_video_track(data).await
}

#[tauri::command]
pub async fn video_tracks_update(
    id: String,
    updates: UpdateVideoTrack,
    repo: State<'_, DemoRepository>,
) -> Result<VideoTrack, RigidError> {
    repo.update_video_track(&id, updates).await
}

#[tauri::command]
pub async fn video_tracks_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_video_track(&id).await
}

#[tauri::command]
pub async fn video_tracks_reorder(
    video_id: String,
    track_ids: Vec<String>,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.reorder_video_tracks(&video_id, track_ids).await
}

// ============ Video Clip Commands ============

#[tauri::command]
pub async fn video_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<VideoClip>, RigidError> {
    repo.list_video_clips(&track_id).await
}

#[tauri::command]
pub async fn video_clips_get(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<VideoClip, RigidError> {
    repo.get_video_clip(&id).await
}

#[tauri::command]
pub async fn video_clips_create(
    data: NewVideoClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoClip, RigidError> {
    repo.create_video_clip(data).await
}

#[tauri::command]
pub async fn video_clips_update(
    id: String,
    updates: UpdateVideoClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoClip, RigidError> {
    repo.update_video_clip(&id, updates).await
}

#[tauri::command]
pub async fn video_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_video_clip(&id).await
}

// ============ Video Zoom Clip Commands ============

#[tauri::command]
pub async fn video_zoom_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<VideoZoomClip>, RigidError> {
    repo.list_video_zoom_clips(&track_id).await
}

#[tauri::command]
pub async fn video_zoom_clips_create(
    data: NewVideoZoomClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoZoomClip, RigidError> {
    repo.create_video_zoom_clip(data).await
}

#[tauri::command]
pub async fn video_zoom_clips_update(
    id: String,
    updates: UpdateVideoZoomClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoZoomClip, RigidError> {
    repo.update_video_zoom_clip(&id, updates).await
}

#[tauri::command]
pub async fn video_zoom_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_video_zoom_clip(&id).await
}

// ============ Video Blur Clip Commands ============

#[tauri::command]
pub async fn video_blur_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<VideoBlurClip>, RigidError> {
    repo.list_video_blur_clips(&track_id).await
}

#[tauri::command]
pub async fn video_blur_clips_create(
    data: NewVideoBlurClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoBlurClip, RigidError> {
    repo.create_video_blur_clip(data).await
}

#[tauri::command]
pub async fn video_blur_clips_update(
    id: String,
    updates: UpdateVideoBlurClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoBlurClip, RigidError> {
    repo.update_video_blur_clip(&id, updates).await
}

#[tauri::command]
pub async fn video_blur_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_video_blur_clip(&id).await
}

// ============ Video Pan Clip Commands ============

#[tauri::command]
pub async fn video_pan_clips_list(
    track_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<VideoPanClip>, RigidError> {
    repo.list_video_pan_clips(&track_id).await
}

#[tauri::command]
pub async fn video_pan_clips_create(
    data: NewVideoPanClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoPanClip, RigidError> {
    repo.create_video_pan_clip(data).await
}

#[tauri::command]
pub async fn video_pan_clips_update(
    id: String,
    updates: UpdateVideoPanClip,
    repo: State<'_, DemoRepository>,
) -> Result<VideoPanClip, RigidError> {
    repo.update_video_pan_clip(&id, updates).await
}

#[tauri::command]
pub async fn video_pan_clips_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_video_pan_clip(&id).await
}

// ============ Video Asset Commands ============

#[tauri::command]
pub async fn video_assets_list(
    video_id: String,
    repo: State<'_, DemoRepository>,
) -> Result<Vec<VideoAsset>, RigidError> {
    repo.list_video_assets(&video_id).await
}

#[tauri::command]
pub async fn video_assets_create(
    data: NewVideoAsset,
    repo: State<'_, DemoRepository>,
) -> Result<VideoAsset, RigidError> {
    repo.create_video_asset(data).await
}

#[tauri::command]
pub async fn video_assets_update(
    id: String,
    updates: UpdateVideoAsset,
    repo: State<'_, DemoRepository>,
) -> Result<VideoAsset, RigidError> {
    repo.update_video_asset(&id, updates).await
}

#[tauri::command]
pub async fn video_assets_delete(
    id: String,
    repo: State<'_, DemoRepository>,
) -> Result<(), RigidError> {
    repo.delete_video_asset(&id).await
}
