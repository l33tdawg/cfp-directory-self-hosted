/**
 * Plugin Job Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  JOB_STATUSES,
  JOB_DEFAULTS,
  JobNotFoundError,
  JobAlreadyCompletedError,
  JobHandlerNotFoundError,
} from '@/lib/plugins/jobs/types';

describe('Job Types', () => {
  describe('JOB_STATUSES', () => {
    it('should include all valid job statuses', () => {
      expect(JOB_STATUSES).toContain('pending');
      expect(JOB_STATUSES).toContain('running');
      expect(JOB_STATUSES).toContain('completed');
      expect(JOB_STATUSES).toContain('failed');
    });

    it('should have exactly 4 statuses', () => {
      expect(JOB_STATUSES).toHaveLength(4);
    });

    it('should be a const array', () => {
      // TypeScript's `as const` provides compile-time readonly
      // At runtime, we verify the array is defined and has expected values
      expect(Array.isArray(JOB_STATUSES)).toBe(true);
      expect(JOB_STATUSES.length).toBeGreaterThan(0);
    });
  });

  describe('JOB_DEFAULTS', () => {
    it('should have sensible default values', () => {
      expect(JOB_DEFAULTS.MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(JOB_DEFAULTS.LOCK_TIMEOUT_SECONDS).toBeGreaterThan(0);
      expect(JOB_DEFAULTS.DEFAULT_PRIORITY).toBeGreaterThan(0);
      expect(JOB_DEFAULTS.BATCH_SIZE).toBeGreaterThan(0);
      expect(JOB_DEFAULTS.STALE_LOCK_THRESHOLD_SECONDS).toBeGreaterThan(0);
    });

    it('should have lock timeout less than stale threshold', () => {
      expect(JOB_DEFAULTS.LOCK_TIMEOUT_SECONDS)
        .toBeLessThan(JOB_DEFAULTS.STALE_LOCK_THRESHOLD_SECONDS);
    });

    it('should have expected default values', () => {
      expect(JOB_DEFAULTS.MAX_ATTEMPTS).toBe(3);
      expect(JOB_DEFAULTS.LOCK_TIMEOUT_SECONDS).toBe(300);
      expect(JOB_DEFAULTS.DEFAULT_PRIORITY).toBe(100);
      expect(JOB_DEFAULTS.BATCH_SIZE).toBe(10);
      expect(JOB_DEFAULTS.STALE_LOCK_THRESHOLD_SECONDS).toBe(600);
    });
  });

  describe('JobNotFoundError', () => {
    it('should create error with job ID', () => {
      const error = new JobNotFoundError('job-123');
      
      expect(error.name).toBe('JobNotFoundError');
      expect(error.jobId).toBe('job-123');
      expect(error.message).toBe('Job not found: job-123');
    });

    it('should be instance of Error', () => {
      const error = new JobNotFoundError('job-123');
      
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('JobAlreadyCompletedError', () => {
    it('should create error with job ID', () => {
      const error = new JobAlreadyCompletedError('job-456');
      
      expect(error.name).toBe('JobAlreadyCompletedError');
      expect(error.jobId).toBe('job-456');
      expect(error.message).toBe('Job already completed: job-456');
    });

    it('should be instance of Error', () => {
      const error = new JobAlreadyCompletedError('job-456');
      
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('JobHandlerNotFoundError', () => {
    it('should create error with plugin ID and job type', () => {
      const error = new JobHandlerNotFoundError('plugin-abc', 'process-data');
      
      expect(error.name).toBe('JobHandlerNotFoundError');
      expect(error.pluginId).toBe('plugin-abc');
      expect(error.jobType).toBe('process-data');
      expect(error.message).toBe(
        "No handler found for job type 'process-data' in plugin 'plugin-abc'"
      );
    });

    it('should be instance of Error', () => {
      const error = new JobHandlerNotFoundError('plugin-abc', 'process-data');
      
      expect(error).toBeInstanceOf(Error);
    });
  });
});
