/**
 * Plugin System Type Definitions
 * @version 1.1.0
 *
 * Core TypeScript interfaces for the plugin system.
 */

import type { PrismaClient } from '@prisma/client';
import type { PluginHooks } from './hooks/types';

// =============================================================================
// PERMISSIONS
// =============================================================================

/**
 * Available plugin permissions
 */
export type PluginPermission =
  | 'submissions:read'
  | 'submissions:manage'
  | 'users:read'
  | 'users:manage'
  | 'events:read'
  | 'events:manage'
  | 'reviews:read'
  | 'reviews:write'
  | 'storage:read'
  | 'storage:write'
  | 'email:send';

/**
 * Permission descriptions for admin UI
 */
export const PERMISSION_DESCRIPTIONS: Record<PluginPermission, string> = {
  'submissions:read': 'Read submission data',
  'submissions:manage': 'Update submission status',
  'users:read': 'Read user data',
  'users:manage': 'Create/update/delete users',
  'events:read': 'Read event data',
  'events:manage': 'Create/update/delete events',
  'reviews:read': 'Read review data',
  'reviews:write': 'Create/update reviews',
  'storage:read': 'Read files from storage',
  'storage:write': 'Upload/delete files',
  'email:send': 'Send emails',
};

// =============================================================================
// PLUGIN MANIFEST
// =============================================================================

/**
 * JSON Schema for plugin configuration
 * Follows JSON Schema Draft 7
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  title?: string;
  description?: string;
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[];
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
}

/**
 * Plugin manifest - describes plugin metadata and requirements
 */
export interface PluginManifest {
  /** Unique identifier (kebab-case) */
  name: string;
  /** Human-readable name */
  displayName: string;
  /** Plugin version (semver) */
  version: string;
  /** Target API version (e.g., "1.0") */
  apiVersion: string;
  /** Plugin description */
  description?: string;
  /** Plugin author */
  author?: string;
  /** Plugin documentation URL */
  homepage?: string;
  /** Required permissions */
  permissions?: PluginPermission[];
  /** JSON Schema for config validation */
  configSchema?: JSONSchema;
  /** Hook names this plugin registers */
  hooks?: string[];
}

// =============================================================================
// PLUGIN LOGGER
// =============================================================================

/**
 * Logger interface provided to plugins
 */
export interface PluginLogger {
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

// =============================================================================
// PLUGIN CONTEXT
// =============================================================================

/**
 * Job queue interface for scheduling background jobs
 * @version 1.2.0+ - Not available in 1.1.0
 */
export interface JobQueue {
  enqueue(job: {
    type: string;
    payload: Record<string, unknown>;
    runAt?: Date;
    maxAttempts?: number;
  }): Promise<string>;
  
  getJob(jobId: string): Promise<JobInfo | null>;
  cancelJob(jobId: string): Promise<boolean>;
}

export interface JobInfo {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  attempts: number;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Plugin context - capability-based access to application resources
 * Methods are only available if plugin has required permissions
 */
export interface PluginContext {
  /** Logger for this plugin */
  logger: PluginLogger;
  /** Plugin configuration */
  config: Record<string, unknown>;
  /** Job queue (available in v1.2.0+) */
  jobs?: JobQueue;
  
  // Capability-based access
  submissions: SubmissionCapability;
  users: UserCapability;
  events: EventCapability;
  reviews: ReviewCapability;
  storage: StorageCapability;
  email: EmailCapability;
}

// =============================================================================
// CAPABILITY INTERFACES
// =============================================================================

import type {
  Submission,
  SubmissionStatus,
  User,
  UserRole,
  Event,
  Review,
  ReviewRecommendation,
} from '@prisma/client';

/**
 * Submission filters for list queries
 */
export interface SubmissionFilters {
  eventId?: string;
  speakerId?: string;
  status?: SubmissionStatus;
  trackId?: string;
}

/**
 * Submission capability - requires 'submissions:read' or 'submissions:manage'
 */
export interface SubmissionCapability {
  /** Get a single submission by ID - requires 'submissions:read' */
  get(id: string): Promise<Submission | null>;
  /** List submissions with optional filters - requires 'submissions:read' */
  list(filters?: SubmissionFilters): Promise<Submission[]>;
  /** Update submission status - requires 'submissions:manage' */
  updateStatus(id: string, status: SubmissionStatus): Promise<Submission>;
}

/**
 * User filters for list queries
 */
export interface UserFilters {
  role?: UserRole;
  email?: string;
}

/**
 * User capability - requires 'users:read' or 'users:manage'
 */
export interface UserCapability {
  /** Get a single user by ID - requires 'users:read' */
  get(id: string): Promise<Omit<User, 'passwordHash'> | null>;
  /** List users with optional filters - requires 'users:read' */
  list(filters?: UserFilters): Promise<Omit<User, 'passwordHash'>[]>;
  /** Get user by email - requires 'users:read' */
  getByEmail(email: string): Promise<Omit<User, 'passwordHash'> | null>;
}

/**
 * Event filters for list queries
 */
export interface EventFilters {
  status?: 'DRAFT' | 'PUBLISHED';
  cfpOpen?: boolean;
}

/**
 * Event capability - requires 'events:read' or 'events:manage'
 */
export interface EventCapability {
  /** Get a single event by ID - requires 'events:read' */
  get(id: string): Promise<Event | null>;
  /** Get event by slug - requires 'events:read' */
  getBySlug(slug: string): Promise<Event | null>;
  /** List events with optional filters - requires 'events:read' */
  list(filters?: EventFilters): Promise<Event[]>;
}

/**
 * Review filters for list queries
 */
export interface ReviewFilters {
  submissionId?: string;
  reviewerId?: string;
  recommendation?: ReviewRecommendation;
}

/**
 * Review creation data
 */
export interface ReviewCreateData {
  submissionId: string;
  reviewerId: string;
  contentScore?: number;
  presentationScore?: number;
  relevanceScore?: number;
  overallScore?: number;
  privateNotes?: string;
  publicNotes?: string;
  recommendation?: ReviewRecommendation;
}

/**
 * Review capability - requires 'reviews:read' or 'reviews:write'
 */
export interface ReviewCapability {
  /** Get a single review by ID - requires 'reviews:read' */
  get(id: string): Promise<Review | null>;
  /** List reviews with optional filters - requires 'reviews:read' */
  list(filters?: ReviewFilters): Promise<Review[]>;
  /** Get reviews for a submission - requires 'reviews:read' */
  getBySubmission(submissionId: string): Promise<Review[]>;
  /** Create a review - requires 'reviews:write' */
  create(data: ReviewCreateData): Promise<Review>;
  /** Update a review - requires 'reviews:write' */
  update(id: string, data: Partial<ReviewCreateData>): Promise<Review>;
}

/**
 * Storage capability - requires 'storage:read' or 'storage:write'
 */
export interface StorageCapability {
  /** Get a file URL - requires 'storage:read' */
  getUrl(key: string): Promise<string>;
  /** Upload a file - requires 'storage:write' */
  upload(file: Buffer, filename: string, mimeType: string): Promise<string>;
  /** Delete a file - requires 'storage:write' */
  delete(key: string): Promise<void>;
}

/**
 * Email recipient
 */
export interface EmailRecipient {
  email: string;
  name?: string;
}

/**
 * Email capability - requires 'email:send'
 */
export interface EmailCapability {
  /** Send an email - requires 'email:send' */
  send(options: {
    to: EmailRecipient | EmailRecipient[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<void>;
}

// =============================================================================
// PLUGIN ROUTES
// =============================================================================

/**
 * HTTP method for plugin routes
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Plugin route handler
 */
export interface PluginRouteHandler {
  (
    request: Request,
    context: PluginContext
  ): Promise<Response>;
}

/**
 * Plugin route definition
 */
export interface PluginRoute {
  /** HTTP method */
  method: HttpMethod;
  /** Route path (relative to /api/plugins/{pluginName}/) */
  path: string;
  /** Route handler */
  handler: PluginRouteHandler;
  /** Whether route requires authentication */
  requiresAuth?: boolean;
}

// =============================================================================
// PLUGIN INTERFACE
// =============================================================================

/**
 * Main plugin interface that plugins must implement
 */
export interface Plugin {
  /** Plugin manifest with metadata */
  manifest: PluginManifest;
  
  /** Called when plugin is enabled */
  onEnable?(ctx: PluginContext): Promise<void>;
  /** Called when plugin is disabled */
  onDisable?(ctx: PluginContext): Promise<void>;
  
  /** Event hooks (strongly typed) */
  hooks?: PluginHooks;
  
  /** Custom API routes */
  routes?: PluginRoute[];
  
  /**
   * UI components for extension slots
   * @version 1.4.0+
   */
  components?: PluginComponent[];
}

/**
 * Plugin component for UI slots
 * @version 1.4.0+
 */
export interface PluginComponent {
  /** Target slot name */
  slot: string;
  /** React component to render */
  component: React.ComponentType<PluginComponentProps>;
  /** Display order within slot */
  order?: number;
}

/**
 * Props passed to plugin components
 */
export interface PluginComponentProps {
  /** Plugin context */
  context: PluginContext;
  /** Slot-specific data */
  data?: Record<string, unknown>;
}

// =============================================================================
// PLUGIN REGISTRY TYPES
// =============================================================================

/**
 * Loaded plugin instance with runtime state
 */
export interface LoadedPlugin {
  /** Plugin definition */
  plugin: Plugin;
  /** Runtime context */
  context: PluginContext;
  /** Whether plugin is currently enabled */
  enabled: boolean;
  /** Plugin database record ID */
  dbId: string;
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: string;
}

/**
 * Plugin installation source
 */
export type PluginSource = 'local' | 'npm' | 'git';

/**
 * Plugin database record (matches Prisma model)
 */
export interface PluginRecord {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  version: string;
  apiVersion: string;
  author: string | null;
  homepage: string | null;
  source: string;
  sourcePath: string;
  enabled: boolean;
  installed: boolean;
  config: Record<string, unknown>;
  configSchema: JSONSchema | null;
  permissions: PluginPermission[];
  hooks: string[];
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Plugin permission error
 */
export class PluginPermissionError extends Error {
  constructor(public permission: PluginPermission) {
    super(`Plugin permission required: ${permission}`);
    this.name = 'PluginPermissionError';
  }
}

/**
 * Plugin not found error
 */
export class PluginNotFoundError extends Error {
  constructor(public pluginName: string) {
    super(`Plugin not found: ${pluginName}`);
    this.name = 'PluginNotFoundError';
  }
}

/**
 * Plugin version error
 */
export class PluginVersionError extends Error {
  constructor(public pluginVersion: string, public supportedVersions: string[]) {
    super(
      `Plugin API version ${pluginVersion} is not supported. Supported versions: ${supportedVersions.join(', ')}`
    );
    this.name = 'PluginVersionError';
  }
}
