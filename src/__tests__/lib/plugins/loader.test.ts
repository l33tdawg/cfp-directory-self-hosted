/**
 * Plugin Loader Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs - must use factory function for hoisting
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn(),
    access: vi.fn(),
  },
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn(),
  access: vi.fn(),
}));

// Mock Prisma - must use factory function for hoisting
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plugin: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
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

import { resetPluginRegistry } from '@/lib/plugins/registry';
import {
  PLUGINS_DIR,
  scanPluginsDirectory,
  getPluginList,
} from '@/lib/plugins/loader';
import { prisma } from '@/lib/db/prisma';

describe('Plugin Loader', () => {
  // Get mocked prisma for assertions
  const mockPrisma = vi.mocked(prisma);

  beforeEach(() => {
    resetPluginRegistry();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetPluginRegistry();
  });

  describe('PLUGINS_DIR', () => {
    it('should be defined', () => {
      expect(PLUGINS_DIR).toBeDefined();
      expect(typeof PLUGINS_DIR).toBe('string');
    });

    it('should end with plugins directory', () => {
      expect(PLUGINS_DIR.endsWith('plugins')).toBe(true);
    });
  });

  describe('scanPluginsDirectory', () => {
    it('should be a function', () => {
      expect(typeof scanPluginsDirectory).toBe('function');
    });

    it('should return an array', async () => {
      // Note: Actual fs mocking in ESM requires more complex setup
      // This test verifies the function returns an array (even if empty due to mock)
      const result = await scanPluginsDirectory();
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getPluginList', () => {
    it('should return plugins from database', async () => {
      const mockPlugins = [
        {
          id: 'plugin-1',
          name: 'test-plugin',
          displayName: 'Test Plugin',
          version: '1.0.0',
          apiVersion: '1.0',
          enabled: true,
        },
      ];
      
      mockPrisma.plugin.findMany.mockResolvedValue(mockPlugins);
      
      const result = await getPluginList();
      
      expect(result).toEqual(mockPlugins);
      expect(mockPrisma.plugin.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('should return empty array when no plugins', async () => {
      mockPrisma.plugin.findMany.mockResolvedValue([]);
      
      const result = await getPluginList();
      
      expect(result).toEqual([]);
    });
  });
});
