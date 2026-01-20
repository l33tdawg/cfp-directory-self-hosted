/**
 * Site Settings API
 * 
 * GET /api/settings - Get site settings
 * PATCH /api/settings - Update site settings
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getAuthenticatedUser, canManageSettings, getSiteSettings } from '@/lib/api/auth';
import {
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  handleApiError,
} from '@/lib/api/response';
import { updateSiteSettingsSchema, updateFederationSettingsSchema } from '@/lib/validations/settings';

// ============================================================================
// GET /api/settings - Get site settings
// ============================================================================

export async function GET() {
  try {
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    // Anyone authenticated can view basic settings
    const settings = await getSiteSettings();
    
    // Only admins can see federation details
    if (!canManageSettings(user)) {
      return successResponse({
        id: settings.id,
        name: settings.name,
        description: settings.description,
        websiteUrl: settings.websiteUrl,
        logoUrl: settings.logoUrl,
        contactEmail: settings.contactEmail,
        supportUrl: settings.supportUrl,
        // Hide federation details from non-admins
        federationEnabled: settings.federationEnabled,
      });
    }
    
    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// PATCH /api/settings - Update site settings
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const { user, error } = await getAuthenticatedUser();
    
    if (!user) {
      return unauthorizedResponse(error);
    }
    
    if (!canManageSettings(user)) {
      return forbiddenResponse('Only administrators can modify settings');
    }
    
    const body = await request.json();
    
    // Check if updating federation or general settings
    if ('federationEnabled' in body || 'federationLicenseKey' in body) {
      const data = updateFederationSettingsSchema.parse(body);
      
      const settings = await prisma.siteSettings.update({
        where: { id: 'default' },
        data: {
          federationEnabled: data.federationEnabled,
          ...(data.federationLicenseKey !== undefined && {
            federationLicenseKey: data.federationLicenseKey || null,
          }),
        },
      });
      
      return successResponse(settings);
    }
    
    // General settings update
    const data = updateSiteSettingsSchema.parse(body);
    
    const settings = await prisma.siteSettings.update({
      where: { id: 'default' },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.websiteUrl !== undefined && { websiteUrl: data.websiteUrl || null }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
        ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
        ...(data.supportUrl !== undefined && { supportUrl: data.supportUrl || null }),
      },
    });
    
    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
