/**
 * Event Federation API Routes
 * 
 * GET /api/events/[id]/federation - Get event federation status
 * POST /api/events/[id]/federation - Enable federation for event
 * DELETE /api/events/[id]/federation - Disable federation for event
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageEvents } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  handleApiError,
} from '@/lib/api/response';
import {
  getFederationState,
  registerEvent,
  unregisterEvent,
  FederationApiError,
} from '@/lib/federation';
import { config } from '@/lib/env';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// GET /api/events/[id]/federation - Get event federation status
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    if (!canManageEvents(user)) {
      return forbiddenResponse('Only organizers can view federation settings');
    }
    
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isFederated: true,
        federatedEventId: true,
        webhookSecret: true,
      },
    });
    
    if (!event) {
      return notFoundResponse('Event');
    }
    
    // Get overall federation state
    const federationState = await getFederationState();
    
    return successResponse({
      eventId: event.id,
      eventName: event.name,
      isFederated: event.isFederated,
      federatedEventId: event.federatedEventId,
      hasWebhookSecret: Boolean(event.webhookSecret),
      federationAvailable: federationState.isEnabled && federationState.isValid,
      federationState: {
        isEnabled: federationState.isEnabled,
        isConfigured: federationState.isConfigured,
        isValid: federationState.isValid,
        license: federationState.license ? {
          tier: federationState.license.tier,
          features: federationState.license.features,
        } : null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// POST /api/events/[id]/federation - Enable federation for event
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    if (!canManageEvents(user)) {
      return forbiddenResponse('Only organizers can enable federation');
    }
    
    // Check if federation is available
    const federationState = await getFederationState();
    if (!federationState.isEnabled || !federationState.isValid) {
      return badRequestResponse(
        'Federation is not available. Please configure a valid license key in Settings.'
      );
    }
    
    // Check if federatedEvents feature is enabled
    if (!federationState.license?.features?.federatedEvents) {
      return badRequestResponse(
        'Your license does not include federated events. Please upgrade your license.'
      );
    }
    
    // Get the event
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        tracks: { select: { name: true, description: true } },
        formats: { select: { name: true, durationMin: true } },
      },
    });
    
    if (!event) {
      return notFoundResponse('Event');
    }
    
    // Check if already federated
    if (event.isFederated && event.federatedEventId) {
      return badRequestResponse('Event is already federated');
    }
    
    // Build callback URL for webhooks
    const callbackUrl = `${config.app.url}/api/federation/incoming-webhook`;
    
    // Register the event with cfp.directory
    const result = await registerEvent(
      {
        name: event.name,
        slug: event.slug,
        description: event.description || undefined,
        websiteUrl: event.websiteUrl || undefined,
        location: event.location || undefined,
        isVirtual: event.isVirtual,
        startDate: event.startDate?.toISOString(),
        endDate: event.endDate?.toISOString(),
        cfpOpensAt: event.cfpOpensAt?.toISOString(),
        cfpClosesAt: event.cfpClosesAt?.toISOString(),
        tracks: event.tracks.map(t => ({
          name: t.name,
          description: t.description || undefined,
        })),
        formats: event.formats.map(f => ({
          name: f.name,
          durationMin: f.durationMin,
        })),
      },
      callbackUrl
    );
    
    if (!result.success || !result.federatedEventId) {
      return badRequestResponse(result.error || 'Failed to register event with CFP Directory');
    }
    
    // Update the event with federation info
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        isFederated: true,
        federatedEventId: result.federatedEventId,
        webhookSecret: result.webhookSecret,
      },
      select: {
        id: true,
        name: true,
        isFederated: true,
        federatedEventId: true,
      },
    });
    
    return successResponse({
      message: 'Event successfully federated with CFP Directory',
      event: updatedEvent,
    });
  } catch (error) {
    if (error instanceof FederationApiError) {
      return badRequestResponse(`Federation API error: ${error.message}`);
    }
    return handleApiError(error);
  }
}

// ============================================================================
// DELETE /api/events/[id]/federation - Disable federation for event
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    if (!canManageEvents(user)) {
      return forbiddenResponse('Only organizers can disable federation');
    }
    
    // Get the event
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isFederated: true,
        federatedEventId: true,
      },
    });
    
    if (!event) {
      return notFoundResponse('Event');
    }
    
    // Check if federated
    if (!event.isFederated || !event.federatedEventId) {
      return badRequestResponse('Event is not federated');
    }
    
    // Unregister from cfp.directory
    try {
      const result = await unregisterEvent(event.federatedEventId);
      
      if (!result.success) {
        console.warn(`Warning: Could not unregister event from CFP Directory: ${result.error}`);
        // Continue anyway - we'll clear local federation state
      }
    } catch (unregisterError) {
      // Log but continue - the remote might already be gone
      console.warn('Warning: Error unregistering event:', unregisterError);
    }
    
    // Clear federation state locally
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        isFederated: false,
        federatedEventId: null,
        webhookSecret: null,
      },
      select: {
        id: true,
        name: true,
        isFederated: true,
      },
    });
    
    return successResponse({
      message: 'Event federation disabled',
      event: updatedEvent,
    });
  } catch (error) {
    if (error instanceof FederationApiError) {
      return badRequestResponse(`Federation API error: ${error.message}`);
    }
    return handleApiError(error);
  }
}
