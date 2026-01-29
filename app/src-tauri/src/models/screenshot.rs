use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Screenshot {
    pub id: String,
    pub app_id: Option<String>,
    pub test_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub image_path: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewScreenshot {
    pub app_id: Option<String>,
    pub test_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub image_path: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateScreenshot {
    pub title: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
pub struct ScreenshotFilter {
    pub test_id: Option<String>,
    pub app_id: Option<String>,
    pub limit: Option<i32>,
}

// Screenshot drawing annotations (arrows, rectangles, circles, text, freehand)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScreenshotDrawing {
    pub id: String,
    pub screenshot_id: String,
    pub tool_type: String, // arrow, rectangle, circle, text, freehand, eraser
    pub color: String,
    pub stroke_width: i32,
    pub points: Option<String>, // JSON array of {x, y} for freehand
    pub start_x: Option<f64>,
    pub start_y: Option<f64>,
    pub end_x: Option<f64>,
    pub end_y: Option<f64>,
    pub text_content: Option<String>,
    pub font_size: Option<i32>,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewScreenshotDrawing {
    pub screenshot_id: String,
    pub tool_type: String,
    pub color: String,
    pub stroke_width: Option<i32>,
    pub points: Option<String>,
    pub start_x: Option<f64>,
    pub start_y: Option<f64>,
    pub end_x: Option<f64>,
    pub end_y: Option<f64>,
    pub text_content: Option<String>,
    pub font_size: Option<i32>,
    pub sort_order: Option<i32>,
}

// Screenshot markers (labeled annotations with title, description, severity)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct ScreenshotMarker {
    pub id: String,
    pub screenshot_id: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: String, // info, warning, error, success
    pub position_x: f64,
    pub position_y: f64,
    pub issue_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewScreenshotMarker {
    pub screenshot_id: String,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub position_x: f64,
    pub position_y: f64,
    pub issue_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateScreenshotMarker {
    pub title: Option<String>,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub issue_id: Option<String>,
}
