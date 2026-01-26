/**
 * Review Capability Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Review, ReviewRecommendation } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  review: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

import { ReviewCapabilityImpl } from '@/lib/plugins/capabilities/reviews';
import { PluginPermissionError } from '@/lib/plugins/types';

describe('ReviewCapability', () => {
  const mockReview: Review = {
    id: 'review-1',
    submissionId: 'sub-1',
    reviewerId: 'user-1',
    contentScore: 4,
    presentationScore: 3,
    relevanceScore: 5,
    overallScore: 4,
    privateNotes: 'Internal notes',
    publicNotes: 'Feedback for speaker',
    recommendation: 'ACCEPT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should get review with read permission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:read']),
        'test-plugin'
      );
      
      mockPrisma.review.findUnique.mockResolvedValue(mockReview);
      
      const result = await capability.get('review-1');
      
      expect(result).toEqual(mockReview);
      expect(mockPrisma.review.findUnique).toHaveBeenCalledWith({
        where: { id: 'review-1' },
      });
    });

    it('should throw without read permission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set([]),
        'test-plugin'
      );
      
      await expect(capability.get('review-1')).rejects.toThrow(PluginPermissionError);
    });
  });

  describe('list', () => {
    it('should list reviews with read permission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:read']),
        'test-plugin'
      );
      
      mockPrisma.review.findMany.mockResolvedValue([mockReview]);
      
      const result = await capability.list();
      
      expect(result).toEqual([mockReview]);
    });

    it('should filter by submissionId', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:read']),
        'test-plugin'
      );
      
      mockPrisma.review.findMany.mockResolvedValue([]);
      
      await capability.list({ submissionId: 'sub-1' });
      
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { submissionId: 'sub-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by recommendation', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:read']),
        'test-plugin'
      );
      
      mockPrisma.review.findMany.mockResolvedValue([]);
      
      await capability.list({ recommendation: 'STRONG_ACCEPT' });
      
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { recommendation: 'STRONG_ACCEPT' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getBySubmission', () => {
    it('should get reviews for submission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:read']),
        'test-plugin'
      );
      
      mockPrisma.review.findMany.mockResolvedValue([mockReview]);
      
      const result = await capability.getBySubmission('sub-1');
      
      expect(result).toEqual([mockReview]);
      expect(mockPrisma.review.findMany).toHaveBeenCalledWith({
        where: { submissionId: 'sub-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create review with write permission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:write']),
        'test-plugin'
      );
      
      mockPrisma.review.create.mockResolvedValue(mockReview);
      
      const result = await capability.create({
        submissionId: 'sub-1',
        reviewerId: 'user-1',
        overallScore: 4,
        recommendation: 'ACCEPT',
      });
      
      expect(result).toEqual(mockReview);
      expect(mockPrisma.review.create).toHaveBeenCalledWith({
        data: {
          submissionId: 'sub-1',
          reviewerId: 'user-1',
          contentScore: undefined,
          presentationScore: undefined,
          relevanceScore: undefined,
          overallScore: 4,
          privateNotes: undefined,
          publicNotes: undefined,
          recommendation: 'ACCEPT',
        },
      });
    });

    it('should throw without write permission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:read']),
        'test-plugin'
      );
      
      await expect(capability.create({
        submissionId: 'sub-1',
        reviewerId: 'user-1',
      })).rejects.toThrow(PluginPermissionError);
    });
  });

  describe('update', () => {
    it('should update review with write permission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:write']),
        'test-plugin'
      );
      
      const updatedReview = { ...mockReview, overallScore: 5 };
      mockPrisma.review.update.mockResolvedValue(updatedReview);
      
      const result = await capability.update('review-1', { overallScore: 5 });
      
      expect(result.overallScore).toBe(5);
      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'review-1' },
        data: { overallScore: 5 },
      });
    });

    it('should throw without write permission', async () => {
      const capability = new ReviewCapabilityImpl(
        mockPrisma as any,
        new Set(['reviews:read']),
        'test-plugin'
      );
      
      await expect(capability.update('review-1', { overallScore: 5 })).rejects.toThrow(
        PluginPermissionError
      );
    });
  });
});
