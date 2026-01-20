/**
 * Topics API Tests
 * 
 * Tests for the Topics API routes including CRUD operations,
 * bulk operations, and topic management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/topics/route';
import { GET as GET_ID, PATCH, DELETE } from '@/app/api/topics/[id]/route';
import { POST as BULK_POST, DELETE as BULK_DELETE } from '@/app/api/topics/bulk/route';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    topic: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

import { prisma } from '@/lib/db/prisma';
import { getServerSession } from 'next-auth';

const mockedPrisma = vi.mocked(prisma);
const mockedGetServerSession = vi.mocked(getServerSession);

// Helper to create mock request
function createMockRequest(url: string, method = 'GET', body?: unknown): NextRequest {
  const request = new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body && { body: JSON.stringify(body) }),
  });
  return request;
}

describe('Topics API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/topics', () => {
    it('should return active topics', async () => {
      const mockTopics = [
        { id: '1', name: 'Cloud Security', category: 'Core Security', isActive: true },
        { id: '2', name: 'Network Security', category: 'Core Security', isActive: true },
      ];

      mockedPrisma.topic.findMany.mockResolvedValue(mockTopics);
      mockedPrisma.topic.groupBy.mockResolvedValue([{ category: 'Core Security' }]);

      const request = createMockRequest('http://localhost:3000/api/topics');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.topics).toHaveLength(2);
      expect(data.categories).toContain('Core Security');
    });

    it('should filter by category', async () => {
      mockedPrisma.topic.findMany.mockResolvedValue([]);
      mockedPrisma.topic.groupBy.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/topics?category=Offensive');
      await GET(request);

      expect(mockedPrisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Offensive',
          }),
        })
      );
    });

    it('should support search', async () => {
      mockedPrisma.topic.findMany.mockResolvedValue([]);
      mockedPrisma.topic.groupBy.mockResolvedValue([]);

      const request = createMockRequest('http://localhost:3000/api/topics?search=cloud');
      await GET(request);

      expect(mockedPrisma.topic.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'cloud', mode: 'insensitive' },
          }),
        })
      );
    });
  });

  describe('POST /api/topics', () => {
    it('should require authentication', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = createMockRequest(
        'http://localhost:3000/api/topics',
        'POST',
        { name: 'New Topic' }
      );
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('should require admin role', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'USER' },
      });

      const request = createMockRequest(
        'http://localhost:3000/api/topics',
        'POST',
        { name: 'New Topic' }
      );
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should create a new topic for admin', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.findUnique.mockResolvedValue(null);
      mockedPrisma.topic.aggregate.mockResolvedValue({ _max: { sortOrder: 5 } });
      mockedPrisma.topic.create.mockResolvedValue({
        id: 'new-id',
        name: 'New Topic',
        category: 'Core Security',
        isActive: true,
        sortOrder: 6,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/topics',
        'POST',
        { name: 'New Topic', category: 'Core Security' }
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('New Topic');
    });

    it('should prevent duplicate topics', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.findUnique.mockResolvedValue({
        id: 'existing',
        name: 'Existing Topic',
        isActive: true,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/topics',
        'POST',
        { name: 'Existing Topic' }
      );
      const response = await POST(request);

      expect(response.status).toBe(409);
    });

    it('should reactivate inactive duplicate', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.findUnique.mockResolvedValue({
        id: 'existing',
        name: 'Inactive Topic',
        isActive: false,
        category: null,
        description: null,
      });
      mockedPrisma.topic.update.mockResolvedValue({
        id: 'existing',
        name: 'Inactive Topic',
        isActive: true,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/topics',
        'POST',
        { name: 'Inactive Topic' }
      );
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockedPrisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: true }),
        })
      );
    });
  });

  describe('PATCH /api/topics/[id]', () => {
    it('should update topic name', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.findUnique
        .mockResolvedValueOnce({ id: '1', name: 'Old Name' })
        .mockResolvedValueOnce(null); // No duplicate
      mockedPrisma.topic.update.mockResolvedValue({
        id: '1',
        name: 'New Name',
      });

      const request = createMockRequest(
        'http://localhost:3000/api/topics/1',
        'PATCH',
        { name: 'New Name' }
      );
      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('New Name');
    });

    it('should prevent duplicate names on update', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.findUnique
        .mockResolvedValueOnce({ id: '1', name: 'Topic 1' })
        .mockResolvedValueOnce({ id: '2', name: 'Topic 2' }); // Duplicate

      const request = createMockRequest(
        'http://localhost:3000/api/topics/1',
        'PATCH',
        { name: 'Topic 2' }
      );
      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/topics/[id]', () => {
    it('should soft delete (deactivate) topic', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.findUnique.mockResolvedValue({
        id: '1',
        name: 'Topic',
        isActive: true,
      });
      mockedPrisma.topic.update.mockResolvedValue({
        id: '1',
        name: 'Topic',
        isActive: false,
      });

      const request = createMockRequest(
        'http://localhost:3000/api/topics/1',
        'DELETE'
      );
      const response = await DELETE(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.topic.isActive).toBe(false);
      expect(mockedPrisma.topic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        })
      );
    });
  });

  describe('POST /api/topics/bulk', () => {
    it('should bulk import topics', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.findMany.mockResolvedValue([
        { name: 'Existing Topic' },
      ]);
      mockedPrisma.topic.aggregate.mockResolvedValue({ _max: { sortOrder: 10 } });
      mockedPrisma.topic.createMany.mockResolvedValue({ count: 2 });

      const request = createMockRequest(
        'http://localhost:3000/api/topics/bulk',
        'POST',
        {
          topics: [
            { name: 'New Topic 1', category: 'Security' },
            { name: 'New Topic 2', category: 'Security' },
            { name: 'Existing Topic' }, // Should be skipped
          ],
        }
      );
      const response = await BULK_POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.imported).toBe(2);
      expect(data.skipped).toBe(1);
    });

    it('should limit bulk import to 500 topics', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });

      const topics = Array.from({ length: 501 }, (_, i) => ({
        name: `Topic ${i}`,
      }));

      const request = createMockRequest(
        'http://localhost:3000/api/topics/bulk',
        'POST',
        { topics }
      );
      const response = await BULK_POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/topics/bulk', () => {
    it('should bulk deactivate topics', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.updateMany.mockResolvedValue({ count: 3 });

      const request = createMockRequest(
        'http://localhost:3000/api/topics/bulk',
        'DELETE',
        { ids: ['1', '2', '3'] }
      );
      const response = await BULK_DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deactivated).toBe(3);
    });

    it('should support permanent delete', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'ADMIN' },
      });
      mockedPrisma.topic.deleteMany.mockResolvedValue({ count: 2 });

      const request = createMockRequest(
        'http://localhost:3000/api/topics/bulk',
        'DELETE',
        { ids: ['1', '2'], permanent: true }
      );
      const response = await BULK_DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.deleted).toBe(2);
    });
  });
});
