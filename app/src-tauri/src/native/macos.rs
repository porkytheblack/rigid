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

// Video codec constants matching TakaCaptureKit.h
const TAKA_CODEC_H264: i32 = 0;
const TAKA_CODEC_HEVC: i32 = 1;
const TAKA_CODEC_PRORES_422: i32 = 2;
const TAKA_CODEC_PRORES_422_HQ: i32 = 3;

impl VideoCodec {
    fn to_c(&self) -> i32 {
        match self {
            VideoCodec::H264 => TAKA_CODEC_H264,
            VideoCodec::Hevc => TAKA_CODEC_HEVC,
            VideoCodec::ProRes422 => TAKA_CODEC_PRORES_422,
            VideoCodec::ProRes422HQ => TAKA_CODEC_PRORES_422_HQ,
        }
    }
}

type TakaCaptureHandle = *mut c_void;

// FFI function declarations - simplified API
extern "C" {
    fn taka_capture_create() -> TakaCaptureHandle;
    fn taka_capture_destroy(handle: TakaCaptureHandle);

    fn taka_capture_check_permission() -> bool;
    fn taka_capture_request_permission();

    // JSON-based enumeration
    fn taka_capture_list_windows_json() -> *mut c_char;
    fn taka_capture_list_displays_json() -> *mut c_char;
    fn taka_free_string(str: *mut c_char);

    // Recording with individual parameters
    fn taka_capture_start_window_recording(
        handle: TakaCaptureHandle,
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

    fn taka_capture_start_display_recording(
        handle: TakaCaptureHandle,
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

    fn taka_capture_start_region_recording(
        handle: TakaCaptureHandle,
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

    fn taka_capture_stop_recording(handle: TakaCaptureHandle) -> c_int;
    fn taka_capture_cancel_recording(handle: TakaCaptureHandle) -> c_int;
    fn taka_capture_is_recording(handle: TakaCaptureHandle) -> bool;
    fn taka_capture_get_recording_duration_ms(handle: TakaCaptureHandle) -> i64;

    fn taka_capture_screenshot_window(
        window_id: u32,
        output_path: *const c_char,
        scale_factor: f32,
        capture_cursor: bool,
    ) -> c_int;

    fn taka_capture_screenshot_display(
        display_id: u32,
        output_path: *const c_char,
        scale_factor: f32,
        capture_cursor: bool,
    ) -> c_int;

    fn taka_capture_screenshot_region(
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
    fn taka_webcam_list_audio_devices_json() -> *mut c_char;
    fn taka_webcam_list_video_devices_json() -> *mut c_char;
    fn taka_webcam_start_recording(
        output_path: *const c_char,
        width: u32,
        height: u32,
        fps: u32,
        bitrate: u32,
        audio_device_index: *const c_char,
        video_device_index: *const c_char,
    ) -> c_int;
    fn taka_webcam_stop_recording() -> c_int;
    fn taka_webcam_cancel_recording() -> c_int;
    fn taka_webcam_is_recording() -> bool;
    fn taka_webcam_get_recording_duration_ms() -> i64;

    // Permission functions
    fn taka_check_camera_permission() -> c_int;
    fn taka_request_camera_permission();
    fn taka_check_microphone_permission() -> c_int;
    fn taka_request_microphone_permission();
}

/// Safe wrapper around the native ScreenCaptureKit engine
pub struct NativeCaptureEngine {
    handle: TakaCaptureHandle,
    recording_path: Arc<Mutex<Option<String>>>,
}

impl NativeCaptureEngine {
    /// Create a new capture engine instance
    pub fn new() -> Option<Self> {
        let handle = unsafe { taka_capture_create() };
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
        unsafe { taka_capture_check_permission() }
    }

    /// Request screen capture permission (opens system dialog)
    pub fn request_permission() {
        unsafe { taka_capture_request_permission() }
    }

    /// List all capturable windows
    pub fn list_windows() -> Result<Vec<NativeWindowInfo>, CaptureError> {
        let json_ptr = unsafe { taka_capture_list_windows_json() };
        if json_ptr.is_null() {
            return Ok(Vec::new());
        }

        let json_str = unsafe {
            let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
            taka_free_string(json_ptr);
            s
        };

        // Parse JSON
        let windows: Vec<NativeWindowInfo> =
            serde_json::from_str(&json_str).unwrap_or_else(|_| Vec::new());

        Ok(windows)
    }

    /// List all displays
    pub fn list_displays() -> Result<Vec<NativeDisplayInfo>, CaptureError> {
        let json_ptr = unsafe { taka_capture_list_displays_json() };
        if json_ptr.is_null() {
            return Ok(Vec::new());
        }

        let json_str = unsafe {
            let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
            taka_free_string(json_ptr);
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
            taka_capture_start_window_recording(
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
            taka_capture_start_display_recording(
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
            taka_capture_start_region_recording(
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
        let result = unsafe { taka_capture_stop_recording(self.handle) };

        if result != 0 {
            return Err(CaptureError::from_code(result));
        }

        let path = self.recording_path.lock().unwrap().take();
        path.ok_or(CaptureError::NoRecording)
    }

    /// Cancel the current recording without saving
    pub fn cancel_recording(&self) -> Result<(), CaptureError> {
        let result = unsafe { taka_capture_cancel_recording(self.handle) };

        if result != 0 {
            return Err(CaptureError::from_code(result));
        }

        *self.recording_path.lock().unwrap() = None;
        Ok(())
    }

    /// Check if currently recording
    pub fn is_recording(&self) -> bool {
        unsafe { taka_capture_is_recording(self.handle) }
    }

    /// Get current recording duration in milliseconds
    pub fn recording_duration_ms(&self) -> i64 {
        unsafe { taka_capture_get_recording_duration_ms(self.handle) }
    }
}

impl Drop for NativeCaptureEngine {
    fn drop(&mut self) {
        unsafe { taka_capture_destroy(self.handle) };
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
        taka_capture_screenshot_window(
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
        taka_capture_screenshot_display(
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
        taka_capture_screenshot_region(
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
    let json_ptr = unsafe { taka_webcam_list_audio_devices_json() };
    if json_ptr.is_null() {
        return vec![WebcamAudioDevice {
            index: "none".to_string(),
            name: "No Audio".to_string(),
        }];
    }

    let json_str = unsafe {
        let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
        taka_free_string(json_ptr);
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
    let json_ptr = unsafe { taka_webcam_list_video_devices_json() };
    if json_ptr.is_null() {
        return Vec::new();
    }

    let json_str = unsafe {
        let s = CStr::from_ptr(json_ptr).to_string_lossy().into_owned();
        taka_free_string(json_ptr);
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
        taka_webcam_start_recording(
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
    let result = unsafe { taka_webcam_stop_recording() };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

/// Cancel webcam recording
pub fn webcam_cancel_recording() -> Result<(), CaptureError> {
    let result = unsafe { taka_webcam_cancel_recording() };

    if result != 0 {
        return Err(CaptureError::from_code(result));
    }

    Ok(())
}

/// Check if webcam is currently recording
pub fn webcam_is_recording() -> bool {
    unsafe { taka_webcam_is_recording() }
}

/// Get webcam recording duration in milliseconds
pub fn webcam_recording_duration_ms() -> i64 {
    unsafe { taka_webcam_get_recording_duration_ms() }
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
    let status = unsafe { taka_check_camera_permission() };
    PermissionStatus::from(status)
}

/// Request camera permission (triggers system dialog if not determined)
pub fn request_camera_permission() {
    unsafe { taka_request_camera_permission() }
}

/// Check microphone permission status
pub fn check_microphone_permission() -> PermissionStatus {
    let status = unsafe { taka_check_microphone_permission() };
    PermissionStatus::from(status)
}

/// Request microphone permission (triggers system dialog if not determined)
pub fn request_microphone_permission() {
    unsafe { taka_request_microphone_permission() }
}
