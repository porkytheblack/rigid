use tauri::State;

use crate::error::RigidError;
use crate::models::{Issue, NewIssue, UpdateIssue, IssueFilter};
use crate::repositories::IssueRepository;

#[tauri::command]
pub async fn create_issue(
    new_issue: NewIssue,
    repo: State<'_, IssueRepository>,
) -> Result<Issue, RigidError> {
    repo.create(new_issue).await
}

#[tauri::command]
pub async fn get_issue(
    id: String,
    repo: State<'_, IssueRepository>,
) -> Result<Issue, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn get_issue_by_number(
    number: i32,
    repo: State<'_, IssueRepository>,
) -> Result<Issue, RigidError> {
    repo.get_by_number(number).await
}

#[tauri::command]
pub async fn list_issues(
    filter: IssueFilter,
    repo: State<'_, IssueRepository>,
) -> Result<Vec<Issue>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn update_issue(
    id: String,
    updates: UpdateIssue,
    repo: State<'_, IssueRepository>,
) -> Result<Issue, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_issue(
    id: String,
    repo: State<'_, IssueRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn count_issues_by_status(
    status: String,
    repo: State<'_, IssueRepository>,
) -> Result<i32, RigidError> {
    repo.count_by_status(&status).await
}

#[tauri::command]
pub async fn count_issues_by_priority(
    priority: String,
    repo: State<'_, IssueRepository>,
) -> Result<i32, RigidError> {
    repo.count_by_priority(&priority).await
}
