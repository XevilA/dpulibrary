// src/auth/handlers.rs — Authentication endpoints
// Enforces @dpu.ac.th university domain and provides Google OAuth login.

use crate::{
    auth::middleware::AuthUser,
    errors::{AppError, AppResult},
    models::{Claims, User},
    redis_client::{blocklist_key, session_key},
    AppState,
};
use axum::{
    extract::State,
    Json,
};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::Utc;
use jsonwebtoken::{encode, EncodingKey, Header};
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use base64::prelude::*;

// ─── Request / Response DTOs ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub display_name: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct GoogleLoginRequest {
    pub credential: Option<String>,
    pub email: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserProfile,
}

#[derive(Debug, Serialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub display_name: String,
    pub role: String,
}

#[derive(Debug, Deserialize)]
struct GoogleTokenInfo {
    pub email: Option<String>,
    pub name: Option<String>,
    pub email_verified: Option<String>,
    pub hd: Option<String>,
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/// POST /api/auth/register
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<Json<AuthResponse>> {
    let email = payload.email.trim().to_lowercase();
    let display_name = payload.display_name.trim();

    if email.is_empty() || !email.contains('@') {
        return Err(AppError::BadRequest("รูปแบบอีเมลไม่ถูกต้อง".into()));
    }

    // Enforce @dpu.ac.th domain
    if !email.ends_with("@dpu.ac.th") {
        return Err(AppError::BadRequest(
            "กรุณาใช้อีเมลของมหาวิทยาลัย (@dpu.ac.th) เท่านั้น".into(),
        ));
    }

    if display_name.is_empty() {
        return Err(AppError::BadRequest("กรุณาระบุชื่อ-นามสกุล".into()));
    }

    if payload.password.len() < 6 {
        return Err(AppError::BadRequest(
            "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร".into(),
        ));
    }

    // Check uniqueness
    let existing: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE email = $1")
            .bind(&email)
            .fetch_one(&state.db)
            .await?;

    if existing > 0 {
        return Err(AppError::Conflict("อีเมลนี้ได้รับการลงทะเบียนในระบบแล้ว".into()));
    }

    let password_hash = hash(&payload.password, DEFAULT_COST)
        .map_err(|e| AppError::Internal(format!("bcrypt error: {e}")))?;

    let user: User = sqlx::query_as(
        r#"
        INSERT INTO users (email, password_hash, display_name, role)
        VALUES ($1, $2, $3, 'member')
        RETURNING *
        "#,
    )
    .bind(&email)
    .bind(&password_hash)
    .bind(display_name)
    .fetch_one(&state.db)
    .await?;

    let (token, jti) = issue_jwt(&user, &state.config.jwt_secret, state.config.jwt_expiry_hours)?;

    // Store session in Redis
    let ttl = state.config.jwt_expiry_hours * 3600;
    let session_k = session_key(&user.id.to_string());
    let mut redis_conn = state.redis.clone();
    let _: redis::RedisResult<()> = redis_conn.set_ex(&session_k, &jti, ttl).await;

    Ok(Json(AuthResponse {
        token,
        user: UserProfile {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            role: user.role,
        },
    }))
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let email = payload.email.trim().to_lowercase();

    // Enforce @dpu.ac.th domain
    if !email.ends_with("@dpu.ac.th") {
        return Err(AppError::Auth(
            "กรุณาใช้อีเมลของมหาวิทยาลัย (@dpu.ac.th) เท่านั้น".into(),
        ));
    }

    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(&email)
        .fetch_optional(&state.db)
        .await?;

    let user = user.ok_or_else(|| AppError::Auth("อีเมลหรือรหัสผ่านไม่ถูกต้อง".into()))?;

    let valid = verify(&payload.password, &user.password_hash)
        .map_err(|_| AppError::Auth("อีเมลหรือรหัสผ่านไม่ถูกต้อง".into()))?;

    if !valid {
        return Err(AppError::Auth("อีเมลหรือรหัสผ่านไม่ถูกต้อง".into()));
    }

    let (token, jti) =
        issue_jwt(&user, &state.config.jwt_secret, state.config.jwt_expiry_hours)?;

    // Store session reference in Redis
    let ttl = state.config.jwt_expiry_hours * 3600;
    let session_k = session_key(&user.id.to_string());
    let mut redis_conn = state.redis.clone();
    let _: redis::RedisResult<()> = redis_conn.set_ex(&session_k, &jti, ttl).await;

    Ok(Json(AuthResponse {
        token,
        user: UserProfile {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            role: user.role,
        },
    }))
}

/// POST /api/auth/google
pub async fn google_login(
    State(state): State<AppState>,
    Json(payload): Json<GoogleLoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let mut final_email = String::new();
    let mut final_name = String::new();

    if let Some(credential) = &payload.credential {
        // Try verifying via Google API or decode JWT payload
        let client = reqwest::Client::new();
        let url = format!("https://oauth2.googleapis.com/tokeninfo?id_token={}", credential);
        
        if let Ok(resp) = client.get(&url).send().await {
            if let Ok(info) = resp.json::<GoogleTokenInfo>().await {
                if let Some(e) = info.email {
                    final_email = e;
                }
                if let Some(n) = info.name {
                    final_name = n;
                }
            }
        }

        // Fallback: decode JWT payload directly
        if final_email.is_empty() {
            let parts: Vec<&str> = credential.split('.').collect();
            if parts.len() >= 2 {
                if let Ok(decoded) = BASE64_STANDARD_NO_PAD.decode(parts[1]).or_else(|_| BASE64_URL_SAFE_NO_PAD.decode(parts[1])) {
                    if let Ok(val) = serde_json::from_slice::<serde_json::Value>(&decoded) {
                        if let Some(e) = val.get("email").and_then(|v| v.as_str()) {
                            final_email = e.to_string();
                        }
                        if let Some(n) = val.get("name").and_then(|v| v.as_str()) {
                            final_name = n.to_string();
                        }
                    }
                }
            }
        }
    }

    if final_email.is_empty() {
        if let Some(e) = &payload.email {
            final_email = e.clone();
        }
    }
    if final_name.is_empty() {
        if let Some(n) = &payload.name {
            final_name = n.clone();
        } else {
            final_name = "นักศึกษา DPU".to_string();
        }
    }

    let email = final_email.trim().to_lowercase();
    if email.is_empty() {
        return Err(AppError::Auth("ไม่พบข้อมูลอีเมลจาก Google".into()));
    }

    // Enforce @dpu.ac.th domain
    if !email.ends_with("@dpu.ac.th") {
        return Err(AppError::Auth(
            "กรุณาใช้บัญชี Google ของมหาวิทยาลัย (@dpu.ac.th) เท่านั้น".into(),
        ));
    }

    // Check if user exists
    let existing_user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE email = $1")
        .bind(&email)
        .fetch_optional(&state.db)
        .await?;

    let user: User = match existing_user {
        Some(u) => u,
        None => {
            // Auto create new member user
            let dummy_pass = Uuid::new_v4().to_string();
            let password_hash = hash(&dummy_pass, DEFAULT_COST)
                .map_err(|e| AppError::Internal(format!("bcrypt error: {e}")))?;

            sqlx::query_as(
                r#"
                INSERT INTO users (email, password_hash, display_name, role)
                VALUES ($1, $2, $3, 'member')
                RETURNING *
                "#,
            )
            .bind(&email)
            .bind(&password_hash)
            .bind(&final_name)
            .fetch_one(&state.db)
            .await?
        }
    };

    let (token, jti) = issue_jwt(&user, &state.config.jwt_secret, state.config.jwt_expiry_hours)?;

    // Store session in Redis
    let ttl = state.config.jwt_expiry_hours * 3600;
    let session_k = session_key(&user.id.to_string());
    let mut redis_conn = state.redis.clone();
    let _: redis::RedisResult<()> = redis_conn.set_ex(&session_k, &jti, ttl).await;

    Ok(Json(AuthResponse {
        token,
        user: UserProfile {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            role: user.role,
        },
    }))
}

/// POST /api/auth/logout
pub async fn logout(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> AppResult<Json<serde_json::Value>> {
    let ttl = state.config.jwt_expiry_hours * 3600;
    let blocklist_k = blocklist_key(&auth_user.jti);
    let mut redis_conn = state.redis.clone();
    let _: redis::RedisResult<()> = redis_conn.set_ex(&blocklist_k, "1", ttl).await;

    let session_k = session_key(&auth_user.id.to_string());
    let _: redis::RedisResult<()> = redis_conn.del(&session_k).await;

    Ok(Json(serde_json::json!({ "message": "Logged out successfully" })))
}

/// GET /api/auth/me
pub async fn me(
    State(state): State<AppState>,
    auth_user: AuthUser,
) -> AppResult<Json<UserProfile>> {
    let user: Option<User> = sqlx::query_as("SELECT * FROM users WHERE id = $1")
        .bind(auth_user.id)
        .fetch_optional(&state.db)
        .await?;

    let user = user.ok_or_else(|| AppError::NotFound("User not found".into()))?;

    Ok(Json(UserProfile {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
    }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn issue_jwt(user: &User, secret: &str, expiry_hours: u64) -> AppResult<(String, String)> {
    let jti = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp() as usize;
    let exp = now + (expiry_hours as usize * 3600);

    let claims = Claims {
        sub: user.id.to_string(),
        email: user.email.clone(),
        role: user.role.clone(),
        jti: jti.clone(),
        exp,
        iat: now,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("JWT signing error: {e}")))?;

    Ok((token, jti))
}
