# Plugin SDK Guide

> **SDK Version:** 1.0 (API Version 1.0)
> **Plugin System Version:** 1.13.0

This guide covers everything you need to build plugins for CFP Directory Self-Hosted.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Plugin Structure](#plugin-structure)
- [Manifest Reference](#manifest-reference)
- [Plugin Interface](#plugin-interface)
- [Hooks API](#hooks-api)
- [Context & Capabilities](#context--capabilities)
- [Background Jobs](#background-jobs)
- [UI Extension Slots](#ui-extension-slots)
- [Configuration](#configuration)
- [Permissions](#permissions)
- [Testing Plugins](#testing-plugins)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Create the plugin directory

```bash
mkdir -p plugins/my-plugin
```

### 2. Create the manifest

```json
// plugins/my-plugin/manifest.json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "1.0.0",
  "apiVersion": "1.0",
  "description": "A custom plugin for CFP Directory",
  "author": "Your Name",
  "permissions": ["submissions:read"],
  "hooks": ["submission.created"]
}
```

### 3. Create the entry point

```typescript
// plugins/my-plugin/index.ts
import type { Plugin, PluginContext } from '@/lib/plugins';
import manifestJson from './manifest.json';
import type { PluginManifest } from '@/lib/plugins';

const manifest: PluginManifest = manifestJson as PluginManifest;

const plugin: Plugin = {
  manifest,

  async onEnable(ctx: PluginContext) {
    ctx.logger.info('My plugin enabled!');
  },

  hooks: {
    'submission.created': async (ctx, { submission, speaker }) => {
      ctx.logger.info(`New submission: ${submission.title} by ${speaker.name}`);
    },
  },
};

export default plugin;
```

### 4. Enable the plugin

1. Restart the application (plugins are scanned on startup)
2. Go to **Admin > Plugins** in the dashboard
3. Find your plugin and click **Enable**

---

## Plugin Structure

```
plugins/
  my-plugin/
    manifest.json        # Required: Plugin metadata
    index.ts             # Required: Plugin entry point
    components/          # Optional: React UI components
      my-widget.tsx
    lib/                 # Optional: Utility modules
      helpers.ts
```

**Important:** The directory name must match the `name` field in `manifest.json`.

---

## Manifest Reference

The manifest file (`manifest.json`) declares your plugin's metadata and requirements.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | `string` | Yes | Unique plugin identifier (kebab-case) |
| `displayName` | `string` | Yes | Human-readable name shown in admin UI |
| `version` | `string` | Yes | Plugin version (semver, e.g., `"1.0.0"`) |
| `apiVersion` | `string` | Yes | Target API version (currently `"1.0"`) |
| `description` | `string` | No | Short description of the plugin |
| `author` | `string` | No | Author name |
| `homepage` | `string` | No | URL to documentation or repository |
| `permissions` | `string[]` | No | Required permissions (see [Permissions](#permissions)) |
| `hooks` | `string[]` | No | Hook names this plugin handles |
| `configSchema` | `JSONSchema` | No | JSON Schema for plugin configuration |
| `sidebarItems` | `SidebarSection[]` | No | Sidebar navigation items (v1.5.0+) |

### Example with config schema

```json
{
  "name": "my-plugin",
  "displayName": "My Plugin",
  "version": "1.0.0",
  "apiVersion": "1.0",
  "permissions": ["submissions:read", "email:send"],
  "configSchema": {
    "type": "object",
    "properties": {
      "apiKey": {
        "type": "string",
        "title": "API Key",
        "description": "Your service API key",
        "format": "password"
      },
      "notifyOnCreate": {
        "type": "boolean",
        "title": "Notify on Create",
        "default": true
      },
      "maxResults": {
        "type": "number",
        "title": "Max Results",
        "default": 10,
        "minimum": 1,
        "maximum": 100
      }
    },
    "required": ["apiKey"]
  }
}
```

---

## Plugin Interface

Your plugin's `index.ts` must export a default object implementing the `Plugin` interface:

```typescript
interface Plugin {
  manifest: PluginManifest;

  // Lifecycle
  onEnable?(ctx: PluginContext): Promise<void>;
  onDisable?(ctx: PluginContext): Promise<void>;
  onUnload?(): Promise<void>;  // v1.6.0+

  // Event hooks
  hooks?: PluginHooks;

  // Custom API routes
  routes?: PluginRoute[];

  // UI components for extension slots
  components?: PluginComponent[];

  // Admin pages
  adminPages?: PluginAdminPage[];  // v1.5.0+
}
```

### Lifecycle Hooks

- **`onEnable(ctx)`** - Called when the plugin is enabled. Use for initialization, creating service accounts, etc.
- **`onDisable(ctx)`** - Called when the plugin is disabled. Use for cleanup.
- **`onUnload()`** - Called when the plugin is unloaded from memory (v1.6.0+). Use for releasing file handles, caches, or connections.

```typescript
async onEnable(ctx: PluginContext) {
  ctx.logger.info('Plugin started');
  // Initialize resources, validate config, create service accounts, etc.
},

async onDisable(ctx: PluginContext) {
  ctx.logger.info('Plugin stopped');
  // Clean up resources
},

async onUnload() {
  // Release file handles, close connections, etc.
},
```

---

## Hooks API

Hooks let your plugin react to application events. All hooks are strongly typed.

### Available Hooks

#### Submission Hooks

| Hook | Payload | Description |
|------|---------|-------------|
| `submission.created` | `{ submission, speaker, event }` | New submission created |
| `submission.statusChanged` | `{ submission, oldStatus, newStatus, changedBy }` | Status changed |
| `submission.updated` | `{ submission, changes, updatedBy }` | Content updated |
| `submission.deleted` | `{ submissionId, eventId, speakerId, deletedBy }` | Submission deleted |

#### User Hooks

| Hook | Payload | Description |
|------|---------|-------------|
| `user.registered` | `{ user, registrationMethod, invitedBy? }` | New user registered |
| `user.roleChanged` | `{ user, oldRole, newRole, changedBy }` | User role changed |
| `user.profileUpdated` | `{ user, changes }` | Profile updated |

#### Review Hooks

| Hook | Payload | Description |
|------|---------|-------------|
| `review.submitted` | `{ review, submission, reviewer, isUpdate }` | Review submitted |
| `review.updated` | `{ review, submission, reviewer, changes }` | Review updated |
| `review.allCompleted` | `{ submission, reviews, averageScore, recommendations }` | All reviews done |

#### Event Hooks

| Hook | Payload | Description |
|------|---------|-------------|
| `event.published` | `{ event, cfpOpensAt, cfpClosesAt, publishedBy }` | Event published |
| `event.cfpOpened` | `{ event, cfpClosesAt, totalTracks }` | CFP opened |
| `event.cfpClosed` | `{ event, totalSubmissions, submissionsByStatus }` | CFP closed |
| `event.updated` | `{ event, changes, updatedBy }` | Event updated |

#### Email Hooks

| Hook | Payload | Description |
|------|---------|-------------|
| `email.beforeSend` | `{ template, recipient, variables, subject }` | Before email sent (can modify) |
| `email.sent` | `{ template, recipient, subject, success, error? }` | After email sent |

### Hook Handler Signature

```typescript
type HookHandler<K> = (
  ctx: PluginContext,
  payload: HookPayloads[K]
) => Promise<void | Partial<HookPayloads[K]>>;
```

Handlers can optionally return a partial payload to modify data (only for hooks where `canModifyPayload` is true, such as `email.beforeSend`).

### Example

```typescript
hooks: {
  'submission.created': async (ctx, { submission, speaker, event }) => {
    ctx.logger.info(`New submission "${submission.title}" from ${speaker.email}`);
  },

  'submission.statusChanged': async (ctx, { submission, oldStatus, newStatus }) => {
    if (newStatus === 'ACCEPTED') {
      ctx.logger.info(`Congratulations! "${submission.title}" was accepted`);
    }
  },

  'email.beforeSend': async (ctx, payload) => {
    // Modify email variables before sending
    return {
      variables: {
        ...payload.variables,
        customFooter: 'Powered by My Plugin',
      },
    };
  },
},
```

---

## Context & Capabilities

The `PluginContext` provides capability-based access to application resources. Methods are only available if your plugin declares the required permissions.

```typescript
interface PluginContext {
  logger: PluginLogger;           // Always available
  config: Record<string, unknown>; // Always available
  jobs?: JobQueue;                // Always available (v1.2.0+)
  data: PluginDataCapability;     // Always available (v1.7.0+)

  submissions: SubmissionCapability;  // Requires submissions:read
  users: UserCapability;              // Requires users:read
  events: EventCapability;            // Requires events:read
  reviews: ReviewCapability;          // Requires reviews:read
  storage: StorageCapability;         // Requires storage:read
  email: EmailCapability;             // Requires email:send
}
```

### Logger

```typescript
ctx.logger.debug('Debug message', { key: 'value' });
ctx.logger.info('Info message');
ctx.logger.warn('Warning message');
ctx.logger.error('Error message', { error: err.message });
```

Logs are persisted to the database and viewable in **Admin > Plugins > [Plugin] > Logs**.

### Submissions

```typescript
// Requires 'submissions:read'
const submission = await ctx.submissions.get('submission-id');
const submissions = await ctx.submissions.list({ eventId: 'event-id', status: 'PENDING' });

// Requires 'submissions:manage'
await ctx.submissions.updateStatus('submission-id', 'ACCEPTED');
```

### Users

```typescript
// Requires 'users:read'
// Note: PII fields (like name) are automatically decrypted
const user = await ctx.users.get('user-id');
console.log(user.name); // "John Doe" (decrypted)

const admins = await ctx.users.list({ role: 'ADMIN' });
const userByEmail = await ctx.users.getByEmail('user@example.com');

// Requires 'users:manage' - Create a service account for the plugin (v1.13.0+)
const serviceAccount = await ctx.users.createServiceAccount({
  name: 'My Plugin Bot',
  image: '/images/my-bot-avatar.png',  // Optional
});
// Returns: { id, email: 'my-plugin@plugin.system', name, role: 'REVIEWER', ... }
```

> **Security Note (v1.5.1+):** User data returned by capabilities has PII automatically decrypted. The `passwordHash` field is always excluded.

> **Service Accounts (v1.13.0+):** Plugins can create their own non-privileged service accounts. These accounts:
> - Have the REVIEWER role (non-privileged)
> - Cannot log in (no password, unverified email)
> - Are hidden from the public team/reviewers page by default
> - Use the email format `{plugin-name}@plugin.system`
> - Idempotent: calling `createServiceAccount` returns the existing account if already created

### Reviews

```typescript
// Requires 'reviews:read'
const review = await ctx.reviews.get('review-id');
const reviews = await ctx.reviews.getBySubmission('submission-id');

// Requires 'reviews:write'
await ctx.reviews.create({
  submissionId: 'sub-id',
  reviewerId: 'reviewer-id',
  overallScore: 4,
  recommendation: 'ACCEPT',
  publicNotes: 'Great submission!',
});
```

### Storage

```typescript
// Requires 'storage:read'
const url = await ctx.storage.getUrl('file-key');

// Requires 'storage:write'
const fileUrl = await ctx.storage.upload(buffer, 'report.pdf', 'application/pdf');
await ctx.storage.delete('file-key');
```

### Email

```typescript
// Requires 'email:send'
await ctx.email.send({
  to: { email: 'user@example.com', name: 'User' },
  subject: 'Notification',
  html: '<p>Hello!</p>',
  text: 'Hello!',
});
```

### Plugin Data Store (v1.7.0+)

The data capability provides a key-value store scoped to your plugin. No extra permissions required.

```typescript
// Store a value (supports any JSON-serializable data)
await ctx.data.set('reviews', 'last-run', Date.now());

// Store with encryption (for sensitive data)
await ctx.data.set('config', 'api-token', 'secret123', { encrypted: true });

// Retrieve a value (auto-decrypts if encrypted)
const lastRun = await ctx.data.get<number>('reviews', 'last-run');
const token = await ctx.data.get<string>('config', 'api-token');

// List keys in a namespace
const keys = await ctx.data.list('reviews');

// Delete a key
await ctx.data.delete('reviews', 'last-run');

// Clear all keys in a namespace
await ctx.data.clear('reviews');
```

Namespaces help organize data (e.g., `'config'`, `'cache'`, `'reviews'`). Each plugin's data is isolated.

---

## Background Jobs

Use the job queue for long-running operations like API calls, file processing, or notifications. Jobs run asynchronously and support retries.

### Enqueueing Jobs

```typescript
// In a hook handler
hooks: {
  'submission.created': async (ctx, { submission }) => {
    await ctx.jobs!.enqueue({
      type: 'process-submission',
      payload: { submissionId: submission.id },
      maxAttempts: 3,       // Optional (default: 3)
      priority: 100,        // Optional (default: 100, lower = higher priority)
      runAt: new Date(),    // Optional (default: now)
    });
  },
},
```

### Managing Jobs

```typescript
// Check job status
const job = await ctx.jobs!.getJob('job-id');

// Cancel a pending job
await ctx.jobs!.cancelJob('job-id');

// Get pending count
const count = await ctx.jobs!.getPendingCount();

// List jobs by status
const failedJobs = await ctx.jobs!.getJobs('failed', 10);
```

### Job Processing

Jobs are processed by the background worker (triggered via the cron endpoint). Register a job handler for your job types:

```typescript
import { registerJobHandler } from '@/lib/plugins';

registerJobHandler('your-plugin-id', 'process-submission', async (payload) => {
  const submissionId = payload.submissionId as string;
  // Do work...
  return { success: true, data: { processed: true } };
});
```

### Job States

| State | Description |
|-------|-------------|
| `pending` | Waiting to be processed |
| `running` | Currently being processed (locked to prevent duplicate processing) |
| `completed` | Successfully finished |
| `failed` | Failed after max retry attempts |

---

## UI Extension Slots

Plugins can inject React components into predefined locations in the UI.

### Available Slots

| Slot Name | Location | Use Case |
|-----------|----------|----------|
| `submission.review.sidebar` | Review page sidebar | Info panels, quick actions |
| `submission.review.panel` | Below/beside reviews | AI analysis, metrics |
| `submission.detail.tabs` | Submission detail page | Additional tabs |
| `dashboard.widgets` | Dashboard page | Custom widgets, charts |
| `admin.sidebar.items` | Admin sidebar navigation | Extra menu items |

### Registering Components

```typescript
import { MyWidget } from './components/my-widget';

const plugin: Plugin = {
  manifest,
  components: [
    {
      slot: 'dashboard.widgets',
      component: MyWidget,
      order: 100, // Lower = renders first (default: 100)
    },
  ],
};
```

### Component Props

All slot components receive `PluginComponentProps`:

```typescript
interface PluginComponentProps {
  context: PluginContext;                 // Your plugin's context
  data?: Record<string, unknown>;        // Slot-specific data
}
```

The `data` prop contains context from the page. For example, in `submission.review.panel`, you'll receive `{ submissionId: '...' }`.

### Writing Components

```tsx
'use client';

import React from 'react';
import type { PluginComponentProps } from '@/lib/plugins';

export function MyWidget({ context, data }: PluginComponentProps) {
  const submissionId = data?.submissionId as string;

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-sm">My Widget</h3>
      <p className="text-sm text-muted-foreground">
        Submission: {submissionId}
      </p>
    </div>
  );
}
```

### Error Isolation

All plugin components are wrapped in error boundaries. If your component throws, it will show an error message without crashing the page. Users can click "Retry" to re-render.

---

## Admin Pages

Plugins can provide full admin pages accessible from the sidebar. These are interactive React components with hooks support.

### Registering Admin Pages

```typescript
import { AdminDashboard } from './components/admin-dashboard';
import { AdminSettings } from './components/admin-settings';

const plugin: Plugin = {
  manifest,
  adminPages: [
    {
      path: '/dashboard',
      title: 'Dashboard',
      component: AdminDashboard,
    },
    {
      path: '/settings',
      title: 'Settings',
      component: AdminSettings,
    },
  ],
};
```

Pages are accessible at `/admin/plugins/pages/{plugin-name}/{path}`.

### Sidebar Items

To add links to your admin pages in the sidebar, define `sidebarItems` in your manifest. Sidebar items are grouped into sections:

```json
// manifest.json
{
  "sidebarItems": [
    {
      "title": "My Plugin",
      "icon": "Bot",
      "items": [
        {
          "key": "dashboard",
          "label": "Dashboard",
          "path": "/",
          "icon": "LayoutDashboard"
        },
        {
          "key": "history",
          "label": "History",
          "path": "/history",
          "icon": "History"
        }
      ]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | `string` | Section header title |
| `icon` | `string` | Lucide icon name for section (e.g., `"Bot"`, `"Settings"`) |
| `items` | `array` | Array of sidebar items |
| `items[].key` | `string` | Unique key for the item |
| `items[].label` | `string` | Display label |
| `items[].path` | `string` | Route path relative to plugin admin base |
| `items[].icon` | `string` | Lucide icon name for item |

### Pre-compiled Admin Bundles (v1.6.0+)

For plugins distributed via the official registry, admin page components are pre-compiled to browser-ready JavaScript bundles during the build process. This allows interactive React components with hooks to work without runtime transpilation.

**How it works:**

1. Admin components in `components/admin-*.tsx` are compiled with esbuild
2. React imports are replaced with `window.__PLUGIN_REACT__` (provided by the host app)
3. Output is stored in `dist/admin-pages.js` as an IIFE bundle
4. The host app loads and executes the bundle client-side

**For plugin developers:**

If building plugins for the official registry:
- Place admin page components in the `components/` directory
- Name them with the `admin-` prefix (e.g., `admin-dashboard.tsx`)
- Export a named function component (e.g., `export function AdminDashboard`)
- The build process will automatically compile them

```tsx
// components/admin-dashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { PluginComponentProps } from '@/lib/plugins';

export function AdminDashboard({ context }: PluginComponentProps) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Fetch data using context.pluginId
    fetch(`/api/plugins/${context.pluginId}/data`)
      .then(res => res.json())
      .then(setData);
  }, [context.pluginId]);

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Your interactive UI */}
    </div>
  );
}
```

---

## Configuration

Plugin configuration is managed through the admin UI. Define your config schema in `manifest.json` and access values via `ctx.config`.

### Supported Schema Types

| Type | Renders As |
|------|-----------|
| `string` | Text input |
| `string` (with `enum`) | Select dropdown |
| `string` (with `format: "password"`) | Password input |
| `number` | Number input |
| `boolean` | Toggle/checkbox |

### Accessing Config

```typescript
interface MyConfig {
  apiKey?: string;
  maxResults?: number;
  enableFeature?: boolean;
}

hooks: {
  'submission.created': async (ctx, payload) => {
    const config = ctx.config as MyConfig;

    if (!config.apiKey) {
      ctx.logger.warn('API key not configured');
      return;
    }

    // Use config values...
  },
},
```

---

## Permissions

Declare permissions in your manifest to access application resources. Users must approve permissions when enabling the plugin.

| Permission | Access |
|------------|--------|
| `submissions:read` | Read submission data |
| `submissions:manage` | Update submission status |
| `users:read` | Read user data (excluding passwords, PII auto-decrypted) |
| `users:manage` | Create/update/delete users |
| `events:read` | Read event data |
| `events:manage` | Create/update/delete events |
| `reviews:read` | Read review data |
| `reviews:write` | Create/update reviews |
| `storage:read` | Read files from storage |
| `storage:write` | Upload/delete files |
| `email:send` | Send emails |

Calling a capability method without the required permission throws `PluginPermissionError`.

> **PII Decryption (v1.5.1+):** When accessing user data via capabilities, encrypted PII fields (like `name`) are automatically decrypted. This ensures plugins receive readable data while maintaining at-rest encryption.

---

## Testing Plugins

### Setup

Create a test file in `src/__tests__/plugins/`:

```typescript
// src/__tests__/plugins/my-plugin.test.ts
import { describe, it, expect, vi } from 'vitest';

// Mock Prisma before imports
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pluginLog: { create: vi.fn().mockResolvedValue({}) },
    pluginJob: {
      create: vi.fn().mockResolvedValue({ id: 'job-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    submission: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    event: { findUnique: vi.fn(), findMany: vi.fn() },
    review: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/storage/local-storage-provider', () => ({
  getStorage: vi.fn().mockReturnValue({
    getPublicUrl: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock('@/lib/email/email-service', () => ({
  emailService: { send: vi.fn() },
}));
```

### Mock Context

```typescript
import type { PluginContext } from '@/lib/plugins';

function createMockContext(config = {}): PluginContext {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config,
    jobs: {
      enqueue: vi.fn().mockResolvedValue('job-1'),
      getJob: vi.fn().mockResolvedValue(null),
      cancelJob: vi.fn().mockResolvedValue(true),
      getPendingCount: vi.fn().mockResolvedValue(0),
      getJobs: vi.fn().mockResolvedValue([]),
    },
    submissions: {} as any,
    users: {} as any,
    events: {} as any,
    reviews: {} as any,
    storage: {} as any,
    email: {} as any,
  };
}
```

### Testing Hooks

```typescript
describe('my plugin hooks', () => {
  it('should handle submission.created', async () => {
    const plugin = (await import('../../../plugins/my-plugin')).default;
    const ctx = createMockContext({ apiKey: 'test' });

    await plugin.hooks!['submission.created']!(ctx, {
      submission: { id: 'sub-1', title: 'Test' } as any,
      speaker: { id: 'u1', email: 'test@test.com', name: 'Test' },
      event: { id: 'e1', name: 'Conf', slug: 'conf' },
    });

    expect(ctx.logger.info).toHaveBeenCalled();
  });
});
```

### Testing UI Components

Use `@vitest-environment happy-dom` for component tests:

```typescript
/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { MyWidget } from '../../../plugins/my-plugin/components/my-widget';

it('should render widget', () => {
  render(<MyWidget context={createMockContext()} data={{ submissionId: 'sub-1' }} />);
  expect(screen.getByText('sub-1')).toBeInTheDocument();
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific plugin tests
npx vitest run src/__tests__/plugins/my-plugin.test.ts

# Watch mode
npx vitest src/__tests__/plugins/
```

---

## Examples

All example plugins are in the [official plugins repository](https://github.com/l33tdawg/cfp-directory-official-plugins).

### Example: Webhook Notifications

A developer starter template demonstrating hooks, configuration schemas, HMAC signatures, and background job retries. Use this as a base for building your own plugins.

See [plugins/example-webhook](https://github.com/l33tdawg/cfp-directory-official-plugins/tree/main/plugins/example-webhook).

### AI Paper Reviewer

Full-featured production plugin demonstrating hooks, background jobs, UI components, admin pages, service accounts, and AI integration.

See [plugins/ai-paper-reviewer](https://github.com/l33tdawg/cfp-directory-official-plugins/tree/main/plugins/ai-paper-reviewer).

---

## Troubleshooting

### Plugin not loading

1. Verify `manifest.json` exists and has valid JSON
2. Check directory name matches `manifest.name`
3. Check `apiVersion` is `"1.0"`
4. Look for errors in server console output

### Hooks not firing

1. Confirm the plugin is **enabled** in Admin > Plugins
2. Check hook names match exactly (e.g., `submission.created`)
3. Verify hook names are listed in manifest `hooks` array
4. Check plugin logs for errors

### Permission errors

1. Verify the required permission is in your manifest's `permissions` array
2. The plugin may need to be disabled and re-enabled after changing permissions

### Jobs not processing

1. Ensure the cron endpoint (`/api/cron/process-plugin-jobs`) is being called
2. Check job status in the admin panel
3. Verify your job handler is registered
4. Look for stale locks in the database

### UI components not appearing

1. Check the slot name is valid (see [Available Slots](#available-slots))
2. Ensure your component is listed in the plugin's `components` array
3. Verify the plugin is enabled
4. Check browser console for React errors
