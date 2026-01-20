/**
 * Admin Health API Tests
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

// Mock health checks
vi.mock('@/lib/health-checks', () => ({
  getSystemHealth: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth';
import { getSystemHealth } from '@/lib/health-checks';

describe('Admin Health API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/health', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as MockUser);

      const { GET } = await import('@/app/api/admin/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return health status for admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as MockUser);

      vi.mocked(getSystemHealth).mockResolvedValue({
        database: { status: 'healthy', latency: 10 },
        storage: { status: 'healthy', latency: 5 },
        email: { status: 'healthy', message: 'Resend configured' },
        federation: { status: 'unknown', message: 'Federation disabled' },
        overall: 'healthy',
      });

      const { GET } = await import('@/app/api/admin/health/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.database).toBeDefined();
      expect(data.database.status).toBe('healthy');
      expect(data.overall).toBe('healthy');
    });

    it('should handle ORGANIZER role', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'organizer1',
        email: 'organizer@test.com',
        role: 'ORGANIZER',
      } as MockUser);

      const { GET } = await import('@/app/api/admin/health/route');
      const response = await GET();
      const data = await response.json();

      // Organizers should not have access to health endpoint
      expect(response.status).toBe(403);
    });
  });
});
