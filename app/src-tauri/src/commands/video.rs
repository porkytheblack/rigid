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
