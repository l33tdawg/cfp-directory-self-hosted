/**
 * Hook Dispatch Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma
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

// Import after mocking
import {
  dispatchHook,
  dispatchHookAsync,
  hasHookHandlers,
  getHookHandlerCount,
} from '@/lib/plugins/hooks/dispatch';
import { getPluginRegistry, resetPluginRegistry } from '@/lib/plugins/registry';
import type { Plugin, PluginContext } from '@/lib/plugins/types';
import type { HookPayloads } from '@/lib/plugins/hooks/types';

describe('Hook Dispatch', () => {
  const createMockPlugin = (
    name: string,
    hooks: Record<string, (ctx: PluginContext, payload: any) => Promise<any>>
  ): Plugin => ({
    manifest: {
      name,
      displayName: `${name} Plugin`,
      version: '1.0.0',
      apiVersion: '1.0',
    },
    hooks: hooks as any,
  });

  beforeEach(() => {
    resetPluginRegistry();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetPluginRegistry();
  });

  describe('dispatchHook', () => {
    it('should dispatch hook to registered plugins', async () => {
      const registry = getPluginRegistry();
      const handler = vi.fn().mockResolvedValue(undefined);
      
      registry.register(
        createMockPlugin('test-plugin', { 'submission.created': handler }),
        'db-id',
        {},
        [],
        true
      );
      
      const payload: HookPayloads['submission.created'] = {
        submission: { id: 'sub-1' } as any,
        speaker: { id: 'user-1', email: 'test@test.com', name: 'Test' },
        event: { id: 'event-1', name: 'Test Event', slug: 'test-event' },
      };
      
      await dispatchHook('submission.created', payload);
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ logger: expect.any(Object) }),
        payload
      );
    });

    it('should not dispatch to disabled plugins', async () => {
      const registry = getPluginRegistry();
      const handler = vi.fn().mockResolvedValue(undefined);
      
      registry.register(
        createMockPlugin('test-plugin', { 'submission.created': handler }),
        'db-id',
        {},
        [],
        false // disabled
      );
      
      const payload: HookPayloads['submission.created'] = {
        submission: { id: 'sub-1' } as any,
        speaker: { id: 'user-1', email: 'test@test.com', name: 'Test' },
        event: { id: 'event-1', name: 'Test Event', slug: 'test-event' },
      };
      
      await dispatchHook('submission.created', payload);
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('should dispatch to multiple plugins', async () => {
      const registry = getPluginRegistry();
      const handler1 = vi.fn().mockResolvedValue(undefined);
      const handler2 = vi.fn().mockResolvedValue(undefined);
      
      registry.register(
        createMockPlugin('plugin-1', { 'submission.created': handler1 }),
        'db-1', {}, [], true
      );
      registry.register(
        createMockPlugin('plugin-2', { 'submission.created': handler2 }),
        'db-2', {}, [], true
      );
      
      const payload: HookPayloads['submission.created'] = {
        submission: { id: 'sub-1' } as any,
        speaker: { id: 'user-1', email: 'test@test.com', name: 'Test' },
        event: { id: 'event-1', name: 'Test Event', slug: 'test-event' },
      };
      
      await dispatchHook('submission.created', payload);
      
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should merge returned payload modifications', async () => {
      const registry = getPluginRegistry();
      
      registry.register(
        createMockPlugin('test-plugin', {
          'email.beforeSend': async (ctx, payload) => ({
            variables: { ...payload.variables, custom: 'value' },
          }),
        }),
        'db-id', {}, [], true
      );
      
      const payload: HookPayloads['email.beforeSend'] = {
        template: 'welcome',
        recipient: { email: 'test@test.com' },
        variables: { name: 'Test' },
        subject: 'Welcome',
      };
      
      const result = await dispatchHook('email.beforeSend', payload);
      
      expect(result.variables).toEqual({ name: 'Test', custom: 'value' });
    });

    it('should continue on handler error', async () => {
      const registry = getPluginRegistry();
      const errorHandler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      const successHandler = vi.fn().mockResolvedValue(undefined);
      
      registry.register(
        createMockPlugin('error-plugin', { 'submission.created': errorHandler }),
        'db-1', {}, [], true
      );
      registry.register(
        createMockPlugin('success-plugin', { 'submission.created': successHandler }),
        'db-2', {}, [], true
      );
      
      const payload: HookPayloads['submission.created'] = {
        submission: { id: 'sub-1' } as any,
        speaker: { id: 'user-1', email: 'test@test.com', name: 'Test' },
        event: { id: 'event-1', name: 'Test Event', slug: 'test-event' },
      };
      
      // Should not throw
      await expect(dispatchHook('submission.created', payload)).resolves.toBeDefined();
      
      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it('should return original payload when no handlers', async () => {
      const payload: HookPayloads['submission.created'] = {
        submission: { id: 'sub-1' } as any,
        speaker: { id: 'user-1', email: 'test@test.com', name: 'Test' },
        event: { id: 'event-1', name: 'Test Event', slug: 'test-event' },
      };
      
      const result = await dispatchHook('submission.created', payload);
      
      expect(result).toEqual(payload);
    });
  });

  describe('dispatchHookAsync', () => {
    it('should dispatch hook without waiting', () => {
      const registry = getPluginRegistry();
      const handler = vi.fn().mockResolvedValue(undefined);
      
      registry.register(
        createMockPlugin('test-plugin', { 'submission.created': handler }),
        'db-id', {}, [], true
      );
      
      const payload: HookPayloads['submission.created'] = {
        submission: { id: 'sub-1' } as any,
        speaker: { id: 'user-1', email: 'test@test.com', name: 'Test' },
        event: { id: 'event-1', name: 'Test Event', slug: 'test-event' },
      };
      
      // Should not return a promise
      dispatchHookAsync('submission.created', payload);
      
      // Handler may not have been called yet (async)
      // Just verify no error was thrown
    });
  });

  describe('hasHookHandlers', () => {
    it('should return true when handlers exist', () => {
      const registry = getPluginRegistry();
      
      registry.register(
        createMockPlugin('test-plugin', { 'submission.created': async () => {} }),
        'db-id', {}, [], true
      );
      
      expect(hasHookHandlers('submission.created')).toBe(true);
    });

    it('should return false when no handlers', () => {
      expect(hasHookHandlers('submission.created')).toBe(false);
    });

    it('should return false when handlers are disabled', () => {
      const registry = getPluginRegistry();
      
      registry.register(
        createMockPlugin('test-plugin', { 'submission.created': async () => {} }),
        'db-id', {}, [], false
      );
      
      expect(hasHookHandlers('submission.created')).toBe(false);
    });
  });

  describe('getHookHandlerCount', () => {
    it('should return correct handler count', () => {
      const registry = getPluginRegistry();
      
      registry.register(
        createMockPlugin('plugin-1', { 'submission.created': async () => {} }),
        'db-1', {}, [], true
      );
      registry.register(
        createMockPlugin('plugin-2', { 'submission.created': async () => {} }),
        'db-2', {}, [], true
      );
      registry.register(
        createMockPlugin('plugin-3', { 'submission.created': async () => {} }),
        'db-3', {}, [], false // disabled
      );
      
      expect(getHookHandlerCount('submission.created')).toBe(2);
    });

    it('should return 0 when no handlers', () => {
      expect(getHookHandlerCount('submission.created')).toBe(0);
    });
  });
});
