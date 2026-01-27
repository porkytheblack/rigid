use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{
    Diagram, NewDiagram, UpdateDiagram, DiagramFilter, DiagramWithData,
    DiagramNode, NewDiagramNode, UpdateDiagramNode,
    DiagramEdge, NewDiagramEdge, UpdateDiagramEdge,
    NodeAttachment, NewNodeAttachment,
};

#[derive(Clone)]
pub struct DiagramRepository {
    pool: DbPool,
}

impl DiagramRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    // ============ Diagram CRUD ============

    pub async fn create(&self, new: NewDiagram) -> Result<Diagram, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO diagrams (id, test_id, architecture_doc_id, name, diagram_type, viewport_x, viewport_y, viewport_zoom, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.test_id)
        .bind(&new.architecture_doc_id)
        .bind(&new.name)
        .bind(&new.diagram_type)
        .bind(new.viewport_x.unwrap_or(0.0))
        .bind(new.viewport_y.unwrap_or(0.0))
        .bind(new.viewport_zoom.unwrap_or(1.0))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Diagram, TakaError> {
        sqlx::query_as::<_, Diagram>("SELECT * FROM diagrams WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Diagram".into(),
                id: id.into(),
            })
    }

    pub async fn get_with_data(&self, id: &str) -> Result<DiagramWithData, TakaError> {
        let diagram = self.get(id).await?;
        let nodes = self.list_nodes(id).await?;
        let edges = self.list_edges(id).await?;

        Ok(DiagramWithData {
            diagram,
            nodes,
            edges,
        })
    }

    pub async fn list(&self, filter: DiagramFilter) -> Result<Vec<Diagram>, TakaError> {
        let mut sql = String::from("SELECT * FROM diagrams WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref test_id) = filter.test_id {
            sql.push_str(" AND test_id = ?");
            bindings.push(test_id.clone());
        }

        if let Some(ref architecture_doc_id) = filter.architecture_doc_id {
            sql.push_str(" AND architecture_doc_id = ?");
            bindings.push(architecture_doc_id.clone());
        }

        if let Some(ref diagram_type) = filter.diagram_type {
            sql.push_str(" AND diagram_type = ?");
            bindings.push(diagram_type.clone());
        }

        sql.push_str(" ORDER BY created_at DESC");

        let mut query = sqlx::query_as::<_, Diagram>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn list_by_test(&self, test_id: &str) -> Result<Vec<Diagram>, TakaError> {
        self.list(DiagramFilter {
            test_id: Some(test_id.to_string()),
            architecture_doc_id: None,
            diagram_type: None,
        }).await
    }

    pub async fn list_by_architecture_doc(&self, doc_id: &str) -> Result<Vec<Diagram>, TakaError> {
        self.list(DiagramFilter {
            test_id: None,
            architecture_doc_id: Some(doc_id.to_string()),
            diagram_type: None,
        }).await
    }

    pub async fn update(&self, id: &str, updates: UpdateDiagram) -> Result<Diagram, TakaError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE diagrams SET
                name = COALESCE(?, name),
                viewport_x = COALESCE(?, viewport_x),
                viewport_y = COALESCE(?, viewport_y),
                viewport_zoom = COALESCE(?, viewport_zoom),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(updates.viewport_x)
        .bind(updates.viewport_y)
        .bind(updates.viewport_zoom)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM diagrams WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "Diagram".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn count_by_test(&self, test_id: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM diagrams WHERE test_id = ?")
            .bind(test_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    // ============ Node CRUD ============

    pub async fn create_node(&self, new: NewDiagramNode) -> Result<DiagramNode, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO diagram_nodes (id, diagram_id, node_type, label, notes, position_x, position_y, width, height, style_data, parent_id, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.diagram_id)
        .bind(&new.node_type)
        .bind(new.label.as_deref().unwrap_or(""))
        .bind(&new.notes)
        .bind(new.position_x.unwrap_or(0.0))
        .bind(new.position_y.unwrap_or(0.0))
        .bind(new.width)
        .bind(new.height)
        .bind(&new.style_data)
        .bind(&new.parent_id)
        .bind(new.sort_order.unwrap_or(0))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_node(&id).await
    }

    pub async fn get_node(&self, id: &str) -> Result<DiagramNode, TakaError> {
        sqlx::query_as::<_, DiagramNode>("SELECT * FROM diagram_nodes WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "DiagramNode".into(),
                id: id.into(),
            })
    }

    pub async fn list_nodes(&self, diagram_id: &str) -> Result<Vec<DiagramNode>, TakaError> {
        Ok(sqlx::query_as::<_, DiagramNode>(
            "SELECT * FROM diagram_nodes WHERE diagram_id = ? ORDER BY sort_order ASC"
        )
        .bind(diagram_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update_node(&self, id: &str, updates: UpdateDiagramNode) -> Result<DiagramNode, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE diagram_nodes SET
                node_type = COALESCE(?, node_type),
                label = COALESCE(?, label),
                notes = COALESCE(?, notes),
                position_x = COALESCE(?, position_x),
                position_y = COALESCE(?, position_y),
                width = COALESCE(?, width),
                height = COALESCE(?, height),
                style_data = COALESCE(?, style_data),
                parent_id = COALESCE(?, parent_id),
                sort_order = COALESCE(?, sort_order),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.node_type)
        .bind(&updates.label)
        .bind(&updates.notes)
        .bind(updates.position_x)
        .bind(updates.position_y)
        .bind(updates.width)
        .bind(updates.height)
        .bind(&updates.style_data)
        .bind(&updates.parent_id)
        .bind(updates.sort_order)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_node(id).await
    }

    pub async fn delete_node(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM diagram_nodes WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn bulk_update_nodes(&self, nodes: Vec<(String, UpdateDiagramNode)>) -> Result<(), TakaError> {
        for (id, updates) in nodes {
            self.update_node(&id, updates).await?;
        }
        Ok(())
    }

    // ============ Edge CRUD ============

    pub async fn create_edge(&self, new: NewDiagramEdge) -> Result<DiagramEdge, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO diagram_edges (id, diagram_id, source_node_id, target_node_id, edge_type, label, style_data, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.diagram_id)
        .bind(&new.source_node_id)
        .bind(&new.target_node_id)
        .bind(new.edge_type.as_deref().unwrap_or("default"))
        .bind(&new.label)
        .bind(&new.style_data)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_edge(&id).await
    }

    pub async fn get_edge(&self, id: &str) -> Result<DiagramEdge, TakaError> {
        sqlx::query_as::<_, DiagramEdge>("SELECT * FROM diagram_edges WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "DiagramEdge".into(),
                id: id.into(),
            })
    }

    pub async fn list_edges(&self, diagram_id: &str) -> Result<Vec<DiagramEdge>, TakaError> {
        Ok(sqlx::query_as::<_, DiagramEdge>(
            "SELECT * FROM diagram_edges WHERE diagram_id = ?"
        )
        .bind(diagram_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update_edge(&self, id: &str, updates: UpdateDiagramEdge) -> Result<DiagramEdge, TakaError> {
        sqlx::query(
            "UPDATE diagram_edges SET
                edge_type = COALESCE(?, edge_type),
                label = COALESCE(?, label),
                style_data = COALESCE(?, style_data)
             WHERE id = ?"
        )
        .bind(&updates.edge_type)
        .bind(&updates.label)
        .bind(&updates.style_data)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_edge(id).await
    }

    pub async fn delete_edge(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM diagram_edges WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Attachment CRUD ============

    pub async fn create_attachment(&self, new: NewNodeAttachment) -> Result<NodeAttachment, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO node_attachments (id, node_id, attachment_type, screenshot_id, recording_id, timestamp_ms, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.node_id)
        .bind(&new.attachment_type)
        .bind(&new.screenshot_id)
        .bind(&new.recording_id)
        .bind(new.timestamp_ms)
        .bind(new.sort_order.unwrap_or(0))
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_attachment(&id).await
    }

    pub async fn get_attachment(&self, id: &str) -> Result<NodeAttachment, TakaError> {
        sqlx::query_as::<_, NodeAttachment>("SELECT * FROM node_attachments WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "NodeAttachment".into(),
                id: id.into(),
            })
    }

    pub async fn list_attachments(&self, node_id: &str) -> Result<Vec<NodeAttachment>, TakaError> {
        Ok(sqlx::query_as::<_, NodeAttachment>(
            "SELECT * FROM node_attachments WHERE node_id = ? ORDER BY sort_order ASC"
        )
        .bind(node_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn delete_attachment(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM node_attachments WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_all_attachments(&self, node_id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM node_attachments WHERE node_id = ?")
            .bind(node_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
