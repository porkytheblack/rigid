use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{
    Screenshot, NewScreenshot, UpdateScreenshot, ScreenshotFilter,
    ScreenshotDrawing, NewScreenshotDrawing,
    ScreenshotMarker, NewScreenshotMarker, UpdateScreenshotMarker,
};

#[derive(Clone)]
pub struct ScreenshotRepository {
    pool: DbPool,
}

impl ScreenshotRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    // ==================== Screenshot CRUD ====================

    pub async fn create(&self, new: NewScreenshot) -> Result<Screenshot, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO screenshots (id, test_id, title, description, image_path, created_at)
             VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.test_id)
        .bind(&new.title)
        .bind(&new.description)
        .bind(&new.image_path)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Screenshot, TakaError> {
        sqlx::query_as::<_, Screenshot>("SELECT * FROM screenshots WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Screenshot".into(),
                id: id.into(),
            })
    }

    pub async fn list(&self, filter: ScreenshotFilter) -> Result<Vec<Screenshot>, TakaError> {
        let mut sql = String::from("SELECT * FROM screenshots WHERE 1=1");
        let mut bindings: Vec<String> = Vec::new();

        if let Some(ref test_id) = filter.test_id {
            sql.push_str(" AND test_id = ?");
            bindings.push(test_id.clone());
        }

        sql.push_str(" ORDER BY created_at DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }

        let mut query = sqlx::query_as::<_, Screenshot>(&sql);
        for binding in bindings {
            query = query.bind(binding);
        }

        Ok(query.fetch_all(&self.pool).await?)
    }

    pub async fn list_by_test(&self, test_id: &str) -> Result<Vec<Screenshot>, TakaError> {
        self.list(ScreenshotFilter {
            test_id: Some(test_id.to_string()),
            limit: None,
        }).await
    }

    pub async fn update(&self, id: &str, updates: UpdateScreenshot) -> Result<Screenshot, TakaError> {
        self.get(id).await?;

        sqlx::query(
            "UPDATE screenshots SET
                title = COALESCE(?, title),
                description = COALESCE(?, description)
             WHERE id = ?"
        )
        .bind(&updates.title)
        .bind(&updates.description)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM screenshots WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "Screenshot".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    pub async fn count_by_test(&self, test_id: &str) -> Result<i32, TakaError> {
        let count: (i32,) = sqlx::query_as("SELECT COUNT(*) FROM screenshots WHERE test_id = ?")
            .bind(test_id)
            .fetch_one(&self.pool)
            .await?;
        Ok(count.0)
    }

    // ==================== Drawing Annotations ====================

    pub async fn create_drawing(&self, new: NewScreenshotDrawing) -> Result<ScreenshotDrawing, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO screenshot_drawings (id, screenshot_id, tool_type, color, stroke_width, points, start_x, start_y, end_x, end_y, text_content, font_size, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.screenshot_id)
        .bind(&new.tool_type)
        .bind(&new.color)
        .bind(new.stroke_width.unwrap_or(3))
        .bind(&new.points)
        .bind(new.start_x)
        .bind(new.start_y)
        .bind(new.end_x)
        .bind(new.end_y)
        .bind(&new.text_content)
        .bind(new.font_size)
        .bind(new.sort_order.unwrap_or(0))
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_drawing(&id).await
    }

    pub async fn get_drawing(&self, id: &str) -> Result<ScreenshotDrawing, TakaError> {
        sqlx::query_as::<_, ScreenshotDrawing>("SELECT * FROM screenshot_drawings WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "ScreenshotDrawing".into(),
                id: id.into(),
            })
    }

    pub async fn list_drawings(&self, screenshot_id: &str) -> Result<Vec<ScreenshotDrawing>, TakaError> {
        Ok(sqlx::query_as::<_, ScreenshotDrawing>(
            "SELECT * FROM screenshot_drawings WHERE screenshot_id = ? ORDER BY sort_order ASC"
        )
        .bind(screenshot_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn delete_drawing(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM screenshot_drawings WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_all_drawings(&self, screenshot_id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM screenshot_drawings WHERE screenshot_id = ?")
            .bind(screenshot_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn bulk_create_drawings(&self, drawings: Vec<NewScreenshotDrawing>) -> Result<Vec<ScreenshotDrawing>, TakaError> {
        let mut result = Vec::new();
        for drawing in drawings {
            result.push(self.create_drawing(drawing).await?);
        }
        Ok(result)
    }

    // ==================== Marker Annotations ====================

    pub async fn create_marker(&self, new: NewScreenshotMarker) -> Result<ScreenshotMarker, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO screenshot_markers (id, screenshot_id, title, description, severity, position_x, position_y, issue_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.screenshot_id)
        .bind(&new.title)
        .bind(&new.description)
        .bind(new.severity.as_deref().unwrap_or("info"))
        .bind(new.position_x)
        .bind(new.position_y)
        .bind(&new.issue_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get_marker(&id).await
    }

    pub async fn get_marker(&self, id: &str) -> Result<ScreenshotMarker, TakaError> {
        sqlx::query_as::<_, ScreenshotMarker>("SELECT * FROM screenshot_markers WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "ScreenshotMarker".into(),
                id: id.into(),
            })
    }

    pub async fn list_markers(&self, screenshot_id: &str) -> Result<Vec<ScreenshotMarker>, TakaError> {
        Ok(sqlx::query_as::<_, ScreenshotMarker>(
            "SELECT * FROM screenshot_markers WHERE screenshot_id = ? ORDER BY created_at ASC"
        )
        .bind(screenshot_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn list_markers_by_test(&self, test_id: &str) -> Result<Vec<ScreenshotMarker>, TakaError> {
        Ok(sqlx::query_as::<_, ScreenshotMarker>(
            "SELECT m.* FROM screenshot_markers m
             JOIN screenshots s ON m.screenshot_id = s.id
             WHERE s.test_id = ?
             ORDER BY m.created_at ASC"
        )
        .bind(test_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn update_marker(&self, id: &str, updates: UpdateScreenshotMarker) -> Result<ScreenshotMarker, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE screenshot_markers SET
                title = COALESCE(?, title),
                description = COALESCE(?, description),
                severity = COALESCE(?, severity),
                position_x = COALESCE(?, position_x),
                position_y = COALESCE(?, position_y),
                issue_id = COALESCE(?, issue_id),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.title)
        .bind(&updates.description)
        .bind(&updates.severity)
        .bind(updates.position_x)
        .bind(updates.position_y)
        .bind(&updates.issue_id)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get_marker(id).await
    }

    pub async fn delete_marker(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM screenshot_markers WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete_all_markers(&self, screenshot_id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM screenshot_markers WHERE screenshot_id = ?")
            .bind(screenshot_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn bulk_create_markers(&self, markers: Vec<NewScreenshotMarker>) -> Result<Vec<ScreenshotMarker>, TakaError> {
        let mut result = Vec::new();
        for marker in markers {
            result.push(self.create_marker(marker).await?);
        }
        Ok(result)
    }
}
