/**
 * Reviewer Profile Validation Schemas
 */

import { z } from 'zod';

// =============================================================================
// STEP 1: Professional Info
// =============================================================================

export const reviewerBasicInfoSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  
  designation: z.string()
    .max(100, 'Designation must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  
  company: z.string()
    .max(100, 'Company must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  
  bio: z.string()
    .min(50, 'Bio must be at least 50 characters')
    .max(2000, 'Bio must be at most 2000 characters'),

  // Social links (at least one required)
  linkedinUrl: z.string()
    .url('Invalid LinkedIn URL')
    .optional()
    .or(z.literal('')),
  
  twitterHandle: z.string()
    .max(50)
    .optional()
    .or(z.literal('')),
  
  githubUsername: z.string()
    .max(50)
    .optional()
    .or(z.literal('')),
  
  websiteUrl: z.string()
    .url('Invalid website URL')
    .optional()
    .or(z.literal('')),

  // Review experience
  hasReviewedBefore: z.boolean(),
  conferencesReviewed: z.string()
    .max(1000)
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => data.linkedinUrl || data.twitterHandle || data.githubUsername || data.websiteUrl,
  { message: 'At least one social link or website is required', path: ['linkedinUrl'] }
);

// =============================================================================
// STEP 2: Expertise Areas
// =============================================================================

export const reviewerExpertiseSchema = z.object({
  expertiseAreas: z.array(z.string())
    .min(1, 'Select at least 1 expertise area')
    .max(10, 'Maximum 10 expertise areas'),
  
  yearsOfExperience: z.number()
    .int()
    .min(0)
    .max(50)
    .optional(),
});

// =============================================================================
// STEP 3: Review Preferences
// =============================================================================

export const reviewerPreferencesSchema = z.object({
  reviewCriteria: z.array(z.string())
    .min(1, 'Select at least 1 review criteria')
    .max(8, 'Maximum 8 criteria'),
  
  additionalNotes: z.string()
    .max(2000)
    .optional()
    .or(z.literal('')),
});

// =============================================================================
// STEP 4: Availability
// =============================================================================

export const reviewerAvailabilitySchema = z.object({
  hoursPerWeek: z.string(),
  preferredEventSize: z.string(),
});

// =============================================================================
// COMPLETE REVIEWER PROFILE
// =============================================================================

export const reviewerProfileSchema = reviewerBasicInfoSchema
  .merge(reviewerExpertiseSchema)
  .merge(reviewerPreferencesSchema)
  .merge(reviewerAvailabilitySchema);

export type ReviewerBasicInfo = z.infer<typeof reviewerBasicInfoSchema>;
export type ReviewerExpertise = z.infer<typeof reviewerExpertiseSchema>;
export type ReviewerPreferences = z.infer<typeof reviewerPreferencesSchema>;
export type ReviewerAvailability = z.infer<typeof reviewerAvailabilitySchema>;
export type ReviewerProfileData = z.infer<typeof reviewerProfileSchema>;

// =============================================================================
// STEP VALIDATION HELPER
// =============================================================================

export function validateReviewerOnboardingStep(step: number, data: unknown) {
  switch (step) {
    case 1:
      return reviewerBasicInfoSchema.safeParse(data);
    case 2:
      return reviewerExpertiseSchema.safeParse(data);
    case 3:
      return reviewerPreferencesSchema.safeParse(data);
    case 4:
      return reviewerAvailabilitySchema.safeParse(data);
    default:
      return { success: false, error: { issues: [{ message: 'Invalid step' }] } };
  }
}
