use serde::{Deserialize, Serialize};
use tauri::Manager;

pub mod apps;
pub mod tests;
pub mod recordings;
pub mod issues;
pub mod checklist;
pub mod screenshots;
pub mod tags;
pub mod settings;
pub mod capture;
pub mod ai;
pub mod video;
pub mod documents;
pub mod diagrams;
pub mod architecture_docs;

// Re-export all commands
pub use apps::*;
pub use tests::*;
pub use recordings::*;
pub use issues::*;
pub use checklist::*;
pub use screenshots::*;
pub use tags::*;
pub use settings::*;
pub use capture::*;
pub use ai::*;
pub use video::*;
pub use documents::*;
pub use diagrams::*;
pub use architecture_docs::*;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub data_dir: String,
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Taka.", name)
}

#[tauri::command]
pub fn get_app_info(app: tauri::AppHandle) -> Result<AppInfo, String> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e: tauri::Error| e.to_string())?
        .to_string_lossy()
        .to_string();

    Ok(AppInfo {
        name: "Taka".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        data_dir,
    })
}
