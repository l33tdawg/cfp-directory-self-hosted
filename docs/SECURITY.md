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
