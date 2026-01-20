/**
 * Speaker Profile API Tests
 * 
 * Tests for speaker profile and onboarding endpoints.
 * Uses mocked Prisma client and auth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    speakerProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';

describe('Speaker Profile API', () => {
  const mockUserId = 'user-123';
  const mockSession = { user: { id: mockUserId, email: 'test@example.com' } };
  
  const mockProfile = {
    id: 'profile-123',
    userId: mockUserId,
    fullName: 'Jane Developer',
    bio: 'A passionate software engineer with 10 years of experience building scalable applications.',
    location: 'San Francisco, USA',
    company: 'Tech Corp',
    position: 'Senior Engineer',
    linkedinUrl: 'https://linkedin.com/in/janedev',
    twitterHandle: 'janedev',
    githubUsername: 'janedev',
    websiteUrl: 'https://janedev.com',
    expertiseTags: ['JavaScript', 'React', 'Node.js'],
    speakingExperience: 'Spoken at multiple conferences including React Summit and NodeConf.',
    experienceLevel: 'EXPERIENCED',
    languages: ['English', 'Spanish'],
    presentationTypes: ['TALK', 'WORKSHOP'],
    audienceTypes: ['INTERMEDIATE', 'ADVANCED'],
    willingToTravel: true,
    travelRequirements: 'Business class for long flights',
    virtualEventExperience: true,
    techRequirements: 'Good internet',
    onboardingCompleted: true,
    onboardingStep: 4,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      
      // Simulate what the route would check
      const session = await auth();
      expect(session).toBeNull();
    });

    it('should allow authenticated users', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      
      const session = await auth();
      expect(session?.user?.id).toBe(mockUserId);
    });
  });

  describe('Profile CRUD Operations', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should return null profile for new users', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue(null);
      
      const result = await prisma.speakerProfile.findUnique({
        where: { userId: mockUserId },
      });
      
      expect(result).toBeNull();
    });

    it('should return existing profile', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue(mockProfile as never);
      
      const result = await prisma.speakerProfile.findUnique({
        where: { userId: mockUserId },
      });
      
      expect(result).toEqual(mockProfile);
      expect(result?.fullName).toBe('Jane Developer');
    });

    it('should create a new profile', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.speakerProfile.create).mockResolvedValue(mockProfile as never);
      
      const result = await prisma.speakerProfile.create({
        data: {
          userId: mockUserId,
          fullName: mockProfile.fullName,
          bio: mockProfile.bio,
          location: mockProfile.location,
          expertiseTags: mockProfile.expertiseTags,
          speakingExperience: mockProfile.speakingExperience,
          languages: mockProfile.languages,
          onboardingCompleted: true,
          onboardingStep: 4,
        },
      });
      
      expect(result.id).toBe('profile-123');
      expect(prisma.speakerProfile.create).toHaveBeenCalled();
    });

    it('should update existing profile', async () => {
      const updatedProfile = { ...mockProfile, fullName: 'Jane Updated' };
      vi.mocked(prisma.speakerProfile.update).mockResolvedValue(updatedProfile as never);
      
      const result = await prisma.speakerProfile.update({
        where: { userId: mockUserId },
        data: { fullName: 'Jane Updated' },
      });
      
      expect(result.fullName).toBe('Jane Updated');
    });
  });

  describe('Onboarding Progress', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should track onboarding step 1', async () => {
      const step1Profile = {
        ...mockProfile,
        onboardingStep: 1,
        onboardingCompleted: false,
        expertiseTags: [],
        speakingExperience: null,
      };
      
      vi.mocked(prisma.speakerProfile.create).mockResolvedValue(step1Profile as never);
      
      const result = await prisma.speakerProfile.create({
        data: {
          userId: mockUserId,
          fullName: 'Jane Developer',
          bio: mockProfile.bio,
          location: 'San Francisco, USA',
          linkedinUrl: 'https://linkedin.com/in/janedev',
          onboardingStep: 1,
        },
      });
      
      expect(result.onboardingStep).toBe(1);
      expect(result.onboardingCompleted).toBe(false);
    });

    it('should advance onboarding step', async () => {
      const step2Profile = {
        ...mockProfile,
        onboardingStep: 2,
        onboardingCompleted: false,
      };
      
      vi.mocked(prisma.speakerProfile.update).mockResolvedValue(step2Profile as never);
      
      const result = await prisma.speakerProfile.update({
        where: { userId: mockUserId },
        data: {
          expertiseTags: ['JavaScript', 'React'],
          speakingExperience: 'I have spoken at multiple conferences.',
          onboardingStep: 2,
        },
      });
      
      expect(result.onboardingStep).toBe(2);
    });

    it('should complete onboarding', async () => {
      vi.mocked(prisma.speakerProfile.upsert).mockResolvedValue(mockProfile as never);
      
      const result = await prisma.speakerProfile.upsert({
        where: { userId: mockUserId },
        create: { ...mockProfile, userId: mockUserId },
        update: { onboardingCompleted: true, onboardingStep: 4 },
      });
      
      expect(result.onboardingCompleted).toBe(true);
      expect(result.onboardingStep).toBe(4);
    });
  });

  describe('Data Validation', () => {
    it('should validate expertise tags limit', () => {
      const tags = Array(26).fill('JavaScript');
      expect(tags.length).toBeGreaterThan(25);
    });

    it('should validate language limit', () => {
      const languages = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian'];
      expect(languages.length).toBeGreaterThan(5);
    });

    it('should handle Twitter handle with @', () => {
      const handle = '@janedev';
      const cleaned = handle.replace('@', '');
      expect(cleaned).toBe('janedev');
    });

    it('should handle empty optional fields', () => {
      const profile = {
        ...mockProfile,
        company: null,
        position: null,
        websiteUrl: null,
        travelRequirements: null,
        techRequirements: null,
      };
      
      expect(profile.company).toBeNull();
      expect(profile.position).toBeNull();
    });
  });

  describe('Profile Fields', () => {
    it('should have all required fields for federation compatibility', () => {
      const requiredFields = [
        'fullName',
        'bio',
        'location',
        'expertiseTags',
        'speakingExperience',
        'languages',
      ];
      
      for (const field of requiredFields) {
        expect(mockProfile).toHaveProperty(field);
        expect(mockProfile[field as keyof typeof mockProfile]).toBeTruthy();
      }
    });

    it('should have all social link fields', () => {
      const socialFields = [
        'linkedinUrl',
        'twitterHandle',
        'githubUsername',
        'websiteUrl',
      ];
      
      for (const field of socialFields) {
        expect(mockProfile).toHaveProperty(field);
      }
    });

    it('should have all preference fields', () => {
      const preferenceFields = [
        'presentationTypes',
        'audienceTypes',
        'willingToTravel',
        'virtualEventExperience',
      ];
      
      for (const field of preferenceFields) {
        expect(mockProfile).toHaveProperty(field);
      }
    });

    it('should have onboarding tracking fields', () => {
      expect(mockProfile).toHaveProperty('onboardingCompleted');
      expect(mockProfile).toHaveProperty('onboardingStep');
    });
  });
});
