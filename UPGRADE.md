# Upgrade Guide

This document provides instructions for upgrading your CFP Directory Self-Hosted installation.

## General Upgrade Process

### Prerequisites

1. **Backup your data** before any upgrade:
   ```bash
   ./scripts/backup.sh
   # or with Make
   make backup
   ```

2. **Check the changelog** for breaking changes between your current version and the target version.

3. **Review environment variables** - new versions may require additional configuration.

### Docker Upgrade (Recommended)

```bash
# 1. Pull the latest changes
git pull origin main

# 2. Pull the latest Docker image (if using pre-built images)
docker compose pull

# 3. Rebuild the application
docker compose build --no-cache

# 4. Stop the current containers
docker compose down

# 5. Start with the new version
docker compose up -d

# 6. Check the logs
docker compose logs -f app

# 7. Verify the application is running
curl http://localhost:3000/api/health
```

### Manual Installation Upgrade

```bash
# 1. Pull the latest changes
git pull origin main

# 2. Install new dependencies
npm ci

# 3. Generate Prisma client
npx prisma generate

# 4. Run database migrations
npx prisma migrate deploy

# 5. Build the application
npm run build

# 6. Restart your process manager (pm2, systemd, etc.)
pm2 restart cfp-directory
# or
systemctl restart cfp-directory
```

---

## Version-Specific Instructions

### Upgrading to 0.2.x (Future)

_No breaking changes expected._

### Upgrading to 0.1.x

This is the initial release. No upgrade path needed.

---

## Database Migrations

### Automatic Migrations

Prisma handles database migrations automatically. When you run:

```bash
npx prisma migrate deploy
```

All pending migrations will be applied in order.

### Manual Migration Steps

If you need to run migrations manually:

```bash
# View pending migrations
npx prisma migrate status

# Generate a new migration (development only)
npx prisma migrate dev --name description_of_changes

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: destroys all data)
npx prisma migrate reset
```

### Migration Troubleshooting

**Migration failed:**
1. Check the error message
2. Review the migration file in `prisma/migrations/`
3. Fix any issues
4. Re-run `npx prisma migrate deploy`

**Schema drift:**
If your database schema doesn't match Prisma schema:
```bash
npx prisma db pull  # Update schema from database
npx prisma migrate dev --name fix_drift  # Create migration to fix
```

---

## Environment Changes

### New Variables by Version

#### 0.1.0 (Initial Release)

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your application URL
- `NEXTAUTH_SECRET` - Secret for session encryption

Optional:
- `APP_NAME` - Your platform name
- `APP_URL` - Public URL for links
- `SMTP_*` - Email configuration
- `FEDERATION_LICENSE_KEY` - For federation features

---

## Federation API Compatibility

The federation API is versioned separately. Check compatibility:

| Self-Hosted Version | API Version | cfp.directory Compatibility |
|---------------------|-------------|----------------------------|
| 0.1.x              | v1          | 1.0.0+                     |

### API Version Changes

**v1 (Initial)**
- License validation
- Event registration
- Heartbeat
- Speaker consent
- Bidirectional webhooks

---

## Rollback Instructions

### Docker Rollback

```bash
# Stop current version
docker compose down

# Checkout previous version
git checkout v0.1.0  # or whatever version you need

# Rebuild and start
docker compose build --no-cache
docker compose up -d
```

### Manual Rollback

```bash
# Checkout previous version
git checkout v0.1.0

# Install dependencies for that version
npm ci

# Restore database from backup
./scripts/restore.sh /path/to/backup.tar.gz

# Build and start
npm run build
npm start
```

### Database Rollback

Prisma doesn't support automatic rollbacks. To rollback:

1. Restore from backup
2. Or manually undo changes using SQL

```bash
# Restore from backup
./scripts/restore.sh /path/to/backup.tar.gz
```

---

## Health Checks After Upgrade

After upgrading, verify everything is working:

```bash
# Check application health
curl http://localhost:3000/api/health?detailed=true

# Expected response:
# {
#   "status": "healthy",
#   "version": "0.1.0",
#   "database": "connected"
# }

# Check federation status (if enabled)
curl http://localhost:3000/api/federation/status
```

---

## Getting Help

If you encounter issues during upgrade:

1. Check the [GitHub Issues](https://github.com/l33tdawg/cfp-directory-self-hosted/issues)
2. Review the [CHANGELOG.md](CHANGELOG.md) for breaking changes
3. Open a new issue with:
   - Your current version
   - Target version
   - Error messages
   - Environment details
