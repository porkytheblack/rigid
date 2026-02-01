use uuid::Uuid;

use crate::db::DbPool;
use crate::error::RigidError;
use crate::models::{Tag, NewTag, UpdateTag, TaggableType};

#[derive(Clone)]
pub struct TagRepository {
    pool: DbPool,
}

impl TagRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new: NewTag) -> Result<Tag, RigidError> {
        let id = Uuid::new_v4().to_string();

        sqlx::query("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)")
            .bind(&id)
            .bind(&new.name)
            .bind(&new.color)
            .execute(&self.pool)
            .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Tag, RigidError> {
        sqlx::query_as::<_, Tag>("SELECT * FROM tags WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| RigidError::NotFound {
                entity: "Tag".into(),
                id: id.into(),
            })
    }

    pub async fn get_by_name(&self, name: &str) -> Result<Option<Tag>, RigidError> {
        Ok(sqlx::query_as::<_, Tag>("SELECT * FROM tags WHERE name = ?")
            .bind(name)
            .fetch_optional(&self.pool)
            .await?)
    }

    pub async fn list(&self) -> Result<Vec<Tag>, RigidError> {
        Ok(sqlx::query_as::<_, Tag>("SELECT * FROM tags ORDER BY name ASC")
            .fetch_all(&self.pool)
            .await?)
    }

    pub async fn update(&self, id: &str, updates: UpdateTag) -> Result<Tag, RigidError> {
        // Verify exists
        let existing = self.get(id).await?;

        sqlx::query(
            "UPDATE tags SET name = COALESCE(?, name), color = COALESCE(?, color) WHERE id = ?"
        )
        .bind(&updates.name.unwrap_or(existing.name))
        .bind(&updates.color.unwrap_or(existing.color))
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), RigidError> {
        let result = sqlx::query("DELETE FROM tags WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(RigidError::NotFound {
                entity: "Tag".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    // Taggable operations
    pub async fn add_to_entity(
        &self,
        tag_id: &str,
        entity_type: TaggableType,
        entity_id: &str,
    ) -> Result<(), RigidError> {
        // Verify tag exists
        self.get(tag_id).await?;

        sqlx::query(
            "INSERT OR IGNORE INTO taggables (tag_id, taggable_type, taggable_id) VALUES (?, ?, ?)"
        )
        .bind(tag_id)
        .bind(entity_type.as_str())
        .bind(entity_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn remove_from_entity(
        &self,
        tag_id: &str,
        entity_type: TaggableType,
        entity_id: &str,
    ) -> Result<(), RigidError> {
        sqlx::query(
            "DELETE FROM taggables WHERE tag_id = ? AND taggable_type = ? AND taggable_id = ?"
        )
        .bind(tag_id)
        .bind(entity_type.as_str())
        .bind(entity_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn get_for_entity(
        &self,
        entity_type: TaggableType,
        entity_id: &str,
    ) -> Result<Vec<Tag>, RigidError> {
        Ok(sqlx::query_as::<_, Tag>(
            "SELECT t.* FROM tags t
             INNER JOIN taggables tg ON t.id = tg.tag_id
             WHERE tg.taggable_type = ? AND tg.taggable_id = ?
             ORDER BY t.name ASC"
        )
        .bind(entity_type.as_str())
        .bind(entity_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn get_entities_with_tag(
        &self,
        tag_id: &str,
        entity_type: TaggableType,
    ) -> Result<Vec<String>, RigidError> {
        let rows: Vec<(String,)> = sqlx::query_as(
            "SELECT taggable_id FROM taggables WHERE tag_id = ? AND taggable_type = ?"
        )
        .bind(tag_id)
        .bind(entity_type.as_str())
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|(id,)| id).collect())
    }
}
