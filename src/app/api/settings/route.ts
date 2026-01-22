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
import { validateLicense, clearCache } from '@/lib/federation';

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
    
    // Only admins can see federation details and registration settings
    if (!canManageSettings(user)) {
      return successResponse({
        id: settings.id,
        name: settings.name,
        description: settings.description,
        websiteUrl: settings.websiteUrl,
        logoUrl: settings.logoUrl,
        contactEmail: settings.contactEmail,
        supportUrl: settings.supportUrl,
        // Hide federation details and admin settings from non-admins
        federationEnabled: settings.federationEnabled,
      });
    }
    
    // SECURITY: Even for admins, filter out highly sensitive fields
    // that should never be exposed via API (encrypted private key, raw secrets)
    // These should only be managed via environment variables or direct DB access
    return successResponse({
      id: settings.id,
      name: settings.name,
      description: settings.description,
      websiteUrl: settings.websiteUrl,
      logoUrl: settings.logoUrl,
      contactEmail: settings.contactEmail,
      supportUrl: settings.supportUrl,
      landingPageContent: settings.landingPageContent,
      landingPageSections: settings.landingPageSections,
      // Registration settings
      allowPublicSignup: settings.allowPublicSignup,
      // Federation - show status but mask sensitive values
      federationEnabled: settings.federationEnabled,
      federationActivatedAt: settings.federationActivatedAt,
      federationFeatures: settings.federationFeatures,
      federationWarnings: settings.federationWarnings,
      federationLastHeartbeat: settings.federationLastHeartbeat,
      // Show if license key is configured, but not the actual value
      federationLicenseKeyConfigured: !!settings.federationLicenseKey,
      // Don't expose: federationLicenseKey, federationPublicKey (encrypted private key),
      // federationPrivateKeyEncrypted, or any other raw secrets
    });
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
      
      // If a new license key is provided, validate it immediately
      let licenseValidation = null;
      if (data.federationLicenseKey && data.federationLicenseKey.trim()) {
        // Clear cache to force fresh validation
        clearCache();
        
        // Validate the license with cfp.directory
        licenseValidation = await validateLicense();
        
        if (!licenseValidation.valid) {
          // Return error if license is invalid
          return successResponse({
            success: false,
            error: 'Invalid license key',
            message: licenseValidation.error || 'The license key could not be validated',
            validation: {
              valid: false,
              error: licenseValidation.error,
            },
          });
        }
      }
      
      // Update the settings
      const settings = await prisma.siteSettings.update({
        where: { id: 'default' },
        data: {
          federationEnabled: data.federationEnabled,
          ...(data.federationLicenseKey !== undefined && {
            federationLicenseKey: data.federationLicenseKey || null,
          }),
          // If license was validated successfully, store activation time and details
          ...(licenseValidation?.valid && {
            federationActivatedAt: new Date(),
            federationPublicKey: licenseValidation.publicKey || null,
            federationFeatures: licenseValidation.license?.features 
              ? JSON.parse(JSON.stringify(licenseValidation.license.features)) 
              : null,
            federationWarnings: licenseValidation.warnings 
              ? JSON.parse(JSON.stringify(licenseValidation.warnings)) 
              : null,
          }),
          // If license key is being removed, clear activation data
          ...(data.federationLicenseKey === '' && {
            federationActivatedAt: null,
            federationPublicKey: null,
            federationFeatures: null,
            federationWarnings: null,
          }),
        },
      });
      
      // SECURITY: Return success but filter out sensitive fields
      return successResponse({
        id: settings.id,
        name: settings.name,
        federationEnabled: settings.federationEnabled,
        federationActivatedAt: settings.federationActivatedAt,
        federationFeatures: settings.federationFeatures,
        federationWarnings: settings.federationWarnings,
        federationLicenseKeyConfigured: !!settings.federationLicenseKey,
        validation: licenseValidation ? {
          valid: licenseValidation.valid,
          license: licenseValidation.license,
          warnings: licenseValidation.warnings,
        } : undefined,
      });
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
        ...(data.landingPageContent !== undefined && { landingPageContent: data.landingPageContent || null }),
        ...(data.landingPageSections !== undefined && { landingPageSections: data.landingPageSections || null }),
        ...(data.allowPublicSignup !== undefined && { allowPublicSignup: data.allowPublicSignup }),
      },
      // SECURITY: Only select non-sensitive fields
      select: {
        id: true,
        name: true,
        description: true,
        websiteUrl: true,
        logoUrl: true,
        contactEmail: true,
        supportUrl: true,
        landingPageContent: true,
        landingPageSections: true,
        allowPublicSignup: true,
        federationEnabled: true,
      },
    });
    
    return successResponse(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
