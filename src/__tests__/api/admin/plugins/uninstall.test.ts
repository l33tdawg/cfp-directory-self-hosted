/**
 * Admin Plugin Uninstall API Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getApiUser: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plugin: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    pluginLog: {
      deleteMany: vi.fn(),
    },
    pluginJob: {
      deleteMany: vi.fn(),
    },
  },
}));

// Mock plugin registry
const mockDisable = vi.fn();
const mockUnregister = vi.fn();
vi.mock('@/lib/plugins/registry', () => ({
  getPluginRegistry: () => ({
    disable: mockDisable,
    unregister: mockUnregister,
  }),
}));

// Mock archive utilities
vi.mock('@/lib/plugins/archive', () => ({
  removePluginFiles: vi.fn(),
}));

import { getApiUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { removePluginFiles } from '@/lib/plugins/archive';

const mockPlugin = {
  id: 'plugin-1',
  name: 'test-plugin',
  displayName: 'Test Plugin',
  version: '1.0.0',
  apiVersion: '1.0',
  enabled: false,
  installed: true,
};

// =============================================================================
// TESTS
// =============================================================================

describe('DELETE /api/admin/plugins/[id]/uninstall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 for non-admin users', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'user1',
      email: 'user@test.com',
      role: 'USER',
    } as any);

    const { DELETE } = await import(
      '@/app/api/admin/plugins/[id]/uninstall/route'
    );
    const request = new Request(
      'http://localhost/api/admin/plugins/plugin-1/uninstall',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'plugin-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Admin access required');
  });

  it('should return 404 for non-existent plugin', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(prisma.plugin.findUnique).mockResolvedValue(null);

    const { DELETE } = await import(
      '@/app/api/admin/plugins/[id]/uninstall/route'
    );
    const request = new Request(
      'http://localhost/api/admin/plugins/nonexistent/uninstall',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Plugin not found');
  });

  it('should disable enabled plugin before uninstalling', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(prisma.plugin.findUnique).mockResolvedValue({
      ...mockPlugin,
      enabled: true,
    } as any);
    vi.mocked(prisma.pluginLog.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.pluginJob.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.plugin.delete).mockResolvedValue(mockPlugin as any);
    vi.mocked(removePluginFiles).mockResolvedValue();
    mockDisable.mockResolvedValue(true);
    mockUnregister.mockReturnValue(true);

    const { DELETE } = await import(
      '@/app/api/admin/plugins/[id]/uninstall/route'
    );
    const request = new Request(
      'http://localhost/api/admin/plugins/plugin-1/uninstall',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'plugin-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDisable).toHaveBeenCalledWith('test-plugin');
    expect(mockUnregister).toHaveBeenCalledWith('test-plugin');
  });

  it('should skip disable for already-disabled plugins', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(prisma.plugin.findUnique).mockResolvedValue({
      ...mockPlugin,
      enabled: false,
    } as any);
    vi.mocked(prisma.pluginLog.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.pluginJob.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.plugin.delete).mockResolvedValue(mockPlugin as any);
    vi.mocked(removePluginFiles).mockResolvedValue();
    mockUnregister.mockReturnValue(true);

    const { DELETE } = await import(
      '@/app/api/admin/plugins/[id]/uninstall/route'
    );
    const request = new Request(
      'http://localhost/api/admin/plugins/plugin-1/uninstall',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'plugin-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDisable).not.toHaveBeenCalled();
  });

  it('should delete files and DB records on uninstall', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(prisma.plugin.findUnique).mockResolvedValue(mockPlugin as any);
    vi.mocked(prisma.pluginLog.deleteMany).mockResolvedValue({ count: 5 });
    vi.mocked(prisma.pluginJob.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.plugin.delete).mockResolvedValue(mockPlugin as any);
    vi.mocked(removePluginFiles).mockResolvedValue();
    mockUnregister.mockReturnValue(true);

    const { DELETE } = await import(
      '@/app/api/admin/plugins/[id]/uninstall/route'
    );
    const request = new Request(
      'http://localhost/api/admin/plugins/plugin-1/uninstall',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'plugin-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(removePluginFiles).toHaveBeenCalledWith('test-plugin');
    expect(prisma.pluginLog.deleteMany).toHaveBeenCalledWith({
      where: { pluginId: 'plugin-1' },
    });
    expect(prisma.pluginJob.deleteMany).toHaveBeenCalledWith({
      where: { pluginId: 'plugin-1' },
    });
    expect(prisma.plugin.delete).toHaveBeenCalledWith({
      where: { id: 'plugin-1' },
    });
  });

  it('should continue uninstall even if file removal fails', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(prisma.plugin.findUnique).mockResolvedValue(mockPlugin as any);
    vi.mocked(prisma.pluginLog.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.pluginJob.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.plugin.delete).mockResolvedValue(mockPlugin as any);
    vi.mocked(removePluginFiles).mockRejectedValue(new Error('ENOENT'));
    mockUnregister.mockReturnValue(true);

    const { DELETE } = await import(
      '@/app/api/admin/plugins/[id]/uninstall/route'
    );
    const request = new Request(
      'http://localhost/api/admin/plugins/plugin-1/uninstall',
      { method: 'DELETE' }
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'plugin-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    // DB records should still be cleaned up
    expect(prisma.plugin.delete).toHaveBeenCalled();
  });
});
