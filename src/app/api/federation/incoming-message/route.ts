/**
 * Federation Incoming Message API
 * 
 * POST /api/federation/incoming-message
 * 
 * Receives messages from cfp.directory when a federated speaker
 * replies to an organizer's message. All requests must be signed
 * with the webhook secret.
 * 
 * SECURITY: This endpoint includes rate limiting and webhook idempotency
 * to prevent DoS and replay attacks.
 */

import { NextResponse } from 'next/server';
import {
  verifyIncomingWebhook,
  handleIncomingMessage,
  handleConsentRevocation,
} from '@/lib/federation/webhook-receiver';
import { isFederationActive } from '@/lib/federation';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import type { MessageWebhookData } from '@/lib/federation/types';

// =============================================================================
// Webhook Idempotency Store
// =============================================================================

/**
 * In-memory store for processed webhook IDs
 * Prevents replay attacks within the timestamp window
 * 
 * For production with multiple instances, consider using Redis
 */
const processedWebhooks = new Map<string, number>();

/**
 * How long to remember processed webhook IDs (5 minutes)
 * Should be longer than the replay window in webhook-receiver
 */
const WEBHOOK_IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

/**
 * Cleanup interval for old webhook IDs (every minute)
 */
const CLEANUP_INTERVAL_MS = 60 * 1000;

// Cleanup old webhook IDs periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [id, timestamp] of processedWebhooks.entries()) {
      if (now - timestamp > WEBHOOK_IDEMPOTENCY_TTL_MS) {
        processedWebhooks.delete(id);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Check if a webhook has already been processed
 */
function isWebhookProcessed(webhookId: string): boolean {
  return processedWebhooks.has(webhookId);
}

/**
 * Mark a webhook as processed
 */
function markWebhookProcessed(webhookId: string): void {
  processedWebhooks.set(webhookId, Date.now());
}

/**
 * Standard API response helper
 */
function apiResponse(
  data: Record<string, unknown>,
  status: number = 200
) {
  return NextResponse.json(data, { status });
}

/**
 * Error response helper
 */
function errorResponse(
  code: string,
  message: string,
  status: number = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

/**
 * POST - Receive incoming webhook from cfp.directory
 * 
 * This endpoint handles:
 * - message.sent - Speaker replied to organizer message
 * - speaker.consent_revoked - Speaker revoked their consent
 * 
 * SECURITY: Rate limiting and idempotency checks are applied to prevent
 * DoS attacks and duplicate processing.
 */
export async function POST(request: Request) {
  try {
    // SECURITY: Apply rate limiting early to prevent DoS
    // Even invalid requests consume resources (JSON parsing, signature verification)
    const rateLimited = rateLimitMiddleware(request, 'webhook');
    if (rateLimited) {
      return rateLimited;
    }
    
    // Check if federation is active
    if (!await isFederationActive()) {
      return errorResponse(
        'FEDERATION_DISABLED',
        'Federation is not enabled on this instance',
        503
      );
    }

    // Verify the webhook signature
    const verification = await verifyIncomingWebhook(request.clone());

    if (!verification.valid || !verification.payload) {
      console.warn('[Webhook] Invalid incoming webhook:', verification.error);
      return errorResponse(
        'INVALID_SIGNATURE',
        verification.error || 'Failed to verify webhook signature',
        401
      );
    }

    const { payload } = verification;
    const webhookId = request.headers.get('X-Webhook-Id') || payload.id;
    
    // SECURITY: Idempotency check - prevent duplicate processing
    // This protects against replayed webhooks within the timestamp window
    if (webhookId && isWebhookProcessed(webhookId)) {
      console.log(`[Webhook] Duplicate webhook ${webhookId} - already processed`);
      return apiResponse({
        success: true,
        message: 'Webhook already processed',
        duplicate: true,
      });
    }

    console.log(`[Webhook] Processing ${payload.type} (${webhookId})`);

    // Handle different webhook types
    switch (payload.type) {
      case 'message.sent': {
        // Speaker sent a message (reply)
        const messageData = payload.data as MessageWebhookData;
        
        // Only process speaker messages
        if (messageData.senderType !== 'speaker') {
          return apiResponse({
            success: true,
            message: 'Ignored non-speaker message',
          });
        }

        const result = await handleIncomingMessage(messageData);

        if (!result.success) {
          console.error(`[Webhook] Failed to handle message: ${result.error}`);
          return errorResponse(
            'MESSAGE_FAILED',
            result.error || 'Failed to process message',
            500
          );
        }

        // Mark webhook as processed for idempotency
        if (webhookId) markWebhookProcessed(webhookId);

        return apiResponse({
          success: true,
          messageId: result.messageId,
        });
      }

      case 'speaker.consent_revoked': {
        // Speaker revoked their consent
        const revocationData = payload.data as {
          speakerId: string;
          deletionDeadline: string;
        };

        const result = await handleConsentRevocation(
          revocationData.speakerId,
          revocationData.deletionDeadline
        );

        if (!result.success) {
          console.error(`[Webhook] Failed to handle consent revocation: ${result.error}`);
          return errorResponse(
            'REVOCATION_FAILED',
            result.error || 'Failed to process consent revocation',
            500
          );
        }

        // Mark webhook as processed for idempotency
        if (webhookId) markWebhookProcessed(webhookId);

        return apiResponse({
          success: true,
          message: 'Consent revocation processed',
        });
      }

      case 'speaker.profile_updated': {
        // Speaker updated their profile on cfp.directory
        // This could trigger a re-sync, but for now we just acknowledge
        console.log(`[Webhook] Speaker profile update notification received`);
        
        // Mark webhook as processed for idempotency
        if (webhookId) markWebhookProcessed(webhookId);
        
        return apiResponse({
          success: true,
          message: 'Profile update acknowledged',
        });
      }

      default:
        console.warn(`[Webhook] Unknown webhook type: ${payload.type}`);
        return apiResponse({
          success: true,
          message: `Unknown webhook type: ${payload.type}`,
        });
    }

  } catch (error) {
    console.error('Incoming message error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}

// Only POST method is allowed
export async function GET() {
  return errorResponse('METHOD_NOT_ALLOWED', 'Use POST method', 405);
}

export async function PUT() {
  return errorResponse('METHOD_NOT_ALLOWED', 'Use POST method', 405);
}

export async function DELETE() {
  return errorResponse('METHOD_NOT_ALLOWED', 'Use POST method', 405);
}
