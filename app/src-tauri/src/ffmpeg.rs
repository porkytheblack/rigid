use std::path::PathBuf;
use std::process::Command;
use tauri::AppHandle;

fn find_sidecar(name: &str) -> Result<PathBuf, String> {
    // Get the path to the running executable
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;

    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;

    // Tauri puts sidecars in Contents/MacOS/ with just the base name (no target triple)
    // e.g., Rigid.app/Contents/MacOS/ffmpeg
    let sidecar_path = exe_dir.join(name);

    if sidecar_path.exists() {
        return Ok(sidecar_path);
    }

    // Fallback to system binary for development
    Ok(PathBuf::from(name))
}

/// Create a Command for FFmpeg with the correct binary path
pub fn ffmpeg_command(_app: &AppHandle) -> Result<Command, String> {
    let path = find_sidecar("ffmpeg")?;
    Ok(Command::new(path))
}

/// Create a Command for FFprobe with the correct binary path
pub fn ffprobe_command(_app: &AppHandle) -> Result<Command, String> {
    let path = find_sidecar("ffprobe")?;
    Ok(Command::new(path))
}
