/**
 * Federation Webhook Sender
 * 
 * Sends webhooks to cfp.directory when events occur on the self-hosted instance.
 * All webhooks are signed with HMAC-SHA256 using the event's webhook secret.
 * 
 * Webhook Types:
 * - submission.created - When a federated speaker submits a talk
 * - submission.status_updated - When submission status changes (accept/reject)
 * - submission.message_sent - When organizer sends a message to speaker
 * - submission.message_read - When a message is marked as read
 */

import { createHmac, randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { config } from '@/lib/env';
import type { 
  WebhookEventType,
  WebhookPayload,
  SubmissionWebhookData,
  StatusUpdateWebhookData,
  MessageWebhookData,
} from './types';

// Webhook configuration
const WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s

// =============================================================================
// Types
// =============================================================================

export interface WebhookResult {
  success: boolean;
  webhookId: string;
  statusCode?: number;
  error?: string;
  retryCount?: number;
}

export interface WebhookQueueEntry {
  id: string;
  eventId: string;
  payload: WebhookPayload;
  attempts: number;
  lastAttempt: Date | null;
  nextAttempt: Date;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
}

// =============================================================================
// HMAC Signing
// =============================================================================

/**
 * Generate HMAC-SHA256 signature for webhook payload.
 * 
 * @param payload - The webhook payload to sign
 * @param secret - The webhook secret for this event
 * @returns The signature as a hex string
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  return hmac.digest('hex');
}

/**
 * Create webhook headers including signature.
 */
function createWebhookHeaders(
  payload: string,
  secret: string,
  webhookId: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = signWebhookPayload(`${timestamp}.${payload}`, secret);
  
  return {
    'Content-Type': 'application/json',
    'X-Webhook-Id': webhookId,
    'X-Webhook-Timestamp': timestamp,
    'X-Webhook-Signature': `sha256=${signature}`,
    'User-Agent': 'CFP-Directory-Self-Hosted-Webhook/1.0',
  };
}

// =============================================================================
// Core Webhook Sender
// =============================================================================

/**
 * Send a webhook to cfp.directory.
 * 
 * @param eventId - The local event ID
 * @param type - The webhook event type
 * @param data - The webhook data payload
 * @returns Result of the webhook send
 */
export async function sendWebhook<T>(
  eventId: string,
  type: WebhookEventType,
  data: T
): Promise<WebhookResult> {
  const webhookId = randomUUID();
  
  try {
    // Get the event and its webhook configuration
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        federatedEventId: true,
        webhookSecret: true,
        isFederated: true,
      },
    });

    if (!event) {
      return {
        success: false,
        webhookId,
        error: 'Event not found',
      };
    }

    if (!event.isFederated || !event.federatedEventId || !event.webhookSecret) {
      return {
        success: false,
        webhookId,
        error: 'Event is not federated or missing webhook configuration',
      };
    }

    // Build the webhook payload
    const payload: WebhookPayload<T> = {
      id: webhookId,
      type,
      timestamp: new Date().toISOString(),
      federatedEventId: event.federatedEventId,
      data,
    };

    // Send with retries
    const result = await sendWithRetry(
      payload,
      event.webhookSecret,
      webhookId
    );

    // Log the webhook attempt
    await logWebhookAttempt(eventId, webhookId, type, result);

    return result;

  } catch (error) {
    console.error(`Webhook send error (${type}):`, error);
    
    return {
      success: false,
      webhookId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send webhook with retry logic.
 */
async function sendWithRetry<T>(
  payload: WebhookPayload<T>,
  secret: string,
  webhookId: string
): Promise<WebhookResult> {
  const webhookUrl = `${config.federation.apiUrl}/submissions/notify`;
  const payloadString = JSON.stringify(payload);
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const headers = createWebhookHeaders(payloadString, secret, webhookId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return {
          success: true,
          webhookId,
          statusCode: response.status,
          retryCount: attempt,
        };
      }
      
      // Non-retryable errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const errorBody = await response.text().catch(() => '');
        return {
          success: false,
          webhookId,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${errorBody}`,
          retryCount: attempt,
        };
      }
      
      // Retryable error - wait and try again
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAYS[attempt]);
      }
      
    } catch (error) {
      // Network error or timeout - retry if we have attempts left
      if (attempt === MAX_RETRIES) {
        return {
          success: false,
          webhookId,
          error: error instanceof Error ? error.message : 'Request failed',
          retryCount: attempt,
        };
      }
      
      await delay(RETRY_DELAYS[attempt]);
    }
  }
  
  return {
    success: false,
    webhookId,
    error: 'Max retries exceeded',
    retryCount: MAX_RETRIES,
  };
}

/**
 * Log webhook attempt for debugging and monitoring.
 */
async function logWebhookAttempt(
  eventId: string,
  webhookId: string,
  type: WebhookEventType,
  result: WebhookResult
): Promise<void> {
  // For now, just console log
  // In production, you might want to store this in a webhook_logs table
  console.log(`[Webhook] ${type} (${webhookId}):`, {
    eventId,
    success: result.success,
    statusCode: result.statusCode,
    retryCount: result.retryCount,
    error: result.error,
  });
}

/**
 * Delay helper for retries.
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Specific Webhook Senders
// =============================================================================

/**
 * Send submission.created webhook when a federated speaker submits a talk.
 */
export async function sendSubmissionCreatedWebhook(
  submissionId: string
): Promise<WebhookResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      event: true,
      track: true,
      format: true,
      materials: true,
      coSpeakers: true,
    },
  });

  if (!submission) {
    return {
      success: false,
      webhookId: '',
      error: 'Submission not found',
    };
  }

  if (!submission.isFederated || !submission.federatedSpeakerId) {
    return {
      success: false,
      webhookId: '',
      error: 'Submission is not federated',
    };
  }

  const data: SubmissionWebhookData = {
    submissionId: submission.id,
    speakerId: submission.federatedSpeakerId,
    title: submission.title,
    abstract: submission.abstract,
    trackName: submission.track?.name,
    formatName: submission.format?.name,
    materials: submission.materials.map(m => ({
      type: m.type,
      title: m.title,
      url: m.fileUrl || m.externalUrl || '',
    })),
    coSpeakers: submission.coSpeakers.map(c => ({
      name: c.name,
      email: c.email || undefined,
      bio: c.bio || undefined,
    })),
  };

  return sendWebhook(submission.eventId, 'submission.created', data);
}

/**
 * Send submission.status_updated webhook when submission status changes.
 */
export async function sendStatusUpdatedWebhook(
  submissionId: string,
  newStatus: string,
  feedback?: string
): Promise<WebhookResult> {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      eventId: true,
      isFederated: true,
      federatedSpeakerId: true,
    },
  });

  if (!submission) {
    return {
      success: false,
      webhookId: '',
      error: 'Submission not found',
    };
  }

  if (!submission.isFederated) {
    return {
      success: false,
      webhookId: '',
      error: 'Submission is not federated',
    };
  }

  const data: StatusUpdateWebhookData = {
    submissionId: submission.id,
    status: newStatus,
    feedback,
  };

  return sendWebhook(submission.eventId, 'submission.status_updated', data);
}

/**
 * Send submission.message_sent webhook when organizer sends a message.
 */
export async function sendMessageSentWebhook(
  messageId: string
): Promise<WebhookResult> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      submission: {
        select: {
          id: true,
          eventId: true,
          isFederated: true,
        },
      },
    },
  });

  if (!message || !message.submission) {
    return {
      success: false,
      webhookId: '',
      error: 'Message or submission not found',
    };
  }

  if (!message.submission.isFederated) {
    return {
      success: false,
      webhookId: '',
      error: 'Submission is not federated',
    };
  }

  // Only send webhook for organizer messages
  if (message.senderType !== 'ORGANIZER') {
    return {
      success: false,
      webhookId: '',
      error: 'Only organizer messages trigger webhooks',
    };
  }

  const data: MessageWebhookData = {
    messageId: message.id,
    submissionId: message.submissionId,
    subject: message.subject || undefined,
    body: message.body,
    senderType: 'organizer',
  };

  return sendWebhook(message.submission.eventId, 'message.sent', data);
}

/**
 * Send submission.message_read webhook when a message is marked as read.
 */
export async function sendMessageReadWebhook(
  messageId: string
): Promise<WebhookResult> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      submission: {
        select: {
          id: true,
          eventId: true,
          isFederated: true,
        },
      },
    },
  });

  if (!message || !message.submission) {
    return {
      success: false,
      webhookId: '',
      error: 'Message or submission not found',
    };
  }

  if (!message.submission.isFederated) {
    return {
      success: false,
      webhookId: '',
      error: 'Submission is not federated',
    };
  }

  const data: MessageWebhookData = {
    messageId: message.id,
    submissionId: message.submissionId,
    body: '', // Read notifications don't need full body
    senderType: message.senderType === 'ORGANIZER' ? 'organizer' : 'speaker',
  };

  return sendWebhook(message.submission.eventId, 'message.read', data);
}

// All exports are declared inline with their definitions above
