/**
 * Webhook Dead Letter Queue (DLQ)
 * 
 * Handles failed webhook deliveries by:
 * 1. Storing failed webhooks in the database
 * 2. Providing retry mechanism with exponential backoff
 * 3. Moving permanently failed webhooks to dead letter storage
 * 
 * This ensures webhook reliability even during temporary outages.
 */

import { prisma } from '@/lib/db/prisma';
import type { WebhookEventType, WebhookPayload } from './types';

// =============================================================================
// Constants
// =============================================================================

// Maximum retry attempts before moving to DLQ
export const MAX_RETRY_ATTEMPTS = 5;

// Base delay for exponential backoff (in milliseconds)
export const BASE_RETRY_DELAY_MS = 1000;

// Maximum delay between retries (1 hour)
export const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

// Time after which a webhook is considered abandoned (7 days)
export const ABANDONED_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

// =============================================================================
// Types
// =============================================================================

export interface FailedWebhook {
  id: string;
  eventId: string;
  type: WebhookEventType;
  payload: string; // JSON stringified payload
  webhookUrl: string;
  attempt: number;
  lastError: string;
  lastAttemptAt: Date;
  nextRetryAt: Date | null;
  status: 'pending_retry' | 'dead_letter' | 'success';
  createdAt: Date;
}

export interface DLQStats {
  pendingRetry: number;
  deadLetter: number;
  successfulRetries: number;
  oldestPending: Date | null;
}

// =============================================================================
// In-Memory Queue (for environments without database)
// =============================================================================

// In-memory storage for failed webhooks (fallback)
const inMemoryQueue: Map<string, FailedWebhook> = new Map();

// =============================================================================
// Queue Operations
// =============================================================================

/**
 * Add a failed webhook to the queue for retry.
 */
export async function queueFailedWebhook<T>(
  eventId: string,
  type: WebhookEventType,
  payload: WebhookPayload<T>,
  webhookUrl: string,
  error: string
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date();
  const nextRetry = calculateNextRetryTime(1);
  
  const failedWebhook: FailedWebhook = {
    id,
    eventId,
    type,
    payload: JSON.stringify(payload),
    webhookUrl,
    attempt: 1,
    lastError: error.substring(0, 1000), // Limit error message size
    lastAttemptAt: now,
    nextRetryAt: nextRetry,
    status: 'pending_retry',
    createdAt: now,
  };
  
  try {
    // Try to store in database
    await prisma.webhookQueue.create({
      data: {
        id,
        eventId,
        webhookType: type,
        payload: failedWebhook.payload,
        webhookUrl,
        attempt: 1,
        lastError: failedWebhook.lastError,
        lastAttemptAt: now,
        nextRetryAt: nextRetry,
        status: 'pending_retry',
      },
    });
  } catch (dbError) {
    // Fallback to in-memory queue if database fails
    console.warn('Failed to store webhook in database, using in-memory queue:', dbError);
    inMemoryQueue.set(id, failedWebhook);
  }
  
  console.log(`[DLQ] Queued failed webhook ${id} for retry (type: ${type}, event: ${eventId})`);
  
  return id;
}

/**
 * Update a webhook after a retry attempt.
 */
export async function updateWebhookAttempt(
  webhookId: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    const webhook = await prisma.webhookQueue.findUnique({
      where: { id: webhookId },
    });
    
    if (!webhook) {
      // Check in-memory queue
      const inMemory = inMemoryQueue.get(webhookId);
      if (inMemory) {
        if (success) {
          inMemoryQueue.delete(webhookId);
        } else {
          inMemory.attempt++;
          inMemory.lastAttemptAt = new Date();
          inMemory.lastError = error || 'Unknown error';
          
          if (inMemory.attempt >= MAX_RETRY_ATTEMPTS) {
            inMemory.status = 'dead_letter';
            inMemory.nextRetryAt = null;
          } else {
            inMemory.nextRetryAt = calculateNextRetryTime(inMemory.attempt);
          }
        }
      }
      return;
    }
    
    const newAttempt = webhook.attempt + 1;
    const shouldDeadLetter = !success && newAttempt >= MAX_RETRY_ATTEMPTS;
    
    await prisma.webhookQueue.update({
      where: { id: webhookId },
      data: {
        attempt: newAttempt,
        lastAttemptAt: new Date(),
        lastError: success ? null : (error || 'Unknown error').substring(0, 1000),
        status: success ? 'success' : (shouldDeadLetter ? 'dead_letter' : 'pending_retry'),
        nextRetryAt: success || shouldDeadLetter ? null : calculateNextRetryTime(newAttempt),
      },
    });
    
    if (success) {
      console.log(`[DLQ] Webhook ${webhookId} delivered successfully on attempt ${newAttempt}`);
    } else if (shouldDeadLetter) {
      console.log(`[DLQ] Webhook ${webhookId} moved to dead letter after ${newAttempt} attempts`);
    } else {
      console.log(`[DLQ] Webhook ${webhookId} scheduled for retry (attempt ${newAttempt + 1})`);
    }
  } catch (dbError) {
    console.error('Failed to update webhook attempt:', dbError);
  }
}

/**
 * Get webhooks that are due for retry.
 */
export async function getWebhooksForRetry(limit: number = 10): Promise<FailedWebhook[]> {
  try {
    const webhooks = await prisma.webhookQueue.findMany({
      where: {
        status: 'pending_retry',
        nextRetryAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        nextRetryAt: 'asc',
      },
      take: limit,
    });
    
    return webhooks.map(w => ({
      id: w.id,
      eventId: w.eventId,
      type: w.webhookType as WebhookEventType,
      payload: w.payload,
      webhookUrl: w.webhookUrl,
      attempt: w.attempt,
      lastError: w.lastError || '',
      lastAttemptAt: w.lastAttemptAt,
      nextRetryAt: w.nextRetryAt,
      status: w.status as FailedWebhook['status'],
      createdAt: w.createdAt,
    }));
  } catch (dbError) {
    console.warn('Failed to get webhooks from database, checking in-memory queue:', dbError);
    
    // Fallback to in-memory queue
    const now = new Date();
    const ready: FailedWebhook[] = [];
    
    for (const webhook of inMemoryQueue.values()) {
      if (
        webhook.status === 'pending_retry' &&
        webhook.nextRetryAt &&
        webhook.nextRetryAt <= now
      ) {
        ready.push(webhook);
        if (ready.length >= limit) break;
      }
    }
    
    return ready;
  }
}

/**
 * Get dead letter webhooks.
 */
export async function getDeadLetterWebhooks(limit: number = 50): Promise<FailedWebhook[]> {
  try {
    const webhooks = await prisma.webhookQueue.findMany({
      where: {
        status: 'dead_letter',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
    
    return webhooks.map(w => ({
      id: w.id,
      eventId: w.eventId,
      type: w.webhookType as WebhookEventType,
      payload: w.payload,
      webhookUrl: w.webhookUrl,
      attempt: w.attempt,
      lastError: w.lastError || '',
      lastAttemptAt: w.lastAttemptAt,
      nextRetryAt: null,
      status: 'dead_letter' as const,
      createdAt: w.createdAt,
    }));
  } catch (dbError) {
    console.warn('Failed to get dead letter webhooks from database:', dbError);
    
    return Array.from(inMemoryQueue.values()).filter(w => w.status === 'dead_letter');
  }
}

/**
 * Manually retry a dead letter webhook.
 */
export async function retryDeadLetterWebhook(webhookId: string): Promise<void> {
  try {
    await prisma.webhookQueue.update({
      where: { id: webhookId },
      data: {
        status: 'pending_retry',
        nextRetryAt: new Date(),
        attempt: 0, // Reset attempt count
      },
    });
    
    console.log(`[DLQ] Dead letter webhook ${webhookId} queued for manual retry`);
  } catch (dbError) {
    const inMemory = inMemoryQueue.get(webhookId);
    if (inMemory) {
      inMemory.status = 'pending_retry';
      inMemory.nextRetryAt = new Date();
      inMemory.attempt = 0;
    }
  }
}

/**
 * Delete a webhook from the queue.
 */
export async function deleteWebhook(webhookId: string): Promise<void> {
  try {
    await prisma.webhookQueue.delete({
      where: { id: webhookId },
    });
  } catch (dbError) {
    inMemoryQueue.delete(webhookId);
  }
  
  console.log(`[DLQ] Deleted webhook ${webhookId}`);
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<DLQStats> {
  try {
    const [pendingRetry, deadLetter, successfulRetries, oldestPending] = await Promise.all([
      prisma.webhookQueue.count({ where: { status: 'pending_retry' } }),
      prisma.webhookQueue.count({ where: { status: 'dead_letter' } }),
      prisma.webhookQueue.count({ where: { status: 'success' } }),
      prisma.webhookQueue.findFirst({
        where: { status: 'pending_retry' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);
    
    return {
      pendingRetry,
      deadLetter,
      successfulRetries,
      oldestPending: oldestPending?.createdAt || null,
    };
  } catch (dbError) {
    // Calculate from in-memory queue
    let pendingRetry = 0;
    let deadLetter = 0;
    let successfulRetries = 0;
    let oldestPending: Date | null = null;
    
    for (const webhook of inMemoryQueue.values()) {
      if (webhook.status === 'pending_retry') {
        pendingRetry++;
        if (!oldestPending || webhook.createdAt < oldestPending) {
          oldestPending = webhook.createdAt;
        }
      } else if (webhook.status === 'dead_letter') {
        deadLetter++;
      } else if (webhook.status === 'success') {
        successfulRetries++;
      }
    }
    
    return { pendingRetry, deadLetter, successfulRetries, oldestPending };
  }
}

/**
 * Clean up old successful and abandoned webhooks.
 */
export async function cleanupOldWebhooks(): Promise<number> {
  const abandonedCutoff = new Date(Date.now() - ABANDONED_THRESHOLD_MS);
  
  try {
    const result = await prisma.webhookQueue.deleteMany({
      where: {
        OR: [
          // Delete successful webhooks older than 24 hours
          {
            status: 'success',
            lastAttemptAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
          // Delete dead letters older than 7 days
          {
            status: 'dead_letter',
            createdAt: {
              lt: abandonedCutoff,
            },
          },
        ],
      },
    });
    
    if (result.count > 0) {
      console.log(`[DLQ] Cleaned up ${result.count} old webhooks`);
    }
    
    return result.count;
  } catch (dbError) {
    // Clean up in-memory queue
    let cleaned = 0;
    for (const [id, webhook] of inMemoryQueue.entries()) {
      if (
        (webhook.status === 'success' && webhook.lastAttemptAt < new Date(Date.now() - 24 * 60 * 60 * 1000)) ||
        (webhook.status === 'dead_letter' && webhook.createdAt < abandonedCutoff)
      ) {
        inMemoryQueue.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate next retry time using exponential backoff.
 */
function calculateNextRetryTime(attempt: number): Date {
  // Exponential backoff: delay = base * 2^(attempt-1)
  const delay = Math.min(
    BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
    MAX_RETRY_DELAY_MS
  );
  
  // Add some jitter (up to 10% of delay)
  const jitter = delay * 0.1 * Math.random();
  
  return new Date(Date.now() + delay + jitter);
}

// =============================================================================
// Exports
// =============================================================================

export {
  queueFailedWebhook,
  updateWebhookAttempt,
  getWebhooksForRetry,
  getDeadLetterWebhooks,
  retryDeadLetterWebhook,
  deleteWebhook,
  getQueueStats,
  cleanupOldWebhooks,
};
