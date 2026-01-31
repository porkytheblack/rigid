use tauri::State;

use crate::error::RigidError;
use crate::models::{
    Diagram, NewDiagram, UpdateDiagram, DiagramFilter, DiagramWithData,
    DiagramNode, NewDiagramNode, UpdateDiagramNode,
    DiagramEdge, NewDiagramEdge, UpdateDiagramEdge,
    NodeAttachment, NewNodeAttachment,
};
use crate::repositories::DiagramRepository;

// ============ Diagram Commands ============

#[tauri::command]
pub async fn create_diagram(
    new_diagram: NewDiagram,
    repo: State<'_, DiagramRepository>,
) -> Result<Diagram, RigidError> {
    repo.create(new_diagram).await
}

#[tauri::command]
pub async fn get_diagram(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<Diagram, RigidError> {
    repo.get(&id).await
}

#[tauri::command]
pub async fn get_diagram_with_data(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<DiagramWithData, RigidError> {
    repo.get_with_data(&id).await
}

#[tauri::command]
pub async fn list_diagrams(
    filter: DiagramFilter,
    repo: State<'_, DiagramRepository>,
) -> Result<Vec<Diagram>, RigidError> {
    repo.list(filter).await
}

#[tauri::command]
pub async fn list_diagrams_by_test(
    test_id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<Vec<Diagram>, RigidError> {
    repo.list_by_test(&test_id).await
}

#[tauri::command]
pub async fn list_diagrams_by_architecture_doc(
    doc_id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<Vec<Diagram>, RigidError> {
    repo.list_by_architecture_doc(&doc_id).await
}

#[tauri::command]
pub async fn update_diagram(
    id: String,
    updates: UpdateDiagram,
    repo: State<'_, DiagramRepository>,
) -> Result<Diagram, RigidError> {
    repo.update(&id, updates).await
}

#[tauri::command]
pub async fn delete_diagram(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<(), RigidError> {
    repo.delete(&id).await
}

#[tauri::command]
pub async fn count_diagrams_by_test(
    test_id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<i32, RigidError> {
    repo.count_by_test(&test_id).await
}

// ============ Node Commands ============

#[tauri::command]
pub async fn create_diagram_node(
    new_node: NewDiagramNode,
    repo: State<'_, DiagramRepository>,
) -> Result<DiagramNode, RigidError> {
    repo.create_node(new_node).await
}

#[tauri::command]
pub async fn get_diagram_node(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<DiagramNode, RigidError> {
    repo.get_node(&id).await
}

#[tauri::command]
pub async fn list_diagram_nodes(
    diagram_id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<Vec<DiagramNode>, RigidError> {
    repo.list_nodes(&diagram_id).await
}

#[tauri::command]
pub async fn update_diagram_node(
    id: String,
    updates: UpdateDiagramNode,
    repo: State<'_, DiagramRepository>,
) -> Result<DiagramNode, RigidError> {
    repo.update_node(&id, updates).await
}

#[tauri::command]
pub async fn delete_diagram_node(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<(), RigidError> {
    repo.delete_node(&id).await
}

#[tauri::command]
pub async fn bulk_update_diagram_nodes(
    updates: Vec<(String, UpdateDiagramNode)>,
    repo: State<'_, DiagramRepository>,
) -> Result<(), RigidError> {
    repo.bulk_update_nodes(updates).await
}

// ============ Edge Commands ============

#[tauri::command]
pub async fn create_diagram_edge(
    new_edge: NewDiagramEdge,
    repo: State<'_, DiagramRepository>,
) -> Result<DiagramEdge, RigidError> {
    repo.create_edge(new_edge).await
}

#[tauri::command]
pub async fn get_diagram_edge(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<DiagramEdge, RigidError> {
    repo.get_edge(&id).await
}

#[tauri::command]
pub async fn list_diagram_edges(
    diagram_id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<Vec<DiagramEdge>, RigidError> {
    repo.list_edges(&diagram_id).await
}

#[tauri::command]
pub async fn update_diagram_edge(
    id: String,
    updates: UpdateDiagramEdge,
    repo: State<'_, DiagramRepository>,
) -> Result<DiagramEdge, RigidError> {
    repo.update_edge(&id, updates).await
}

#[tauri::command]
pub async fn delete_diagram_edge(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<(), RigidError> {
    repo.delete_edge(&id).await
}

// ============ Attachment Commands ============

#[tauri::command]
pub async fn create_node_attachment(
    new_attachment: NewNodeAttachment,
    repo: State<'_, DiagramRepository>,
) -> Result<NodeAttachment, RigidError> {
    repo.create_attachment(new_attachment).await
}

#[tauri::command]
pub async fn get_node_attachment(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<NodeAttachment, RigidError> {
    repo.get_attachment(&id).await
}

#[tauri::command]
pub async fn list_node_attachments(
    node_id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<Vec<NodeAttachment>, RigidError> {
    repo.list_attachments(&node_id).await
}

#[tauri::command]
pub async fn delete_node_attachment(
    id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<(), RigidError> {
    repo.delete_attachment(&id).await
}

#[tauri::command]
pub async fn delete_all_node_attachments(
    node_id: String,
    repo: State<'_, DiagramRepository>,
) -> Result<(), RigidError> {
    repo.delete_all_attachments(&node_id).await
}
