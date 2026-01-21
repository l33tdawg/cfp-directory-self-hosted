#!/bin/bash
# =============================================================================
# CFP Directory Self-Hosted - Quick Start Script
# =============================================================================
# Fastest way to get running with default settings
# Usage: ./scripts/quick-start.sh
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}  ${BOLD}CFP Directory Self-Hosted - Quick Start${NC}                         ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$PROJECT_ROOT"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗${NC} Docker is required but not installed"
    echo "  Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}✗${NC} Docker daemon is not running"
    echo "  Please start Docker and try again"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker is available"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}✗${NC} Docker Compose v2 is required"
    echo "  Please update Docker or install docker-compose-plugin"
    exit 1
fi

echo -e "${GREEN}✓${NC} Docker Compose is available"
echo ""

# Generate .env if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${CYAN}▶${NC} Creating .env configuration..."
    
    # Generate secrets
    NEXTAUTH_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 16 || head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)
    CRON_SECRET=$(openssl rand -base64 24 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 24 || head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)
    SETUP_TOKEN=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | head -c 64)
    
    cat > .env << EOF
# CFP Directory Self-Hosted - Quick Start Configuration
# Generated on $(date)

# Application
APP_NAME="CFP Directory Self-Hosted"
APP_URL=http://localhost:3000
APP_PORT=3000

# Authentication (auto-generated - keep secure!)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# =============================================================================
# ENCRYPTION KEY - CRITICAL: BACKUP THIS KEY!
# =============================================================================
# This key encrypts all PII (Personally Identifiable Information) in the database.
# If you lose this key, encrypted data CANNOT be recovered!
# Store this key securely (password manager, secure vault, etc.)
# =============================================================================
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Database (auto-generated - keep secure!)
DB_PASSWORD=${DB_PASSWORD}

# File uploads
MAX_FILE_SIZE_MB=100

# Federation
CFP_DIRECTORY_API_URL=https://cfp.directory/api/federation/v1

# =============================================================================
# Security
# =============================================================================
# SETUP_TOKEN: Required for initial admin setup (prevents fresh-install takeover)
# Keep this secure - anyone with this token can create the first admin account
SETUP_TOKEN=${SETUP_TOKEN}

# CRON_SECRET: For authenticated cron/health endpoints
CRON_SECRET=${CRON_SECRET}

# Public signup is DISABLED by default for security
# Set to "true" only if you want anyone to register
ALLOW_PUBLIC_SIGNUP=false

# Only trust proxy headers if behind a properly configured reverse proxy
TRUST_PROXY_HEADERS=false
TRUSTED_PROXY_COUNT=1

# Email (configure for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_SECURE=false
# EMAIL_FROM=noreply@example.com
EOF
    
    echo -e "${GREEN}✓${NC} Created .env with secure defaults"
    
    # Store keys for display later
    SHOW_ENCRYPTION_KEY=true
    SHOW_SETUP_TOKEN=true
else
    echo -e "${YELLOW}⚠${NC} Using existing .env file"
    SHOW_ENCRYPTION_KEY=false
    SHOW_SETUP_TOKEN=false
    # Try to read SETUP_TOKEN from existing .env for display
    if grep -q "SETUP_TOKEN=" .env; then
        SETUP_TOKEN=$(grep "SETUP_TOKEN=" .env | cut -d'=' -f2)
    fi
fi

# Stop existing containers if running
if docker ps -q --filter "name=cfp-" | grep -q .; then
    echo ""
    echo -e "${CYAN}▶${NC} Stopping existing containers..."
    docker compose down
fi

# Build and start
echo ""
echo -e "${CYAN}▶${NC} Building and starting containers (this may take a few minutes)..."
echo ""

docker compose up -d --build

# Wait for app to be ready
echo ""
echo -e "${CYAN}▶${NC} Waiting for application to be ready..."
echo -n "   "

max_attempts=60
attempt=1
while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:3000/api/health 2>/dev/null | grep -q '"status":"healthy"'; then
        echo ""
        echo -e "${GREEN}✓${NC} Application is ready!"
        break
    fi
    echo -n "."
    sleep 2
    ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
    echo ""
    echo -e "${YELLOW}⚠${NC} Application may still be starting..."
    echo "   Check logs with: docker compose logs -f app"
fi

# Success message
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${BOLD}Setup Complete!${NC}                                                  ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Display encryption key warning for new installations
if [ "$SHOW_ENCRYPTION_KEY" = "true" ]; then
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║${NC}  ${BOLD}⚠️  CRITICAL: SAVE YOUR ENCRYPTION KEY!${NC}                         ${RED}║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Your data is encrypted with this key. ${BOLD}If lost, data CANNOT be recovered!${NC}"
    echo ""
    echo -e "  ${BOLD}ENCRYPTION_KEY:${NC}"
    echo -e "  ${CYAN}${ENCRYPTION_KEY}${NC}"
    echo ""
    echo -e "  ${YELLOW}→ Copy this key NOW and store it securely (password manager, vault, etc.)${NC}"
    echo -e "  ${YELLOW}→ The key is also saved in your .env file${NC}"
    echo ""
    echo -e "────────────────────────────────────────────────────────────────────"
    echo ""
fi

# Display SETUP_TOKEN for new installations
if [ "$SHOW_SETUP_TOKEN" = "true" ] || [ -n "$SETUP_TOKEN" ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║${NC}  ${BOLD}🔐 SETUP TOKEN (Required for Admin Setup)${NC}                       ${YELLOW}║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${BOLD}SETUP_TOKEN:${NC}"
    echo -e "  ${CYAN}${SETUP_TOKEN}${NC}"
    echo ""
    echo -e "  ${YELLOW}→ You'll need this token to complete setup at /setup${NC}"
    echo -e "  ${YELLOW}→ The token is also saved in your .env file${NC}"
    echo ""
    echo -e "────────────────────────────────────────────────────────────────────"
    echo ""
fi

echo -e "  ${BOLD}Complete Setup:${NC}"
echo ""
echo -e "  1. Open ${CYAN}http://localhost:3000/setup${NC} in your browser"
echo -e "  2. Enter the SETUP_TOKEN shown above when prompted"
echo "  3. Create your admin account and configure site settings"
echo ""
echo -e "  ${BOLD}Note:${NC} Public registration is disabled by default for security."
echo "        The first admin must be created via the setup wizard."
echo ""
echo -e "  ${BOLD}Want demo data?${NC} Load sample events, users, and submissions:"
echo "    make seed                  - Full demo data (users, events, submissions)"
echo ""
echo -e "  ${BOLD}Commands:${NC}"
echo "    docker compose logs -f     - View logs"
echo "    docker compose stop        - Stop containers"
echo "    docker compose start       - Start containers"
echo "    make help                  - Show all commands"
echo ""
