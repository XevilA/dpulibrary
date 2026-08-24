# eLib — E-Library Web Application

A modern, scalable e-library with JWT authentication, Redis caching, auto-expiring borrow logic, and a beautiful Thai-styled React frontend. Fully containerized.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 (TypeScript), Tailwind CSS (DPU Purple Theme), Lucide React, date-fns, Zustand |
| Backend | Rust, Axum, SQLx, Redis, Tokio, jsonwebtoken, bcrypt |
| Database | PostgreSQL 15 |
| Cache | Redis 7 (with AOF persistence) |
| DevOps | Docker Compose |

## Project Structure

```
elib/
├── docker-compose.yml          # Full infrastructure definition
├── .env.example                # Environment variables template
├── db/
│   └── init.sql                # Schema + 20 seed books
├── backend/                    # Rust / Axum backend
│   ├── Cargo.toml
│   ├── Dockerfile              # Multi-stage build
│   └── src/
│       ├── main.rs             # Server + Tokio worker spawn
│       ├── config.rs
│       ├── db.rs               # SQLx pool
│       ├── redis_client.rs     # Redis pool + cache helpers
│       ├── models.rs           # Shared structs
│       ├── errors.rs           # AppError → HTTP responses
│       ├── worker.rs           # Auto-expiration background worker
│       ├── auth/               # JWT auth
│       │   ├── handlers.rs     # Register, Login, Logout, Me
│       │   └── middleware.rs   # AuthUser extractor
│       └── books/
│           └── handlers.rs     # CRUD + Borrow + Return
└── frontend/                   # Vite + React frontend
    ├── src/
    │   ├── App.tsx             # Root component
    │   ├── api/client.ts       # Axios with JWT interceptor
    │   ├── store/authStore.ts  # Zustand auth state
    │   ├── hooks/useCountdown.ts
    │   ├── types/index.ts
    │   └── components/
    │       ├── Navbar.tsx
    │       ├── HeroBanner.tsx  # Auto-advance carousel
    │       ├── BookCard.tsx    # Dynamic color + countdown
    │       ├── BookGrid.tsx    # Filter chips + pagination
    │       ├── PopularBooks.tsx
    │       ├── LoginModal.tsx
    │       ├── CountdownBadge.tsx
    │       └── DarkModeToggle.tsx
    └── Dockerfile
```

## Quick Start

### 1. Clone and configure

```bash
cd elib
cp .env.example .env
# Edit .env with your secrets if needed
```

### 2. Start everything with Docker Compose

```bash
docker compose up --build
```

Services:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Health check**: http://localhost:3000/health

### 3. Test manually (no Docker)

**Backend** (requires PostgreSQL + Redis running):
```bash
cd backend
DATABASE_URL=postgres://elib:elib_secret@localhost:5432/elib_db \
REDIS_URL=redis://localhost:6379 \
cargo run
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Get JWT token |
| POST | `/api/auth/logout` | ✅ | Blocklist JWT in Redis |
| GET | `/api/auth/me` | ✅ | Get current user |

### Books
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/books` | ❌ | Paginated catalog (Redis cached) |
| GET | `/api/books/popular` | ❌ | Top 10 (Redis cached 5min) |
| GET | `/api/books/featured` | ❌ | Featured books for hero banner |
| GET | `/api/books/:id` | ❌ | Book detail |
| POST | `/api/books/:id/borrow` | ✅ | Borrow (sets expires_at = +1 min) |
| POST | `/api/books/:id/return` | ✅ | Return book |

## Core Architecture

### Auto-Expiration Worker (Rust + Tokio)
Located in [`backend/src/worker.rs`](backend/src/worker.rs).

```
Every 30 seconds:
  1. UPDATE books SET status='Available' WHERE expires_at < NOW()
  2. For each expired book: DEL book:{id}
  3. DEL books:catalog:*  (bust all catalog pages)
  4. DEL books:popular    (bust popular list)
```

### Redis Caching Strategy
| Key Pattern | TTL | Invalidated When |
|-------------|-----|-----------------|
| `books:catalog:{page}:{search}:{genre}` | 60s | Any borrow/return |
| `books:popular` | 300s | Any borrow/return |
| `book:{id}` | 120s | Borrow/return of that book |
| `session:{user_id}` | JWT TTL | Logout |
| `blocklist:{jti}` | JWT TTL | Set on logout |

### Borrow Countdown (React)
The `useCountdown` hook uses `date-fns.differenceInSeconds` in a `setInterval`
to tick every second. When `secondsLeft <= 0`, it calls `onExpire` which
triggers a re-fetch, syncing the UI with the backend's authoritative state.

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@elib.local` | `admin123` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://elib:elib_secret@postgres:5432/elib_db` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `JWT_SECRET` | ⚠️ Change this! | JWT signing secret |
| `JWT_EXPIRY_HOURS` | `24` | JWT lifetime in hours |
| `WORKER_INTERVAL_SECS` | `30` | Expiration worker poll interval |
