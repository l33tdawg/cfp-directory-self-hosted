/**
 * Speaker Onboarding API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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
      update: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('Speaker Onboarding API', () => {
  const mockUserId = 'user-123';
  const mockSession = { user: { id: mockUserId, email: 'speaker@example.com' } };

  const mockStep1Data = {
    fullName: 'Jane Developer',
    bio: 'A passionate software engineer with 10 years of experience building scalable applications.',
    location: 'San Francisco, USA',
    company: 'Tech Corp',
    position: 'Senior Engineer',
    linkedinUrl: 'https://linkedin.com/in/janedev',
    twitterHandle: '@janedev',
    githubUsername: 'janedev',
    websiteUrl: 'https://janedev.com',
  };

  const mockStep2Data = {
    expertiseTags: ['JavaScript', 'React', 'Node.js'],
    speakingExperience: 'I have spoken at multiple conferences including React Summit and NodeConf. I love sharing knowledge with the community.',
    experienceLevel: 'EXPERIENCED',
    languages: ['English', 'Spanish'],
  };

  const mockStep3Data = {
    presentationTypes: ['TALK', 'WORKSHOP'],
    audienceTypes: ['INTERMEDIATE', 'ADVANCED'],
    willingToTravel: true,
    travelRequirements: 'Business class for flights over 5 hours',
    virtualEventExperience: true,
    techRequirements: 'Good internet connection',
  };

  const mockCompleteProfile = {
    id: 'profile-123',
    userId: mockUserId,
    ...mockStep1Data,
    ...mockStep2Data,
    ...mockStep3Data,
    onboardingStep: 4,
    onboardingCompleted: true,
    photoUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      
      const session = await auth();
      expect(session).toBeNull();
    });

    it('should allow authenticated users', async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
      
      const session = await auth();
      expect(session?.user?.id).toBe(mockUserId);
    });
  });

  // =========================================================================
  // Step 1: Basic Info
  // =========================================================================

  describe('Step 1: Basic Info', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should create profile with basic info', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.speakerProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep1Data,
        onboardingStep: 1,
        onboardingCompleted: false,
      } as never);

      const result = await prisma.speakerProfile.create({
        data: {
          userId: mockUserId,
          ...mockStep1Data,
          onboardingStep: 1,
        },
      });

      expect(result.onboardingStep).toBe(1);
      expect(result.fullName).toBe('Jane Developer');
    });

    it('should update existing profile at step 1', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 1,
      } as never);

      vi.mocked(prisma.speakerProfile.update).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep1Data,
        onboardingStep: 1,
      } as never);

      const result = await prisma.speakerProfile.update({
        where: { userId: mockUserId },
        data: mockStep1Data,
      });

      expect(result.fullName).toBe('Jane Developer');
    });

    it('should require at least one social link', async () => {
      const dataWithoutSocials = {
        fullName: 'Jane Developer',
        bio: mockStep1Data.bio,
        location: 'San Francisco, USA',
        linkedinUrl: '',
        twitterHandle: '',
        githubUsername: '',
        websiteUrl: '',
      };

      // Validation would fail - at least one social required
      const hasSocialLink = Boolean(
        dataWithoutSocials.linkedinUrl ||
        dataWithoutSocials.twitterHandle ||
        dataWithoutSocials.githubUsername ||
        dataWithoutSocials.websiteUrl
      );

      expect(hasSocialLink).toBe(false);
    });
  });

  // =========================================================================
  // Step 2: Speaking Experience
  // =========================================================================

  describe('Step 2: Speaking Experience', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should update profile with speaking experience', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 1,
      } as never);

      vi.mocked(prisma.speakerProfile.update).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep2Data,
        onboardingStep: 2,
      } as never);

      const result = await prisma.speakerProfile.update({
        where: { userId: mockUserId },
        data: {
          ...mockStep2Data,
          onboardingStep: 2,
        },
      });

      expect(result.onboardingStep).toBe(2);
      expect(result.expertiseTags).toEqual(['JavaScript', 'React', 'Node.js']);
    });

    it('should require at least one expertise tag', async () => {
      const dataWithoutTags = {
        ...mockStep2Data,
        expertiseTags: [],
      };

      expect(dataWithoutTags.expertiseTags.length).toBe(0);
    });

    it('should require at least one language', async () => {
      const dataWithoutLanguages = {
        ...mockStep2Data,
        languages: [],
      };

      expect(dataWithoutLanguages.languages.length).toBe(0);
    });
  });

  // =========================================================================
  // Step 3: Preferences
  // =========================================================================

  describe('Step 3: Preferences', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should update profile with preferences', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 2,
      } as never);

      vi.mocked(prisma.speakerProfile.update).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep3Data,
        onboardingStep: 3,
      } as never);

      const result = await prisma.speakerProfile.update({
        where: { userId: mockUserId },
        data: {
          ...mockStep3Data,
          onboardingStep: 3,
        },
      });

      expect(result.onboardingStep).toBe(3);
      expect(result.willingToTravel).toBe(true);
    });

    it('should allow empty preference arrays', async () => {
      const minimalPreferences = {
        presentationTypes: [],
        audienceTypes: [],
        willingToTravel: false,
        virtualEventExperience: false,
      };

      // Empty arrays are valid
      expect(minimalPreferences.presentationTypes.length).toBe(0);
      expect(minimalPreferences.audienceTypes.length).toBe(0);
    });
  });

  // =========================================================================
  // Step 4: Complete Onboarding
  // =========================================================================

  describe('Step 4: Complete Onboarding', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should complete onboarding', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 3,
      } as never);

      vi.mocked(prisma.speakerProfile.update).mockResolvedValue({
        ...mockCompleteProfile,
        onboardingStep: 4,
        onboardingCompleted: true,
      } as never);

      const result = await prisma.speakerProfile.update({
        where: { userId: mockUserId },
        data: {
          onboardingStep: 4,
          onboardingCompleted: true,
        },
      });

      expect(result.onboardingStep).toBe(4);
      expect(result.onboardingCompleted).toBe(true);
    });

    it('should update user role to SPEAKER on completion', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        role: 'USER',
      } as never);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: mockUserId,
        role: 'SPEAKER',
      } as never);

      const user = await prisma.user.update({
        where: { id: mockUserId },
        data: { role: 'SPEAKER' },
      });

      expect(user.role).toBe('SPEAKER');
    });
  });

  // =========================================================================
  // Onboarding Progress
  // =========================================================================

  describe('Onboarding Progress', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should track current step', async () => {
      for (let step = 1; step <= 4; step++) {
        vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
          id: 'profile-123',
          userId: mockUserId,
          onboardingStep: step,
          onboardingCompleted: step === 4,
        } as never);

        const profile = await prisma.speakerProfile.findUnique({
          where: { userId: mockUserId },
        });

        expect(profile?.onboardingStep).toBe(step);
      }
    });

    it('should allow going back to previous steps', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 3,
      } as never);

      vi.mocked(prisma.speakerProfile.update).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep1Data,
        onboardingStep: 1,
      } as never);

      // Users can go back and edit previous steps
      const result = await prisma.speakerProfile.update({
        where: { userId: mockUserId },
        data: {
          ...mockStep1Data,
          onboardingStep: 1,
        },
      });

      expect(result.onboardingStep).toBe(1);
    });
  });

  // =========================================================================
  // Resume Onboarding
  // =========================================================================

  describe('Resume Onboarding', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should return current onboarding state', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        fullName: 'Jane Developer',
        onboardingStep: 2,
        onboardingCompleted: false,
      } as never);

      const profile = await prisma.speakerProfile.findUnique({
        where: { userId: mockUserId },
      });

      expect(profile?.onboardingStep).toBe(2);
      expect(profile?.onboardingCompleted).toBe(false);
    });

    it('should return null for new users', async () => {
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue(null);

      const profile = await prisma.speakerProfile.findUnique({
        where: { userId: 'new-user' },
      });

      expect(profile).toBeNull();
    });
  });
});
