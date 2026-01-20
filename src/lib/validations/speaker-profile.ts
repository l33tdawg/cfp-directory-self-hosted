/**
 * Speaker Profile Validation Schemas
 * 
 * Validation schemas for speaker profile and onboarding data.
 * These are used during onboarding and profile editing.
 */

import { z } from 'zod';
import { 
  EXPERTISE_TAGS, 
  LANGUAGES, 
  EXPERIENCE_LEVELS, 
  SESSION_FORMATS, 
  AUDIENCE_TYPES 
} from '@/lib/constants/speaker-options';

// =============================================================================
// BASIC INFO (Step 1)
// =============================================================================

export const basicInfoSchema = z.object({
  fullName: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  
  bio: z.string()
    .min(50, 'Bio must be at least 50 characters')
    .max(5000, 'Bio must be at most 5000 characters'),
  
  location: z.string()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location must be at most 100 characters'),
  
  company: z.string().max(100, 'Company name too long').optional().or(z.literal('')),
  position: z.string().max(100, 'Position too long').optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
  
  // Social links - at least one required (validated at form level)
  linkedinUrl: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  twitterHandle: z.string()
    .max(15, 'Twitter handle too long')
    .regex(/^@?[\w]+$/, 'Invalid Twitter handle')
    .optional()
    .or(z.literal('')),
  githubUsername: z.string()
    .max(39, 'GitHub username too long')
    .regex(/^[\w-]+$/, 'Invalid GitHub username')
    .optional()
    .or(z.literal('')),
});

export type BasicInfoData = z.infer<typeof basicInfoSchema>;

// Validation that at least one social link is provided
export const validateSocialLinks = (data: BasicInfoData): boolean => {
  return !!(
    data.linkedinUrl || 
    data.twitterHandle || 
    data.githubUsername || 
    data.websiteUrl
  );
};

// =============================================================================
// SPEAKING EXPERIENCE (Step 2)
// =============================================================================

const experienceLevelValues = EXPERIENCE_LEVELS.map(l => l.value) as [string, ...string[]];

export const speakingExperienceSchema = z.object({
  expertiseTags: z.array(z.string())
    .min(1, 'Select at least one area of expertise')
    .max(25, 'Maximum 25 expertise tags allowed')
    .refine(
      (tags) => tags.every(tag => EXPERTISE_TAGS.includes(tag as typeof EXPERTISE_TAGS[number])),
      'Invalid expertise tag selected'
    ),
  
  speakingExperience: z.string()
    .min(50, 'Please describe your speaking experience (minimum 50 characters)')
    .max(5000, 'Description too long (maximum 5000 characters)'),
  
  experienceLevel: z.enum(experienceLevelValues).optional(),
  
  languages: z.array(z.string())
    .min(1, 'Select at least one language')
    .max(5, 'Maximum 5 languages allowed'),
});

export type SpeakingExperienceData = z.infer<typeof speakingExperienceSchema>;

// =============================================================================
// PREFERENCES (Step 3)
// =============================================================================

const sessionFormatValues = SESSION_FORMATS.map(f => f.value) as [string, ...string[]];
const audienceTypeValues = AUDIENCE_TYPES.map(a => a.value) as [string, ...string[]];

export const preferencesSchema = z.object({
  presentationTypes: z.array(z.enum(sessionFormatValues))
    .max(6, 'Maximum 6 presentation types'),
  
  audienceTypes: z.array(z.enum(audienceTypeValues))
    .max(8, 'Maximum 8 audience types'),
  
  willingToTravel: z.boolean(),
  travelRequirements: z.string().max(1000, 'Travel requirements too long').optional().or(z.literal('')),
  
  virtualEventExperience: z.boolean(),
  techRequirements: z.string().max(1000, 'Tech requirements too long').optional().or(z.literal('')),
});

export type PreferencesData = z.infer<typeof preferencesSchema>;

// =============================================================================
// COMPLETE SPEAKER PROFILE
// =============================================================================

export const speakerProfileSchema = basicInfoSchema
  .merge(speakingExperienceSchema)
  .merge(preferencesSchema)
  .extend({
    isPublic: z.boolean().default(true),
  });

export type SpeakerProfileData = z.infer<typeof speakerProfileSchema>;

// =============================================================================
// ONBOARDING PROGRESS
// =============================================================================

export const onboardingProgressSchema = z.object({
  step: z.number().int().min(1).max(4),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type OnboardingProgress = z.infer<typeof onboardingProgressSchema>;

// =============================================================================
// UPDATE SCHEMAS (Partial updates)
// =============================================================================

export const updateBasicInfoSchema = basicInfoSchema.partial();
export const updateSpeakingExperienceSchema = speakingExperienceSchema.partial();
export const updatePreferencesSchema = preferencesSchema.partial();
export const updateSpeakerProfileSchema = speakerProfileSchema.partial();

// =============================================================================
// STEP VALIDATION
// =============================================================================

/**
 * Validate data for a specific onboarding step
 */
export function validateOnboardingStep(step: number, data: unknown): { 
  success: boolean; 
  errors: string[];
  data?: unknown;
} {
  try {
    switch (step) {
      case 1: {
        const result = basicInfoSchema.safeParse(data);
        if (!result.success) {
          return { 
            success: false, 
            errors: result.error.issues.map(i => i.message) 
          };
        }
        // Check for at least one social link
        if (!validateSocialLinks(result.data)) {
          return { 
            success: false, 
            errors: ['Please provide at least one social link (LinkedIn, Twitter, GitHub, or Website)'] 
          };
        }
        return { success: true, errors: [], data: result.data };
      }
      
      case 2: {
        const result = speakingExperienceSchema.safeParse(data);
        if (!result.success) {
          return { 
            success: false, 
            errors: result.error.issues.map(i => i.message) 
          };
        }
        return { success: true, errors: [], data: result.data };
      }
      
      case 3: {
        const result = preferencesSchema.safeParse(data);
        if (!result.success) {
          return { 
            success: false, 
            errors: result.error.issues.map(i => i.message) 
          };
        }
        return { success: true, errors: [], data: result.data };
      }
      
      case 4:
        // Terms acceptance - just need a boolean
        return { success: true, errors: [], data };
      
      default:
        return { success: false, errors: ['Invalid step'] };
    }
  } catch {
    return { success: false, errors: ['Validation error'] };
  }
}
