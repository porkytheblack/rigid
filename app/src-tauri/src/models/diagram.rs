use serde::{Deserialize, Serialize};

// ============ Diagram ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Diagram {
    pub id: String,
    pub test_id: Option<String>,
    pub architecture_doc_id: Option<String>,
    pub name: String,
    pub diagram_type: String, // 'mindmap' | 'userflow' | 'dependency'
    pub viewport_x: f64,
    pub viewport_y: f64,
    pub viewport_zoom: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDiagram {
    pub test_id: Option<String>,
    pub architecture_doc_id: Option<String>,
    pub name: String,
    pub diagram_type: String,
    pub viewport_x: Option<f64>,
    pub viewport_y: Option<f64>,
    pub viewport_zoom: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDiagram {
    pub name: Option<String>,
    pub viewport_x: Option<f64>,
    pub viewport_y: Option<f64>,
    pub viewport_zoom: Option<f64>,
}

#[derive(Debug, Deserialize, Default)]
pub struct DiagramFilter {
    pub test_id: Option<String>,
    pub architecture_doc_id: Option<String>,
    pub diagram_type: Option<String>,
}

// ============ Diagram Node ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DiagramNode {
    pub id: String,
    pub diagram_id: String,
    pub node_type: String,
    pub label: String,
    pub notes: Option<String>,
    pub position_x: f64,
    pub position_y: f64,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub style_data: Option<String>, // JSON
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDiagramNode {
    pub diagram_id: String,
    pub node_type: String,
    pub label: Option<String>,
    pub notes: Option<String>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub style_data: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDiagramNode {
    pub node_type: Option<String>,
    pub label: Option<String>,
    pub notes: Option<String>,
    pub position_x: Option<f64>,
    pub position_y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub style_data: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: Option<i32>,
}

// ============ Diagram Edge ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DiagramEdge {
    pub id: String,
    pub diagram_id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    pub edge_type: String,
    pub label: Option<String>,
    pub style_data: Option<String>, // JSON
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewDiagramEdge {
    pub diagram_id: String,
    pub source_node_id: String,
    pub target_node_id: String,
    pub edge_type: Option<String>,
    pub label: Option<String>,
    pub style_data: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateDiagramEdge {
    pub edge_type: Option<String>,
    pub label: Option<String>,
    pub style_data: Option<String>,
}

// ============ Node Attachment ============

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct NodeAttachment {
    pub id: String,
    pub node_id: String,
    pub attachment_type: String, // 'screenshot' | 'recording'
    pub screenshot_id: Option<String>,
    pub recording_id: Option<String>,
    pub timestamp_ms: Option<i64>,
    pub sort_order: i32,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct NewNodeAttachment {
    pub node_id: String,
    pub attachment_type: String,
    pub screenshot_id: Option<String>,
    pub recording_id: Option<String>,
    pub timestamp_ms: Option<i64>,
    pub sort_order: Option<i32>,
}

// ============ Full diagram data for loading ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramWithData {
    pub diagram: Diagram,
    pub nodes: Vec<DiagramNode>,
    pub edges: Vec<DiagramEdge>,
}
