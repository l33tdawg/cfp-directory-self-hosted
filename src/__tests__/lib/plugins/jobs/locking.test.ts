/**
 * Plugin Job Locking Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma before importing the module
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    pluginJob: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  generateWorkerId,
  calculateBackoff,
  acquireJobs,
  acquireJobById,
  completeJob,
  failJob,
  releaseLock,
  recoverStaleLocks,
  extendLock,
} from '@/lib/plugins/jobs/locking';

describe('Job Locking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateWorkerId', () => {
    it('should generate unique worker IDs', () => {
      const id1 = generateWorkerId();
      const id2 = generateWorkerId();
      
      expect(id1).not.toBe(id2);
    });

    it('should include process PID', () => {
      const workerId = generateWorkerId();
      
      expect(workerId).toContain(`worker-${process.pid}`);
    });

    it('should follow expected format', () => {
      const workerId = generateWorkerId();
      
      // Format: worker-{pid}-{timestamp}-{random}
      expect(workerId).toMatch(/^worker-\d+-\d+-[a-z0-9]+$/);
    });
  });

  describe('calculateBackoff', () => {
    it('should calculate exponential backoff', () => {
      const delay1 = calculateBackoff(1);
      const delay2 = calculateBackoff(2);
      const delay3 = calculateBackoff(3);
      
      // Each delay should be roughly double the previous (with jitter)
      // Allow for 25% jitter variation
      expect(delay2).toBeGreaterThan(delay1 * 0.5);
      expect(delay3).toBeGreaterThan(delay2 * 0.5);
    });

    it('should not exceed max delay', () => {
      const maxDelay = 300000; // 5 minutes
      
      // Even with very high attempt count, shouldn't exceed max
      const delay = calculateBackoff(100);
      
      expect(delay).toBeLessThanOrEqual(maxDelay * 1.25); // Allow for jitter
    });

    it('should return values in expected range for first attempt', () => {
      const delay = calculateBackoff(1);
      
      // First attempt: 5000ms * (0.75 to 1.25) = 3750ms to 6250ms
      expect(delay).toBeGreaterThanOrEqual(3750);
      expect(delay).toBeLessThanOrEqual(6250);
    });

    it('should apply jitter for randomness', () => {
      // Run multiple times to verify randomness
      const delays = Array.from({ length: 10 }, () => calculateBackoff(2));
      const uniqueDelays = new Set(delays);
      
      // Should have some variation due to jitter
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('acquireJobs', () => {
    it('should execute atomic acquisition query', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          pluginId: 'plugin-1',
          type: 'test-job',
          payload: { data: 'test' },
          attempts: 1,
          maxAttempts: 3,
          lockedBy: 'worker-123',
        },
      ];
      
      vi.mocked(prisma.$queryRaw).mockResolvedValue(mockJobs);
      
      const jobs = await acquireJobs('worker-123', 5);
      
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('job-1');
      expect(jobs[0].pluginId).toBe('plugin-1');
      expect(jobs[0].type).toBe('test-job');
    });

    it('should return empty array when no jobs available', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      
      const jobs = await acquireJobs('worker-123', 5);
      
      expect(jobs).toEqual([]);
    });

    it('should use default batch size of 1', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      
      await acquireJobs('worker-123');
      
      // Verify the query was called (default batch size)
      expect(prisma.$queryRaw).toHaveBeenCalled();
    });
  });

  describe('acquireJobById', () => {
    it('should acquire specific job by ID', async () => {
      const mockJob = {
        id: 'job-specific',
        pluginId: 'plugin-1',
        type: 'specific-job',
        payload: { specific: true },
        attempts: 1,
        maxAttempts: 3,
        lockedBy: 'worker-456',
      };
      
      vi.mocked(prisma.$queryRaw).mockResolvedValue([mockJob]);
      
      const job = await acquireJobById('job-specific', 'worker-456');
      
      expect(job).not.toBeNull();
      expect(job!.id).toBe('job-specific');
      expect(job!.lockedBy).toBe('worker-456');
    });

    it('should return null if job not available', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([]);
      
      const job = await acquireJobById('non-existent', 'worker-456');
      
      expect(job).toBeNull();
    });
  });

  describe('completeJob', () => {
    it('should mark job as completed with result', async () => {
      vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 1 });
      
      await completeJob('job-1', 'worker-123', { success: true, data: 'result' });
      
      expect(prisma.pluginJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          lockedBy: 'worker-123',
          status: 'running',
        },
        data: expect.objectContaining({
          status: 'completed',
          lockedAt: null,
          lockedBy: null,
        }),
      });
    });

    it('should complete job without result', async () => {
      vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 1 });
      
      await completeJob('job-1', 'worker-123');
      
      expect(prisma.pluginJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            result: null,
          }),
        })
      );
    });
  });

  describe('failJob', () => {
    it('should mark job as failed when final attempt', async () => {
      vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 1 });
      
      await failJob('job-1', 'worker-123', 'Test error', true);
      
      expect(prisma.pluginJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          lockedBy: 'worker-123',
          status: 'running',
        },
        data: expect.objectContaining({
          status: 'failed',
          result: { error: 'Test error' },
          lockedAt: null,
          lockedBy: null,
        }),
      });
    });

    it('should return to pending status when not final', async () => {
      vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 1 });
      
      await failJob('job-1', 'worker-123', 'Test error', false);
      
      expect(prisma.pluginJob.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            completedAt: null,
          }),
        })
      );
    });
  });

  describe('releaseLock', () => {
    it('should release lock on job', async () => {
      vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 1 });
      
      await releaseLock('job-1', 'worker-123');
      
      expect(prisma.pluginJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          lockedBy: 'worker-123',
        },
        data: {
          status: 'pending',
          lockedAt: null,
          lockedBy: null,
        },
      });
    });
  });

  describe('recoverStaleLocks', () => {
    it('should recover stale locks', async () => {
      vi.mocked(prisma.$executeRaw).mockResolvedValue(3);
      
      const recovered = await recoverStaleLocks();
      
      expect(prisma.$executeRaw).toHaveBeenCalled();
      expect(recovered).toBe(3);
    });

    it('should return 0 when no stale locks', async () => {
      vi.mocked(prisma.$executeRaw).mockResolvedValue(0);
      
      const recovered = await recoverStaleLocks();
      
      expect(recovered).toBe(0);
    });
  });

  describe('extendLock', () => {
    it('should extend lock timeout', async () => {
      vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 1 });
      
      const extended = await extendLock('job-1', 'worker-123');
      
      expect(extended).toBe(true);
      expect(prisma.pluginJob.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'job-1',
          lockedBy: 'worker-123',
          status: 'running',
        },
        data: expect.objectContaining({
          lockedAt: expect.any(Date),
        }),
      });
    });

    it('should return false if lock not found', async () => {
      vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 0 });
      
      const extended = await extendLock('job-1', 'wrong-worker');
      
      expect(extended).toBe(false);
    });
  });
});
