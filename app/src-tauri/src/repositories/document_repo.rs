use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{
    DocumentBlock, NewDocumentBlock, UpdateDocumentBlock,
    ExplorationTodo, NewExplorationTodo, UpdateExplorationTodo,
};

#[derive(Clone)]
pub struct DocumentRepository {
    pool: DbPool,
}

impl DocumentRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    // ==================== Document Blocks ====================

    pub async fn create_block(&self, new: NewDocumentBlock) -> Result<DocumentBlock, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO document_blocks (id, test_id, block_type, content, checked, language, callout_type, image_path, image_caption, collapsed, indent_level, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.test_id)
        .bind(&new.block_type)
        .bind(new.content.as_deref().unwrap_or(""))
        .bind(new.checked.map(|b| if b { 1 } else { 0 }))
        .bind(&new.language)
        .bind(&new.callout_type)
        .bind(&new.image_path)
        .bind(&new.image_caption)
        .bind(new.collapsed.map(|b| if b { 1 } else { 0 }))
        .bind(new.indent_level.unwrap_or(0))
        .bind(new.sort_order.unwrap_or(0))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_block(&id).await
    }

    pub async fn get_block(&self, id: &str) -> Result<DocumentBlock, TakaError> {
        sqlx::query_as::<_, DocumentBlock>("SELECT * FROM document_blocks WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "DocumentBlock".into(),
                id: id.into(),
            })
    }

    pub async fn list_blocks(&self, test_id: &str) -> Result<Vec<DocumentBlock>, TakaError> {
        Ok(sqlx::query_as::<_, DocumentBlock>(
            "SELECT * FROM document_blocks WHERE test_id = ? ORDER BY sort_order ASC"
        )
        .bind(test_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update_block(&self, id: &str, updates: UpdateDocumentBlock) -> Result<DocumentBlock, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE document_blocks SET
                block_type = COALESCE(?, block_type),
                content = COALESCE(?, content),
                checked = COALESCE(?, checked),
                language = COALESCE(?, language),
                callout_type = COALESCE(?, callout_type),
                image_path = COALESCE(?, image_path),
                image_caption = COALESCE(?, image_caption),
                collapsed = COALESCE(?, collapsed),
                indent_level = COALESCE(?, indent_level),
                sort_order = COALESCE(?, sort_order),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.block_type)
        .bind(&updates.content)
        .bind(updates.checked.map(|b| if b { 1 } else { 0 }))
        .bind(&updates.language)
        .bind(&updates.callout_type)
        .bind(&updates.image_path)
        .bind(&updates.image_caption)
        .bind(updates.collapsed.map(|b| if b { 1 } else { 0 }))
        .bind(updates.indent_level)
        .bind(updates.sort_order)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_block(id).await
    }

    pub async fn delete_block(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM document_blocks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_all_blocks(&self, test_id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM document_blocks WHERE test_id = ?")
            .bind(test_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn bulk_replace_blocks(&self, test_id: &str, blocks: Vec<NewDocumentBlock>) -> Result<Vec<DocumentBlock>, TakaError> {
        // Delete existing blocks and insert new ones
        self.delete_all_blocks(test_id).await?;

        let mut result = Vec::new();
        for (i, mut block) in blocks.into_iter().enumerate() {
            block.sort_order = Some(i as i32);
            result.push(self.create_block(block).await?);
        }
        Ok(result)
    }

    // ==================== Exploration Todos ====================

    pub async fn create_todo(&self, new: NewExplorationTodo) -> Result<ExplorationTodo, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO exploration_todos (id, test_id, content, checked, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.test_id)
        .bind(new.content.as_deref().unwrap_or(""))
        .bind(if new.checked.unwrap_or(false) { 1 } else { 0 })
        .bind(new.sort_order.unwrap_or(0))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_todo(&id).await
    }

    pub async fn get_todo(&self, id: &str) -> Result<ExplorationTodo, TakaError> {
        sqlx::query_as::<_, ExplorationTodo>("SELECT * FROM exploration_todos WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "ExplorationTodo".into(),
                id: id.into(),
            })
    }

    pub async fn list_todos(&self, test_id: &str) -> Result<Vec<ExplorationTodo>, TakaError> {
        Ok(sqlx::query_as::<_, ExplorationTodo>(
            "SELECT * FROM exploration_todos WHERE test_id = ? ORDER BY sort_order ASC"
        )
        .bind(test_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update_todo(&self, id: &str, updates: UpdateExplorationTodo) -> Result<ExplorationTodo, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE exploration_todos SET
                content = COALESCE(?, content),
                checked = COALESCE(?, checked),
                sort_order = COALESCE(?, sort_order),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.content)
        .bind(updates.checked.map(|b| if b { 1 } else { 0 }))
        .bind(updates.sort_order)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_todo(id).await
    }

    pub async fn delete_todo(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM exploration_todos WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_all_todos(&self, test_id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM exploration_todos WHERE test_id = ?")
            .bind(test_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn bulk_replace_todos(&self, test_id: &str, todos: Vec<NewExplorationTodo>) -> Result<Vec<ExplorationTodo>, TakaError> {
        // Delete existing todos and insert new ones
        self.delete_all_todos(test_id).await?;

        let mut result = Vec::new();
        for (i, mut todo) in todos.into_iter().enumerate() {
            todo.sort_order = Some(i as i32);
            result.push(self.create_todo(todo).await?);
        }
        Ok(result)
    }
}
