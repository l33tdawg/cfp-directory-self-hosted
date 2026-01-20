/**
 * Admin Reviewers API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types
interface MockUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  image?: string | null;
  reviewerProfile?: {
    fullName: string;
    expertiseAreas: string[];
    onboardingCompleted: boolean;
  } | null;
  _count?: { reviews: number; reviewTeamEvents: number };
}

interface MockReviewGroupBy {
  reviewerId: string;
  _count: number;
  _avg: { overallScore: number | null };
}

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    review: {
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    submission: {
      count: vi.fn(),
    },
  },
}));

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('Admin Reviewers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/reviewers', () => {
    it('should return 403 for regular users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as MockUser);

      const { GET } = await import('@/app/api/admin/reviewers/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return reviewers for admin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'reviewer1',
          name: 'John Reviewer',
          email: 'john@test.com',
          image: null,
          reviewerProfile: {
            fullName: 'John Reviewer',
            expertiseAreas: ['JavaScript', 'React'],
            onboardingCompleted: true,
          },
          _count: { reviews: 10, reviewTeamEvents: 2 },
        },
      ] as MockUser[]);

      vi.mocked(prisma.review.groupBy).mockResolvedValue([
        { reviewerId: 'reviewer1', _count: 10, _avg: { overallScore: 4.2 } },
      ] as MockReviewGroupBy[]);

      vi.mocked(prisma.review.count).mockResolvedValue(10);
      vi.mocked(prisma.submission.count).mockResolvedValue(5);

      const { GET } = await import('@/app/api/admin/reviewers/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviewers).toBeDefined();
      expect(data.stats).toBeDefined();
      expect(data.stats.totalReviewers).toBe(1);
    });

    it('should allow ORGANIZER role', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'organizer1',
        email: 'organizer@test.com',
        role: 'ORGANIZER',
      } as MockUser);

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.review.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.review.count).mockResolvedValue(0);
      vi.mocked(prisma.submission.count).mockResolvedValue(0);

      const { GET } = await import('@/app/api/admin/reviewers/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviewers).toBeDefined();
    });

    it('should include reviewer stats', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'reviewer1',
          name: 'Active Reviewer',
          email: 'active@test.com',
          image: null,
          reviewerProfile: {
            fullName: 'Active Reviewer',
            expertiseAreas: [],
            onboardingCompleted: true,
          },
          _count: { reviews: 25, reviewTeamEvents: 3 },
        },
        {
          id: 'reviewer2',
          name: 'New Reviewer',
          email: 'new@test.com',
          image: null,
          reviewerProfile: null,
          _count: { reviews: 0, reviewTeamEvents: 1 },
        },
      ] as MockUser[]);

      vi.mocked(prisma.review.groupBy).mockResolvedValue([
        { reviewerId: 'reviewer1', _count: 25, _avg: { overallScore: 3.8 } },
      ] as MockReviewGroupBy[]);

      vi.mocked(prisma.review.count).mockResolvedValue(25);
      vi.mocked(prisma.submission.count).mockResolvedValue(10);

      const { GET } = await import('@/app/api/admin/reviewers/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.totalReviews).toBe(25);
      expect(data.stats.totalPendingReviews).toBe(10);
      expect(data.stats.activeReviewers).toBe(1); // Only reviewer1 has reviews
    });
  });
});
