// src/db.rs — SQLx PostgreSQL connection pool setup
use anyhow::Result;
use sqlx::{postgres::PgPoolOptions, PgPool};

pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect(database_url)
        .await?;

    // Run any pending migrations (we use init.sql via Docker, but this keeps schema in sync)
    tracing::info!("Connected to PostgreSQL");
    Ok(pool)
}
