/**
 * Admin Plugins API Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plugin: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pluginJob: {
      groupBy: vi.fn(),
    },
    pluginLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

// Mock plugin loader functions
vi.mock('@/lib/plugins', () => ({
  enablePlugin: vi.fn(),
  disablePlugin: vi.fn(),
  updatePluginConfig: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

const mockPlugin = {
  id: 'plugin-1',
  name: 'test-plugin',
  displayName: 'Test Plugin',
  description: 'A test plugin',
  version: '1.0.0',
  apiVersion: '1.0',
  author: 'Test Author',
  homepage: 'https://example.com',
  source: 'local',
  sourcePath: '/plugins/test-plugin',
  enabled: false,
  installed: true,
  config: {},
  configSchema: null,
  permissions: ['submissions:read'],
  hooks: ['submission.created'],
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { logs: 5, jobs: 2 },
};

describe('Admin Plugins API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/admin/plugins', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as any);

      const { GET } = await import('@/app/api/admin/plugins/route');
      const request = new Request('http://localhost/api/admin/plugins');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return all plugins for admin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findMany).mockResolvedValue([mockPlugin] as any);

      const { GET } = await import('@/app/api/admin/plugins/route');
      const request = new Request('http://localhost/api/admin/plugins');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugins).toHaveLength(1);
      expect(data.plugins[0].name).toBe('test-plugin');
    });

    it('should filter by search query', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findMany).mockResolvedValue([]);

      const { GET } = await import('@/app/api/admin/plugins/route');
      const request = new Request('http://localhost/api/admin/plugins?search=test');
      await GET(request);

      expect(prisma.plugin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: { contains: 'test', mode: 'insensitive' } },
              { displayName: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should filter by enabled status', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findMany).mockResolvedValue([]);

      const { GET } = await import('@/app/api/admin/plugins/route');
      const request = new Request('http://localhost/api/admin/plugins?enabled=true');
      await GET(request);

      expect(prisma.plugin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });
  });

  describe('GET /api/admin/plugins/[id]', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as any);

      const { GET } = await import('@/app/api/admin/plugins/[id]/route');
      const request = new Request('http://localhost/api/admin/plugins/plugin-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue(null);

      const { GET } = await import('@/app/api/admin/plugins/[id]/route');
      const request = new Request('http://localhost/api/admin/plugins/nonexistent');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Plugin not found');
    });

    it('should return plugin details with job stats', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue(mockPlugin as any);
      vi.mocked(prisma.pluginJob.groupBy).mockResolvedValue([
        { status: 'completed', _count: 5 },
        { status: 'failed', _count: 1 },
      ] as any);

      const { GET } = await import('@/app/api/admin/plugins/[id]/route');
      const request = new Request('http://localhost/api/admin/plugins/plugin-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugin.name).toBe('test-plugin');
      expect(data.jobStats.completed).toBe(5);
      expect(data.jobStats.failed).toBe(1);
    });
  });

  describe('PATCH /api/admin/plugins/[id]', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as any);

      const { PATCH } = await import('@/app/api/admin/plugins/[id]/route');
      const request = new Request('http://localhost/api/admin/plugins/plugin-1', {
        method: 'PATCH',
        body: JSON.stringify({ config: { apiKey: 'test' } }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue(null);

      const { PATCH } = await import('@/app/api/admin/plugins/[id]/route');
      const request = new Request('http://localhost/api/admin/plugins/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ config: {} }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Plugin not found');
    });

    it('should update plugin config', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue(mockPlugin as any);
      const updatedPlugin = { ...mockPlugin, config: { apiKey: 'new-key' } };
      vi.mocked(prisma.plugin.update).mockResolvedValue(updatedPlugin as any);

      const { PATCH } = await import('@/app/api/admin/plugins/[id]/route');
      const request = new Request('http://localhost/api/admin/plugins/plugin-1', {
        method: 'PATCH',
        body: JSON.stringify({ config: { apiKey: 'new-key' } }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugin).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue(mockPlugin as any);

      const { PATCH } = await import('@/app/api/admin/plugins/[id]/route');
      const request = new Request('http://localhost/api/admin/plugins/plugin-1', {
        method: 'PATCH',
        body: JSON.stringify({ config: 'not-an-object' }),
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data');
    });
  });

  describe('POST /api/admin/plugins/[id]/enable', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as any);

      const { POST } = await import(
        '@/app/api/admin/plugins/[id]/enable/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/enable',
        { method: 'POST' }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue(null);

      const { POST } = await import(
        '@/app/api/admin/plugins/[id]/enable/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/nonexistent/enable',
        { method: 'POST' }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Plugin not found');
    });

    it('should return 400 if already enabled', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue({
        ...mockPlugin,
        enabled: true,
      } as any);

      const { POST } = await import(
        '@/app/api/admin/plugins/[id]/enable/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/enable',
        { method: 'POST' }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Plugin is already enabled');
    });

    it('should enable a disabled plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique)
        .mockResolvedValueOnce({ ...mockPlugin, enabled: false } as any)
        .mockResolvedValueOnce({ ...mockPlugin, enabled: true } as any);

      const { enablePlugin } = await import('@/lib/plugins');
      vi.mocked(enablePlugin).mockResolvedValue(true);

      const { POST } = await import(
        '@/app/api/admin/plugins/[id]/enable/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/enable',
        { method: 'POST' }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugin).toBeDefined();
      expect(enablePlugin).toHaveBeenCalledWith('test-plugin');
    });
  });

  describe('POST /api/admin/plugins/[id]/disable', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as any);

      const { POST } = await import(
        '@/app/api/admin/plugins/[id]/disable/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/disable',
        { method: 'POST' }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 400 if already disabled', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue({
        ...mockPlugin,
        enabled: false,
      } as any);

      const { POST } = await import(
        '@/app/api/admin/plugins/[id]/disable/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/disable',
        { method: 'POST' }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Plugin is already disabled');
    });

    it('should disable an enabled plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique)
        .mockResolvedValueOnce({ ...mockPlugin, enabled: true } as any)
        .mockResolvedValueOnce({ ...mockPlugin, enabled: false } as any);

      const { disablePlugin } = await import('@/lib/plugins');
      vi.mocked(disablePlugin).mockResolvedValue(true);

      const { POST } = await import(
        '@/app/api/admin/plugins/[id]/disable/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/disable',
        { method: 'POST' }
      );
      const response = await POST(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.plugin).toBeDefined();
      expect(disablePlugin).toHaveBeenCalledWith('test-plugin');
    });
  });

  describe('GET /api/admin/plugins/[id]/logs', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as any);

      const { GET } = await import(
        '@/app/api/admin/plugins/[id]/logs/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/logs'
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 for non-existent plugin', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue(null);

      const { GET } = await import(
        '@/app/api/admin/plugins/[id]/logs/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/nonexistent/logs'
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: 'nonexistent' }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Plugin not found');
    });

    it('should return paginated logs', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue({
        id: 'plugin-1',
        name: 'test-plugin',
      } as any);

      const mockLogs = [
        {
          id: 'log-1',
          pluginId: 'plugin-1',
          level: 'info',
          message: 'Test log message',
          metadata: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.pluginLog.findMany).mockResolvedValue(mockLogs as any);
      vi.mocked(prisma.pluginLog.count).mockResolvedValue(1);

      const { GET } = await import(
        '@/app/api/admin/plugins/[id]/logs/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/logs'
      );
      const response = await GET(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
    });

    it('should filter logs by level', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue({
        id: 'plugin-1',
        name: 'test-plugin',
      } as any);

      vi.mocked(prisma.pluginLog.findMany).mockResolvedValue([]);
      vi.mocked(prisma.pluginLog.count).mockResolvedValue(0);

      const { GET } = await import(
        '@/app/api/admin/plugins/[id]/logs/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/logs?level=error'
      );
      await GET(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });

      expect(prisma.pluginLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            pluginId: 'plugin-1',
            level: 'error',
          }),
        })
      );
    });
  });

  describe('DELETE /api/admin/plugins/[id]/logs', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'user1',
        email: 'user@test.com',
        role: 'USER',
      } as any);

      const { DELETE } = await import(
        '@/app/api/admin/plugins/[id]/logs/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/logs',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('should clear plugin logs', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        id: 'admin1',
        email: 'admin@test.com',
        role: 'ADMIN',
      } as any);

      vi.mocked(prisma.plugin.findUnique).mockResolvedValue({
        id: 'plugin-1',
      } as any);

      vi.mocked(prisma.pluginLog.deleteMany).mockResolvedValue({ count: 10 });

      const { DELETE } = await import(
        '@/app/api/admin/plugins/[id]/logs/route'
      );
      const request = new Request(
        'http://localhost/api/admin/plugins/plugin-1/logs',
        { method: 'DELETE' }
      );
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'plugin-1' }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(10);
    });
  });
});
