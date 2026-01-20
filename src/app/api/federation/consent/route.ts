/**
 * Federation Consent API
 * 
 * GET /api/federation/consent?token=xxx&speaker=yyy&event=zzz
 * 
 * This endpoint is the landing page for federated speakers who have
 * granted consent on cfp.directory. It validates the consent token,
 * fetches the speaker's profile, and syncs their data locally.
 * 
 * Query Parameters:
 * - token: The consent token from cfp.directory (required)
 * - speaker: The cfp.directory speaker ID (required)
 * - event: The federated event ID (required)
 * - return_url: Optional URL to redirect after successful sync
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import {
  isFederationActive,
  validateConsentToken,
  syncFederatedSpeaker,
  getFederationState,
} from '@/lib/federation';

// Validation schema for query parameters
const consentParamsSchema = z.object({
  token: z.string().min(1, 'Consent token is required'),
  speaker: z.string().min(1, 'Speaker ID is required'),
  event: z.string().min(1, 'Event ID is required'),
  return_url: z.string().url().optional(),
});

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
  status: number = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...details,
      },
    },
    { status }
  );
}

/**
 * GET - Process federated speaker consent
 * 
 * This endpoint:
 * 1. Validates that federation is enabled and active
 * 2. Validates the consent token with cfp.directory
 * 3. Fetches the speaker's profile
 * 4. Creates/updates the local FederatedSpeaker record
 * 5. Downloads materials if consented
 * 6. Redirects or returns success
 */
export async function GET(request: Request) {
  try {
    // Check if federation is active
    const federationState = await getFederationState();
    
    if (!federationState.isEnabled) {
      return errorResponse(
        'FEDERATION_DISABLED',
        'Federation is not enabled on this instance',
        503
      );
    }

    if (!federationState.isValid) {
      return errorResponse(
        'FEDERATION_INVALID',
        'Federation license is invalid or expired',
        503
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const params = {
      token: url.searchParams.get('token'),
      speaker: url.searchParams.get('speaker'),
      event: url.searchParams.get('event'),
      return_url: url.searchParams.get('return_url'),
    };

    // Validate parameters
    const parseResult = consentParamsSchema.safeParse(params);
    
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      return errorResponse(
        'INVALID_PARAMS',
        'Missing or invalid query parameters',
        400,
        { errors }
      );
    }

    const { token, speaker: speakerId, event: eventId, return_url } = parseResult.data;

    // Verify the event is federated on this instance
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { federatedEventId: eventId },
          { id: eventId },
        ],
        isFederated: true,
      },
    });

    if (!event) {
      return errorResponse(
        'EVENT_NOT_FOUND',
        'The specified event is not registered for federation on this instance',
        404
      );
    }

    // Validate the consent token with cfp.directory
    const validationResult = await validateConsentToken(token, speakerId);

    if (!validationResult.valid) {
      const statusMap: Record<string, number> = {
        INVALID_TOKEN: 401,
        EXPIRED: 401,
        REVOKED: 403,
        NOT_FOUND: 404,
        API_ERROR: 502,
      };

      return errorResponse(
        validationResult.errorCode || 'VALIDATION_FAILED',
        validationResult.error || 'Failed to validate consent token',
        statusMap[validationResult.errorCode || 'VALIDATION_FAILED'] || 400
      );
    }

    // Sync the speaker's profile
    const syncResult = await syncFederatedSpeaker({
      consentToken: token,
      speakerId,
      federatedEventId: event.federatedEventId || eventId,
      downloadMaterials: true,
    });

    if (!syncResult.success) {
      return errorResponse(
        syncResult.errorCode || 'SYNC_FAILED',
        syncResult.error || 'Failed to sync speaker profile',
        500
      );
    }

    // Success! Return the result
    const response = {
      success: true,
      message: 'Speaker profile synced successfully',
      data: {
        federatedSpeakerId: syncResult.federatedSpeakerId,
        eventId: event.id,
        eventName: event.name,
        eventSlug: event.slug,
        scopes: validationResult.scopes,
        materialsDownloaded: syncResult.materialsDownloaded || 0,
        coSpeakersProcessed: syncResult.coSpeakersProcessed || 0,
      },
    };

    // If a return URL is provided, redirect there
    if (return_url) {
      const redirectUrl = new URL(return_url);
      redirectUrl.searchParams.set('status', 'success');
      redirectUrl.searchParams.set('speaker', syncResult.federatedSpeakerId || '');
      redirectUrl.searchParams.set('event', event.id);
      
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Otherwise return JSON response
    return apiResponse(response);

  } catch (error) {
    console.error('Consent processing error:', error);

    return errorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred while processing consent',
      500
    );
  }
}

/**
 * POST - Refresh consent (re-sync speaker profile)
 * 
 * This can be called to re-sync a speaker's profile after they
 * update their information on cfp.directory.
 */
export async function POST(request: Request) {
  try {
    // Check if federation is active
    if (!await isFederationActive()) {
      return errorResponse(
        'FEDERATION_DISABLED',
        'Federation is not enabled or license is invalid',
        503
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));

    const { token, speakerId, eventId } = body;

    if (!token || !speakerId || !eventId) {
      return errorResponse(
        'INVALID_REQUEST',
        'Missing required fields: token, speakerId, eventId',
        400
      );
    }

    // Verify the event is federated
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { federatedEventId: eventId },
          { id: eventId },
        ],
        isFederated: true,
      },
    });

    if (!event) {
      return errorResponse(
        'EVENT_NOT_FOUND',
        'Event not found or not federated',
        404
      );
    }

    // Validate token and sync
    const validationResult = await validateConsentToken(token, speakerId);

    if (!validationResult.valid) {
      return errorResponse(
        validationResult.errorCode || 'VALIDATION_FAILED',
        validationResult.error || 'Invalid consent token',
        401
      );
    }

    const syncResult = await syncFederatedSpeaker({
      consentToken: token,
      speakerId,
      federatedEventId: event.federatedEventId || eventId,
      downloadMaterials: true,
    });

    if (!syncResult.success) {
      return errorResponse(
        syncResult.errorCode || 'SYNC_FAILED',
        syncResult.error || 'Failed to sync speaker profile',
        500
      );
    }

    return apiResponse({
      success: true,
      message: 'Speaker profile refreshed',
      data: {
        federatedSpeakerId: syncResult.federatedSpeakerId,
        materialsDownloaded: syncResult.materialsDownloaded,
        coSpeakersProcessed: syncResult.coSpeakersProcessed,
      },
    });

  } catch (error) {
    console.error('Consent refresh error:', error);
    return errorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    );
  }
}

// Disallow other methods
export async function PUT() {
  return errorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}

export async function DELETE() {
  return errorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
}
