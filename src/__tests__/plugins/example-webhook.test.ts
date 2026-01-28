/**
 * Example Webhook Plugin Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma before imports
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pluginLog: { create: vi.fn().mockResolvedValue({}) },
    pluginJob: {
      create: vi.fn().mockResolvedValue({ id: 'job-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    submission: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    event: { findUnique: vi.fn(), findMany: vi.fn() },
    review: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/storage/local-storage-provider', () => ({
  getStorage: vi.fn().mockReturnValue({
    getPublicUrl: vi.fn().mockReturnValue('http://test.com/file'),
    upload: vi.fn().mockResolvedValue({ url: 'http://test.com/uploaded' }),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/email/email-service', () => ({
  emailService: { send: vi.fn().mockResolvedValue({ success: true }) },
}));

import webhookPlugin, { sendWebhook } from '../../../plugins/example-webhook/index';
import type { PluginContext } from '@/lib/plugins';

// =============================================================================
// MOCK CONTEXT HELPER
// =============================================================================

function createMockContext(config: Record<string, unknown> = {}): PluginContext {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config,
    jobs: {
      enqueue: vi.fn().mockResolvedValue('job-1'),
      getJob: vi.fn().mockResolvedValue(null),
      cancelJob: vi.fn().mockResolvedValue(true),
      getPendingCount: vi.fn().mockResolvedValue(0),
      getJobs: vi.fn().mockResolvedValue([]),
    },
    submissions: {} as any,
    users: {} as any,
    events: {} as any,
    reviews: {} as any,
    storage: {} as any,
    email: {} as any,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Example Webhook Plugin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('manifest', () => {
    it('should have correct metadata', () => {
      expect(webhookPlugin.manifest.name).toBe('example-webhook');
      expect(webhookPlugin.manifest.displayName).toBe('Webhook Notifications');
      expect(webhookPlugin.manifest.apiVersion).toBe('1.0');
      expect(webhookPlugin.manifest.version).toBe('1.0.0');
    });

    it('should declare required permissions', () => {
      expect(webhookPlugin.manifest.permissions).toContain('submissions:read');
    });

    it('should declare hooks', () => {
      expect(webhookPlugin.manifest.hooks).toContain('submission.created');
      expect(webhookPlugin.manifest.hooks).toContain('submission.statusChanged');
      expect(webhookPlugin.manifest.hooks).toContain('review.submitted');
    });

    it('should have a config schema with required webhookUrl', () => {
      expect(webhookPlugin.manifest.configSchema).toBeDefined();
      expect(webhookPlugin.manifest.configSchema!.required).toContain('webhookUrl');
    });
  });

  describe('sendWebhook', () => {
    it('should send POST request with correct headers', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const payload = {
        event: 'test.event',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: { foo: 'bar' },
      };

      const result = await sendWebhook('https://hooks.example.com/test', payload);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://hooks.example.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'test.event',
          }),
        })
      );
      expect(result.ok).toBe(true);
      expect(result.status).toBe(200);
    });

    it('should include HMAC signature when secret provided', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      await sendWebhook(
        'https://hooks.example.com/test',
        { event: 'test', timestamp: '2025-01-01T00:00:00.000Z', data: {} },
        'my-secret'
      );

      const callHeaders = fetchSpy.mock.calls[0][1]!.headers as Record<string, string>;
      expect(callHeaders['X-Webhook-Signature']).toMatch(/^sha256=[a-f0-9]+$/);
    });

    it('should return failure status for non-ok response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await sendWebhook(
        'https://hooks.example.com/test',
        { event: 'test', timestamp: '2025-01-01T00:00:00.000Z', data: {} }
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
    });
  });

  describe('lifecycle hooks', () => {
    it('should warn on enable without webhookUrl', async () => {
      const ctx = createMockContext({});
      await webhookPlugin.onEnable!(ctx);
      expect(ctx.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('without a URL')
      );
    });

    it('should log info on enable with webhookUrl', async () => {
      const ctx = createMockContext({ webhookUrl: 'https://example.com/hook' });
      await webhookPlugin.onEnable!(ctx);
      expect(ctx.logger.info).toHaveBeenCalledWith(
        'Webhook plugin enabled',
        expect.objectContaining({ url: 'https://example.com/hook' })
      );
    });

    it('should log on disable', async () => {
      const ctx = createMockContext({});
      await webhookPlugin.onDisable!(ctx);
      expect(ctx.logger.info).toHaveBeenCalledWith('Webhook plugin disabled');
    });
  });

  describe('submission.created hook', () => {
    it('should send webhook on submission creation', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const ctx = createMockContext({
        webhookUrl: 'https://hooks.example.com/endpoint',
      });

      await webhookPlugin.hooks!['submission.created']!(ctx, {
        submission: {
          id: 'sub-1',
          title: 'My Talk',
          status: 'PENDING',
        } as any,
        speaker: { id: 'u1', email: 'speaker@test.com', name: 'Speaker' },
        event: { id: 'e1', name: 'TestConf', slug: 'testconf' },
      });

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://hooks.example.com/endpoint',
        expect.objectContaining({ method: 'POST' })
      );
      expect(ctx.logger.info).toHaveBeenCalledWith(
        'Webhook sent: submission.created',
        expect.any(Object)
      );
    });

    it('should skip if no webhookUrl configured', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const ctx = createMockContext({});

      await webhookPlugin.hooks!['submission.created']!(ctx, {
        submission: { id: 'sub-1', title: 'Test', status: 'PENDING' } as any,
        speaker: { id: 'u1', email: 'a@b.com', name: 'A' },
        event: { id: 'e1', name: 'E', slug: 'e' },
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should skip if event is not in enabled events list', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const ctx = createMockContext({
        webhookUrl: 'https://hooks.example.com/test',
        events: ['review.submitted'], // Only reviews
      });

      await webhookPlugin.hooks!['submission.created']!(ctx, {
        submission: { id: 'sub-1', title: 'Test', status: 'PENDING' } as any,
        speaker: { id: 'u1', email: 'a@b.com', name: 'A' },
        event: { id: 'e1', name: 'E', slug: 'e' },
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('should enqueue retry job on webhook failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const ctx = createMockContext({
        webhookUrl: 'https://hooks.example.com/test',
        retryOnFailure: true,
      });

      await webhookPlugin.hooks!['submission.created']!(ctx, {
        submission: { id: 'sub-1', title: 'Test', status: 'PENDING' } as any,
        speaker: { id: 'u1', email: 'a@b.com', name: 'A' },
        event: { id: 'e1', name: 'E', slug: 'e' },
      });

      expect(ctx.logger.error).toHaveBeenCalled();
      expect(ctx.jobs!.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'webhook-retry',
          maxAttempts: 3,
        })
      );
    });

    it('should not enqueue retry when retryOnFailure is false', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const ctx = createMockContext({
        webhookUrl: 'https://hooks.example.com/test',
        retryOnFailure: false,
      });

      await webhookPlugin.hooks!['submission.created']!(ctx, {
        submission: { id: 'sub-1', title: 'Test', status: 'PENDING' } as any,
        speaker: { id: 'u1', email: 'a@b.com', name: 'A' },
        event: { id: 'e1', name: 'E', slug: 'e' },
      });

      expect(ctx.jobs!.enqueue).not.toHaveBeenCalled();
    });
  });

  describe('submission.statusChanged hook', () => {
    it('should send webhook on status change', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const ctx = createMockContext({
        webhookUrl: 'https://hooks.example.com/test',
      });

      await webhookPlugin.hooks!['submission.statusChanged']!(ctx, {
        submission: { id: 'sub-1', title: 'My Talk' } as any,
        oldStatus: 'PENDING' as any,
        newStatus: 'ACCEPTED' as any,
        changedBy: { id: 'u1', role: 'ADMIN' as any, name: 'Admin' },
      });

      expect(globalThis.fetch).toHaveBeenCalled();
      expect(ctx.logger.info).toHaveBeenCalledWith(
        'Webhook sent: submission.statusChanged',
        expect.any(Object)
      );
    });
  });

  describe('review.submitted hook', () => {
    it('should send webhook on review submission', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      const ctx = createMockContext({
        webhookUrl: 'https://hooks.example.com/test',
      });

      await webhookPlugin.hooks!['review.submitted']!(ctx, {
        review: {
          id: 'rev-1',
          overallScore: 4,
          recommendation: 'ACCEPT',
        } as any,
        submission: { id: 'sub-1', title: 'My Talk' } as any,
        reviewer: { id: 'u1', name: 'Reviewer', email: 'rev@test.com' },
        isUpdate: false,
      });

      expect(globalThis.fetch).toHaveBeenCalled();
      expect(ctx.logger.info).toHaveBeenCalledWith(
        'Webhook sent: review.submitted',
        expect.any(Object)
      );
    });
  });
});
