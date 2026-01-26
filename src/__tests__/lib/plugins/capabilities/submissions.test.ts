/**
 * Submission Capability Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Submission, SubmissionStatus } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  submission: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

import { SubmissionCapabilityImpl } from '@/lib/plugins/capabilities/submissions';
import { PluginPermissionError } from '@/lib/plugins/types';

describe('SubmissionCapability', () => {
  const mockSubmission: Submission = {
    id: 'sub-1',
    eventId: 'event-1',
    speakerId: 'user-1',
    trackId: null,
    formatId: null,
    talkId: null,
    title: 'Test Submission',
    abstract: 'Test abstract',
    outline: null,
    targetAudience: null,
    prerequisites: null,
    status: 'PENDING',
    statusUpdatedAt: null,
    isFederated: false,
    federatedSpeakerId: null,
    externalSubmissionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should get submission with read permission', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:read']),
        'test-plugin'
      );
      
      mockPrisma.submission.findUnique.mockResolvedValue(mockSubmission);
      
      const result = await capability.get('sub-1');
      
      expect(result).toEqual(mockSubmission);
      expect(mockPrisma.submission.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
    });

    it('should throw without read permission', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set([]),
        'test-plugin'
      );
      
      await expect(capability.get('sub-1')).rejects.toThrow(PluginPermissionError);
    });

    it('should return null for non-existent submission', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:read']),
        'test-plugin'
      );
      
      mockPrisma.submission.findUnique.mockResolvedValue(null);
      
      const result = await capability.get('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list submissions with read permission', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:read']),
        'test-plugin'
      );
      
      mockPrisma.submission.findMany.mockResolvedValue([mockSubmission]);
      
      const result = await capability.list();
      
      expect(result).toEqual([mockSubmission]);
      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by eventId', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:read']),
        'test-plugin'
      );
      
      mockPrisma.submission.findMany.mockResolvedValue([]);
      
      await capability.list({ eventId: 'event-1' });
      
      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by status', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:read']),
        'test-plugin'
      );
      
      mockPrisma.submission.findMany.mockResolvedValue([]);
      
      await capability.list({ status: 'ACCEPTED' });
      
      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith({
        where: { status: 'ACCEPTED' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by multiple criteria', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:read']),
        'test-plugin'
      );
      
      mockPrisma.submission.findMany.mockResolvedValue([]);
      
      await capability.list({
        eventId: 'event-1',
        speakerId: 'user-1',
        status: 'PENDING',
        trackId: 'track-1',
      });
      
      expect(mockPrisma.submission.findMany).toHaveBeenCalledWith({
        where: {
          eventId: 'event-1',
          speakerId: 'user-1',
          status: 'PENDING',
          trackId: 'track-1',
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw without read permission', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set([]),
        'test-plugin'
      );
      
      await expect(capability.list()).rejects.toThrow(PluginPermissionError);
    });
  });

  describe('updateStatus', () => {
    it('should update status with manage permission', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:manage']),
        'test-plugin'
      );
      
      const updatedSubmission = { ...mockSubmission, status: 'ACCEPTED' as SubmissionStatus };
      mockPrisma.submission.update.mockResolvedValue(updatedSubmission);
      
      const result = await capability.updateStatus('sub-1', 'ACCEPTED');
      
      expect(result.status).toBe('ACCEPTED');
      expect(mockPrisma.submission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          status: 'ACCEPTED',
          statusUpdatedAt: expect.any(Date),
        },
      });
    });

    it('should throw without manage permission', async () => {
      const capability = new SubmissionCapabilityImpl(
        mockPrisma as any,
        new Set(['submissions:read']), // only read, not manage
        'test-plugin'
      );
      
      await expect(capability.updateStatus('sub-1', 'ACCEPTED')).rejects.toThrow(
        PluginPermissionError
      );
    });
  });
});
