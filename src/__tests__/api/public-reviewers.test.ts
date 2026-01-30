/**
 * Public Reviewers API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reviewerProfile: {
      findMany: vi.fn(),
    },
  },
}));

// Mock rate limiting to always pass
vi.mock('@/lib/rate-limit', () => ({
  rateLimitMiddleware: vi.fn().mockReturnValue(null),
}));

// Mock encryption to return data as-is for testing
vi.mock('@/lib/security/encryption', () => ({
  decryptPiiFields: vi.fn((data: Record<string, unknown>) => data),
  REVIEWER_PROFILE_PII_FIELDS: ['fullName', 'bio'],
}));

import { GET } from '@/app/api/public/reviewers/route';
import { prisma } from '@/lib/db/prisma';

function createMockRequest(): NextRequest {
  return new NextRequest('http://localhost/api/public/reviewers');
}

const mockPrisma = vi.mocked(prisma);

const mockReviewers = [
  {
    id: 'reviewer-1',
    fullName: 'John Doe',
    designation: 'Senior Engineer',
    company: 'Acme Inc',
    bio: 'Experienced software engineer',
    photoUrl: 'https://example.com/photo1.jpg',
    expertiseAreas: ['Frontend Development', 'Backend Development'],
    linkedinUrl: 'https://linkedin.com/in/johndoe',
    twitterHandle: 'johndoe',
    githubUsername: 'johndoe',
    websiteUrl: 'https://johndoe.com',
    user: { image: null },
  },
  {
    id: 'reviewer-2',
    fullName: 'Jane Smith',
    designation: 'Tech Lead',
    company: 'Tech Corp',
    bio: 'Tech lead with focus on architecture',
    photoUrl: null,
    expertiseAreas: ['System Architecture', 'DevOps'],
    linkedinUrl: 'https://linkedin.com/in/janesmith',
    twitterHandle: null,
    githubUsername: 'janesmith',
    websiteUrl: null,
    user: { image: 'https://example.com/user-image.jpg' },
  },
];

describe('Public Reviewers API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/public/reviewers', () => {
    it('returns list of reviewers', async () => {
      mockPrisma.reviewerProfile.findMany.mockResolvedValueOnce(mockReviewers);

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviewers).toHaveLength(2);
    });

    it('filters only showOnTeamPage and onboardingCompleted reviewers', async () => {
      mockPrisma.reviewerProfile.findMany.mockResolvedValueOnce(mockReviewers);

      await GET(createMockRequest());

      expect(mockPrisma.reviewerProfile.findMany).toHaveBeenCalledWith({
        where: {
          showOnTeamPage: true,
          onboardingCompleted: true,
        },
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'asc' },
        ],
        select: expect.any(Object),
      });
    });

    it('uses user image as fallback for photoUrl', async () => {
      mockPrisma.reviewerProfile.findMany.mockResolvedValueOnce(mockReviewers);

      const response = await GET(createMockRequest());
      const data = await response.json();

      // First reviewer has photoUrl
      expect(data.reviewers[0].photoUrl).toBe('https://example.com/photo1.jpg');

      // Second reviewer falls back to user.image
      expect(data.reviewers[1].photoUrl).toBe('https://example.com/user-image.jpg');
    });

    it('removes user object from response', async () => {
      mockPrisma.reviewerProfile.findMany.mockResolvedValueOnce(mockReviewers);

      const response = await GET(createMockRequest());
      const data = await response.json();

      data.reviewers.forEach((reviewer: Record<string, unknown>) => {
        expect(reviewer.user).toBeUndefined();
      });
    });

    it('returns empty array when no reviewers', async () => {
      mockPrisma.reviewerProfile.findMany.mockResolvedValueOnce([]);

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.reviewers).toHaveLength(0);
    });

    it('handles database errors gracefully', async () => {
      mockPrisma.reviewerProfile.findMany.mockRejectedValueOnce(new Error('Database error'));

      const response = await GET(createMockRequest());
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch reviewers');
    });
  });
});
