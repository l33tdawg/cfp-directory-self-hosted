# CFP Directory Self-Hosted

Open-source Call for Papers (CFP) management platform. Run your own CFP system with optional federation to [cfp.directory](https://cfp.directory).

## Features

### Core Features (Free & Open Source)

- **Event Management** - Create and manage multiple events with customizable CFP settings
- **Submission System** - Accept talk proposals with materials, co-speakers, and custom fields
- **Review System** - Assign reviewers, score submissions, and collaborate on decisions
- **Messaging** - Communicate with speakers about their submissions
- **User Management** - Role-based access (Admin, Organizer, Reviewer, Speaker)

### Federation Features (Requires License)

- Connect your events to cfp.directory's speaker network
- Speakers on cfp.directory can submit to your events
- Bidirectional messaging between platforms
- Automatic speaker profile sync

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/cfp-directory/cfp-directory-self-hosted.git
cd cfp-directory-self-hosted

# Copy environment configuration
cp .env.example .env
# Edit .env with your values (especially NEXTAUTH_SECRET and DB_PASSWORD)

# Start the services
docker compose up -d

# Access at http://localhost:3000
# First user to register becomes admin
```

### Manual Installation

```bash
# Clone the repository
git clone https://github.com/cfp-directory/cfp-directory-self-hosted.git
cd cfp-directory-self-hosted

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env

# Set up the database
npx prisma migrate deploy
npx prisma db seed

# Start the development server
npm run dev
```

## Configuration

See `.env.example` for all configuration options:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_URL` | Yes | Your application URL |
| `NEXTAUTH_SECRET` | Yes | Secret for session encryption |
| `SMTP_*` | No | Email configuration for notifications |
| `FEDERATION_LICENSE_KEY` | No | License key for federation features |

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

# Build for production
npm run build
```

## Project Structure

```
cfp-directory-self-hosted/
├── docker/              # Docker configuration
├── prisma/              # Database schema and migrations
├── scripts/             # Utility scripts (backup, restore)
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # React components
│   ├── lib/             # Utilities and services
│   │   ├── auth/        # Authentication (NextAuth.js)
│   │   ├── db/          # Database utilities
│   │   ├── email/       # Email service
│   │   ├── federation/  # Federation module (license-gated)
│   │   └── storage/     # File storage provider
│   ├── hooks/           # React hooks
│   └── types/           # TypeScript types
└── uploads/             # User uploaded files
```

## Federation

Federation allows your self-hosted instance to connect with cfp.directory's speaker network.

### Getting a License

1. Visit [cfp.directory/dashboard/settings/federation](https://cfp.directory/dashboard/settings/federation)
2. Choose a plan (Starter, Professional, or Enterprise)
3. Copy your license key to your `.env` file

### What Federation Enables

- Your events appear in cfp.directory's federated events directory
- Speakers on cfp.directory can submit to your events with one click
- Speaker profiles are synced automatically (with consent)
- Submission status updates are sent back to speakers
- Bidirectional messaging between organizers and speakers

## Backup & Restore

```bash
# Create a backup
./scripts/backup.sh

# Restore from backup
./scripts/restore.sh ./backups/backup-2024-01-01.tar.gz
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

**Attribution Requirement:** You must display "Powered by CFP Directory" with a link to https://cfp.directory in the footer of all public-facing pages. This requirement can be removed with a commercial license.

## Support

- **Documentation:** [docs.cfp.directory/self-hosted](https://docs.cfp.directory/self-hosted)
- **Issues:** [GitHub Issues](https://github.com/cfp-directory/cfp-directory-self-hosted/issues)
- **Community:** [Discord](https://discord.gg/cfp-directory)

---

Powered by [CFP Directory](https://cfp.directory)
