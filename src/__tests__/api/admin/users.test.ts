/**
 * Admin Users API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types
interface MockUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  image?: string | null;
  createdAt?: Date;
  speakerProfile?: object | null;
  reviewerProfile?: object | null;
  _count?: { submissions: number; reviews: number };
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
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    userInvitation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    speakerProfile: {
      upsert: vi.fn(),
    },
    reviewerProfile: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('Admin Users API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as MockUser);

      const { GET } = await import('@/app/api/admin/users/route');
      const request = new Request('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return paginated users for admin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      const mockUsers = [
        {
          id: 'user1',
          name: 'Test User',
          email: 'test@test.com',
          image: null,
          role: 'USER',
          createdAt: new Date(),
          speakerProfile: null,
          reviewerProfile: null,
          _count: { submissions: 5, reviews: 0 },
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as MockUser[]);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const { GET } = await import('@/app/api/admin/users/route');
      const request = new Request('http://localhost/api/admin/users');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it('should filter by role', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const { GET } = await import('@/app/api/admin/users/route');
      const request = new Request('http://localhost/api/admin/users?role=REVIEWER');
      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'REVIEWER' }),
        })
      );
    });

    it('should search users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      const { GET } = await import('@/app/api/admin/users/route');
      const request = new Request('http://localhost/api/admin/users?search=john');
      await GET(request);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });
  });

  describe('PATCH /api/admin/users/[id]', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as MockUser);

      const { PATCH } = await import('@/app/api/admin/users/[id]/route');
      const request = new Request('http://localhost/api/admin/users/user2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'REVIEWER' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'user2' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should prevent self-demotion from admin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      const { PATCH } = await import('@/app/api/admin/users/[id]/route');
      const request = new Request('http://localhost/api/admin/users/admin1', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'USER' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'admin1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('own admin role');
    });

    it('should update user role', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user2',
        email: 'user@test.com',
        role: 'USER',
      } as MockUser);

      const updatedUser = {
        id: 'user2',
        name: 'Test User',
        email: 'user@test.com',
        role: 'REVIEWER',
        image: null,
        createdAt: new Date(),
      };

      // Mock $transaction to execute the callback with a mock tx object
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => {
        // Create a mock tx with the same structure as prisma
        const mockTx = {
          user: {
            update: vi.fn().mockResolvedValue(updatedUser),
          },
          speakerProfile: {
            upsert: vi.fn().mockResolvedValue({}),
          },
          reviewerProfile: {
            upsert: vi.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx as unknown as typeof prisma);
      });

      const { PATCH } = await import('@/app/api/admin/users/[id]/route');
      const request = new Request('http://localhost/api/admin/users/user2', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'REVIEWER' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'user2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.role).toBe('REVIEWER');
    });

    it('should return 404 for non-existent user', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/admin/users/[id]/route');
      const request = new Request('http://localhost/api/admin/users/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ role: 'REVIEWER' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('DELETE /api/admin/users/[id]', () => {
    it('should prevent self-deletion', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      const { DELETE } = await import('@/app/api/admin/users/[id]/route');
      const request = new Request('http://localhost/api/admin/users/admin1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'admin1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('own account');
    });

    it('should delete user', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user2',
        email: 'user@test.com',
      } as MockUser);

      vi.mocked(prisma.user.delete).mockResolvedValue({
        id: 'user2',
      } as MockUser);

      const { DELETE } = await import('@/app/api/admin/users/[id]/route');
      const request = new Request('http://localhost/api/admin/users/user2', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'user2' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});
