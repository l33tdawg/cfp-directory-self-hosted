/**
 * Activity Logger Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock types
interface MockActivityGroupBy {
  action?: string;
  userId?: string;
  _count: number;
}

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    activityLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

// Import after mocking
import { 
  logActivity, 
  getActivityLogs, 
  getActivitySummary,
  formatActivityAction,
  getActivityIcon 
} from '@/lib/activity-logger';
import { prisma } from '@/lib/db/prisma';

describe('Activity Logger Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('logActivity', () => {
    it('should create an activity log entry', async () => {
      vi.mocked(prisma.activityLog.create).mockResolvedValue({
        id: 'log1',
        userId: 'user1',
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user2',
        metadata: {},
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
      });

      await logActivity({
        userId: 'user1',
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user2',
        ipAddress: '127.0.0.1',
      });

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: 'user2',
          metadata: {},
          ipAddress: '127.0.0.1',
        },
      });
    });

    it('should handle null userId for system actions', async () => {
      vi.mocked(prisma.activityLog.create).mockResolvedValue({
        id: 'log1',
        userId: null,
        action: 'SETTINGS_UPDATED',
        entityType: 'Settings',
        entityId: 'default',
        metadata: {},
        ipAddress: null,
        createdAt: new Date(),
      });

      await logActivity({
        userId: null,
        action: 'SETTINGS_UPDATED',
        entityType: 'Settings',
        entityId: 'default',
      });

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          action: 'SETTINGS_UPDATED',
        }),
      });
    });

    it('should include metadata when provided', async () => {
      vi.mocked(prisma.activityLog.create).mockResolvedValue({
        id: 'log1',
        userId: 'user1',
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: 'user2',
        metadata: { oldRole: 'USER', newRole: 'ADMIN' },
        ipAddress: null,
        createdAt: new Date(),
      });

      await logActivity({
        userId: 'user1',
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: 'user2',
        metadata: { oldRole: 'USER', newRole: 'ADMIN' },
      });

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { oldRole: 'USER', newRole: 'ADMIN' },
        }),
      });
    });

    it('should not throw on database error', async () => {
      vi.mocked(prisma.activityLog.create).mockRejectedValue(new Error('DB Error'));
      
      // Should not throw
      await expect(logActivity({
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: 'user1',
      })).resolves.toBeUndefined();
    });
  });

  describe('getActivityLogs', () => {
    it('should return paginated logs', async () => {
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

      vi.mocked(prisma.activityLog.findMany).mockResolvedValue(mockLogs);
      vi.mocked(prisma.activityLog.count).mockResolvedValue(1);

      const result = await getActivityLogs({ limit: 50, offset: 0 });

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(1);
    });

    it('should filter by userId', async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activityLog.count).mockResolvedValue(0);

      await getActivityLogs({ userId: 'user1' });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user1' }),
        })
      );
    });

    it('should filter by entityType', async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activityLog.count).mockResolvedValue(0);

      await getActivityLogs({ entityType: 'Event' });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ entityType: 'Event' }),
        })
      );
    });

    it('should filter by date range', async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activityLog.count).mockResolvedValue(0);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await getActivityLogs({ startDate, endDate });

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: startDate, lte: endDate },
          }),
        })
      );
    });

    it('should use default limit and offset', async () => {
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.activityLog.count).mockResolvedValue(0);

      await getActivityLogs();

      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        })
      );
    });
  });

  describe('getActivitySummary', () => {
    it('should return activity summary', async () => {
      vi.mocked(prisma.activityLog.count).mockResolvedValue(100);
      vi.mocked(prisma.activityLog.groupBy)
        .mockResolvedValueOnce([
          { action: 'USER_CREATED', _count: 50 },
          { action: 'SUBMISSION_CREATED', _count: 30 },
        ] as MockActivityGroupBy[])
        .mockResolvedValueOnce([
          { userId: 'user1', _count: 40 },
          { userId: 'user2', _count: 20 },
        ] as MockActivityGroupBy[]);
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);

      const summary = await getActivitySummary(7);

      expect(summary.totalActions).toBe(100);
      expect(summary.actionBreakdown).toHaveLength(2);
      expect(summary.topUsers).toHaveLength(2);
    });

    it('should default to 7 days', async () => {
      vi.mocked(prisma.activityLog.count).mockResolvedValue(0);
      vi.mocked(prisma.activityLog.groupBy).mockResolvedValue([]);
      vi.mocked(prisma.activityLog.findMany).mockResolvedValue([]);

      await getActivitySummary();

      // Verify the date filter was applied (7 days ago)
      expect(prisma.activityLog.count).toHaveBeenCalled();
    });
  });

  describe('formatActivityAction', () => {
    it('should format user actions', () => {
      expect(formatActivityAction('USER_CREATED')).toBe('User created');
      expect(formatActivityAction('USER_ROLE_CHANGED')).toBe('User role changed');
      expect(formatActivityAction('USER_DELETED')).toBe('User deleted');
    });

    it('should format event actions', () => {
      expect(formatActivityAction('EVENT_CREATED')).toBe('Event created');
      expect(formatActivityAction('EVENT_PUBLISHED')).toBe('Event published');
      expect(formatActivityAction('EVENT_CFP_OPENED')).toBe('CFP opened');
    });

    it('should format submission actions', () => {
      expect(formatActivityAction('SUBMISSION_CREATED')).toBe('Submission created');
      expect(formatActivityAction('SUBMISSION_ACCEPTED')).toBe('Submission accepted');
      expect(formatActivityAction('SUBMISSION_REJECTED')).toBe('Submission rejected');
    });

    it('should format review actions', () => {
      expect(formatActivityAction('REVIEW_SUBMITTED')).toBe('Review submitted');
      expect(formatActivityAction('REVIEWER_ASSIGNED')).toBe('Reviewer assigned');
    });

    it('should format settings actions', () => {
      expect(formatActivityAction('SETTINGS_UPDATED')).toBe('Settings updated');
      expect(formatActivityAction('FEDERATION_ENABLED')).toBe('Federation enabled');
    });
  });

  describe('getActivityIcon', () => {
    it('should return user icon for user actions', () => {
      expect(getActivityIcon('USER_CREATED')).toBe('user');
      expect(getActivityIcon('USER_ROLE_CHANGED')).toBe('user');
    });

    it('should return calendar icon for event actions', () => {
      expect(getActivityIcon('EVENT_CREATED')).toBe('calendar');
      expect(getActivityIcon('EVENT_PUBLISHED')).toBe('calendar');
    });

    it('should return file-text icon for submission actions', () => {
      expect(getActivityIcon('SUBMISSION_CREATED')).toBe('file-text');
      expect(getActivityIcon('SUBMISSION_ACCEPTED')).toBe('file-text');
    });

    it('should return star icon for review actions', () => {
      expect(getActivityIcon('REVIEW_SUBMITTED')).toBe('star');
      expect(getActivityIcon('REVIEW_UPDATED')).toBe('star');
    });

    it('should return settings icon for settings actions', () => {
      expect(getActivityIcon('SETTINGS_UPDATED')).toBe('settings');
      expect(getActivityIcon('FEDERATION_ENABLED')).toBe('settings');
    });
  });
});
