# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-01-23

### Added

#### Core Features
- Event management (create, edit, publish events)
- CFP settings (open/close dates, descriptions)
- Event tracks and session formats
- Submission system for speakers
- Review system with scoring, notes, and recommendations
- Review team management (lead reviewers and reviewers)
- Bidirectional messaging between organizers and speakers
- Role-based access control (Admin, Organizer, Reviewer, Speaker, User)
- Public events listing page for browsing open CFPs
- Database seed script for development and testing

#### User Management
- User invitation system with email invites
- Pending invitations management with resend capability
- Activity logging for audit trails
- PII encryption at rest for sensitive data

#### Authentication
- NextAuth.js integration with credentials provider
- Password-based authentication with bcrypt
- Password reset via email
- Email verification for new users
- First user automatically becomes admin
- Optional OAuth providers (documented, not enabled by default)

#### Email System
- SMTP-based email service
- Customizable email templates for:
  - Welcome emails
  - Password reset
  - Email verification
  - User invitations
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
- API rate limiting for security
- GitHub Actions CI/CD workflow

#### Developer Experience
- TypeScript throughout
- Vitest testing framework
- Playwright E2E testing
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
- PII encryption using AES-256-GCM

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
| 1.0.x       | v1          | Initial public release |

[Unreleased]: https://github.com/l33tdawg/cfp-directory-self-hosted/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/l33tdawg/cfp-directory-self-hosted/releases/tag/v1.0.0
