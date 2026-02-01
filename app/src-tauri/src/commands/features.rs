use tauri::State;

use crate::error::RigidError;
use crate::models::{Feature, NewFeature, UpdateFeature, FeatureFilter};
use crate::repositories::FeatureRepository;

#[tauri::command]
pub async fn create_feature(
    new_feature: NewFeature,
    repo: State<'_, FeatureRepository>,
) -> Result<Feature, RigidError> {
    repo.create(new_feature).await
}

#[tauri::command]
pub async fn get_feature(
    id: String,
    repo: State<'_, FeatureRepository>,
) -> Result<Feature, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn list_features(
    filter: FeatureFilter,
    repo: State<'_, FeatureRepository>,
) -> Result<Vec<Feature>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn list_features_by_app(
    app_id: String,
    repo: State<'_, FeatureRepository>,
) -> Result<Vec<Feature>, RigidError> {
    repo.list_by_app(&app_id).await
}

#[tauri::command]
pub async fn update_feature(
    id: String,
    updates: UpdateFeature,
    repo: State<'_, FeatureRepository>,
) -> Result<Feature, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_feature(
    id: String,
    repo: State<'_, FeatureRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn reorder_features(
    app_id: String,
    feature_ids: Vec<String>,
    repo: State<'_, FeatureRepository>,
) -> Result<(), RigidError> {
    repo.reorder(&app_id, feature_ids).await
}
