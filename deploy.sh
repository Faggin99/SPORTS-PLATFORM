#!/bin/bash
# =============================================================
# Sports Platform - VPS Deployment Script
# Run this on the VPS as root or deploy user
# =============================================================

set -e

echo "=========================================="
echo "  Sports Platform - VPS Deployment"
echo "=========================================="

# Configuration
APP_DIR="/home/deploy/sports-platform"
UPLOAD_DIR="$APP_DIR/uploads"
BACKEND_DIR="$APP_DIR/backend-node"
FRONTEND_DIR="$APP_DIR/frontend"
DB_NAME="sports_platform"
DB_USER="sports_admin"
DB_PASS="${DB_PASSWORD:-CHANGE_ME_NOW}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 32)}"
DOMAIN="tactiplan.faggin.com.br"

# ==========================================
# STEP 1: System Dependencies
# ==========================================
echo ""
echo "[1/8] Installing system dependencies..."

apt update && apt upgrade -y

# Node.js 20 LTS
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# PostgreSQL 16
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
fi

# Certbot
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

apt install -y git curl unzip build-essential

echo "  Dependencies installed."

# ==========================================
# STEP 2: Create deploy user if not exists
# ==========================================
echo ""
echo "[2/8] Setting up deploy user..."

if ! id "deploy" &>/dev/null; then
    adduser --disabled-password --gecos "" deploy
    usermod -aG sudo deploy
fi

mkdir -p $APP_DIR
mkdir -p $UPLOAD_DIR/profile-photos
mkdir -p $UPLOAD_DIR/club-logos
mkdir -p $UPLOAD_DIR/session-files

chown -R deploy:deploy $APP_DIR $UPLOAD_DIR

echo "  Deploy user ready."

# ==========================================
# STEP 3: PostgreSQL Setup
# ==========================================
echo ""
echo "[3/8] Configuring PostgreSQL..."

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";"

echo "  PostgreSQL configured."

# ==========================================
# STEP 4: Run Migrations
# ==========================================
echo ""
echo "[4/8] Running database migrations..."

cd $BACKEND_DIR

# Create .env if not exists
if [ ! -f .env ]; then
    cat > .env << ENVEOF
PORT=3001
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
UPLOAD_DIR=$UPLOAD_DIR
CORS_ORIGIN=https://$DOMAIN
NODE_ENV=production
ENVEOF
    chown deploy:deploy .env
    echo "  .env created"
fi

npm install

# Run migrations
node scripts/run-migrations.js

echo "  Migrations completed."

# ==========================================
# STEP 5: Import Data (if not already done)
# ==========================================
echo ""
echo "[5/8] Checking data import..."

USER_COUNT=$(sudo -u postgres psql -t -d $DB_NAME -c "SELECT COUNT(*) FROM users;" 2>/dev/null | xargs)

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "  Importing data from Supabase export..."
    node scripts/import-data.js
    echo "  Data imported."
else
    echo "  Data already exists ($USER_COUNT users). Skipping import."
fi

# ==========================================
# STEP 6: Build Frontend
# ==========================================
echo ""
echo "[6/8] Building frontend..."

cd $FRONTEND_DIR

# Create .env for frontend build
cat > .env.production << ENVEOF
VITE_API_URL=https://$DOMAIN/api
VITE_APP_NAME=Sports Platform
VITE_APP_ENV=production
ENVEOF

npm install
npm run build

echo "  Frontend built."

# ==========================================
# STEP 7: Nginx + SSL
# ==========================================
echo ""
echo "[7/8] Configuring Nginx..."

cp $APP_DIR/nginx/tactiplan.conf /etc/nginx/sites-available/tactiplan
ln -sf /etc/nginx/sites-available/tactiplan /etc/nginx/sites-enabled/tactiplan
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# SSL (only if cert doesn't exist yet)
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "  Generating SSL certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@faggin.com.br
fi

echo "  Nginx configured."

# ==========================================
# STEP 8: Start API with PM2
# ==========================================
echo ""
echo "[8/8] Starting API with PM2..."

cd $BACKEND_DIR

pm2 delete sports-api 2>/dev/null || true
pm2 start server.js --name sports-api
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy 2>/dev/null || true

echo "  API running."

# ==========================================
# STEP 9: Firewall
# ==========================================
echo ""
echo "Configuring firewall..."

ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable 2>/dev/null || true

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  URL: https://$DOMAIN"
echo "  API: https://$DOMAIN/api"
echo ""
echo "  Useful commands:"
echo "    pm2 status          - Check API status"
echo "    pm2 logs sports-api - View API logs"
echo "    pm2 restart sports-api - Restart API"
echo ""
