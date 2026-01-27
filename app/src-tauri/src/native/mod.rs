//! Platform-specific native capture implementations
//!
//! This module provides high-quality screen capture using platform-native APIs:
//! - macOS: ScreenCaptureKit via Swift FFI
//! - Other platforms: Fallback to screencapture CLI tool

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "macos")]
pub use macos::*;

// Fallback for other platforms - keeps existing screencapture behavior
#[cfg(not(target_os = "macos"))]
pub mod fallback;

#[cfg(not(target_os = "macos"))]
pub use fallback::*;

/// Video codec for recording
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum VideoCodec {
    H264,
    #[default]
    Hevc,
    ProRes422,
    ProRes422HQ,
}

impl VideoCodec {
    pub fn file_extension(&self) -> &'static str {
        match self {
            VideoCodec::H264 | VideoCodec::Hevc => "mp4",
            VideoCodec::ProRes422 | VideoCodec::ProRes422HQ => "mov",
        }
    }
}

impl std::str::FromStr for VideoCodec {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "h264" | "h.264" | "avc" => Ok(VideoCodec::H264),
            "hevc" | "h265" | "h.265" => Ok(VideoCodec::Hevc),
            "prores" | "prores422" | "prores_422" => Ok(VideoCodec::ProRes422),
            "prores422hq" | "prores_422_hq" => Ok(VideoCodec::ProRes422HQ),
            _ => Err(format!("Unknown codec: {}", s)),
        }
    }
}

/// Configuration for video recording
#[derive(Debug, Clone)]
pub struct RecordingConfig {
    /// Logical width (will be multiplied by scale_factor for actual pixels)
    pub width: u32,
    /// Logical height (will be multiplied by scale_factor for actual pixels)
    pub height: u32,
    /// Frames per second (default: 60)
    pub fps: u32,
    /// Bitrate in bits per second (default: 20 Mbps)
    pub bitrate: u32,
    /// Keyframe interval in frames (default: 60 = 1 second at 60fps)
    pub keyframe_interval: u32,
    /// Video codec to use
    pub codec: VideoCodec,
    /// Show mouse cursor in recording
    pub capture_cursor: bool,
    /// Capture audio
    pub capture_audio: bool,
    /// Scale factor (1.0 = logical, 2.0 = retina backing resolution)
    pub scale_factor: f32,
}

impl Default for RecordingConfig {
    fn default() -> Self {
        Self {
            width: 1920,
            height: 1080,
            fps: 60,
            bitrate: 20_000_000, // 20 Mbps
            keyframe_interval: 60, // 1 second at 60fps
            codec: VideoCodec::Hevc,
            capture_cursor: true,
            capture_audio: false,
            scale_factor: 2.0, // Retina
        }
    }
}

/// Configuration for screenshots
#[derive(Debug, Clone)]
pub struct ScreenshotConfig {
    /// Scale factor (1.0 = logical, 2.0 = retina backing resolution)
    pub scale_factor: f32,
    /// Show mouse cursor in screenshot
    pub capture_cursor: bool,
}

impl Default for ScreenshotConfig {
    fn default() -> Self {
        Self {
            scale_factor: 2.0, // Retina
            capture_cursor: false,
        }
    }
}

/// Window information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NativeWindowInfo {
    pub window_id: u32,
    pub title: String,
    pub owner_name: String,
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
    pub backing_scale_factor: f32,
}

/// Display information
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct NativeDisplayInfo {
    pub display_id: u32,
    pub name: String,
    pub width: i32,
    pub height: i32,
    pub backing_scale_factor: f32,
    pub is_main: bool,
}

/// Capture error types
#[derive(Debug, thiserror::Error)]
pub enum CaptureError {
    #[error("Not authorized for screen capture")]
    NotAuthorized,
    #[error("Invalid configuration")]
    InvalidConfig,
    #[error("Recording failed: {0}")]
    RecordingFailed(String),
    #[error("Encoding failed")]
    EncodingFailed,
    #[error("No active recording")]
    NoRecording,
    #[error("Screenshot failed: {0}")]
    ScreenshotFailed(String),
    #[error("Window not found: {0}")]
    WindowNotFound(u32),
    #[error("Display not found: {0}")]
    DisplayNotFound(u32),
    #[error("Platform not supported")]
    PlatformNotSupported,
    #[error("Unknown error: {0}")]
    Unknown(i32),
}

impl CaptureError {
    #[cfg(target_os = "macos")]
    pub(crate) fn from_code(code: i32) -> Self {
        match code {
            0 => panic!("from_code called with success code"),
            1 => CaptureError::NotAuthorized,
            2 => CaptureError::InvalidConfig,
            3 => CaptureError::RecordingFailed("Native recording error".into()),
            4 => CaptureError::EncodingFailed,
            5 => CaptureError::NoRecording,
            6 => CaptureError::ScreenshotFailed("Native screenshot error".into()),
            7 => CaptureError::WindowNotFound(0),
            8 => CaptureError::DisplayNotFound(0),
            _ => CaptureError::Unknown(code),
        }
    }
}
