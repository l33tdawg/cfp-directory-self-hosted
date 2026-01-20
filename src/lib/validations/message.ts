/**
 * Message Validation Schemas
 * 
 * Zod schemas for validating message-related data.
 */

import { z } from 'zod';

// ============================================================================
// Message Schemas
// ============================================================================

export const createMessageSchema = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().min(1, 'Message body is required').max(10000),
  parentId: z.string().cuid().optional(),
});

export const markReadSchema = z.object({
  messageIds: z.array(z.string().cuid()).min(1),
});

// ============================================================================
// Types
// ============================================================================

export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
