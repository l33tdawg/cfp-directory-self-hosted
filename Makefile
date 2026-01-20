# =============================================================================
# CFP Directory Self-Hosted - Makefile
# =============================================================================
# Common commands for development and deployment
# =============================================================================

.PHONY: help install dev build start stop logs shell db-shell backup restore clean test lint

# Default target
help:
	@echo "CFP Directory Self-Hosted - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Start development server"
	@echo "  make test        - Run tests"
	@echo "  make lint        - Run linter"
	@echo "  make build       - Build for production"
	@echo ""
	@echo "Docker (Production):"
	@echo "  make start       - Start Docker containers"
	@echo "  make stop        - Stop Docker containers"
	@echo "  make logs        - View container logs"
	@echo "  make shell       - Open shell in app container"
	@echo "  make db-shell    - Open PostgreSQL shell"
	@echo ""
	@echo "Docker (Development):"
	@echo "  make dev-docker  - Start development containers"
	@echo ""
	@echo "Maintenance:"
	@echo "  make backup      - Create backup"
	@echo "  make restore     - Restore from backup (BACKUP=path)"
	@echo "  make clean       - Remove containers and volumes"
	@echo "  make prune       - Remove unused Docker resources"

# =============================================================================
# Development Commands
# =============================================================================

install:
	npm install

dev:
	npm run dev

test:
	npm test

lint:
	npm run lint

build:
	npm run build

# =============================================================================
# Docker Commands
# =============================================================================

start:
	docker compose up -d
	@echo ""
	@echo "✨ CFP Directory is starting..."
	@echo "   Access at: http://localhost:3000"
	@echo "   Logs: make logs"

stop:
	docker compose down

logs:
	docker compose logs -f

shell:
	docker exec -it cfp-app sh

db-shell:
	docker exec -it cfp-db psql -U cfp -d cfp

dev-docker:
	docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up

# =============================================================================
# Backup Commands
# =============================================================================

backup:
	./scripts/backup.sh

restore:
ifndef BACKUP
	$(error BACKUP is not set. Usage: make restore BACKUP=./backups/backup.tar.gz)
endif
	./scripts/restore.sh $(BACKUP)

# =============================================================================
# Cleanup Commands
# =============================================================================

clean:
	docker compose down -v
	@echo "✨ Removed containers and volumes"

prune:
	docker system prune -f
	@echo "✨ Cleaned up unused Docker resources"
