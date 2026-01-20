# Security Documentation

This document describes the security measures implemented in CFP Directory Self-Hosted.

## Overview

The platform implements multiple layers of security:

1. **Authentication** - Secure user authentication with NextAuth.js
2. **Authorization** - Role-based access control (RBAC)
3. **Input Validation** - Schema-based validation with Zod
4. **Webhook Security** - HMAC-SHA256 signing and verification
5. **Rate Limiting** - Protection against abuse
6. **Security Headers** - Defense-in-depth HTTP headers

---

## Authentication

### Password Security

- **Hashing**: bcrypt with 12 salt rounds
- **Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

```typescript
// Password validation schema
z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
```

### Session Management

- **Strategy**: JWT (JSON Web Tokens)
- **Storage**: HTTP-only cookies
- **Expiry**: Configurable (default: 30 days)
- **Refresh**: Automatic token refresh

### First User Admin Pattern

The first user to register is automatically granted ADMIN role. This is by design for initial setup.

**Security Consideration**: Deploy with a secure first registration, then disable public registration if needed.

---

## Authorization (RBAC)

### Roles

| Role | Permissions |
|------|-------------|
| `USER` | Submit talks, view own submissions |
| `REVIEWER` | Review assigned submissions |
| `ORGANIZER` | Manage events, view all submissions |
| `ADMIN` | Full access including settings |

### Route Protection

Routes are protected by middleware:

```typescript
// Protected routes require authentication
const protectedRoutes = ['/dashboard', '/events', '/submissions'];

// Admin routes require ADMIN role
const adminRoutes = ['/admin'];
```

### API Authorization

All API endpoints verify user authentication and authorization:

```typescript
const { user, error } = await getAuthenticatedUser();
if (!user) return unauthorizedResponse();

// Check specific permissions
if (!canReviewEvent(user, eventId)) {
  return forbiddenResponse();
}
```

---

## Input Validation

### Schema-Based Validation

All inputs are validated using Zod schemas:

```typescript
const createSubmissionSchema = z.object({
  title: z.string().min(1).max(200),
  abstract: z.string().min(10).max(5000),
  // ...
});

// Parse and validate
const data = createSubmissionSchema.parse(body);
```

### Validation Features

- **Type coercion**: Automatic type conversion
- **Length limits**: Prevent oversized inputs
- **Format validation**: Email, URL, CUID validation
- **Enum validation**: Only allowed values accepted

### Security Patterns

- **Never trust client input** - Always validate server-side
- **Fail early** - Reject invalid input before processing
- **Clear error messages** - Without revealing system details

---

## Webhook Security

### Outgoing Webhooks (to cfp.directory)

All webhooks are signed with HMAC-SHA256:

```typescript
function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
}
```

Headers sent:
- `X-Webhook-Signature`: `sha256=<hex>`
- `X-Webhook-Timestamp`: Unix timestamp (milliseconds)
- `X-Webhook-Id`: Unique webhook ID

### Incoming Webhooks (from cfp.directory)

Verification process:

1. **Extract headers** - Signature, timestamp, webhook ID
2. **Validate timestamp** - Reject if >5 minutes old (replay protection)
3. **Verify signature** - Using timing-safe comparison
4. **Parse payload** - Validate JSON structure

```typescript
// Timing-safe comparison prevents timing attacks
return timingSafeEqual(
  Buffer.from(providedSignature, 'hex'),
  Buffer.from(expectedSignature, 'hex')
);
```

### Webhook Retry & Dead Letter Queue

Failed webhooks are:
1. Queued for retry with exponential backoff
2. Moved to dead letter queue after 5 attempts
3. Cleaned up after 7 days

---

## Rate Limiting

### Configuration

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 requests | 1 minute |
| Authentication | 10 requests | 1 minute |
| Strict Auth (login) | 5 requests | 5 minutes |
| Submissions | 20 requests | 1 minute |
| Uploads | 10 requests | 1 minute |
| Webhooks | 60 requests | 1 minute |

### Implementation

```typescript
const result = checkRateLimit(identifier, 'auth');
if (!result.allowed) {
  return new Response('Too many requests', { 
    status: 429,
    headers: {
      'Retry-After': retryAfter.toString(),
    },
  });
}
```

### Headers

Rate limit info is returned in response headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Security Headers

Applied to all responses:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer |
| `X-DNS-Prefetch-Control` | `off` | Disable DNS prefetch |
| `Permissions-Policy` | `camera=(), microphone=()...` | Restrict features |

### Content Security Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://cfp.directory;
frame-ancestors 'none';
```

---

## File Upload Security

### Validation

- **File size**: Configurable maximum (default: 100MB)
- **File types**: Whitelist of allowed MIME types
- **File names**: Sanitized to prevent path traversal

### Allowed File Types

Default whitelist:
- Documents: PDF, DOC, DOCX, PPT, PPTX, ODP, KEY
- Media: MP4, WEBM, JPG, JPEG, PNG, GIF

### Path Traversal Prevention

```typescript
function sanitizeFileName(input: string): string {
  // Remove path traversal attempts
  let sanitized = input.replace(/\.\./g, '');
  // Remove special characters
  sanitized = sanitized.replace(/[<>:"|?*\\\/]/g, '');
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  return sanitized;
}
```

---

## Environment Security

### Required Secrets

| Variable | Requirements |
|----------|--------------|
| `NEXTAUTH_SECRET` | Minimum 32 characters, cryptographically random |
| `DATABASE_URL` | PostgreSQL connection string |

### Generation

```bash
# Generate secure secret
openssl rand -base64 32
```

### Best Practices

- Never commit secrets to version control
- Use different secrets per environment
- Rotate secrets periodically
- Use secrets manager in production

---

## Database Security

### Connection

- Use SSL/TLS in production
- Use strong, unique passwords
- Limit connection privileges

### Query Safety

Prisma ORM provides protection against SQL injection:

```typescript
// Safe - parameterized query
await prisma.user.findUnique({
  where: { email: userInput }
});

// Never do this
// await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`
```

### Data Protection

- Passwords are never stored in plain text
- Sensitive data is not logged
- PII is handled according to GDPR guidelines

---

## Data Encryption at Rest

### PII Field Encryption

Federated speaker PII is encrypted at rest using AES-256-GCM when enabled.

#### Encrypted Fields

The following FederatedSpeaker fields are encrypted:
- `email`
- `name`
- `bio`
- `location`
- `company`
- `position`
- `linkedinUrl`
- `twitterHandle`
- `githubUsername`
- `websiteUrl`
- `speakingExperience`

#### Enabling Encryption

Set the environment variable:

```bash
# .env
ENCRYPT_PII_AT_REST=true
```

**Note**: Encryption is enabled by default in production (`NODE_ENV=production`).

#### Encryption Details

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key Size | 256 bits |
| IV Size | 96 bits (random per encryption) |
| Auth Tag | 128 bits |
| Key Derivation | PBKDF2-SHA256 |
| Iterations | 100,000 |

#### Key Derivation

The encryption key is derived from:
1. `NEXTAUTH_SECRET` (required, minimum 32 characters)
2. `FEDERATION_LICENSE_KEY` (optional, adds entropy if present)

```
key = PBKDF2(NEXTAUTH_SECRET + ":" + LICENSE_KEY, salt, 100000, SHA256)
```

#### Storage Format

Encrypted values are stored as:
```
enc:v1:<salt>:<iv>:<authTag>:<ciphertext>
```

All components are Base64 encoded.

#### Migration

To encrypt existing unencrypted data, run:

```typescript
import { encryptExistingSpeakers } from '@/lib/federation/federated-speaker-service';

const result = await encryptExistingSpeakers();
console.log(`Encrypted ${result.encrypted} of ${result.processed} speakers`);
```

### Database-Level Encryption

For additional security, enable PostgreSQL encryption:

#### Option 1: Transparent Data Encryption (TDE)

If using a managed PostgreSQL service (AWS RDS, Azure, etc.):

1. Enable encryption at rest in your cloud provider console
2. Use encrypted storage volumes
3. Enable SSL/TLS for connections

#### Option 2: pgcrypto Extension

For self-managed PostgreSQL:

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt a column
UPDATE federated_speakers 
SET email = pgp_sym_encrypt(email, 'your-encryption-key')
WHERE email NOT LIKE 'enc:%';
```

**Note**: Application-level encryption (our AES-256-GCM) is preferred as it:
- Encrypts before data reaches the database
- Key never exposed to database
- Works with any database provider

#### Option 3: Volume Encryption

For Docker deployments:

```yaml
# docker-compose.yml
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      device: /encrypted-volume/postgres
      o: bind
```

Ensure the host volume is encrypted using:
- LUKS (Linux)
- FileVault (macOS)
- BitLocker (Windows)

### Key Rotation

**Important**: Changing `NEXTAUTH_SECRET` or `FEDERATION_LICENSE_KEY` will make existing encrypted data unreadable.

To rotate keys:

1. Export all federated speaker data (decrypted)
2. Update the secret(s)
3. Re-encrypt all data

```bash
# Backup before rotation
pg_dump -t federated_speakers > speakers_backup.sql

# After updating secrets, re-encrypt
npm run encrypt-speakers
```

---

## Federation Public Key Infrastructure

### Overview

Federation uses RSA-2048 keypairs for end-to-end encryption of speaker data:

1. **Self-hosted generates keypair** - RSA-2048 public/private keypair
2. **Public key registered with cfp.directory** - When obtaining a license
3. **Data encrypted in transit** - Speaker PII encrypted with your public key
4. **Only you can decrypt** - Private key never leaves your server

### Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SETUP                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Settings → Federation → "Generate Encryption Keypair"                │
│                          ↓                                               │
│  2. Copy public key                                                      │
│                          ↓                                               │
│  3. Go to cfp.directory → Get License → Paste public key                 │
│                          ↓                                               │
│  4. Copy license key → Paste in self-hosted settings                     │
│                          ↓                                               │
│  5. Enable federation                                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Encryption Details

| Component | Algorithm | Details |
|-----------|-----------|---------|
| Keypair | RSA-2048 | PKCS#8 format |
| Key Exchange | RSA-OAEP | SHA-256 hash |
| Payload Encryption | AES-256-GCM | Hybrid encryption |
| Private Key Storage | AES-256-GCM | Encrypted with NEXTAUTH_SECRET |

### Hybrid Encryption

Since RSA can only encrypt small payloads, we use hybrid encryption:

1. Generate random AES-256 key
2. Encrypt speaker data with AES-256-GCM
3. Encrypt AES key with RSA public key
4. Send: encrypted AES key + IV + auth tag + ciphertext

```typescript
// Payload structure from cfp.directory
interface HybridEncryptedPayload {
  encryptedKey: string;  // RSA-encrypted AES key (base64)
  iv: string;            // AES IV (base64)
  authTag: string;       // AES-GCM auth tag (base64)
  ciphertext: string;    // AES-encrypted data (base64)
}
```

### Private Key Security

The private key is:
- **Never transmitted** - Generated and stays on your server
- **Encrypted at rest** - Using AES-256-GCM (same as PII encryption)
- **Key derived from NEXTAUTH_SECRET** - Change that, lose the private key

### Regenerating Keypair

If you need to regenerate your keypair:

1. **Disable federation first**
2. Go to Settings → Federation → "Regenerate Keypair"
3. Copy the new public key
4. Update your public key on cfp.directory
5. Re-enable federation

**Warning**: Existing encrypted data from cfp.directory cannot be decrypted with a new keypair.

### Verifying Your Keypair

The dashboard shows:
- **Key Fingerprint** - SHA-256 hash of public key (for verification)
- **Valid** badge - Confirms public/private keys match
- **Generated At** - When the keypair was created

---

## CSRF Protection

### Built-in Protection

NextAuth.js provides CSRF protection for authentication flows.

### API Routes

- API routes verify authentication via JWT
- State-changing operations require valid session
- Origin verification for sensitive operations

---

## Security Checklist

### Deployment

- [ ] Set strong `NEXTAUTH_SECRET` (32+ characters)
- [ ] Use HTTPS in production
- [ ] Configure proper CORS settings
- [ ] Enable rate limiting
- [ ] Review allowed file types
- [ ] Set appropriate file size limits

### Maintenance

- [ ] Keep dependencies updated
- [ ] Monitor for security advisories
- [ ] Review access logs
- [ ] Rotate secrets periodically
- [ ] Audit user access

### Federation

- [ ] Store webhook secrets securely
- [ ] Verify webhook signatures
- [ ] Monitor dead letter queue
- [ ] Review consent flows

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** create a public GitHub issue
2. Email security concerns to [security@cfp.directory]
3. Provide detailed reproduction steps
4. Allow time for fix before disclosure

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security](https://next-auth.js.org/getting-started/introduction#security)
- [Prisma Security Best Practices](https://www.prisma.io/docs/guides/security)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
