/**
 * Plugin Job Worker Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma before importing modules
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    pluginJob: {
      updateMany: vi.fn(),
    },
    pluginLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock registry
vi.mock('@/lib/plugins/registry', () => ({
  getPluginRegistry: vi.fn(() => ({
    getAll: vi.fn(() => []),
    getEnabledPlugins: vi.fn(() => []),
  })),
}));

// Mock locking module
vi.mock('@/lib/plugins/jobs/locking', () => ({
  generateWorkerId: vi.fn(() => 'test-worker-123'),
  acquireJobs: vi.fn(),
  completeJob: vi.fn(),
  failJob: vi.fn(),
  recoverStaleLocks: vi.fn(),
  extendLock: vi.fn(),
}));

import {
  getWorkerInfo,
  registerJobHandler,
  unregisterPluginHandlers,
  hasJobHandler,
  processJobs,
  processAllPendingJobs,
  resetWorker,
  getHandlerStats,
} from '@/lib/plugins/jobs/worker';
import { acquireJobs, completeJob, failJob, recoverStaleLocks } from '@/lib/plugins/jobs/locking';

describe('Plugin Job Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorker();
  });

  afterEach(() => {
    resetWorker();
  });

  describe('registerJobHandler', () => {
    it('should register a job handler', () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      
      registerJobHandler('plugin-1', 'test-job', handler);
      
      expect(hasJobHandler('plugin-1', 'test-job')).toBe(true);
    });

    it('should allow multiple handlers for same plugin', () => {
      registerJobHandler('plugin-1', 'job-a', vi.fn());
      registerJobHandler('plugin-1', 'job-b', vi.fn());
      
      expect(hasJobHandler('plugin-1', 'job-a')).toBe(true);
      expect(hasJobHandler('plugin-1', 'job-b')).toBe(true);
    });

    it('should override existing handler for same type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      registerJobHandler('plugin-1', 'test-job', handler1);
      registerJobHandler('plugin-1', 'test-job', handler2);
      
      // Still has handler registered
      expect(hasJobHandler('plugin-1', 'test-job')).toBe(true);
    });
  });

  describe('unregisterPluginHandlers', () => {
    it('should remove all handlers for a plugin', () => {
      registerJobHandler('plugin-1', 'job-a', vi.fn());
      registerJobHandler('plugin-1', 'job-b', vi.fn());
      
      unregisterPluginHandlers('plugin-1');
      
      expect(hasJobHandler('plugin-1', 'job-a')).toBe(false);
      expect(hasJobHandler('plugin-1', 'job-b')).toBe(false);
    });

    it('should not affect other plugins', () => {
      registerJobHandler('plugin-1', 'job-a', vi.fn());
      registerJobHandler('plugin-2', 'job-b', vi.fn());
      
      unregisterPluginHandlers('plugin-1');
      
      expect(hasJobHandler('plugin-1', 'job-a')).toBe(false);
      expect(hasJobHandler('plugin-2', 'job-b')).toBe(true);
    });
  });

  describe('hasJobHandler', () => {
    it('should return false for unregistered handler', () => {
      expect(hasJobHandler('unknown-plugin', 'unknown-job')).toBe(false);
    });

    it('should return true for registered handler', () => {
      registerJobHandler('plugin-1', 'test-job', vi.fn());
      
      expect(hasJobHandler('plugin-1', 'test-job')).toBe(true);
    });
  });

  describe('getHandlerStats', () => {
    it('should return handler statistics', () => {
      registerJobHandler('plugin-1', 'job-a', vi.fn());
      registerJobHandler('plugin-1', 'job-b', vi.fn());
      registerJobHandler('plugin-2', 'job-c', vi.fn());
      
      const stats = getHandlerStats();
      
      expect(stats.plugins).toBe(2);
      expect(stats.totalHandlers).toBe(3);
    });

    it('should return zero when no handlers', () => {
      const stats = getHandlerStats();
      
      expect(stats.plugins).toBe(0);
      expect(stats.totalHandlers).toBe(0);
    });
  });

  describe('processJobs', () => {
    it('should process acquired jobs', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, data: { result: 'ok' } });
      registerJobHandler('plugin-1', 'test-job', handler);
      
      vi.mocked(acquireJobs).mockResolvedValue([
        {
          id: 'job-1',
          pluginId: 'plugin-1',
          type: 'test-job',
          payload: { data: 'test' },
          attempts: 1,
          maxAttempts: 3,
          lockedBy: 'test-worker-123',
        },
      ]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      
      const results = await processJobs({ batchSize: 5 });
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(handler).toHaveBeenCalledWith({ data: 'test' });
      expect(completeJob).toHaveBeenCalledWith(
        'job-1',
        'test-worker-123',
        { result: 'ok' }
      );
    });

    it('should handle job handler failure', async () => {
      const handler = vi.fn().mockResolvedValue({ success: false, error: 'Handler failed' });
      registerJobHandler('plugin-1', 'failing-job', handler);
      
      vi.mocked(acquireJobs).mockResolvedValue([
        {
          id: 'job-2',
          pluginId: 'plugin-1',
          type: 'failing-job',
          payload: {},
          attempts: 1,
          maxAttempts: 3,
          lockedBy: 'test-worker-123',
        },
      ]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      
      const results = await processJobs();
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Handler failed');
      expect(failJob).toHaveBeenCalledWith(
        'job-2',
        'test-worker-123',
        'Handler failed',
        false // not final, attempts 1 < maxAttempts 3
      );
    });

    it('should handle job handler exception', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Unexpected error'));
      registerJobHandler('plugin-1', 'error-job', handler);
      
      vi.mocked(acquireJobs).mockResolvedValue([
        {
          id: 'job-3',
          pluginId: 'plugin-1',
          type: 'error-job',
          payload: {},
          attempts: 1,
          maxAttempts: 3,
          lockedBy: 'test-worker-123',
        },
      ]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      
      const results = await processJobs();
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Unexpected error');
    });

    it('should handle missing job handler', async () => {
      // No handler registered for this job type
      vi.mocked(acquireJobs).mockResolvedValue([
        {
          id: 'job-4',
          pluginId: 'plugin-1',
          type: 'unknown-job',
          payload: {},
          attempts: 1,
          maxAttempts: 3,
          lockedBy: 'test-worker-123',
        },
      ]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      
      const results = await processJobs();
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('No handler found');
    });

    it('should return empty array when no jobs', async () => {
      vi.mocked(acquireJobs).mockResolvedValue([]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      
      const results = await processJobs();
      
      expect(results).toEqual([]);
    });

    it('should recover stale locks before processing', async () => {
      vi.mocked(acquireJobs).mockResolvedValue([]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(5);
      
      await processJobs();
      
      expect(recoverStaleLocks).toHaveBeenCalled();
    });

    it('should skip stale lock recovery if disabled', async () => {
      vi.mocked(acquireJobs).mockResolvedValue([]);
      
      await processJobs({ recoverStaleLocks: false });
      
      expect(recoverStaleLocks).not.toHaveBeenCalled();
    });
  });

  describe('processAllPendingJobs', () => {
    it('should process multiple batches until empty', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      registerJobHandler('plugin-1', 'batch-job', handler);
      
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      vi.mocked(acquireJobs)
        .mockResolvedValueOnce([
          { id: 'job-1', pluginId: 'plugin-1', type: 'batch-job', payload: {}, attempts: 1, maxAttempts: 3, lockedBy: 'test-worker-123' },
          { id: 'job-2', pluginId: 'plugin-1', type: 'batch-job', payload: {}, attempts: 1, maxAttempts: 3, lockedBy: 'test-worker-123' },
        ])
        .mockResolvedValueOnce([
          { id: 'job-3', pluginId: 'plugin-1', type: 'batch-job', payload: {}, attempts: 1, maxAttempts: 3, lockedBy: 'test-worker-123' },
        ])
        .mockResolvedValue([]);
      
      const result = await processAllPendingJobs(10);
      
      expect(result.processed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.iterations).toBe(3); // 2 with jobs + 1 empty
    });

    it('should respect max iterations', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true });
      registerJobHandler('plugin-1', 'infinite-job', handler);
      
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      vi.mocked(acquireJobs).mockResolvedValue([
        { id: 'job-n', pluginId: 'plugin-1', type: 'infinite-job', payload: {}, attempts: 1, maxAttempts: 3, lockedBy: 'test-worker-123' },
      ]);
      
      const result = await processAllPendingJobs(5);
      
      expect(result.iterations).toBe(5);
    });

    it('should track failed jobs separately', async () => {
      const handler = vi.fn().mockResolvedValue({ success: false, error: 'fail' });
      registerJobHandler('plugin-1', 'fail-job', handler);
      
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      vi.mocked(acquireJobs)
        .mockResolvedValueOnce([
          { id: 'job-1', pluginId: 'plugin-1', type: 'fail-job', payload: {}, attempts: 1, maxAttempts: 3, lockedBy: 'test-worker-123' },
        ])
        .mockResolvedValue([]);
      
      const result = await processAllPendingJobs(10);
      
      expect(result.processed).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('getWorkerInfo', () => {
    it('should return null before processing', () => {
      const info = getWorkerInfo();
      
      expect(info).toBeNull();
    });

    it('should return worker info after processing', async () => {
      vi.mocked(acquireJobs).mockResolvedValue([]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      
      await processJobs();
      
      const info = getWorkerInfo();
      
      expect(info).not.toBeNull();
      expect(info!.id).toBe('test-worker-123');
      expect(info!.pid).toBe(process.pid);
      expect(info!.jobsProcessed).toBe(0);
      expect(info!.jobsFailed).toBe(0);
    });

    it('should track processed and failed counts', async () => {
      const successHandler = vi.fn().mockResolvedValue({ success: true });
      const failHandler = vi.fn().mockResolvedValue({ success: false, error: 'fail' });
      registerJobHandler('plugin-1', 'success-job', successHandler);
      registerJobHandler('plugin-1', 'fail-job', failHandler);
      
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      vi.mocked(acquireJobs).mockResolvedValue([
        { id: 'job-1', pluginId: 'plugin-1', type: 'success-job', payload: {}, attempts: 1, maxAttempts: 3, lockedBy: 'test-worker-123' },
        { id: 'job-2', pluginId: 'plugin-1', type: 'fail-job', payload: {}, attempts: 1, maxAttempts: 3, lockedBy: 'test-worker-123' },
      ]);
      
      await processJobs();
      
      const info = getWorkerInfo();
      expect(info!.jobsProcessed).toBe(1);
      expect(info!.jobsFailed).toBe(1);
    });
  });

  describe('resetWorker', () => {
    it('should clear worker info and handlers', async () => {
      registerJobHandler('plugin-1', 'test-job', vi.fn());
      vi.mocked(acquireJobs).mockResolvedValue([]);
      vi.mocked(recoverStaleLocks).mockResolvedValue(0);
      await processJobs();
      
      resetWorker();
      
      expect(getWorkerInfo()).toBeNull();
      expect(hasJobHandler('plugin-1', 'test-job')).toBe(false);
    });
  });
});
