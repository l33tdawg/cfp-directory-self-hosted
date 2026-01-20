/**
 * Reviewer Profile Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  reviewerBasicInfoSchema,
  reviewerExpertiseSchema,
  reviewerPreferencesSchema,
  reviewerAvailabilitySchema,
  reviewerProfileSchema,
  validateReviewerOnboardingStep,
} from '@/lib/validations/reviewer-profile';

describe('Reviewer Profile Validation', () => {
  describe('reviewerBasicInfoSchema', () => {
    const validBasicInfo = {
      fullName: 'John Doe',
      designation: 'Senior Engineer',
      company: 'Acme Inc',
      bio: 'I am a software engineer with over 10 years of experience in building web applications.',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      twitterHandle: '@johndoe',
      githubUsername: 'johndoe',
      websiteUrl: 'https://johndoe.com',
      hasReviewedBefore: true,
      conferencesReviewed: 'JSConf, React Summit',
    };

    it('validates a complete basic info object', () => {
      const result = reviewerBasicInfoSchema.safeParse(validBasicInfo);
      expect(result.success).toBe(true);
    });

    it('requires fullName', () => {
      const result = reviewerBasicInfoSchema.safeParse({
        ...validBasicInfo,
        fullName: '',
      });
      expect(result.success).toBe(false);
    });

    it('requires bio to be at least 50 characters', () => {
      const result = reviewerBasicInfoSchema.safeParse({
        ...validBasicInfo,
        bio: 'Too short',
      });
      expect(result.success).toBe(false);
    });

    it('requires at least one social link or website', () => {
      const result = reviewerBasicInfoSchema.safeParse({
        fullName: 'John Doe',
        bio: 'I am a software engineer with over 10 years of experience in building web applications.',
        hasReviewedBefore: false,
        linkedinUrl: '',
        twitterHandle: '',
        githubUsername: '',
        websiteUrl: '',
      });
      expect(result.success).toBe(false);
    });

    it('accepts only linkedinUrl as social link', () => {
      const result = reviewerBasicInfoSchema.safeParse({
        fullName: 'John Doe',
        bio: 'I am a software engineer with over 10 years of experience in building web applications.',
        hasReviewedBefore: false,
        linkedinUrl: 'https://linkedin.com/in/johndoe',
      });
      expect(result.success).toBe(true);
    });

    it('validates URL format for linkedinUrl', () => {
      const result = reviewerBasicInfoSchema.safeParse({
        ...validBasicInfo,
        linkedinUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewerExpertiseSchema', () => {
    it('validates expertise areas', () => {
      const result = reviewerExpertiseSchema.safeParse({
        expertiseAreas: ['Frontend Development', 'Backend Development'],
        yearsOfExperience: 10,
      });
      expect(result.success).toBe(true);
    });

    it('requires at least one expertise area', () => {
      const result = reviewerExpertiseSchema.safeParse({
        expertiseAreas: [],
        yearsOfExperience: 10,
      });
      expect(result.success).toBe(false);
    });

    it('limits expertise areas to 10', () => {
      const result = reviewerExpertiseSchema.safeParse({
        expertiseAreas: Array(11).fill('Topic'),
        yearsOfExperience: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewerPreferencesSchema', () => {
    it('validates review criteria', () => {
      const result = reviewerPreferencesSchema.safeParse({
        reviewCriteria: ['technical_depth', 'practical_value'],
        additionalNotes: 'I focus on code quality',
      });
      expect(result.success).toBe(true);
    });

    it('requires at least one review criteria', () => {
      const result = reviewerPreferencesSchema.safeParse({
        reviewCriteria: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewerAvailabilitySchema', () => {
    it('validates availability settings', () => {
      const result = reviewerAvailabilitySchema.safeParse({
        hoursPerWeek: '2-5',
        preferredEventSize: 'medium',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('reviewerProfileSchema (complete)', () => {
    const completeProfile = {
      fullName: 'John Doe',
      designation: 'Senior Engineer',
      company: 'Acme Inc',
      bio: 'I am a software engineer with over 10 years of experience in building web applications.',
      linkedinUrl: 'https://linkedin.com/in/johndoe',
      twitterHandle: '@johndoe',
      githubUsername: 'johndoe',
      websiteUrl: 'https://johndoe.com',
      hasReviewedBefore: true,
      conferencesReviewed: 'JSConf, React Summit',
      expertiseAreas: ['Frontend Development', 'Backend Development'],
      yearsOfExperience: 10,
      reviewCriteria: ['technical_depth', 'practical_value'],
      additionalNotes: 'I focus on code quality',
      hoursPerWeek: '5-10',
      preferredEventSize: 'large',
    };

    it('validates a complete reviewer profile', () => {
      const result = reviewerProfileSchema.safeParse(completeProfile);
      expect(result.success).toBe(true);
    });

    it('fails with incomplete data', () => {
      const result = reviewerProfileSchema.safeParse({
        fullName: 'John Doe',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateReviewerOnboardingStep', () => {
    it('validates step 1 data', () => {
      const result = validateReviewerOnboardingStep(1, {
        fullName: 'John Doe',
        bio: 'I am a software engineer with over 10 years of experience in building web applications.',
        linkedinUrl: 'https://linkedin.com/in/johndoe',
        hasReviewedBefore: false,
      });
      expect(result.success).toBe(true);
    });

    it('validates step 2 data', () => {
      const result = validateReviewerOnboardingStep(2, {
        expertiseAreas: ['Frontend Development'],
        yearsOfExperience: 5,
      });
      expect(result.success).toBe(true);
    });

    it('validates step 3 data', () => {
      const result = validateReviewerOnboardingStep(3, {
        reviewCriteria: ['technical_depth'],
      });
      expect(result.success).toBe(true);
    });

    it('validates step 4 data', () => {
      const result = validateReviewerOnboardingStep(4, {
        hoursPerWeek: '2-5',
        preferredEventSize: 'any',
      });
      expect(result.success).toBe(true);
    });

    it('returns error for invalid step', () => {
      const result = validateReviewerOnboardingStep(5, {});
      expect(result.success).toBe(false);
    });
  });
});
