#!/bin/bash
# =============================================================================
# CFP Directory Self-Hosted - Restore Script
# =============================================================================
# Restores a backup created by backup.sh
# Usage: ./restore.sh <backup_file.tar.gz>
# =============================================================================

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup_file.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "⚠️  WARNING: This will overwrite your current database and uploads!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

echo "📦 Extracting backup..."
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the backup directory (handle different naming)
BACKUP_DIR=$(ls -d ${TEMP_DIR}/*/ 2>/dev/null | head -1)

if [ -z "${BACKUP_DIR}" ]; then
    echo "❌ Invalid backup archive"
    exit 1
fi

# Restore database
if [ -f "${BACKUP_DIR}/database.sql" ]; then
    echo "💾 Restoring database..."
    if [ -f "docker-compose.yml" ] || [ -f "docker/docker-compose.yml" ]; then
        # Running with Docker
        docker exec -i cfp-db psql -U cfp -d cfp < "${BACKUP_DIR}/database.sql"
    else
        # Running locally
        psql "${DATABASE_URL}" < "${BACKUP_DIR}/database.sql"
    fi
    echo "✅ Database restored"
else
    echo "⚠️  No database backup found in archive"
fi

# Restore uploads
if [ -d "${BACKUP_DIR}/uploads" ]; then
    echo "📁 Restoring uploads..."
    rm -rf ./uploads
    cp -r "${BACKUP_DIR}/uploads" ./uploads
    echo "✅ Uploads restored"
else
    echo "⚠️  No uploads backup found in archive"
fi

echo ""
echo "✨ Restore complete!"
echo ""
echo "Note: You may need to restart the application for changes to take effect."
