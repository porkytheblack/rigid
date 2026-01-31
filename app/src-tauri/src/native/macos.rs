//! macOS native capture using ScreenCaptureKit via Swift FFI
//!
//! This module provides high-quality screen capture on macOS using ScreenCaptureKit.
//! Features:
//! - Native Retina resolution capture (2x backing pixels)
//! - 60 FPS video with timestamp-driven encoding
//! - HEVC/ProRes codec support
//! - Window, display, and region capture

use std::ffi::{CStr, CString};
use std::os::raw::{c_char, c_int, c_void};
use std::path::Path;
use std::sync::{Arc, Mutex};

use super::{
    CaptureError, NativeDisplayInfo, NativeWindowInfo, RecordingConfig, ScreenshotConfig,
    VideoCodec,
};

// Video codec constants matching RigidCaptureKit.h
const RIGID_CODEC_H264: i32 = 0;
const RIGID_CODEC_HEVC: i32 = 1;
const RIGID_CODEC_PRORES_422: i32 = 2;
const RIGID_CODEC_PRORES_422_HQ: i32 = 3;

impl VideoCodec {
    fn to_c(&self) -> i32 {
        match self {
            VideoCodec::H264 => RIGID_CODEC_H264,
            VideoCodec::Hevc => RIGID_CODEC_HEVC,
            VideoCodec::ProRes422 => RIGID_CODEC_PRORES_422,
            VideoCodec::ProRes422HQ => RIGID_CODEC_PRORES_422_HQ,
        }
    }
}

type RigidCaptureHandle = *mut c_void;

// FFI function declarations - simplified API
extern "C" {
    fn rigid_capture_create() -> RigidCaptureHandle;
    fn rigid_capture_destroy(handle: RigidCaptureHandle);

    fn rigid_capture_check_permission() -> bool;
    fn rigid_capture_request_permission();

    // JSON-based enumeration
    fn rigid_capture_list_windows_json() -> *mut c_char;
    fn rigid_capture_list_displays_json() -> *mut c_char;
    fn rigid_free_string(str: *mut c_char);

    // Recording with individual parameters
    fn rigid_capture_start_window_recording(
        handle: RigidCaptureHandle,
        window_id: u32,
        output_path: *const c_char,
        width: u32,
        height: u32,
        fps: u32,
        bitrate: u32,
        keyframe_interval: u32,
        codec: i32,
        capture_cursor: bool,
        capture_audio: bool,
        scale_factor: f32,
    ) -> c_int;

    fn rigid_capture_start_display_recording(
        handle: RigidCaptureHandle,
        display_id: u32,
        output_path: *const c_char,
        width: u32,
        height: u32,
        fps: u32,
        bitrate: u32,
        keyframe_interval: u32,
        codec: i32,
        capture_cursor: bool,
        capture_audio: bool,
        scale_factor: f32,
    ) -> c_int;

    fn rigid_capture_start_region_recording(
        handle: RigidCaptureHandle,
        display_id: u32,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        output_path: *const c_char,
        fps: u32,
        bitrate: u32,
        keyframe_interval: u32,
        codec: i32,
        capture_cursor: bool,
        capture_audio: bool,
        scale_factor: f32,
    ) -> c_int;

    fn rigid_capture_stop_recording(handle: RigidCaptureHandle) -> c_int;
    fn rigid_capture_cancel_recording(handle: RigidCaptureHandle) -> c_int;
    fn rigid_capture_is_recording(handle: RigidCaptureHandle) -> bool;
    fn rigid_capture_get_recording_duration_ms(handle: RigidCaptureHandle) -> i64;

    fn rigid_capture_screenshot_window(
        window_id: u32,
        output_path: *const c_char,
        scale_factor: f32,
        capture_cursor: bool,
    ) -> c_int;

    fn rigid_capture_screenshot_display(
        display_id: u32,
        output_path: *const c_char,
        scale_factor: f32,
        capture_cursor: bool,
    ) -> c_int;

    fn rigid_capture_screenshot_region(
        display_id: u32,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        output_path: *const c_char,
        scale_factor: f32,
        capture_cursor: bool,
    ) -> c_int;

    // Webcam recording functions
    fn rigid_webcam_list_audio_devices_json() -> *mut c_char;
    fn rigid_webcam_list_video_devices_json() -> *mut c_char;
    fn rigid_webcam_start_recording(
        output_path: *const c_char,
        width: u32,
        height: u32,
        fps: u32,
        bitrate: u32,
        audio_device_index: *const c_char,
        video_device_index: *const c_char,
    ) -> c_int;
    fn rigid_webcam_stop_recording() -> c_int;
    fn rigid_webcam_cancel_recording() -> c_int;
    fn rigid_webcam_is_recording() -> bool;
    fn rigid_webcam_get_recording_duration_ms() -> i64;

    // Permission functions
    fn rigid_check_camera_permission() -> c_int;
    fn rigid_request_camera_permission();
    fn rigid_check_microphone_permission() -> c_int;
    fn rigid_request_microphone_permission();
}

/// Safe wrapper around the native ScreenCaptureKit engine
pub struct NativeCaptureEngine {
    handle: RigidCaptureHandle,
    recording_path: Arc<Mutex<Option<String>>>,
}

impl NativeCaptureEngine {
    /// Create a new capture engine instance
    pub fn new() -> Option<Self> {
        let handle = unsafe { rigid_capture_create() };
        if handle.is_null() {
            return None;
        }
        Some(Self {
            handle,
            recording_path: Arc::new(Mutex::new(None)),
        })
    }

    /// Check if screen capture permission is granted
    pub fn check_permission() -> bool {
        unsafe { rigid_capture_check_permission() }
    }

    /// Request screen capture permission (opens system dialog)
    pub fn request_permission() {
        unsafe { rigid_capture_request_permission() }
    }

    /// List all capturable windows
    pub fn list_windows() -> Result<Vec<NativeWindowInfo>, CaptureError> {
        let json_ptr = unsafe { rigid_capture_list_windows_json() };
        if json_ptr.is_null() {
            return Ok(Vec::new());
        }

        let json_str = unsafe {
            let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
            rigid_free_string(json_ptr);
            s
        };

        // Parse JSON
        let windows: Vec<NativeWindowInfo> =
            serde_json::from_str(&json_str).unwrap_or_else(|_| Vec::new());

        Ok(windows)
    }

    /// List all displays
    pub fn list_displays() -> Result<Vec<NativeDisplayInfo>, CaptureError> {
        let json_ptr = unsafe { rigid_capture_list_displays_json() };
        if json_ptr.is_null() {
            return Ok(Vec::new());
        }

        let json_str = unsafe {
            let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
            rigid_free_string(json_ptr);
            s
        };

        // Parse JSON
        let displays: Vec<NativeDisplayInfo> =
            serde_json::from_str(&json_str).unwrap_or_else(|_| Vec::new());

        Ok(displays)
    }

    /// Start recording a specific window
    pub fn start_window_recording(
        &self,
        window_id: u32,
        output_path: &Path,
        config: &RecordingConfig,
    ) -> Result<(), CaptureError> {
        let path_str = output_path
            .to_str()
            .ok_or_else(|| CaptureError::InvalidConfig)?;
        let path_cstr = CString::new(path_str).map_err(|_| CaptureError::InvalidConfig)?;

        let result = unsafe {
            rigid_capture_start_window_recording(
                self.handle,
                window_id,
                path_cstr.as_ptr(),
                config.width,
                config.height,
                config.fps,
                config.bitrate,
                config.keyframe_interval,
                config.codec.to_c(),
                config.capture_cursor,
                config.capture_audio,
                config.scale_factor,
            )
        };

        if result != 0 {
            return Err(CaptureError::from_code(result));
        }

        *self.recording_path.lock().unwrap() = Some(path_str.to_string());
        Ok(())
    }

    /// Start recording an entire display
    pub fn start_display_recording(
        &self,
        display_id: u32,
        output_path: &Path,
        config: &RecordingConfig,
    ) -> Result<(), CaptureError> {
        let path_str = output_path
            .to_str()
            .ok_or_else(|| CaptureError::InvalidConfig)?;
        let path_cstr = CString::new(path_str).map_err(|_| CaptureError::InvalidConfig)?;

        let result = unsafe {
            rigid_capture_start_display_recording(
                self.handle,
                display_id,
                path_cstr.as_ptr(),
                config.width,
                config.height,
                config.fps,
                config.bitrate,
                config.keyframe_interval,
                config.codec.to_c(),
                config.capture_cursor,
                config.capture_audio,
                config.scale_factor,
            )
        };

        if result != 0 {
            return Err(CaptureError::from_code(result));
        }

        *self.recording_path.lock().unwrap() = Some(path_str.to_string());
        Ok(())
    }

    /// Start recording a region of a display
    pub fn start_region_recording(
        &self,
        display_id: u32,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        output_path: &Path,
        config: &RecordingConfig,
    ) -> Result<(), CaptureError> {
        let path_str = output_path
            .to_str()
            .ok_or_else(|| CaptureError::InvalidConfig)?;
        let path_cstr = CString::new(path_str).map_err(|_| CaptureError::InvalidConfig)?;

        let result = unsafe {
            rigid_capture_start_region_recording(
                self.handle,
                display_id,
                x,
                y,
                width,
                height,
                path_cstr.as_ptr(),
                config.fps,
                config.bitrate,
                config.keyframe_interval,
                config.codec.to_c(),
                config.capture_cursor,
                config.capture_audio,
                config.scale_factor,
            )
        };

        if result != 0 {
            return Err(CaptureError::from_code(result));
        }

        *self.recording_path.lock().unwrap() = Some(path_str.to_string());
        Ok(())
    }

    /// Stop the current recording
    pub fn stop_recording(&self) -> Result<String, CaptureError> {
        let result = unsafe { rigid_capture_stop_recording(self.handle) };

        if result != 0 {
            return Err(CaptureError::from_code(result));
        }

        let path = self.recording_path.lock().unwrap().take();
        path.ok_or(CaptureError::NoRecording)
    }

    /// Cancel the current recording without saving
    pub fn cancel_recording(&self) -> Result<(), CaptureError> {
        let result = unsafe { rigid_capture_cancel_recording(self.handle) };

        if result != 0 {
            return Err(CaptureError::from_code(result));
        }

        *self.recording_path.lock().unwrap() = None;
        Ok(())
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        unsafe { rigid_capture_is_recording(self.handle) }
    }

    /// Get current recording duration in milliseconds
    pub fn recording_duration_ms(&self) -> i64 {
        unsafe { rigid_capture_get_recording_duration_ms(self.handle) }
    }
}

impl Drop for NativeCaptureEngine {
    fn drop(&mut self) {
        unsafe { rigid_capture_destroy(self.handle) };
    }
}

// SAFETY: The Swift CaptureEngine uses locks for thread safety
unsafe impl Send for NativeCaptureEngine {}
unsafe impl Sync for NativeCaptureEngine {}

/// Capture a screenshot of a window
pub async fn screenshot_window(
    window_id: u32,
    output_path: &Path,
    config: &ScreenshotConfig,
) -> Result<(), CaptureError> {
    let path_str = output_path
        .to_str()
        .ok_or_else(|| CaptureError::InvalidConfig)?;
    let path_cstr = CString::new(path_str).map_err(|_| CaptureError::InvalidConfig)?;

    let result = unsafe {
        rigid_capture_screenshot_window(
            window_id,
            path_cstr.as_ptr(),
            config.scale_factor,
            config.capture_cursor,
        )
    };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

/// Capture a screenshot of a display
pub async fn screenshot_display(
    display_id: u32,
    output_path: &Path,
    config: &ScreenshotConfig,
) -> Result<(), CaptureError> {
    let path_str = output_path
        .to_str()
        .ok_or_else(|| CaptureError::InvalidConfig)?;
    let path_cstr = CString::new(path_str).map_err(|_| CaptureError::InvalidConfig)?;

    let result = unsafe {
        rigid_capture_screenshot_display(
            display_id,
            path_cstr.as_ptr(),
            config.scale_factor,
            config.capture_cursor,
        )
    };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

/// Capture a screenshot of a region
pub async fn screenshot_region(
    display_id: u32,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    output_path: &Path,
    config: &ScreenshotConfig,
) -> Result<(), CaptureError> {
    let path_str = output_path
        .to_str()
        .ok_or_else(|| CaptureError::InvalidConfig)?;
    let path_cstr = CString::new(path_str).map_err(|_| CaptureError::InvalidConfig)?;

    let result = unsafe {
        rigid_capture_screenshot_region(
            display_id,
            x,
            y,
            width,
            height,
            path_cstr.as_ptr(),
            config.scale_factor,
            config.capture_cursor,
        )
    };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

// MARK: - Webcam Recording

/// Audio device info for webcam recording
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WebcamAudioDevice {
    pub index: String,
    pub name: String,
}

/// Video device info for webcam recording
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WebcamVideoDevice {
    pub index: String,
    pub name: String,
}

/// List available audio devices for webcam recording
pub fn webcam_list_audio_devices() -> Vec<WebcamAudioDevice> {
    let json_ptr = unsafe { rigid_webcam_list_audio_devices_json() };
    if json_ptr.is_null() {
        return vec![WebcamAudioDevice {
            index: "none".to_string(),
            name: "No Audio".to_string(),
        }];
    }

    let json_str = unsafe {
        let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
        rigid_free_string(json_ptr);
        s
    };

    serde_json::from_str(&json_str).unwrap_or_else(|_| {
        vec![WebcamAudioDevice {
            index: "none".to_string(),
            name: "No Audio".to_string(),
        }]
    })
}

/// List available video devices (cameras) for webcam recording
pub fn webcam_list_video_devices() -> Vec<WebcamVideoDevice> {
    let json_ptr = unsafe { rigid_webcam_list_video_devices_json() };
    if json_ptr.is_null() {
        return Vec::new();
    }

    let json_str = unsafe {
        let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
        rigid_free_string(json_ptr);
        s
    };

    serde_json::from_str(&json_str).unwrap_or_else(|_| Vec::new())
}

/// Start webcam recording
pub fn webcam_start_recording(
    output_path: &Path,
    width: u32,
    height: u32,
    fps: u32,
    bitrate: u32,
    audio_device_index: Option<&str>,
    video_device_index: Option<&str>,
) -> Result<(), CaptureError> {
    let path_str = output_path
        .to_str()
        .ok_or_else(|| CaptureError::InvalidConfig)?;
    let path_cstr = CString::new(path_str).map_err(|_| CaptureError::InvalidConfig)?;

    let audio_cstr = audio_device_index
        .map(|s| CString::new(s).ok())
        .flatten();
    let audio_ptr = audio_cstr
        .as_ref()
        .map(|s| s.as_ptr())
        .unwrap_or(std::ptr::null());

    let video_cstr = video_device_index
        .map(|s| CString::new(s).ok())
        .flatten();
    let video_ptr = video_cstr
        .as_ref()
        .map(|s| s.as_ptr())
        .unwrap_or(std::ptr::null());

    let result = unsafe {
        rigid_webcam_start_recording(
            path_cstr.as_ptr(),
            width,
            height,
            fps,
            bitrate,
            audio_ptr,
            video_ptr,
        )
    };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

/// Stop webcam recording
pub fn webcam_stop_recording() -> Result<(), CaptureError> {
    let result = unsafe { rigid_webcam_stop_recording() };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

/// Cancel webcam recording
pub fn webcam_cancel_recording() -> Result<(), CaptureError> {
    let result = unsafe { rigid_webcam_cancel_recording() };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

/// Check if webcam is currently recording
pub fn webcam_is_recording() -> bool {
    unsafe { rigid_webcam_is_recording() }
}

/// Get webcam recording duration in milliseconds
pub fn webcam_recording_duration_ms() -> i64 {
    unsafe { rigid_webcam_get_recording_duration_ms() }
}

/// Permission status
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PermissionStatus {
    NotDetermined = 0,
    Restricted = 1,
    Denied = 2,
    Authorized = 3,
}

impl From<i32> for PermissionStatus {
    fn from(value: i32) -> Self {
        match value {
            0 => PermissionStatus::NotDetermined,
            1 => PermissionStatus::Restricted,
            2 => PermissionStatus::Denied,
            3 => PermissionStatus::Authorized,
            _ => PermissionStatus::NotDetermined,
        }
    }
}

/// Check camera permission status
pub fn check_camera_permission() -> PermissionStatus {
    let status = unsafe { rigid_check_camera_permission() };
    PermissionStatus::from(status)
}

/// Request camera permission (triggers system dialog if not determined)
pub fn request_camera_permission() {
    unsafe { rigid_request_camera_permission() }
}

/// Check microphone permission status
pub fn check_microphone_permission() -> PermissionStatus {
    let status = unsafe { rigid_check_microphone_permission() };
    PermissionStatus::from(status)
}

/// Request microphone permission (triggers system dialog if not determined)
pub fn request_microphone_permission() {
    unsafe { rigid_request_microphone_permission() }
}

// =============================================================================
// Video Compositor FFI
// =============================================================================

/// Progress callback type for compositor
pub type CompositorProgressCallback =
    extern "C" fn(export_id: *const c_char, percent: f32, current_frame: i64, total_frames: i64);

/// Completion callback type for compositor
pub type CompositorCompletionCallback =
    extern "C" fn(export_id: *const c_char, error_code: c_int, output_path_or_error: *const c_char);

// FFI declarations for compositor
extern "C" {
    fn rigid_compositor_render(
        export_id: *const c_char,
        config_json: *const c_char,
        progress_callback: Option<CompositorProgressCallback>,
    ) -> c_int;

    fn rigid_compositor_render_async(
        export_id: *const c_char,
        config_json: *const c_char,
        progress_callback: Option<CompositorProgressCallback>,
        completion_callback: Option<CompositorCompletionCallback>,
    ) -> c_int;

    fn rigid_compositor_cancel();
}

/// Render result from compositor
#[derive(Debug)]
pub enum CompositorResult {
    Success(String),
    Error(String),
}

/// Render a video composition synchronously using native AVFoundation
///
/// # Arguments
/// * `export_id` - Unique identifier for this export
/// * `config_json` - JSON string containing the render configuration
/// * `progress_callback` - Optional callback for progress updates
///
/// # Returns
/// Result with output path on success, error message on failure
pub fn compositor_render_sync(
    export_id: &str,
    config_json: &str,
    progress_callback: Option<CompositorProgressCallback>,
) -> Result<String, String> {
    let export_id_cstr = CString::new(export_id).map_err(|e| e.to_string())?;
    let config_cstr = CString::new(config_json).map_err(|e| e.to_string())?;

    let result = unsafe {
        rigid_compositor_render(
            export_id_cstr.as_ptr(),
            config_cstr.as_ptr(),
            progress_callback,
        )
    };

    match result {
        0 => Ok(export_id.to_string()),
        1 => Err("Not authorized".to_string()),
        2 => Err("Invalid configuration".to_string()),
        3 => Err("Render failed".to_string()),
        _ => Err(format!("Unknown error: {}", result)),
    }
}

/// Render a video composition asynchronously using native AVFoundation
///
/// # Arguments
/// * `export_id` - Unique identifier for this export
/// * `config_json` - JSON string containing the render configuration
/// * `progress_callback` - Optional callback for progress updates
/// * `completion_callback` - Optional callback when render completes
///
/// # Returns
/// Ok(()) if render started successfully, Err with message on failure
pub fn compositor_render_async(
    export_id: &str,
    config_json: &str,
    progress_callback: Option<CompositorProgressCallback>,
    completion_callback: Option<CompositorCompletionCallback>,
) -> Result<(), String> {
    let export_id_cstr = CString::new(export_id).map_err(|e| e.to_string())?;
    let config_cstr = CString::new(config_json).map_err(|e| e.to_string())?;

    let result = unsafe {
        rigid_compositor_render_async(
            export_id_cstr.as_ptr(),
            config_cstr.as_ptr(),
            progress_callback,
            completion_callback,
        )
    };

    match result {
        0 => Ok(()),
        2 => Err("Invalid configuration".to_string()),
        _ => Err(format!("Failed to start render: {}", result)),
    }
}

/// Cancel any in-progress compositor render
pub fn compositor_cancel() {
    unsafe { rigid_compositor_cancel() }
}
