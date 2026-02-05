/**
 * Plugin Context Factory
 * @version 1.2.0
 *
 * Creates capability-based contexts for plugins with permission checking.
 */

import type { PluginContext, PluginLogger, PluginPermission, SerializableClientPluginContext } from './types';
import { prisma } from '@/lib/db/prisma';
import {
  SubmissionCapabilityImpl,
  UserCapabilityImpl,
  EventCapabilityImpl,
  ReviewCapabilityImpl,
  StorageCapabilityImpl,
  EmailCapabilityImpl,
  PluginDataCapabilityImpl,
  AiReviewCapabilityImpl,
} from './capabilities';
import { createJobQueue } from './jobs';
import { getPasswordFields, decryptConfigFields } from './config-encryption';

// =============================================================================
// PLUGIN LOGGER
// =============================================================================

/**
 * Create a logger for a plugin that persists logs to database
 */
function createPluginLogger(pluginId: string, pluginName: string): PluginLogger {
  const log = async (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown>
  ) => {
    // Log to console in development
    const prefix = `[Plugin:${pluginName}]`;
    switch (level) {
      case 'debug':
        console.debug(prefix, message, metadata || '');
        break;
      case 'info':
        console.info(prefix, message, metadata || '');
        break;
      case 'warn':
        console.warn(prefix, message, metadata || '');
        break;
      case 'error':
        console.error(prefix, message, metadata || '');
        break;
    }
    
    // Persist to database (async, don't block)
    try {
      await prisma.pluginLog.create({
        data: {
          pluginId,
          level,
          message,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        },
      });
    } catch (error) {
      // Don't fail if logging fails
      console.error(`[PluginSystem] Failed to persist log for ${pluginName}:`, error);
    }
  };
  
  return {
    debug: (message: string, metadata?: Record<string, unknown>) => {
      // Fire and forget - don't await
      log('debug', message, metadata);
    },
    info: (message: string, metadata?: Record<string, unknown>) => {
      log('info', message, metadata);
    },
    warn: (message: string, metadata?: Record<string, unknown>) => {
      log('warn', message, metadata);
    },
    error: (message: string, metadata?: Record<string, unknown>) => {
      log('error', message, metadata);
    },
  };
}

// =============================================================================
// CONTEXT FACTORY
// =============================================================================

export interface CreateContextOptions {
  pluginId: string;
  pluginName: string;
  config: Record<string, unknown>;
  permissions: PluginPermission[];
  configSchema?: import('./types').JSONSchema | null;
}

/**
 * Create a plugin context with capability-based access
 */
export function createPluginContext(options: CreateContextOptions): PluginContext {
  const { pluginId, pluginName, config, permissions, configSchema } = options;
  const permissionSet = new Set<PluginPermission>(permissions);

  // Decrypt password fields in config for plugin runtime
  const passwordFields = getPasswordFields(configSchema);
  const decryptedConfig = decryptConfigFields(config, passwordFields);

  // Create capabilities with permission checking
  const submissions = new SubmissionCapabilityImpl(prisma, permissionSet, pluginName);
  const users = new UserCapabilityImpl(prisma, permissionSet, pluginName);
  const events = new EventCapabilityImpl(prisma, permissionSet, pluginName);
  const reviews = new ReviewCapabilityImpl(prisma, permissionSet, pluginName);
  const storage = new StorageCapabilityImpl(permissionSet, pluginName);
  const email = new EmailCapabilityImpl(permissionSet, pluginName);
  const data = new PluginDataCapabilityImpl(prisma, pluginId);
  // AI Reviews - uses plugin data store for full portability
  const aiReviews = new AiReviewCapabilityImpl(prisma, pluginId);

  // Create job queue for this plugin (v1.2.0)
  const jobs = createJobQueue(pluginId, pluginName);

  return {
    logger: createPluginLogger(pluginId, pluginName),
    config: decryptedConfig,
    jobs,
    submissions,
    users,
    events,
    reviews,
    storage,
    email,
    data,
    aiReviews,
  };
}

/**
 * Create a serializable client-safe plugin context.
 * Strips password fields and server-only capabilities.
 * Returns a serializable context (no functions) safe for Server-to-Client Component transfer.
 * The DynamicPluginLoader enriches this with the fetch function on the client side.
 * @version 1.20.0 - Returns SerializableClientPluginContext instead of ClientPluginContext
 */
export function createClientPluginContext(
  pluginId: string,
  pluginName: string,
  config: Record<string, unknown>,
  configSchema?: import('./types').JSONSchema | null
): SerializableClientPluginContext {
  const passwordFields = getPasswordFields(configSchema);
  const safeConfig = { ...config };
  for (const field of passwordFields) {
    delete safeConfig[field];
  }

  // Build the base URL for plugin API calls (self-hosted pattern)
  const baseUrl = `/api/plugins/${pluginId}`;

  return {
    pluginName,
    pluginId,
    config: safeConfig,
    // Note: organizationId is intentionally not set for self-hosted (single-org)
    // Plugins should check: 'organizationId' in context && context.organizationId
    api: {
      baseUrl,
      // Note: fetch function is NOT included here because it can't be serialized
      // when passing from Server Component to Client Component.
      // Client components should use the baseUrl to construct their own fetch calls.
    },
  };
}

/**
 * Create context factory for API version 1.0
 * This is used by the version negotiation system
 */
export function createV1Context(
  pluginId: string,
  config: Record<string, unknown>,
  permissions: Set<string>
): PluginContext {
  // Get plugin name from database (sync lookup from cache in practice)
  // For v1, we just use the pluginId as the name
  return createPluginContext({
    pluginId,
    pluginName: pluginId,
    config,
    permissions: Array.from(permissions) as PluginPermission[],
  });
}
