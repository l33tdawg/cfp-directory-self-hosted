/**
 * Admin Plugin Upload API Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdmZip from 'adm-zip';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getApiUser: vi.fn(),
}));

// Mock archive utilities
vi.mock('@/lib/plugins/archive', () => ({
  validateArchive: vi.fn(),
  extractPlugin: vi.fn(),
  MAX_ARCHIVE_SIZE: 50 * 1024 * 1024,
}));

// Mock loader
vi.mock('@/lib/plugins/loader', () => ({
  syncPluginWithDatabase: vi.fn(),
}));

import { getApiUser } from '@/lib/auth';
import { validateArchive, extractPlugin } from '@/lib/plugins/archive';
import { syncPluginWithDatabase } from '@/lib/plugins/loader';

// =============================================================================
// HELPERS
// =============================================================================

function createValidManifest(): string {
  return JSON.stringify({
    name: 'test-plugin',
    displayName: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '1.0',
  });
}

function createZipBuffer(): Buffer {
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(createValidManifest()));
  zip.addFile('index.js', Buffer.from('module.exports = {}'));
  return zip.toBuffer();
}

function createFormData(
  buffer: Buffer,
  filename = 'plugin.zip',
  force = false
): FormData {
  const blob = new Blob([buffer], { type: 'application/zip' });
  const file = new File([blob], filename, { type: 'application/zip' });
  const formData = new FormData();
  formData.append('file', file);
  if (force) {
    formData.append('force', 'true');
  }
  return formData;
}

const mockPluginRecord = {
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

describe('POST /api/admin/plugins/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 403 for non-admin users', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'user1',
      email: 'user@test.com',
      role: 'USER',
    } as any);

    const { POST } = await import(
      '@/app/api/admin/plugins/upload/route'
    );
    const buffer = createZipBuffer();
    const formData = createFormData(buffer);
    const request = new Request('http://localhost/api/admin/plugins/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Admin access required');
  });

  it('should return 400 when no file is provided', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    const { POST } = await import(
      '@/app/api/admin/plugins/upload/route'
    );
    const formData = new FormData();
    const request = new Request('http://localhost/api/admin/plugins/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No file provided');
  });

  it('should return 400 for invalid archive', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(validateArchive).mockResolvedValue({
      valid: false,
      error: 'Unsupported archive format',
    });

    const { POST } = await import(
      '@/app/api/admin/plugins/upload/route'
    );
    const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const formData = createFormData(buffer);
    const request = new Request('http://localhost/api/admin/plugins/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Unsupported archive format');
  });

  it('should return 409 when plugin already exists without force', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(validateArchive).mockResolvedValue({
      valid: true,
      manifest: {
        name: 'test-plugin',
        displayName: 'Test Plugin',
        version: '1.0.0',
        apiVersion: '1.0',
      },
      archiveType: 'zip',
    });

    vi.mocked(extractPlugin).mockResolvedValue({
      success: false,
      error: "Plugin 'test-plugin' already exists",
      conflict: true,
      pluginName: 'test-plugin',
    });

    const { POST } = await import(
      '@/app/api/admin/plugins/upload/route'
    );
    const buffer = createZipBuffer();
    const formData = createFormData(buffer);
    const request = new Request('http://localhost/api/admin/plugins/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.exists).toBe(true);
    expect(data.existingPlugin).toBe('test-plugin');
  });

  it('should return 200 for successful upload', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(validateArchive).mockResolvedValue({
      valid: true,
      manifest: {
        name: 'test-plugin',
        displayName: 'Test Plugin',
        version: '1.0.0',
        apiVersion: '1.0',
      },
      archiveType: 'zip',
    });

    vi.mocked(extractPlugin).mockResolvedValue({
      success: true,
      pluginName: 'test-plugin',
      pluginPath: '/plugins/test-plugin',
    });

    vi.mocked(syncPluginWithDatabase).mockResolvedValue(
      mockPluginRecord as any
    );

    const { POST } = await import(
      '@/app/api/admin/plugins/upload/route'
    );
    const buffer = createZipBuffer();
    const formData = createFormData(buffer);
    const request = new Request('http://localhost/api/admin/plugins/upload', {
      method: 'POST',
      body: formData,
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.plugin.name).toBe('test-plugin');
  });

  it('should pass force=true to extractPlugin when specified', async () => {
    vi.mocked(getApiUser).mockResolvedValue({
      id: 'admin1',
      email: 'admin@test.com',
      role: 'ADMIN',
    } as any);

    vi.mocked(validateArchive).mockResolvedValue({
      valid: true,
      manifest: {
        name: 'test-plugin',
        displayName: 'Test Plugin',
        version: '1.0.0',
        apiVersion: '1.0',
      },
      archiveType: 'zip',
    });

    vi.mocked(extractPlugin).mockResolvedValue({
      success: true,
      pluginName: 'test-plugin',
      pluginPath: '/plugins/test-plugin',
    });

    vi.mocked(syncPluginWithDatabase).mockResolvedValue(
      mockPluginRecord as any
    );

    const { POST } = await import(
      '@/app/api/admin/plugins/upload/route'
    );
    const buffer = createZipBuffer();
    const formData = createFormData(buffer, 'plugin.zip', true);
    const request = new Request('http://localhost/api/admin/plugins/upload', {
      method: 'POST',
      body: formData,
    });
    await POST(request);

    expect(extractPlugin).toHaveBeenCalledWith(
      expect.any(Buffer),
      { force: true }
    );
  });
});
