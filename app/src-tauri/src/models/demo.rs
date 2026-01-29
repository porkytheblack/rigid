use serde::{Deserialize, Serialize};

// ============ Demo ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Demo {
    pub id: String,
    pub app_id: String,
    pub name: String,
    pub format: String,
    pub width: i32,
    pub height: i32,
    pub frame_rate: i32,
    pub duration_ms: i64,
    pub thumbnail_path: Option<String>,
    pub export_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemo {
    pub app_id: String,
    pub name: String,
    pub format: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub frame_rate: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDemo {
    pub name: Option<String>,
    pub format: Option<String>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub frame_rate: Option<i32>,
    pub duration_ms: Option<i64>,
    pub thumbnail_path: Option<String>,
    pub export_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DemoFilter {
    pub app_id: Option<String>,
    pub limit: Option<i32>,
}

// ============ Demo Background ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoBackground {
    pub id: String,
    pub demo_id: String,
    pub background_type: String,
    pub color: Option<String>,
    pub gradient_stops: Option<String>,
    pub gradient_direction: Option<String>,
    pub gradient_angle: Option<f64>,
    pub pattern_type: Option<String>,
    pub pattern_color: Option<String>,
    pub pattern_scale: Option<f64>,
    pub media_path: Option<String>,
    pub media_scale: Option<f64>,
    pub media_position_x: Option<f64>,
    pub media_position_y: Option<f64>,
    pub image_url: Option<String>,
    pub image_attribution: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoBackground {
    pub demo_id: String,
    pub background_type: String,
    pub color: Option<String>,
    pub gradient_stops: Option<String>,
    pub gradient_direction: Option<String>,
    pub gradient_angle: Option<f64>,
    pub pattern_type: Option<String>,
    pub pattern_color: Option<String>,
    pub pattern_scale: Option<f64>,
    pub media_path: Option<String>,
    pub media_scale: Option<f64>,
    pub media_position_x: Option<f64>,
    pub media_position_y: Option<f64>,
    pub image_url: Option<String>,
    pub image_attribution: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDemoBackground {
    pub background_type: Option<String>,
    pub color: Option<String>,
    pub gradient_stops: Option<String>,
    pub gradient_direction: Option<String>,
    pub gradient_angle: Option<f64>,
    pub pattern_type: Option<String>,
    pub pattern_color: Option<String>,
    pub pattern_scale: Option<f64>,
    pub media_path: Option<String>,
    pub media_scale: Option<f64>,
    pub media_position_x: Option<f64>,
    pub media_position_y: Option<f64>,
    pub image_url: Option<String>,
    pub image_attribution: Option<String>,
}

// ============ Demo Track ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoTrack {
    pub id: String,
    pub demo_id: String,
    pub track_type: String,
    pub name: String,
    pub locked: bool,
    pub visible: bool,
    pub muted: bool,
    pub volume: f64,
    pub sort_order: i32,
    pub target_track_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoTrack {
    pub id: Option<String>,  // Allow client to provide ID for consistency
    pub demo_id: String,
    pub track_type: String,
    pub name: String,
    pub sort_order: Option<i32>,
    pub target_track_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDemoTrack {
    pub name: Option<String>,
    pub locked: Option<bool>,
    pub visible: Option<bool>,
    pub muted: Option<bool>,
    pub volume: Option<f64>,
    pub sort_order: Option<i32>,
    pub target_track_id: Option<String>,
}

// ============ Demo Clip ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoClip {
    pub id: String,
    pub track_id: String,
    pub name: String,
    pub source_path: String,
    pub source_type: String,
    pub source_duration_ms: Option<i64>,
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub in_point_ms: i64,
    pub out_point_ms: Option<i64>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub scale: Option<f64>,
    pub rotation: Option<f64>,
    pub crop_top: Option<f64>,
    pub crop_bottom: Option<f64>,
    pub crop_left: Option<f64>,
    pub crop_right: Option<f64>,
    pub corner_radius: Option<f64>,
    pub opacity: Option<f64>,
    pub shadow_enabled: bool,
    pub shadow_blur: Option<f64>,
    pub shadow_offset_x: Option<f64>,
    pub shadow_offset_y: Option<f64>,
    pub shadow_color: Option<String>,
    pub volume: f64,
    pub muted: bool,
    pub linked_clip_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoClip {
    pub id: Option<String>,  // Allow client to provide ID
    pub track_id: String,
    pub name: String,
    pub source_path: String,
    pub source_type: String,
    pub source_duration_ms: Option<i64>,
    pub start_time_ms: Option<i64>,
    pub duration_ms: i64,
    pub in_point_ms: Option<i64>,
    pub out_point_ms: Option<i64>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub scale: Option<f64>,
    pub rotation: Option<f64>,
    pub crop_top: Option<f64>,
    pub crop_bottom: Option<f64>,
    pub crop_left: Option<f64>,
    pub crop_right: Option<f64>,
    pub corner_radius: Option<f64>,
    pub opacity: Option<f64>,
    pub shadow_enabled: Option<bool>,
    pub shadow_blur: Option<f64>,
    pub shadow_offset_x: Option<f64>,
    pub shadow_offset_y: Option<f64>,
    pub shadow_color: Option<String>,
    pub volume: Option<f64>,
    pub muted: Option<bool>,
    pub linked_clip_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDemoClip {
    pub name: Option<String>,
    pub start_time_ms: Option<i64>,
    pub duration_ms: Option<i64>,
    pub in_point_ms: Option<i64>,
    pub out_point_ms: Option<i64>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub scale: Option<f64>,
    pub rotation: Option<f64>,
    pub crop_top: Option<f64>,
    pub crop_bottom: Option<f64>,
    pub crop_left: Option<f64>,
    pub crop_right: Option<f64>,
    pub corner_radius: Option<f64>,
    pub opacity: Option<f64>,
    pub shadow_enabled: Option<bool>,
    pub shadow_blur: Option<f64>,
    pub shadow_offset_x: Option<f64>,
    pub shadow_offset_y: Option<f64>,
    pub shadow_color: Option<String>,
    pub volume: Option<f64>,
    pub muted: Option<bool>,
    pub linked_clip_id: Option<String>,
}

// ============ Demo Zoom Clip ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoZoomClip {
    pub id: String,
    pub track_id: String,
    pub name: String,
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub zoom_scale: f64,
    pub zoom_center_x: f64,
    pub zoom_center_y: f64,
    pub ease_in_duration_ms: i64,
    pub ease_out_duration_ms: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoZoomClip {
    pub id: Option<String>, // Allow client to provide ID
    pub track_id: String,
    pub name: String,
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub zoom_scale: Option<f64>,
    pub zoom_center_x: Option<f64>,
    pub zoom_center_y: Option<f64>,
    pub ease_in_duration_ms: Option<i64>,
    pub ease_out_duration_ms: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDemoZoomClip {
    pub name: Option<String>,
    pub start_time_ms: Option<i64>,
    pub duration_ms: Option<i64>,
    pub zoom_scale: Option<f64>,
    pub zoom_center_x: Option<f64>,
    pub zoom_center_y: Option<f64>,
    pub ease_in_duration_ms: Option<i64>,
    pub ease_out_duration_ms: Option<i64>,
}

// ============ Demo Blur Clip ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoBlurClip {
    pub id: String,
    pub track_id: String,
    pub name: String,
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub blur_intensity: f64,
    pub region_x: f64,
    pub region_y: f64,
    pub region_width: f64,
    pub region_height: f64,
    pub corner_radius: f64,
    pub blur_inside: bool,
    pub ease_in_duration_ms: i64,
    pub ease_out_duration_ms: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoBlurClip {
    pub id: Option<String>, // Allow client to provide ID
    pub track_id: String,
    pub name: String,
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub blur_intensity: Option<f64>,
    pub region_x: Option<f64>,
    pub region_y: Option<f64>,
    pub region_width: Option<f64>,
    pub region_height: Option<f64>,
    pub corner_radius: Option<f64>,
    pub blur_inside: Option<bool>,
    pub ease_in_duration_ms: Option<i64>,
    pub ease_out_duration_ms: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDemoBlurClip {
    pub name: Option<String>,
    pub start_time_ms: Option<i64>,
    pub duration_ms: Option<i64>,
    pub blur_intensity: Option<f64>,
    pub region_x: Option<f64>,
    pub region_y: Option<f64>,
    pub region_width: Option<f64>,
    pub region_height: Option<f64>,
    pub corner_radius: Option<f64>,
    pub blur_inside: Option<bool>,
    pub ease_in_duration_ms: Option<i64>,
    pub ease_out_duration_ms: Option<i64>,
}

// ============ Demo Asset ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoAsset {
    pub id: String,
    pub demo_id: String,
    pub name: String,
    pub file_path: String,
    pub asset_type: String,
    pub duration_ms: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub thumbnail_path: Option<String>,
    pub file_size: Option<i64>,
    pub has_audio: Option<bool>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoAsset {
    pub id: Option<String>, // Allow client to provide ID
    pub demo_id: String,
    pub name: String,
    pub file_path: String,
    pub asset_type: String,
    pub duration_ms: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub thumbnail_path: Option<String>,
    pub file_size: Option<i64>,
    pub has_audio: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDemoAsset {
    pub name: Option<String>,
    pub thumbnail_path: Option<String>,
}

// ============ Demo Recording Link ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoRecording {
    pub id: String,
    pub demo_id: String,
    pub recording_id: String,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoRecording {
    pub demo_id: String,
    pub recording_id: String,
    pub sort_order: Option<i32>,
}

// ============ Demo Screenshot Link ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DemoScreenshot {
    pub id: String,
    pub demo_id: String,
    pub screenshot_id: String,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDemoScreenshot {
    pub demo_id: String,
    pub screenshot_id: String,
    pub sort_order: Option<i32>,
}

// ============ Full Demo With Data ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DemoWithData {
    pub demo: Demo,
    pub background: Option<DemoBackground>,
    pub tracks: Vec<DemoTrack>,
    pub clips: Vec<DemoClip>,
    #[serde(rename = "zoomClips")]
    pub zoom_clips: Vec<DemoZoomClip>,
    #[serde(rename = "blurClips")]
    pub blur_clips: Vec<DemoBlurClip>,
    pub assets: Vec<DemoAsset>,
}
