/**
 * PluginData Capability Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock encryption
vi.mock('@/lib/security/encryption', () => ({
  encryptString: vi.fn((v: string) => `enc:v1:${Buffer.from(v).toString('base64')}`),
  decryptString: vi.fn((v: string) => {
    const base64 = v.replace('enc:v1:', '');
    return Buffer.from(base64, 'base64').toString('utf8');
  }),
  isEncrypted: vi.fn((v: string) => typeof v === 'string' && v.startsWith('enc:v1:')),
}));

import { PluginDataCapabilityImpl } from '@/lib/plugins/capabilities/data';

// Mock Prisma client
function createMockPrisma() {
  return {
    pluginData: {
      upsert: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as any;
}

describe('PluginDataCapability', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let capability: PluginDataCapabilityImpl;
  const pluginId = 'plugin-123';

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    capability = new PluginDataCapabilityImpl(prisma, pluginId);
  });

  describe('set', () => {
    it('should upsert a value', async () => {
      await capability.set('cache', 'last-run', { timestamp: 123 });

      expect(prisma.pluginData.upsert).toHaveBeenCalledWith({
        where: {
          pluginId_namespace_key: {
            pluginId: 'plugin-123',
            namespace: 'cache',
            key: 'last-run',
          },
        },
        create: expect.objectContaining({
          pluginId: 'plugin-123',
          namespace: 'cache',
          key: 'last-run',
          value: { timestamp: 123 },
          encrypted: false,
        }),
        update: expect.objectContaining({
          value: { timestamp: 123 },
          encrypted: false,
        }),
      });
    });

    it('should encrypt string value when encrypted option is true', async () => {
      await capability.set('secrets', 'token', 'my-secret', { encrypted: true });

      expect(prisma.pluginData.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            value: expect.stringMatching(/^enc:v1:/),
            encrypted: true,
          }),
        })
      );
    });

    it('should encrypt non-string values by JSON-stringifying first', async () => {
      await capability.set('secrets', 'config', { key: 'value' }, { encrypted: true });

      expect(prisma.pluginData.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            value: expect.stringMatching(/^enc:v1:/),
            encrypted: true,
          }),
        })
      );
    });
  });

  describe('get', () => {
    it('should return null for missing keys', async () => {
      prisma.pluginData.findUnique.mockResolvedValue(null);

      const result = await capability.get('cache', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return value for existing key', async () => {
      prisma.pluginData.findUnique.mockResolvedValue({
        id: 'd1',
        pluginId,
        namespace: 'cache',
        key: 'last-run',
        value: { timestamp: 123 },
        encrypted: false,
      });

      const result = await capability.get('cache', 'last-run');
      expect(result).toEqual({ timestamp: 123 });
    });

    it('should auto-decrypt encrypted values', async () => {
      const encrypted = 'enc:v1:' + Buffer.from('"decrypted-value"').toString('base64');
      prisma.pluginData.findUnique.mockResolvedValue({
        id: 'd1',
        pluginId,
        namespace: 'secrets',
        key: 'token',
        value: encrypted,
        encrypted: true,
      });

      const result = await capability.get<string>('secrets', 'token');
      expect(result).toBe('decrypted-value');
    });

    it('should handle encrypted string values that are not JSON', async () => {
      const encrypted = 'enc:v1:' + Buffer.from('plain-string').toString('base64');
      prisma.pluginData.findUnique.mockResolvedValue({
        id: 'd1',
        pluginId,
        namespace: 'secrets',
        key: 'token',
        value: encrypted,
        encrypted: true,
      });

      const result = await capability.get<string>('secrets', 'token');
      expect(result).toBe('plain-string');
    });
  });

  describe('list', () => {
    it('should return keys in namespace', async () => {
      prisma.pluginData.findMany.mockResolvedValue([
        { key: 'alpha' },
        { key: 'beta' },
        { key: 'gamma' },
      ]);

      const keys = await capability.list('cache');

      expect(keys).toEqual(['alpha', 'beta', 'gamma']);
      expect(prisma.pluginData.findMany).toHaveBeenCalledWith({
        where: { pluginId: 'plugin-123', namespace: 'cache' },
        select: { key: true },
        orderBy: { key: 'asc' },
      });
    });

    it('should return empty array for empty namespace', async () => {
      prisma.pluginData.findMany.mockResolvedValue([]);
      const keys = await capability.list('empty');
      expect(keys).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a specific key', async () => {
      await capability.delete('cache', 'old-key');

      expect(prisma.pluginData.deleteMany).toHaveBeenCalledWith({
        where: {
          pluginId: 'plugin-123',
          namespace: 'cache',
          key: 'old-key',
        },
      });
    });
  });

  describe('clear', () => {
    it('should clear all keys in namespace', async () => {
      await capability.clear('cache');

      expect(prisma.pluginData.deleteMany).toHaveBeenCalledWith({
        where: {
          pluginId: 'plugin-123',
          namespace: 'cache',
        },
      });
    });
  });

  describe('scoping', () => {
    it('should always scope operations to pluginId', async () => {
      await capability.set('ns', 'k', 'v');
      await capability.get('ns', 'k');
      await capability.list('ns');
      await capability.delete('ns', 'k');
      await capability.clear('ns');

      // All calls should include pluginId
      for (const call of prisma.pluginData.upsert.mock.calls) {
        expect(call[0].where.pluginId_namespace_key.pluginId).toBe('plugin-123');
      }
      for (const call of prisma.pluginData.findUnique.mock.calls) {
        expect(call[0].where.pluginId_namespace_key.pluginId).toBe('plugin-123');
      }
      for (const call of prisma.pluginData.findMany.mock.calls) {
        expect(call[0].where.pluginId).toBe('plugin-123');
      }
      for (const call of prisma.pluginData.deleteMany.mock.calls) {
        expect(call[0].where.pluginId).toBe('plugin-123');
      }
    });
  });
});
