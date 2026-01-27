use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{Issue, NewIssue, UpdateIssue, IssueFilter};

#[derive(Clone)]
pub struct IssueRepository {
    pool: DbPool,
}

impl IssueRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, new: NewIssue) -> Result<Issue, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        // Get next issue number
        let max_num: Option<i32> = sqlx::query_scalar("SELECT MAX(number) FROM issues")
            .fetch_one(&self.pool)
            .await?;
        let number = max_num.unwrap_or(0) + 1;

        sqlx::query(
            "INSERT INTO issues (id, test_id, number, title, description, status, priority, screenshot_id, recording_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.test_id)
        .bind(number)
        .bind(&new.title)
        .bind(&new.description)
        .bind(new.priority.as_deref().unwrap_or("medium"))
        .bind(&new.screenshot_id)
        .bind(&new.recording_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Issue, TakaError> {
        sqlx::query_as::<_, Issue>("SELECT * FROM issues WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Issue".into(),
                id: id.into(),
            })
    }

    pub async fn get_by_number(&self, number: i32) -> Result<Issue, TakaError> {
        sqlx::query_as::<_, Issue>("SELECT * FROM issues WHERE number = ?")
            .bind(number)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Issue".into(),
                id: number.to_string(),
            })
    }

    pub async fn list(&self, filter: IssueFilter) -> Result<Vec<Issue>, TakaError> {
        let mut sql = String::from("SELECT * FROM issues WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref test_id) = filter.test_id {
            sql.push_str(" AND test_id = ?");
            bindings.push(test_id.clone());
        }

        if let Some(ref status) = filter.status {
            sql.push_str(" AND status = ?");
            bindings.push(status.clone());
        }

        if let Some(ref priority) = filter.priority {
            sql.push_str(" AND priority = ?");
            bindings.push(priority.clone());
        }

        sql.push_str(" ORDER BY number DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        let mut query = sqlx::query_as::<_, Issue>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn list_by_test(&self, test_id: &str) -> Result<Vec<Issue>, TakaError> {
        self.list(IssueFilter {
            test_id: Some(test_id.to_string()),
            status: None,
            priority: None,
            limit: None,
        }).await
    }

    pub async fn update(&self, id: &str, updates: UpdateIssue) -> Result<Issue, TakaError> {
        self.get(id).await?;

        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE issues SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                status = COALESCE(?, status),
                priority = COALESCE(?, priority),
                screenshot_id = COALESCE(?, screenshot_id),
                recording_id = COALESCE(?, recording_id),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.title)
        .bind(&updates.description)
        .bind(&updates.status)
        .bind(&updates.priority)
        .bind(&updates.screenshot_id)
        .bind(&updates.recording_id)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM issues WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "Issue".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn count_by_status(&self, status: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM issues WHERE status = ?")
            .bind(status)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    pub async fn count_by_priority(&self, priority: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM issues WHERE priority = ? AND status != 'verified'")
            .bind(priority)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    pub async fn count_by_test(&self, test_id: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM issues WHERE test_id = ?")
            .bind(test_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }
}
