/**
 * Submission Validation Schemas
 * 
 * Zod schemas for validating submission-related data.
 */

import { z } from 'zod';

// ============================================================================
// Submission Schemas
// ============================================================================

export const createSubmissionSchema = z.object({
  eventId: z.string().cuid(),
  trackId: z.string().cuid().optional(),
  formatId: z.string().cuid().optional(),
  talkId: z.string().cuid().optional(), // Link to talks library
  title: z.string().min(1, 'Title is required').max(200),
  abstract: z.string().min(10, 'Abstract must be at least 10 characters').max(5000),
  outline: z.string().max(10000).optional(),
  targetAudience: z.string().max(500).optional(),
  prerequisites: z.string().max(2000).optional(),
});

export const updateSubmissionSchema = createSubmissionSchema
  .omit({ eventId: true })
  .partial();

export const updateSubmissionStatusSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'WITHDRAWN']),
});

export const submissionFiltersSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'WITHDRAWN']).optional(),
  trackId: z.string().cuid().optional(),
  formatId: z.string().cuid().optional(),
  search: z.string().max(100).optional(),
  speakerId: z.string().cuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================================
// Material Schemas
// ============================================================================

export const createMaterialSchema = z.object({
  type: z.enum(['slides', 'video', 'document', 'other']),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  fileUrl: z.string().optional(),
  externalUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().max(100).optional(),
});

export const updateMaterialSchema = createMaterialSchema.partial();

// ============================================================================
// Co-Speaker Schemas
// ============================================================================

export const createCoSpeakerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email().optional().or(z.literal('')),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

export const updateCoSpeakerSchema = createCoSpeakerSchema.partial();

// ============================================================================
// Types
// ============================================================================

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type UpdateSubmissionStatusInput = z.infer<typeof updateSubmissionStatusSchema>;
export type SubmissionFilters = z.infer<typeof submissionFiltersSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateCoSpeakerInput = z.infer<typeof createCoSpeakerSchema>;
export type UpdateCoSpeakerInput = z.infer<typeof updateCoSpeakerSchema>;
