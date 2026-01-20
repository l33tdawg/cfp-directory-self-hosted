/**
 * Federation Webhook Receiver
 * 
 * Handles incoming webhooks from cfp.directory, including:
 * - Signature verification (HMAC-SHA256)
 * - Incoming message handling
 * - Consent revocation handling
 * 
 * Security: All incoming webhooks must be verified before processing.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { WebhookEventType, WebhookPayload, MessageWebhookData } from './types';

// =============================================================================
// Types
// =============================================================================

export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  payload?: WebhookPayload<unknown>;
}

export interface IncomingMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verify the HMAC signature of an incoming webhook.
 * 
 * The signature is computed as: HMAC-SHA256(timestamp.payload, secret)
 * 
 * @param payload - The raw request body
 * @param signature - The signature from X-Webhook-Signature header
 * @param timestamp - The timestamp from X-Webhook-Timestamp header
 * @param secret - The webhook secret for this event
 * @returns Whether the signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  try {
    // Parse the signature header (format: sha256=<hex>)
    if (!signature.startsWith('sha256=')) {
      return false;
    }
    
    const providedSignature = signature.slice(7);
    
    // Check timestamp to prevent replay attacks (allow 5 minute window)
    const timestampMs = parseInt(timestamp, 10);
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (isNaN(timestampMs) || Math.abs(now - timestampMs) > fiveMinutes) {
      console.warn('Webhook timestamp out of allowed range:', { timestampMs, now });
      return false;
    }
    
    // Compute expected signature
    const signatureData = `${timestamp}.${payload}`;
    const hmac = createHmac('sha256', secret);
    hmac.update(signatureData);
    const expectedSignature = hmac.digest('hex');
    
    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Extract and verify a webhook request.
 * 
 * @param request - The incoming request
 * @param eventId - The local event ID (to look up webhook secret)
 * @returns Verification result with parsed payload if valid
 */
export async function verifyIncomingWebhook(
  request: Request,
  eventId?: string
): Promise<WebhookVerificationResult> {
  try {
    // Extract headers
    const signature = request.headers.get('X-Webhook-Signature');
    const timestamp = request.headers.get('X-Webhook-Timestamp');
    const webhookId = request.headers.get('X-Webhook-Id');
    
    if (!signature || !timestamp) {
      return {
        valid: false,
        error: 'Missing required webhook headers',
      };
    }
    
    // Get raw body
    const body = await request.text();
    
    if (!body) {
      return {
        valid: false,
        error: 'Empty request body',
      };
    }
    
    // Parse payload to get federatedEventId
    let payload: WebhookPayload<unknown>;
    try {
      payload = JSON.parse(body);
    } catch {
      return {
        valid: false,
        error: 'Invalid JSON payload',
      };
    }
    
    // Get webhook secret for this event
    const targetEventId = eventId || payload.federatedEventId;
    
    if (!targetEventId) {
      return {
        valid: false,
        error: 'No event ID provided',
      };
    }
    
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: targetEventId },
          { federatedEventId: targetEventId },
        ],
        isFederated: true,
      },
      select: {
        id: true,
        webhookSecret: true,
      },
    });
    
    if (!event || !event.webhookSecret) {
      return {
        valid: false,
        error: 'Event not found or not federated',
      };
    }
    
    // Verify signature
    const isValid = verifyWebhookSignature(body, signature, timestamp, event.webhookSecret);
    
    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid webhook signature',
      };
    }
    
    console.log(`[Webhook] Verified incoming webhook ${webhookId} (${payload.type})`);
    
    return {
      valid: true,
      payload,
    };
  } catch (error) {
    console.error('Webhook verification error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

// =============================================================================
// Incoming Message Handler
// =============================================================================

/**
 * Handle an incoming message from a federated speaker.
 * 
 * When a speaker replies to an organizer message via cfp.directory,
 * this function stores the message locally.
 * 
 * @param data - The message webhook data
 * @returns Result of message storage
 */
export async function handleIncomingMessage(
  data: MessageWebhookData
): Promise<IncomingMessageResult> {
  try {
    const { messageId: federatedMessageId, submissionId, subject, body } = data;
    
    // Find the submission by external ID or local ID
    const submission = await prisma.submission.findFirst({
      where: {
        OR: [
          { id: submissionId },
          { externalSubmissionId: submissionId },
        ],
        isFederated: true,
      },
      select: {
        id: true,
        eventId: true,
      },
    });
    
    if (!submission) {
      return {
        success: false,
        error: 'Submission not found',
      };
    }
    
    // Check if we've already received this message (idempotency)
    const existing = await prisma.message.findFirst({
      where: {
        federatedMessageId,
      },
    });
    
    if (existing) {
      // Already processed, return success (idempotent)
      return {
        success: true,
        messageId: existing.id,
      };
    }
    
    // Create the message
    const message = await prisma.message.create({
      data: {
        submissionId: submission.id,
        senderId: null, // Federated speaker, no local user
        senderType: 'SPEAKER',
        subject,
        body,
        federatedMessageId,
      },
    });
    
    console.log(`[Webhook] Stored incoming message ${message.id} from federation`);
    
    return {
      success: true,
      messageId: message.id,
    };
  } catch (error) {
    console.error('Failed to handle incoming message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store message',
    };
  }
}

// =============================================================================
// Consent Revocation Handler
// =============================================================================

/**
 * Handle consent revocation from cfp.directory.
 * 
 * When a speaker revokes their consent on cfp.directory,
 * we need to mark their data for deletion or handle accordingly.
 * 
 * @param speakerId - The cfp.directory speaker ID
 * @param deletionDeadline - Date by which data should be deleted
 */
export async function handleConsentRevocation(
  speakerId: string,
  deletionDeadline: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the federated speaker
    const federatedSpeaker = await prisma.federatedSpeaker.findUnique({
      where: { cfpDirectorySpeakerId: speakerId },
    });
    
    if (!federatedSpeaker) {
      // Speaker not found - they may have never synced
      return { success: true };
    }
    
    // Update the speaker record to mark consent as revoked
    await prisma.federatedSpeaker.update({
      where: { cfpDirectorySpeakerId: speakerId },
      data: {
        consentScopes: [], // Clear all scopes
        updatedAt: new Date(),
      },
    });
    
    console.log(`[Webhook] Marked consent revoked for speaker ${speakerId}. Deletion deadline: ${deletionDeadline}`);
    
    // Note: Actual data deletion should be handled by a scheduled job
    // that checks for speakers with empty consent scopes past the deletion deadline
    
    return { success: true };
  } catch (error) {
    console.error('Failed to handle consent revocation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process revocation',
    };
  }
}

// =============================================================================
// Exports
// =============================================================================

export {
  verifyWebhookSignature,
  verifyIncomingWebhook,
  handleIncomingMessage,
  handleConsentRevocation,
};
