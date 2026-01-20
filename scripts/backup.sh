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
echo "   Backup directory: ${BACKUP_DIR}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Detect environment (Docker or local)
DOCKER_MODE=false
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "cfp-db"; then
    DOCKER_MODE=true
fi

# Backup database
echo "💾 Backing up database..."
if [ "$DOCKER_MODE" = true ]; then
    echo "   Using Docker database container..."
    docker exec cfp-db pg_dump -U cfp -d cfp --format=custom > "${BACKUP_PATH}/database.dump"
    # Also create a plain SQL backup for manual inspection
    docker exec cfp-db pg_dump -U cfp -d cfp > "${BACKUP_PATH}/database.sql"
else
    if [ -z "${DATABASE_URL}" ]; then
        echo "❌ DATABASE_URL environment variable not set"
        exit 1
    fi
    echo "   Using local database connection..."
    pg_dump "${DATABASE_URL}" --format=custom > "${BACKUP_PATH}/database.dump"
    pg_dump "${DATABASE_URL}" > "${BACKUP_PATH}/database.sql"
fi
echo "✅ Database backup complete"

# Backup uploads (from Docker volume or local directory)
echo "📁 Backing up uploads..."
if [ "$DOCKER_MODE" = true ]; then
    # Copy from Docker volume
    if docker volume inspect cfp-uploads >/dev/null 2>&1; then
        docker run --rm -v cfp-uploads:/data -v "$(pwd)/${BACKUP_PATH}":/backup alpine \
            sh -c "cd /data && tar cf /backup/uploads.tar ."
        echo "✅ Uploads backup complete (from Docker volume)"
    else
        echo "⚠️  No uploads volume found, skipping"
    fi
elif [ -d "./uploads" ]; then
    tar cf "${BACKUP_PATH}/uploads.tar" -C ./uploads .
    echo "✅ Uploads backup complete"
else
    echo "⚠️  No uploads directory found, skipping"
fi

# Create metadata file
echo "📝 Creating backup metadata..."
cat > "${BACKUP_PATH}/metadata.json" << EOF
{
  "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "timestamp": "${TIMESTAMP}",
  "docker_mode": ${DOCKER_MODE},
  "version": "$(cat package.json 2>/dev/null | grep '"version"' | cut -d'"' -f4 || echo 'unknown')"
}
EOF

# Create compressed archive
echo "🗜️  Compressing backup..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

# Calculate size
BACKUP_SIZE=$(ls -lh "${BACKUP_NAME}.tar.gz" | awk '{print $5}')

echo ""
echo "✨ Backup complete!"
echo "   File: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "   Size: ${BACKUP_SIZE}"
echo ""
echo "To restore this backup, run:"
echo "  ./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
