#!/bin/bash
# =============================================================================
# CFP Directory Self-Hosted - Backup Script
# =============================================================================
# Creates a backup of the database and uploaded files
# Usage: ./backup.sh [backup_dir]
# =============================================================================

set -e

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="cfp-backup-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "📦 Creating backup: ${BACKUP_NAME}"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Backup database
echo "💾 Backing up database..."
if [ -f "docker-compose.yml" ] || [ -f "docker/docker-compose.yml" ]; then
    # Running with Docker
    docker exec cfp-db pg_dump -U cfp -d cfp > "${BACKUP_PATH}/database.sql"
else
    # Running locally
    pg_dump "${DATABASE_URL}" > "${BACKUP_PATH}/database.sql"
fi
echo "✅ Database backup complete"

# Backup uploads
echo "📁 Backing up uploads..."
if [ -d "./uploads" ]; then
    cp -r ./uploads "${BACKUP_PATH}/uploads"
    echo "✅ Uploads backup complete"
else
    echo "⚠️  No uploads directory found, skipping"
fi

# Create compressed archive
echo "🗜️  Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

echo ""
echo "✨ Backup complete: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""
echo "To restore this backup, run:"
echo "  ./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
