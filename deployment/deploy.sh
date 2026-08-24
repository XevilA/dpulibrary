#!/usr/bin/env bash
# ==============================================================================
# eLib — Automated Production Deployment Script for dpulibrary.space
# Supports Ubuntu/Debian/Rocky Linux VPS with Docker & Coolify
# ==============================================================================

set -e

DOMAIN="dpulibrary.space"
API_DOMAIN="api.dpulibrary.space"
PROJECT_DIR="/var/www/dpulibrary"

echo "=========================================================="
echo "🚀 Starting Deployment for DPU E-Library ($DOMAIN)"
echo "=========================================================="

# 1. Update system packages & ensure Docker is installed
echo "📦 Checking prerequisites (Docker, Docker Compose, Git, Nginx, Certbot)..."
if ! command -v docker &> /dev/null; then
    echo "⚙️ Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "⚙️ Installing Docker Compose plugin..."
    apt-get update && apt-get install -y docker-compose-plugin git curl
fi

# 2. Clone or pull latest code
mkdir -p "$PROJECT_DIR"
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "🔄 Pulling latest changes from GitHub..."
    cd "$PROJECT_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/XevilA/dpulibrary.git "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# 3. Create production .env file
echo "🔐 Configuring production environment variables..."
cat << 'EOF' > "$PROJECT_DIR/.env"
POSTGRES_USER=elib
POSTGRES_PASSWORD=elib_secret_super_pass_2026
POSTGRES_DB=elib_db
DATABASE_URL=postgres://elib:elib_secret_super_pass_2026@postgres:5432/elib_db
REDIS_URL=redis://redis:6379
JWT_SECRET=dpu_library_super_secret_jwt_key_2026_production
JWT_EXPIRY_HOURS=24
SERVER_HOST=0.0.0.0
SERVER_PORT=3000
ALLOWED_ORIGINS=https://dpulibrary.space,https://www.dpulibrary.space,https://api.dpulibrary.space
RUST_LOG=info
EOF

# 4. Start Database & Backend Services via Docker Compose
echo "🐳 Starting PostgreSQL, Redis, and Backend..."
docker compose down || true
docker compose up -d --build postgres redis backend

# 5. Verify Backend Health
echo "⏳ Waiting for backend to become healthy..."
sleep 5
for i in {1..12}; do
    if curl -s http://127.0.0.1:3000/health | grep -q "healthy"; then
        echo "✅ Backend is healthy and running on port 3000!"
        break
    fi
    echo "Waiting for services... ($i/12)"
    sleep 3
done

echo "=========================================================="
echo "🎉 Deployment Completed Successfully!"
echo "📡 Backend API: http://localhost:3000"
echo "🌐 For Coolify: Point domain to port 3000"
echo "=========================================================="
