/**
 * Settings Validation Schemas
 * 
 * Zod schemas for validating site settings.
 */

import { z } from 'zod';

// ============================================================================
// Site Settings Schemas
// ============================================================================

export const updateSiteSettingsSchema = z.object({
  name: z.string().min(1, 'Site name is required').max(200).optional(),
  description: z.string().max(2000).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  supportUrl: z.string().url().optional().or(z.literal('')),
});

export const updateFederationSettingsSchema = z.object({
  federationEnabled: z.boolean(),
  federationLicenseKey: z.string().optional().or(z.literal('')),
});

// ============================================================================
// User Management Schemas
// ============================================================================

export const updateUserRoleSchema = z.object({
  role: z.enum(['USER', 'REVIEWER', 'ORGANIZER', 'ADMIN']),
});

// ============================================================================
// Types
// ============================================================================

export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;
export type UpdateFederationSettingsInput = z.infer<typeof updateFederationSettingsSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
