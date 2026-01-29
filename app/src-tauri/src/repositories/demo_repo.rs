use chrono::Utc;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::TakaError;
use crate::models::{
    Demo, NewDemo, UpdateDemo, DemoFilter, DemoWithData,
    DemoBackground, NewDemoBackground, UpdateDemoBackground,
    DemoTrack, NewDemoTrack, UpdateDemoTrack,
    DemoClip, NewDemoClip, UpdateDemoClip,
    DemoZoomClip, NewDemoZoomClip, UpdateDemoZoomClip,
    DemoBlurClip, NewDemoBlurClip, UpdateDemoBlurClip,
    DemoPanClip, NewDemoPanClip, UpdateDemoPanClip,
    DemoAsset, NewDemoAsset, UpdateDemoAsset,
    DemoRecording, NewDemoRecording,
    DemoScreenshot, NewDemoScreenshot,
    Recording, Screenshot,
};

#[derive(Clone)]
pub struct DemoRepository {
    pool: DbPool,
}

impl DemoRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    // ============ Demo CRUD ============

    pub async fn create(&self, new: NewDemo) -> Result<Demo, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let format = new.format.unwrap_or_else(|| "youtube".to_string());
        let (width, height) = match format.as_str() {
            "youtube" => (1920, 1080),
            "youtube_4k" => (3840, 2160),
            "tiktok" => (1080, 1920),
            "square" => (1080, 1080),
            _ => (new.width.unwrap_or(1920), new.height.unwrap_or(1080)),
        };

        sqlx::query(
            "INSERT INTO demos (id, app_id, name, format, width, height, frame_rate, duration_ms, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.app_id)
        .bind(&new.name)
        .bind(&format)
        .bind(width)
        .bind(height)
        .bind(new.frame_rate.unwrap_or(60))
        .bind(60000i64)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        self.get(&id).await
    }

    pub async fn get(&self, id: &str) -> Result<Demo, TakaError> {
        sqlx::query_as::<_, Demo>("SELECT * FROM demos WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| TakaError::NotFound {
                entity: "Demo".into(),
                id: id.into(),
            })
    }

    pub async fn get_with_data(&self, id: &str) -> Result<DemoWithData, TakaError> {
        let demo = self.get(id).await?;
        let background = self.get_background(id).await?;
        let tracks = self.list_tracks(id).await?;

        // Get all clips for all tracks
        let mut clips = Vec::new();
        let mut zoom_clips = Vec::new();
        let mut blur_clips = Vec::new();
        let mut pan_clips = Vec::new();

        for track in &tracks {
            match track.track_type.as_str() {
                "zoom" => {
                    zoom_clips.extend(self.list_zoom_clips(&track.id).await?);
                }
                "blur" => {
                    blur_clips.extend(self.list_blur_clips(&track.id).await?);
                }
                "pan" => {
                    pan_clips.extend(self.list_pan_clips(&track.id).await?);
                }
                _ => {
                    clips.extend(self.list_clips(&track.id).await?);
                }
            }
        }

        let assets = self.list_assets(id).await?;

        Ok(DemoWithData {
            demo,
            background,
            tracks,
            clips,
            zoom_clips,
            blur_clips,
            pan_clips,
            assets,
        })
    }

    pub async fn list(&self, filter: DemoFilter) -> Result<Vec<Demo>, TakaError> {
        let mut query = "SELECT * FROM demos".to_string();
        let mut conditions = Vec::new();

        if filter.app_id.is_some() {
            conditions.push("app_id = ?");
        }

        if !conditions.is_empty() {
            query.push_str(" WHERE ");
            query.push_str(&conditions.join(" AND "));
        }

        query.push_str(" ORDER BY created_at DESC");

        if let Some(limit) = filter.limit {
            query.push_str(&format!(" LIMIT {}", limit));
        }

        let mut q = sqlx::query_as::<_, Demo>(&query);

        if let Some(app_id) = &filter.app_id {
            q = q.bind(app_id);
        }

        Ok(q.fetch_all(&self.pool).await?)
    }

    pub async fn update(&self, id: &str, updates: UpdateDemo) -> Result<Demo, TakaError> {
        self.get(id).await?;
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE demos SET
                name = COALESCE(?, name),
                format = COALESCE(?, format),
                width = COALESCE(?, width),
                height = COALESCE(?, height),
                frame_rate = COALESCE(?, frame_rate),
                duration_ms = COALESCE(?, duration_ms),
                thumbnail_path = COALESCE(?, thumbnail_path),
                export_path = COALESCE(?, export_path),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(&updates.format)
        .bind(updates.width)
        .bind(updates.height)
        .bind(updates.frame_rate)
        .bind(updates.duration_ms)
        .bind(&updates.thumbnail_path)
        .bind(&updates.export_path)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        self.get(id).await
    }

    pub async fn delete(&self, id: &str) -> Result<(), TakaError> {
        let result = sqlx::query("DELETE FROM demos WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(TakaError::NotFound {
                entity: "Demo".into(),
                id: id.into(),
            });
        }

        Ok(())
    }

    // ============ Background CRUD ============

    pub async fn get_background(&self, demo_id: &str) -> Result<Option<DemoBackground>, TakaError> {
        Ok(sqlx::query_as::<_, DemoBackground>("SELECT * FROM demo_backgrounds WHERE demo_id = ?")
            .bind(demo_id)
            .fetch_optional(&self.pool)
            .await?)
    }

    pub async fn create_background(&self, new: NewDemoBackground) -> Result<DemoBackground, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO demo_backgrounds (id, demo_id, background_type, color, gradient_stops, gradient_direction, gradient_angle, pattern_type, pattern_color, pattern_scale, media_path, media_scale, media_position_x, media_position_y, image_url, image_attribution, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.demo_id)
        .bind(&new.background_type)
        .bind(&new.color)
        .bind(&new.gradient_stops)
        .bind(&new.gradient_direction)
        .bind(new.gradient_angle)
        .bind(&new.pattern_type)
        .bind(&new.pattern_color)
        .bind(new.pattern_scale)
        .bind(&new.media_path)
        .bind(new.media_scale)
        .bind(new.media_position_x)
        .bind(new.media_position_y)
        .bind(&new.image_url)
        .bind(&new.image_attribution)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoBackground>("SELECT * FROM demo_backgrounds WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn update_background(&self, id: &str, updates: UpdateDemoBackground) -> Result<DemoBackground, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE demo_backgrounds SET
                background_type = COALESCE(?, background_type),
                color = COALESCE(?, color),
                gradient_stops = COALESCE(?, gradient_stops),
                gradient_direction = COALESCE(?, gradient_direction),
                gradient_angle = COALESCE(?, gradient_angle),
                pattern_type = COALESCE(?, pattern_type),
                pattern_color = COALESCE(?, pattern_color),
                pattern_scale = COALESCE(?, pattern_scale),
                media_path = COALESCE(?, media_path),
                media_scale = COALESCE(?, media_scale),
                media_position_x = COALESCE(?, media_position_x),
                media_position_y = COALESCE(?, media_position_y),
                image_url = COALESCE(?, image_url),
                image_attribution = COALESCE(?, image_attribution),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.background_type)
        .bind(&updates.color)
        .bind(&updates.gradient_stops)
        .bind(&updates.gradient_direction)
        .bind(updates.gradient_angle)
        .bind(&updates.pattern_type)
        .bind(&updates.pattern_color)
        .bind(updates.pattern_scale)
        .bind(&updates.media_path)
        .bind(updates.media_scale)
        .bind(updates.media_position_x)
        .bind(updates.media_position_y)
        .bind(&updates.image_url)
        .bind(&updates.image_attribution)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoBackground>("SELECT * FROM demo_backgrounds WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn delete_background(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_backgrounds WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Track CRUD ============

    pub async fn list_tracks(&self, demo_id: &str) -> Result<Vec<DemoTrack>, TakaError> {
        Ok(sqlx::query_as::<_, DemoTrack>(
            "SELECT * FROM demo_tracks WHERE demo_id = ? ORDER BY sort_order ASC"
        )
        .bind(demo_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn create_track(&self, new: NewDemoTrack) -> Result<DemoTrack, TakaError> {
        // Use provided ID or generate new one
        let id = new.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now().to_rfc3339();

        let max_order: Option<i32> = sqlx::query_scalar(
            "SELECT MAX(sort_order) FROM demo_tracks WHERE demo_id = ?"
        )
        .bind(&new.demo_id)
        .fetch_one(&self.pool)
        .await?;
        let sort_order = new.sort_order.unwrap_or_else(|| max_order.unwrap_or(-1) + 1);

        sqlx::query(
            "INSERT INTO demo_tracks (id, demo_id, track_type, name, locked, visible, muted, volume, sort_order, target_track_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.demo_id)
        .bind(&new.track_type)
        .bind(&new.name)
        .bind(false)
        .bind(true)
        .bind(false)
        .bind(1.0)
        .bind(sort_order)
        .bind(&new.target_track_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoTrack>("SELECT * FROM demo_tracks WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn update_track(&self, id: &str, updates: UpdateDemoTrack) -> Result<DemoTrack, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE demo_tracks SET
                name = COALESCE(?, name),
                locked = COALESCE(?, locked),
                visible = COALESCE(?, visible),
                muted = COALESCE(?, muted),
                volume = COALESCE(?, volume),
                sort_order = COALESCE(?, sort_order),
                target_track_id = COALESCE(?, target_track_id),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(updates.locked)
        .bind(updates.visible)
        .bind(updates.muted)
        .bind(updates.volume)
        .bind(updates.sort_order)
        .bind(&updates.target_track_id)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoTrack>("SELECT * FROM demo_tracks WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn delete_track(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_tracks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn reorder_tracks(&self, _demo_id: &str, track_ids: Vec<String>) -> Result<(), TakaError> {
        for (i, id) in track_ids.iter().enumerate() {
            sqlx::query("UPDATE demo_tracks SET sort_order = ? WHERE id = ?")
                .bind(i as i32)
                .bind(id)
                .execute(&self.pool)
                .await?;
        }
        Ok(())
    }

    // ============ Clip CRUD ============

    pub async fn list_clips(&self, track_id: &str) -> Result<Vec<DemoClip>, TakaError> {
        Ok(sqlx::query_as::<_, DemoClip>(
            "SELECT * FROM demo_clips WHERE track_id = ? ORDER BY start_time_ms ASC"
        )
        .bind(track_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn create_clip(&self, new: NewDemoClip) -> Result<DemoClip, TakaError> {
        // Use provided ID or generate new one
        let id = new.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO demo_clips (id, track_id, name, source_path, source_type, source_duration_ms, start_time_ms, duration_ms, in_point_ms, out_point_ms, position_x, position_y, scale, rotation, crop_top, crop_bottom, crop_left, crop_right, corner_radius, opacity, shadow_enabled, shadow_blur, shadow_offset_x, shadow_offset_y, shadow_color, volume, muted, linked_clip_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.track_id)
        .bind(&new.name)
        .bind(&new.source_path)
        .bind(&new.source_type)
        .bind(new.source_duration_ms)
        .bind(new.start_time_ms.unwrap_or(0))
        .bind(new.duration_ms)
        .bind(new.in_point_ms.unwrap_or(0))
        .bind(new.out_point_ms)
        .bind(new.position_x)
        .bind(new.position_y)
        .bind(new.scale)
        .bind(new.rotation)
        .bind(new.crop_top)
        .bind(new.crop_bottom)
        .bind(new.crop_left)
        .bind(new.crop_right)
        .bind(new.corner_radius)
        .bind(new.opacity)
        .bind(new.shadow_enabled.unwrap_or(false))
        .bind(new.shadow_blur)
        .bind(new.shadow_offset_x)
        .bind(new.shadow_offset_y)
        .bind(&new.shadow_color)
        .bind(new.volume.unwrap_or(1.0))
        .bind(new.muted.unwrap_or(false))
        .bind(&new.linked_clip_id)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoClip>("SELECT * FROM demo_clips WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn update_clip(&self, id: &str, updates: UpdateDemoClip) -> Result<DemoClip, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE demo_clips SET
                name = COALESCE(?, name),
                start_time_ms = COALESCE(?, start_time_ms),
                duration_ms = COALESCE(?, duration_ms),
                in_point_ms = COALESCE(?, in_point_ms),
                out_point_ms = COALESCE(?, out_point_ms),
                position_x = COALESCE(?, position_x),
                position_y = COALESCE(?, position_y),
                scale = COALESCE(?, scale),
                rotation = COALESCE(?, rotation),
                crop_top = COALESCE(?, crop_top),
                crop_bottom = COALESCE(?, crop_bottom),
                crop_left = COALESCE(?, crop_left),
                crop_right = COALESCE(?, crop_right),
                corner_radius = COALESCE(?, corner_radius),
                opacity = COALESCE(?, opacity),
                shadow_enabled = COALESCE(?, shadow_enabled),
                shadow_blur = COALESCE(?, shadow_blur),
                shadow_offset_x = COALESCE(?, shadow_offset_x),
                shadow_offset_y = COALESCE(?, shadow_offset_y),
                shadow_color = COALESCE(?, shadow_color),
                volume = COALESCE(?, volume),
                muted = COALESCE(?, muted),
                linked_clip_id = COALESCE(?, linked_clip_id),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(updates.start_time_ms)
        .bind(updates.duration_ms)
        .bind(updates.in_point_ms)
        .bind(updates.out_point_ms)
        .bind(updates.position_x)
        .bind(updates.position_y)
        .bind(updates.scale)
        .bind(updates.rotation)
        .bind(updates.crop_top)
        .bind(updates.crop_bottom)
        .bind(updates.crop_left)
        .bind(updates.crop_right)
        .bind(updates.corner_radius)
        .bind(updates.opacity)
        .bind(updates.shadow_enabled)
        .bind(updates.shadow_blur)
        .bind(updates.shadow_offset_x)
        .bind(updates.shadow_offset_y)
        .bind(&updates.shadow_color)
        .bind(updates.volume)
        .bind(updates.muted)
        .bind(&updates.linked_clip_id)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoClip>("SELECT * FROM demo_clips WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn delete_clip(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_clips WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Zoom Clip CRUD ============

    pub async fn list_zoom_clips(&self, track_id: &str) -> Result<Vec<DemoZoomClip>, TakaError> {
        Ok(sqlx::query_as::<_, DemoZoomClip>(
            "SELECT * FROM demo_zoom_clips WHERE track_id = ? ORDER BY start_time_ms ASC"
        )
        .bind(track_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn create_zoom_clip(&self, new: NewDemoZoomClip) -> Result<DemoZoomClip, TakaError> {
        // Use provided ID or generate new one
        let id = new.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO demo_zoom_clips (id, track_id, name, start_time_ms, duration_ms, zoom_scale, zoom_center_x, zoom_center_y, ease_in_duration_ms, ease_out_duration_ms, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.track_id)
        .bind(&new.name)
        .bind(new.start_time_ms)
        .bind(new.duration_ms)
        .bind(new.zoom_scale.unwrap_or(1.5))
        .bind(new.zoom_center_x.unwrap_or(50.0))
        .bind(new.zoom_center_y.unwrap_or(50.0))
        .bind(new.ease_in_duration_ms.unwrap_or(300))
        .bind(new.ease_out_duration_ms.unwrap_or(300))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoZoomClip>("SELECT * FROM demo_zoom_clips WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn update_zoom_clip(&self, id: &str, updates: UpdateDemoZoomClip) -> Result<DemoZoomClip, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE demo_zoom_clips SET
                name = COALESCE(?, name),
                start_time_ms = COALESCE(?, start_time_ms),
                duration_ms = COALESCE(?, duration_ms),
                zoom_scale = COALESCE(?, zoom_scale),
                zoom_center_x = COALESCE(?, zoom_center_x),
                zoom_center_y = COALESCE(?, zoom_center_y),
                ease_in_duration_ms = COALESCE(?, ease_in_duration_ms),
                ease_out_duration_ms = COALESCE(?, ease_out_duration_ms),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(updates.start_time_ms)
        .bind(updates.duration_ms)
        .bind(updates.zoom_scale)
        .bind(updates.zoom_center_x)
        .bind(updates.zoom_center_y)
        .bind(updates.ease_in_duration_ms)
        .bind(updates.ease_out_duration_ms)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoZoomClip>("SELECT * FROM demo_zoom_clips WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn delete_zoom_clip(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_zoom_clips WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Blur Clip CRUD ============

    pub async fn list_blur_clips(&self, track_id: &str) -> Result<Vec<DemoBlurClip>, TakaError> {
        Ok(sqlx::query_as::<_, DemoBlurClip>(
            "SELECT * FROM demo_blur_clips WHERE track_id = ? ORDER BY start_time_ms ASC"
        )
        .bind(track_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn create_blur_clip(&self, new: NewDemoBlurClip) -> Result<DemoBlurClip, TakaError> {
        // Use provided ID or generate new one
        let id = new.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO demo_blur_clips (id, track_id, name, start_time_ms, duration_ms, blur_intensity, region_x, region_y, region_width, region_height, corner_radius, blur_inside, ease_in_duration_ms, ease_out_duration_ms, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.track_id)
        .bind(&new.name)
        .bind(new.start_time_ms)
        .bind(new.duration_ms)
        .bind(new.blur_intensity.unwrap_or(20.0))
        .bind(new.region_x.unwrap_or(50.0))
        .bind(new.region_y.unwrap_or(50.0))
        .bind(new.region_width.unwrap_or(30.0))
        .bind(new.region_height.unwrap_or(30.0))
        .bind(new.corner_radius.unwrap_or(0.0))
        .bind(new.blur_inside.unwrap_or(true))
        .bind(new.ease_in_duration_ms.unwrap_or(0))
        .bind(new.ease_out_duration_ms.unwrap_or(0))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoBlurClip>("SELECT * FROM demo_blur_clips WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn update_blur_clip(&self, id: &str, updates: UpdateDemoBlurClip) -> Result<DemoBlurClip, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE demo_blur_clips SET
                name = COALESCE(?, name),
                start_time_ms = COALESCE(?, start_time_ms),
                duration_ms = COALESCE(?, duration_ms),
                blur_intensity = COALESCE(?, blur_intensity),
                region_x = COALESCE(?, region_x),
                region_y = COALESCE(?, region_y),
                region_width = COALESCE(?, region_width),
                region_height = COALESCE(?, region_height),
                corner_radius = COALESCE(?, corner_radius),
                blur_inside = COALESCE(?, blur_inside),
                ease_in_duration_ms = COALESCE(?, ease_in_duration_ms),
                ease_out_duration_ms = COALESCE(?, ease_out_duration_ms),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(updates.start_time_ms)
        .bind(updates.duration_ms)
        .bind(updates.blur_intensity)
        .bind(updates.region_x)
        .bind(updates.region_y)
        .bind(updates.region_width)
        .bind(updates.region_height)
        .bind(updates.corner_radius)
        .bind(updates.blur_inside)
        .bind(updates.ease_in_duration_ms)
        .bind(updates.ease_out_duration_ms)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoBlurClip>("SELECT * FROM demo_blur_clips WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn delete_blur_clip(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_blur_clips WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Pan Clip CRUD ============

    pub async fn list_pan_clips(&self, track_id: &str) -> Result<Vec<DemoPanClip>, TakaError> {
        Ok(sqlx::query_as::<_, DemoPanClip>(
            "SELECT * FROM demo_pan_clips WHERE track_id = ? ORDER BY start_time_ms ASC"
        )
        .bind(track_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn create_pan_clip(&self, new: NewDemoPanClip) -> Result<DemoPanClip, TakaError> {
        // Use provided ID or generate new one
        let id = new.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO demo_pan_clips (id, track_id, name, start_time_ms, duration_ms, start_x, start_y, end_x, end_y, ease_in_duration_ms, ease_out_duration_ms, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.track_id)
        .bind(&new.name)
        .bind(new.start_time_ms)
        .bind(new.duration_ms)
        .bind(new.start_x.unwrap_or(50.0))
        .bind(new.start_y.unwrap_or(50.0))
        .bind(new.end_x.unwrap_or(50.0))
        .bind(new.end_y.unwrap_or(50.0))
        .bind(new.ease_in_duration_ms.unwrap_or(300))
        .bind(new.ease_out_duration_ms.unwrap_or(300))
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoPanClip>("SELECT * FROM demo_pan_clips WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn update_pan_clip(&self, id: &str, updates: UpdateDemoPanClip) -> Result<DemoPanClip, TakaError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "UPDATE demo_pan_clips SET
                name = COALESCE(?, name),
                start_time_ms = COALESCE(?, start_time_ms),
                duration_ms = COALESCE(?, duration_ms),
                start_x = COALESCE(?, start_x),
                start_y = COALESCE(?, start_y),
                end_x = COALESCE(?, end_x),
                end_y = COALESCE(?, end_y),
                ease_in_duration_ms = COALESCE(?, ease_in_duration_ms),
                ease_out_duration_ms = COALESCE(?, ease_out_duration_ms),
                updated_at = ?
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(updates.start_time_ms)
        .bind(updates.duration_ms)
        .bind(updates.start_x)
        .bind(updates.start_y)
        .bind(updates.end_x)
        .bind(updates.end_y)
        .bind(updates.ease_in_duration_ms)
        .bind(updates.ease_out_duration_ms)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoPanClip>("SELECT * FROM demo_pan_clips WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn delete_pan_clip(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_pan_clips WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Asset CRUD ============

    pub async fn list_assets(&self, demo_id: &str) -> Result<Vec<DemoAsset>, TakaError> {
        Ok(sqlx::query_as::<_, DemoAsset>(
            "SELECT * FROM demo_assets WHERE demo_id = ? ORDER BY created_at DESC"
        )
        .bind(demo_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn create_asset(&self, new: NewDemoAsset) -> Result<DemoAsset, TakaError> {
        // Use provided ID or generate new one
        let id = new.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO demo_assets (id, demo_id, name, file_path, asset_type, duration_ms, width, height, thumbnail_path, file_size, has_audio, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.demo_id)
        .bind(&new.name)
        .bind(&new.file_path)
        .bind(&new.asset_type)
        .bind(new.duration_ms)
        .bind(new.width)
        .bind(new.height)
        .bind(&new.thumbnail_path)
        .bind(new.file_size)
        .bind(new.has_audio)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoAsset>("SELECT * FROM demo_assets WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn update_asset(&self, id: &str, updates: UpdateDemoAsset) -> Result<DemoAsset, TakaError> {
        sqlx::query(
            "UPDATE demo_assets SET
                name = COALESCE(?, name),
                thumbnail_path = COALESCE(?, thumbnail_path)
             WHERE id = ?"
        )
        .bind(&updates.name)
        .bind(&updates.thumbnail_path)
        .bind(id)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoAsset>("SELECT * FROM demo_assets WHERE id = ?")
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn delete_asset(&self, id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_assets WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Demo Recording Links ============

    pub async fn list_demo_recordings(&self, demo_id: &str) -> Result<Vec<DemoRecording>, TakaError> {
        Ok(sqlx::query_as::<_, DemoRecording>(
            "SELECT * FROM demo_recordings WHERE demo_id = ? ORDER BY sort_order ASC"
        )
        .bind(demo_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn list_demo_recordings_with_data(&self, demo_id: &str) -> Result<Vec<Recording>, TakaError> {
        Ok(sqlx::query_as::<_, Recording>(
            "SELECT r.* FROM recordings r
             INNER JOIN demo_recordings dr ON r.id = dr.recording_id
             WHERE dr.demo_id = ?
             ORDER BY dr.sort_order ASC"
        )
        .bind(demo_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn add_demo_recording(&self, new: NewDemoRecording) -> Result<DemoRecording, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let max_order: Option<i32> = sqlx::query_scalar(
            "SELECT MAX(sort_order) FROM demo_recordings WHERE demo_id = ?"
        )
        .bind(&new.demo_id)
        .fetch_one(&self.pool)
        .await?;
        let sort_order = new.sort_order.unwrap_or_else(|| max_order.unwrap_or(-1) + 1);

        sqlx::query(
            "INSERT INTO demo_recordings (id, demo_id, recording_id, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.demo_id)
        .bind(&new.recording_id)
        .bind(sort_order)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoRecording>("SELECT * FROM demo_recordings WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn remove_demo_recording(&self, demo_id: &str, recording_id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_recordings WHERE demo_id = ? AND recording_id = ?")
            .bind(demo_id)
            .bind(recording_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    // ============ Demo Screenshot Links ============

    pub async fn list_demo_screenshots(&self, demo_id: &str) -> Result<Vec<DemoScreenshot>, TakaError> {
        Ok(sqlx::query_as::<_, DemoScreenshot>(
            "SELECT * FROM demo_screenshots WHERE demo_id = ? ORDER BY sort_order ASC"
        )
        .bind(demo_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn list_demo_screenshots_with_data(&self, demo_id: &str) -> Result<Vec<Screenshot>, TakaError> {
        Ok(sqlx::query_as::<_, Screenshot>(
            "SELECT s.* FROM screenshots s
             INNER JOIN demo_screenshots ds ON s.id = ds.screenshot_id
             WHERE ds.demo_id = ?
             ORDER BY ds.sort_order ASC"
        )
        .bind(demo_id)
        .fetch_all(&self.pool)
        .await?)
    }

    pub async fn add_demo_screenshot(&self, new: NewDemoScreenshot) -> Result<DemoScreenshot, TakaError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        let max_order: Option<i32> = sqlx::query_scalar(
            "SELECT MAX(sort_order) FROM demo_screenshots WHERE demo_id = ?"
        )
        .bind(&new.demo_id)
        .fetch_one(&self.pool)
        .await?;
        let sort_order = new.sort_order.unwrap_or_else(|| max_order.unwrap_or(-1) + 1);

        sqlx::query(
            "INSERT INTO demo_screenshots (id, demo_id, screenshot_id, sort_order, created_at)
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(&id)
        .bind(&new.demo_id)
        .bind(&new.screenshot_id)
        .bind(sort_order)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        sqlx::query_as::<_, DemoScreenshot>("SELECT * FROM demo_screenshots WHERE id = ?")
            .bind(&id)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.into())
    }

    pub async fn remove_demo_screenshot(&self, demo_id: &str, screenshot_id: &str) -> Result<(), TakaError> {
        sqlx::query("DELETE FROM demo_screenshots WHERE demo_id = ? AND screenshot_id = ?")
            .bind(demo_id)
            .bind(screenshot_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
