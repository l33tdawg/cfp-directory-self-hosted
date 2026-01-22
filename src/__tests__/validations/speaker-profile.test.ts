/**
 * Speaker Profile Validation Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  basicInfoSchema,
  speakingExperienceSchema,
  preferencesSchema,
  speakerProfileSchema,
  validateSocialLinks,
  validateOnboardingStep,
} from '@/lib/validations/speaker-profile';

describe('Speaker Profile Validation Schemas', () => {
  
  // =========================================================================
  // Basic Info Schema (Step 1)
  // =========================================================================
  
  describe('basicInfoSchema', () => {
    const validBasicInfo = {
      fullName: 'Jane Developer',
      bio: 'A passionate software engineer with 10 years of experience building scalable applications.',
      location: 'San Francisco, USA',
      company: 'Tech Corp',
      position: 'Senior Engineer',
      linkedinUrl: 'https://linkedin.com/in/janedev',
    };

    it('should validate valid basic info', () => {
      const result = basicInfoSchema.safeParse(validBasicInfo);
      expect(result.success).toBe(true);
    });

    it('should require fullName', () => {
      const data = { ...validBasicInfo, fullName: '' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require fullName to be at least 2 characters', () => {
      const data = { ...validBasicInfo, fullName: 'J' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce fullName max length', () => {
      const data = { ...validBasicInfo, fullName: 'a'.repeat(101) };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require bio to be at least 50 characters', () => {
      const data = { ...validBasicInfo, bio: 'Too short' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce bio max length', () => {
      const data = { ...validBasicInfo, bio: 'a'.repeat(5001) };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require location', () => {
      const data = { ...validBasicInfo, location: '' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce location max length (100 chars)', () => {
      const data = { ...validBasicInfo, location: 'a'.repeat(101) };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow empty optional fields', () => {
      const data = {
        fullName: 'Jane Developer',
        bio: 'A passionate software engineer with 10 years of experience building scalable applications.',
        location: 'San Francisco, USA',
        company: '',
        position: '',
        websiteUrl: '',
        linkedinUrl: '',
        twitterHandle: '',
        githubUsername: '',
      };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate LinkedIn URL format', () => {
      const data = { ...validBasicInfo, linkedinUrl: 'not-a-url' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate website URL format', () => {
      const data = { ...validBasicInfo, websiteUrl: 'not-a-url' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid website URL', () => {
      const data = { ...validBasicInfo, websiteUrl: 'https://janedev.com' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate Twitter handle format', () => {
      const data = { ...validBasicInfo, twitterHandle: 'invalid handle!' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid Twitter handle without @', () => {
      const data = { ...validBasicInfo, twitterHandle: 'janedev' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept valid Twitter handle with @', () => {
      const data = { ...validBasicInfo, twitterHandle: '@janedev' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should enforce Twitter handle max length', () => {
      const data = { ...validBasicInfo, twitterHandle: 'a'.repeat(16) };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate GitHub username format', () => {
      const data = { ...validBasicInfo, githubUsername: 'invalid username!' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid GitHub username with hyphens', () => {
      const data = { ...validBasicInfo, githubUsername: 'jane-dev-2024' };
      const result = basicInfoSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('validateSocialLinks', () => {
    it('should return true when LinkedIn is provided', () => {
      const data = {
        fullName: 'Jane',
        bio: 'Bio text here that is long enough to pass validation with fifty characters.',
        location: 'NYC',
        linkedinUrl: 'https://linkedin.com/in/jane',
      };
      expect(validateSocialLinks(data as never)).toBe(true);
    });

    it('should return true when Twitter is provided', () => {
      const data = {
        fullName: 'Jane',
        bio: 'Bio',
        location: 'NYC',
        twitterHandle: 'janedev',
      };
      expect(validateSocialLinks(data as never)).toBe(true);
    });

    it('should return true when GitHub is provided', () => {
      const data = {
        fullName: 'Jane',
        bio: 'Bio',
        location: 'NYC',
        githubUsername: 'janedev',
      };
      expect(validateSocialLinks(data as never)).toBe(true);
    });

    it('should return true when website is provided', () => {
      const data = {
        fullName: 'Jane',
        bio: 'Bio',
        location: 'NYC',
        websiteUrl: 'https://janedev.com',
      };
      expect(validateSocialLinks(data as never)).toBe(true);
    });

    it('should return false when no social links provided', () => {
      const data = {
        fullName: 'Jane',
        bio: 'Bio',
        location: 'NYC',
        linkedinUrl: '',
        twitterHandle: '',
        githubUsername: '',
        websiteUrl: '',
      };
      expect(validateSocialLinks(data as never)).toBe(false);
    });
  });

  // =========================================================================
  // Speaking Experience Schema (Step 2)
  // =========================================================================

  describe('speakingExperienceSchema', () => {
    const validSpeakingExperience = {
      expertiseTags: ['JavaScript', 'React', 'Node.js'],
      speakingExperience: 'I have spoken at multiple conferences including React Summit and NodeConf. I love sharing knowledge!',
      experienceLevel: 'EXPERIENCED',
      languages: ['English', 'Spanish'],
    };

    it('should validate valid speaking experience', () => {
      const result = speakingExperienceSchema.safeParse(validSpeakingExperience);
      expect(result.success).toBe(true);
    });

    it('should require at least one expertise tag', () => {
      const data = { ...validSpeakingExperience, expertiseTags: [] };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum 25 expertise tags', () => {
      const data = { 
        ...validSpeakingExperience, 
        expertiseTags: Array(26).fill('JavaScript') 
      };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject empty expertise tag strings', () => {
      const data = { 
        ...validSpeakingExperience, 
        expertiseTags: [''] 
      };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject expertise tags exceeding max length', () => {
      const data = { 
        ...validSpeakingExperience, 
        expertiseTags: ['A'.repeat(101)] // 101 characters, max is 100
      };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require speaking experience description', () => {
      const data = { ...validSpeakingExperience, speakingExperience: '' };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require speaking experience to be at least 50 characters', () => {
      const data = { ...validSpeakingExperience, speakingExperience: 'Too short' };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow optional experience level', () => {
      const data = { ...validSpeakingExperience, experienceLevel: undefined };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate experience level enum', () => {
      const data = { ...validSpeakingExperience, experienceLevel: 'INVALID' };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept all valid experience levels', () => {
      const levels = ['NEW', 'EXPERIENCED', 'PROFESSIONAL', 'KEYNOTE'];
      for (const level of levels) {
        const data = { ...validSpeakingExperience, experienceLevel: level };
        const result = speakingExperienceSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should require at least one language', () => {
      const data = { 
        expertiseTags: ['JavaScript'],
        speakingExperience: 'I have spoken at multiple conferences including React Summit. I love sharing!',
        languages: [],
      };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept languages array', () => {
      const data = { 
        expertiseTags: ['JavaScript'],
        speakingExperience: 'I have spoken at multiple conferences including React Summit. I love sharing!',
        languages: ['English'],
      };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.languages).toEqual(['English']);
      }
    });

    it('should enforce maximum 5 languages', () => {
      const data = { 
        ...validSpeakingExperience, 
        languages: ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian'] 
      };
      const result = speakingExperienceSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Preferences Schema (Step 3)
  // =========================================================================

  describe('preferencesSchema', () => {
    const validPreferences = {
      presentationTypes: ['TALK', 'WORKSHOP'],
      audienceTypes: ['INTERMEDIATE', 'ADVANCED'],
      willingToTravel: true,
      travelRequirements: 'Business class for flights over 5 hours',
      virtualEventExperience: true,
      techRequirements: 'High-speed internet, professional microphone',
    };

    it('should validate valid preferences', () => {
      const result = preferencesSchema.safeParse(validPreferences);
      expect(result.success).toBe(true);
    });

    it('should require arrays and booleans', () => {
      const result = preferencesSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept empty arrays', () => {
      const result = preferencesSchema.safeParse({
        presentationTypes: [],
        audienceTypes: [],
        willingToTravel: false,
        virtualEventExperience: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.presentationTypes).toEqual([]);
        expect(result.data.audienceTypes).toEqual([]);
        expect(result.data.willingToTravel).toBe(false);
        expect(result.data.virtualEventExperience).toBe(false);
      }
    });

    it('should enforce maximum 6 presentation types', () => {
      const data = { 
        presentationTypes: ['TALK', 'WORKSHOP', 'LIGHTNING', 'PANEL', 'KEYNOTE', 'BOF', 'TUTORIAL'] 
      };
      const result = preferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate presentation type enum values', () => {
      const data = { presentationTypes: ['INVALID_TYPE'] };
      const result = preferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum 8 audience types', () => {
      const data = { 
        audienceTypes: Array(9).fill('BEGINNERS') 
      };
      const result = preferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate audience type enum values', () => {
      const data = { audienceTypes: ['INVALID_AUDIENCE'] };
      const result = preferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce travel requirements max length', () => {
      const data = { travelRequirements: 'a'.repeat(1001) };
      const result = preferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce tech requirements max length', () => {
      const data = { techRequirements: 'a'.repeat(1001) };
      const result = preferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Complete Speaker Profile Schema
  // =========================================================================

  describe('speakerProfileSchema', () => {
    // Note: isPublic removed from self-hosted version - no speaker directory
    const completeProfile = {
      fullName: 'Jane Developer',
      bio: 'A passionate software engineer with 10 years of experience building scalable applications.',
      location: 'San Francisco, USA',
      company: 'Tech Corp',
      position: 'Senior Engineer',
      linkedinUrl: 'https://linkedin.com/in/janedev',
      expertiseTags: ['JavaScript', 'React', 'Node.js'],
      speakingExperience: 'I have spoken at multiple conferences including React Summit and NodeConf. I love sharing!',
      experienceLevel: 'EXPERIENCED',
      languages: ['English'],
      presentationTypes: ['TALK'],
      audienceTypes: ['INTERMEDIATE'],
      willingToTravel: true,
      virtualEventExperience: true,
    };

    it('should validate complete profile', () => {
      const result = speakerProfileSchema.safeParse(completeProfile);
      expect(result.success).toBe(true);
    });

    it('should require all fields from basic info', () => {
      const data = { ...completeProfile, fullName: '' };
      const result = speakerProfileSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require all fields from speaking experience', () => {
      const data = { ...completeProfile, expertiseTags: [] };
      const result = speakerProfileSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Step Validation
  // =========================================================================

  describe('validateOnboardingStep', () => {
    it('should validate step 1 data correctly', () => {
      const data = {
        fullName: 'Jane Developer',
        bio: 'A passionate software engineer with 10 years of experience building scalable applications.',
        location: 'San Francisco, USA',
        linkedinUrl: 'https://linkedin.com/in/janedev',
      };
      const result = validateOnboardingStep(1, data);
      expect(result.success).toBe(true);
    });

    it('should fail step 1 without social links', () => {
      const data = {
        fullName: 'Jane Developer',
        bio: 'A passionate software engineer with 10 years of experience building scalable applications.',
        location: 'San Francisco, USA',
        linkedinUrl: '',
        twitterHandle: '',
        githubUsername: '',
        websiteUrl: '',
      };
      const result = validateOnboardingStep(1, data);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Please provide at least one social link (LinkedIn, Twitter, GitHub, or Website)');
    });

    it('should validate step 2 data correctly', () => {
      const data = {
        expertiseTags: ['JavaScript', 'React'],
        speakingExperience: 'I have spoken at multiple conferences including React Summit. I love sharing knowledge!',
        languages: ['English'],
      };
      const result = validateOnboardingStep(2, data);
      expect(result.success).toBe(true);
    });

    it('should fail step 2 without expertise tags', () => {
      const data = {
        expertiseTags: [],
        speakingExperience: 'I have spoken at conferences.',
      };
      const result = validateOnboardingStep(2, data);
      expect(result.success).toBe(false);
    });

    it('should validate step 3 data correctly', () => {
      const result = validateOnboardingStep(3, {
        presentationTypes: [],
        audienceTypes: [],
        willingToTravel: false,
        virtualEventExperience: false,
      });
      expect(result.success).toBe(true);
    });

    it('should validate step 4 (terms acceptance)', () => {
      const result = validateOnboardingStep(4, { accepted: true });
      expect(result.success).toBe(true);
    });

    it('should fail for invalid step number', () => {
      const result = validateOnboardingStep(5, {});
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Invalid step');
    });

    it('should fail for step 0', () => {
      const result = validateOnboardingStep(0, {});
      expect(result.success).toBe(false);
    });
  });
});
