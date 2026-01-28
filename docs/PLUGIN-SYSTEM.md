# Plugin System Architecture

> **Current Version:** 1.5.1
> **Plugin System Target:** 2.0.0
> **Status:** In Development

This document describes the plugin system for CFP Directory Self-Hosted, enabling developers to extend the application with custom functionality.

## Version Roadmap

| Version | Milestone | Features | Status |
|---------|-----------|----------|--------|
| 1.0.0 | Base | Base application without plugin support | ✅ Complete |
| 1.1.0 | Plugin Core | Database schema, registry, loader, typed hooks, API versioning | ✅ Complete |
| 1.2.0 | Background Jobs | Job queue with locking, concurrency safety, worker | ✅ Complete |
| 1.3.0 | Admin UI | Plugin management page, config forms, logs viewer | ✅ Complete |
| 1.4.0 | UI Slots | Extension slots, error boundaries, slot registry | ✅ Complete |
| **1.5.0** | First Plugins | AI Paper Reviewer, example plugins, SDK docs | ✅ Complete |

---

## Table of Contents

- [Overview](#overview)
- [Plugin Trust Model](#plugin-trust-model)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [Versioned Plugin API](#versioned-plugin-api)
- [Plugin Interface](#plugin-interface)
- [Typed Hook Contracts](#typed-hook-contracts)
- [Background Job Queue](#background-job-queue)
- [UI Extension Slots](#ui-extension-slots)
- [Security & Permissions](#security--permissions)
- [Plugin Development Guide](#plugin-development-guide)
- [Implementation Phases](#implementation-phases)

---

## Overview

The plugin system allows developers to extend CFP Directory functionality without modifying core code. Plugins can:

- Hook into application lifecycle events (submissions, reviews, users, etc.)
- Add UI components to existing pages via extension slots
- Run background jobs for async processing
- Add custom API endpoints
- Store plugin-specific configuration

### Use Cases

- **AI Paper Reviewer** - Automatically analyze submissions using AI providers
- **Slack Notifications** - Send notifications to Slack channels
- **CRM Integration** - Sync speakers and submissions to external CRM
- **Custom Export Formats** - Add new export formats for submissions
- **Social Media Posting** - Auto-post when CFPs go live

---

## Plugin Trust Model

Before diving into implementation, it's important to define how we classify plugin trust levels. This affects sandboxing, API exposure, and review processes.

### Trust Levels

| Level | Source | Review | Sandboxing | Use Case |
|-------|--------|--------|------------|----------|
| **Trusted** | Local / First-party | None required | Full access | Core extensions, official plugins |
| **Semi-trusted** | npm / git (admin-installed) | Admin approval | Permission-gated | Community plugins, third-party integrations |
| **Untrusted** | Future marketplace | Automated + manual review | Strict sandbox | Unknown authors, new plugins |

### Current Implementation: Semi-trusted Model

For the initial release (v1.1.0), we implement a **semi-trusted model**:

- Plugins are installed by administrators only
- All plugins require explicit permission approval before enabling
- Plugins run in the same Node.js process (no sandbox)
- All plugin actions are logged for audit
- Sensitive operations require declared permissions

### Future Considerations (v2.0+)

When/if we add a plugin marketplace:

1. **Automated Security Scanning** - Static analysis of plugin code
2. **Sandboxed Execution** - Consider VM2 or isolated-vm for untrusted plugins
3. **Code Signing** - Verify plugin authenticity
4. **Rate Limiting** - Per-plugin API rate limits
5. **Resource Quotas** - Memory/CPU limits for untrusted plugins

---

## Architecture

The plugin system follows the existing provider pattern (like `StorageProvider`) and integrates with the Next.js App Router architecture.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Admin Panel                               │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  Plugin Manager  │  │  Plugin Config   │                     │
│  └────────┬─────────┘  └────────┬─────────┘                     │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Plugin Core                               │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ │
│  │  Registry  │ │   Loader   │ │   Hooks    │ │  Job Queue   │ │
│  └─────┬──────┘ └─────┬──────┘ └─────┬──────┘ └──────┬───────┘ │
└────────┼──────────────┼──────────────┼───────────────┼──────────┘
         │              │              │               │
         ▼              ▼              ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Database                                 │
│  ┌──────────┐  ┌─────────────┐  ┌─────────────┐                │
│  │ Plugins  │  │ Plugin Jobs │  │ Plugin Logs │                │
│  └──────────┘  └─────────────┘  └─────────────┘                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Installed Plugins                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AI Reviewer  │  │ Slack Notify │  │ Custom Export│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

| Component | Location | Purpose | Version |
|-----------|----------|---------|---------|
| Plugin Types | `src/lib/plugins/types.ts` | TypeScript interfaces | 1.1.0 |
| Plugin Registry | `src/lib/plugins/registry.ts` | Singleton managing instances | 1.1.0 |
| Plugin Loader | `src/lib/plugins/loader.ts` | Scans, loads, initializes | 1.1.0 |
| Hook System | `src/lib/plugins/hooks/` | Typed event dispatch | 1.1.0 |
| Job Queue | `src/lib/plugins/jobs/` | Background processing | 1.2.0 |
| Slot Registry | `src/lib/plugins/slots/` | UI extension management | 1.4.0 |

---

## Database Schema

> **Version:** 1.1.0

### Plugin Model

Stores plugin metadata and configuration.

```prisma
model Plugin {
  id          String   @id @default(cuid())
  name        String   @unique          // e.g., "slack-notifications"
  displayName String                    // e.g., "Slack Notifications"
  description String?  @db.Text
  version     String                    // Plugin version (semver)
  apiVersion  String                    // Target API version (e.g., "1.0")
  author      String?
  homepage    String?                   // Plugin documentation URL
  
  // Installation
  source      String                    // "local" | "npm" | "git"
  sourcePath  String                    // Path/package name/repo URL
  
  // Status
  enabled     Boolean  @default(false)
  installed   Boolean  @default(true)
  
  // Configuration
  config      Json     @default("{}")   // Plugin-specific settings
  configSchema Json?                    // JSON Schema for config validation
  
  // Permissions
  permissions Json     @default("[]")   // Required permissions
  
  // Metadata
  hooks       String[] @default([])     // Registered hook names
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@map("plugins")
}
```

### PluginJob Model

> **Version:** 1.2.0

Stores background jobs queued by plugins.

```prisma
model PluginJob {
  id          String   @id @default(cuid())
  pluginId    String
  type        String                    // Job type defined by plugin
  payload     Json                      // Job data
  status      String   @default("pending") // pending, running, completed, failed
  result      Json?                     // Job result or error
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)
  runAt       DateTime @default(now())  // Scheduled time
  startedAt   DateTime?
  completedAt DateTime?
  
  // Locking fields (concurrency safety)
  lockedAt    DateTime?                 // When job was locked
  lockedBy    String?                   // Worker instance ID
  lockTimeout Int      @default(300)    // Lock timeout in seconds
  
  createdAt   DateTime @default(now())
  
  @@index([status, runAt, lockedAt])
  @@index([pluginId])
  @@map("plugin_jobs")
}
```

### PluginLog Model

> **Version:** 1.1.0

Stores plugin execution logs for debugging and audit.

```prisma
model PluginLog {
  id        String   @id @default(cuid())
  pluginId  String
  level     String   // "info" | "warn" | "error"
  message   String   @db.Text
  metadata  Json?
  createdAt DateTime @default(now())
  
  @@index([pluginId, createdAt])
  @@map("plugin_logs")
}
```

---

## Versioned Plugin API

> **Version:** 1.1.0

To ensure stability as the plugin system evolves, we implement a versioned API.

### API Version Declaration

Plugins declare the API version they target in their manifest:

```json
{
  "name": "my-plugin",
  "apiVersion": "1.0",
  "version": "1.0.0"
}
```

### Version Compatibility

| API Version | App Version | Status | Support |
|-------------|-------------|--------|---------|
| `1.0` | 1.1.0+ | Current | Full support |
| `1.1` | 1.3.0+ | Future | Backward compatible with 1.0 |
| `2.0` | 2.0.0+ | Future | Breaking changes, migration guide |

### Breaking vs Non-Breaking Changes

**Non-breaking (minor version bump):**
- Adding new hooks
- Adding optional fields to payloads
- Adding new permissions
- Adding new UI slots

**Breaking (major version bump):**
- Removing or renaming hooks
- Changing payload structure
- Removing permissions
- Changing context API signatures

### Version Negotiation

```typescript
// src/lib/plugins/version.ts
export const CURRENT_API_VERSION = '1.0';
export const SUPPORTED_VERSIONS = ['1.0'];

export function isVersionSupported(pluginApiVersion: string): boolean {
  return SUPPORTED_VERSIONS.includes(pluginApiVersion);
}

export function getCompatibilityLayer(version: string): PluginContextFactory {
  switch (version) {
    case '1.0':
      return createV1Context;
    default:
      throw new Error(`Unsupported API version: ${version}`);
  }
}
```

---

## Plugin Interface

> **Version:** 1.1.0

### PluginManifest

Describes plugin metadata and requirements.

```typescript
export interface PluginManifest {
  name: string;           // Unique identifier (kebab-case)
  displayName: string;    // Human-readable name
  version: string;        // Plugin version (semver)
  apiVersion: string;     // Target API version (e.g., "1.0")
  description?: string;
  author?: string;
  homepage?: string;
  permissions?: PluginPermission[];
  configSchema?: JSONSchema;
  hooks?: string[];
}
```

### PluginContext (Capability-Based)

Rather than exposing raw resources, the context provides **capability-based access** where methods are only available if the plugin has the required permissions.

```typescript
export interface PluginContext {
  // Always available
  logger: PluginLogger;
  config: Record<string, unknown>;
  jobs: JobQueue;           // Available in v1.2.0+
  
  // Capability-based access
  submissions: SubmissionCapability;
  users: UserCapability;
  events: EventCapability;
  reviews: ReviewCapability;
  storage: StorageCapability;
  email: EmailCapability;
}

// Example capability interface
export interface SubmissionCapability {
  // Requires 'submissions:read'
  get(id: string): Promise<Submission>;
  list(filters?: SubmissionFilters): Promise<Submission[]>;
  
  // Requires 'submissions:manage'
  updateStatus(id: string, status: SubmissionStatus): Promise<Submission>;
}
```

### Plugin

Main plugin interface that plugins must implement.

```typescript
export interface Plugin {
  manifest: PluginManifest;
  
  // Lifecycle hooks
  onEnable?(ctx: PluginContext): Promise<void>;
  onDisable?(ctx: PluginContext): Promise<void>;
  
  // Event hooks (typed)
  hooks?: PluginHooks;
  
  // Custom API routes
  routes?: PluginRoute[];
  
  // UI components (v1.4.0+)
  components?: PluginComponent[];
}
```

---

## Typed Hook Contracts

> **Version:** 1.1.0

Instead of loose string-based hooks, we use **strongly typed hook contracts**.

### Hook Type Definitions

```typescript
// src/lib/plugins/hooks/types.ts

export interface HookPayloads {
  // Submission hooks
  'submission.created': {
    submission: Submission;
    speaker: { id: string; email: string; name: string };
  };
  'submission.statusChanged': {
    submission: Submission;
    oldStatus: SubmissionStatus;
    newStatus: SubmissionStatus;
    changedBy: { id: string; role: string };
  };
  'submission.updated': {
    submission: Submission;
    changes: Partial<Submission>;
    updatedBy: { id: string };
  };
  
  // User hooks
  'user.registered': {
    user: Omit<User, 'passwordHash'>;
    registrationMethod: 'invite' | 'signup' | 'oauth';
  };
  'user.roleChanged': {
    user: Omit<User, 'passwordHash'>;
    oldRole: UserRole;
    newRole: UserRole;
    changedBy: { id: string };
  };
  
  // Review hooks
  'review.submitted': {
    review: Review;
    submission: Submission;
    reviewer: { id: string; name: string };
  };
  
  // Event hooks
  'event.published': {
    event: Event;
    cfpOpensAt: Date;
    cfpClosesAt: Date;
  };
  'event.cfpClosed': {
    event: Event;
    totalSubmissions: number;
  };
  
  // Email hooks
  'email.beforeSend': {
    template: string;
    recipient: { email: string; name?: string };
    variables: Record<string, unknown>;
  };
}

export type HookHandler<K extends keyof HookPayloads> = (
  ctx: PluginContext,
  payload: HookPayloads[K]
) => Promise<void | Partial<HookPayloads[K]>>;

export type PluginHooks = {
  [K in keyof HookPayloads]?: HookHandler<K>;
};
```

### Type-Safe Hook Dispatch

```typescript
// src/lib/plugins/hooks/dispatch.ts

export async function dispatchHook<K extends keyof HookPayloads>(
  hookName: K,
  payload: HookPayloads[K]
): Promise<HookPayloads[K]> {
  const registry = getPluginRegistry();
  let currentPayload = payload;
  
  for (const plugin of registry.getEnabledPlugins()) {
    const handler = plugin.hooks?.[hookName];
    if (handler) {
      try {
        const result = await handler(plugin.context, currentPayload);
        if (result) {
          currentPayload = { ...currentPayload, ...result };
        }
      } catch (error) {
        plugin.context.logger.error(`Hook ${hookName} failed`, { error });
      }
    }
  }
  
  return currentPayload;
}
```

---

## Background Job Queue

> **Version:** 1.2.0

For async operations like AI analysis that take time.

### Queuing Jobs

```typescript
hooks: {
  'submission.created': async (ctx, { submission }) => {
    await ctx.jobs.enqueue({
      type: 'process-submission',
      payload: { submissionId: submission.id },
      runAt: new Date()
    });
  }
}
```

### Job Locking & Concurrency Safety

To prevent multiple workers from processing the same job:

```typescript
// Atomic job acquisition using FOR UPDATE SKIP LOCKED
const WORKER_ID = `worker-${process.pid}-${Date.now()}`;

export async function acquireJob(): Promise<PluginJob | null> {
  const now = new Date();
  const lockExpiry = new Date(now.getTime() - LOCK_TIMEOUT_SECONDS * 1000);
  
  const [job] = await prisma.$queryRaw<PluginJob[]>`
    UPDATE plugin_jobs
    SET 
      status = 'running',
      locked_at = ${now},
      locked_by = ${WORKER_ID},
      attempts = attempts + 1
    WHERE id = (
      SELECT id FROM plugin_jobs
      WHERE status = 'pending'
        AND run_at <= ${now}
        AND (locked_at IS NULL OR locked_at < ${lockExpiry})
      ORDER BY run_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
  
  return job || null;
}
```

### Job States

| State | Description |
|-------|-------------|
| `pending` | Waiting to be processed |
| `running` | Currently being processed (locked) |
| `completed` | Successfully finished |
| `failed` | Failed after max attempts |

---

## UI Extension Slots

> **Version:** 1.4.0

Plugins can inject React components into predefined locations in the UI.

### Available Slots

| Slot Name | Location | Purpose |
|-----------|----------|---------|
| `submission.review.sidebar` | Review page sidebar | Info panels |
| `submission.review.panel` | Below/beside reviews | AI analysis |
| `submission.detail.tabs` | Submission detail | Additional tabs |
| `dashboard.widgets` | Dashboard | Custom widgets |
| `admin.sidebar.items` | Admin sidebar | Menu items |

### Error Boundaries

All plugin UI components are wrapped in error boundaries:

```tsx
<PluginErrorBoundary pluginName={pluginName}>
  <Suspense fallback={<Skeleton />}>
    <PluginComponent context={context} />
  </Suspense>
</PluginErrorBoundary>
```

This ensures plugin crashes don't break the entire page.

---

## Security & Permissions

### Available Permissions

| Permission | Access Level |
|------------|--------------|
| `submissions:read` | Read submission data |
| `submissions:manage` | Update submission status |
| `users:read` | Read user data |
| `users:manage` | Create/update/delete users |
| `events:read` | Read event data |
| `events:manage` | Create/update/delete events |
| `reviews:read` | Read review data |
| `reviews:write` | Create/update reviews |
| `storage:read` | Read files from storage |
| `storage:write` | Upload/delete files |
| `email:send` | Send emails |

### Permission Enforcement

Permissions are checked at runtime via capability interfaces:

```typescript
class SubmissionCapabilityImpl implements SubmissionCapability {
  constructor(private prisma: PrismaClient, private permissions: Set<string>) {}
  
  async get(id: string): Promise<Submission> {
    if (!this.permissions.has('submissions:read')) {
      throw new PluginPermissionError('submissions:read required');
    }
    return this.prisma.submission.findUniqueOrThrow({ where: { id } });
  }
}
```

### PII Encryption & Decryption

> **Version:** 1.5.1

CFP Directory encrypts Personally Identifiable Information (PII) at rest using AES-256-GCM. The plugin system automatically handles PII decryption for plugins with appropriate permissions.

#### What's Encrypted

| Model | Encrypted Fields |
|-------|------------------|
| User | `name` |
| SpeakerProfile | `fullName`, `bio`, `location`, `company`, `position`, social URLs |
| CoSpeaker | `name`, `email`, `bio` |

Note: User `email` is **not** encrypted as it's used for authentication lookups.

#### Automatic Decryption

When plugins access data through capability methods, PII is automatically decrypted:

```typescript
// Plugin code - name is automatically decrypted
const user = await ctx.users.get(userId);
console.log(user.name); // "John Doe" (not "enc:v1:...")
```

#### Security Safeguards

1. **Permission-gated**: Decryption only occurs after permission checks pass
2. **Password protection**: `passwordHash` is always stripped from user objects
3. **Audit trail**: All data access is logged via plugin logging

#### Manual Decryption (Advanced)

For advanced use cases where plugins fetch related data directly, decryption helpers are available:

```typescript
import { 
  decryptUserPii, 
  decryptSpeakerProfilePii 
} from '@/lib/plugins';

// If you have raw database data
const decryptedProfile = decryptSpeakerProfilePii(rawProfile);
```

---

## Plugin Development Guide

### Plugin Directory Structure

```
plugins/
├── my-plugin/
│   ├── manifest.json      # Plugin metadata
│   ├── index.ts           # Main plugin entry
│   ├── components/        # React components (optional)
│   └── lib/               # Plugin utilities (optional)
```

### manifest.json

```json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "1.0.0",
  "apiVersion": "1.0",
  "description": "Does something useful",
  "author": "Your Name",
  "permissions": ["submissions:read"],
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": { "type": "string", "title": "API Key" }
    },
    "required": ["apiKey"]
  }
}
```

### index.ts

```typescript
import type { Plugin, PluginContext } from '@/lib/plugins';

const plugin: Plugin = {
  manifest: require('./manifest.json'),
  
  async onEnable(ctx: PluginContext) {
    ctx.logger.info('Plugin enabled');
  },
  
  hooks: {
    'submission.created': async (ctx, { submission, speaker }) => {
      ctx.logger.info(`New submission: ${submission.title}`);
    }
  }
};

export default plugin;
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (v1.1.0)

**Files to create:**
- `prisma/migrations/xxx_add_plugin_system/migration.sql`
- `src/lib/plugins/types.ts`
- `src/lib/plugins/registry.ts`
- `src/lib/plugins/loader.ts`
- `src/lib/plugins/context.ts`
- `src/lib/plugins/hooks/types.ts`
- `src/lib/plugins/hooks/dispatch.ts`
- `src/lib/plugins/version.ts`
- `src/lib/plugins/capabilities/`
- `src/lib/plugins/index.ts`

**Tasks:**
1. Add Plugin, PluginLog models to Prisma schema
2. Implement typed hook contracts
3. Implement capability-based context
4. Implement plugin registry and loader
5. Add API versioning

### Phase 2: Background Jobs (v1.2.0)

**Files to create:**
- `src/lib/plugins/jobs/types.ts`
- `src/lib/plugins/jobs/queue.ts`
- `src/lib/plugins/jobs/worker.ts`
- `src/lib/plugins/jobs/locking.ts`
- `src/app/api/cron/process-plugin-jobs/route.ts`

**Tasks:**
1. Add PluginJob model with locking fields
2. Implement atomic job acquisition
3. Implement background worker
4. Add stale lock recovery

### Phase 3: Admin UI (v1.3.0)

**Files to create:**
- `src/app/(dashboard)/admin/plugins/page.tsx`
- `src/app/(dashboard)/admin/plugins/[id]/page.tsx`
- `src/components/admin/plugin-*.tsx`
- `src/app/api/admin/plugins/`

**Tasks:**
1. Create plugin management page
2. Implement enable/disable functionality
3. Build dynamic config forms
4. Add plugin logs viewer

### Phase 4: UI Extension Slots (v1.4.0)

**Files to create:**
- `src/lib/plugins/slots/registry.ts`
- `src/components/plugins/plugin-slot.tsx`
- `src/components/plugins/plugin-error-boundary.tsx`

**Tasks:**
1. Implement slot registry
2. Create PluginSlot component with error boundaries
3. Add slots to existing pages

---

## API Reference

### Admin Plugin API

```
GET    /api/admin/plugins           # List all plugins
GET    /api/admin/plugins/:id       # Get plugin details
PATCH  /api/admin/plugins/:id       # Update plugin config
POST   /api/admin/plugins/:id/enable   # Enable plugin
POST   /api/admin/plugins/:id/disable  # Disable plugin
GET    /api/admin/plugins/:id/logs     # Get plugin logs
```

---

## Troubleshooting

### Plugin not loading
1. Check `manifest.json` exists and is valid
2. Verify directory name matches `manifest.name`
3. Check server logs for errors

### Hooks not firing
1. Verify hook name matches typed contracts
2. Check plugin is enabled
3. Look for errors in plugin logs

### Jobs not processing
1. Check cron endpoint is being called
2. Verify job status in database
3. Check for stale locks
