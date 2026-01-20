/**
 * Event Validation Schemas
 * 
 * Zod schemas for validating event-related data.
 * Simplified for single-organization model.
 */

import { z } from 'zod';

// ============================================================================
// Event Schemas
// ============================================================================

export const createEventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(200),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(5000).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  location: z.string().max(500).optional(),
  isVirtual: z.boolean().default(false),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('UTC'),
  cfpOpensAt: z.string().datetime().optional(),
  cfpClosesAt: z.string().datetime().optional(),
  cfpDescription: z.string().max(10000).optional(),
  isPublished: z.boolean().default(false),
});

export const updateEventSchema = createEventSchema.partial().omit({ slug: true });

export const eventFiltersSchema = z.object({
  isPublished: z.coerce.boolean().optional(),
  cfpOpen: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================================
// Track Schemas
// ============================================================================

export const createTrackSchema = z.object({
  name: z.string().min(1, 'Track name is required').max(100),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional(),
});

export const updateTrackSchema = createTrackSchema.partial();

// ============================================================================
// Format Schemas
// ============================================================================

export const createFormatSchema = z.object({
  name: z.string().min(1, 'Format name is required').max(100),
  durationMin: z.number().int().min(5).max(480),
});

export const updateFormatSchema = createFormatSchema.partial();

// ============================================================================
// Review Team Schemas
// ============================================================================

export const addReviewerSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['LEAD', 'REVIEWER']).default('REVIEWER'),
});

export const updateReviewerRoleSchema = z.object({
  role: z.enum(['LEAD', 'REVIEWER']),
});

// ============================================================================
// Types
// ============================================================================

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventFilters = z.infer<typeof eventFiltersSchema>;
export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type UpdateTrackInput = z.infer<typeof updateTrackSchema>;
export type CreateFormatInput = z.infer<typeof createFormatSchema>;
export type UpdateFormatInput = z.infer<typeof updateFormatSchema>;
export type AddReviewerInput = z.infer<typeof addReviewerSchema>;
