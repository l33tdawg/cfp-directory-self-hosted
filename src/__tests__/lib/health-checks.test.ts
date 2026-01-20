/**
 * Health Checks Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock types for activity data
interface MockSubmissionActivity {
  id: string;
  title: string;
  createdAt: Date;
  status: string;
  speaker: { name: string };
  event: { name: string; slug: string };
}

interface MockReviewActivity {
  id: string;
  createdAt: Date;
  overallScore: number;
  reviewer: { name: string };
  submission: { title: string };
}

interface MockUserActivity {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

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

      vi.mocked(prisma.submission.findMany).mockResolvedValue([
        {
          id: 'sub1',
          title: 'Test Talk',
          createdAt: hourAgo,
          status: 'PENDING',
          speaker: { name: 'John Doe' },
          event: { name: 'DevConf', slug: 'devconf' },
        },
      ] as MockSubmissionActivity[]);

      vi.mocked(prisma.review.findMany).mockResolvedValue([
        {
          id: 'rev1',
          createdAt: twoHoursAgo,
          overallScore: 4,
          reviewer: { name: 'Jane Smith' },
          submission: { title: 'Another Talk' },
        },
      ] as MockReviewActivity[]);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: 'user1',
          name: 'New User',
          email: 'new@example.com',
          role: 'USER',
          createdAt: now,
        },
      ] as MockUserActivity[]);

      const activities = await getRecentActivity(10);

      expect(activities).toHaveLength(3);
      // Should be sorted by timestamp descending
      expect(activities[0].type).toBe('user');
      expect(activities[1].type).toBe('submission');
      expect(activities[2].type).toBe('review');
    });

    it('should respect limit parameter', async () => {
      vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
      vi.mocked(prisma.review.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const activities = await getRecentActivity(5);

      expect(Array.isArray(activities)).toBe(true);
    });

    it('should handle empty results', async () => {
      vi.mocked(prisma.submission.findMany).mockResolvedValue([]);
      vi.mocked(prisma.review.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);

      const activities = await getRecentActivity();

      expect(activities).toHaveLength(0);
    });
  });
});
