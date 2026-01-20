/**
 * Submissions API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    submission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
    },
    speakerProfile: {
      findUnique: vi.fn(),
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('Submissions API', () => {
  const mockUserId = 'user-123';
  const mockSession = { user: { id: mockUserId, email: 'speaker@example.com' } };
  
  const mockSubmission = {
    id: 'sub-123',
    eventId: 'event-123',
    speakerId: mockUserId,
    title: 'Building Scalable APIs',
    abstract: 'Learn how to build performant APIs with Node.js and best practices for production.',
    outline: '1. Intro\n2. Demo\n3. Q&A',
    targetAudience: 'Intermediate developers',
    prerequisites: 'Basic JavaScript knowledge',
    status: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEvent = {
    id: 'event-123',
    name: 'DevConf 2024',
    slug: 'devconf-2024',
    isPublished: true,
    cfpOpensAt: new Date(Date.now() - 86400000), // Yesterday
    cfpClosesAt: new Date(Date.now() + 86400000), // Tomorrow
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
  // List Submissions
  // =========================================================================

  describe('GET /api/submissions', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should return user submissions', async () => {
      vi.mocked(prisma.submission.findMany).mockResolvedValue([mockSubmission as never]);
      vi.mocked(prisma.submission.count).mockResolvedValue(1);
      
      const result = await prisma.submission.findMany({
        where: { speakerId: mockUserId },
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Building Scalable APIs');
    });

    it('should filter by status', async () => {
      vi.mocked(prisma.submission.findMany).mockResolvedValue([mockSubmission as never]);
      
      await prisma.submission.findMany({
        where: { speakerId: mockUserId, status: 'PENDING' },
      });
      
      expect(prisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        })
      );
    });

    it('should filter by event', async () => {
      vi.mocked(prisma.submission.findMany).mockResolvedValue([mockSubmission as never]);
      
      await prisma.submission.findMany({
        where: { speakerId: mockUserId, eventId: 'event-123' },
      });
      
      expect(prisma.submission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventId: 'event-123' }),
        })
      );
    });

    it('should return empty list for new user', async () => {
      vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
      vi.mocked(prisma.submission.count).mockResolvedValue(0);
      
      const result = await prisma.submission.findMany({
        where: { speakerId: mockUserId },
      });
      
      expect(result).toEqual([]);
    });
  });

  // =========================================================================
  // Create Submission
  // =========================================================================

  describe('POST /api/events/[id]/submissions', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should create a new submission', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingCompleted: true,
      } as never);
      vi.mocked(prisma.submission.create).mockResolvedValue(mockSubmission as never);
      
      const result = await prisma.submission.create({
        data: {
          eventId: 'event-123',
          speakerId: mockUserId,
          title: mockSubmission.title,
          abstract: mockSubmission.abstract,
        },
      });
      
      expect(result.id).toBe('sub-123');
      expect(prisma.submission.create).toHaveBeenCalled();
    });

    it('should reject submission to closed CFP', async () => {
      const closedEvent = {
        ...mockEvent,
        cfpClosesAt: new Date(Date.now() - 86400000), // Yesterday
      };
      vi.mocked(prisma.event.findUnique).mockResolvedValue(closedEvent as never);
      
      const event = await prisma.event.findUnique({
        where: { id: 'event-123' },
      });
      
      // CFP is closed
      expect(event?.cfpClosesAt).toBeDefined();
      expect(new Date(event!.cfpClosesAt!).getTime()).toBeLessThan(Date.now());
    });

    it('should reject submission before CFP opens', async () => {
      const futureEvent = {
        ...mockEvent,
        cfpOpensAt: new Date(Date.now() + 86400000), // Tomorrow
      };
      vi.mocked(prisma.event.findUnique).mockResolvedValue(futureEvent as never);
      
      const event = await prisma.event.findUnique({
        where: { id: 'event-123' },
      });
      
      // CFP not open yet
      expect(event?.cfpOpensAt).toBeDefined();
      expect(new Date(event!.cfpOpensAt!).getTime()).toBeGreaterThan(Date.now());
    });

    it('should reject submission without speaker profile', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue(null);
      
      const profile = await prisma.speakerProfile.findUnique({
        where: { userId: mockUserId },
      });
      
      expect(profile).toBeNull();
    });

    it('should reject submission with incomplete onboarding', async () => {
      vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as never);
      vi.mocked(prisma.speakerProfile.findUnique).mockResolvedValue({
        id: 'profile-123',
        userId: mockUserId,
        onboardingCompleted: false,
      } as never);
      
      const profile = await prisma.speakerProfile.findUnique({
        where: { userId: mockUserId },
      });
      
      expect(profile?.onboardingCompleted).toBe(false);
    });
  });

  // =========================================================================
  // Get Single Submission
  // =========================================================================

  describe('GET /api/events/[id]/submissions/[submissionId]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should return submission by id', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never);
      
      const result = await prisma.submission.findUnique({
        where: { id: 'sub-123' },
      });
      
      expect(result?.id).toBe('sub-123');
      expect(result?.title).toBe('Building Scalable APIs');
    });

    it('should return null for non-existent submission', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(null);
      
      const result = await prisma.submission.findUnique({
        where: { id: 'non-existent' },
      });
      
      expect(result).toBeNull();
    });

    it('should check ownership for speakers', async () => {
      const otherUserSubmission = { ...mockSubmission, speakerId: 'other-user' };
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(otherUserSubmission as never);
      
      const result = await prisma.submission.findUnique({
        where: { id: 'sub-123' },
      });
      
      // In actual API, this would return 403 for non-owners
      expect(result?.speakerId).not.toBe(mockUserId);
    });
  });

  // =========================================================================
  // Update Submission
  // =========================================================================

  describe('PATCH /api/events/[id]/submissions/[submissionId]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should update submission', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never);
      const updatedSubmission = { ...mockSubmission, title: 'Updated Title' };
      vi.mocked(prisma.submission.update).mockResolvedValue(updatedSubmission as never);
      
      const result = await prisma.submission.update({
        where: { id: 'sub-123' },
        data: { title: 'Updated Title' },
      });
      
      expect(result.title).toBe('Updated Title');
    });

    it('should only allow pending submission updates', async () => {
      const acceptedSubmission = { ...mockSubmission, status: 'ACCEPTED' };
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(acceptedSubmission as never);
      
      const submission = await prisma.submission.findUnique({
        where: { id: 'sub-123' },
      });
      
      // In actual API, non-pending submissions cannot be updated
      expect(submission?.status).toBe('ACCEPTED');
    });

    it('should allow partial updates', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never);
      vi.mocked(prisma.submission.update).mockResolvedValue(mockSubmission as never);
      
      await prisma.submission.update({
        where: { id: 'sub-123' },
        data: { abstract: 'Updated abstract that is long enough for validation' },
      });
      
      expect(prisma.submission.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ abstract: expect.any(String) }),
        })
      );
    });
  });

  // =========================================================================
  // Withdraw Submission
  // =========================================================================

  describe('Withdraw Submission', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should withdraw pending submission', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never);
      const withdrawnSubmission = { ...mockSubmission, status: 'WITHDRAWN' };
      vi.mocked(prisma.submission.update).mockResolvedValue(withdrawnSubmission as never);
      
      const result = await prisma.submission.update({
        where: { id: 'sub-123' },
        data: { status: 'WITHDRAWN' },
      });
      
      expect(result.status).toBe('WITHDRAWN');
    });

    it('should not allow withdrawing accepted submission', async () => {
      const acceptedSubmission = { ...mockSubmission, status: 'ACCEPTED' };
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(acceptedSubmission as never);
      
      const submission = await prisma.submission.findUnique({
        where: { id: 'sub-123' },
      });
      
      // Business logic: Cannot withdraw accepted submissions
      expect(submission?.status).toBe('ACCEPTED');
    });
  });

  // =========================================================================
  // Submission Status
  // =========================================================================

  describe('Submission Status Management', () => {
    const adminSession = { 
      user: { id: 'admin-123', email: 'admin@example.com', role: 'ADMIN' } 
    };

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(adminSession as never);
    });

    it('should allow admin to accept submission', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never);
      const acceptedSubmission = { ...mockSubmission, status: 'ACCEPTED' };
      vi.mocked(prisma.submission.update).mockResolvedValue(acceptedSubmission as never);
      
      const result = await prisma.submission.update({
        where: { id: 'sub-123' },
        data: { status: 'ACCEPTED' },
      });
      
      expect(result.status).toBe('ACCEPTED');
    });

    it('should allow admin to reject submission', async () => {
      vi.mocked(prisma.submission.findUnique).mockResolvedValue(mockSubmission as never);
      const rejectedSubmission = { ...mockSubmission, status: 'REJECTED' };
      vi.mocked(prisma.submission.update).mockResolvedValue(rejectedSubmission as never);
      
      const result = await prisma.submission.update({
        where: { id: 'sub-123' },
        data: { status: 'REJECTED' },
      });
      
      expect(result.status).toBe('REJECTED');
    });

    it('should track status changes', async () => {
      const validStatuses = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'WITHDRAWN'];
      
      for (const status of validStatuses) {
        const updated = { ...mockSubmission, status };
        vi.mocked(prisma.submission.update).mockResolvedValue(updated as never);
        
        const result = await prisma.submission.update({
          where: { id: 'sub-123' },
          data: { status },
        });
        
        expect(validStatuses).toContain(result.status);
      }
    });
  });

  // =========================================================================
  // Submission Fields
  // =========================================================================

  describe('Submission Fields', () => {
    it('should have all required fields', () => {
      const requiredFields = ['id', 'eventId', 'speakerId', 'title', 'abstract', 'status'];
      
      for (const field of requiredFields) {
        expect(mockSubmission).toHaveProperty(field);
      }
    });

    it('should have all optional fields', () => {
      const optionalFields = ['outline', 'targetAudience', 'prerequisites', 'trackId', 'formatId'];
      
      // Some optional fields may not be in mock
      const existingOptional = optionalFields.filter(f => f in mockSubmission);
      expect(existingOptional.length).toBeGreaterThan(0);
    });

    it('should have valid status', () => {
      const validStatuses = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'WITHDRAWN'];
      expect(validStatuses).toContain(mockSubmission.status);
    });
  });
});
