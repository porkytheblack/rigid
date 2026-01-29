use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager, State};

use crate::error::TakaError;
use crate::repositories::RecordingRepository;

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
    let output = Command::new("ffmpeg")
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
    let output = Command::new("ffmpeg")
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
pub async fn probe_media(path: String) -> Result<MediaProbeResult, TakaError> {
    // Check if file exists first
    let file_path = std::path::Path::new(&path);
    if !file_path.exists() {
        return Err(TakaError::Internal(format!("File not found: {}", path)));
    }

    // Use ffprobe to get stream info in JSON format
    // ffprobe reads container metadata which is fast even for large files
    let output = Command::new("ffprobe")
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
    pub background_type: String, // "solid" | "gradient"
    pub color: Option<String>,
    pub gradient_stops: Option<String>, // JSON array
    pub gradient_angle: Option<i32>,
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
}

/// Progress info for rendering
#[derive(Debug, Serialize, Clone)]
pub struct RenderProgress {
    pub percent: f32,
    pub stage: String,
    pub current_frame: i64,
    pub total_frames: i64,
}

/// Render a demo video using FFmpeg
#[tauri::command]
pub async fn render_demo(
    _app: AppHandle,
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

    // Create background color input
    let bg_color = config.background.as_ref()
        .and_then(|b| b.color.clone())
        .unwrap_or_else(|| "#1a1a2e".to_string());

    let duration_sec = config.duration_ms as f64 / 1000.0;

    // Add color background as first input
    ffmpeg_args.extend(vec![
        "-f".to_string(), "lavfi".to_string(),
        "-i".to_string(),
        format!("color=c={}:s={}x{}:d={:.3}:r={}",
            bg_color.trim_start_matches('#'),
            config.width, config.height, duration_sec, config.frame_rate),
    ]);

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
    let mut current_output = "[0:v]".to_string();

    // Get zoom clips for lookup
    let zoom_clips = config.zoom_clips.as_ref();

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

        // Scale preserving aspect ratio, then pad to exact size
        let scaled_label = format!("scaled{}", i);

        // Build the filter chain for this clip
        // If cropping, apply crop first then scale
        let mut clip_filters = if has_crop {
            // Crop uses percentages: crop=w:h:x:y
            // w = iw * (100 - left - right) / 100
            // h = ih * (100 - top - bottom) / 100
            // x = iw * left / 100
            // y = ih * top / 100
            format!(
                "[{}:v]crop=iw*{}/100:ih*{}/100:iw*{}/100:ih*{}/100,scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2:color=black@0,setpts=PTS-STARTPTS",
                input_idx,
                100 - crop_left - crop_right,
                100 - crop_top - crop_bottom,
                crop_left,
                crop_top,
                target_w, target_h, target_w, target_h
            )
        } else {
            format!(
                "[{}:v]scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2:color=black@0,setpts=PTS-STARTPTS",
                input_idx, target_w, target_h, target_w, target_h
            )
        };

        // Apply zoom effects using zoompan filter
        // Zoom effects are relative to the clip's start time
        for zc in &clip_zoom_effects {
            // Calculate zoom timing relative to clip's timeline position
            // The zoom clip times are in absolute timeline time, but the clip video starts at 0
            // So we need to convert: zoom_time_in_clip = zoom_absolute_time - clip_start_time
            let zoom_start_in_clip = (zc.start_time_ms - clip.start_time_ms) as f64 / 1000.0;
            let zoom_end_in_clip = zoom_start_in_clip + (zc.duration_ms as f64 / 1000.0);
            let ease_in_sec = zc.ease_in_duration_ms as f64 / 1000.0;
            let ease_out_sec = zc.ease_out_duration_ms as f64 / 1000.0;
            let ease_out_start = zoom_end_in_clip - ease_out_sec;
            let zoom_scale = zc.zoom_scale;
            let center_x = zc.zoom_center_x / 100.0; // Convert to 0-1 range
            let center_y = zc.zoom_center_y / 100.0;
            let fps = config.frame_rate as f64;

            // Use zoompan for smooth animated zoom
            // zoompan uses 'on' (output frame number) not 't' for time
            // in_time = on / fps gives us the time in seconds
            //
            // z = zoom level (1 = no zoom, 2 = 2x zoom)
            // x, y = pan position (top-left corner of the zoomed area)
            // d = duration in output frames per input frame (1 = no slowdown)
            // s = output size
            //
            // The zoom expression calculates based on in_time:
            // - Before zoom: z=1
            // - During ease-in: z interpolates from 1 to zoom_scale with ease-in-out
            // - Holding: z=zoom_scale
            // - During ease-out: z interpolates from zoom_scale to 1 with ease-in-out
            // - After zoom: z=1
            //
            // Ease-in-out formula using smoothstep-like approach
            // For simplicity, use linear interpolation first, can enhance later
            let ease_in_end = zoom_start_in_clip + ease_in_sec;
            let ease_in_duration = ease_in_sec.max(0.001);
            let ease_out_duration = ease_out_sec.max(0.001);

            // Build the zoom expression using in_time (time in seconds based on output frame)
            // FFmpeg zoompan: in_time is input time, we use on/fps for output time
            let z_expr = format!(
                "if(lt(on/{fps},{zoom_start}),1,if(lt(on/{fps},{ease_in_end}),1+({zoom_scale}-1)*((on/{fps}-{zoom_start})/{ease_in_dur}),if(lt(on/{fps},{ease_out_start}),{zoom_scale},if(lt(on/{fps},{zoom_end}),{zoom_scale}-({zoom_scale}-1)*((on/{fps}-{ease_out_start})/{ease_out_dur}),1))))",
                fps = fps,
                zoom_start = zoom_start_in_clip,
                ease_in_end = ease_in_end,
                zoom_scale = zoom_scale,
                ease_in_dur = ease_in_duration,
                ease_out_start = ease_out_start,
                zoom_end = zoom_end_in_clip,
                ease_out_dur = ease_out_duration,
            );

            // x and y position the crop window
            // When zoomed, we crop a smaller area and scale it up
            // x = (iw - iw/zoom) * center_x = iw * (1 - 1/zoom) * center_x
            // y = (ih - ih/zoom) * center_y = ih * (1 - 1/zoom) * center_y
            let x_expr = format!("iw*(1-1/zoom)*{}", center_x);
            let y_expr = format!("ih*(1-1/zoom)*{}", center_y);

            clip_filters.push_str(&format!(
                ",zoompan=z='{}':x='{}':y='{}':d=1:s={}x{}:fps={}",
                z_expr, x_expr, y_expr, target_w, target_h, config.frame_rate
            ));
        }

        // Add corner radius using format=yuva420p and alphaextract/alphamerge with a rounded rectangle mask
        if corner_radius > 0 {
            // Create rounded corners by generating a mask and applying it
            // Use format=yuva420p to add alpha channel, then use geq to create rounded corner alpha
            let r = corner_radius;
            clip_filters.push_str(&format!(
                ",format=yuva420p,geq=lum='lum(X,Y)':cb='cb(X,Y)':cr='cr(X,Y)':\
a='if(lt(X,{r})*lt(Y,{r}),if(lte(hypot({r}-X,{r}-Y),{r}),255,0),\
if(gt(X,W-{r})*lt(Y,{r}),if(lte(hypot(X-W+{r},{r}-Y),{r}),255,0),\
if(lt(X,{r})*gt(Y,H-{r}),if(lte(hypot({r}-X,Y-H+{r}),{r}),255,0),\
if(gt(X,W-{r})*gt(Y,H-{r}),if(lte(hypot(X-W+{r},Y-H+{r}),{r}),255,0),255))))'",
                r = r
            ));
        }

        clip_filters.push_str(&format!("[{}]", scaled_label));
        filter_parts.push(clip_filters);

        let overlay_x = (pos_x - target_w as f64 / 2.0) as i32;
        let overlay_y = (pos_y - target_h as f64 / 2.0) as i32;

        let start_sec = clip.start_time_ms as f64 / 1000.0;
        let end_sec = (clip.start_time_ms + clip.duration_ms) as f64 / 1000.0;

        let output_label = format!("out{}", i);
        // Use shortest=1 to handle alpha channel properly in overlay
        filter_parts.push(format!(
            "{}[{}]overlay={}:{}:enable='between(t,{:.3},{:.3})':format=auto[{}]",
            current_output, scaled_label, overlay_x, overlay_y, start_sec, end_sec, output_label
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
    let output = Command::new("ffmpeg")
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
