//! Fallback capture implementation for non-macOS platforms
//!
//! This module provides basic screen capture using command-line tools
//! for platforms where native ScreenCaptureKit is not available.

use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;

use super::{
    CaptureError, NativeDisplayInfo, NativeWindowInfo, RecordingConfig, ScreenshotConfig,
};

/// Fallback capture engine that returns platform not supported errors
///
/// On non-macOS platforms, the existing `screencapture` command-based
/// implementation in `commands/capture.rs` should be used instead.
pub struct NativeCaptureEngine {
    _recording_path: Arc<Mutex<Option<String>>>,
}

impl NativeCaptureEngine {
    /// Create a new capture engine instance
    pub fn new() -> Option<Self> {
        // Return None to indicate native capture is not available
        // The application should fall back to the existing implementation
        None
    }

    /// Check if screen capture permission is granted
    pub fn check_permission() -> bool {
        // On non-macOS platforms, we don't have a permission system
        // Return true to indicate no special permissions needed
        true
    }

    /// Request screen capture permission
    pub fn request_permission() {
        // No-op on non-macOS platforms
    }

    /// List all capturable windows
    pub fn list_windows() -> Result<Vec<NativeWindowInfo>, CaptureError> {
        Err(CaptureError::PlatformNotSupported)
    }

    /// List all displays
    pub fn list_displays() -> Result<Vec<NativeDisplayInfo>, CaptureError> {
        Err(CaptureError::PlatformNotSupported)
    }

    /// Start recording a specific window
    pub async fn start_window_recording(
        &self,
        _window_id: u32,
        _output_path: &Path,
        _config: &RecordingConfig,
    ) -> Result<(), CaptureError> {
        Err(CaptureError::PlatformNotSupported)
    }

    /// Start recording an entire display
    pub async fn start_display_recording(
        &self,
        _display_id: u32,
        _output_path: &Path,
        _config: &RecordingConfig,
    ) -> Result<(), CaptureError> {
        Err(CaptureError::PlatformNotSupported)
    }

    /// Start recording a region of a display
    pub async fn start_region_recording(
        &self,
        _display_id: u32,
        _x: i32,
        _y: i32,
        _width: i32,
        _height: i32,
        _output_path: &Path,
        _config: &RecordingConfig,
    ) -> Result<(), CaptureError> {
        Err(CaptureError::PlatformNotSupported)
    }

    /// Stop the current recording
    pub async fn stop_recording(&self) -> Result<String, CaptureError> {
        Err(CaptureError::PlatformNotSupported)
    }

    /// Cancel the current recording without saving
    pub async fn cancel_recording(&self) -> Result<(), CaptureError> {
        Err(CaptureError::PlatformNotSupported)
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        false
    }

    /// Get current recording duration in milliseconds
    pub fn recording_duration_ms(&self) -> i64 {
        0
    }
}

/// Capture a screenshot of a window
pub async fn screenshot_window(
    _window_id: u32,
    _output_path: &Path,
    _config: &ScreenshotConfig,
) -> Result<(), CaptureError> {
    Err(CaptureError::PlatformNotSupported)
}

/// Capture a screenshot of a display
pub async fn screenshot_display(
    _display_id: u32,
    _output_path: &Path,
    _config: &ScreenshotConfig,
) -> Result<(), CaptureError> {
    Err(CaptureError::PlatformNotSupported)
}

/// Capture a screenshot of a region
pub async fn screenshot_region(
    _display_id: u32,
    _x: i32,
    _y: i32,
    _width: i32,
    _height: i32,
    _output_path: &Path,
    _config: &ScreenshotConfig,
) -> Result<(), CaptureError> {
    Err(CaptureError::PlatformNotSupported)
}
