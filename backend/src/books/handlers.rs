// src/books/handlers.rs — Books CRUD, borrow, return, and user bookshelf endpoints
// Multi-user borrowing: each user has their own borrow record via user_borrows table.
// Books remain 'Available' globally; per-user status is checked from user_borrows.

use crate::{
    auth::middleware::AuthUser,
    errors::{AppError, AppResult},
    models::{Book, BookSummary},
    redis_client::{
        cache_key_book, cache_key_books_catalog, cache_key_popular_books, get_cached,
        invalidate_pattern, set_cached,
    },
    AppState,
};
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// Cache TTL constants (seconds)
const CATALOG_CACHE_TTL: u64 = 60;
const POPULAR_CACHE_TTL: u64 = 300;
const BOOK_DETAIL_TTL: u64 = 120;

// ─── Query params ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CatalogQuery {
    #[serde(default)]
    pub search: String,
    #[serde(default)]
    pub genre: String,
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
}

fn default_page() -> u32 { 1 }
fn default_limit() -> u32 { 20 }

// ─── Request DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SaveBookRequest {
    pub title: String,
    pub author: String,
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_genre")]
    pub genre: String,
    #[serde(default)]
    pub cover_url: String,
    #[serde(default)]
    pub pdf_url: Option<String>,
    #[serde(default)]
    pub year: Option<i32>,
    #[serde(default)]
    pub pages: Option<i32>,
    #[serde(default)]
    pub isbn: Option<String>,
    #[serde(default = "default_lang")]
    pub language: String,
    #[serde(default)]
    pub max_borrow_days: Option<i32>,
    #[serde(default)]
    pub featured: bool,
}

fn default_genre() -> String { "General".to_string() }
fn default_lang() -> String { "ไทย".to_string() }

#[derive(Debug, Deserialize, Default)]
pub struct BorrowRequest {
    pub days: Option<i64>,
}

// ─── Response DTOs ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedBooks {
    pub data: Vec<BookSummary>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
}

/// A book with per-user borrow status injected
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct BookWithUserStatus {
    pub id: Uuid,
    pub title: String,
    pub author: String,
    pub genre: String,
    pub cover_url: String,
    pub pdf_url: Option<String>,
    pub status: String,       // global status (always Available for digital)
    pub borrowed_by: Option<Uuid>,  // kept for compatibility
    pub expires_at: Option<chrono::DateTime<Utc>>,
    pub borrow_count: i32,
    pub language: String,
    pub max_borrow_days: i32,
    pub featured: bool,
    // Per-user fields
    pub user_borrowed: bool,
    pub user_expires_at: Option<chrono::DateTime<Utc>>,
    pub borrow_id: Option<Uuid>,
}

/// Borrow record for user bookshelf
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserBorrowEntry {
    pub borrow_id: Uuid,
    pub book_id: Uuid,
    pub title: String,
    pub author: String,
    pub genre: String,
    pub cover_url: String,
    pub pdf_url: Option<String>,
    pub language: String,
    pub max_borrow_days: i32,
    pub borrowed_at: chrono::DateTime<Utc>,
    pub expires_at: chrono::DateTime<Utc>,
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/books
pub async fn list_books(
    State(state): State<AppState>,
    Query(params): Query<CatalogQuery>,
) -> AppResult<Json<PaginatedBooks>> {
    let cache_key = cache_key_books_catalog(params.page, &params.search, &params.genre);
    let mut redis_conn = state.redis.clone();

    // ── Try cache hit ──────────────────────────────────────────────────────
    if let Some(cached) = get_cached::<PaginatedBooks>(&mut redis_conn, &cache_key).await {
        tracing::debug!("📦 Cache hit: {}", cache_key);
        return Ok(Json(cached));
    }

    // ── Cache miss — query PostgreSQL ──────────────────────────────────────
    let offset = ((params.page.saturating_sub(1)) * params.limit) as i64;
    let limit = params.limit as i64;
    let search_pattern = format!("%{}%", params.search);

    let books: Vec<BookSummary> = if params.genre.is_empty() {
        sqlx::query_as(
            r#"
            SELECT id, title, author, genre, cover_url, pdf_url, status,
                   borrowed_by, expires_at, borrow_count, language, max_borrow_days, featured
            FROM books
            WHERE ($1 = '' OR title ILIKE $2 OR author ILIKE $2)
            ORDER BY featured DESC, borrow_count DESC, title
            LIMIT $3 OFFSET $4
            "#,
        )
        .bind(&params.search)
        .bind(&search_pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    } else {
        sqlx::query_as(
            r#"
            SELECT id, title, author, genre, cover_url, pdf_url, status,
                   borrowed_by, expires_at, borrow_count, language, max_borrow_days, featured
            FROM books
            WHERE genre = $1
              AND ($2 = '' OR title ILIKE $3 OR author ILIKE $3)
            ORDER BY featured DESC, borrow_count DESC, title
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(&params.genre)
        .bind(&params.search)
        .bind(&search_pattern)
        .bind(limit)
        .bind(offset)
        .fetch_all(&state.db)
        .await?
    };

    let total: i64 = if params.genre.is_empty() {
        sqlx::query_scalar(
            "SELECT COUNT(*) FROM books WHERE ($1 = '' OR title ILIKE $2 OR author ILIKE $2)",
        )
        .bind(&params.search)
        .bind(&search_pattern)
        .fetch_one(&state.db)
        .await?
    } else {
        sqlx::query_scalar(
            "SELECT COUNT(*) FROM books WHERE genre = $1 AND ($2 = '' OR title ILIKE $3 OR author ILIKE $3)",
        )
        .bind(&params.genre)
        .bind(&params.search)
        .bind(&search_pattern)
        .fetch_one(&state.db)
        .await?
    };

    let total_pages = ((total as f64) / (params.limit as f64)).ceil() as u32;

    let response = PaginatedBooks {
        data: books,
        total,
        page: params.page,
        limit: params.limit,
        total_pages,
    };

    // ── Store in cache ─────────────────────────────────────────────────────
    let _ = set_cached(&mut redis_conn, &cache_key, &response, CATALOG_CACHE_TTL).await;
    tracing::debug!("💾 Cache set: {}", cache_key);

    Ok(Json(response))
}

/// GET /api/books/popular
pub async fn popular_books(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<BookSummary>>> {
    let cache_key = cache_key_popular_books();
    let mut redis_conn = state.redis.clone();

    if let Some(cached) = get_cached::<Vec<BookSummary>>(&mut redis_conn, cache_key).await {
        tracing::debug!("📦 Cache hit: {}", cache_key);
        return Ok(Json(cached));
    }

    let books: Vec<BookSummary> = sqlx::query_as(
        r#"
        SELECT id, title, author, genre, cover_url, pdf_url, status,
               borrowed_by, expires_at, borrow_count, language, max_borrow_days, featured
        FROM books
        ORDER BY borrow_count DESC
        LIMIT 10
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    let _ = set_cached(&mut redis_conn, cache_key, &books, POPULAR_CACHE_TTL).await;

    Ok(Json(books))
}

/// GET /api/books/featured
pub async fn featured_books(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<BookSummary>>> {
    let books: Vec<BookSummary> = sqlx::query_as(
        r#"
        SELECT id, title, author, genre, cover_url, pdf_url, status,
               borrowed_by, expires_at, borrow_count, language, max_borrow_days, featured
        FROM books
        WHERE featured = TRUE
        ORDER BY borrow_count DESC
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(books))
}

/// GET /api/books/:id
pub async fn get_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Book>> {
    let cache_key = cache_key_book(&id.to_string());
    let mut redis_conn = state.redis.clone();

    if let Some(cached) = get_cached::<Book>(&mut redis_conn, &cache_key).await {
        return Ok(Json(cached));
    }

    let book: Book = sqlx::query_as("SELECT * FROM books WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Book {} not found", id)))?;

    let _ = set_cached(&mut redis_conn, &cache_key, &book, BOOK_DETAIL_TTL).await;

    Ok(Json(book))
}

/// POST /api/books (Admin create book)
pub async fn create_book(
    State(state): State<AppState>,
    auth_user: AuthUser,
    Json(payload): Json<SaveBookRequest>,
) -> AppResult<(StatusCode, Json<Book>)> {
    if auth_user.role != "admin" {
        return Err(AppError::Auth("Admin privilege required".into()));
    }

    if payload.title.trim().is_empty() {
        return Err(AppError::BadRequest("Title is required".into()));
    }

    let max_days = payload.max_borrow_days.unwrap_or(14);

    let book: Book = sqlx::query_as(
        r#"
        INSERT INTO books (
            title, author, description, genre, cover_url, pdf_url,
            year, pages, isbn, language, max_borrow_days, featured
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        "#,
    )
    .bind(&payload.title)
    .bind(&payload.author)
    .bind(&payload.description)
    .bind(&payload.genre)
    .bind(&payload.cover_url)
    .bind(&payload.pdf_url)
    .bind(payload.year)
    .bind(payload.pages)
    .bind(&payload.isbn)
    .bind(&payload.language)
    .bind(max_days)
    .bind(payload.featured)
    .fetch_one(&state.db)
    .await?;

    // Invalidate list caches
    let mut redis_conn = state.redis.clone();
    let _ = invalidate_pattern(&mut redis_conn, "books:catalog:*").await;
    let _ = invalidate_pattern(&mut redis_conn, "books:popular").await;

    Ok((StatusCode::CREATED, Json(book)))
}

/// PUT /api/books/:id (Admin update book)
pub async fn update_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth_user: AuthUser,
    Json(payload): Json<SaveBookRequest>,
) -> AppResult<Json<Book>> {
    if auth_user.role != "admin" {
        return Err(AppError::Auth("Admin privilege required".into()));
    }

    let max_days = payload.max_borrow_days.unwrap_or(14);

    let book: Book = sqlx::query_as(
        r#"
        UPDATE books
        SET
            title           = $1,
            author          = $2,
            description     = $3,
            genre           = $4,
            cover_url       = $5,
            pdf_url         = $6,
            year            = $7,
            pages           = $8,
            isbn            = $9,
            language        = $10,
            max_borrow_days = $11,
            featured        = $12,
            updated_at      = NOW()
        WHERE id = $13
        RETURNING *
        "#,
    )
    .bind(&payload.title)
    .bind(&payload.author)
    .bind(&payload.description)
    .bind(&payload.genre)
    .bind(&payload.cover_url)
    .bind(&payload.pdf_url)
    .bind(payload.year)
    .bind(payload.pages)
    .bind(&payload.isbn)
    .bind(&payload.language)
    .bind(max_days)
    .bind(payload.featured)
    .bind(id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Book not found".into()))?;

    // Invalidate caches
    let mut redis_conn = state.redis.clone();
    let _ = invalidate_caches_for_book(&mut redis_conn, &id.to_string()).await;

    Ok(Json(book))
}

/// DELETE /api/books/:id (Admin delete book)
pub async fn delete_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    if auth_user.role != "admin" {
        return Err(AppError::Auth("Admin privilege required".into()));
    }

    let res = sqlx::query("DELETE FROM books WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await?;

    if res.rows_affected() == 0 {
        return Err(AppError::NotFound("Book not found".into()));
    }

    // Invalidate caches
    let mut redis_conn = state.redis.clone();
    let _ = invalidate_caches_for_book(&mut redis_conn, &id.to_string()).await;

    Ok(Json(serde_json::json!({ "message": "Book deleted successfully" })))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminStats {
    pub total_books: i64,
    pub active_borrows: i64,
    pub total_users: i64,
    pub total_history_records: i64,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct BorrowHistoryRecord {
    pub id: Uuid,
    pub book_id: Uuid,
    pub book_title: String,
    pub user_id: Uuid,
    pub user_name: String,
    pub user_email: String,
    pub borrowed_at: chrono::DateTime<Utc>,
    pub returned_at: Option<chrono::DateTime<Utc>>,
    pub expired: bool,
}

/// GET /api/admin/stats (Admin stats)
pub async fn get_admin_stats(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> AppResult<Json<AdminStats>> {
    if auth_user.role != "admin" {
        return Err(AppError::Auth("Admin privilege required".into()));
    }

    let total_books: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM books")
        .fetch_one(&state.db)
        .await?;

    // Count active borrows from user_borrows table (multi-user aware)
    let active_borrows: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM user_borrows WHERE returned_at IS NULL AND expires_at > NOW()"
    )
        .fetch_one(&state.db)
        .await?;

    let total_users: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&state.db)
        .await?;

    let total_history_records: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM user_borrows")
        .fetch_one(&state.db)
        .await?;

    Ok(Json(AdminStats {
        total_books,
        active_borrows,
        total_users,
        total_history_records,
    }))
}

/// GET /api/admin/history (Admin borrow history)
pub async fn get_borrow_history(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> AppResult<Json<Vec<BorrowHistoryRecord>>> {
    if auth_user.role != "admin" {
        return Err(AppError::Auth("Admin privilege required".into()));
    }

    let records: Vec<BorrowHistoryRecord> = sqlx::query_as(
        r#"
        SELECT
            ub.id,
            ub.book_id,
            b.title as book_title,
            ub.user_id,
            u.display_name as user_name,
            u.email as user_email,
            ub.borrowed_at,
            ub.returned_at,
            (ub.returned_at IS NULL AND ub.expires_at < NOW()) as expired
        FROM user_borrows ub
        JOIN books b ON ub.book_id = b.id
        JOIN users u ON ub.user_id = u.id
        ORDER BY ub.borrowed_at DESC
        LIMIT 100
        "#,
    )
    .fetch_all(&state.db)
    .await?;

    Ok(Json(records))
}

/// POST /api/books/:id/borrow
/// Multi-user: each user can borrow any book independently. Digital library = unlimited copies.
pub async fn borrow_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth_user: AuthUser,
    payload: Option<Json<BorrowRequest>>,
) -> AppResult<Json<serde_json::Value>> {
    // Check book exists
    let book: Option<Book> = sqlx::query_as("SELECT * FROM books WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.db)
        .await?;

    let book = book.ok_or_else(|| AppError::NotFound("Book not found".into()))?;

    // Check user doesn't already have this book borrowed (active borrow)
    let already_borrowed: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM user_borrows WHERE user_id = $1 AND book_id = $2 AND returned_at IS NULL AND expires_at > NOW())"
    )
    .bind(auth_user.id)
    .bind(id)
    .fetch_one(&state.db)
    .await?;

    if already_borrowed {
        return Err(AppError::Conflict("คุณกำลังยืมหนังสือเล่มนี้อยู่แล้ว".into()));
    }

    let max_days = if book.max_borrow_days > 0 { book.max_borrow_days as i64 } else { 14 };
    let requested_days = payload
        .and_then(|p| p.days)
        .unwrap_or(max_days)
        .clamp(1, max_days);

    let expires_at = Utc::now() + Duration::days(requested_days);

    // Insert into user_borrows (multi-user borrow record)
    let borrow_id: Uuid = sqlx::query_scalar(
        "INSERT INTO user_borrows (user_id, book_id, expires_at) VALUES ($1, $2, $3) RETURNING id"
    )
    .bind(auth_user.id)
    .bind(id)
    .bind(expires_at)
    .fetch_one(&state.db)
    .await?;

    // Increment global borrow_count on book
    let _ = sqlx::query("UPDATE books SET borrow_count = borrow_count + 1, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    // Also insert into legacy borrow_history for admin stats
    let _ = sqlx::query(
        "INSERT INTO borrow_history (book_id, user_id) VALUES ($1, $2)"
    )
    .bind(id)
    .bind(auth_user.id)
    .execute(&state.db)
    .await;

    // Invalidate caches
    let mut redis_conn = state.redis.clone();
    let _ = invalidate_caches_for_book(&mut redis_conn, &id.to_string()).await;

    Ok(Json(serde_json::json!({
        "message": "ยืมหนังสือสำเร็จ",
        "borrow_id": borrow_id,
        "book_id": id,
        "expires_at": expires_at,
        "book": {
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "pdf_url": book.pdf_url,
            "max_borrow_days": book.max_borrow_days,
        }
    })))
}

/// POST /api/books/:id/return  (return by book_id for current user)
pub async fn return_book(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    // Find the active borrow record for this user+book
    let affected = sqlx::query(
        r#"
        UPDATE user_borrows
        SET returned_at = NOW()
        WHERE user_id = $1 AND book_id = $2 AND returned_at IS NULL
        "#,
    )
    .bind(auth_user.id)
    .bind(id)
    .execute(&state.db)
    .await?
    .rows_affected();

    if affected == 0 {
        return Err(AppError::NotFound("ไม่พบรายการยืมที่ยังค้างอยู่สำหรับหนังสือเล่มนี้".into()));
    }

    // Mark legacy borrow_history as returned too
    let _ = sqlx::query(
        "UPDATE borrow_history SET returned_at = NOW() WHERE book_id = $1 AND user_id = $2 AND returned_at IS NULL"
    )
    .bind(id)
    .bind(auth_user.id)
    .execute(&state.db)
    .await;

    let mut redis_conn = state.redis.clone();
    let _ = invalidate_caches_for_book(&mut redis_conn, &id.to_string()).await;

    Ok(Json(serde_json::json!({ "message": "คืนหนังสือสำเร็จ" })))
}

/// POST /api/borrows/:borrow_id/return  (return by borrow_id)
pub async fn return_by_borrow_id(
    State(state): State<AppState>,
    Path(borrow_id): Path<Uuid>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    let row = sqlx::query_scalar::<_, Uuid>(
        "UPDATE user_borrows SET returned_at = NOW() WHERE id = $1 AND user_id = $2 AND returned_at IS NULL RETURNING book_id"
    )
    .bind(borrow_id)
    .bind(auth_user.id)
    .fetch_optional(&state.db)
    .await?;

    let book_id = row.ok_or_else(|| AppError::NotFound("ไม่พบรายการยืมนี้".into()))?;

    // Invalidate caches for this book
    let mut redis_conn = state.redis.clone();
    let _ = invalidate_caches_for_book(&mut redis_conn, &book_id.to_string()).await;

    Ok(Json(serde_json::json!({ "message": "คืนหนังสือสำเร็จ", "book_id": book_id })))
}

/// GET /api/me/borrows — User's active bookshelf
pub async fn my_borrows(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> AppResult<Json<Vec<UserBorrowEntry>>> {
    let entries: Vec<UserBorrowEntry> = sqlx::query_as(
        r#"
        SELECT
            ub.id         AS borrow_id,
            ub.book_id,
            b.title,
            b.author,
            b.genre,
            b.cover_url,
            b.pdf_url,
            b.language,
            b.max_borrow_days,
            ub.borrowed_at,
            ub.expires_at
        FROM user_borrows ub
        JOIN books b ON ub.book_id = b.id
        WHERE ub.user_id = $1
          AND ub.returned_at IS NULL
          AND ub.expires_at > NOW()
        ORDER BY ub.borrowed_at DESC
        "#,
    )
    .bind(auth_user.id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(entries))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn invalidate_caches_for_book(
    redis: &mut crate::redis_client::RedisPool,
    book_id: &str,
) -> redis::RedisResult<()> {
    let book_k = cache_key_book(book_id);
    let _ = invalidate_pattern(redis, &book_k).await;
    let _ = invalidate_pattern(redis, "books:catalog:*").await;
    let _ = invalidate_pattern(redis, "books:popular").await;
    Ok(())
}
