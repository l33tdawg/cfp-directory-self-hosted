/**
 * Plugin Registry Tests
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
import { getPluginRegistry, resetPluginRegistry } from '@/lib/plugins/registry';
import type { Plugin } from '@/lib/plugins/types';

describe('Plugin Registry', () => {
  const createMockPlugin = (name: string, hooks?: Record<string, () => Promise<void>>): Plugin => ({
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

  describe('getPluginRegistry', () => {
    it('should return singleton instance', () => {
      const registry1 = getPluginRegistry();
      const registry2 = getPluginRegistry();
      
      expect(registry1).toBe(registry2);
    });
  });

  describe('register', () => {
    it('should register a plugin', () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin');
      
      const loaded = registry.register(
        plugin,
        'db-id-123',
        { apiKey: 'test' },
        ['submissions:read'],
        false
      );
      
      expect(loaded.plugin).toBe(plugin);
      expect(loaded.enabled).toBe(false);
      expect(loaded.dbId).toBe('db-id-123');
      expect(loaded.context.config).toEqual({ apiKey: 'test' });
    });

    it('should index hooks when registering', () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin', {
        'submission.created': async () => {},
        'user.registered': async () => {},
      });
      
      registry.register(plugin, 'db-id', {}, [], true);
      
      const submissionPlugins = registry.getPluginsWithHook('submission.created');
      const userPlugins = registry.getPluginsWithHook('user.registered');
      
      expect(submissionPlugins).toHaveLength(1);
      expect(userPlugins).toHaveLength(1);
    });
  });

  describe('unregister', () => {
    it('should unregister a plugin', () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin');
      
      registry.register(plugin, 'db-id', {}, [], true);
      expect(registry.get('test-plugin')).toBeDefined();
      
      const result = registry.unregister('test-plugin');
      
      expect(result).toBe(true);
      expect(registry.get('test-plugin')).toBeUndefined();
    });

    it('should return false for non-existent plugin', () => {
      const registry = getPluginRegistry();
      
      const result = registry.unregister('non-existent');
      
      expect(result).toBe(false);
    });

    it('should remove from hook index', () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin', {
        'submission.created': async () => {},
      });
      
      registry.register(plugin, 'db-id', {}, [], true);
      expect(registry.getPluginsWithHook('submission.created')).toHaveLength(1);
      
      registry.unregister('test-plugin');
      
      expect(registry.getPluginsWithHook('submission.created')).toHaveLength(0);
    });
  });

  describe('get', () => {
    it('should return registered plugin', () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin');
      
      registry.register(plugin, 'db-id', {}, [], true);
      
      const loaded = registry.get('test-plugin');
      
      expect(loaded).toBeDefined();
      expect(loaded?.plugin.manifest.name).toBe('test-plugin');
    });

    it('should return undefined for non-existent plugin', () => {
      const registry = getPluginRegistry();
      
      const loaded = registry.get('non-existent');
      
      expect(loaded).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('should return all registered plugins', () => {
      const registry = getPluginRegistry();
      
      registry.register(createMockPlugin('plugin-1'), 'db-1', {}, [], true);
      registry.register(createMockPlugin('plugin-2'), 'db-2', {}, [], false);
      
      const all = registry.getAll();
      
      expect(all).toHaveLength(2);
    });

    it('should return empty array when no plugins', () => {
      const registry = getPluginRegistry();
      
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('getEnabledPlugins', () => {
    it('should return only enabled plugins', () => {
      const registry = getPluginRegistry();
      
      registry.register(createMockPlugin('enabled-1'), 'db-1', {}, [], true);
      registry.register(createMockPlugin('disabled-1'), 'db-2', {}, [], false);
      registry.register(createMockPlugin('enabled-2'), 'db-3', {}, [], true);
      
      const enabled = registry.getEnabledPlugins();
      
      expect(enabled).toHaveLength(2);
      expect(enabled.map(p => p.plugin.manifest.name)).toContain('enabled-1');
      expect(enabled.map(p => p.plugin.manifest.name)).toContain('enabled-2');
    });
  });

  describe('getPluginsWithHook', () => {
    it('should return only enabled plugins with hook', () => {
      const registry = getPluginRegistry();
      
      registry.register(
        createMockPlugin('enabled', { 'submission.created': async () => {} }),
        'db-1', {}, [], true
      );
      registry.register(
        createMockPlugin('disabled', { 'submission.created': async () => {} }),
        'db-2', {}, [], false
      );
      
      const plugins = registry.getPluginsWithHook('submission.created');
      
      expect(plugins).toHaveLength(1);
      expect(plugins[0].plugin.manifest.name).toBe('enabled');
    });

    it('should return empty array for unregistered hook', () => {
      const registry = getPluginRegistry();
      
      const plugins = registry.getPluginsWithHook('submission.created');
      
      expect(plugins).toEqual([]);
    });
  });

  describe('enable', () => {
    it('should enable a plugin', async () => {
      const registry = getPluginRegistry();
      const onEnable = vi.fn().mockResolvedValue(undefined);
      const plugin: Plugin = {
        ...createMockPlugin('test-plugin'),
        onEnable,
      };
      
      registry.register(plugin, 'db-id', {}, [], false);
      
      const result = await registry.enable('test-plugin');
      
      expect(result).toBe(true);
      expect(registry.get('test-plugin')?.enabled).toBe(true);
      expect(onEnable).toHaveBeenCalled();
    });

    it('should return true if already enabled', async () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin');
      
      registry.register(plugin, 'db-id', {}, [], true);
      
      const result = await registry.enable('test-plugin');
      
      expect(result).toBe(true);
    });

    it('should return false for non-existent plugin', async () => {
      const registry = getPluginRegistry();
      
      const result = await registry.enable('non-existent');
      
      expect(result).toBe(false);
    });

    it('should handle onEnable error gracefully', async () => {
      const registry = getPluginRegistry();
      const onEnable = vi.fn().mockRejectedValue(new Error('Enable failed'));
      const plugin: Plugin = {
        ...createMockPlugin('test-plugin'),
        onEnable,
      };
      
      registry.register(plugin, 'db-id', {}, [], false);
      
      const result = await registry.enable('test-plugin');
      
      expect(result).toBe(false);
      expect(registry.get('test-plugin')?.enabled).toBe(false);
    });
  });

  describe('disable', () => {
    it('should disable a plugin', async () => {
      const registry = getPluginRegistry();
      const onDisable = vi.fn().mockResolvedValue(undefined);
      const plugin: Plugin = {
        ...createMockPlugin('test-plugin'),
        onDisable,
      };
      
      registry.register(plugin, 'db-id', {}, [], true);
      
      const result = await registry.disable('test-plugin');
      
      expect(result).toBe(true);
      expect(registry.get('test-plugin')?.enabled).toBe(false);
      expect(onDisable).toHaveBeenCalled();
    });

    it('should return true if already disabled', async () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin');
      
      registry.register(plugin, 'db-id', {}, [], false);
      
      const result = await registry.disable('test-plugin');
      
      expect(result).toBe(true);
    });

    it('should still disable even if onDisable fails', async () => {
      const registry = getPluginRegistry();
      const onDisable = vi.fn().mockRejectedValue(new Error('Disable failed'));
      const plugin: Plugin = {
        ...createMockPlugin('test-plugin'),
        onDisable,
      };
      
      registry.register(plugin, 'db-id', {}, [], true);
      
      const result = await registry.disable('test-plugin');
      
      expect(result).toBe(true);
      expect(registry.get('test-plugin')?.enabled).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('should update plugin config', () => {
      const registry = getPluginRegistry();
      const plugin = createMockPlugin('test-plugin');
      
      registry.register(plugin, 'db-id', { old: 'value' }, [], true);
      
      const result = registry.updateConfig('test-plugin', { new: 'config' });
      
      expect(result).toBe(true);
      expect(registry.get('test-plugin')?.context.config).toEqual({ new: 'config' });
    });

    it('should return false for non-existent plugin', () => {
      const registry = getPluginRegistry();
      
      const result = registry.updateConfig('non-existent', {});
      
      expect(result).toBe(false);
    });
  });

  describe('initialization state', () => {
    it('should track initialization state', () => {
      const registry = getPluginRegistry();
      
      expect(registry.isInitialized()).toBe(false);
      
      registry.setInitialized(true);
      
      expect(registry.isInitialized()).toBe(true);
    });
  });

  describe('count', () => {
    it('should return correct plugin count', () => {
      const registry = getPluginRegistry();
      
      expect(registry.count()).toBe(0);
      
      registry.register(createMockPlugin('plugin-1'), 'db-1', {}, [], true);
      expect(registry.count()).toBe(1);
      
      registry.register(createMockPlugin('plugin-2'), 'db-2', {}, [], false);
      expect(registry.count()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all plugins', () => {
      const registry = getPluginRegistry();
      
      registry.register(createMockPlugin('plugin-1'), 'db-1', {}, [], true);
      registry.register(createMockPlugin('plugin-2'), 'db-2', {}, [], true);
      registry.setInitialized(true);
      
      registry.clear();
      
      expect(registry.count()).toBe(0);
      expect(registry.isInitialized()).toBe(false);
      expect(registry.getAll()).toEqual([]);
    });
  });
});
