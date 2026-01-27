use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{Test, NewTest, UpdateTest, TestFilter};

#[derive(Clone)]
pub struct TestRepository {
    pool: DbPool,
}

impl TestRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new: NewTest) -> Result<Test, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO tests (id, app_id, name, status, created_at, updated_at)
             VALUES (?, ?, ?, 'draft', ?, ?)"
        )
        .bind(&id)
        .bind(&new.app_id)
        .bind(&new.name)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Test, TakaError> {
        sqlx::query_as::<_, Test>("SELECT * FROM tests WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Test".into(),
                id: id.into(),
            })
    }

    pub async fn list(&self, filter: TestFilter) -> Result<Vec<Test>, TakaError> {
        let mut sql = String::from("SELECT * FROM tests WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref app_id) = filter.app_id {
            sql.push_str(" AND app_id = ?");
            bindings.push(app_id.clone());
        }

        if let Some(ref status) = filter.status {
            sql.push_str(" AND status = ?");
            bindings.push(status.clone());
        }

        sql.push_str(" ORDER BY updated_at DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        let mut query = sqlx::query_as::<_, Test>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn list_by_app(&self, app_id: &str) -> Result<Vec<Test>, TakaError> {
        self.list(TestFilter {
            app_id: Some(app_id.to_string()),
            status: None,
            limit: None,
        }).await
    }

    pub async fn update(&self, id: &str, updates: UpdateTest) -> Result<Test, TakaError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE tests SET
                name = COALESCE(?, name),
                status = COALESCE(?, status),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(&updates.status)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM tests WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "Test".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn count_by_app(&self, app_id: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM tests WHERE app_id = ?")
            .bind(app_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    pub async fn count_by_status(&self, status: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM tests WHERE status = ?")
            .bind(status)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }
}
