/**
 * Review Validation Schemas
 * 
 * Zod schemas for validating review-related data.
 */

import { z } from 'zod';

// ============================================================================
// Review Schemas
// ============================================================================

export const createReviewSchema = z.object({
  contentScore: z.number().int().min(1).max(5).optional(),
  presentationScore: z.number().int().min(1).max(5).optional(),
  relevanceScore: z.number().int().min(1).max(5).optional(),
  overallScore: z.number().int().min(1).max(5).optional(),
  privateNotes: z.string().max(10000).optional(),
  publicNotes: z.string().max(5000).optional(),
  recommendation: z.enum(['STRONG_ACCEPT', 'ACCEPT', 'NEUTRAL', 'REJECT', 'STRONG_REJECT']).optional(),
});

export const updateReviewSchema = createReviewSchema.partial();

// ============================================================================
// Discussion Schemas
// ============================================================================

export const createDiscussionSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(5000),
});

// ============================================================================
// Types
// ============================================================================

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type CreateDiscussionInput = z.infer<typeof createDiscussionSchema>;
