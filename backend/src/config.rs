// src/config.rs — Application configuration loaded from environment
use anyhow::Result;
use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub redis_url: String,
    pub jwt_secret: String,
    pub jwt_expiry_hours: u64,
    pub server_host: String,
    pub server_port: u16,
    pub worker_interval_secs: u64,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        Ok(Config {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://elib:elib_secret@localhost:5432/elib_db".into()),
            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "super_secret_jwt_key_change_in_production".into()),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .unwrap_or_else(|_| "24".into())
                .parse()
                .unwrap_or(24),
            server_host: env::var("SERVER_HOST")
                .unwrap_or_else(|_| "0.0.0.0".into()),
            server_port: env::var("SERVER_PORT")
                .unwrap_or_else(|_| "3000".into())
                .parse()
                .unwrap_or(3000),
            worker_interval_secs: env::var("WORKER_INTERVAL_SECS")
                .unwrap_or_else(|_| "30".into())
                .parse()
                .unwrap_or(30),
        })
    }
}
