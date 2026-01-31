use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::error::TakaError;
use crate::ffmpeg;
use crate::repositories::RecordingRepository;

/// Download a URL to a temporary file and return the path
/// Used for background images from external sources like Unsplash
async fn download_url_to_temp(app: &AppHandle, url: &str) -> Result<PathBuf, String> {
    use std::io::Write;

    // Create temp directory in app cache
    let cache_dir = app.path().app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {}", e))?;
    let temp_dir = cache_dir.join("render_temp");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    // Generate a unique filename based on URL hash
    let hash = {
        use std::hash::{Hash, Hasher};
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        url.hash(&mut hasher);
        hasher.finish()
    };

    // Try to guess extension from URL, default to .jpg
    let ext = url.split('?').next()
        .and_then(|u| u.rsplit('.').next())
        .filter(|e| ["jpg", "jpeg", "png", "webp", "gif"].contains(&e.to_lowercase().as_str()))
        .unwrap_or("jpg");

    let temp_path = temp_dir.join(format!("bg_{}.{}", hash, ext));

    // If already downloaded, return cached path
    if temp_path.exists() {
        return Ok(temp_path);
    }

    // Download the image
    let response = reqwest::get(url).await
        .map_err(|e| format!("Failed to download image: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Failed to download image: HTTP {}", response.status()));
    }

    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read image data: {}", e))?;

    // Write to temp file
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    Ok(temp_path)
}

/// Trim a video file using FFmpeg
/// Creates a new video file with the trimmed content
#[tauri::command]
pub async fn trim_video(
    app: AppHandle,
    recording_id: String,
    start_ms: i64,
    end_ms: i64,
    repo: State<'_, RecordingRepository>,
) -> Result<(), TakaError> {
    // Get the recording
    let recording = repo.get(&recording_id).await?;

    let recording_path = recording.recording_path.ok_or_else(|| {
        TakaError::Validation("Recording has no video file".to_string())
    })?;

    // Verify source file exists
    let source_path = PathBuf::from(&recording_path);
    if !source_path.exists() {
        return Err(TakaError::Validation(format!(
            "Source video file not found: {}",
            recording_path
        )));
    }

    // Create a temporary output path
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| TakaError::Tauri(e.to_string()))?;
    let recordings_dir = app_data_dir.join("recordings");

    // Output as mp4 since we're re-encoding with H.264/AAC
    let temp_output = recordings_dir.join(format!(
        "{}_trimmed_temp.mp4",
        recording_id
    ));

    // Convert milliseconds to FFmpeg time format (HH:MM:SS.mmm)
    let start_time = format_ffmpeg_time(start_ms);
    let duration_ms = end_ms - start_ms;
    let duration_time = format_ffmpeg_time(duration_ms);

    // Run FFmpeg to trim the video
    // Using -ss after -i for accurate seeking (not keyframe-based)
    // Re-encoding is required for frame-accurate cuts
    let output = ffmpeg::ffmpeg_command(&app)
        .map_err(|e| TakaError::Internal(e))?
        .args([
            "-y",                           // Overwrite output file
            "-i", &recording_path,          // Input file
            "-ss", &start_time,             // Start time (after input for accurate seek)
            "-t", &duration_time,           // Duration
            "-c:v", "libx264",              // Re-encode video with H.264
            "-preset", "fast",              // Encoding speed/quality tradeoff
            "-crf", "18",                   // Quality (lower = better, 18 is visually lossless)
            "-c:a", "aac",                  // Re-encode audio with AAC
            "-b:a", "192k",                 // Audio bitrate
            "-movflags", "+faststart",      // Optimize for web playback
            temp_output.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| TakaError::Internal(format!("Failed to run FFmpeg: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(TakaError::Internal(format!(
            "FFmpeg trim failed: {}",
            stderr
        )));
    }

    // Create the final output path (changing extension to mp4)
    let final_output = recordings_dir.join(format!("{}.mp4", recording_id));

    // Move the temp file to the final location
    std::fs::rename(&temp_output, &final_output)
        .map_err(|e| TakaError::Io(e))?;

    // Remove the old file if it's different from the new one
    if source_path != final_output && source_path.exists() {
        let _ = std::fs::remove_file(&source_path);
    }

    // Update the recording with new path and duration in the database
    repo.update(&recording_id, crate::models::recording::UpdateRecording {
        name: None,
        status: None,
        recording_path: Some(final_output.to_string_lossy().to_string()),
        webcam_path: None,
        duration_ms: Some(duration_ms),
        thumbnail_path: None,
    }).await?;

    Ok(())
}

/// Cut a portion of a video and create a new recording
#[tauri::command]
pub async fn cut_video(
    app: AppHandle,
    recording_id: String,
    start_ms: i64,
    end_ms: i64,
    new_name: String,
    repo: State<'_, RecordingRepository>,
) -> Result<crate::models::Recording, TakaError> {
    // Get the source recording
    let source_recording = repo.get(&recording_id).await?;

    let recording_path = source_recording.recording_path.ok_or_else(|| {
        TakaError::Validation("Recording has no video file".to_string())
    })?;

    // Verify source file exists
    let source_path = PathBuf::from(&recording_path);
    if !source_path.exists() {
        return Err(TakaError::Validation(format!(
            "Source video file not found: {}",
            recording_path
        )));
    }

    // Create a new recording entry first
    let new_recording = repo.create(crate::models::recording::NewRecording {
        app_id: source_recording.app_id.clone(),
        test_id: source_recording.test_id.clone(),
        name: new_name.clone(),
    }).await?;

    // Set up output path
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| TakaError::Tauri(e.to_string()))?;
    let recordings_dir = app_data_dir.join("recordings");

    // Output as mp4 since we're re-encoding with H.264/AAC
    let output_path = recordings_dir.join(format!(
        "{}.mp4",
        new_recording.id
    ));

    // Convert milliseconds to FFmpeg time format
    let start_time = format_ffmpeg_time(start_ms);
    let duration_ms = end_ms - start_ms;
    let duration_time = format_ffmpeg_time(duration_ms);

    // Run FFmpeg to extract the clip
    // Using -ss after -i for accurate seeking (not keyframe-based)
    // Re-encoding is required for frame-accurate cuts
    let output = ffmpeg::ffmpeg_command(&app)
        .map_err(|e| TakaError::Internal(e))?
        .args([
            "-y",                           // Overwrite output file
            "-i", &recording_path,          // Input file
            "-ss", &start_time,             // Start time (after input for accurate seek)
            "-t", &duration_time,           // Duration
            "-c:v", "libx264",              // Re-encode video with H.264
            "-preset", "fast",              // Encoding speed/quality tradeoff
            "-crf", "18",                   // Quality (lower = better, 18 is visually lossless)
            "-c:a", "aac",                  // Re-encode audio with AAC
            "-b:a", "192k",                 // Audio bitrate
            "-movflags", "+faststart",      // Optimize for web playback
            output_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| TakaError::Internal(format!("Failed to run FFmpeg: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Clean up the failed recording entry
        let _ = repo.delete(&new_recording.id).await;
        return Err(TakaError::Internal(format!(
            "FFmpeg cut failed: {}",
            stderr
        )));
    }

    // Update the new recording with the video path
    let updated_recording = repo.update(&new_recording.id, crate::models::recording::UpdateRecording {
        name: None,
        status: Some("completed".to_string()),
        recording_path: Some(output_path.to_string_lossy().to_string()),
        webcam_path: None,
        duration_ms: Some(duration_ms),
        thumbnail_path: None,
    }).await?;

    Ok(updated_recording)
}

/// Format milliseconds as FFmpeg time string (HH:MM:SS.mmm)
fn format_ffmpeg_time(ms: i64) -> String {
    let total_seconds = ms / 1000;
    let milliseconds = ms % 1000;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    format!("{:02}:{:02}:{:02}.{:03}", hours, minutes, seconds, milliseconds)
}

/// Parse gradient stops JSON to extract start and end colors
/// Input format: [{ "color": "#RRGGBB", "position": 0-100 }, ...]
fn parse_gradient_stops(stops_json: &str) -> (String, String) {
    #[derive(serde::Deserialize)]
    struct GradientStop {
        color: String,
        position: f64,
    }

    if let Ok(stops) = serde_json::from_str::<Vec<GradientStop>>(stops_json) {
        if stops.len() >= 2 {
            // Sort by position and take first and last
            let mut sorted = stops;
            sorted.sort_by(|a, b| a.position.partial_cmp(&b.position).unwrap());
            let start = sorted.first().map(|s| s.color.trim_start_matches('#').to_string())
                .unwrap_or_else(|| "1a1a2e".to_string());
            let end = sorted.last().map(|s| s.color.trim_start_matches('#').to_string())
                .unwrap_or_else(|| "2d2d44".to_string());
            return (start, end);
        } else if stops.len() == 1 {
            let color = stops[0].color.trim_start_matches('#').to_string();
            return (color.clone(), color);
        }
    }
    ("1a1a2e".to_string(), "2d2d44".to_string())
}

/// Convert CSS gradient angle to FFmpeg gradient coordinates
/// CSS: 0deg = bottom-to-top, 90deg = left-to-right, 180deg = top-to-bottom
/// FFmpeg gradients: x0:y0 is start point, x1:y1 is end point
fn angle_to_gradient_coords(angle: i32, width: i32, height: i32) -> (i32, i32, i32, i32) {
    let angle_rad = (angle as f64 - 90.0).to_radians(); // Adjust for CSS convention
    let cx = width as f64 / 2.0;
    let cy = height as f64 / 2.0;
    let diagonal = ((width * width + height * height) as f64).sqrt() / 2.0;

    let x0 = (cx - diagonal * angle_rad.cos()) as i32;
    let y0 = (cy - diagonal * angle_rad.sin()) as i32;
    let x1 = (cx + diagonal * angle_rad.cos()) as i32;
    let y1 = (cy + diagonal * angle_rad.sin()) as i32;

    (x0.max(0), y0.max(0), x1.min(width), y1.min(height))
}

// =============================================================================
// Media Probing
// =============================================================================

use serde::{Deserialize, Serialize};

/// Media probe result
#[derive(Debug, Serialize)]
pub struct MediaProbeResult {
    pub has_audio: bool,
    pub has_video: bool,
    pub duration_ms: Option<i64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
}

/// Probe a media file to get info about its streams
#[tauri::command]
pub async fn probe_media(app: AppHandle, path: String) -> Result<MediaProbeResult, TakaError> {
    // Check if file exists first
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        return Err(TakaError::Internal(format!("File not found: {}", path)));
    }

    // Use ffprobe to get stream info in JSON format
    // ffprobe reads container metadata which is fast even for large files
    let output = ffmpeg::ffprobe_command(&app)
        .map_err(|e| TakaError::Internal(e))?
        .args([
            "-v", "error",  // Show errors but not warnings
            "-print_format", "json",
            "-show_streams",
            "-show_format",
            &path,
        ])
        .output()
        .map_err(|e| TakaError::Internal(format!("Failed to run ffprobe: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(TakaError::Internal(format!(
            "ffprobe failed for {}: {}",
            path, stderr
        )));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Parse the JSON output
    let json: serde_json::Value = serde_json::from_str(&stdout)
        .map_err(|e| TakaError::Internal(format!("Failed to parse ffprobe output: {}", e)))?;

    let mut has_audio = false;
    let mut has_video = false;
    let mut width: Option<i32> = None;
    let mut height: Option<i32> = None;

    // Check streams for audio and video
    if let Some(streams) = json.get("streams").and_then(|s| s.as_array()) {
        for stream in streams {
            if let Some(codec_type) = stream.get("codec_type").and_then(|c| c.as_str()) {
                match codec_type {
                    "audio" => has_audio = true,
                    "video" => {
                        has_video = true;
                        if width.is_none() {
                            width = stream.get("width").and_then(|w| w.as_i64()).map(|w| w as i32);
                            height = stream.get("height").and_then(|h| h.as_i64()).map(|h| h as i32);
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    // Get duration from format
    let duration_ms = json.get("format")
        .and_then(|f| f.get("duration"))
        .and_then(|d| d.as_str())
        .and_then(|d| d.parse::<f64>().ok())
        .map(|d| (d * 1000.0) as i64);

    Ok(MediaProbeResult {
        has_audio,
        has_video,
        duration_ms,
        width,
        height,
    })
}

// =============================================================================
// Demo Video Rendering
// =============================================================================

/// Clip data for rendering
#[derive(Debug, Clone, Deserialize)]
pub struct RenderClip {
    pub source_path: String,
    pub source_type: String, // "video" | "image" | "audio"
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub in_point_ms: i64,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub scale: Option<f64>,
    pub opacity: Option<f64>,
    pub corner_radius: Option<i32>,
    pub crop_top: Option<i32>,    // Crop percentage from top (0-50)
    pub crop_bottom: Option<i32>, // Crop percentage from bottom (0-50)
    pub crop_left: Option<i32>,   // Crop percentage from left (0-50)
    pub crop_right: Option<i32>,  // Crop percentage from right (0-50)
    pub z_index: i32,
    pub has_audio: Option<bool>, // Whether video clip has audio track
    pub track_id: Option<String>, // Track ID for linking with zoom clips
    pub muted: Option<bool>,     // Whether to mute audio from this clip (for split audio)
}

/// Background data for rendering
#[derive(Debug, Clone, Deserialize)]
pub struct RenderBackground {
    pub background_type: String, // "solid" | "gradient" | "image"
    pub color: Option<String>,
    pub gradient_stops: Option<String>, // JSON array: [{ color: string, position: number }]
    pub gradient_angle: Option<i32>,
    pub image_url: Option<String>,  // External URL (e.g., Unsplash)
    pub media_path: Option<String>, // Local file path
}

/// Zoom clip data for rendering
#[derive(Debug, Clone, Deserialize)]
pub struct RenderZoomClip {
    pub target_track_id: String,        // The track this zoom applies to
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub zoom_scale: f64,                // e.g., 2.0 for 2x zoom
    pub zoom_center_x: f64,             // 0-100, percentage from left
    pub zoom_center_y: f64,             // 0-100, percentage from top
    pub ease_in_duration_ms: i64,
    pub ease_out_duration_ms: i64,
}

/// Blur clip data for rendering
#[derive(Debug, Clone, Deserialize)]
pub struct RenderBlurClip {
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub blur_intensity: f64,            // 0-100
    pub region_x: f64,                  // Center X position (0-100%)
    pub region_y: f64,                  // Center Y position (0-100%)
    pub region_width: f64,              // Width (0-100%)
    pub region_height: f64,             // Height (0-100%)
    pub corner_radius: f64,             // Corner radius (0-100)
    pub ease_in_duration_ms: i64,
    pub ease_out_duration_ms: i64,
    pub z_index: i32,                   // Layering order
}

/// Pan clip for animated position movement
#[derive(Debug, Clone, Deserialize)]
pub struct RenderPanClip {
    pub target_track_id: String,        // The track this pan applies to
    pub start_time_ms: i64,
    pub duration_ms: i64,
    pub start_x: f64,                   // Start center X position (0-100%)
    pub start_y: f64,                   // Start center Y position (0-100%)
    pub end_x: f64,                     // End center X position (0-100%)
    pub end_y: f64,                     // End center Y position (0-100%)
    pub ease_in_duration_ms: i64,
    pub ease_out_duration_ms: i64,
    pub z_index: i32,                   // Layering order
}

/// Demo render configuration
#[derive(Debug, Clone, Deserialize)]
pub struct RenderDemoConfig {
    pub width: i32,
    pub height: i32,
    pub frame_rate: i32,
    pub duration_ms: i64,
    pub format: String, // "mp4" | "webm"
    pub quality: String, // "draft" | "good" | "high" | "max"
    pub output_path: String,
    pub background: Option<RenderBackground>,
    pub clips: Vec<RenderClip>,
    pub zoom_clips: Option<Vec<RenderZoomClip>>, // Zoom effects from zoom tracks
    pub blur_clips: Option<Vec<RenderBlurClip>>, // Blur effects from blur tracks
    pub pan_clips: Option<Vec<RenderPanClip>>,   // Pan effects from pan tracks
}

/// Progress info for rendering (emitted via Tauri events)
#[derive(Debug, Serialize, Clone)]
pub struct RenderProgress {
    pub export_id: String,
    pub percent: f32,
    pub stage: String,
    pub current_frame: i64,
    pub total_frames: i64,
    pub fps: f32,           // Encoding speed (frames per second)
    pub elapsed_secs: f32,  // Time elapsed since start
    pub estimated_remaining_secs: Option<f32>, // Estimated time remaining
}

/// Export completion event
#[derive(Debug, Serialize, Clone)]
pub struct ExportComplete {
    pub export_id: String,
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

/// Export started event
#[derive(Debug, Serialize, Clone)]
pub struct ExportStarted {
    pub export_id: String,
    pub output_path: String,
    pub total_frames: i64,
    pub duration_ms: i64,
}

/// Render a demo video using FFmpeg
#[tauri::command]
pub async fn render_demo(
    app: AppHandle,
    config: RenderDemoConfig,
) -> Result<String, TakaError> {
    use std::process::Stdio;

    // Validate output path
    let output_path = PathBuf::from(&config.output_path);
    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| TakaError::Io(e))?;
        }
    }

    // Get quality settings - CRF lower = better quality
    // For reference: CRF 0 is lossless, 18 is visually lossless, 23 is default
    // Scale bitrate based on resolution (4K needs ~4x 1080p bitrate)
    let pixels = config.width as u64 * config.height as u64;
    let is_4k = pixels >= 3840 * 2160;
    let is_1440p = pixels >= 2560 * 1440 && !is_4k;

    // Bitrate multiplier based on resolution
    let bitrate_multiplier = if is_4k { 4 } else if is_1440p { 2 } else { 1 };

    let (crf, preset, base_bitrate, use_bitrate_cap) = match config.quality.as_str() {
        "draft" => ("28", "ultrafast", 2, true),
        "good" => ("18", "fast", 12, true),
        "high" => ("14", "medium", 25, true),
        "max" => ("8", "slow", 50, false),  // Near-lossless, no bitrate cap
        _ => ("18", "fast", 12, true),
    };

    let video_bitrate = format!("{}M", base_bitrate * bitrate_multiplier);

    // Build FFmpeg command
    let mut ffmpeg_args: Vec<String> = vec![
        "-y".to_string(), // Overwrite output
    ];

    let duration_sec = config.duration_ms as f64 / 1000.0;

    // Track if we're using an image background (affects input indexing)
    let mut bg_is_image = false;

    // Create background input based on type
    if let Some(ref bg) = config.background {
        match bg.background_type.as_str() {
            "image" => {
                // Image background - use local file or download external URL
                // Priority: media_path (local) > image_url (external, downloaded first)
                let image_path: Option<String> = if let Some(ref local_path) = bg.media_path {
                    if std::path::Path::new(local_path).exists() {
                        Some(local_path.clone())
                    } else {
                        None
                    }
                } else if let Some(ref url) = bg.image_url {
                    // Download external URL to temp file to avoid multiple requests
                    match download_url_to_temp(&app, url).await {
                        Ok(path) => Some(path.to_string_lossy().to_string()),
                        Err(e) => {
                            println!("Warning: Failed to download background image: {}", e);
                            None
                        }
                    }
                } else {
                    None
                };

                if let Some(source) = image_path {
                    bg_is_image = true;
                    ffmpeg_args.extend(vec![
                        "-loop".to_string(), "1".to_string(),
                        "-t".to_string(), format!("{:.3}", duration_sec),
                        "-i".to_string(), source,
                    ]);
                } else {
                    // No valid image source, fallback to default color
                    ffmpeg_args.extend(vec![
                        "-f".to_string(), "lavfi".to_string(),
                        "-i".to_string(),
                        format!("color=c=0x1a1a2e:s={}x{}:d={:.3}:r={}",
                            config.width, config.height, duration_sec, config.frame_rate),
                    ]);
                }
            }
            "gradient" => {
                // Gradient background using FFmpeg's gradients filter
                // Parse gradient stops to get start and end colors
                let (start_color, end_color) = if let Some(ref stops_json) = bg.gradient_stops {
                    parse_gradient_stops(stops_json)
                } else {
                    ("1a1a2e".to_string(), "2d2d44".to_string())
                };

                let angle = bg.gradient_angle.unwrap_or(180);
                // Convert angle to FFmpeg gradient direction
                // FFmpeg gradients: x0:y0:x1:y1 defines the gradient line
                let (x0, y0, x1, y1) = angle_to_gradient_coords(angle, config.width, config.height);

                ffmpeg_args.extend(vec![
                    "-f".to_string(), "lavfi".to_string(),
                    "-i".to_string(),
                    format!("gradients=s={}x{}:c0=0x{}:c1=0x{}:x0={}:y0={}:x1={}:y1={}:d={:.3}:r={}",
                        config.width, config.height,
                        start_color, end_color,
                        x0, y0, x1, y1,
                        duration_sec, config.frame_rate),
                ]);
            }
            _ => {
                // Solid color (default)
                let bg_color = bg.color.clone().unwrap_or_else(|| "#1a1a2e".to_string());
                let bg_hex = bg_color.trim_start_matches('#');

                ffmpeg_args.extend(vec![
                    "-f".to_string(), "lavfi".to_string(),
                    "-i".to_string(),
                    format!("color=c=0x{}:s={}x{}:d={:.3}:r={}",
                        bg_hex,
                        config.width, config.height, duration_sec, config.frame_rate),
                ]);
            }
        }
    } else {
        // No background specified, use default dark color
        ffmpeg_args.extend(vec![
            "-f".to_string(), "lavfi".to_string(),
            "-i".to_string(),
            format!("color=c=0x1a1a2e:s={}x{}:d={:.3}:r={}",
                config.width, config.height, duration_sec, config.frame_rate),
        ]);
    }

    // Sort clips by z_index (lower z_index = back, higher = front)
    let mut sorted_clips = config.clips.clone();
    sorted_clips.sort_by_key(|c| c.z_index);

    // Separate video/image clips and audio clips
    let mut input_index = 1; // 0 is background
    let mut video_inputs: Vec<(usize, &RenderClip)> = vec![];
    let mut audio_inputs: Vec<(usize, &RenderClip)> = vec![];

    // Add video/image inputs first
    for clip in &sorted_clips {
        if clip.source_type == "video" || clip.source_type == "image" {
            if clip.source_type == "image" {
                ffmpeg_args.extend(vec![
                    "-loop".to_string(), "1".to_string(),
                    "-t".to_string(), format!("{:.3}", clip.duration_ms as f64 / 1000.0),
                    "-i".to_string(), clip.source_path.clone(),
                ]);
            } else {
                if clip.in_point_ms > 0 {
                    ffmpeg_args.extend(vec![
                        "-ss".to_string(), format_ffmpeg_time(clip.in_point_ms),
                    ]);
                }
                ffmpeg_args.extend(vec![
                    "-t".to_string(), format!("{:.3}", clip.duration_ms as f64 / 1000.0),
                    "-i".to_string(), clip.source_path.clone(),
                ]);
            }
            video_inputs.push((input_index, clip));
            input_index += 1;
        }
    }

    // Add audio inputs
    for clip in &sorted_clips {
        if clip.source_type == "audio" {
            if clip.in_point_ms > 0 {
                ffmpeg_args.extend(vec![
                    "-ss".to_string(), format_ffmpeg_time(clip.in_point_ms),
                ]);
            }
            ffmpeg_args.extend(vec![
                "-t".to_string(), format!("{:.3}", clip.duration_ms as f64 / 1000.0),
                "-i".to_string(), clip.source_path.clone(),
            ]);
            audio_inputs.push((input_index, clip));
            input_index += 1;
        }
    }

    // Build filter complex for video
    let mut filter_parts: Vec<String> = vec![];

    // Handle background scaling if it's an image
    // Convert background to rgba format to support alpha compositing with overlays
    let current_output = if bg_is_image {
        // Scale image background to fit canvas (cover mode - crop to fill)
        // Format as rgba to support alpha blending with transparent clips
        filter_parts.push(format!(
            "[0:v]scale={}:{}:force_original_aspect_ratio=increase,crop={}:{},format=rgba[bg]",
            config.width, config.height, config.width, config.height
        ));
        "[bg]".to_string()
    } else {
        // For color/gradient backgrounds, also ensure rgba format
        filter_parts.push(format!("[0:v]format=rgba[bg]"));
        "[bg]".to_string()
    };
    let mut current_output = current_output;

    // Get zoom clips for lookup
    let zoom_clips = config.zoom_clips.as_ref();

    // Debug: Log all zoom clips received
    if let Some(zcs) = &zoom_clips {
        println!("DEBUG: Received {} zoom clips for rendering:", zcs.len());
        for (i, zc) in zcs.iter().enumerate() {
            println!("  Zoom clip {}: target_track_id={}, start={}ms, duration={}ms, scale={}",
                i, zc.target_track_id, zc.start_time_ms, zc.duration_ms, zc.zoom_scale);
        }
    } else {
        println!("DEBUG: No zoom clips received for rendering");
    }

    for (i, (input_idx, clip)) in video_inputs.iter().enumerate() {
        let scale = clip.scale.unwrap_or(0.8);
        // Calculate the target size preserving aspect ratio
        let target_w = (config.width as f64 * scale) as i32;
        let target_h = (config.height as f64 * scale) as i32;

        let pos_x = clip.position_x.unwrap_or(config.width as f64 / 2.0);
        let pos_y = clip.position_y.unwrap_or(config.height as f64 / 2.0);
        let corner_radius = clip.corner_radius.unwrap_or(0);
        let crop_top = clip.crop_top.unwrap_or(0);
        let crop_bottom = clip.crop_bottom.unwrap_or(0);
        let crop_left = clip.crop_left.unwrap_or(0);
        let crop_right = clip.crop_right.unwrap_or(0);
        let has_crop = crop_top > 0 || crop_bottom > 0 || crop_left > 0 || crop_right > 0;

        // Find zoom clips that target this clip's track
        let clip_zoom_effects: Vec<&RenderZoomClip> = zoom_clips
            .map(|zcs| {
                zcs.iter()
                    .filter(|zc| clip.track_id.as_ref() == Some(&zc.target_track_id))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        println!("DEBUG: Processing clip on track {:?}, found {} zoom effects targeting this track",
            clip.track_id, clip_zoom_effects.len());

        // Scale preserving aspect ratio, then pad to exact size
        let scaled_label = format!("scaled{}", i);

        // Get clip opacity (default to 1.0 = fully opaque)
        let opacity = clip.opacity.unwrap_or(1.0).clamp(0.0, 1.0);

        // Build the filter chain for this clip
        // Scale to fit within target dimensions (contain mode) while preserving aspect ratio
        // This matches CSS max-width/max-height behavior in the frontend
        // Use format=rgba to preserve alpha channel through the filter chain
        // Note: The scaled video may be smaller than target_w x target_h - that's intentional
        // The background shows through via the overlay
        //
        // IMPORTANT: We add fps filter to normalize frame rate BEFORE any time-based effects.
        // Screen recordings often have variable frame rates, and the 't' variable in FFmpeg
        // filters uses the frame timestamp. Without fps normalization, timestamps can be
        // irregular causing time-based effects (like zoom) to have incorrect timing.
        let mut clip_filters = format!(
            "[{}:v]fps={},format=rgba,scale={}:{}:force_original_aspect_ratio=decrease,setpts=PTS-STARTPTS",
            input_idx, config.frame_rate, target_w, target_h
        );

        // Apply zoom effects FIRST using scale + crop filters
        // This must come before crop/corner radius so the zoom is contained within the mask
        // For video zoom, we use scale with eval=frame + crop
        //
        // To support multiple zoom clips, we build a combined expression that evaluates
        // all zoom clips and returns the appropriate zoom level for any given time.
        // We also need combined expressions for center_x and center_y since different
        // zoom clips may have different center points.
        if !clip_zoom_effects.is_empty() {
            let clip_duration_sec = clip.duration_ms as f64 / 1000.0;

            // Build combined zoom expression for all zoom clips
            // Each zoom clip contributes its zoom level during its time range
            // Outside all zoom ranges, zoom = 1
            let mut zoom_expr_parts: Vec<(String, String)> = Vec::new();
            let mut center_x_expr_parts: Vec<(String, String)> = Vec::new();
            let mut center_y_expr_parts: Vec<(String, String)> = Vec::new();

            for (idx, zc) in clip_zoom_effects.iter().enumerate() {
                let zoom_start_in_clip = (zc.start_time_ms - clip.start_time_ms) as f64 / 1000.0;
                let zoom_duration_sec = zc.duration_ms as f64 / 1000.0;
                let zoom_end_in_clip = zoom_start_in_clip + zoom_duration_sec;

                // Skip zoom clips that don't overlap with this video clip's time range
                if zoom_end_in_clip <= 0.0 || zoom_start_in_clip >= clip_duration_sec {
                    println!("ZOOM DEBUG: Skipping zoom clip {} - no overlap with video clip", idx);
                    continue;
                }

                // Clamp zoom timing to the clip's boundaries
                let zoom_start = zoom_start_in_clip.max(0.0);
                let zoom_end = zoom_end_in_clip.min(clip_duration_sec);

                println!("ZOOM DEBUG: Zoom clip {}: start={}s, end={}s, scale={}, center=({},{})",
                    idx, zoom_start, zoom_end, zc.zoom_scale, zc.zoom_center_x, zc.zoom_center_y);

                let ease_in_sec = (zc.ease_in_duration_ms as f64 / 1000.0).max(0.001);
                let ease_out_sec = (zc.ease_out_duration_ms as f64 / 1000.0).max(0.001);
                let ease_in_end = zoom_start + ease_in_sec;
                let ease_out_start = zoom_end - ease_out_sec;

                let zoom_scale = zc.zoom_scale;
                let center_x = zc.zoom_center_x / 100.0;
                let center_y = zc.zoom_center_y / 100.0;

                // Build easing expression using quadratic ease-in-out
                // Frontend formula: progress < 0.5 ? 2*p*p : 1 - pow(-2*p + 2, 2) / 2
                // In FFmpeg: if(lt(p,0.5),2*p*p,1-pow(-2*p+2,2)/2)

                // For ease-in phase: p = (t - zoom_start) / ease_in_dur
                // eased_p = if(lt(p,0.5),2*p*p,1-pow(-2*p+2,2)/2)
                // zoom = 1 + (zoom_scale - 1) * eased_p
                let ease_in_p = format!("(t-{})/{}",zoom_start, ease_in_sec);
                let ease_in_eased = format!("if(lt({p},0.5),2*{p}*{p},1-pow(-2*{p}+2,2)/2)", p = ease_in_p);

                // For ease-out phase: p = (t - ease_out_start) / ease_out_dur
                // zoom = zoom_scale - (zoom_scale - 1) * eased_p
                let ease_out_p = format!("(t-{})/{}",ease_out_start, ease_out_sec);
                let ease_out_eased = format!("if(lt({p},0.5),2*{p}*{p},1-pow(-2*{p}+2,2)/2)", p = ease_out_p);

                // Build the zoom expression for this clip:
                // if t < zoom_start: not in this clip's range (handled by outer logic)
                // if t < ease_in_end: easing in
                // if t < ease_out_start: holding at zoom_scale
                // if t < zoom_end: easing out
                // else: not in this clip's range
                let clip_zoom_expr = format!(
                    "if(lt(t,{zoom_start}),1,if(lt(t,{ease_in_end}),1+({zoom_scale}-1)*({ease_in_eased}),if(lt(t,{ease_out_start}),{zoom_scale},if(lt(t,{zoom_end}),{zoom_scale}-({zoom_scale}-1)*({ease_out_eased}),1))))",
                    zoom_start = zoom_start,
                    ease_in_end = ease_in_end,
                    zoom_scale = zoom_scale,
                    ease_in_eased = ease_in_eased,
                    ease_out_start = ease_out_start,
                    zoom_end = zoom_end,
                    ease_out_eased = ease_out_eased,
                );

                // For multiple clips, we use if(gte(t,start)*lt(t,end), this_zoom, ...)
                // to select the right zoom expression based on time
                let time_check = format!("gte(t,{})*lt(t,{})", zoom_start, zoom_end);
                zoom_expr_parts.push((time_check.clone(), clip_zoom_expr));
                center_x_expr_parts.push((time_check.clone(), format!("{}", center_x)));
                center_y_expr_parts.push((time_check, format!("{}", center_y)));
            }

            // Build the final combined expressions
            if !zoom_expr_parts.is_empty() {
                // Combine all zoom expressions: if(time_in_clip1, zoom1, if(time_in_clip2, zoom2, 1))
                let mut combined_zoom = String::from("1"); // default: no zoom
                let mut combined_cx = String::from("0.5"); // default center
                let mut combined_cy = String::from("0.5");

                // Build nested if expressions from the end
                for (i, ((time_check, zoom_expr), ((_, cx), (_, cy)))) in zoom_expr_parts.iter()
                    .zip(center_x_expr_parts.iter().zip(center_y_expr_parts.iter()))
                    .enumerate().rev()
                {
                    combined_zoom = format!("if({},{},{})", time_check, zoom_expr, combined_zoom);
                    combined_cx = format!("if({},{},{})", time_check, cx, combined_cx);
                    combined_cy = format!("if({},{},{})", time_check, cy, combined_cy);
                    println!("ZOOM DEBUG: Added zoom clip {} to combined expression", i);
                }

                println!("ZOOM DEBUG: Combined zoom expression length: {} chars", combined_zoom.len());

                // Scale filter: dynamically resize based on zoom level
                let scale_w = format!("iw*({})", combined_zoom);
                let scale_h = format!("ih*({})", combined_zoom);

                // Crop filter dimensions and position
                // Crop size = scaled size / zoom = original size (dynamic)
                let crop_w = format!("in_w/({})", combined_zoom);
                let crop_h = format!("in_h/({})", combined_zoom);

                // Crop x,y: center the crop on the zoom point
                // Use the combined center expressions
                let crop_x = format!("in_w*(1-1/({}))*{}", combined_zoom, combined_cx);
                let crop_y = format!("in_h*(1-1/({}))*{}", combined_zoom, combined_cy);

                // Combine scale (with eval=frame for time expressions) and crop
                let zoom_filter = format!(
                    ",scale=w='{}':h='{}':eval=frame,crop=w='{}':h='{}':x='{}':y='{}'",
                    scale_w, scale_h, crop_w, crop_h, crop_x, crop_y
                );
                println!("ZOOM DEBUG: Generated combined zoom filter");
                clip_filters.push_str(&zoom_filter);
            }
        }

        // Apply crop and/or corner radius as alpha mask using geq filter AFTER zoom
        // This ensures the zoom effect is contained within the crop/border-radius mask
        // This matches CSS clipPath: inset(top% right% bottom% left% round Xpx)
        if has_crop || corner_radius > 0 {
            clip_filters.push_str(",format=yuva420p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='");

            // Calculate crop boundaries as expressions
            // These define the visible region after cropping
            let crop_left_px = format!("W*{}/100", crop_left);
            let crop_right_px = format!("W*(100-{})/100", crop_right);
            let crop_top_px = format!("H*{}/100", crop_top);
            let crop_bottom_px = format!("H*(100-{})/100", crop_bottom);

            // Build the alpha expression
            // The corner radius should apply to the corners of the CROPPED region, not the full frame
            let final_expr = if corner_radius > 0 {
                let r = corner_radius;
                // When we have both crop and corner radius:
                // - First check if pixel is outside crop region (alpha = 0)
                // - Then check if pixel is in a corner region of the cropped area
                // - Corner regions are measured from the crop boundaries, not from 0,0
                format!(
                    "255*if(lt(X,{cl}),0,if(gt(X,{cr}),0,if(lt(Y,{ct}),0,if(gt(Y,{cb}),0,\
                    if(lt(X,{cl}+{r})*lt(Y,{ct}+{r}),if(lte(hypot({cl}+{r}-X,{ct}+{r}-Y),{r}),1,0),\
                    if(gt(X,{cr}-{r})*lt(Y,{ct}+{r}),if(lte(hypot(X-{cr}+{r},{ct}+{r}-Y),{r}),1,0),\
                    if(lt(X,{cl}+{r})*gt(Y,{cb}-{r}),if(lte(hypot({cl}+{r}-X,Y-{cb}+{r}),{r}),1,0),\
                    if(gt(X,{cr}-{r})*gt(Y,{cb}-{r}),if(lte(hypot(X-{cr}+{r},Y-{cb}+{r}),{r}),1,0),\
                    1))))))))",
                    cl = crop_left_px,
                    cr = crop_right_px,
                    ct = crop_top_px,
                    cb = crop_bottom_px,
                    r = r
                )
            } else {
                // Crop only, no corner radius
                format!(
                    "255*if(lt(X,{cl}),0,if(gt(X,{cr}),0,if(lt(Y,{ct}),0,if(gt(Y,{cb}),0,1))))",
                    cl = crop_left_px,
                    cr = crop_right_px,
                    ct = crop_top_px,
                    cb = crop_bottom_px
                )
            };

            clip_filters.push_str(&final_expr);
            clip_filters.push_str("'");
        }

        // Apply opacity if less than 1.0
        // Use colorchannelmixer to multiply the alpha channel by the opacity value
        if opacity < 1.0 {
            // If we haven't applied geq yet (no crop/corner radius), add format=rgba first
            if !has_crop && corner_radius == 0 {
                clip_filters.push_str(",format=rgba");
            }
            clip_filters.push_str(&format!(",colorchannelmixer=aa={:.3}", opacity));
        }

        clip_filters.push_str(&format!("[{}]", scaled_label));
        filter_parts.push(clip_filters);

        // Use FFmpeg expressions to center the overlay at (pos_x, pos_y)
        // 'w' and 'h' refer to overlay dimensions, 'W' and 'H' refer to main video dimensions
        // overlay_x = pos_x - overlay_width/2
        // overlay_y = pos_y - overlay_height/2
        let overlay_x_expr = format!("{}-w/2", pos_x as i32);
        let overlay_y_expr = format!("{}-h/2", pos_y as i32);

        let start_sec = clip.start_time_ms as f64 / 1000.0;
        let end_sec = (clip.start_time_ms + clip.duration_ms) as f64 / 1000.0;

        let output_label = format!("out{}", i);
        // Use format=auto to preserve alpha channel properly in overlay
        filter_parts.push(format!(
            "{}[{}]overlay={}:{}:enable='between(t,{:.3},{:.3})':format=auto[{}]",
            current_output, scaled_label, overlay_x_expr, overlay_y_expr, start_sec, end_sec, output_label
        ));

        current_output = format!("[{}]", output_label);
    }

    // Apply blur clips after all video overlays
    // Sort blur clips by z_index so they layer correctly
    if let Some(ref blur_clips) = config.blur_clips {
        let mut sorted_blur_clips: Vec<&RenderBlurClip> = blur_clips.iter().collect();
        sorted_blur_clips.sort_by_key(|b| b.z_index);

        for (i, blur_clip) in sorted_blur_clips.iter().enumerate() {
            let blur_start_sec = blur_clip.start_time_ms as f64 / 1000.0;
            let blur_end_sec = (blur_clip.start_time_ms + blur_clip.duration_ms) as f64 / 1000.0;

            // Convert percentage-based region to pixels
            let region_w = (config.width as f64 * blur_clip.region_width / 100.0) as i32;
            let region_h = (config.height as f64 * blur_clip.region_height / 100.0) as i32;
            // region_x and region_y are center positions, convert to top-left
            let region_x = ((config.width as f64 * blur_clip.region_x / 100.0) - region_w as f64 / 2.0) as i32;
            let region_y = ((config.height as f64 * blur_clip.region_y / 100.0) - region_h as f64 / 2.0) as i32;

            // Clamp to valid range
            let region_x = region_x.max(0);
            let region_y = region_y.max(0);
            let region_w = region_w.min(config.width - region_x);
            let region_h = region_h.min(config.height - region_y);

            // Calculate blur radius (intensity 0-100 maps to blur radius 0-50)
            let blur_radius = (blur_clip.blur_intensity * 0.5).max(1.0) as i32;

            // Build blur filter: split, crop+blur, overlay back
            // The blur is applied with time-based enable using the between expression
            let blur_label = format!("blur{}", i);
            let blur_out_label = format!("blurout{}", i);

            // For easing, we'd need expression-based blur radius, but for simplicity
            // we'll apply constant blur for the duration (easing would require complex expressions)
            filter_parts.push(format!(
                "{}split[blur_bg{}][blur_fg{}]",
                current_output, i, i
            ));
            filter_parts.push(format!(
                "[blur_fg{}]crop={}:{}:{}:{},boxblur={}:{}:enable='between(t,{:.3},{:.3})'[{}]",
                i, region_w, region_h, region_x, region_y,
                blur_radius, blur_radius,
                blur_start_sec, blur_end_sec,
                blur_label
            ));
            filter_parts.push(format!(
                "[blur_bg{}][{}]overlay={}:{}:enable='between(t,{:.3},{:.3})'[{}]",
                i, blur_label, region_x, region_y,
                blur_start_sec, blur_end_sec,
                blur_out_label
            ));

            current_output = format!("[{}]", blur_out_label);
        }
    }

    // Apply pan clips for animated position effects
    // Pan effect shifts the entire frame position over time
    // This is implemented by scaling up the frame and using animated crop
    if let Some(ref pan_clips) = config.pan_clips {
        let mut sorted_pan_clips: Vec<&RenderPanClip> = pan_clips.iter().collect();
        sorted_pan_clips.sort_by_key(|p| p.z_index);

        for (i, pan_clip) in sorted_pan_clips.iter().enumerate() {
            let pan_start_sec = pan_clip.start_time_ms as f64 / 1000.0;
            let pan_end_sec = (pan_clip.start_time_ms + pan_clip.duration_ms) as f64 / 1000.0;
            let pan_duration_sec = pan_clip.duration_ms as f64 / 1000.0;

            // Convert percentage positions to pixel offsets
            // At 50%, no offset (centered). At 0%, offset left/up. At 100%, offset right/down.
            // For a pan effect, we need to scale up the video and crop a window that moves
            // Scale factor determines how much we can pan (e.g., 1.2x scale allows 20% pan range)
            let scale_factor = 1.5; // 50% extra on each side allows full 0-100% range
            let scaled_w = (config.width as f64 * scale_factor) as i32;
            let scaled_h = (config.height as f64 * scale_factor) as i32;

            // Calculate max pan offset (how much the scaled frame extends beyond output)
            let max_offset_x = (scaled_w - config.width) as f64;
            let max_offset_y = (scaled_h - config.height) as f64;

            // Start and end offsets (convert 0-100% to actual pixel offsets)
            // 0% = max offset (show left/top edge), 100% = 0 offset (show right/bottom edge)
            // Actually: 50% = centered, 0% = pan left/up, 100% = pan right/down
            let start_offset_x = ((100.0 - pan_clip.start_x) / 100.0) * max_offset_x;
            let start_offset_y = ((100.0 - pan_clip.start_y) / 100.0) * max_offset_y;
            let end_offset_x = ((100.0 - pan_clip.end_x) / 100.0) * max_offset_x;
            let end_offset_y = ((100.0 - pan_clip.end_y) / 100.0) * max_offset_y;

            let pan_scale_label = format!("panscale{}", i);
            let pan_out_label = format!("panout{}", i);

            // Scale up the current output to allow panning
            filter_parts.push(format!(
                "{}scale={}:{}[{}]",
                current_output, scaled_w, scaled_h, pan_scale_label
            ));

            // Calculate animated x/y expressions for the crop
            // During pan clip: linearly interpolate from start to end offset
            // Before and after: hold at start/end positions respectively
            // Expression: if(lt(t,start), start_val, if(lt(t,end), lerp, end_val))
            // Lerp formula: start + (end - start) * (t - start) / duration
            let x_expr = format!(
                "if(lt(t\\,{:.3})\\,{:.1}\\,if(lt(t\\,{:.3})\\,{:.1}+({:.1}-{:.1})*(t-{:.3})/{:.3}\\,{:.1}))",
                pan_start_sec,
                start_offset_x,
                pan_end_sec,
                start_offset_x,
                end_offset_x,
                start_offset_x,
                pan_start_sec,
                pan_duration_sec,
                end_offset_x
            );
            let y_expr = format!(
                "if(lt(t\\,{:.3})\\,{:.1}\\,if(lt(t\\,{:.3})\\,{:.1}+({:.1}-{:.1})*(t-{:.3})/{:.3}\\,{:.1}))",
                pan_start_sec,
                start_offset_y,
                pan_end_sec,
                start_offset_y,
                end_offset_y,
                start_offset_y,
                pan_start_sec,
                pan_duration_sec,
                end_offset_y
            );

            // Crop with animated position to create pan effect
            filter_parts.push(format!(
                "[{}]crop={}:{}:'{}':[{}]",
                pan_scale_label, config.width, config.height, x_expr, pan_out_label
            ));

            // Actually we need to handle y as well - FFmpeg crop takes x:y:w:h
            // Let's fix this to use both x and y expressions
            filter_parts.pop(); // Remove the previous incorrect crop
            filter_parts.push(format!(
                "[{}]crop={}:{}:'{}':'{}'[{}]",
                pan_scale_label, config.width, config.height, x_expr, y_expr, pan_out_label
            ));

            current_output = format!("[{}]", pan_out_label);
        }
    }

    // Build audio filter - mix all audio clips with delays
    let mut audio_filter_parts: Vec<String> = vec![];
    let mut audio_labels: Vec<String> = vec![];

    for (i, (input_idx, clip)) in audio_inputs.iter().enumerate() {
        let delay_ms = clip.start_time_ms;
        let audio_label = format!("aud{}", i);
        // Delay audio to start at the right time, then pad to full duration
        audio_filter_parts.push(format!(
            "[{}:a]adelay={}|{},apad=whole_dur={:.3}[{}]",
            input_idx, delay_ms, delay_ms, duration_sec, audio_label
        ));
        audio_labels.push(format!("[{}]", audio_label));
    }

    // Also get audio from video clips (only if they have audio and are not muted)
    let mut video_audio_labels: Vec<String> = vec![];
    for (i, (input_idx, clip)) in video_inputs.iter().enumerate() {
        // Only extract audio from video clips that have audio tracks and are not muted
        // Muted clips have their audio split out to a separate audio track
        if clip.source_type == "video" && clip.has_audio.unwrap_or(false) && !clip.muted.unwrap_or(false) {
            let delay_ms = clip.start_time_ms;
            let audio_label = format!("vaud{}", i);
            audio_filter_parts.push(format!(
                "[{}:a]adelay={}|{},apad=whole_dur={:.3}[{}]",
                input_idx, delay_ms, delay_ms, duration_sec, audio_label
            ));
            video_audio_labels.push(format!("[{}]", audio_label));
        }
    }

    // Combine video filter with audio filter
    let has_video_filter = !filter_parts.is_empty();
    let all_audio_labels: Vec<String> = audio_labels.iter().chain(video_audio_labels.iter()).cloned().collect();
    let has_audio = !all_audio_labels.is_empty();

    if has_video_filter || has_audio {
        let mut full_filter = filter_parts.join(";");

        if has_audio {
            if !full_filter.is_empty() {
                full_filter.push(';');
            }
            full_filter.push_str(&audio_filter_parts.join(";"));

            // Mix all audio streams
            if all_audio_labels.len() > 1 {
                full_filter.push_str(&format!(
                    ";{}amix=inputs={}:duration=longest[aout]",
                    all_audio_labels.join(""),
                    all_audio_labels.len()
                ));
            } else if all_audio_labels.len() == 1 {
                // Single audio source, just rename it
                full_filter.push_str(&format!(
                    ";{}acopy[aout]",
                    all_audio_labels[0]
                ));
            }
        }

        ffmpeg_args.extend(vec![
            "-filter_complex".to_string(), full_filter,
        ]);

        if has_video_filter {
            ffmpeg_args.extend(vec!["-map".to_string(), current_output.clone()]);
        } else {
            ffmpeg_args.extend(vec!["-map".to_string(), "[0:v]".to_string()]);
        }

        if has_audio {
            ffmpeg_args.extend(vec!["-map".to_string(), "[aout]".to_string()]);
        }

        ffmpeg_args.extend(vec![
            "-c:v".to_string(), "libx264".to_string(),
            "-pix_fmt".to_string(), "yuv420p".to_string(),
            "-crf".to_string(), crf.to_string(),
            "-preset".to_string(), preset.to_string(),
        ]);

        // Only add bitrate cap for non-max quality (max quality uses CRF only for best quality)
        if use_bitrate_cap {
            let bitrate_num = video_bitrate.trim_end_matches('M').parse::<i32>().unwrap_or(12);
            ffmpeg_args.extend(vec![
                "-b:v".to_string(), video_bitrate.clone(),
                "-maxrate".to_string(), video_bitrate.clone(),
                "-bufsize".to_string(), format!("{}M", bitrate_num * 2),
            ]);
        }

        if has_audio {
            ffmpeg_args.extend(vec![
                "-c:a".to_string(), "aac".to_string(),
                "-b:a".to_string(), "320k".to_string(),  // High quality audio
            ]);
        }
    } else {
        // No clips, just use background (no audio)
        ffmpeg_args.extend(vec![
            "-c:v".to_string(), "libx264".to_string(),
            "-pix_fmt".to_string(), "yuv420p".to_string(),
            "-crf".to_string(), crf.to_string(),
            "-preset".to_string(), preset.to_string(),
        ]);

        if use_bitrate_cap {
            let bitrate_num = video_bitrate.trim_end_matches('M').parse::<i32>().unwrap_or(12);
            ffmpeg_args.extend(vec![
                "-b:v".to_string(), video_bitrate.clone(),
                "-maxrate".to_string(), video_bitrate.clone(),
                "-bufsize".to_string(), format!("{}M", bitrate_num * 2),
            ]);
        }
    }

    // Add output settings
    ffmpeg_args.extend(vec![
        "-r".to_string(), config.frame_rate.to_string(),
        "-movflags".to_string(), "+faststart".to_string(),
        config.output_path.clone(),
    ]);

    // Log the command for debugging
    println!("FFmpeg command: ffmpeg {}", ffmpeg_args.join(" "));

    // Run FFmpeg
    let output = ffmpeg::ffmpeg_command(&app)
        .map_err(|e| TakaError::Internal(e))?
        .args(&ffmpeg_args)
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| TakaError::Internal(format!("Failed to run FFmpeg: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(TakaError::Internal(format!(
            "FFmpeg render failed: {}",
            stderr
        )));
    }

    Ok(config.output_path)
}

/// Parse FFmpeg progress output to extract frame number, fps, and time
/// FFmpeg outputs progress in the format:
/// frame=  123 fps= 30 q=28.0 size=    1234kB time=00:00:05.00 bitrate= 2000.0kbits/s speed=1.5x
fn parse_ffmpeg_progress(line: &str) -> Option<(i64, f32, f64)> {
    let mut frame: Option<i64> = None;
    let mut fps: Option<f32> = None;
    let mut time_secs: Option<f64> = None;

    // Parse frame=XXX
    if let Some(frame_start) = line.find("frame=") {
        let rest = &line[frame_start + 6..];
        let frame_str: String = rest.chars()
            .skip_while(|c| c.is_whitespace())
            .take_while(|c| c.is_ascii_digit())
            .collect();
        frame = frame_str.parse().ok();
    }

    // Parse fps=XXX
    if let Some(fps_start) = line.find("fps=") {
        let rest = &line[fps_start + 4..];
        let fps_str: String = rest.chars()
            .skip_while(|c| c.is_whitespace())
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect();
        fps = fps_str.parse().ok();
    }

    // Parse time=HH:MM:SS.mm
    if let Some(time_start) = line.find("time=") {
        let rest = &line[time_start + 5..];
        let time_str: String = rest.chars()
            .take_while(|c| c.is_ascii_digit() || *c == ':' || *c == '.')
            .collect();

        // Parse HH:MM:SS.mm format
        let parts: Vec<&str> = time_str.split(':').collect();
        if parts.len() == 3 {
            let hours: f64 = parts[0].parse().unwrap_or(0.0);
            let minutes: f64 = parts[1].parse().unwrap_or(0.0);
            let seconds: f64 = parts[2].parse().unwrap_or(0.0);
            time_secs = Some(hours * 3600.0 + minutes * 60.0 + seconds);
        }
    }

    match (frame, fps, time_secs) {
        (Some(f), Some(r), Some(t)) => Some((f, r, t)),
        (Some(f), _, Some(t)) => Some((f, 0.0, t)), // fps might be 0 initially
        _ => None,
    }
}

/// Background render configuration (includes export_id for tracking)
#[derive(Debug, Clone, Deserialize)]
pub struct BackgroundRenderConfig {
    pub export_id: String,
    #[serde(flatten)]
    pub config: RenderDemoConfig,
}

/// Start a background render that emits progress events
/// Returns immediately with the export_id, the actual rendering happens in a spawned task
#[tauri::command]
pub async fn render_demo_background(
    app: AppHandle,
    export_id: String,
    config: RenderDemoConfig,
) -> Result<String, TakaError> {
    use std::process::Stdio;
    use std::time::Instant;

    // Calculate total frames for progress tracking
    let total_frames = (config.duration_ms as f64 / 1000.0 * config.frame_rate as f64) as i64;
    let duration_ms = config.duration_ms;
    let output_path = config.output_path.clone();
    let export_id_clone = export_id.clone();

    // Emit export started event
    let _ = app.emit("export-started", ExportStarted {
        export_id: export_id.clone(),
        output_path: output_path.clone(),
        total_frames,
        duration_ms,
    });

    // Validate output path
    let output_path_buf = PathBuf::from(&config.output_path);
    if let Some(parent) = output_path_buf.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| TakaError::Io(e))?;
        }
    }

    // Get quality settings
    let pixels = config.width as u64 * config.height as u64;
    let is_4k = pixels >= 3840 * 2160;
    let is_1440p = pixels >= 2560 * 1440 && !is_4k;
    let bitrate_multiplier = if is_4k { 4 } else if is_1440p { 2 } else { 1 };

    let (crf, preset, base_bitrate, use_bitrate_cap) = match config.quality.as_str() {
        "draft" => ("28", "ultrafast", 2, true),
        "good" => ("18", "fast", 12, true),
        "high" => ("14", "medium", 25, true),
        "max" => ("8", "slow", 50, false),
        _ => ("18", "fast", 12, true),
    };

    let video_bitrate = format!("{}M", base_bitrate * bitrate_multiplier);
    let duration_sec = config.duration_ms as f64 / 1000.0;

    // Build FFmpeg arguments (same logic as render_demo but extracted to avoid duplication)
    let ffmpeg_args = build_ffmpeg_args(
        &app,
        &config,
        crf,
        preset,
        &video_bitrate,
        use_bitrate_cap,
        duration_sec,
    ).await?;

    // Log the command for debugging
    println!("FFmpeg background command: ffmpeg {}", ffmpeg_args.join(" "));

    // Spawn background task for FFmpeg execution
    let app_clone = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        use std::sync::{Arc, Mutex};
        use std::thread;

        let start_time = Instant::now();

        let mut child = match ffmpeg::ffmpeg_command(&app_clone) {
            Ok(mut cmd) => {
                match cmd
                    .args(&ffmpeg_args)
                    .stdout(Stdio::null())
                    .stderr(Stdio::piped())
                    .spawn()
                {
                    Ok(child) => child,
                    Err(e) => {
                        let _ = app_clone.emit("export-complete", ExportComplete {
                            export_id: export_id_clone,
                            success: false,
                            output_path: None,
                            error: Some(format!("Failed to spawn FFmpeg: {}", e)),
                        });
                        return;
                    }
                }
            }
            Err(e) => {
                let _ = app_clone.emit("export-complete", ExportComplete {
                    export_id: export_id_clone,
                    success: false,
                    output_path: None,
                    error: Some(format!("Failed to create FFmpeg command: {}", e)),
                });
                return;
            }
        };

        // Take stderr and read it in a separate thread to avoid blocking FFmpeg
        let stderr = child.stderr.take();
        let stderr_output = Arc::new(Mutex::new(String::new()));
        let stderr_output_clone = Arc::clone(&stderr_output);

        // Clone values needed by the stderr reader thread
        let app_for_progress = app_clone.clone();
        let export_id_for_progress = export_id_clone.clone();

        let stderr_thread = stderr.map(|stderr| {
            thread::spawn(move || {
                use std::io::{BufReader, Read};
                let mut reader = BufReader::new(stderr);
                let mut line_buffer = String::new();
                let mut buffer = [0u8; 4096]; // Read in larger chunks for performance

                loop {
                    match reader.read(&mut buffer) {
                        Ok(0) => break, // EOF
                        Ok(n) => {
                            for &byte in &buffer[..n] {
                                let ch = byte as char;

                                if ch == '\r' || ch == '\n' {
                                    if !line_buffer.is_empty() {
                                        // Store for error reporting
                                        if let Ok(mut output) = stderr_output_clone.lock() {
                                            output.push_str(&line_buffer);
                                            output.push('\n');
                                        }

                                        // Parse and emit progress
                                        if let Some((frame, fps, time_secs)) = parse_ffmpeg_progress(&line_buffer) {
                                            let elapsed_secs = start_time.elapsed().as_secs_f32();
                                            let percent = if duration_sec > 0.0 {
                                                ((time_secs / duration_sec) * 100.0).min(100.0) as f32
                                            } else {
                                                0.0
                                            };

                                            let estimated_remaining = if percent > 0.0 && elapsed_secs > 0.0 {
                                                let total_estimated = elapsed_secs / (percent / 100.0);
                                                Some((total_estimated - elapsed_secs).max(0.0))
                                            } else {
                                                None
                                            };

                                            let _ = app_for_progress.emit("export-progress", RenderProgress {
                                                export_id: export_id_for_progress.clone(),
                                                percent,
                                                stage: "Encoding".to_string(),
                                                current_frame: frame,
                                                total_frames,
                                                fps,
                                                elapsed_secs,
                                                estimated_remaining_secs: estimated_remaining,
                                            });
                                        }

                                        line_buffer.clear();
                                    }
                                } else {
                                    line_buffer.push(ch);
                                }
                            }
                        }
                        Err(_) => break,
                    }
                }
            })
        });

        // Wait for FFmpeg to complete (this doesn't block on stderr anymore)
        let status = child.wait();

        // Wait for stderr thread to finish
        if let Some(thread) = stderr_thread {
            let _ = thread.join();
        }

        // Get the collected stderr output
        let stderr_output = stderr_output.lock().map(|s| s.clone()).unwrap_or_default();

        match status {
            Ok(exit_status) if exit_status.success() => {
                // Emit 100% progress before completion
                let elapsed_secs = start_time.elapsed().as_secs_f32();
                let _ = app_clone.emit("export-progress", RenderProgress {
                    export_id: export_id_clone.clone(),
                    percent: 100.0,
                    stage: "Complete".to_string(),
                    current_frame: total_frames,
                    total_frames,
                    fps: 0.0,
                    elapsed_secs,
                    estimated_remaining_secs: Some(0.0),
                });

                let _ = app_clone.emit("export-complete", ExportComplete {
                    export_id: export_id_clone,
                    success: true,
                    output_path: Some(output_path),
                    error: None,
                });
            }
            Ok(_) => {
                let _ = app_clone.emit("export-complete", ExportComplete {
                    export_id: export_id_clone,
                    success: false,
                    output_path: None,
                    error: Some(format!("FFmpeg failed: {}", stderr_output)),
                });
            }
            Err(e) => {
                let _ = app_clone.emit("export-complete", ExportComplete {
                    export_id: export_id_clone,
                    success: false,
                    output_path: None,
                    error: Some(format!("Failed to wait for FFmpeg: {}", e)),
                });
            }
        }
    });

    // Return immediately with the export_id
    Ok(export_id)
}

/// Helper function to build FFmpeg arguments (shared between sync and async render)
async fn build_ffmpeg_args(
    app: &AppHandle,
    config: &RenderDemoConfig,
    crf: &str,
    preset: &str,
    video_bitrate: &str,
    use_bitrate_cap: bool,
    duration_sec: f64,
) -> Result<Vec<String>, TakaError> {
    let mut ffmpeg_args: Vec<String> = vec![
        "-y".to_string(),
    ];

    let mut bg_is_image = false;

    // Create background input based on type
    if let Some(ref bg) = config.background {
        match bg.background_type.as_str() {
            "image" => {
                let image_path: Option<String> = if let Some(ref local_path) = bg.media_path {
                    if std::path::Path::new(local_path).exists() {
                        Some(local_path.clone())
                    } else {
                        None
                    }
                } else if let Some(ref url) = bg.image_url {
                    match download_url_to_temp(app, url).await {
                        Ok(path) => Some(path.to_string_lossy().to_string()),
                        Err(e) => {
                            println!("Warning: Failed to download background image: {}", e);
                            None
                        }
                    }
                } else {
                    None
                };

                if let Some(source) = image_path {
                    bg_is_image = true;
                    ffmpeg_args.extend(vec![
                        "-loop".to_string(), "1".to_string(),
                        "-t".to_string(), format!("{:.3}", duration_sec),
                        "-i".to_string(), source,
                    ]);
                } else {
                    ffmpeg_args.extend(vec![
                        "-f".to_string(), "lavfi".to_string(),
                        "-i".to_string(),
                        format!("color=c=0x1a1a2e:s={}x{}:d={:.3}:r={}",
                            config.width, config.height, duration_sec, config.frame_rate),
                    ]);
                }
            }
            "gradient" => {
                let (start_color, end_color) = if let Some(ref stops_json) = bg.gradient_stops {
                    parse_gradient_stops(stops_json)
                } else {
                    ("1a1a2e".to_string(), "2d2d44".to_string())
                };

                let angle = bg.gradient_angle.unwrap_or(180);
                let (x0, y0, x1, y1) = angle_to_gradient_coords(angle, config.width, config.height);

                ffmpeg_args.extend(vec![
                    "-f".to_string(), "lavfi".to_string(),
                    "-i".to_string(),
                    format!("gradients=s={}x{}:c0=0x{}:c1=0x{}:x0={}:y0={}:x1={}:y1={}:d={:.3}:r={}",
                        config.width, config.height,
                        start_color, end_color,
                        x0, y0, x1, y1,
                        duration_sec, config.frame_rate),
                ]);
            }
            _ => {
                let bg_color = bg.color.clone().unwrap_or_else(|| "#1a1a2e".to_string());
                let bg_hex = bg_color.trim_start_matches('#');

                ffmpeg_args.extend(vec![
                    "-f".to_string(), "lavfi".to_string(),
                    "-i".to_string(),
                    format!("color=c=0x{}:s={}x{}:d={:.3}:r={}",
                        bg_hex,
                        config.width, config.height, duration_sec, config.frame_rate),
                ]);
            }
        }
    } else {
        ffmpeg_args.extend(vec![
            "-f".to_string(), "lavfi".to_string(),
            "-i".to_string(),
            format!("color=c=0x1a1a2e:s={}x{}:d={:.3}:r={}",
                config.width, config.height, duration_sec, config.frame_rate),
        ]);
    }

    // Sort clips by z_index
    let mut sorted_clips = config.clips.clone();
    sorted_clips.sort_by_key(|c| c.z_index);

    let mut input_index = 1;
    let mut video_inputs: Vec<(usize, RenderClip)> = vec![];
    let mut audio_inputs: Vec<(usize, RenderClip)> = vec![];

    // Add video/image inputs
    for clip in &sorted_clips {
        if clip.source_type == "video" || clip.source_type == "image" {
            if clip.source_type == "image" {
                ffmpeg_args.extend(vec![
                    "-loop".to_string(), "1".to_string(),
                    "-t".to_string(), format!("{:.3}", clip.duration_ms as f64 / 1000.0),
                    "-i".to_string(), clip.source_path.clone(),
                ]);
            } else {
                if clip.in_point_ms > 0 {
                    ffmpeg_args.extend(vec![
                        "-ss".to_string(), format_ffmpeg_time(clip.in_point_ms),
                    ]);
                }
                ffmpeg_args.extend(vec![
                    "-t".to_string(), format!("{:.3}", clip.duration_ms as f64 / 1000.0),
                    "-i".to_string(), clip.source_path.clone(),
                ]);
            }
            video_inputs.push((input_index, clip.clone()));
            input_index += 1;
        }
    }

    // Add audio inputs
    for clip in &sorted_clips {
        if clip.source_type == "audio" {
            if clip.in_point_ms > 0 {
                ffmpeg_args.extend(vec![
                    "-ss".to_string(), format_ffmpeg_time(clip.in_point_ms),
                ]);
            }
            ffmpeg_args.extend(vec![
                "-t".to_string(), format!("{:.3}", clip.duration_ms as f64 / 1000.0),
                "-i".to_string(), clip.source_path.clone(),
            ]);
            audio_inputs.push((input_index, clip.clone()));
            input_index += 1;
        }
    }

    // Build filter complex
    let mut filter_parts: Vec<String> = vec![];

    let current_output = if bg_is_image {
        filter_parts.push(format!(
            "[0:v]scale={}:{}:force_original_aspect_ratio=increase,crop={}:{},format=rgba[bg]",
            config.width, config.height, config.width, config.height
        ));
        "[bg]".to_string()
    } else {
        filter_parts.push(format!("[0:v]format=rgba[bg]"));
        "[bg]".to_string()
    };
    let mut current_output = current_output;

    let zoom_clips = config.zoom_clips.as_ref();

    for (i, (input_idx, clip)) in video_inputs.iter().enumerate() {
        let scale = clip.scale.unwrap_or(0.8);
        let target_w = (config.width as f64 * scale) as i32;
        let target_h = (config.height as f64 * scale) as i32;

        let pos_x = clip.position_x.unwrap_or(config.width as f64 / 2.0);
        let pos_y = clip.position_y.unwrap_or(config.height as f64 / 2.0);
        let corner_radius = clip.corner_radius.unwrap_or(0);
        let crop_top = clip.crop_top.unwrap_or(0);
        let crop_bottom = clip.crop_bottom.unwrap_or(0);
        let crop_left = clip.crop_left.unwrap_or(0);
        let crop_right = clip.crop_right.unwrap_or(0);
        let has_crop = crop_top > 0 || crop_bottom > 0 || crop_left > 0 || crop_right > 0;

        let clip_zoom_effects: Vec<&RenderZoomClip> = zoom_clips
            .map(|zcs| {
                zcs.iter()
                    .filter(|zc| clip.track_id.as_ref() == Some(&zc.target_track_id))
                    .collect::<Vec<_>>()
            })
            .unwrap_or_default();

        let scaled_label = format!("scaled{}", i);
        let opacity = clip.opacity.unwrap_or(1.0).clamp(0.0, 1.0);

        let mut clip_filters = format!(
            "[{}:v]fps={},format=rgba,scale={}:{}:force_original_aspect_ratio=decrease,setpts=PTS-STARTPTS",
            input_idx, config.frame_rate, target_w, target_h
        );

        // Apply zoom effects (simplified - full implementation same as render_demo)
        if !clip_zoom_effects.is_empty() {
            let clip_duration_sec = clip.duration_ms as f64 / 1000.0;
            let mut zoom_expr_parts: Vec<(String, String)> = Vec::new();
            let mut center_x_expr_parts: Vec<(String, String)> = Vec::new();
            let mut center_y_expr_parts: Vec<(String, String)> = Vec::new();

            for (idx, zc) in clip_zoom_effects.iter().enumerate() {
                let zoom_start_in_clip = (zc.start_time_ms - clip.start_time_ms) as f64 / 1000.0;
                let zoom_duration_sec = zc.duration_ms as f64 / 1000.0;
                let zoom_end_in_clip = zoom_start_in_clip + zoom_duration_sec;

                if zoom_end_in_clip <= 0.0 || zoom_start_in_clip >= clip_duration_sec {
                    continue;
                }

                let zoom_start = zoom_start_in_clip.max(0.0);
                let zoom_end = zoom_end_in_clip.min(clip_duration_sec);

                let ease_in_sec = (zc.ease_in_duration_ms as f64 / 1000.0).max(0.001);
                let ease_out_sec = (zc.ease_out_duration_ms as f64 / 1000.0).max(0.001);
                let ease_in_end = zoom_start + ease_in_sec;
                let ease_out_start = zoom_end - ease_out_sec;

                let zoom_scale = zc.zoom_scale;
                let center_x = zc.zoom_center_x / 100.0;
                let center_y = zc.zoom_center_y / 100.0;

                let ease_in_p = format!("(t-{})/{}",zoom_start, ease_in_sec);
                let ease_in_eased = format!("if(lt({p},0.5),2*{p}*{p},1-pow(-2*{p}+2,2)/2)", p = ease_in_p);
                let ease_out_p = format!("(t-{})/{}",ease_out_start, ease_out_sec);
                let ease_out_eased = format!("if(lt({p},0.5),2*{p}*{p},1-pow(-2*{p}+2,2)/2)", p = ease_out_p);

                let clip_zoom_expr = format!(
                    "if(lt(t,{zoom_start}),1,if(lt(t,{ease_in_end}),1+({zoom_scale}-1)*({ease_in_eased}),if(lt(t,{ease_out_start}),{zoom_scale},if(lt(t,{zoom_end}),{zoom_scale}-({zoom_scale}-1)*({ease_out_eased}),1))))",
                    zoom_start = zoom_start,
                    ease_in_end = ease_in_end,
                    zoom_scale = zoom_scale,
                    ease_in_eased = ease_in_eased,
                    ease_out_start = ease_out_start,
                    zoom_end = zoom_end,
                    ease_out_eased = ease_out_eased,
                );

                let time_check = format!("gte(t,{})*lt(t,{})", zoom_start, zoom_end);
                zoom_expr_parts.push((time_check.clone(), clip_zoom_expr));
                center_x_expr_parts.push((time_check.clone(), format!("{}", center_x)));
                center_y_expr_parts.push((time_check, format!("{}", center_y)));
            }

            if !zoom_expr_parts.is_empty() {
                let mut combined_zoom = String::from("1");
                let mut combined_cx = String::from("0.5");
                let mut combined_cy = String::from("0.5");

                for (i, ((time_check, zoom_expr), ((_, cx), (_, cy)))) in zoom_expr_parts.iter()
                    .zip(center_x_expr_parts.iter().zip(center_y_expr_parts.iter()))
                    .enumerate().rev()
                {
                    combined_zoom = format!("if({},{},{})", time_check, zoom_expr, combined_zoom);
                    combined_cx = format!("if({},{},{})", time_check, cx, combined_cx);
                    combined_cy = format!("if({},{},{})", time_check, cy, combined_cy);
                }

                let scale_w = format!("iw*({})", combined_zoom);
                let scale_h = format!("ih*({})", combined_zoom);
                let crop_w = format!("in_w/({})", combined_zoom);
                let crop_h = format!("in_h/({})", combined_zoom);
                let crop_x = format!("in_w*(1-1/({}))*{}", combined_zoom, combined_cx);
                let crop_y = format!("in_h*(1-1/({}))*{}", combined_zoom, combined_cy);

                let zoom_filter = format!(
                    ",scale=w='{}':h='{}':eval=frame,crop=w='{}':h='{}':x='{}':y='{}'",
                    scale_w, scale_h, crop_w, crop_h, crop_x, crop_y
                );
                clip_filters.push_str(&zoom_filter);
            }
        }

        // Apply crop and corner radius
        // Note: geq filter is very slow (evaluates per-pixel). For draft quality, skip corner radius.
        // For higher quality, use geq but it will be slower.
        let is_draft = config.quality == "draft";

        if has_crop || (corner_radius > 0 && !is_draft) {
            // Use simple crop for cropping (fast)
            if has_crop && corner_radius == 0 {
                // Simple rectangular crop - much faster than geq
                let crop_w = format!("in_w*(100-{}-{})/100", crop_left, crop_right);
                let crop_h = format!("in_h*(100-{}-{})/100", crop_top, crop_bottom);
                let crop_x = format!("in_w*{}/100", crop_left);
                let crop_y = format!("in_h*{}/100", crop_top);
                clip_filters.push_str(&format!(",crop={}:{}:{}:{}", crop_w, crop_h, crop_x, crop_y));
            } else if corner_radius > 0 && !is_draft {
                // Corner radius requires geq (slow but necessary for quality)
                clip_filters.push_str(",format=yuva420p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':a='");

                let crop_left_px = format!("W*{}/100", crop_left);
                let crop_right_px = format!("W*(100-{})/100", crop_right);
                let crop_top_px = format!("H*{}/100", crop_top);
                let crop_bottom_px = format!("H*(100-{})/100", crop_bottom);

                let r = corner_radius;
                let final_expr = format!(
                    "255*if(lt(X,{cl}),0,if(gt(X,{cr}),0,if(lt(Y,{ct}),0,if(gt(Y,{cb}),0,\
                    if(lt(X,{cl}+{r})*lt(Y,{ct}+{r}),if(lte(hypot({cl}+{r}-X,{ct}+{r}-Y),{r}),1,0),\
                    if(gt(X,{cr}-{r})*lt(Y,{ct}+{r}),if(lte(hypot(X-{cr}+{r},{ct}+{r}-Y),{r}),1,0),\
                    if(lt(X,{cl}+{r})*gt(Y,{cb}-{r}),if(lte(hypot({cl}+{r}-X,Y-{cb}+{r}),{r}),1,0),\
                    if(gt(X,{cr}-{r})*gt(Y,{cb}-{r}),if(lte(hypot(X-{cr}+{r},Y-{cb}+{r}),{r}),1,0),\
                    1))))))))",
                    cl = crop_left_px,
                    cr = crop_right_px,
                    ct = crop_top_px,
                    cb = crop_bottom_px,
                    r = r
                );

                clip_filters.push_str(&final_expr);
                clip_filters.push_str("'");
            }
        } else if has_crop {
            // Draft mode with crop only - use simple fast crop
            let crop_w = format!("in_w*(100-{}-{})/100", crop_left, crop_right);
            let crop_h = format!("in_h*(100-{}-{})/100", crop_top, crop_bottom);
            let crop_x = format!("in_w*{}/100", crop_left);
            let crop_y = format!("in_h*{}/100", crop_top);
            clip_filters.push_str(&format!(",crop={}:{}:{}:{}", crop_w, crop_h, crop_x, crop_y));
        }

        if opacity < 1.0 {
            if !has_crop && corner_radius == 0 {
                clip_filters.push_str(",format=rgba");
            }
            clip_filters.push_str(&format!(",colorchannelmixer=aa={:.3}", opacity));
        }

        clip_filters.push_str(&format!("[{}]", scaled_label));
        filter_parts.push(clip_filters);

        let overlay_x_expr = format!("{}-w/2", pos_x as i32);
        let overlay_y_expr = format!("{}-h/2", pos_y as i32);

        let start_sec = clip.start_time_ms as f64 / 1000.0;
        let end_sec = (clip.start_time_ms + clip.duration_ms) as f64 / 1000.0;

        let output_label = format!("out{}", i);
        filter_parts.push(format!(
            "{}[{}]overlay={}:{}:enable='between(t,{:.3},{:.3})':format=auto[{}]",
            current_output, scaled_label, overlay_x_expr, overlay_y_expr, start_sec, end_sec, output_label
        ));

        current_output = format!("[{}]", output_label);
    }

    // Apply blur clips
    if let Some(ref blur_clips) = config.blur_clips {
        let mut sorted_blur_clips: Vec<&RenderBlurClip> = blur_clips.iter().collect();
        sorted_blur_clips.sort_by_key(|b| b.z_index);

        for (i, blur_clip) in sorted_blur_clips.iter().enumerate() {
            let blur_start_sec = blur_clip.start_time_ms as f64 / 1000.0;
            let blur_end_sec = (blur_clip.start_time_ms + blur_clip.duration_ms) as f64 / 1000.0;

            let region_w = (config.width as f64 * blur_clip.region_width / 100.0) as i32;
            let region_h = (config.height as f64 * blur_clip.region_height / 100.0) as i32;
            let region_x = ((config.width as f64 * blur_clip.region_x / 100.0) - region_w as f64 / 2.0) as i32;
            let region_y = ((config.height as f64 * blur_clip.region_y / 100.0) - region_h as f64 / 2.0) as i32;

            let region_x = region_x.max(0);
            let region_y = region_y.max(0);
            let region_w = region_w.min(config.width - region_x);
            let region_h = region_h.min(config.height - region_y);

            let blur_radius = (blur_clip.blur_intensity * 0.5).max(1.0) as i32;

            let blur_label = format!("blur{}", i);
            let blur_out_label = format!("blurout{}", i);

            filter_parts.push(format!(
                "{}split[blur_bg{}][blur_fg{}]",
                current_output, i, i
            ));
            filter_parts.push(format!(
                "[blur_fg{}]crop={}:{}:{}:{},boxblur={}:{}:enable='between(t,{:.3},{:.3})'[{}]",
                i, region_w, region_h, region_x, region_y,
                blur_radius, blur_radius,
                blur_start_sec, blur_end_sec,
                blur_label
            ));
            filter_parts.push(format!(
                "[blur_bg{}][{}]overlay={}:{}:enable='between(t,{:.3},{:.3})'[{}]",
                i, blur_label, region_x, region_y,
                blur_start_sec, blur_end_sec,
                blur_out_label
            ));

            current_output = format!("[{}]", blur_out_label);
        }
    }

    // Apply pan clips
    if let Some(ref pan_clips) = config.pan_clips {
        let mut sorted_pan_clips: Vec<&RenderPanClip> = pan_clips.iter().collect();
        sorted_pan_clips.sort_by_key(|p| p.z_index);

        for (i, pan_clip) in sorted_pan_clips.iter().enumerate() {
            let pan_start_sec = pan_clip.start_time_ms as f64 / 1000.0;
            let pan_end_sec = (pan_clip.start_time_ms + pan_clip.duration_ms) as f64 / 1000.0;
            let pan_duration_sec = pan_clip.duration_ms as f64 / 1000.0;

            let scale_factor = 1.5;
            let scaled_w = (config.width as f64 * scale_factor) as i32;
            let scaled_h = (config.height as f64 * scale_factor) as i32;

            let max_offset_x = (scaled_w - config.width) as f64;
            let max_offset_y = (scaled_h - config.height) as f64;

            let start_offset_x = ((100.0 - pan_clip.start_x) / 100.0) * max_offset_x;
            let start_offset_y = ((100.0 - pan_clip.start_y) / 100.0) * max_offset_y;
            let end_offset_x = ((100.0 - pan_clip.end_x) / 100.0) * max_offset_x;
            let end_offset_y = ((100.0 - pan_clip.end_y) / 100.0) * max_offset_y;

            let pan_scale_label = format!("panscale{}", i);
            let pan_out_label = format!("panout{}", i);

            filter_parts.push(format!(
                "{}scale={}:{}[{}]",
                current_output, scaled_w, scaled_h, pan_scale_label
            ));

            let x_expr = format!(
                "if(lt(t\\,{:.3})\\,{:.1}\\,if(lt(t\\,{:.3})\\,{:.1}+({:.1}-{:.1})*(t-{:.3})/{:.3}\\,{:.1}))",
                pan_start_sec,
                start_offset_x,
                pan_end_sec,
                start_offset_x,
                end_offset_x,
                start_offset_x,
                pan_start_sec,
                pan_duration_sec,
                end_offset_x
            );
            let y_expr = format!(
                "if(lt(t\\,{:.3})\\,{:.1}\\,if(lt(t\\,{:.3})\\,{:.1}+({:.1}-{:.1})*(t-{:.3})/{:.3}\\,{:.1}))",
                pan_start_sec,
                start_offset_y,
                pan_end_sec,
                start_offset_y,
                end_offset_y,
                start_offset_y,
                pan_start_sec,
                pan_duration_sec,
                end_offset_y
            );

            filter_parts.push(format!(
                "[{}]crop={}:{}:'{}':'{}'[{}]",
                pan_scale_label, config.width, config.height, x_expr, y_expr, pan_out_label
            ));

            current_output = format!("[{}]", pan_out_label);
        }
    }

    // Build audio filter
    let mut audio_filter_parts: Vec<String> = vec![];
    let mut audio_labels: Vec<String> = vec![];

    for (i, (input_idx, clip)) in audio_inputs.iter().enumerate() {
        let delay_ms = clip.start_time_ms;
        let audio_label = format!("aud{}", i);
        audio_filter_parts.push(format!(
            "[{}:a]adelay={}|{},apad=whole_dur={:.3}[{}]",
            input_idx, delay_ms, delay_ms, duration_sec, audio_label
        ));
        audio_labels.push(format!("[{}]", audio_label));
    }

    let mut video_audio_labels: Vec<String> = vec![];
    for (i, (input_idx, clip)) in video_inputs.iter().enumerate() {
        if clip.source_type == "video" && clip.has_audio.unwrap_or(false) && !clip.muted.unwrap_or(false) {
            let delay_ms = clip.start_time_ms;
            let audio_label = format!("vaud{}", i);
            audio_filter_parts.push(format!(
                "[{}:a]adelay={}|{},apad=whole_dur={:.3}[{}]",
                input_idx, delay_ms, delay_ms, duration_sec, audio_label
            ));
            video_audio_labels.push(format!("[{}]", audio_label));
        }
    }

    let has_video_filter = !filter_parts.is_empty();
    let all_audio_labels: Vec<String> = audio_labels.iter().chain(video_audio_labels.iter()).cloned().collect();
    let has_audio = !all_audio_labels.is_empty();

    if has_video_filter || has_audio {
        let mut full_filter = filter_parts.join(";");

        if has_audio {
            if !full_filter.is_empty() {
                full_filter.push(';');
            }
            full_filter.push_str(&audio_filter_parts.join(";"));

            if all_audio_labels.len() > 1 {
                full_filter.push_str(&format!(
                    ";{}amix=inputs={}:duration=longest[aout]",
                    all_audio_labels.join(""),
                    all_audio_labels.len()
                ));
            } else if all_audio_labels.len() == 1 {
                full_filter.push_str(&format!(
                    ";{}acopy[aout]",
                    all_audio_labels[0]
                ));
            }
        }

        ffmpeg_args.extend(vec![
            "-filter_complex".to_string(), full_filter,
        ]);

        if has_video_filter {
            ffmpeg_args.extend(vec!["-map".to_string(), current_output.clone()]);
        } else {
            ffmpeg_args.extend(vec!["-map".to_string(), "[0:v]".to_string()]);
        }

        if has_audio {
            ffmpeg_args.extend(vec!["-map".to_string(), "[aout]".to_string()]);
        }

        // Use hardware encoding on macOS (VideoToolbox) for much faster encoding
        // Fall back to libx264 with optimized settings if needed
        #[cfg(target_os = "macos")]
        {
            // VideoToolbox uses quality instead of CRF (0-100, higher = better)
            let vt_quality = match preset {
                "ultrafast" => "0.5",   // Fast, lower quality
                "fast" => "0.65",       // Good balance
                "medium" => "0.75",     // Higher quality
                "slow" => "0.85",       // Best quality
                _ => "0.65",
            };
            ffmpeg_args.extend(vec![
                "-c:v".to_string(), "h264_videotoolbox".to_string(),
                "-q:v".to_string(), vt_quality.to_string(),
                "-pix_fmt".to_string(), "yuv420p".to_string(),
            ]);

            if use_bitrate_cap {
                ffmpeg_args.extend(vec![
                    "-b:v".to_string(), video_bitrate.to_string(),
                ]);
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            ffmpeg_args.extend(vec![
                "-c:v".to_string(), "libx264".to_string(),
                "-pix_fmt".to_string(), "yuv420p".to_string(),
                "-crf".to_string(), crf.to_string(),
                "-preset".to_string(), preset.to_string(),
                "-threads".to_string(), "0".to_string(), // Use all CPU cores
            ]);

            if use_bitrate_cap {
                let bitrate_num = video_bitrate.trim_end_matches('M').parse::<i32>().unwrap_or(12);
                ffmpeg_args.extend(vec![
                    "-b:v".to_string(), video_bitrate.to_string(),
                    "-maxrate".to_string(), video_bitrate.to_string(),
                    "-bufsize".to_string(), format!("{}M", bitrate_num * 2),
                ]);
            }
        }

        if has_audio {
            ffmpeg_args.extend(vec![
                "-c:a".to_string(), "aac".to_string(),
                "-b:a".to_string(), "320k".to_string(),
            ]);
        }
    } else {
        #[cfg(target_os = "macos")]
        {
            let vt_quality = match preset {
                "ultrafast" => "0.5",
                "fast" => "0.65",
                "medium" => "0.75",
                "slow" => "0.85",
                _ => "0.65",
            };
            ffmpeg_args.extend(vec![
                "-c:v".to_string(), "h264_videotoolbox".to_string(),
                "-q:v".to_string(), vt_quality.to_string(),
                "-pix_fmt".to_string(), "yuv420p".to_string(),
            ]);

            if use_bitrate_cap {
                ffmpeg_args.extend(vec![
                    "-b:v".to_string(), video_bitrate.to_string(),
                ]);
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            ffmpeg_args.extend(vec![
                "-c:v".to_string(), "libx264".to_string(),
                "-pix_fmt".to_string(), "yuv420p".to_string(),
                "-crf".to_string(), crf.to_string(),
                "-preset".to_string(), preset.to_string(),
                "-threads".to_string(), "0".to_string(),
            ]);

            if use_bitrate_cap {
                let bitrate_num = video_bitrate.trim_end_matches('M').parse::<i32>().unwrap_or(12);
                ffmpeg_args.extend(vec![
                    "-b:v".to_string(), video_bitrate.to_string(),
                    "-maxrate".to_string(), video_bitrate.to_string(),
                    "-bufsize".to_string(), format!("{}M", bitrate_num * 2),
                ]);
            }
        }
    }

    // Add output settings
    ffmpeg_args.extend(vec![
        "-r".to_string(), config.frame_rate.to_string(),
        "-movflags".to_string(), "+faststart".to_string(),
        config.output_path.clone(),
    ]);

    Ok(ffmpeg_args)
}

// =============================================================================
// Native AVFoundation Compositor (macOS only)
// =============================================================================

/// Render using native AVFoundation compositor (macOS only)
/// This uses GPU-accelerated Core Image and VideoToolbox for much faster rendering
#[cfg(target_os = "macos")]
#[tauri::command]
pub async fn render_demo_native(
    app: AppHandle,
    export_id: String,
    config: RenderDemoConfig,
) -> Result<String, TakaError> {
    use crate::native;
    use std::ffi::CStr;
    use std::os::raw::c_char;
    use std::sync::atomic::{AtomicPtr, Ordering};

    // Calculate total frames for progress tracking
    let total_frames = (config.duration_ms as f64 / 1000.0 * config.frame_rate as f64) as i64;
    let duration_ms = config.duration_ms;
    let output_path = config.output_path.clone();

    // Emit export started event
    let _ = app.emit("export-started", ExportStarted {
        export_id: export_id.clone(),
        output_path: output_path.clone(),
        total_frames,
        duration_ms,
    });

    // Convert config to JSON for the native compositor
    let compositor_config = serde_json::json!({
        "width": config.width,
        "height": config.height,
        "frame_rate": config.frame_rate,
        "duration_ms": config.duration_ms,
        "format": config.format,
        "quality": config.quality,
        "output_path": config.output_path,
        "background": config.background.as_ref().map(|bg| serde_json::json!({
            "background_type": bg.background_type,
            "color": bg.color,
            "gradient_stops": bg.gradient_stops.as_ref().and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok()),
            "gradient_angle": bg.gradient_angle,
            "image_url": bg.image_url,
            "media_path": bg.media_path,
        })),
        "clips": config.clips.iter().map(|c| serde_json::json!({
            "source_path": c.source_path,
            "source_type": c.source_type,
            "start_time_ms": c.start_time_ms,
            "duration_ms": c.duration_ms,
            "in_point_ms": c.in_point_ms,
            "position_x": c.position_x,
            "position_y": c.position_y,
            "scale": c.scale,
            "opacity": c.opacity,
            "corner_radius": c.corner_radius,
            "crop_top": c.crop_top,
            "crop_bottom": c.crop_bottom,
            "crop_left": c.crop_left,
            "crop_right": c.crop_right,
            "z_index": c.z_index,
            "has_audio": c.has_audio,
            "track_id": c.track_id,
            "muted": c.muted,
        })).collect::<Vec<_>>(),
        "zoom_clips": config.zoom_clips.as_ref().map(|zcs| zcs.iter().map(|zc| serde_json::json!({
            "target_track_id": zc.target_track_id,
            "start_time_ms": zc.start_time_ms,
            "duration_ms": zc.duration_ms,
            "zoom_scale": zc.zoom_scale,
            "zoom_center_x": zc.zoom_center_x,
            "zoom_center_y": zc.zoom_center_y,
            "ease_in_duration_ms": zc.ease_in_duration_ms,
            "ease_out_duration_ms": zc.ease_out_duration_ms,
        })).collect::<Vec<_>>()),
        "blur_clips": config.blur_clips.as_ref().map(|bcs| bcs.iter().map(|bc| serde_json::json!({
            "start_time_ms": bc.start_time_ms,
            "duration_ms": bc.duration_ms,
            "blur_intensity": bc.blur_intensity,
            "region_x": bc.region_x,
            "region_y": bc.region_y,
            "region_width": bc.region_width,
            "region_height": bc.region_height,
            "corner_radius": bc.corner_radius,
            "ease_in_duration_ms": bc.ease_in_duration_ms,
            "ease_out_duration_ms": bc.ease_out_duration_ms,
            "z_index": bc.z_index,
        })).collect::<Vec<_>>()),
        "pan_clips": config.pan_clips.as_ref().map(|pcs| pcs.iter().map(|pc| serde_json::json!({
            "target_track_id": pc.target_track_id,
            "start_time_ms": pc.start_time_ms,
            "duration_ms": pc.duration_ms,
            "start_x": pc.start_x,
            "start_y": pc.start_y,
            "end_x": pc.end_x,
            "end_y": pc.end_y,
            "ease_in_duration_ms": pc.ease_in_duration_ms,
            "ease_out_duration_ms": pc.ease_out_duration_ms,
            "z_index": pc.z_index,
        })).collect::<Vec<_>>()),
    });

    let config_json = serde_json::to_string(&compositor_config)
        .map_err(|e| TakaError::Internal(format!("Failed to serialize config: {}", e)))?;

    // Store app handle and start time for callbacks
    static APP_HANDLE: AtomicPtr<()> = AtomicPtr::new(std::ptr::null_mut());
    static START_TIME: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();

    let app_box = Box::new(app.clone());
    let app_ptr = Box::into_raw(app_box) as *mut ();
    APP_HANDLE.store(app_ptr, Ordering::SeqCst);
    let _ = START_TIME.set(std::time::Instant::now());

    // Progress callback
    extern "C" fn progress_callback(
        export_id_ptr: *const c_char,
        percent: f32,
        current_frame: i64,
        total_frames: i64,
    ) {
        let app_ptr = APP_HANDLE.load(Ordering::SeqCst);
        if app_ptr.is_null() {
            return;
        }

        let export_id_str = if !export_id_ptr.is_null() {
            unsafe { CStr::from_ptr(export_id_ptr).to_string_lossy().to_string() }
        } else {
            String::new()
        };

        // Get app handle (don't drop it, we're just borrowing)
        let app: &AppHandle = unsafe { &*(app_ptr as *const AppHandle) };

        // Calculate timing info
        let elapsed_secs = START_TIME.get()
            .map(|start| start.elapsed().as_secs_f32())
            .unwrap_or(0.0);

        let fps = if elapsed_secs > 0.0 {
            current_frame as f32 / elapsed_secs
        } else {
            0.0
        };

        let estimated_remaining_secs = if fps > 0.0 && current_frame > 0 {
            let remaining_frames = total_frames - current_frame;
            Some(remaining_frames as f32 / fps)
        } else {
            None
        };

        let _ = app.emit("export-progress", RenderProgress {
            export_id: export_id_str,
            percent,
            stage: "Encoding".to_string(),
            current_frame,
            total_frames,
            fps,
            elapsed_secs,
            estimated_remaining_secs,
        });
    }

    // Completion callback
    extern "C" fn completion_callback(
        export_id_ptr: *const c_char,
        error_code: i32,
        output_path_or_error: *const c_char,
    ) {
        let app_ptr = APP_HANDLE.load(Ordering::SeqCst);
        if app_ptr.is_null() {
            return;
        }

        let export_id_str = if !export_id_ptr.is_null() {
            unsafe { CStr::from_ptr(export_id_ptr).to_string_lossy().to_string() }
        } else {
            String::new()
        };

        let output_or_error = if !output_path_or_error.is_null() {
            unsafe { CStr::from_ptr(output_path_or_error).to_string_lossy().to_string() }
        } else {
            String::new()
        };

        // Get app handle and clean up
        let app: Box<AppHandle> = unsafe { Box::from_raw(app_ptr as *mut AppHandle) };
        APP_HANDLE.store(std::ptr::null_mut(), Ordering::SeqCst);

        if error_code == 0 {
            let _ = app.emit("export-complete", ExportComplete {
                export_id: export_id_str,
                success: true,
                output_path: Some(output_or_error),
                error: None,
            });
        } else {
            let _ = app.emit("export-complete", ExportComplete {
                export_id: export_id_str,
                success: false,
                output_path: None,
                error: Some(output_or_error),
            });
        }
    }

    // Start async render
    native::compositor_render_async(
        &export_id,
        &config_json,
        Some(progress_callback),
        Some(completion_callback),
    ).map_err(|e| TakaError::Internal(e))?;

    Ok(export_id)
}

/// Fallback for non-macOS platforms
#[cfg(not(target_os = "macos"))]
#[tauri::command]
pub async fn render_demo_native(
    app: AppHandle,
    export_id: String,
    config: RenderDemoConfig,
) -> Result<String, TakaError> {
    // On non-macOS, fall back to FFmpeg
    render_demo_background(app, export_id, config).await
}
