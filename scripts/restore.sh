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
echo ""
echo "Backup file: ${BACKUP_FILE}"
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read -r

# Create temp directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

echo ""
echo "📦 Extracting backup..."
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the backup directory (handle different naming)
BACKUP_DIR=$(ls -d ${TEMP_DIR}/*/ 2>/dev/null | head -1)

if [ -z "${BACKUP_DIR}" ]; then
    echo "❌ Invalid backup archive"
    exit 1
fi

# Show metadata if available
if [ -f "${BACKUP_DIR}/metadata.json" ]; then
    echo "📋 Backup metadata:"
    cat "${BACKUP_DIR}/metadata.json"
    echo ""
fi

# Detect environment (Docker or local)
DOCKER_MODE=false
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "cfp-db"; then
    DOCKER_MODE=true
fi

# Restore database
echo "💾 Restoring database..."
if [ "$DOCKER_MODE" = true ]; then
    echo "   Using Docker database container..."
    
    # Prefer custom format if available
    if [ -f "${BACKUP_DIR}/database.dump" ]; then
        # Drop and recreate database for clean restore
        docker exec cfp-db psql -U cfp -d postgres -c "DROP DATABASE IF EXISTS cfp;"
        docker exec cfp-db psql -U cfp -d postgres -c "CREATE DATABASE cfp;"
        docker exec -i cfp-db pg_restore -U cfp -d cfp --no-owner < "${BACKUP_DIR}/database.dump"
    elif [ -f "${BACKUP_DIR}/database.sql" ]; then
        docker exec -i cfp-db psql -U cfp -d cfp < "${BACKUP_DIR}/database.sql"
    else
        echo "⚠️  No database backup found in archive"
    fi
else
    if [ -z "${DATABASE_URL}" ]; then
        echo "❌ DATABASE_URL environment variable not set"
        exit 1
    fi
    echo "   Using local database connection..."
    
    if [ -f "${BACKUP_DIR}/database.dump" ]; then
        pg_restore "${DATABASE_URL}" --no-owner < "${BACKUP_DIR}/database.dump"
    elif [ -f "${BACKUP_DIR}/database.sql" ]; then
        psql "${DATABASE_URL}" < "${BACKUP_DIR}/database.sql"
    else
        echo "⚠️  No database backup found in archive"
    fi
fi
echo "✅ Database restored"

# Restore uploads
echo "📁 Restoring uploads..."
if [ -f "${BACKUP_DIR}/uploads.tar" ]; then
    if [ "$DOCKER_MODE" = true ]; then
        # Restore to Docker volume
        docker run --rm -v cfp-uploads:/data -v "$(pwd)/${BACKUP_DIR}":/backup alpine \
            sh -c "rm -rf /data/* && cd /data && tar xf /backup/uploads.tar"
        echo "✅ Uploads restored (to Docker volume)"
    else
        mkdir -p ./uploads
        rm -rf ./uploads/*
        tar xf "${BACKUP_DIR}/uploads.tar" -C ./uploads
        echo "✅ Uploads restored"
    fi
elif [ -d "${BACKUP_DIR}/uploads" ]; then
    # Legacy backup format
    rm -rf ./uploads
    cp -r "${BACKUP_DIR}/uploads" ./uploads
    echo "✅ Uploads restored (legacy format)"
else
    echo "⚠️  No uploads backup found in archive"
fi

echo ""
echo "✨ Restore complete!"
echo ""
if [ "$DOCKER_MODE" = true ]; then
    echo "Restart the application to apply changes:"
    echo "  docker compose restart app"
else
    echo "Note: You may need to restart the application for changes to take effect."
fi
