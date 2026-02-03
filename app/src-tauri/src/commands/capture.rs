use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;

use crate::error::RigidError;
use crate::models::{NewScreenshot, NewRecording, UpdateRecording, Screenshot, Recording};
use crate::repositories::{ScreenshotRepository, RecordingRepository};

// Types used in public function signatures - must be available on all platforms
use crate::native::{NativeWindowInfo, NativeDisplayInfo};

#[cfg(target_os = "macos")]
use crate::native::{
    NativeCaptureEngine,
    RecordingConfig as NativeRecordingConfig, ScreenshotConfig as NativeScreenshotConfig,
    VideoCodec,
    webcam_list_audio_devices, webcam_list_video_devices, webcam_start_recording, webcam_stop_recording,
    WebcamAudioDevice as NativeWebcamAudioDevice,
    WebcamVideoDevice as NativeWebcamVideoDevice,
};

/// Represents an open window that can be captured
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowInfo {
    pub id: u32,
    pub name: String,
    pub owner: String,
    pub window_id: Option<i64>,  // CGWindowID for recording
    pub bounds: Option<WindowBounds>,  // Window bounds for region recording
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowBounds {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

/// Represents a display/screen that can be recorded
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub id: u32,
    pub name: String,
    pub width: i32,
    pub height: i32,
    pub is_main: bool,
}

/// Represents an audio input device
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub id: String,
    pub name: String,
    pub is_default: bool,
}

// Recording state for tracking active recordings
pub struct RecordingState {
    pub is_recording: AtomicBool,
    pub current_recording_id: Mutex<Option<String>>,
    pub process_pid: Mutex<Option<u32>>,
    pub webcam_pid: Mutex<Option<u32>>,
    pub recording_path: Mutex<Option<String>>,
    pub webcam_path: Mutex<Option<String>>,
    pub start_time: Mutex<Option<i64>>,
}

impl RecordingState {
    pub fn new() -> Self {
        Self {
            is_recording: AtomicBool::new(false),
            current_recording_id: Mutex::new(None),
            process_pid: Mutex::new(None),
            webcam_pid: Mutex::new(None),
            recording_path: Mutex::new(None),
            webcam_path: Mutex::new(None),
            start_time: Mutex::new(None),
        }
    }
}

impl Default for RecordingState {
    fn default() -> Self {
        Self::new()
    }
}

/// List all open windows that can be captured
#[tauri::command]
pub async fn list_windows() -> Result<Vec<WindowInfo>, RigidError> {
    // Use CGWindowListCopyWindowInfo via a helper script to get window IDs and bounds
    let script = r#"
        use framework "Foundation"
        use framework "CoreGraphics"
        use scripting additions

        set windowList to ""

        -- Get all on-screen windows
        set windowInfoList to current application's CGWindowListCopyWindowInfo((current application's kCGWindowListOptionOnScreenOnly) + (current application's kCGWindowListExcludeDesktopElements), 0)

        repeat with windowInfo in windowInfoList
            set ownerName to windowInfo's kCGWindowOwnerName as text
            set windowName to ""
            try
                set windowName to windowInfo's kCGWindowName as text
            end try
            set windowId to windowInfo's kCGWindowNumber as integer
            set windowLayer to windowInfo's kCGWindowLayer as integer

            -- Get window bounds
            set boundsDict to windowInfo's kCGWindowBounds
            set boundsX to 0
            set boundsY to 0
            set boundsW to 0
            set boundsH to 0
            try
                set boundsX to (boundsDict's X) as integer
                set boundsY to (boundsDict's Y) as integer
                set boundsW to (boundsDict's Width) as integer
                set boundsH to (boundsDict's Height) as integer
            end try

            -- Filter out system windows and menubar
            if windowLayer is 0 and ownerName is not "Window Server" and ownerName is not "Dock" then
                if windowName is not "" then
                    set windowList to windowList & ownerName & "|||" & windowName & "|||" & windowId & "|||" & boundsX & "," & boundsY & "," & boundsW & "," & boundsH & "\n"
                else if ownerName is not "" then
                    set windowList to windowList & ownerName & "|||" & ownerName & "|||" & windowId & "|||" & boundsX & "," & boundsY & "," & boundsW & "," & boundsH & "\n"
                end if
            end if
        end repeat

        return windowList
    "#;

    let output = Command::new("osascript")
        .args(["-l", "AppleScript", "-e", script])
        .output()
        .map_err(|e| RigidError::Io(e))?;

    if !output.status.success() {
        // Fallback to simpler approach
        return list_windows_fallback().await;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut windows = Vec::new();
    let mut id: u32 = 1;

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split("|||").collect();
        if parts.len() >= 4 {
            let window_id = parts[2].parse::<i64>().ok();

            // Parse bounds: x,y,w,h
            let bounds = parts[3].split(',').collect::<Vec<_>>();
            let window_bounds = if bounds.len() == 4 {
                Some(WindowBounds {
                    x: bounds[0].parse().unwrap_or(0),
                    y: bounds[1].parse().unwrap_or(0),
                    width: bounds[2].parse().unwrap_or(0),
                    height: bounds[3].parse().unwrap_or(0),
                })
            } else {
                None
            };

            windows.push(WindowInfo {
                id,
                owner: parts[0].to_string(),
                name: parts[1].to_string(),
                window_id,
                bounds: window_bounds,
            });
            id += 1;
        }
    }

    Ok(windows)
}

/// Fallback window listing using simpler AppleScript
async fn list_windows_fallback() -> Result<Vec<WindowInfo>, RigidError> {
    let script = r#"
        set windowList to ""
        tell application "System Events"
            set allProcesses to every process whose background only is false
            repeat with proc in allProcesses
                try
                    set procName to name of proc
                    set procWindows to every window of proc
                    repeat with w in procWindows
                        try
                            set wName to name of w
                            set wPos to position of w
                            set wSize to size of w
                            if wName is not "" then
                                set windowList to windowList & procName & "|||" & wName & "|||0|||" & (item 1 of wPos) & "," & (item 2 of wPos) & "," & (item 1 of wSize) & "," & (item 2 of wSize) & "\n"
                            end if
                        end try
                    end repeat
                end try
            end repeat
        end tell
        return windowList
    "#;

    let output = Command::new("osascript")
        .args(["-e", script])
        .output()
        .map_err(|e| RigidError::Io(e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut windows = Vec::new();
    let mut id: u32 = 1;

    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let parts: Vec<&str> = line.split("|||").collect();
        if parts.len() >= 4 {
            // Parse bounds: x,y,w,h
            let bounds = parts[3].split(',').collect::<Vec<_>>();
            let window_bounds = if bounds.len() == 4 {
                Some(WindowBounds {
                    x: bounds[0].parse().unwrap_or(0),
                    y: bounds[1].parse().unwrap_or(0),
                    width: bounds[2].parse().unwrap_or(0),
                    height: bounds[3].parse().unwrap_or(0),
                })
            } else {
                None
            };

            windows.push(WindowInfo {
                id,
                owner: parts[0].to_string(),
                name: parts[1].to_string(),
                window_id: None,
                bounds: window_bounds,
            });
            id += 1;
        }
    }

    Ok(windows)
}

/// List all available audio input devices
#[tauri::command]
pub async fn list_audio_devices() -> Result<Vec<AudioDevice>, RigidError> {
    let mut devices = Vec::new();

    // Always add "No Audio" option first
    devices.push(AudioDevice {
        id: "none".to_string(),
        name: "No Audio".to_string(),
        is_default: false,
    });

    // Use AppleScript to get actual audio input devices from System Preferences
    // This gives us the real list of input devices the user can select
    let script = r#"
        use framework "CoreAudio"
        use framework "Foundation"
        use scripting additions

        set deviceList to ""

        -- Get default input device name using system_profiler as fallback
        try
            set defaultInput to do shell script "system_profiler SPAudioDataType 2>/dev/null | grep -A2 'Default Input Device' | grep 'Default Input Device: Yes' || echo ''"
        end try

        -- List all audio input devices using macOS audio APIs via shell
        try
            set audioDevices to do shell script "system_profiler SPAudioDataType -json 2>/dev/null"
            return audioDevices
        on error
            return "{}"
        end try
    "#;

    let output = Command::new("osascript")
        .args(["-e", script])
        .output();

    // Try to parse system_profiler JSON output for audio devices
    if let Ok(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(audio_data) = json.get("SPAudioDataType").and_then(|d| d.as_array()) {
                    for device_group in audio_data {
                        if let Some(items) = device_group.get("_items").and_then(|i| i.as_array()) {
                            for item in items {
                                let name = item.get("_name")
                                    .and_then(|n| n.as_str())
                                    .unwrap_or("")
                                    .to_string();

                                if name.is_empty() {
                                    continue;
                                }

                                // Check for input capability
                                let has_input = item.get("coreaudio_default_audio_input_device")
                                    .and_then(|v| v.as_str())
                                    .map(|v| v == "spaudio_yes")
                                    .unwrap_or(false);

                                let has_input_source = item.get("_items")
                                    .and_then(|items| items.as_array())
                                    .map(|arr| arr.iter().any(|i| {
                                        i.get("_name").and_then(|n| n.as_str())
                                            .map(|n| n.to_lowercase().contains("input") || n.to_lowercase().contains("microphone"))
                                            .unwrap_or(false)
                                    }))
                                    .unwrap_or(false);

                                let is_input_device = has_input || has_input_source ||
                                    name.to_lowercase().contains("microphone") ||
                                    name.to_lowercase().contains("input") ||
                                    name.to_lowercase().contains("mic");

                                if is_input_device {
                                    let is_default = item.get("coreaudio_default_audio_input_device")
                                        .and_then(|v| v.as_str())
                                        .map(|v| v == "spaudio_yes")
                                        .unwrap_or(false);

                                    // Avoid duplicates
                                    if !devices.iter().any(|d| d.name == name) {
                                        devices.push(AudioDevice {
                                            id: name.clone().replace(" ", "_").to_lowercase(),
                                            name: name.clone(),
                                            is_default,
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // If we only have "No Audio", add a generic microphone option
    // The -g flag will use whatever the system default input is
    if devices.len() == 1 {
        devices.push(AudioDevice {
            id: "default".to_string(),
            name: "Default Input Device".to_string(),
            is_default: true,
        });
    }

    Ok(devices)
}

/// Webcam audio device with index for ffmpeg avfoundation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebcamAudioDevice {
    pub index: String,  // "0", "1", "2", etc. or "none"
    pub name: String,
}

/// List all available audio input devices for webcam recording
/// Uses native AVFoundation on macOS (no ffmpeg required)
#[tauri::command]
pub async fn list_webcam_audio_devices() -> Result<Vec<WebcamAudioDevice>, RigidError> {
    #[cfg(target_os = "macos")]
    {
        // Use native AVFoundation to list devices
        let native_devices = webcam_list_audio_devices();
        let devices: Vec<WebcamAudioDevice> = native_devices
            .into_iter()
            .map(|d| WebcamAudioDevice {
                index: d.index,
                name: d.name,
            })
            .collect();
        Ok(devices)
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Fallback for non-macOS: return basic options
        Ok(vec![
            WebcamAudioDevice {
                index: "none".to_string(),
                name: "No Audio".to_string(),
            },
            WebcamAudioDevice {
                index: "0".to_string(),
                name: "Default Audio Input".to_string(),
            },
        ])
    }
}

/// Webcam video device (camera) for recording
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebcamVideoDevice {
    pub index: String,  // "0", "1", "2", etc.
    pub name: String,
}

/// List all available video devices (cameras) for webcam recording
/// Uses native AVFoundation on macOS (no ffmpeg required)
#[tauri::command]
pub async fn list_webcam_video_devices() -> Result<Vec<WebcamVideoDevice>, RigidError> {
    #[cfg(target_os = "macos")]
    {
        // Use native AVFoundation to list devices
        let native_devices = webcam_list_video_devices();
        let devices: Vec<WebcamVideoDevice> = native_devices
            .into_iter()
            .map(|d| WebcamVideoDevice {
                index: d.index,
                name: d.name,
            })
            .collect();
        Ok(devices)
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Fallback for non-macOS: return basic options
        Ok(vec![
            WebcamVideoDevice {
                index: "0".to_string(),
                name: "Default Camera".to_string(),
            },
        ])
    }
}

/// List all available displays/screens
#[tauri::command]
pub async fn list_displays() -> Result<Vec<DisplayInfo>, RigidError> {
    // Use system_profiler to get display info on macOS
    let output = Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
        .map_err(|e| RigidError::Io(e))?;

    if !output.status.success() {
        // Fallback: return a single "Main Display" entry
        return Ok(vec![DisplayInfo {
            id: 1,
            name: "Main Display".to_string(),
            width: 1920,
            height: 1080,
            is_main: true,
        }]);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut displays = Vec::new();
    let mut id: u32 = 1;

    // Parse JSON output - look for display resolutions
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&stdout) {
        if let Some(displays_data) = json.get("SPDisplaysDataType").and_then(|d| d.as_array()) {
            for gpu in displays_data {
                if let Some(ndrvs) = gpu.get("spdisplays_ndrvs").and_then(|d| d.as_array()) {
                    for (idx, display) in ndrvs.iter().enumerate() {
                        let name = display.get("_name")
                            .and_then(|n| n.as_str())
                            .unwrap_or("Display")
                            .to_string();

                        // Parse resolution like "3456 x 2234" or "1920 x 1080"
                        let resolution = display.get("_spdisplays_resolution")
                            .or_else(|| display.get("spdisplays_resolution"))
                            .and_then(|r| r.as_str())
                            .unwrap_or("1920 x 1080");

                        let parts: Vec<&str> = resolution.split(" x ").collect();
                        let width = parts.first()
                            .and_then(|w| w.trim().parse::<i32>().ok())
                            .unwrap_or(1920);
                        let height = parts.get(1)
                            .and_then(|h| h.split_whitespace().next())
                            .and_then(|h| h.parse::<i32>().ok())
                            .unwrap_or(1080);

                        let is_main = display.get("spdisplays_main")
                            .and_then(|m| m.as_str())
                            .map(|m| m == "spdisplays_yes")
                            .unwrap_or(idx == 0);

                        displays.push(DisplayInfo {
                            id,
                            name: if is_main { format!("{} (Main)", name) } else { name },
                            width,
                            height,
                            is_main,
                        });
                        id += 1;
                    }
                }
            }
        }
    }

    // Fallback if no displays found
    if displays.is_empty() {
        displays.push(DisplayInfo {
            id: 1,
            name: "Main Display".to_string(),
            width: 1920,
            height: 1080,
            is_main: true,
        });
    }

    Ok(displays)
}

/// Capture a screenshot of a specific window by owner and name
#[tauri::command]
pub async fn capture_window_screenshot(
    app_id: Option<String>,
    test_id: Option<String>,
    title: Option<String>,
    window_owner: String,
    window_name: String,
    window_id: Option<i64>,
    app: AppHandle,
    screenshot_repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| RigidError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let screenshots_dir = data_dir.join("screenshots");
    std::fs::create_dir_all(&screenshots_dir)
        .map_err(|e| RigidError::Io(e))?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("screenshot_{}.png", timestamp);
    let screenshot_path = screenshots_dir.join(&filename);

    // If we have a window ID, use screencapture -l
    if let Some(wid) = window_id {
        let output = Command::new("screencapture")
            .args(["-l", &wid.to_string(), "-x", "-o", screenshot_path.to_str().unwrap()])
            .output()
            .map_err(|e| RigidError::Io(e))?;

        if output.status.success() && screenshot_path.exists() {
            let final_title = title.unwrap_or_else(|| format!("{} - {}", window_owner, window_name));
            let new_screenshot = NewScreenshot {
                app_id: app_id.clone(),
                test_id,
                title: final_title,
                description: None,
                image_path: screenshot_path.to_string_lossy().to_string(),
            };
            return screenshot_repo.create(new_screenshot).await;
        }
    }

    // Fallback: use interactive window selection
    let output = Command::new("screencapture")
        .args(["-i", "-W", "-x", screenshot_path.to_str().unwrap()])
        .output()
        .map_err(|e| RigidError::Io(e))?;

    if !output.status.success() && !screenshot_path.exists() {
        return Err(RigidError::Internal("Screenshot capture failed".into()));
    }

    if !screenshot_path.exists() {
        return Err(RigidError::Internal("Screenshot capture was cancelled".into()));
    }

    let final_title = title.unwrap_or_else(|| format!("{} - {}", window_owner, window_name));

    let new_screenshot = NewScreenshot {
        app_id,
        test_id,
        title: final_title,
        description: None,
        image_path: screenshot_path.to_string_lossy().to_string(),
    };

    screenshot_repo.create(new_screenshot).await
}

/// Capture a screenshot using the native macOS screencapture tool
/// This uses interactive window selection mode (-W) which shows a window picker
#[tauri::command]
pub async fn capture_screenshot(
    app_id: Option<String>,
    test_id: Option<String>,
    title: Option<String>,
    app: AppHandle,
    screenshot_repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| RigidError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let screenshots_dir = data_dir.join("screenshots");
    std::fs::create_dir_all(&screenshots_dir)
        .map_err(|e| RigidError::Io(e))?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("screenshot_{}.png", timestamp);
    let screenshot_path = screenshots_dir.join(&filename);

    // Use macOS screencapture with interactive window selection mode
    let output = Command::new("screencapture")
        .args(["-i", "-W", "-x", screenshot_path.to_str().unwrap()])
        .output()
        .map_err(|e| RigidError::Io(e))?;

    if !output.status.success() {
        if !screenshot_path.exists() {
            return Err(RigidError::Internal("Screenshot capture was cancelled or failed".into()));
        }
    }

    if !screenshot_path.exists() {
        return Err(RigidError::Internal("Screenshot capture was cancelled".into()));
    }

    let new_screenshot = NewScreenshot {
        app_id,
        test_id,
        title: title.unwrap_or_else(|| format!("Screenshot {}", timestamp)),
        description: None,
        image_path: screenshot_path.to_string_lossy().to_string(),
    };

    screenshot_repo.create(new_screenshot).await
}

/// Capture a full screen screenshot (no interactive selection)
#[tauri::command]
pub async fn capture_fullscreen_screenshot(
    app_id: Option<String>,
    test_id: Option<String>,
    title: Option<String>,
    app: AppHandle,
    screenshot_repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| RigidError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let screenshots_dir = data_dir.join("screenshots");
    std::fs::create_dir_all(&screenshots_dir)
        .map_err(|e| RigidError::Io(e))?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("screenshot_{}.png", timestamp);
    let screenshot_path = screenshots_dir.join(&filename);

    let output = Command::new("screencapture")
        .args(["-x", screenshot_path.to_str().unwrap()])
        .output()
        .map_err(|e| RigidError::Io(e))?;

    if !output.status.success() {
        return Err(RigidError::Internal("Failed to capture screenshot".into()));
    }

    let new_screenshot = NewScreenshot {
        app_id,
        test_id,
        title: title.unwrap_or_else(|| format!("Screenshot {}", timestamp)),
        description: None,
        image_path: screenshot_path.to_string_lossy().to_string(),
    };

    screenshot_repo.create(new_screenshot).await
}

/// Save a video frame as a screenshot from base64 PNG data
/// This is used to capture a frame from a video in the frontend
#[tauri::command]
pub async fn save_video_frame_screenshot(
    base64_data: String,
    app_id: Option<String>,
    test_id: Option<String>,
    title: Option<String>,
    recording_id: Option<String>,
    timestamp_ms: Option<i64>,
    app: AppHandle,
    screenshot_repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| RigidError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let screenshots_dir = data_dir.join("screenshots");
    std::fs::create_dir_all(&screenshots_dir)
        .map_err(|e| RigidError::Io(e))?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("video_frame_{}.png", timestamp);
    let screenshot_path = screenshots_dir.join(&filename);

    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let base64_content = if base64_data.starts_with("data:") {
        base64_data.split(',').nth(1).unwrap_or(&base64_data)
    } else {
        &base64_data
    };

    // Decode base64 to bytes
    let image_bytes = STANDARD.decode(base64_content)
        .map_err(|e| RigidError::Internal(format!("Failed to decode base64 image: {}", e)))?;

    // Write to file
    std::fs::write(&screenshot_path, &image_bytes)
        .map_err(|e| RigidError::Io(e))?;

    // Build title - include recording info if available
    let final_title = title.unwrap_or_else(|| {
        if let (Some(_rec_id), Some(ts)) = (&recording_id, timestamp_ms) {
            let secs = ts / 1000;
            let mins = secs / 60;
            let secs_remainder = secs % 60;
            format!("Frame from recording at {:02}:{:02}", mins, secs_remainder)
        } else {
            format!("Video Frame {}", timestamp)
        }
    });

    let new_screenshot = NewScreenshot {
        app_id,
        test_id,
        title: final_title,
        description: recording_id.map(|id| format!("Captured from recording {}", id)),
        image_path: screenshot_path.to_string_lossy().to_string(),
    };

    screenshot_repo.create(new_screenshot).await
}

/// Start screen recording using screencapture -v
/// On macOS, this will record a specific region if bounds are provided
/// audio_device can be: "none" (no audio), "system" (system audio via -k flag), or a device ID (mic recording)
/// record_webcam: if true, also record from the webcam simultaneously using ffmpeg
#[tauri::command]
pub async fn start_recording(
    app_id: Option<String>,
    test_id: Option<String>,
    name: Option<String>,
    window_id: Option<i64>,
    bounds_x: Option<i32>,
    bounds_y: Option<i32>,
    bounds_width: Option<i32>,
    bounds_height: Option<i32>,
    display_id: Option<u32>,
    audio_device: Option<String>,
    show_cursor: Option<bool>,
    record_webcam: Option<bool>,
    webcam_audio_device: Option<String>,  // Audio device index for webcam recording (e.g., "0", "1", "none")
    webcam_video_device: Option<String>,  // Video device index for webcam recording (e.g., "0", "1")
    app: AppHandle,
    recording_repo: State<'_, RecordingRepository>,
    recording_state: State<'_, RecordingState>,
) -> Result<Recording, RigidError> {
    if recording_state.is_recording.load(Ordering::SeqCst) {
        return Err(RigidError::Internal("A recording is already in progress".into()));
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| RigidError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let recordings_dir = data_dir.join("recordings");
    std::fs::create_dir_all(&recordings_dir)
        .map_err(|e| RigidError::Io(e))?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("recording_{}.mov", timestamp);
    let recording_path = recordings_dir.join(&filename);

    // Create the recording record first
    let new_recording = NewRecording {
        app_id,
        test_id,
        name: name.unwrap_or_else(|| format!("Recording {}", timestamp)),
    };

    let recording = recording_repo.create(new_recording).await?;

    // Build screencapture args
    // -v: video mode
    // -C: capture mouse cursor (optional)
    // -k: record audio (system audio on macOS)
    // -R x,y,w,h: capture specific region
    // -D <display>: capture specific display
    let mut args = vec!["-v".to_string()];

    // Add cursor flag if enabled (default true)
    if show_cursor.unwrap_or(true) {
        args.push("-C".to_string());
    }

    // Handle audio based on audio_device selection
    // -g: captures audio using default input (microphone)
    // -G <id>: captures audio using specified audio device ID
    // "none" = no audio, "system" or other = record with default microphone input
    let audio_mode = audio_device.as_deref().unwrap_or("none");
    if audio_mode != "none" {
        // -g captures audio from default input device (microphone)
        // Note: macOS screencapture records microphone audio, not system audio
        args.push("-g".to_string());
    }

    // Check if we have window bounds to record a specific region
    if let (Some(x), Some(y), Some(w), Some(h)) = (bounds_x, bounds_y, bounds_width, bounds_height) {
        if w > 0 && h > 0 {
            // Use -R flag to record a specific region (the window bounds)
            args.push("-R".to_string());
            args.push(format!("{},{},{},{}", x, y, w, h));
        }
    } else if let Some(did) = display_id {
        // Record specific display
        args.push("-D".to_string());
        args.push(did.to_string());
    }
    // If no bounds or display, screencapture -v will record full screen

    args.push(recording_path.to_str().unwrap().to_string());

    let child = Command::new("screencapture")
        .args(&args)
        .spawn()
        .map_err(|e| RigidError::Io(e))?;

    // Start webcam recording if requested (uses native AVFoundation on macOS)
    let webcam_recording_path = if record_webcam.unwrap_or(false) {
        let webcam_filename = format!("webcam_{}.mp4", timestamp);
        let webcam_path = recordings_dir.join(&webcam_filename);

        // Get audio device index (or "none" for no audio)
        let audio_idx = webcam_audio_device.as_deref().unwrap_or("0");
        // Get video device index (or None for default camera)
        let video_idx = webcam_video_device.as_deref();

        eprintln!("Starting native webcam recording with audio device: {}, video device: {:?}", audio_idx, video_idx);

        #[cfg(target_os = "macos")]
        {
            // Use native AVFoundation-based recording (no ffmpeg needed)
            match webcam_start_recording(
                &webcam_path,
                1280,  // width
                720,   // height
                30,    // fps
                4_000_000,  // bitrate (4 Mbps)
                Some(audio_idx),
                video_idx,
            ) {
                Ok(()) => {
                    eprintln!("Native webcam recording started successfully");
                    *recording_state.webcam_path.lock().await = Some(webcam_path.to_string_lossy().to_string());
                    Some(webcam_path.to_string_lossy().to_string())
                }
                Err(e) => {
                    eprintln!("Failed to start native webcam recording: {:?}", e);
                    None
                }
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            eprintln!("Webcam recording not supported on this platform");
            None
        }
    } else {
        None
    };

    // Store the recording state
    let start_time = Utc::now().timestamp_millis();
    recording_state.is_recording.store(true, Ordering::SeqCst);
    *recording_state.current_recording_id.lock().await = Some(recording.id.clone());
    *recording_state.process_pid.lock().await = Some(child.id());
    *recording_state.recording_path.lock().await = Some(recording_path.to_string_lossy().to_string());
    *recording_state.start_time.lock().await = Some(start_time);

    // Update the recording with the path and status
    let updates = UpdateRecording {
        name: None,
        status: Some("recording".into()),
        recording_path: Some(recording_path.to_string_lossy().to_string()),
        webcam_path: webcam_recording_path,
        duration_ms: None,
        thumbnail_path: None,
        watch_progress_ms: None,
    };

    recording_repo.update(&recording.id, updates).await
}

/// Stop the current screen recording
#[tauri::command]
pub async fn stop_recording(
    recording_repo: State<'_, RecordingRepository>,
    recording_state: State<'_, RecordingState>,
) -> Result<Recording, RigidError> {
    if !recording_state.is_recording.load(Ordering::SeqCst) {
        return Err(RigidError::Internal("No recording in progress".into()));
    }

    let recording_id = recording_state.current_recording_id.lock().await.clone()
        .ok_or_else(|| RigidError::Internal("No recording ID found".into()))?;

    let start_time = recording_state.start_time.lock().await.clone();
    let recording_path = recording_state.recording_path.lock().await.clone();
    let webcam_path = recording_state.webcam_path.lock().await.clone();

    // Stop the recording process by sending SIGINT (Ctrl+C)
    if let Some(pid) = *recording_state.process_pid.lock().await {
        #[cfg(unix)]
        {
            let _ = Command::new("kill")
                .args(["-INT", &pid.to_string()])
                .output();
        }
    }

    // Stop webcam recording if it was started (uses native AVFoundation on macOS)
    if webcam_path.is_some() {
        eprintln!("Stopping native webcam recording");

        #[cfg(target_os = "macos")]
        {
            match webcam_stop_recording() {
                Ok(()) => {
                    eprintln!("Native webcam recording stopped successfully");
                }
                Err(e) => {
                    eprintln!("Failed to stop native webcam recording: {:?}", e);
                }
            }
        }
    }

    // Brief wait for file system to sync
    tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

    // Calculate duration
    let duration_ms = start_time.map(|start| {
        let end = Utc::now().timestamp_millis();
        (end - start) as i64
    });

    // Reset recording state
    recording_state.is_recording.store(false, Ordering::SeqCst);
    *recording_state.current_recording_id.lock().await = None;
    *recording_state.process_pid.lock().await = None;
    *recording_state.webcam_pid.lock().await = None;
    *recording_state.recording_path.lock().await = None;
    *recording_state.webcam_path.lock().await = None;
    *recording_state.start_time.lock().await = None;

    // Update the recording status with duration
    let updates = UpdateRecording {
        name: None,
        status: Some("completed".into()),
        recording_path,
        webcam_path,
        duration_ms,
        thumbnail_path: None,
        watch_progress_ms: None,
    };

    recording_repo.update(&recording_id, updates).await
}

/// Check if currently recording
#[tauri::command]
pub async fn is_recording(
    recording_state: State<'_, RecordingState>,
) -> Result<bool, RigidError> {
    Ok(recording_state.is_recording.load(Ordering::SeqCst))
}

/// Get current recording ID if recording
#[tauri::command]
pub async fn get_current_recording_id(
    recording_state: State<'_, RecordingState>,
) -> Result<Option<String>, RigidError> {
    Ok(recording_state.current_recording_id.lock().await.clone())
}

/// Cancel the current recording without saving
#[tauri::command]
pub async fn cancel_recording(
    recording_repo: State<'_, RecordingRepository>,
    recording_state: State<'_, RecordingState>,
) -> Result<(), RigidError> {
    if !recording_state.is_recording.load(Ordering::SeqCst) {
        return Err(RigidError::Internal("No recording in progress".into()));
    }

    let recording_id = recording_state.current_recording_id.lock().await.clone();
    let recording_path = recording_state.recording_path.lock().await.clone();
    let webcam_path = recording_state.webcam_path.lock().await.clone();

    // Kill the recording process
    if let Some(pid) = *recording_state.process_pid.lock().await {
        #[cfg(unix)]
        {
            let _ = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
    }

    // Kill the webcam recording process if running
    if let Some(pid) = *recording_state.webcam_pid.lock().await {
        #[cfg(unix)]
        {
            let _ = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output();
        }
    }

    // Reset recording state
    recording_state.is_recording.store(false, Ordering::SeqCst);
    *recording_state.current_recording_id.lock().await = None;
    *recording_state.process_pid.lock().await = None;
    *recording_state.webcam_pid.lock().await = None;
    *recording_state.recording_path.lock().await = None;
    *recording_state.webcam_path.lock().await = None;
    *recording_state.start_time.lock().await = None;

    // Delete the recording file if it exists
    if let Some(path) = recording_path {
        let _ = std::fs::remove_file(&path);
    }

    // Delete the webcam recording file if it exists
    if let Some(path) = webcam_path {
        let _ = std::fs::remove_file(&path);
    }

    // Delete the recording record if it exists
    if let Some(id) = recording_id {
        recording_repo.delete(&id).await?;
    }

    Ok(())
}

/// Open system preferences for privacy permissions
#[tauri::command]
pub async fn open_privacy_settings(setting: String) -> Result<(), RigidError> {
    let url = match setting.as_str() {
        "microphone" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone",
        "screen_recording" => "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture",
        "camera" => "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
        _ => "x-apple.systempreferences:com.apple.preference.security?Privacy",
    };

    Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| RigidError::Io(e))?;

    Ok(())
}

/// Export an asset (screenshot or recording) to the Downloads folder
#[tauri::command]
pub async fn export_asset(
    source_path: String,
    filename: Option<String>,
) -> Result<String, RigidError> {
    let source = std::path::Path::new(&source_path);

    if !source.exists() {
        return Err(RigidError::Internal("Source file does not exist".into()));
    }

    // Get the Downloads folder
    let downloads_dir = dirs::download_dir()
        .ok_or_else(|| RigidError::Internal("Could not find Downloads folder".into()))?;

    // Generate destination filename
    let dest_filename = filename.unwrap_or_else(|| {
        source.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("export")
            .to_string()
    });

    let mut dest_path = downloads_dir.join(&dest_filename);

    // If file exists, add a number suffix
    let mut counter = 1;
    while dest_path.exists() {
        let stem = std::path::Path::new(&dest_filename)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("export");
        let ext = std::path::Path::new(&dest_filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");

        let new_name = if ext.is_empty() {
            format!("{} ({})", stem, counter)
        } else {
            format!("{} ({}).{}", stem, counter, ext)
        };
        dest_path = downloads_dir.join(new_name);
        counter += 1;
    }

    // Copy the file
    std::fs::copy(source, &dest_path)
        .map_err(|e| RigidError::Io(e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

// =============================================================================
// Native ScreenCaptureKit Commands (macOS only)
// =============================================================================

/// Native recording configuration from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeRecordingOptions {
    /// Video codec: "h264", "hevc", "prores422", "prores422hq"
    pub codec: Option<String>,
    /// Bitrate in bits per second (e.g., 20000000 for 20 Mbps)
    pub bitrate: Option<u32>,
    /// Frames per second (default: 60)
    pub fps: Option<u32>,
    /// Keyframe interval in frames (default: 60 = 1 second at 60fps)
    pub keyframe_interval: Option<u32>,
    /// Capture at retina resolution (default: true)
    pub retina_capture: Option<bool>,
    /// Include cursor in capture (default: true)
    pub capture_cursor: Option<bool>,
    /// Include audio (default: false)
    pub capture_audio: Option<bool>,
}

/// Native screenshot configuration from frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeScreenshotOptions {
    /// Capture at retina resolution (default: true)
    pub retina_capture: Option<bool>,
    /// Include cursor in capture (default: false)
    pub capture_cursor: Option<bool>,
}

// NativeWindowInfo and NativeDisplayInfo are defined in crate::native and re-exported

/// State for native capture engine
#[cfg(target_os = "macos")]
pub struct NativeCaptureState {
    pub engine: std::sync::Mutex<Option<NativeCaptureEngine>>,
    pub current_recording_id: Mutex<Option<String>>,
    pub start_time: Mutex<Option<i64>>,
}

#[cfg(target_os = "macos")]
impl NativeCaptureState {
    pub fn new() -> Self {
        Self {
            engine: std::sync::Mutex::new(NativeCaptureEngine::new()),
            current_recording_id: Mutex::new(None),
            start_time: Mutex::new(None),
        }
    }
}

#[cfg(target_os = "macos")]
impl Default for NativeCaptureState {
    fn default() -> Self {
        Self::new()
    }
}

/// Check if native screen capture permission is granted
#[tauri::command]
pub async fn check_native_capture_permission() -> Result<bool, RigidError> {
    #[cfg(target_os = "macos")]
    {
        Ok(NativeCaptureEngine::check_permission())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
    }
}

/// Request native screen capture permission
#[tauri::command]
pub async fn request_native_capture_permission() -> Result<(), RigidError> {
    #[cfg(target_os = "macos")]
    {
        NativeCaptureEngine::request_permission();
    }
    Ok(())
}

/// Check camera permission status
/// Returns: "not_determined", "restricted", "denied", "authorized"
#[tauri::command]
pub async fn check_camera_permission() -> Result<String, RigidError> {
    #[cfg(target_os = "macos")]
    {
        use crate::native::{check_camera_permission as native_check, PermissionStatus};
        let status = native_check();
        let status_str = match status {
            PermissionStatus::NotDetermined => "not_determined",
            PermissionStatus::Restricted => "restricted",
            PermissionStatus::Denied => "denied",
            PermissionStatus::Authorized => "authorized",
        };
        Ok(status_str.to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok("authorized".to_string())
    }
}

/// Request camera permission (shows system dialog if not determined)
#[tauri::command]
pub async fn request_camera_permission() -> Result<(), RigidError> {
    #[cfg(target_os = "macos")]
    {
        use crate::native::request_camera_permission as native_request;
        native_request();
    }
    Ok(())
}

/// Check microphone permission status
/// Returns: "not_determined", "restricted", "denied", "authorized"
#[tauri::command]
pub async fn check_microphone_permission() -> Result<String, RigidError> {
    #[cfg(target_os = "macos")]
    {
        use crate::native::{check_microphone_permission as native_check, PermissionStatus};
        let status = native_check();
        let status_str = match status {
            PermissionStatus::NotDetermined => "not_determined",
            PermissionStatus::Restricted => "restricted",
            PermissionStatus::Denied => "denied",
            PermissionStatus::Authorized => "authorized",
        };
        Ok(status_str.to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok("authorized".to_string())
    }
}

/// Request microphone permission (shows system dialog if not determined)
#[tauri::command]
pub async fn request_microphone_permission() -> Result<(), RigidError> {
    #[cfg(target_os = "macos")]
    {
        use crate::native::request_microphone_permission as native_request;
        native_request();
    }
    Ok(())
}

/// List all windows using native ScreenCaptureKit
#[tauri::command]
pub async fn list_windows_native() -> Result<Vec<NativeWindowInfo>, RigidError> {
    #[cfg(target_os = "macos")]
    {
        let windows = NativeCaptureEngine::list_windows()
            .map_err(|e| RigidError::Internal(e.to_string()))?;

        Ok(windows
            .into_iter()
            .map(|w| NativeWindowInfo {
                window_id: w.window_id,
                title: w.title,
                owner_name: w.owner_name,
                x: w.x,
                y: w.y,
                width: w.width,
                height: w.height,
                backing_scale_factor: w.backing_scale_factor,
            })
            .collect())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err(RigidError::Internal("Native capture not supported on this platform".into()))
    }
}

/// List all displays using native ScreenCaptureKit
#[tauri::command]
pub async fn list_displays_native() -> Result<Vec<NativeDisplayInfo>, RigidError> {
    #[cfg(target_os = "macos")]
    {
        let displays = NativeCaptureEngine::list_displays()
            .map_err(|e| RigidError::Internal(e.to_string()))?;

        Ok(displays
            .into_iter()
            .map(|d| NativeDisplayInfo {
                display_id: d.display_id,
                name: d.name,
                width: d.width,
                height: d.height,
                backing_scale_factor: d.backing_scale_factor,
                is_main: d.is_main,
            })
            .collect())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err(RigidError::Internal("Native capture not supported on this platform".into()))
    }
}

/// Start native screen recording with ScreenCaptureKit
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn start_native_recording(
    app_id: Option<String>,
    test_id: Option<String>,
    name: Option<String>,
    window_id: Option<u32>,
    display_id: Option<u32>,
    region: Option<(i32, i32, i32, i32)>, // x, y, width, height
    options: Option<NativeRecordingOptions>,
    app: AppHandle,
    recording_repo: State<'_, RecordingRepository>,
    native_state: State<'_, NativeCaptureState>,
) -> Result<Recording, RigidError> {
    // Check if already recording
    {
        let engine_guard = native_state.engine.lock().unwrap();
        if let Some(ref engine) = *engine_guard {
            if engine.is_recording() {
                return Err(RigidError::Internal("A recording is already in progress".into()));
            }
        }
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| RigidError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let recordings_dir = data_dir.join("recordings");
    std::fs::create_dir_all(&recordings_dir).map_err(RigidError::Io)?;

    // Build recording config
    let opts = options.unwrap_or(NativeRecordingOptions {
        codec: None,
        bitrate: None,
        fps: None,
        keyframe_interval: None,
        retina_capture: None,
        capture_cursor: None,
        capture_audio: None,
    });

    let codec = opts
        .codec
        .as_deref()
        .and_then(|c| c.parse::<VideoCodec>().ok())
        .unwrap_or(VideoCodec::Hevc);

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("recording_{}.{}", timestamp, codec.file_extension());
    let recording_path = recordings_dir.join(&filename);

    // Determine dimensions from window or display
    let (width, height) = if let Some(wid) = window_id {
        let windows = NativeCaptureEngine::list_windows()
            .map_err(|e| RigidError::Internal(e.to_string()))?;
        windows
            .iter()
            .find(|w| w.window_id == wid)
            .map(|w| (w.width as u32, w.height as u32))
            .unwrap_or((1920, 1080))
    } else if let Some(did) = display_id {
        let displays = NativeCaptureEngine::list_displays()
            .map_err(|e| RigidError::Internal(e.to_string()))?;
        displays
            .iter()
            .find(|d| d.display_id == did)
            .map(|d| (d.width as u32, d.height as u32))
            .unwrap_or((1920, 1080))
    } else if let Some((_, _, w, h)) = region {
        (w as u32, h as u32)
    } else {
        (1920, 1080)
    };

    let config = NativeRecordingConfig {
        width,
        height,
        fps: opts.fps.unwrap_or(60),
        bitrate: opts.bitrate.unwrap_or(20_000_000),
        keyframe_interval: opts.keyframe_interval.unwrap_or(60),
        codec,
        capture_cursor: opts.capture_cursor.unwrap_or(true),
        capture_audio: opts.capture_audio.unwrap_or(false),
        scale_factor: if opts.retina_capture.unwrap_or(true) { 2.0 } else { 1.0 },
    };

    // Create the recording record
    let new_recording = NewRecording {
        app_id,
        test_id,
        name: name.unwrap_or_else(|| format!("Recording {}", timestamp)),
    };

    let recording = recording_repo.create(new_recording).await?;

    // Start native recording
    {
        let engine_guard = native_state.engine.lock().unwrap();
        if let Some(ref engine) = *engine_guard {
            if let Some(wid) = window_id {
                engine
                    .start_window_recording(wid, &recording_path, &config)
                    .map_err(|e| RigidError::Internal(e.to_string()))?;
            } else if let Some(did) = display_id {
                if let Some((x, y, w, h)) = region {
                    engine
                        .start_region_recording(did, x, y, w, h, &recording_path, &config)
                        .map_err(|e| RigidError::Internal(e.to_string()))?;
                } else {
                    engine
                        .start_display_recording(did, &recording_path, &config)
                        .map_err(|e| RigidError::Internal(e.to_string()))?;
                }
            } else {
                // Default to main display
                let displays = NativeCaptureEngine::list_displays()
                    .map_err(|e| RigidError::Internal(e.to_string()))?;
                let main_display = displays
                    .iter()
                    .find(|d| d.is_main)
                    .or_else(|| displays.first())
                    .ok_or_else(|| RigidError::Internal("No displays found".into()))?;

                engine
                    .start_display_recording(main_display.display_id, &recording_path, &config)
                    .map_err(|e| RigidError::Internal(e.to_string()))?;
            }
        } else {
            return Err(RigidError::Internal("Native capture engine not available".into()));
        }
    }

    // Store recording state
    let start_time = Utc::now().timestamp_millis();
    *native_state.current_recording_id.lock().await = Some(recording.id.clone());
    *native_state.start_time.lock().await = Some(start_time);

    // Update recording with path and status
    let updates = UpdateRecording {
        name: None,
        status: Some("recording".into()),
        recording_path: Some(recording_path.to_string_lossy().to_string()),
        webcam_path: None,
        duration_ms: None,
        thumbnail_path: None,
        watch_progress_ms: None,
    };

    recording_repo.update(&recording.id, updates).await
}

/// Stop native screen recording
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn stop_native_recording(
    recording_repo: State<'_, RecordingRepository>,
    native_state: State<'_, NativeCaptureState>,
) -> Result<Recording, RigidError> {
    let recording_id = native_state
        .current_recording_id
        .lock()
        .await
        .clone()
        .ok_or_else(|| RigidError::Internal("No recording in progress".into()))?;

    let start_time = native_state.start_time.lock().await.clone();

    // Stop native recording
    let recording_path = {
        let engine_guard = native_state.engine.lock().unwrap();
        if let Some(ref engine) = *engine_guard {
            engine
                .stop_recording()
                .map_err(|e| RigidError::Internal(e.to_string()))?
        } else {
            return Err(RigidError::Internal("Native capture engine not available".into()));
        }
    };

    // Calculate duration
    let duration_ms = start_time.map(|start| {
        let end = Utc::now().timestamp_millis();
        end - start
    });

    // Reset state
    *native_state.current_recording_id.lock().await = None;
    *native_state.start_time.lock().await = None;

    // Update recording status
    let updates = UpdateRecording {
        name: None,
        status: Some("completed".into()),
        recording_path: Some(recording_path),
        webcam_path: None,
        duration_ms,
        thumbnail_path: None,
        watch_progress_ms: None,
    };

    recording_repo.update(&recording_id, updates).await
}

/// Cancel native screen recording without saving
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn cancel_native_recording(
    recording_repo: State<'_, RecordingRepository>,
    native_state: State<'_, NativeCaptureState>,
) -> Result<(), RigidError> {
    let recording_id = native_state.current_recording_id.lock().await.clone();

    // Cancel native recording
    {
        let engine_guard = native_state.engine.lock().unwrap();
        if let Some(ref engine) = *engine_guard {
            engine
                .cancel_recording()
                .map_err(|e| RigidError::Internal(e.to_string()))?;
        }
    }

    // Reset state
    *native_state.current_recording_id.lock().await = None;
    *native_state.start_time.lock().await = None;

    // Delete recording record if it exists
    if let Some(id) = recording_id {
        recording_repo.delete(&id).await?;
    }

    Ok(())
}

/// Check if native recording is in progress
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn is_native_recording(
    native_state: State<'_, NativeCaptureState>,
) -> Result<bool, RigidError> {
    let engine_guard = native_state.engine.lock().unwrap();
    if let Some(ref engine) = *engine_guard {
        Ok(engine.is_recording())
    } else {
        Ok(false)
    }
}

/// Get current native recording ID
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn get_native_recording_id(
    native_state: State<'_, NativeCaptureState>,
) -> Result<Option<String>, RigidError> {
    Ok(native_state.current_recording_id.lock().await.clone())
}

/// Get current native recording duration in milliseconds
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn get_native_recording_duration(
    native_state: State<'_, NativeCaptureState>,
) -> Result<i64, RigidError> {
    let engine_guard = native_state.engine.lock().unwrap();
    if let Some(ref engine) = *engine_guard {
        Ok(engine.recording_duration_ms())
    } else {
        Ok(0)
    }
}

/// Capture native screenshot with ScreenCaptureKit
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn capture_native_screenshot(
    app_id: Option<String>,
    test_id: Option<String>,
    title: Option<String>,
    window_id: Option<u32>,
    display_id: Option<u32>,
    region: Option<(i32, i32, i32, i32)>, // x, y, width, height
    options: Option<NativeScreenshotOptions>,
    app: AppHandle,
    screenshot_repo: State<'_, ScreenshotRepository>,
) -> Result<Screenshot, RigidError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| RigidError::Io(std::io::Error::new(std::io::ErrorKind::Other, e.to_string())))?;

    let screenshots_dir = data_dir.join("screenshots");
    std::fs::create_dir_all(&screenshots_dir).map_err(RigidError::Io)?;

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("screenshot_{}.png", timestamp);
    let screenshot_path = screenshots_dir.join(&filename);

    let opts = options.unwrap_or(NativeScreenshotOptions {
        retina_capture: None,
        capture_cursor: None,
    });

    let config = NativeScreenshotConfig {
        scale_factor: if opts.retina_capture.unwrap_or(true) { 2.0 } else { 1.0 },
        capture_cursor: opts.capture_cursor.unwrap_or(false),
    };

    // Capture screenshot
    if let Some(wid) = window_id {
        crate::native::screenshot_window(wid, &screenshot_path, &config)
            .await
            .map_err(|e| RigidError::Internal(e.to_string()))?;
    } else if let Some(did) = display_id {
        if let Some((x, y, w, h)) = region {
            crate::native::screenshot_region(did, x, y, w, h, &screenshot_path, &config)
                .await
                .map_err(|e| RigidError::Internal(e.to_string()))?;
        } else {
            crate::native::screenshot_display(did, &screenshot_path, &config)
                .await
                .map_err(|e| RigidError::Internal(e.to_string()))?;
        }
    } else {
        // Default to main display
        let displays = NativeCaptureEngine::list_displays()
            .map_err(|e| RigidError::Internal(e.to_string()))?;
        let main_display = displays
            .iter()
            .find(|d| d.is_main)
            .or_else(|| displays.first())
            .ok_or_else(|| RigidError::Internal("No displays found".into()))?;

        crate::native::screenshot_display(main_display.display_id, &screenshot_path, &config)
            .await
            .map_err(|e| RigidError::Internal(e.to_string()))?;
    }

    // Create screenshot record
    let new_screenshot = NewScreenshot {
        app_id,
        test_id,
        title: title.unwrap_or_else(|| format!("Screenshot {}", timestamp)),
        description: None,
        image_path: screenshot_path.to_string_lossy().to_string(),
    };

    screenshot_repo.create(new_screenshot).await
}
