# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Database seed script for development and testing
- Public events listing page for browsing open CFPs
- API rate limiting for security
- GitHub Actions CI/CD workflow

## [0.1.0] - 2025-01-20

### Added

#### Core Features
- Event management (create, edit, publish events)
- CFP settings (open/close dates, descriptions)
- Event tracks and session formats
- Submission system for speakers
- Review system with scoring, notes, and recommendations
- Review team management (lead reviewers and reviewers)
- Bidirectional messaging between organizers and speakers
- Role-based access control (Admin, Organizer, Reviewer, User)

#### Authentication
- NextAuth.js integration with credentials provider
- Password-based authentication with bcrypt
- Password reset via email
- First user automatically becomes admin
- Optional OAuth providers (documented, not enabled by default)

#### Email System
- SMTP-based email service
- Email templates for:
  - Welcome emails
  - Password reset
  - Submission confirmation
  - Status updates (accepted, rejected, waitlisted)
  - New message notifications
  - Review team invitations
  - Event published notifications

#### Federation (Optional)
- License validation with cfp.directory
- Event registration for federation
- Heartbeat service with stats reporting
- Speaker consent handling
- Profile sync from cfp.directory
- Bidirectional webhook system:
  - Outgoing: submission.created, status_updated, message_sent, message_read
  - Incoming: message replies, consent revocations
- HMAC-SHA256 webhook signing

#### Infrastructure
- Docker support with multi-stage build
- Docker Compose for easy deployment
- PostgreSQL database with Prisma ORM
- File upload with local storage
- Health check endpoint
- Backup and restore scripts

#### Developer Experience
- TypeScript throughout
- Vitest testing framework
- ESLint configuration
- Comprehensive README
- Contributing guidelines
- Apache 2.0 license with attribution requirement

### Security
- Password hashing with bcrypt
- CSRF protection via NextAuth
- Input validation with Zod
- Rate limiting for API endpoints
- Webhook signature verification

---

## Version History

### Versioning Scheme

This project uses [Semantic Versioning](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: New functionality (backwards-compatible)
- **PATCH** version: Bug fixes (backwards-compatible)

### Pre-release Versions

- `x.y.z-alpha.n` - Alpha releases (unstable, for testing)
- `x.y.z-beta.n` - Beta releases (feature complete, may have bugs)
- `x.y.z-rc.n` - Release candidates (ready for final testing)

### Federation API Compatibility

The federation API version is tracked separately:

| App Version | API Version | Notes |
|-------------|-------------|-------|
| 0.1.x       | v1          | Initial release |

[Unreleased]: https://github.com/l33tdawg/cfp-directory-self-hosted/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/l33tdawg/cfp-directory-self-hosted/releases/tag/v0.1.0
