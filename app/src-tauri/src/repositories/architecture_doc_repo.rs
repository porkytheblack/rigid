use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::RigidError;
use crate::models::{
    ArchitectureDoc, NewArchitectureDoc, UpdateArchitectureDoc, ArchitectureDocWithBlocks,
    ArchitectureDocBlock, NewArchitectureDocBlock, UpdateArchitectureDocBlock,
};

#[derive(Clone)]
pub struct ArchitectureDocRepository {
    pool: DbPool,
}

impl ArchitectureDocRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    // ============ Architecture Doc CRUD ============

    pub async fn create(&self, new: NewArchitectureDoc) -> Result<ArchitectureDoc, RigidError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Get max sort_order for this app
        let max_order: Option<i32> = sqlx::query_scalar(
            "SELECT MAX(sort_order) FROM architecture_docs WHERE app_id = ?"
        )
        .bind(&new.app_id)
        .fetch_one(&self.pool)
        .await?;
        let sort_order = new.sort_order.unwrap_or_else(|| max_order.unwrap_or(-1) + 1);

        sqlx::query(
            "INSERT INTO architecture_docs (id, app_id, name, icon, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.app_id)
        .bind(&new.name)
        .bind(&new.icon)
        .bind(sort_order)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<ArchitectureDoc, RigidError> {
        sqlx::query_as::<_, ArchitectureDoc>("SELECT * FROM architecture_docs WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| RigidError::NotFound {
                entity: "ArchitectureDoc".into(),
                id: id.into(),
            })
    }

    pub async fn get_with_blocks(&self, id: &str) -> Result<ArchitectureDocWithBlocks, RigidError> {
        let doc = self.get(id).await?;
        let blocks = self.list_blocks(id).await?;

        Ok(ArchitectureDocWithBlocks { doc, blocks })
    }

    pub async fn list_by_app(&self, app_id: &str) -> Result<Vec<ArchitectureDoc>, RigidError> {
        Ok(sqlx::query_as::<_, ArchitectureDoc>(
            "SELECT * FROM architecture_docs WHERE app_id = ? ORDER BY sort_order ASC"
        )
        .bind(app_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update(&self, id: &str, updates: UpdateArchitectureDoc) -> Result<ArchitectureDoc, RigidError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE architecture_docs SET
                name = COALESCE(?, name),
                icon = COALESCE(?, icon),
                sort_order = COALESCE(?, sort_order),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(&updates.icon)
        .bind(updates.sort_order)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), RigidError> {
        let result = sqlx::query("DELETE FROM architecture_docs WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(RigidError::NotFound {
                entity: "ArchitectureDoc".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn count_by_app(&self, app_id: &str) -> Result<i32, RigidError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM architecture_docs WHERE app_id = ?")
            .bind(app_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    pub async fn reorder(&self, doc_ids: Vec<String>) -> Result<(), RigidError> {
        for (i, id) in doc_ids.iter().enumerate() {
            sqlx::query("UPDATE architecture_docs SET sort_order = ? WHERE id = ?")
                .bind(i as i32)
                .bind(id)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    // ============ Block CRUD ============

    pub async fn create_block(&self, new: NewArchitectureDocBlock) -> Result<ArchitectureDocBlock, RigidError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO architecture_doc_blocks (id, doc_id, block_type, content, checked, language, callout_type, image_path, image_caption, collapsed, mermaid_code, indent_level, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.doc_id)
        .bind(&new.block_type)
        .bind(new.content.as_deref().unwrap_or(""))
        .bind(new.checked.map(|b| if b { 1 } else { 0 }))
        .bind(&new.language)
        .bind(&new.callout_type)
        .bind(&new.image_path)
        .bind(&new.image_caption)
        .bind(new.collapsed.map(|b| if b { 1 } else { 0 }))
        .bind(&new.mermaid_code)
        .bind(new.indent_level.unwrap_or(0))
        .bind(new.sort_order.unwrap_or(0))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_block(&id).await
    }

    pub async fn get_block(&self, id: &str) -> Result<ArchitectureDocBlock, RigidError> {
        sqlx::query_as::<_, ArchitectureDocBlock>("SELECT * FROM architecture_doc_blocks WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| RigidError::NotFound {
                entity: "ArchitectureDocBlock".into(),
                id: id.into(),
            })
    }

    pub async fn list_blocks(&self, doc_id: &str) -> Result<Vec<ArchitectureDocBlock>, RigidError> {
        Ok(sqlx::query_as::<_, ArchitectureDocBlock>(
            "SELECT * FROM architecture_doc_blocks WHERE doc_id = ? ORDER BY sort_order ASC"
        )
        .bind(doc_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update_block(&self, id: &str, updates: UpdateArchitectureDocBlock) -> Result<ArchitectureDocBlock, RigidError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE architecture_doc_blocks SET
                block_type = COALESCE(?, block_type),
                content = COALESCE(?, content),
                checked = COALESCE(?, checked),
                language = COALESCE(?, language),
                callout_type = COALESCE(?, callout_type),
                image_path = COALESCE(?, image_path),
                image_caption = COALESCE(?, image_caption),
                collapsed = COALESCE(?, collapsed),
                mermaid_code = COALESCE(?, mermaid_code),
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
        .bind(&updates.mermaid_code)
        .bind(updates.indent_level)
        .bind(updates.sort_order)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_block(id).await
    }

    pub async fn delete_block(&self, id: &str) -> Result<(), RigidError> {
        sqlx::query("DELETE FROM architecture_doc_blocks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_all_blocks(&self, doc_id: &str) -> Result<(), RigidError> {
        sqlx::query("DELETE FROM architecture_doc_blocks WHERE doc_id = ?")
            .bind(doc_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn bulk_replace_blocks(&self, doc_id: &str, blocks: Vec<NewArchitectureDocBlock>) -> Result<Vec<ArchitectureDocBlock>, RigidError> {
        // Delete all existing blocks
        self.delete_all_blocks(doc_id).await?;

        // Insert new blocks in order
        let mut result = Vec::new();
        for (i, mut block) in blocks.into_iter().enumerate() {
            block.sort_order = Some(i as i32);
            result.push(self.create_block(block).await?);
        }

        Ok(result)
    }
}
