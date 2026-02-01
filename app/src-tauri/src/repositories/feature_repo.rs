use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::RigidError;
use crate::models::{Feature, NewFeature, UpdateFeature, FeatureFilter};

#[derive(Clone)]
pub struct FeatureRepository {
    pool: DbPool,
}

impl FeatureRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new: NewFeature) -> Result<Feature, RigidError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Get max sort_order for the app
        let max_order: (i32,) = sqlx::query_as(
            "SELECT COALESCE(MAX(sort_order), -1) FROM features WHERE app_id = ?"
        )
        .bind(&new.app_id)
        .fetch_one(&self.pool)
        .await?;

        sqlx::query(
            "INSERT INTO features (id, app_id, name, description, status, priority, sort_order, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.app_id)
        .bind(&new.name)
        .bind(&new.description)
        .bind(new.status.as_deref().unwrap_or("planned"))
        .bind(new.priority.as_deref().unwrap_or("medium"))
        .bind(max_order.0 + 1)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Feature, RigidError> {
        sqlx::query_as::<_, Feature>("SELECT * FROM features WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| RigidError::NotFound {
                entity: "Feature".into(),
                id: id.into(),
            })
    }

    pub async fn list(&self, filter: FeatureFilter) -> Result<Vec<Feature>, RigidError> {
        let mut sql = String::from("SELECT * FROM features WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref app_id) = filter.app_id {
            sql.push_str(" AND app_id = ?");
            bindings.push(app_id.clone());
        }

        if let Some(ref status) = filter.status {
            sql.push_str(" AND status = ?");
            bindings.push(status.clone());
        }

        sql.push_str(" ORDER BY sort_order ASC");

        let mut query = sqlx::query_as::<_, Feature>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn list_by_app(&self, app_id: &str) -> Result<Vec<Feature>, RigidError> {
        self.list(FeatureFilter {
            app_id: Some(app_id.to_string()),
            ..Default::default()
        }).await
    }

    pub async fn update(&self, id: &str, updates: UpdateFeature) -> Result<Feature, RigidError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE features SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                priority = COALESCE(?, priority),
                sort_order = COALESCE(?, sort_order),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(&updates.description)
        .bind(&updates.status)
        .bind(&updates.priority)
        .bind(&updates.sort_order)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), RigidError> {
        let result = sqlx::query("DELETE FROM features WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(RigidError::NotFound {
                entity: "Feature".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn reorder(&self, app_id: &str, feature_ids: Vec<String>) -> Result<(), RigidError> {
        let now = Utc::now().to_rfc3339();

        for (index, feature_id) in feature_ids.iter().enumerate() {
            sqlx::query(
                "UPDATE features SET sort_order = ?, updated_at = ? WHERE id = ? AND app_id = ?"
            )
            .bind(index as i32)
            .bind(&now)
            .bind(feature_id)
            .bind(app_id)
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }
}
