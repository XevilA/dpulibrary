// src/worker.rs — Tokio background worker for auto-expiring borrowed books
// Uses runtime sqlx queries (no compile-time DATABASE_URL required)

use crate::redis_client::{invalidate_pattern, RedisPool};
use sqlx::PgPool;
use std::time::Duration;
use tokio::time;
use uuid::Uuid;

pub async fn run_expiration_worker(db: PgPool, redis: RedisPool, interval_secs: u64) {
    tracing::info!(
        "🔄 Auto-expiration worker started (interval: {}s)",
        interval_secs
    );

    let mut interval = time::interval(Duration::from_secs(interval_secs));
    interval.tick().await; // skip the first immediate tick

    loop {
        interval.tick().await;

        match expire_overdue_books(&db, &mut redis.clone()).await {
            Ok(count) if count > 0 => {
                tracing::info!("✅ Worker: expired and returned {} book(s)", count);
            }
            Ok(_) => {
                tracing::debug!("Worker: no expired books found");
            }
            Err(e) => {
                tracing::error!("❌ Worker error: {:?}", e);
            }
        }
    }
}

// Row returned by the UPDATE…RETURNING query
#[derive(sqlx::FromRow)]
struct ExpiredRow {
    id: Uuid,
    title: String,
}

async fn expire_overdue_books(db: &PgPool, redis: &mut RedisPool) -> anyhow::Result<usize> {
    let expired_rows: Vec<ExpiredRow> = sqlx::query_as(
        r#"
        UPDATE books
        SET
            status      = 'Available',
            borrowed_by = NULL,
            expires_at  = NULL,
            updated_at  = NOW()
        WHERE expires_at IS NOT NULL
          AND expires_at < NOW()
          AND status = 'Borrowed'
        RETURNING id, title
        "#,
    )
    .fetch_all(db)
    .await?;

    if expired_rows.is_empty() {
        return Ok(0);
    }

    for row in &expired_rows {
        tracing::info!("⏰ Auto-returned: {} ({})", row.title, row.id);

        let _ = sqlx::query(
            r#"
            UPDATE borrow_history
            SET returned_at = NOW(), expired = TRUE
            WHERE book_id = $1
              AND returned_at IS NULL
            "#,
        )
        .bind(row.id)
        .execute(db)
        .await;
    }

    // Bust Redis caches
    for row in &expired_rows {
        let book_key = format!("book:{}", row.id);
        let _ = invalidate_pattern(redis, &book_key).await;
    }
    let _ = invalidate_pattern(redis, "books:catalog:*").await;
    let _ = invalidate_pattern(redis, "books:popular").await;

    Ok(expired_rows.len())
}
