/**
 * Talk Validation Schemas
 * 
 * Validation schemas for the talks library - reusable talk proposals
 * that speakers can submit to multiple events.
 */

import { z } from 'zod';

// Talk types matching the Prisma enum
export const TALK_TYPES = [
  'KEYNOTE',
  'SESSION', 
  'WORKSHOP',
  'LIGHTNING',
  'PANEL',
  'BOF',
  'TUTORIAL',
] as const;

export type TalkType = typeof TALK_TYPES[number];

// Talk type labels for UI
export const TALK_TYPE_LABELS: Record<TalkType, string> = {
  KEYNOTE: 'Keynote',
  SESSION: 'Session/Talk',
  WORKSHOP: 'Workshop',
  LIGHTNING: 'Lightning Talk',
  PANEL: 'Panel Discussion',
  BOF: 'Birds of a Feather',
  TUTORIAL: 'Tutorial',
};

// Duration options in minutes
export const DURATION_OPTIONS = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
] as const;

// =============================================================================
// CREATE TALK SCHEMA
// =============================================================================

export const createTalkSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be at most 200 characters'),
  
  abstract: z.string()
    .min(50, 'Abstract must be at least 50 characters')
    .max(5000, 'Abstract must be at most 5000 characters'),
  
  description: z.string()
    .max(10000, 'Description must be at most 10000 characters')
    .optional()
    .or(z.literal('')),
  
  outline: z.string()
    .max(5000, 'Outline must be at most 5000 characters')
    .optional()
    .or(z.literal('')),
  
  type: z.enum(TALK_TYPES),
  
  durationMin: z.number()
    .int('Duration must be a whole number')
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration must be at most 8 hours'),
  
  targetAudience: z.array(z.string())
    .max(5, 'Maximum 5 target audiences'),
  
  prerequisites: z.string()
    .max(2000, 'Prerequisites must be at most 2000 characters')
    .optional()
    .or(z.literal('')),
  
  speakerNotes: z.string()
    .max(5000, 'Speaker notes must be at most 5000 characters')
    .optional()
    .or(z.literal('')),
  
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags'),
});

export type CreateTalkInput = z.infer<typeof createTalkSchema>;

// =============================================================================
// UPDATE TALK SCHEMA
// =============================================================================

export const updateTalkSchema = createTalkSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export type UpdateTalkInput = z.infer<typeof updateTalkSchema>;

// =============================================================================
// TALK FILTERS SCHEMA
// =============================================================================

export const talkFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(TALK_TYPES).optional(),
  includeArchived: z.coerce.boolean().default(false),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type TalkFilters = z.infer<typeof talkFiltersSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get display label for a talk type
 */
export function getTalkTypeLabel(type: TalkType): string {
  return TALK_TYPE_LABELS[type] ?? type;
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${hours}h ${mins}m`;
}
