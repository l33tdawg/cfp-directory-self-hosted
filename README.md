# CFP Directory Self-Hosted

Open-source Call for Papers (CFP) management platform. Run your own CFP system with optional federation to [cfp.directory](https://cfp.directory).

## Features

### Core Features (Free & Open Source)

- **Event Management** - Create and manage multiple events with customizable CFP settings
- **Submission System** - Accept talk proposals with materials, co-speakers, and custom fields
- **Review System** - Assign reviewers, score submissions, and collaborate on decisions
- **Messaging** - Communicate with speakers about their submissions
- **User Management** - Role-based access (Admin, Organizer, Reviewer, Speaker)
- **Email Notifications** - SMTP-based notifications for submissions and status changes

### Federation Features (Requires License)

- Connect your events to cfp.directory's speaker network
- Speakers on cfp.directory can submit to your events
- Bidirectional messaging between platforms
- Automatic speaker profile sync

## Quick Start

### Using Docker (Recommended)

The fastest way to get started is with Docker:

```bash
# 1. Clone the repository
git clone https://github.com/l33tdawg/cfp-directory-self-hosted.git
cd cfp-directory-self-hosted

# 2. Copy environment configuration
cp .env.example .env

# 3. Generate a secure secret and update .env
#    On Linux/Mac:
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env
#    Or manually edit .env and set a strong random string

# 4. Set a secure database password in .env
#    Edit .env and change DB_PASSWORD=changeme to something secure

# 5. Start the services
docker compose up -d

# 6. Check the logs
docker compose logs -f app

# 7. Access at http://localhost:3000
#    The first user to register becomes admin!
```

#### Using Make (Alternative)

If you have `make` installed, you can use the Makefile shortcuts:

```bash
# Start containers
make start

# View logs
make logs

# Stop containers
make stop

# Create backup
make backup

# See all commands
make help
```

### Manual Installation (Development)

For local development without Docker:

```bash
# 1. Clone the repository
git clone https://github.com/l33tdawg/cfp-directory-self-hosted.git
cd cfp-directory-self-hosted

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# 4. Generate Prisma client
npx prisma generate

# 5. Run database migrations
npx prisma migrate deploy

# 6. Start the development server
npm run dev

# Access at http://localhost:3000
```

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/cfp` |
| `NEXTAUTH_URL` | Your application URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for session encryption (generate with `openssl rand -base64 32`) | `your-secret-here` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_NAME` | Your CFP platform name | `CFP System` |
| `APP_URL` | Public URL for emails and links | `http://localhost:3000` |
| `DB_PASSWORD` | Database password (Docker) | `changeme` |
| `MAX_FILE_SIZE_MB` | Maximum upload file size | `100` |

### Email Configuration (Optional)

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password or app password | `your-app-password` |
| `SMTP_SECURE` | Use TLS | `false` |
| `EMAIL_FROM` | Default sender address | `noreply@example.com` |

### Federation Configuration (Optional)

| Variable | Description |
|----------|-------------|
| `FEDERATION_LICENSE_KEY` | License key from cfp.directory |
| `CFP_DIRECTORY_API_URL` | Federation API URL (default: `https://cfp.directory/api/federation/v1`) |

## Docker Commands

```bash
# Start services
docker compose up -d

# View logs
docker compose logs -f

# View app logs only
docker compose logs -f app

# Stop services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d

# Shell into app container
docker exec -it cfp-app sh

# Shell into database
docker exec -it cfp-db psql -U cfp -d cfp
```

## Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build for production
npm run build
```

### Development with Docker

For development using Docker with hot-reloading:

```bash
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up
```

This includes:
- Hot-reloading of source files
- Exposed database port (5432)
- Adminer database UI at http://localhost:8080

## Project Structure

```
cfp-directory-self-hosted/
├── docker/                    # Docker configuration
│   ├── Dockerfile             # Multi-stage production build
│   ├── docker-compose.yml     # Production compose file
│   └── docker-compose.dev.yml # Development overrides
├── prisma/                    # Database schema and migrations
│   └── schema.prisma          # Prisma schema
├── scripts/                   # Utility scripts
│   ├── backup.sh              # Database and uploads backup
│   └── restore.sh             # Restore from backup
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Dashboard pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui components
│   │   ├── auth/              # Auth components
│   │   └── events/            # Event components
│   ├── lib/                   # Utilities and services
│   │   ├── auth/              # NextAuth.js config
│   │   ├── db/                # Prisma client
│   │   ├── email/             # Email service
│   │   ├── storage/           # File storage
│   │   └── validations/       # Zod schemas
│   └── hooks/                 # React hooks
├── docker-compose.yml         # Root compose file
├── Makefile                   # Make shortcuts
└── .env.example               # Environment template
```

## Health Checks

The application exposes a health endpoint at `/api/health`:

```bash
# Basic health check
curl http://localhost:3000/api/health

# Detailed health check
curl http://localhost:3000/api/health?detailed=true
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "0.1.0",
  "environment": "production",
  "database": "connected"
}
```

## Backup & Restore

### Creating Backups

```bash
# Using the script
./scripts/backup.sh

# Using Make
make backup

# Specify backup directory
./scripts/backup.sh /path/to/backups
```

Backups include:
- PostgreSQL database dump (both custom and SQL formats)
- Uploaded files
- Metadata (timestamp, version)

### Restoring Backups

```bash
# Using the script
./scripts/restore.sh ./backups/cfp-backup-20240101_120000.tar.gz

# Using Make
make restore BACKUP=./backups/cfp-backup-20240101_120000.tar.gz
```

### Automated Backups

For production, set up a cron job:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/cfp-directory-self-hosted/scripts/backup.sh /path/to/backups
```

## Federation

Federation allows your self-hosted instance to connect with cfp.directory's speaker network.

### Getting a License

1. Visit [cfp.directory/dashboard/settings/federation](https://cfp.directory/dashboard/settings/federation)
2. Choose a plan (Starter, Professional, or Enterprise)
3. Copy your license key to your `.env` file as `FEDERATION_LICENSE_KEY`

### What Federation Enables

- Your events appear in cfp.directory's federated events directory
- Speakers on cfp.directory can submit to your events with one click
- Speaker profiles are synced automatically (with consent)
- Submission status updates are sent back to speakers
- Bidirectional messaging between organizers and speakers

## Upgrading

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker compose build --no-cache
docker compose up -d

# Or for manual installation
npm install
npx prisma migrate deploy
npm run build
```

## Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs app

# Common issues:
# - NEXTAUTH_SECRET not set
# - Database not ready (wait a few seconds)
# - Port 3000 already in use
```

### Database connection issues

```bash
# Check database is running
docker compose ps

# Check database logs
docker compose logs db

# Test connection
docker exec -it cfp-db psql -U cfp -d cfp -c "SELECT 1"
```

### Reset everything

```bash
# WARNING: This deletes all data!
docker compose down -v
docker compose up -d
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

**Attribution Requirement:** You must display "Powered by CFP Directory" with a link to https://cfp.directory in the footer of all public-facing pages. This requirement can be removed with a commercial license.

## Support

- **Documentation:** [docs.cfp.directory/self-hosted](https://docs.cfp.directory/self-hosted)
- **Issues:** [GitHub Issues](https://github.com/l33tdawg/cfp-directory-self-hosted/issues)
- **Community:** [Discord](https://discord.gg/cfp-directory)

---

Powered by [CFP Directory](https://cfp.directory)
