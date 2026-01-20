/**
 * Federation Incoming Message API
 * 
 * POST /api/federation/incoming-message
 * 
 * Receives messages from cfp.directory when a federated speaker
 * replies to an organizer's message. All requests must be signed
 * with the webhook secret.
 */

import { NextResponse } from 'next/server';
import {
  verifyIncomingWebhook,
  handleIncomingMessage,
  handleConsentRevocation,
} from '@/lib/federation/webhook-receiver';
import { isFederationActive } from '@/lib/federation';
import type { MessageWebhookData } from '@/lib/federation/types';

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
 */
export async function POST(request: Request) {
  try {
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

        return apiResponse({
          success: true,
          message: 'Consent revocation processed',
        });
      }

      case 'speaker.profile_updated': {
        // Speaker updated their profile on cfp.directory
        // This could trigger a re-sync, but for now we just acknowledge
        console.log(`[Webhook] Speaker profile update notification received`);
        
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
