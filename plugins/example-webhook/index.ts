/**
 * Example Webhook Notifications Plugin
 *
 * Demonstrates how to build a plugin that:
 * - Uses typed hooks to react to events
 * - Sends HTTP webhook payloads
 * - Uses the background job queue for retry logic
 * - Validates configuration via configSchema
 *
 * This serves as a reference implementation for plugin developers.
 */

import type { Plugin, PluginContext, PluginManifest } from '@/lib/plugins';
import manifestJson from './manifest.json';

const manifest: PluginManifest = manifestJson as PluginManifest;

// =============================================================================
// CONFIGURATION
// =============================================================================

interface WebhookConfig {
  webhookUrl?: string;
  secret?: string;
  events?: string[];
  retryOnFailure?: boolean;
}

// =============================================================================
// WEBHOOK DELIVERY
// =============================================================================

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Build and send a webhook payload
 */
export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ ok: boolean; status: number }> {
  const body = JSON.stringify(payload);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'CFP-Directory-Webhook/1.0',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': payload.timestamp,
  };

  // Add HMAC signature if secret is configured
  if (secret) {
    const signature = await computeHmac(secret, body);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  return { ok: response.ok, status: response.status };
}

/**
 * Compute HMAC-SHA256 signature
 */
async function computeHmac(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(body);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check if an event is enabled in the config
 */
function isEventEnabled(config: WebhookConfig, eventName: string): boolean {
  // If no events array specified, all events are enabled
  if (!config.events || config.events.length === 0) {
    return true;
  }
  return config.events.includes(eventName);
}

// =============================================================================
// PLUGIN DEFINITION
// =============================================================================

const plugin: Plugin = {
  manifest,

  async onEnable(ctx: PluginContext) {
    const config = ctx.config as WebhookConfig;
    if (!config.webhookUrl) {
      ctx.logger.warn('Webhook plugin enabled without a URL configured');
    } else {
      ctx.logger.info('Webhook plugin enabled', {
        url: config.webhookUrl,
        eventsFilter: config.events || 'all',
      });
    }
  },

  async onDisable(ctx: PluginContext) {
    ctx.logger.info('Webhook plugin disabled');
  },

  hooks: {
    'submission.created': async (ctx, payload) => {
      const config = ctx.config as WebhookConfig;
      if (!config.webhookUrl || !isEventEnabled(config, 'submission.created')) {
        return;
      }

      const webhookPayload: WebhookPayload = {
        event: 'submission.created',
        timestamp: new Date().toISOString(),
        data: {
          submissionId: payload.submission.id,
          title: payload.submission.title,
          status: payload.submission.status,
          speakerEmail: payload.speaker.email,
          speakerName: payload.speaker.name,
          eventName: payload.event.name,
          eventSlug: payload.event.slug,
        },
      };

      try {
        const result = await sendWebhook(config.webhookUrl, webhookPayload, config.secret);
        if (!result.ok) {
          throw new Error(`Webhook returned HTTP ${result.status}`);
        }
        ctx.logger.info('Webhook sent: submission.created', {
          submissionId: payload.submission.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.logger.error('Webhook delivery failed', { error: message });

        // Retry via background job if enabled
        if (config.retryOnFailure !== false && ctx.jobs) {
          await ctx.jobs.enqueue({
            type: 'webhook-retry',
            payload: {
              url: config.webhookUrl,
              webhookPayload,
              secret: config.secret,
            },
            maxAttempts: 3,
          });
        }
      }
    },

    'submission.statusChanged': async (ctx, payload) => {
      const config = ctx.config as WebhookConfig;
      if (!config.webhookUrl || !isEventEnabled(config, 'submission.statusChanged')) {
        return;
      }

      const webhookPayload: WebhookPayload = {
        event: 'submission.statusChanged',
        timestamp: new Date().toISOString(),
        data: {
          submissionId: payload.submission.id,
          title: payload.submission.title,
          oldStatus: payload.oldStatus,
          newStatus: payload.newStatus,
          changedById: payload.changedBy.id,
        },
      };

      try {
        const result = await sendWebhook(config.webhookUrl, webhookPayload, config.secret);
        if (!result.ok) {
          throw new Error(`Webhook returned HTTP ${result.status}`);
        }
        ctx.logger.info('Webhook sent: submission.statusChanged', {
          submissionId: payload.submission.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.logger.error('Webhook delivery failed', { error: message });

        if (config.retryOnFailure !== false && ctx.jobs) {
          await ctx.jobs.enqueue({
            type: 'webhook-retry',
            payload: {
              url: config.webhookUrl,
              webhookPayload,
              secret: config.secret,
            },
            maxAttempts: 3,
          });
        }
      }
    },

    'review.submitted': async (ctx, payload) => {
      const config = ctx.config as WebhookConfig;
      if (!config.webhookUrl || !isEventEnabled(config, 'review.submitted')) {
        return;
      }

      const webhookPayload: WebhookPayload = {
        event: 'review.submitted',
        timestamp: new Date().toISOString(),
        data: {
          reviewId: payload.review.id,
          submissionId: payload.submission.id,
          submissionTitle: payload.submission.title,
          reviewerName: payload.reviewer.name,
          isUpdate: payload.isUpdate,
          overallScore: payload.review.overallScore,
          recommendation: payload.review.recommendation,
        },
      };

      try {
        const result = await sendWebhook(config.webhookUrl, webhookPayload, config.secret);
        if (!result.ok) {
          throw new Error(`Webhook returned HTTP ${result.status}`);
        }
        ctx.logger.info('Webhook sent: review.submitted', {
          reviewId: payload.review.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.logger.error('Webhook delivery failed', { error: message });

        if (config.retryOnFailure !== false && ctx.jobs) {
          await ctx.jobs.enqueue({
            type: 'webhook-retry',
            payload: {
              url: config.webhookUrl,
              webhookPayload,
              secret: config.secret,
            },
            maxAttempts: 3,
          });
        }
      }
    },
  },
};

export default plugin;
