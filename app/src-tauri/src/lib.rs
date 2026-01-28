use tauri::Manager;

mod adapters;
mod commands;
mod db;
mod error;
mod models;
mod native;
mod repositories;
mod services;
mod utils;

use commands::RecordingState;
#[cfg(target_os = "macos")]
use commands::NativeCaptureState;
use repositories::{
    AppRepository, TestRepository, RecordingRepository, IssueRepository,
    ChecklistRepository, ScreenshotRepository, TagRepository, SettingsRepository,
    DocumentRepository, DiagramRepository, ArchitectureDocRepository, DemoRepository,
};
use services::AIService;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");

            // Create app directories if they don't exist
            std::fs::create_dir_all(&app_data_dir).ok();
            std::fs::create_dir_all(app_data_dir.join("recordings")).ok();
            std::fs::create_dir_all(app_data_dir.join("screenshots")).ok();
            std::fs::create_dir_all(app_data_dir.join("exports")).ok();
            std::fs::create_dir_all(app_data_dir.join("backups")).ok();

            // Initialize database
            let app_handle = app.handle().clone();
            tauri::async_runtime::block_on(async move {
                let pool = db::init_database(app_data_dir)
                    .await
                    .expect("Failed to initialize database");

                // Create and manage repositories
                app_handle.manage(AppRepository::new(pool.clone()));
                app_handle.manage(TestRepository::new(pool.clone()));
                app_handle.manage(RecordingRepository::new(pool.clone()));
                app_handle.manage(IssueRepository::new(pool.clone()));
                app_handle.manage(ChecklistRepository::new(pool.clone()));
                app_handle.manage(ScreenshotRepository::new(pool.clone()));
                app_handle.manage(TagRepository::new(pool.clone()));
                app_handle.manage(SettingsRepository::new(pool.clone()));
                app_handle.manage(DocumentRepository::new(pool.clone()));
                app_handle.manage(DiagramRepository::new(pool.clone()));
                app_handle.manage(ArchitectureDocRepository::new(pool.clone()));
                app_handle.manage(DemoRepository::new(pool));

                // Initialize AI service
                app_handle.manage(AIService::new());

                // Initialize recording state
                app_handle.manage(RecordingState::new());

                // Initialize native capture state (macOS only)
                #[cfg(target_os = "macos")]
                app_handle.manage(NativeCaptureState::new());
            });

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::get_app_info,
            // App commands
            commands::create_app,
            commands::get_app,
            commands::list_apps,
            commands::update_app,
            commands::delete_app,
            commands::count_apps,
            // Test commands
            commands::create_test,
            commands::get_test,
            commands::list_tests,
            commands::list_tests_by_app,
            commands::update_test,
            commands::delete_test,
            commands::count_tests_by_app,
            commands::count_tests_by_status,
            // Recording commands
            commands::create_recording,
            commands::get_recording,
            commands::list_recordings,
            commands::list_recordings_by_test,
            commands::update_recording,
            commands::delete_recording,
            commands::create_annotation,
            commands::get_annotation,
            commands::list_annotations,
            commands::update_annotation,
            commands::delete_annotation,
            // Issue commands
            commands::create_issue,
            commands::get_issue,
            commands::get_issue_by_number,
            commands::list_issues,
            commands::update_issue,
            commands::delete_issue,
            commands::count_issues_by_status,
            commands::count_issues_by_priority,
            // Checklist commands
            commands::create_checklist_item,
            commands::get_checklist_item,
            commands::list_checklist_items,
            commands::update_checklist_item,
            commands::delete_checklist_item,
            commands::reorder_checklist_items,
            commands::get_checklist_counts,
            // Screenshot commands
            commands::create_screenshot,
            commands::get_screenshot,
            commands::list_screenshots,
            commands::update_screenshot,
            commands::delete_screenshot,
            // Screenshot drawing commands
            commands::create_screenshot_drawing,
            commands::list_screenshot_drawings,
            commands::delete_screenshot_drawing,
            commands::delete_all_screenshot_drawings,
            commands::bulk_create_screenshot_drawings,
            commands::bulk_replace_screenshot_drawings,
            // Screenshot marker commands
            commands::create_screenshot_marker,
            commands::get_screenshot_marker,
            commands::list_screenshot_markers,
            commands::list_screenshot_markers_by_test,
            commands::update_screenshot_marker,
            commands::delete_screenshot_marker,
            commands::delete_all_screenshot_markers,
            commands::bulk_create_screenshot_markers,
            commands::bulk_replace_screenshot_markers,
            // Capture commands
            commands::capture_screenshot,
            commands::capture_fullscreen_screenshot,
            commands::capture_window_screenshot,
            commands::list_windows,
            commands::list_displays,
            commands::list_audio_devices,
            commands::start_recording,
            commands::stop_recording,
            commands::is_recording,
            commands::get_current_recording_id,
            commands::cancel_recording,
            commands::export_asset,
            commands::open_privacy_settings,
            // Native capture commands (ScreenCaptureKit)
            commands::check_native_capture_permission,
            commands::request_native_capture_permission,
            commands::list_windows_native,
            commands::list_displays_native,
            #[cfg(target_os = "macos")]
            commands::start_native_recording,
            #[cfg(target_os = "macos")]
            commands::stop_native_recording,
            #[cfg(target_os = "macos")]
            commands::cancel_native_recording,
            #[cfg(target_os = "macos")]
            commands::is_native_recording,
            #[cfg(target_os = "macos")]
            commands::get_native_recording_id,
            #[cfg(target_os = "macos")]
            commands::get_native_recording_duration,
            #[cfg(target_os = "macos")]
            commands::capture_native_screenshot,
            // Tag commands
            commands::create_tag,
            commands::get_tag,
            commands::list_tags,
            commands::update_tag,
            commands::delete_tag,
            commands::add_tag_to_entity,
            commands::remove_tag_from_entity,
            commands::get_tags_for_entity,
            // Settings commands
            commands::get_setting,
            commands::set_setting,
            commands::delete_setting,
            commands::get_all_settings,
            commands::get_bool_setting,
            commands::set_bool_setting,
            commands::get_int_setting,
            commands::set_int_setting,
            // AI commands
            commands::check_ai_availability,
            commands::get_ai_status,
            commands::configure_ai_provider,
            commands::set_ai_api_key,
            commands::remove_ai_api_key,
            commands::ai_complete,
            commands::ai_describe_screenshot,
            commands::ai_list_models,
            commands::ai_generate_issue_prompt,
            commands::restore_ai_configuration,
            // Video processing commands
            commands::trim_video,
            commands::cut_video,
            commands::render_demo,
            commands::probe_media,
            // Document block commands
            commands::create_document_block,
            commands::get_document_block,
            commands::list_document_blocks,
            commands::update_document_block,
            commands::delete_document_block,
            commands::delete_all_document_blocks,
            commands::bulk_replace_document_blocks,
            // Exploration todo commands
            commands::create_exploration_todo,
            commands::get_exploration_todo,
            commands::list_exploration_todos,
            commands::update_exploration_todo,
            commands::delete_exploration_todo,
            commands::delete_all_exploration_todos,
            commands::bulk_replace_exploration_todos,
            // Diagram commands
            commands::create_diagram,
            commands::get_diagram,
            commands::get_diagram_with_data,
            commands::list_diagrams,
            commands::list_diagrams_by_test,
            commands::list_diagrams_by_architecture_doc,
            commands::update_diagram,
            commands::delete_diagram,
            commands::count_diagrams_by_test,
            // Diagram node commands
            commands::create_diagram_node,
            commands::get_diagram_node,
            commands::list_diagram_nodes,
            commands::update_diagram_node,
            commands::delete_diagram_node,
            commands::bulk_update_diagram_nodes,
            // Diagram edge commands
            commands::create_diagram_edge,
            commands::get_diagram_edge,
            commands::list_diagram_edges,
            commands::update_diagram_edge,
            commands::delete_diagram_edge,
            // Node attachment commands
            commands::create_node_attachment,
            commands::get_node_attachment,
            commands::list_node_attachments,
            commands::delete_node_attachment,
            commands::delete_all_node_attachments,
            // Architecture doc commands
            commands::create_architecture_doc,
            commands::get_architecture_doc,
            commands::get_architecture_doc_with_blocks,
            commands::list_architecture_docs,
            commands::update_architecture_doc,
            commands::delete_architecture_doc,
            commands::count_architecture_docs,
            commands::reorder_architecture_docs,
            // Architecture doc block commands
            commands::create_architecture_doc_block,
            commands::get_architecture_doc_block,
            commands::list_architecture_doc_blocks,
            commands::update_architecture_doc_block,
            commands::delete_architecture_doc_block,
            commands::delete_all_architecture_doc_blocks,
            commands::bulk_replace_architecture_doc_blocks,
            // Demo commands
            commands::demos_list,
            commands::demos_get,
            commands::demos_get_with_data,
            commands::demos_create,
            commands::demos_update,
            commands::demos_delete,
            // Demo background commands
            commands::demo_backgrounds_get,
            commands::demo_backgrounds_create,
            commands::demo_backgrounds_update,
            commands::demo_backgrounds_delete,
            // Demo track commands
            commands::demo_tracks_list,
            commands::demo_tracks_create,
            commands::demo_tracks_update,
            commands::demo_tracks_delete,
            commands::demo_tracks_reorder,
            // Demo clip commands
            commands::demo_clips_list,
            commands::demo_clips_create,
            commands::demo_clips_update,
            commands::demo_clips_delete,
            // Demo zoom clip commands
            commands::demo_zoom_clips_list,
            commands::demo_zoom_clips_create,
            commands::demo_zoom_clips_update,
            commands::demo_zoom_clips_delete,
            // Demo blur clip commands
            commands::demo_blur_clips_list,
            commands::demo_blur_clips_create,
            commands::demo_blur_clips_update,
            commands::demo_blur_clips_delete,
            // Demo asset commands
            commands::demo_assets_list,
            commands::demo_assets_create,
            commands::demo_assets_update,
            commands::demo_assets_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
