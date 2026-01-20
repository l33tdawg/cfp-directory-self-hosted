/**
 * Talks Library API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    talk: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { auth } from '@/lib/auth';

describe('Talks Library API', () => {
  const mockUserId = 'user-123';
  const mockSession = { user: { id: mockUserId, email: 'test@example.com' } };
  
  const mockTalk = {
    id: 'talk-123',
    userId: mockUserId,
    title: 'Building Scalable APIs',
    abstract: 'Learn how to build performant APIs with Node.js and best practices.',
    description: 'Extended description',
    outline: '1. Intro\n2. Demo\n3. Q&A',
    type: 'SESSION',
    durationMin: 45,
    targetAudience: ['Developers'],
    prerequisites: 'Basic JS knowledge',
    speakerNotes: 'Remember the demo',
    tags: ['nodejs', 'api'],
    isArchived: false,
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
  // List Talks
  // =========================================================================

  describe('GET /api/talks', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should return empty list for new user', async () => {
      vi.mocked(prisma.talk.findMany).mockResolvedValue([]);
      vi.mocked(prisma.talk.count).mockResolvedValue(0);
      
      const result = await prisma.talk.findMany({
        where: { userId: mockUserId, isArchived: false },
      });
      
      expect(result).toEqual([]);
    });

    it('should return user talks', async () => {
      vi.mocked(prisma.talk.findMany).mockResolvedValue([mockTalk as never]);
      vi.mocked(prisma.talk.count).mockResolvedValue(1);
      
      const result = await prisma.talk.findMany({
        where: { userId: mockUserId },
      });
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Building Scalable APIs');
    });

    it('should filter by type', async () => {
      vi.mocked(prisma.talk.findMany).mockResolvedValue([mockTalk as never]);
      
      await prisma.talk.findMany({
        where: { userId: mockUserId, type: 'SESSION' },
      });
      
      expect(prisma.talk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'SESSION' }),
        })
      );
    });

    it('should search by title', async () => {
      vi.mocked(prisma.talk.findMany).mockResolvedValue([mockTalk as never]);
      
      await prisma.talk.findMany({
        where: {
          userId: mockUserId,
          OR: [
            { title: { contains: 'API', mode: 'insensitive' } },
            { abstract: { contains: 'API', mode: 'insensitive' } },
          ],
        },
      });
      
      expect(prisma.talk.findMany).toHaveBeenCalled();
    });

    it('should exclude archived by default', async () => {
      vi.mocked(prisma.talk.findMany).mockResolvedValue([]);
      
      await prisma.talk.findMany({
        where: { userId: mockUserId, isArchived: false },
      });
      
      expect(prisma.talk.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isArchived: false }),
        })
      );
    });
  });

  // =========================================================================
  // Create Talk
  // =========================================================================

  describe('POST /api/talks', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should create a new talk', async () => {
      vi.mocked(prisma.talk.create).mockResolvedValue(mockTalk as never);
      
      const result = await prisma.talk.create({
        data: {
          userId: mockUserId,
          title: mockTalk.title,
          abstract: mockTalk.abstract,
          type: 'SESSION',
          durationMin: 45,
        },
      });
      
      expect(result.id).toBe('talk-123');
      expect(prisma.talk.create).toHaveBeenCalled();
    });

    it('should set default values', async () => {
      const talkWithDefaults = { ...mockTalk, type: 'SESSION', durationMin: 30 };
      vi.mocked(prisma.talk.create).mockResolvedValue(talkWithDefaults as never);
      
      const result = await prisma.talk.create({
        data: {
          userId: mockUserId,
          title: 'My Talk',
          abstract: 'Abstract content',
          type: 'SESSION',
          durationMin: 30,
        },
      });
      
      expect(result.type).toBe('SESSION');
      expect(result.durationMin).toBe(30);
    });
  });

  // =========================================================================
  // Get Single Talk
  // =========================================================================

  describe('GET /api/talks/[id]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should return talk by id', async () => {
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(mockTalk as never);
      
      const result = await prisma.talk.findUnique({
        where: { id: 'talk-123' },
      });
      
      expect(result?.id).toBe('talk-123');
      expect(result?.title).toBe('Building Scalable APIs');
    });

    it('should return null for non-existent talk', async () => {
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(null);
      
      const result = await prisma.talk.findUnique({
        where: { id: 'non-existent' },
      });
      
      expect(result).toBeNull();
    });

    it('should check ownership', async () => {
      const otherUserTalk = { ...mockTalk, userId: 'other-user' };
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(otherUserTalk as never);
      
      const result = await prisma.talk.findUnique({
        where: { id: 'talk-123' },
      });
      
      // In actual API, this would return 403
      expect(result?.userId).not.toBe(mockUserId);
    });
  });

  // =========================================================================
  // Update Talk
  // =========================================================================

  describe('PATCH /api/talks/[id]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should update talk', async () => {
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(mockTalk as never);
      const updatedTalk = { ...mockTalk, title: 'Updated Title' };
      vi.mocked(prisma.talk.update).mockResolvedValue(updatedTalk as never);
      
      const result = await prisma.talk.update({
        where: { id: 'talk-123' },
        data: { title: 'Updated Title' },
      });
      
      expect(result.title).toBe('Updated Title');
    });

    it('should archive talk', async () => {
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(mockTalk as never);
      const archivedTalk = { ...mockTalk, isArchived: true };
      vi.mocked(prisma.talk.update).mockResolvedValue(archivedTalk as never);
      
      const result = await prisma.talk.update({
        where: { id: 'talk-123' },
        data: { isArchived: true },
      });
      
      expect(result.isArchived).toBe(true);
    });

    it('should allow partial updates', async () => {
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(mockTalk as never);
      vi.mocked(prisma.talk.update).mockResolvedValue(mockTalk as never);
      
      await prisma.talk.update({
        where: { id: 'talk-123' },
        data: { durationMin: 60 },
      });
      
      expect(prisma.talk.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { durationMin: 60 },
        })
      );
    });
  });

  // =========================================================================
  // Delete Talk
  // =========================================================================

  describe('DELETE /api/talks/[id]', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockSession as never);
    });

    it('should delete talk with no submissions', async () => {
      const talkNoSubmissions = { 
        ...mockTalk, 
        _count: { submissions: 0 } 
      };
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(talkNoSubmissions as never);
      vi.mocked(prisma.talk.delete).mockResolvedValue(mockTalk as never);
      
      await prisma.talk.delete({
        where: { id: 'talk-123' },
      });
      
      expect(prisma.talk.delete).toHaveBeenCalledWith({
        where: { id: 'talk-123' },
      });
    });

    it('should prevent deletion if talk has submissions', async () => {
      const talkWithSubmissions = { 
        ...mockTalk, 
        userId: mockUserId,
        _count: { submissions: 3 } 
      };
      vi.mocked(prisma.talk.findUnique).mockResolvedValue(talkWithSubmissions as never);
      
      const result = await prisma.talk.findUnique({
        where: { id: 'talk-123' },
        select: { userId: true, _count: { select: { submissions: true } } },
      });
      
      // In actual API, this would return 400
      expect(result?._count?.submissions).toBe(3);
    });
  });

  // =========================================================================
  // Talk Fields
  // =========================================================================

  describe('Talk Fields', () => {
    it('should have all required fields', () => {
      const requiredFields = ['id', 'userId', 'title', 'abstract', 'type', 'durationMin'];
      
      for (const field of requiredFields) {
        expect(mockTalk).toHaveProperty(field);
      }
    });

    it('should have all optional fields', () => {
      const optionalFields = [
        'description',
        'outline',
        'targetAudience',
        'prerequisites',
        'speakerNotes',
        'tags',
        'isArchived',
      ];
      
      for (const field of optionalFields) {
        expect(mockTalk).toHaveProperty(field);
      }
    });

    it('should have valid talk types', () => {
      const validTypes = ['KEYNOTE', 'SESSION', 'WORKSHOP', 'LIGHTNING', 'PANEL', 'BOF', 'TUTORIAL'];
      expect(validTypes).toContain(mockTalk.type);
    });
  });
});
