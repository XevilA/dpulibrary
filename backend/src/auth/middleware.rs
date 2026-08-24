// src/auth/middleware.rs — JWT extraction and validation middleware
//
// Provides the `AuthUser` extractor. If a request carries a valid Bearer
// token that is NOT in the Redis blocklist, it yields a populated AuthUser.
// Otherwise it returns 401 Unauthorized.

use crate::{
    errors::AppError,
    models::Claims,
    redis_client::{blocklist_key},
    AppState,
};
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    RequestPartsExt,
};
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use redis::AsyncCommands;
use uuid::Uuid;

/// Extractor that validates a Bearer JWT and checks the Redis blocklist.
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub id: Uuid,
    pub email: String,
    pub role: String,
    pub jti: String,
}

#[async_trait]
impl FromRequestParts<AppState> for AuthUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        // ── 1. Extract Bearer token ──────────────────────────────────────────
        let TypedHeader(Authorization(bearer)) = parts
            .extract::<TypedHeader<Authorization<Bearer>>>()
            .await
            .map_err(|_| AppError::Auth("Missing or malformed Authorization header".into()))?;

        let token = bearer.token();

        // ── 2. Decode and verify JWT ─────────────────────────────────────────
        let decoding_key = DecodingKey::from_secret(state.config.jwt_secret.as_bytes());
        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data = decode::<Claims>(token, &decoding_key, &validation)
            .map_err(|e| AppError::Auth(format!("Invalid token: {e}")))?;

        let claims = token_data.claims;

        // ── 3. Check Redis blocklist (logout/revoke) ─────────────────────────
        let blocklist_k = blocklist_key(&claims.jti);
        let is_revoked: bool = {
            let mut redis_conn = state.redis.clone();
            redis_conn
                .exists::<_, bool>(&blocklist_k)
                .await
                .unwrap_or(false)
        };

        if is_revoked {
            return Err(AppError::Auth("Token has been revoked".into()));
        }

        // ── 4. Parse user ID ─────────────────────────────────────────────────
        let user_id = Uuid::parse_str(&claims.sub)
            .map_err(|_| AppError::Auth("Invalid user ID in token".into()))?;

        Ok(AuthUser {
            id: user_id,
            email: claims.email,
            role: claims.role,
            jti: claims.jti,
        })
    }
}

/// Optional extractor — succeeds even without a token (returns None)
pub struct OptionalAuthUser(pub Option<AuthUser>);

#[async_trait]
impl FromRequestParts<AppState> for OptionalAuthUser {
    type Rejection = (StatusCode, String);

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        match AuthUser::from_request_parts(parts, state).await {
            Ok(user) => Ok(OptionalAuthUser(Some(user))),
            Err(_) => Ok(OptionalAuthUser(None)),
        }
    }
}
