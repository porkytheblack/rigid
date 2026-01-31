use tauri::State;

use crate::error::RigidError;
use crate::models::{Recording, NewRecording, UpdateRecording, RecordingFilter, Annotation, NewAnnotation, UpdateAnnotation};
use crate::repositories::RecordingRepository;

#[tauri::command]
pub async fn create_recording(
    new_recording: NewRecording,
    repo: State<'_, RecordingRepository>,
) -> Result<Recording, RigidError> {
    repo.create(new_recording).await
}

#[tauri::command]
pub async fn get_recording(
    id: String,
    repo: State<'_, RecordingRepository>,
) -> Result<Recording, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_recordings(
    filter: RecordingFilter,
    repo: State<'_, RecordingRepository>,
) -> Result<Vec<Recording>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn list_recordings_by_test(
    test_id: String,
    repo: State<'_, RecordingRepository>,
) -> Result<Vec<Recording>, RigidError> {
    repo.list_by_test(&test_id).await
}

#[tauri::command]
pub async fn update_recording(
    id: String,
    updates: UpdateRecording,
    repo: State<'_, RecordingRepository>,
) -> Result<Recording, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_recording(
    id: String,
    repo: State<'_, RecordingRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

// Annotation commands
#[tauri::command]
pub async fn create_annotation(
    new_annotation: NewAnnotation,
    repo: State<'_, RecordingRepository>,
) -> Result<Annotation, RigidError> {
    repo.create_annotation(new_annotation).await
}

#[tauri::command]
pub async fn get_annotation(
    id: String,
    repo: State<'_, RecordingRepository>,
) -> Result<Annotation, RigidError> {
    repo.get_annotation(&id).await
}

#[tauri::command]
pub async fn list_annotations(
    recording_id: String,
    repo: State<'_, RecordingRepository>,
) -> Result<Vec<Annotation>, RigidError> {
    repo.list_annotations(&recording_id).await
}

#[tauri::command]
pub async fn update_annotation(
    id: String,
    updates: UpdateAnnotation,
    repo: State<'_, RecordingRepository>,
) -> Result<Annotation, RigidError> {
    repo.update_annotation(&id, updates).await
}

#[tauri::command]
pub async fn delete_annotation(
    id: String,
    repo: State<'_, RecordingRepository>,
) -> Result<(), RigidError> {
    repo.delete_annotation(&id).await
}
