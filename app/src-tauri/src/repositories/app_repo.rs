use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::RigidError;
use crate::models::{App, NewApp, UpdateApp, AppFilter};

#[derive(Clone)]
pub struct AppRepository {
    pool: DbPool,
}

impl AppRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new: NewApp) -> Result<App, RigidError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO apps (id, name, description, requirements, icon_path, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.name)
        .bind(&new.description)
        .bind(&new.requirements)
        .bind(&new.icon_path)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<App, RigidError> {
        sqlx::query_as::<_, App>("SELECT * FROM apps WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| RigidError::NotFound {
                entity: "App".into(),
                id: id.into(),
            })
    }

    pub async fn list(&self, filter: AppFilter) -> Result<Vec<App>, RigidError> {
        let mut sql = String::from("SELECT * FROM apps WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref search) = filter.search {
            sql.push_str(" AND (name LIKE ? OR description LIKE ?)");
            let pattern = format!("%{}%", search);
            bindings.push(pattern.clone());
            bindings.push(pattern);
        }

        sql.push_str(" ORDER BY updated_at DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        let mut query = sqlx::query_as::<_, App>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn update(&self, id: &str, updates: UpdateApp) -> Result<App, RigidError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE apps SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                requirements = COALESCE(?, requirements),
                icon_path = COALESCE(?, icon_path),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(&updates.description)
        .bind(&updates.requirements)
        .bind(&updates.icon_path)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), RigidError> {
        let result = sqlx::query("DELETE FROM apps WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(RigidError::NotFound {
                entity: "App".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn count(&self) -> Result<i32, RigidError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM apps")
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }
}
