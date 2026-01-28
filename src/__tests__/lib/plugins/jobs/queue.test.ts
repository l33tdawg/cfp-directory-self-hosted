/**
 * Plugin Job Queue Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma before importing the module
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pluginJob: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import {
  PluginJobQueue,
  createJobQueue,
  getPendingJobsCount,
  getJobStats,
  getJobById,
  retryJob,
  getRecentJobs,
} from '@/lib/plugins/jobs/queue';
import { JobNotFoundError } from '@/lib/plugins/jobs/types';

describe('Plugin Job Queue', () => {
  const pluginId = 'test-plugin-id';
  const pluginName = 'test-plugin';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PluginJobQueue', () => {
    describe('enqueue', () => {
      it('should enqueue a new job', async () => {
        const mockJob = {
          id: 'job-123',
          pluginId,
          type: 'test-job',
          payload: { data: 'test' },
          status: 'pending',
          runAt: new Date(),
          maxAttempts: 3,
          priority: 100,
          lockTimeout: 300,
        };
        
        vi.mocked(prisma.pluginJob.create).mockResolvedValue(mockJob as never);
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        const jobId = await queue.enqueue({
          type: 'test-job',
          payload: { data: 'test' },
        });
        
        expect(jobId).toBe('job-123');
        expect(prisma.pluginJob.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            pluginId,
            type: 'test-job',
            status: 'pending',
          }),
        });
      });

      it('should respect custom options', async () => {
        const runAt = new Date('2025-01-01');
        const mockJob = { id: 'job-456' };
        
        vi.mocked(prisma.pluginJob.create).mockResolvedValue(mockJob as never);
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        await queue.enqueue({
          type: 'custom-job',
          payload: { custom: true },
          runAt,
          maxAttempts: 5,
          priority: 50,
          lockTimeout: 600,
        });
        
        expect(prisma.pluginJob.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            runAt,
            maxAttempts: 5,
            priority: 50,
            lockTimeout: 600,
          }),
        });
      });
    });

    describe('getJob', () => {
      it('should return job info when found', async () => {
        const mockJob = {
          id: 'job-123',
          type: 'test-job',
          status: 'pending',
          payload: { data: 'test' },
          result: null,
          attempts: 0,
          maxAttempts: 3,
          priority: 100,
          createdAt: new Date(),
          runAt: new Date(),
          startedAt: null,
          completedAt: null,
        };
        
        vi.mocked(prisma.pluginJob.findFirst).mockResolvedValue(mockJob as never);
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        const job = await queue.getJob('job-123');
        
        expect(job).not.toBeNull();
        expect(job!.id).toBe('job-123');
        expect(job!.status).toBe('pending');
        expect(prisma.pluginJob.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'job-123',
            pluginId,
          },
        });
      });

      it('should return null when job not found', async () => {
        vi.mocked(prisma.pluginJob.findFirst).mockResolvedValue(null);
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        const job = await queue.getJob('non-existent');
        
        expect(job).toBeNull();
      });
    });

    describe('cancelJob', () => {
      it('should cancel a pending job', async () => {
        vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 1 });
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        const cancelled = await queue.cancelJob('job-123');
        
        expect(cancelled).toBe(true);
        expect(prisma.pluginJob.updateMany).toHaveBeenCalledWith({
          where: {
            id: 'job-123',
            pluginId,
            status: 'pending',
          },
          data: expect.objectContaining({
            status: 'failed',
            result: expect.objectContaining({
              cancelled: true,
            }),
          }),
        });
      });

      it('should return false if job cannot be cancelled', async () => {
        vi.mocked(prisma.pluginJob.updateMany).mockResolvedValue({ count: 0 });
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        const cancelled = await queue.cancelJob('running-job');
        
        expect(cancelled).toBe(false);
      });
    });

    describe('getPendingCount', () => {
      it('should return count of pending jobs', async () => {
        vi.mocked(prisma.pluginJob.count).mockResolvedValue(5);
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        const count = await queue.getPendingCount();
        
        expect(count).toBe(5);
        expect(prisma.pluginJob.count).toHaveBeenCalledWith({
          where: {
            pluginId,
            status: 'pending',
          },
        });
      });
    });

    describe('getJobs', () => {
      it('should return jobs with optional status filter', async () => {
        const mockJobs = [
          {
            id: 'job-1',
            type: 'job-type',
            status: 'completed',
            payload: {},
            result: { success: true },
            attempts: 1,
            maxAttempts: 3,
            priority: 100,
            createdAt: new Date(),
            runAt: new Date(),
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ];
        
        vi.mocked(prisma.pluginJob.findMany).mockResolvedValue(mockJobs as never);
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        const jobs = await queue.getJobs('completed', 10);
        
        expect(jobs).toHaveLength(1);
        expect(jobs[0].status).toBe('completed');
        expect(prisma.pluginJob.findMany).toHaveBeenCalledWith({
          where: {
            pluginId,
            status: 'completed',
          },
          orderBy: expect.any(Array),
          take: 10,
        });
      });

      it('should return all jobs when no status filter', async () => {
        vi.mocked(prisma.pluginJob.findMany).mockResolvedValue([]);
        
        const queue = new PluginJobQueue(pluginId, pluginName);
        await queue.getJobs();
        
        expect(prisma.pluginJob.findMany).toHaveBeenCalledWith({
          where: {
            pluginId,
          },
          orderBy: expect.any(Array),
          take: 50,
        });
      });
    });
  });

  describe('createJobQueue', () => {
    it('should create a new PluginJobQueue instance', () => {
      const queue = createJobQueue(pluginId, pluginName);
      
      expect(queue).toBeInstanceOf(PluginJobQueue);
    });
  });

  describe('getPendingJobsCount', () => {
    it('should return count of all pending jobs ready to run', async () => {
      vi.mocked(prisma.pluginJob.count).mockResolvedValue(10);
      
      const count = await getPendingJobsCount();
      
      expect(count).toBe(10);
      expect(prisma.pluginJob.count).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          runAt: {
            lte: expect.any(Date),
          },
        },
      });
    });
  });

  describe('getJobStats', () => {
    it('should return job statistics', async () => {
      vi.mocked(prisma.pluginJob.count)
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(2)  // running
        .mockResolvedValueOnce(100) // completed
        .mockResolvedValueOnce(3);  // failed
      
      const stats = await getJobStats();
      
      expect(stats).toEqual({
        pending: 5,
        running: 2,
        completed: 100,
        failed: 3,
        total: 110,
      });
    });
  });

  describe('getJobById', () => {
    it('should return job by ID regardless of plugin', async () => {
      const mockJob = {
        id: 'any-job',
        type: 'test',
        status: 'completed',
        payload: {},
        result: null,
        attempts: 1,
        maxAttempts: 3,
        priority: 100,
        createdAt: new Date(),
        runAt: new Date(),
        startedAt: null,
        completedAt: null,
      };
      
      vi.mocked(prisma.pluginJob.findUnique).mockResolvedValue(mockJob as never);
      
      const job = await getJobById('any-job');
      
      expect(job).not.toBeNull();
      expect(job!.id).toBe('any-job');
    });

    it('should return null if job not found', async () => {
      vi.mocked(prisma.pluginJob.findUnique).mockResolvedValue(null);
      
      const job = await getJobById('missing');
      
      expect(job).toBeNull();
    });
  });

  describe('retryJob', () => {
    it('should reset a failed job for retry', async () => {
      vi.mocked(prisma.pluginJob.findUnique).mockResolvedValue({
        id: 'failed-job',
        status: 'failed',
      } as never);
      vi.mocked(prisma.pluginJob.update).mockResolvedValue({} as never);
      
      await retryJob('failed-job');
      
      expect(prisma.pluginJob.update).toHaveBeenCalledWith({
        where: { id: 'failed-job' },
        data: expect.objectContaining({
          status: 'pending',
          attempts: 0,
          // result is Prisma.DbNull (an object)
        }),
      });
    });

    it('should throw JobNotFoundError if job not found', async () => {
      vi.mocked(prisma.pluginJob.findUnique).mockResolvedValue(null);
      
      await expect(retryJob('missing')).rejects.toThrow(JobNotFoundError);
    });

    it('should throw error if job is not failed', async () => {
      vi.mocked(prisma.pluginJob.findUnique).mockResolvedValue({
        id: 'running-job',
        status: 'running',
      } as never);
      
      await expect(retryJob('running-job')).rejects.toThrow(
        'Cannot retry job with status: running'
      );
    });
  });

  describe('getRecentJobs', () => {
    it('should return recent jobs for a plugin', async () => {
      const mockJobs = [
        {
          id: 'recent-1',
          type: 'test',
          status: 'completed',
          payload: {},
          result: null,
          attempts: 1,
          maxAttempts: 3,
          priority: 100,
          createdAt: new Date(),
          runAt: new Date(),
          startedAt: null,
          completedAt: null,
        },
      ];
      
      vi.mocked(prisma.pluginJob.findMany).mockResolvedValue(mockJobs as never);
      
      const jobs = await getRecentJobs(pluginId, 10);
      
      expect(jobs).toHaveLength(1);
      expect(prisma.pluginJob.findMany).toHaveBeenCalledWith({
        where: { pluginId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
    });
  });
});
