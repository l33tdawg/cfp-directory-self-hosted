/**
 * Event Validation Schemas
 * 
 * Zod schemas for validating event-related data.
 * Enhanced for comprehensive event management.
 */

import { z } from 'zod';

// ============================================================================
// Nested Schemas
// ============================================================================

export const talkFormatSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  durationMin: z.number().int().min(5).max(480),
  sortOrder: z.number().int().optional(),
});

export const reviewCriteriaSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  weight: z.number().int().min(1).max(5),
  sortOrder: z.number().int().optional(),
});

// ============================================================================
// Event Schemas
// ============================================================================

export const createEventSchema = z.object({
  // Basic Info
  name: z.string().min(1, 'Event name is required').max(200),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(), // Optional - will be generated from name if not provided
  description: z.string().max(10000).optional(),
  websiteUrl: z.string().url().optional().or(z.literal('')).nullable(),
  eventType: z.string().default('conference'),
  
  // Location
  location: z.string().max(500).optional(), // Legacy
  venueName: z.string().max(200).optional().nullable(),
  venueAddress: z.string().max(500).optional().nullable(),
  venueCity: z.string().max(100).optional().nullable(),
  country: z.string().max(10).default('US'),
  isVirtual: z.boolean().default(false),
  virtualUrl: z.string().url().optional().or(z.literal('')).nullable(),
  
  // Event Dates
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  startTime: z.string().default('09:00'),
  endTime: z.string().default('17:00'),
  timezone: z.string().default('UTC'),
  
  // Topics & Audience
  topics: z.array(z.string()).optional().default([]),
  audienceLevel: z.array(z.string()).optional().default([]),
  
  // CFP Settings
  cfpOpensAt: z.string().optional().nullable(),
  cfpClosesAt: z.string().optional().nullable(),
  cfpStartTime: z.string().default('09:00'),
  cfpEndTime: z.string().default('23:59'),
  cfpDescription: z.string().max(10000).optional(), // Legacy
  cfpGuidelines: z.string().max(10000).optional().nullable(),
  speakerBenefits: z.string().max(5000).optional().nullable(),
  
  // Talk Formats
  talkFormats: z.array(talkFormatSchema).optional().default([]),
  
  // Review Settings
  reviewType: z.string().default('scoring'),
  minReviewsPerTalk: z.number().int().min(1).max(10).default(2),
  enableSpeakerFeedback: z.boolean().default(false),
  reviewCriteria: z.array(reviewCriteriaSchema).optional().default([]),
  
  // Notification Settings
  notifyOnNewSubmission: z.boolean().default(true),
  notifyOnNewReview: z.boolean().default(false),
  
  // Status
  status: z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  isPublished: z.boolean().default(false), // Legacy
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
