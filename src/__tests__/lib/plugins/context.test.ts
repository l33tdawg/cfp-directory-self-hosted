/**
 * Plugin Context Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma - must use factory function for hoisting
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pluginLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    submission: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock storage
vi.mock('@/lib/storage/local-storage-provider', () => ({
  getStorage: vi.fn().mockReturnValue({
    getPublicUrl: vi.fn().mockReturnValue('http://test.com/file'),
    upload: vi.fn().mockResolvedValue({ url: 'http://test.com/uploaded' }),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock email
vi.mock('@/lib/email/email-service', () => ({
  emailService: {
    send: vi.fn().mockResolvedValue({ success: true }),
  },
}));

import { createPluginContext } from '@/lib/plugins/context';
import { PluginPermissionError } from '@/lib/plugins/types';
import { prisma } from '@/lib/db/prisma';

describe('Plugin Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Get mocked prisma for assertions
  const mockPrisma = vi.mocked(prisma);

  describe('createPluginContext', () => {
    it('should create context with logger', () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: { apiKey: 'test' },
        permissions: [],
      });
      
      expect(ctx.logger).toBeDefined();
      expect(ctx.logger.info).toBeInstanceOf(Function);
      expect(ctx.logger.error).toBeInstanceOf(Function);
      expect(ctx.logger.warn).toBeInstanceOf(Function);
      expect(ctx.logger.debug).toBeInstanceOf(Function);
    });

    it('should include config in context', () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: { apiKey: 'test-key', enabled: true },
        permissions: [],
      });
      
      expect(ctx.config).toEqual({ apiKey: 'test-key', enabled: true });
    });

    it('should create all capability objects', () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: {},
        permissions: [],
      });
      
      expect(ctx.submissions).toBeDefined();
      expect(ctx.users).toBeDefined();
      expect(ctx.events).toBeDefined();
      expect(ctx.reviews).toBeDefined();
      expect(ctx.storage).toBeDefined();
      expect(ctx.email).toBeDefined();
    });

    it('should not have jobs in v1.0', () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: {},
        permissions: [],
      });
      
      expect(ctx.jobs).toBeUndefined();
    });
  });

  describe('capability permissions', () => {
    it('should allow access with permission', async () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: {},
        permissions: ['submissions:read'],
      });
      
      mockPrisma.submission.findUnique.mockResolvedValue({
        id: 'sub-1',
        title: 'Test',
      });
      
      const result = await ctx.submissions.get('sub-1');
      
      expect(result).toBeDefined();
    });

    it('should deny access without permission', async () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: {},
        permissions: [], // No permissions
      });
      
      await expect(ctx.submissions.get('sub-1')).rejects.toThrow(PluginPermissionError);
    });

    it('should enforce different permissions for different operations', async () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: {},
        permissions: ['submissions:read'], // Only read, not manage
      });
      
      mockPrisma.submission.findUnique.mockResolvedValue({ id: 'sub-1' });
      
      // Read should work
      await expect(ctx.submissions.get('sub-1')).resolves.toBeDefined();
      
      // Manage should fail
      await expect(ctx.submissions.updateStatus('sub-1', 'ACCEPTED')).rejects.toThrow(
        PluginPermissionError
      );
    });
  });

  describe('logger', () => {
    it('should log to database', async () => {
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: {},
        permissions: [],
      });
      
      ctx.logger.info('Test message', { key: 'value' });
      
      // Wait a tick for async operation
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockPrisma.pluginLog.create).toHaveBeenCalledWith({
        data: {
          pluginId: 'plugin-1',
          level: 'info',
          message: 'Test message',
          metadata: { key: 'value' },
        },
      });
    });

    it('should not throw if logging fails', async () => {
      mockPrisma.pluginLog.create.mockRejectedValue(new Error('DB error'));
      
      const ctx = createPluginContext({
        pluginId: 'plugin-1',
        pluginName: 'test-plugin',
        config: {},
        permissions: [],
      });
      
      // Should not throw
      expect(() => ctx.logger.error('Test error')).not.toThrow();
    });
  });
});
