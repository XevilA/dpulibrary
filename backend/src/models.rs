// src/models.rs — Shared data models (structs shared across modules)
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub display_name: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Book {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub description: String,
    pub genre: String,
    pub cover_url: String,
    pub pdf_url: Option<String>,
    pub status: String,
    pub borrowed_by: Option<Uuid>,
    pub expires_at: Option<DateTime<Utc>>,
    pub borrow_count: i32,
    pub year: Option<i32>,
    pub pages: Option<i32>,
    pub isbn: Option<String>,
    pub language: String,
    pub max_borrow_days: i32,
    pub featured: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Slimmer response type returned by list endpoints (omits heavy fields)
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct BookSummary {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub genre: String,
    pub cover_url: String,
    pub pdf_url: Option<String>,
    pub status: String,
    pub borrowed_by: Option<Uuid>,
    pub expires_at: Option<DateTime<Utc>>,
    pub borrow_count: i32,
    pub language: String,
    pub max_borrow_days: i32,
    pub featured: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,    // user id (UUID string)
    pub email: String,
    pub role: String,
    pub jti: String,    // unique token id (for blocklist)
    pub exp: usize,     // expiry unix timestamp
    pub iat: usize,     // issued-at unix timestamp
}
