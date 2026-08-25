// src/main.rs — eLib backend entry point
//
// Bootstraps:
//   • PostgreSQL connection pool (SQLx)
//   • Redis connection manager
//   • Axum HTTP server with all routes
//   • Tokio background worker for auto-expiring borrows

mod auth;
mod books;
mod config;
mod db;
mod errors;
mod models;
mod redis_client;
mod worker;

use crate::{
    config::Config,
    redis_client::RedisPool,
};
use axum::{
    extract::State,
    http::{
        header::{AUTHORIZATION, CONTENT_TYPE},
        Method, StatusCode,
    },
    response::Json,
    routing::{delete, get, post, put},
    Router,
};
use serde_json::json;
use sqlx::PgPool;
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

// ─── Shared application state ─────────────────────────────────────────────────

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub redis: RedisPool,
    pub config: Config,
}

// ─── Entry point ──────────────────────────────────────────────────────────────

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ── Logging ────────────────────────────────────────────────────────────
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // ── Configuration ──────────────────────────────────────────────────────
    let config = Config::from_env()?;
    tracing::info!("🚀 Starting eLib backend on {}:{}", config.server_host, config.server_port);

    // ── Database connections ───────────────────────────────────────────────
    let db_pool = db::create_pool(&config.database_url).await?;
    let redis_pool = redis_client::create_redis_pool(&config.redis_url).await?;

    // ── Shared state ───────────────────────────────────────────────────────
    let state = AppState {
        db: db_pool.clone(),
        redis: redis_pool.clone(),
        config: config.clone(),
    };

    // ── Background worker ──────────────────────────────────────────────────
    let worker_db = db_pool.clone();
    let worker_redis = redis_pool.clone();
    let worker_interval = config.worker_interval_secs;
    tokio::spawn(async move {
        worker::run_expiration_worker(worker_db, worker_redis, worker_interval).await;
    });

    // ── Router ────────────────────────────────────────────────────────────
    let app = build_router(state);

    // ── Server ────────────────────────────────────────────────────────────
    let addr: SocketAddr = format!("{}:{}", config.server_host, config.server_port)
        .parse()?;

    tracing::info!("🌐 Listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

// ─── Router configuration ────────────────────────────────────────────────────

fn build_router(state: AppState) -> Router {
    // CORS — allow the Vite dev server and any local origin
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS])
        .allow_headers([AUTHORIZATION, CONTENT_TYPE]);

    Router::new()
        // Health check
        .route("/health", get(health_handler))
        // Auth routes
        .route("/api/auth/register", post(auth::handlers::register))
        .route("/api/auth/login",    post(auth::handlers::login))
        .route("/api/auth/google",   post(auth::handlers::google_login))
        .route("/api/auth/logout",   post(auth::handlers::logout))
        .route("/api/auth/me",       get(auth::handlers::me))
        // Books routes
        .route("/api/books",                  get(books::handlers::list_books).post(books::handlers::create_book))
        .route("/api/books/popular",          get(books::handlers::popular_books))
        .route("/api/books/featured",         get(books::handlers::featured_books))
        .route("/api/books/:id",              get(books::handlers::get_book).put(books::handlers::update_book).delete(books::handlers::delete_book))
        .route("/api/books/:id/borrow",       post(books::handlers::borrow_book))
        .route("/api/books/:id/return",       post(books::handlers::return_book))
        .route("/api/borrows/:id/return",     post(books::handlers::return_by_borrow_id))
        .route("/api/me/borrows",             get(books::handlers::my_borrows))
        // Admin routes
        .route("/api/admin/stats",            get(books::handlers::get_admin_stats))
        .route("/api/admin/history",          get(books::handlers::get_borrow_history))
        // Middleware
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

// ─── Health handler ───────────────────────────────────────────────────────────

async fn health_handler(State(state): State<AppState>) -> (StatusCode, Json<serde_json::Value>) {
    // Lightweight DB ping
    let db_ok = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();

    // Redis ping
    let redis_ok = {
        let mut conn = state.redis.clone();
        let result: redis::RedisResult<String> =
            redis::cmd("PING").query_async(&mut conn).await;
        result.is_ok()
    };

    let status = if db_ok && redis_ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };

    (
        status,
        Json(json!({
            "status": if db_ok && redis_ok { "healthy" } else { "degraded" },
            "database": if db_ok { "ok" } else { "error" },
            "redis": if redis_ok { "ok" } else { "error" },
        })),
    )
}
