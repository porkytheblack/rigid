use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{ChecklistItem, NewChecklistItem, UpdateChecklistItem, ChecklistFilter};

#[derive(Clone)]
pub struct ChecklistRepository {
    pool: DbPool,
}

impl ChecklistRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new: NewChecklistItem) -> Result<ChecklistItem, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Get max sort_order for auto-ordering (scoped to test if provided)
        let max_order: Option<i32> = if let Some(ref test_id) = new.test_id {
            sqlx::query_scalar("SELECT MAX(sort_order) FROM checklist_items WHERE test_id = ?")
                .bind(test_id)
                .fetch_one(&self.pool)
                .await?
        } else {
            sqlx::query_scalar("SELECT MAX(sort_order) FROM checklist_items WHERE test_id IS NULL")
                .fetch_one(&self.pool)
                .await?
        };
        let sort_order = new.sort_order.unwrap_or(max_order.unwrap_or(0) + 1);

        sqlx::query(
            "INSERT INTO checklist_items (id, test_id, title, description, status, sort_order, group_name, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'untested', ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.test_id)
        .bind(&new.title)
        .bind(&new.description)
        .bind(sort_order)
        .bind(&new.group_name)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<ChecklistItem, TakaError> {
        sqlx::query_as::<_, ChecklistItem>("SELECT * FROM checklist_items WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "ChecklistItem".into(),
                id: id.into(),
            })
    }

    pub async fn list(&self, filter: ChecklistFilter) -> Result<Vec<ChecklistItem>, TakaError> {
        let mut sql = String::from("SELECT * FROM checklist_items WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref test_id) = filter.test_id {
            sql.push_str(" AND test_id = ?");
            bindings.push(test_id.clone());
        }

        if let Some(ref status) = filter.status {
            sql.push_str(" AND status = ?");
            bindings.push(status.clone());
        }

        if let Some(ref group_name) = filter.group_name {
            sql.push_str(" AND group_name = ?");
            bindings.push(group_name.clone());
        }

        sql.push_str(" ORDER BY sort_order ASC");

        let mut query = sqlx::query_as::<_, ChecklistItem>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn list_by_test(&self, test_id: &str) -> Result<Vec<ChecklistItem>, TakaError> {
        self.list(ChecklistFilter {
            test_id: Some(test_id.to_string()),
            status: None,
            group_name: None,
        }).await
    }

    pub async fn update(&self, id: &str, updates: UpdateChecklistItem) -> Result<ChecklistItem, TakaError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE checklist_items SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                group_name = COALESCE(?, group_name),
                sort_order = COALESCE(?, sort_order),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.title)
        .bind(&updates.description)
        .bind(&updates.status)
        .bind(&updates.group_name)
        .bind(&updates.sort_order)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM checklist_items WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "ChecklistItem".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn reorder(&self, ids: Vec<String>) -> Result<(), TakaError> {
        for (index, id) in ids.iter().enumerate() {
            sqlx::query("UPDATE checklist_items SET sort_order = ? WHERE id = ?")
                .bind(index as i32)
                .bind(id)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    pub async fn count_by_status(&self) -> Result<(i32, i32, i32), TakaError> {
        let passing: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM checklist_items WHERE status = 'passing'")
            .fetch_one(&self.pool)
            .await?;
        let failing: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM checklist_items WHERE status = 'failing'")
            .fetch_one(&self.pool)
            .await?;
        let untested: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM checklist_items WHERE status = 'untested'")
            .fetch_one(&self.pool)
            .await?;
        Ok((passing.0, failing.0, untested.0))
    }

    pub async fn count_by_test(&self, test_id: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM checklist_items WHERE test_id = ?")
            .bind(test_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }
}
