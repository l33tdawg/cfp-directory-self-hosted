/**
 * Admin Activity API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Type for mock user
interface MockUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  image?: string | null;
}

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock activity logger
vi.mock('@/lib/activity-logger', () => ({
  getActivityLogs: vi.fn(),
  ActivityAction: {},
  EntityType: {},
}));

import { getCurrentUser } from '@/lib/auth';
import { getActivityLogs } from '@/lib/activity-logger';

describe('Admin Activity API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/activity', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as MockUser);

      const { GET } = await import('@/app/api/admin/activity/route');
      const request = new Request('http://localhost/api/admin/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return activity logs for admin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      const mockLogs = [
        {
          id: 'log1',
          userId: 'user1',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'user2',
          metadata: {},
          ipAddress: null,
          createdAt: new Date(),
          user: { id: 'user1', name: 'Admin', email: 'admin@test.com', image: null },
        },
      ];

      vi.mocked(getActivityLogs).mockResolvedValue({
        logs: mockLogs,
        total: 1,
      });

      const { GET } = await import('@/app/api/admin/activity/route');
      const request = new Request('http://localhost/api/admin/activity');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(1);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.total).toBe(1);
    });

    it('should pass filter parameters', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(getActivityLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const { GET } = await import('@/app/api/admin/activity/route');
      const request = new Request('http://localhost/api/admin/activity?userId=user1&entityType=Event&limit=10');
      await GET(request);

      expect(getActivityLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user1',
          entityType: 'Event',
          limit: 10,
        })
      );
    });

    it('should handle date range filters', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(getActivityLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const { GET } = await import('@/app/api/admin/activity/route');
      const request = new Request('http://localhost/api/admin/activity?startDate=2024-01-01&endDate=2024-01-31');
      await GET(request);

      expect(getActivityLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('should use default pagination', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(getActivityLogs).mockResolvedValue({
        logs: [],
        total: 0,
      });

      const { GET } = await import('@/app/api/admin/activity/route');
      const request = new Request('http://localhost/api/admin/activity');
      await GET(request);

      expect(getActivityLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
        })
      );
    });

    it('should indicate hasMore in pagination', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(getActivityLogs).mockResolvedValue({
        logs: new Array(50).fill({ id: 'log' }),
        total: 100,
      });

      const { GET } = await import('@/app/api/admin/activity/route');
      const request = new Request('http://localhost/api/admin/activity?limit=50&offset=0');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination.hasMore).toBe(true);
    });
  });
});
