use crate::db::DbPool;
use crate::error::RigidError;
use crate::models::Setting;

#[derive(Clone)]
pub struct SettingsRepository {
    pool: DbPool,
}

impl SettingsRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub async fn get(&self, key: &str) -> Result<Option<String>, RigidError> {
        let setting: Option<Setting> = sqlx::query_as("SELECT * FROM settings WHERE key = ?")
            .bind(key)
            .fetch_optional(&self.pool)
            .await?;

        Ok(setting.map(|s| s.value))
    }

    pub async fn set(&self, key: &str, value: &str) -> Result<(), RigidError> {
        sqlx::query(
            "INSERT INTO settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        )
        .bind(key)
        .bind(value)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn delete(&self, key: &str) -> Result<(), RigidError> {
        sqlx::query("DELETE FROM settings WHERE key = ?")
            .bind(key)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn get_all(&self) -> Result<Vec<Setting>, RigidError> {
        Ok(sqlx::query_as::<_, Setting>("SELECT * FROM settings ORDER BY key ASC")
            .fetch_all(&self.pool)
            .await?)
    }

    // Convenience methods for typed settings
    pub async fn get_bool(&self, key: &str) -> Result<Option<bool>, RigidError> {
        Ok(self.get(key).await?.map(|v| v == "true" || v == "1"))
    }

    pub async fn set_bool(&self, key: &str, value: bool) -> Result<(), RigidError> {
        self.set(key, if value { "true" } else { "false" }).await
    }

    pub async fn get_int(&self, key: &str) -> Result<Option<i32>, RigidError> {
        Ok(self.get(key).await?.and_then(|v| v.parse().ok()))
    }

    pub async fn set_int(&self, key: &str, value: i32) -> Result<(), RigidError> {
        self.set(key, &value.to_string()).await
    }
}
