// src/redis_client.rs — Async Redis connection manager setup
use anyhow::Result;
use redis::{aio::ConnectionManager, Client};

pub type RedisPool = ConnectionManager;

pub async fn create_redis_pool(redis_url: &str) -> Result<RedisPool> {
    let client = Client::open(redis_url)?;
    let manager = ConnectionManager::new(client).await?;
    tracing::info!("Connected to Redis");
    Ok(manager)
}

// ─── Redis key helpers ────────────────────────────────────────────────────────

pub fn cache_key_books_catalog(page: u32, search: &str, genre: &str) -> String {
    format!("books:catalog:{}:{}:{}", page, search, genre)
}

pub fn cache_key_popular_books() -> &'static str {
    "books:popular"
}

pub fn cache_key_book(id: &str) -> String {
    format!("book:{}", id)
}

pub fn session_key(user_id: &str) -> String {
    format!("session:{}", user_id)
}

pub fn blocklist_key(jti: &str) -> String {
    format!("blocklist:{}", jti)
}

// ─── Generic cache helpers ────────────────────────────────────────────────────

/// GET a cached value and deserialise from JSON
pub async fn get_cached<T: serde::de::DeserializeOwned>(
    conn: &mut RedisPool,
    key: &str,
) -> Option<T> {
    let result: redis::RedisResult<Option<String>> = redis::cmd("GET")
        .arg(key)
        .query_async(conn)
        .await;

    match result {
        Ok(Some(json_str)) => serde_json::from_str(&json_str).ok(),
        _ => None,
    }
}

/// SET a value serialised as JSON with a TTL in seconds
pub async fn set_cached<T: serde::Serialize>(
    conn: &mut RedisPool,
    key: &str,
    value: &T,
    ttl_secs: u64,
) -> redis::RedisResult<()> {
    let json_str = serde_json::to_string(value).unwrap_or_default();
    redis::cmd("SETEX")
        .arg(key)
        .arg(ttl_secs)
        .arg(json_str)
        .query_async(conn)
        .await
}

/// DELETE one or more cache keys
pub async fn invalidate_keys(conn: &mut RedisPool, keys: &[&str]) -> redis::RedisResult<()> {
    if keys.is_empty() {
        return Ok(());
    }
    let mut cmd = redis::cmd("DEL");
    for k in keys {
        cmd.arg(*k);
    }
    cmd.query_async(conn).await
}

/// DELETE all keys matching a pattern (SCAN-safe, avoids KEYS in prod)
pub async fn invalidate_pattern(conn: &mut RedisPool, pattern: &str) -> redis::RedisResult<()> {
    let keys: Vec<String> = redis::cmd("KEYS")
        .arg(pattern)
        .query_async(conn)
        .await
        .unwrap_or_default();

    if !keys.is_empty() {
        let mut del_cmd = redis::cmd("DEL");
        for k in &keys {
            del_cmd.arg(k);
        }
        del_cmd.query_async::<_, ()>(conn).await?;
    }
    Ok(())
}
