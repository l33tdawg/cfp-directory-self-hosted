/**
 * Health Checks Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    siteSettings: {
      findUnique: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    event: {
      count: vi.fn(),
    },
    submission: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
    },
    speakerProfile: {
      count: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
    },
  },
}));

// Import after mocking
import { 
  getSystemHealth, 
  getAdminStats, 
  getPendingItems,
  getRecentActivity 
} from '@/lib/health-checks';
import { prisma } from '@/lib/db/prisma';

describe('Health Checks Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getSystemHealth', () => {
    it('should return healthy status when database responds quickly', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
      vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue({
        id: 'default',
        name: 'Test',
        description: null,
        websiteUrl: null,
        logoUrl: null,
        contactEmail: null,
        supportUrl: null,
        federationEnabled: false,
        federationLicenseKey: null,
        federationActivatedAt: null,
        federationLastHeartbeat: null,
        federationPublicKey: null,
        federationWarnings: null,
        federationFeatures: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const health = await getSystemHealth();

      expect(health).toHaveProperty('database');
      expect(health).toHaveProperty('storage');
      expect(health).toHaveProperty('email');
      expect(health).toHaveProperty('federation');
      expect(health).toHaveProperty('overall');
      expect(health.database.status).toBeDefined();
    });

    it('should return unhealthy database status on error', async () => {
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection failed'));
      vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue(null);

      const health = await getSystemHealth();

      expect(health.database.status).toBe('unhealthy');
      expect(health.database.message).toContain('Connection failed');
    });

    it('should return unknown federation status when disabled', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
      vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue({
        id: 'default',
        name: 'Test',
        description: null,
        websiteUrl: null,
        logoUrl: null,
        contactEmail: null,
        supportUrl: null,
        federationEnabled: false,
        federationLicenseKey: null,
        federationActivatedAt: null,
        federationLastHeartbeat: null,
        federationPublicKey: null,
        federationWarnings: null,
        federationFeatures: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const health = await getSystemHealth();

      expect(health.federation.status).toBe('unknown');
      expect(health.federation.message).toBe('Federation disabled');
    });

    it('should return healthy federation status when properly configured', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
      vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue({
        id: 'default',
        name: 'Test',
        description: null,
        websiteUrl: null,
        logoUrl: null,
        contactEmail: null,
        supportUrl: null,
        federationEnabled: true,
        federationLicenseKey: 'test-key',
        federationActivatedAt: new Date(),
        federationLastHeartbeat: null,
        federationPublicKey: null,
        federationWarnings: null,
        federationFeatures: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const health = await getSystemHealth();

      expect(health.federation.status).toBe('healthy');
      expect(health.federation.message).toBe('Federation active');
    });
  });

  describe('getAdminStats', () => {
    it('should return all required statistics', async () => {
      vi.mocked(prisma.user.count)
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(10)  // totalReviewers
        .mockResolvedValueOnce(5);  // recentUsers
      vi.mocked(prisma.event.count).mockResolvedValue(20);
      vi.mocked(prisma.submission.count)
        .mockResolvedValueOnce(500) // totalSubmissions
        .mockResolvedValueOnce(50); // pendingSubmissions

      const stats = await getAdminStats();

      expect(stats).toEqual({
        totalUsers: 100,
        totalEvents: 20,
        totalSubmissions: 500,
        totalReviewers: 10,
        pendingSubmissions: 50,
        recentUsers: 5,
      });
    });

    it('should handle zero counts', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.event.count).mockResolvedValue(0);
      vi.mocked(prisma.submission.count).mockResolvedValue(0);

      const stats = await getAdminStats();

      expect(stats.totalUsers).toBe(0);
      expect(stats.totalEvents).toBe(0);
      expect(stats.totalSubmissions).toBe(0);
    });
  });

  describe('getPendingItems', () => {
    it('should return all pending item counts', async () => {
      vi.mocked(prisma.submission.count)
        .mockResolvedValueOnce(25)  // pendingSubmissions
        .mockResolvedValueOnce(10); // unassignedReviews
      vi.mocked(prisma.speakerProfile.count).mockResolvedValue(5);
      vi.mocked(prisma.event.count).mockResolvedValue(3);

      const pending = await getPendingItems();

      expect(pending).toEqual({
        pendingSubmissions: 25,
        incompleteOnboarding: 5,
        openCfpEvents: 3,
        unassignedReviews: 10,
      });
    });

    it('should handle all zeros', async () => {
      vi.mocked(prisma.submission.count).mockResolvedValue(0);
      vi.mocked(prisma.speakerProfile.count).mockResolvedValue(0);
      vi.mocked(prisma.event.count).mockResolvedValue(0);

      const pending = await getPendingItems();

      expect(pending.pendingSubmissions).toBe(0);
      expect(pending.incompleteOnboarding).toBe(0);
      expect(pending.openCfpEvents).toBe(0);
      expect(pending.unassignedReviews).toBe(0);
    });
  });

  describe('getRecentActivity', () => {
    it('should combine and sort activities by timestamp', async () => {
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 3600000);
      const twoHoursAgo = new Date(now.getTime() - 7200000);

      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([
        {
          id: 'log1',
          userId: 'user1',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'user1',
          metadata: {},
          ipAddress: null,
          userAgent: null,
          createdAt: now,
          user: { id: 'user1', name: 'New User', email: 'new@example.com', image: null },
        },
        {
          id: 'log2',
          userId: 'user2',
          action: 'SUBMISSION_CREATED',
          entityType: 'Submission',
          entityId: 'sub1',
          metadata: { title: 'Test Talk' },
          ipAddress: null,
          userAgent: null,
          createdAt: hourAgo,
          user: { id: 'user2', name: 'John Doe', email: 'john@example.com', image: null },
        },
        {
          id: 'log3',
          userId: 'user3',
          action: 'REVIEW_CREATED',
          entityType: 'Review',
          entityId: 'rev1',
          metadata: {},
          ipAddress: null,
          userAgent: null,
          createdAt: twoHoursAgo,
          user: { id: 'user3', name: 'Jane Smith', email: 'jane@example.com', image: null },
        },
      ]);

      const activities = await getRecentActivity(10);

      expect(activities).toHaveLength(3);
      // Should be sorted by timestamp descending (already sorted by query)
      expect(activities[0].type).toBe('user');
      expect(activities[1].type).toBe('submission');
      expect(activities[2].type).toBe('review');
    });

    it('should respect limit parameter', async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);

      const activities = await getRecentActivity(5);

      expect(Array.isArray(activities)).toBe(true);
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it('should handle empty results', async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);

      const activities = await getRecentActivity();

      expect(activities).toHaveLength(0);
    });
  });
});
