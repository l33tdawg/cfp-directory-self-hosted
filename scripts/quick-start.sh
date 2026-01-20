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
    DB_PASSWORD=$(openssl rand -base64 16 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 16 || head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)
    CRON_SECRET=$(openssl rand -base64 24 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 24 || head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 24)
    
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

# Database (auto-generated - keep secure!)
DB_PASSWORD=${DB_PASSWORD}

# File uploads
MAX_FILE_SIZE_MB=100

# Federation
CFP_DIRECTORY_API_URL=https://cfp.directory/api/federation/v1

# Security
CRON_SECRET=${CRON_SECRET}

# Email (configure for notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_SECURE=false
# EMAIL_FROM=noreply@example.com
EOF
    
    echo -e "${GREEN}✓${NC} Created .env with secure defaults"
else
    echo -e "${YELLOW}⚠${NC} Using existing .env file"
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
echo -e "  ${BOLD}Open in your browser:${NC}  ${CYAN}http://localhost:3000${NC}"
echo ""
echo "  Register the first account to become admin."
echo ""
echo -e "  ${BOLD}Commands:${NC}"
echo "    docker compose logs -f     - View logs"
echo "    docker compose stop        - Stop containers"
echo "    docker compose start       - Start containers"
echo "    make help                  - Show all commands"
echo ""
echo -e "  ${BOLD}For interactive setup with more options:${NC}"
echo "    ./scripts/setup.sh"
echo ""
