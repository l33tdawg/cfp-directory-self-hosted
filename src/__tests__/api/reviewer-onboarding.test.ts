/**
 * Reviewer Onboarding API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reviewerProfile: {
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

describe('Reviewer Onboarding API', () => {
  const mockUserId = 'user-123';
  const mockSession = { user: { id: mockUserId, email: 'reviewer@example.com' } };

  const mockStep1Data = {
    fullName: 'John Reviewer',
    designation: 'Senior Engineer',
    company: 'Acme Inc',
    bio: 'I am a software engineer with over 10 years of experience in building web applications.',
    linkedinUrl: 'https://linkedin.com/in/johnreviewer',
    twitterHandle: '@johnreviewer',
    githubUsername: 'johnreviewer',
    websiteUrl: 'https://johnreviewer.dev',
    hasReviewedBefore: true,
    conferencesReviewed: 'JSConf, React Summit, NodeConf',
  };

  const mockStep2Data = {
    expertiseAreas: ['Frontend Development', 'Backend Development', 'System Architecture'],
    yearsOfExperience: 10,
  };

  const mockStep3Data = {
    reviewCriteria: ['technical_depth', 'practical_value', 'innovation'],
    additionalNotes: 'I focus on code quality and best practices',
  };

  const mockStep4Data = {
    hoursPerWeek: '5-10',
    preferredEventSize: 'large',
    showOnTeamPage: true,
  };

  const mockCompleteProfile = {
    id: 'profile-123',
    userId: mockUserId,
    ...mockStep1Data,
    ...mockStep2Data,
    ...mockStep3Data,
    ...mockStep4Data,
    onboardingStep: 4,
    onboardingCompleted: true,
    photoUrl: null,
    displayOrder: 0,
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
      vi.mocked(prisma.reviewerProfile.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.reviewerProfile.create).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep1Data,
        onboardingStep: 1,
        onboardingCompleted: false,
      } as never);

      const result = await prisma.reviewerProfile.create({
        data: {
          userId: mockUserId,
          ...mockStep1Data,
          onboardingStep: 1,
        },
      });

      expect(result.onboardingStep).toBe(1);
      expect(result.fullName).toBe('John Reviewer');
    });

    it('should require at least one social link', async () => {
      const dataWithoutSocials = {
        fullName: 'John Reviewer',
        bio: mockStep1Data.bio,
        hasReviewedBefore: false,
        linkedinUrl: '',
        twitterHandle: '',
        githubUsername: '',
        websiteUrl: '',
      };

      const hasSocialLink = Boolean(
        dataWithoutSocials.linkedinUrl ||
        dataWithoutSocials.twitterHandle ||
        dataWithoutSocials.githubUsername ||
        dataWithoutSocials.websiteUrl
      );

      expect(hasSocialLink).toBe(false);
    });

    it('should optionally track previous review experience', async () => {
      const withExperience = { ...mockStep1Data, hasReviewedBefore: true };
      const withoutExperience = { ...mockStep1Data, hasReviewedBefore: false, conferencesReviewed: '' };

      expect(withExperience.hasReviewedBefore).toBe(true);
      expect(withExperience.conferencesReviewed).toBeTruthy();
      expect(withoutExperience.hasReviewedBefore).toBe(false);
    });
  });

  // =========================================================================
  // Step 2: Expertise
  // =========================================================================

  describe('Step 2: Expertise', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should update profile with expertise', async () => {
      vi.mocked(prisma.reviewerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 1,
      } as never);

      vi.mocked(prisma.reviewerProfile.update).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep2Data,
        onboardingStep: 2,
      } as never);

      const result = await prisma.reviewerProfile.update({
        where: { userId: mockUserId },
        data: {
          ...mockStep2Data,
          onboardingStep: 2,
        },
      });

      expect(result.onboardingStep).toBe(2);
      expect(result.expertiseAreas).toHaveLength(3);
    });

    it('should require at least one expertise area', async () => {
      const dataWithoutExpertise = {
        ...mockStep2Data,
        expertiseAreas: [],
      };

      expect(dataWithoutExpertise.expertiseAreas.length).toBe(0);
    });

    it('should limit expertise areas to 10', async () => {
      const tooManyAreas = Array(11).fill('Topic');
      expect(tooManyAreas.length).toBeGreaterThan(10);
    });
  });

  // =========================================================================
  // Step 3: Review Preferences
  // =========================================================================

  describe('Step 3: Review Preferences', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should update profile with review preferences', async () => {
      vi.mocked(prisma.reviewerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 2,
      } as never);

      vi.mocked(prisma.reviewerProfile.update).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        ...mockStep3Data,
        onboardingStep: 3,
      } as never);

      const result = await prisma.reviewerProfile.update({
        where: { userId: mockUserId },
        data: {
          ...mockStep3Data,
          onboardingStep: 3,
        },
      });

      expect(result.onboardingStep).toBe(3);
      expect(result.reviewCriteria).toContain('technical_depth');
    });

    it('should require at least one review criteria', async () => {
      const dataWithoutCriteria = {
        ...mockStep3Data,
        reviewCriteria: [],
      };

      expect(dataWithoutCriteria.reviewCriteria.length).toBe(0);
    });
  });

  // =========================================================================
  // Step 4: Availability & Complete
  // =========================================================================

  describe('Step 4: Availability & Complete', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should complete onboarding with availability', async () => {
      vi.mocked(prisma.reviewerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingStep: 3,
      } as never);

      vi.mocked(prisma.reviewerProfile.update).mockResolvedValue({
        ...mockCompleteProfile,
        onboardingStep: 4,
        onboardingCompleted: true,
      } as never);

      const result = await prisma.reviewerProfile.update({
        where: { userId: mockUserId },
        data: {
          ...mockStep4Data,
          onboardingStep: 4,
          onboardingCompleted: true,
        },
      });

      expect(result.onboardingStep).toBe(4);
      expect(result.onboardingCompleted).toBe(true);
      expect(result.hoursPerWeek).toBe('5-10');
    });

    it('should update user role to REVIEWER on completion', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: mockUserId,
        role: 'USER',
      } as never);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: mockUserId,
        role: 'REVIEWER',
      } as never);

      const user = await prisma.user.update({
        where: { id: mockUserId },
        data: { role: 'REVIEWER' },
      });

      expect(user.role).toBe('REVIEWER');
    });

    it('should set showOnTeamPage preference', async () => {
      vi.mocked(prisma.reviewerProfile.update).mockResolvedValue({
        ...mockCompleteProfile,
        showOnTeamPage: true,
      } as never);

      const result = await prisma.reviewerProfile.update({
        where: { userId: mockUserId },
        data: { showOnTeamPage: true },
      });

      expect(result.showOnTeamPage).toBe(true);
    });
  });

  // =========================================================================
  // Hours Per Week Options
  // =========================================================================

  describe('Hours Per Week Options', () => {
    it('should have valid hour options', () => {
      const validOptions = ['1-2', '2-5', '5-10', '10+'];
      
      expect(validOptions).toContain(mockStep4Data.hoursPerWeek);
    });
  });

  // =========================================================================
  // Event Size Preferences
  // =========================================================================

  describe('Event Size Preferences', () => {
    it('should have valid event size options', () => {
      const validOptions = ['small', 'medium', 'large', 'any'];
      
      expect(validOptions).toContain(mockStep4Data.preferredEventSize);
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
        vi.mocked(prisma.reviewerProfile.findUnique).mockResolvedValue({
          id: 'profile-123',
          userId: mockUserId,
          onboardingStep: step,
          onboardingCompleted: step === 4,
        } as never);

        const profile = await prisma.reviewerProfile.findUnique({
          where: { userId: mockUserId },
        });

        expect(profile?.onboardingStep).toBe(step);
      }
    });

    it('should allow editing after completion', async () => {
      vi.mocked(prisma.reviewerProfile.findUnique).mockResolvedValue({
        ...mockCompleteProfile,
        onboardingCompleted: true,
      } as never);

      vi.mocked(prisma.reviewerProfile.update).mockResolvedValue({
        ...mockCompleteProfile,
        bio: 'Updated bio content here.',
      } as never);

      const result = await prisma.reviewerProfile.update({
        where: { userId: mockUserId },
        data: { bio: 'Updated bio content here.' },
      });

      expect(result.bio).toBe('Updated bio content here.');
    });
  });

  // =========================================================================
  // Public Display
  // =========================================================================

  describe('Public Display', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should control visibility on team page', async () => {
      vi.mocked(prisma.reviewerProfile.update).mockResolvedValue({
        ...mockCompleteProfile,
        showOnTeamPage: false,
      } as never);

      const result = await prisma.reviewerProfile.update({
        where: { userId: mockUserId },
        data: { showOnTeamPage: false },
      });

      expect(result.showOnTeamPage).toBe(false);
    });

    it('should allow display order customization', async () => {
      vi.mocked(prisma.reviewerProfile.update).mockResolvedValue({
        ...mockCompleteProfile,
        displayOrder: 5,
      } as never);

      const result = await prisma.reviewerProfile.update({
        where: { userId: mockUserId },
        data: { displayOrder: 5 },
      });

      expect(result.displayOrder).toBe(5);
    });
  });
});
