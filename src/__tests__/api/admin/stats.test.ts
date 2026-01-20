/**
 * Admin Stats API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock types
interface MockUser {
  id: string;
  email: string;
  role: string;
}

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock health checks
vi.mock('@/lib/health-checks', () => ({
  getAdminStats: vi.fn(),
  getPendingItems: vi.fn(),
  getRecentActivity: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth';
import { getAdminStats, getPendingItems, getRecentActivity } from '@/lib/health-checks';

describe('Admin Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/stats', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as MockUser);

      // Import the route handler dynamically to get fresh mocks
      const { GET } = await import('@/app/api/admin/stats/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return stats for admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(getAdminStats).mockResolvedValue({
        totalUsers: 100,
        totalEvents: 20,
        totalSubmissions: 500,
        totalReviewers: 10,
        pendingSubmissions: 50,
        recentUsers: 5,
      });

      vi.mocked(getPendingItems).mockResolvedValue({
        pendingSubmissions: 25,
        incompleteOnboarding: 5,
        openCfpEvents: 3,
        unassignedReviews: 10,
      });

      vi.mocked(getRecentActivity).mockResolvedValue([]);

      const { GET } = await import('@/app/api/admin/stats/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalUsers).toBe(100);
      expect(data.pendingItems).toBeDefined();
      expect(data.recentActivity).toBeDefined();
    });
  });
});
