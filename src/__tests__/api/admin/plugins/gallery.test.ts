/**
 * Admin Plugin Gallery API Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth
vi.mock('@/lib/auth', () => ({
  getApiUser: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    plugin: {
      findMany: vi.fn(),
    },
  },
}));

// Mock archive utilities
vi.mock('@/lib/plugins/archive', () => ({
  validateArchive: vi.fn(),
  extractPlugin: vi.fn(),
}));

// Mock loader
vi.mock('@/lib/plugins/loader', () => ({
  syncPluginWithDatabase: vi.fn(),
  reloadPlugin: vi.fn().mockResolvedValue(true),
  PLUGINS_DIR: '/tmp/plugins',
}));

import { getApiUser } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { validateArchive, extractPlugin } from '@/lib/plugins/archive';
import { syncPluginWithDatabase } from '@/lib/plugins/loader';
import {
  compareSemver,
  clearGalleryCache,
} from '@/lib/plugins/gallery';

// =============================================================================
// HELPERS
// =============================================================================

const mockRegistry = {
  version: 1,
  lastUpdated: '2026-01-28T00:00:00Z',
  plugins: [
    {
      name: 'ai-paper-reviewer',
      displayName: 'AI Paper Reviewer',
      version: '1.1.0',
      apiVersion: '1.0',
      description: 'Intelligent submission analysis with AI',
      author: 'CFP Directory',
      homepage: 'https://github.com/example/ai-paper-reviewer',
      permissions: ['submissions:read', 'reviews:write'],
      hooks: ['submission.created'],
      downloadUrl: 'https://example.com/releases/ai-paper-reviewer-1.1.0.zip',
      category: 'AI',
      tags: ['ai', 'review'],
    },
    {
      name: 'email-notifications',
      displayName: 'Email Notifications',
      version: '2.0.0',
      apiVersion: '1.0',
      description: 'Send email notifications',
      author: 'CFP Directory',
      permissions: ['email:send'],
      hooks: ['submission.statusChanged'],
      downloadUrl: 'https://example.com/releases/email-notifications-2.0.0.zip',
      category: 'Communication',
      tags: ['email'],
    },
  ],
};

const mockPluginRecord = {
  id: 'plugin-1',
  name: 'ai-paper-reviewer',
  displayName: 'AI Paper Reviewer',
  version: '1.1.0',
  apiVersion: '1.0',
  enabled: false,
  installed: true,
};

function setupAdminUser() {
  vi.mocked(getApiUser).mockResolvedValue({
    id: 'admin1',
    email: 'admin@test.com',
    role: 'ADMIN',
  } as any);
}

function setupNonAdminUser() {
  vi.mocked(getApiUser).mockResolvedValue({
    id: 'user1',
    email: 'user@test.com',
    role: 'USER',
  } as any);
}

// =============================================================================
// SEMVER COMPARISON TESTS
// =============================================================================

describe('compareSemver', () => {
  it('should return 0 for equal versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('2.3.4', '2.3.4')).toBe(0);
  });

  it('should return 1 when a > b', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.1.0', '1.0.0')).toBe(1);
    expect(compareSemver('1.0.1', '1.0.0')).toBe(1);
    expect(compareSemver('1.2.0', '1.1.9')).toBe(1);
  });

  it('should return -1 when a < b', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBe(-1);
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
    expect(compareSemver('1.0.0', '1.0.1')).toBe(-1);
  });

  it('should handle missing patch version', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.1', '1.0.0')).toBe(1);
  });
});

// =============================================================================
// GET /api/admin/plugins/gallery TESTS
// =============================================================================

describe('GET /api/admin/plugins/gallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGalleryCache();
  });

  it('should return 403 for non-admin users', async () => {
    setupNonAdminUser();

    const { GET } = await import(
      '@/app/api/admin/plugins/gallery/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Admin access required');
  });

  it('should return gallery plugins with install status', async () => {
    setupAdminUser();

    // Mock fetch for registry (uses hardcoded URL)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRegistry),
        });
      }
      return originalFetch(url);
    }) as any;

    // Mock installed plugins
    vi.mocked(prisma.plugin.findMany).mockResolvedValue([
      { name: 'ai-paper-reviewer', version: '1.0.0' },
    ] as any);

    const { GET } = await import(
      '@/app/api/admin/plugins/gallery/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.plugins).toHaveLength(2);
    expect(data.plugins[0].installStatus).toBe('update_available');
    expect(data.plugins[0].installedVersion).toBe('1.0.0');
    expect(data.plugins[1].installStatus).toBe('not_installed');
    expect(data.registryVersion).toBe(1);

    globalThis.fetch = originalFetch;
  });

  it('should pass refresh param to force cache bust', async () => {
    setupAdminUser();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRegistry),
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch as any;

    vi.mocked(prisma.plugin.findMany).mockResolvedValue([] as any);

    const { GET } = await import(
      '@/app/api/admin/plugins/gallery/route'
    );

    // First call - populates cache
    const req1 = new Request('http://localhost/api/admin/plugins/gallery');
    await GET(req1);

    // Second call with refresh=true should re-fetch
    const req2 = new Request('http://localhost/api/admin/plugins/gallery?refresh=true');
    await GET(req2);

    // fetch should have been called at least twice (once for each GET)
    expect(mockFetch).toHaveBeenCalledTimes(2);

    globalThis.fetch = originalFetch;
  });

  it('should return 502 when registry fetch fails', async () => {
    setupAdminUser();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

    const { GET } = await import(
      '@/app/api/admin/plugins/gallery/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery');
    const response = await GET(request);

    expect(response.status).toBe(502);

    globalThis.fetch = originalFetch;
  });
});

// =============================================================================
// POST /api/admin/plugins/gallery/install TESTS
// =============================================================================

describe('POST /api/admin/plugins/gallery/install', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGalleryCache();
  });

  it('should return 403 for non-admin users', async () => {
    setupNonAdminUser();

    const { POST } = await import(
      '@/app/api/admin/plugins/gallery/install/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginName: 'test' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Admin access required');
  });

  it('should return 400 when pluginName is missing', async () => {
    setupAdminUser();

    const { POST } = await import(
      '@/app/api/admin/plugins/gallery/install/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('pluginName');
  });

  it('should return 404 when plugin is not in registry', async () => {
    setupAdminUser();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRegistry),
        });
      }
      return originalFetch(url);
    }) as any;

    const { POST } = await import(
      '@/app/api/admin/plugins/gallery/install/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginName: 'nonexistent-plugin' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found in registry');

    globalThis.fetch = originalFetch;
  });

  it('should return 502 when plugin download fails', async () => {
    setupAdminUser();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRegistry),
        });
      }
      if (url.includes('releases/')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      return originalFetch(url);
    }) as any;

    const { POST } = await import(
      '@/app/api/admin/plugins/gallery/install/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginName: 'ai-paper-reviewer' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.error).toContain('Failed to download');

    globalThis.fetch = originalFetch;
  });

  it('should return 400 when archive validation fails', async () => {
    setupAdminUser();

    const archiveBuffer = Buffer.from([0x50, 0x4b, 0x00, 0x00]);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRegistry),
        });
      }
      if (url.includes('releases/')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(archiveBuffer.buffer),
        });
      }
      return originalFetch(url);
    }) as any;

    vi.mocked(validateArchive).mockResolvedValue({
      valid: false,
      error: 'Invalid archive format',
    });

    const { POST } = await import(
      '@/app/api/admin/plugins/gallery/install/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginName: 'ai-paper-reviewer' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid plugin archive');

    globalThis.fetch = originalFetch;
  });

  it('should successfully install a gallery plugin', async () => {
    setupAdminUser();

    const archiveBuffer = Buffer.from([0x50, 0x4b, 0x00, 0x00]);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('registry.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRegistry),
        });
      }
      if (url.includes('releases/')) {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(archiveBuffer.buffer),
        });
      }
      return originalFetch(url);
    }) as any;

    vi.mocked(validateArchive).mockResolvedValue({
      valid: true,
      manifest: {
        name: 'ai-paper-reviewer',
        displayName: 'AI Paper Reviewer',
        version: '1.1.0',
        apiVersion: '1.0',
      },
      archiveType: 'zip',
    });

    vi.mocked(extractPlugin).mockResolvedValue({
      success: true,
      pluginName: 'ai-paper-reviewer',
      pluginPath: '/plugins/ai-paper-reviewer',
    });

    vi.mocked(syncPluginWithDatabase).mockResolvedValue(
      mockPluginRecord as any
    );

    const { POST } = await import(
      '@/app/api/admin/plugins/gallery/install/route'
    );
    const request = new Request('http://localhost/api/admin/plugins/gallery/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pluginName: 'ai-paper-reviewer' }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.plugin.name).toBe('ai-paper-reviewer');

    // Verify extractPlugin was called with force: true
    expect(extractPlugin).toHaveBeenCalledWith(
      expect.any(Buffer),
      { force: true }
    );

    globalThis.fetch = originalFetch;
  });
});

// =============================================================================
// getGalleryWithStatus TESTS
// =============================================================================

describe('getGalleryWithStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGalleryCache();
  });

  it('should cross-reference installed plugins correctly', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRegistry),
    }) as any;

    // One plugin installed with older version, one not installed
    vi.mocked(prisma.plugin.findMany).mockResolvedValue([
      { name: 'ai-paper-reviewer', version: '1.0.0' },
    ] as any);

    const { getGalleryWithStatus } = await import('@/lib/plugins/gallery');
    const result = await getGalleryWithStatus(true);

    expect(result).not.toBeNull();
    expect(result!.plugins).toHaveLength(2);

    // ai-paper-reviewer: installed v1.0.0, registry v1.1.0 → update_available
    const reviewer = result!.plugins.find((p) => p.name === 'ai-paper-reviewer');
    expect(reviewer!.installStatus).toBe('update_available');
    expect(reviewer!.installedVersion).toBe('1.0.0');

    // email-notifications: not installed
    const email = result!.plugins.find((p) => p.name === 'email-notifications');
    expect(email!.installStatus).toBe('not_installed');
    expect(email!.installedVersion).toBeUndefined();

    globalThis.fetch = originalFetch;
  });

  it('should mark as installed when versions match', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRegistry),
    }) as any;

    vi.mocked(prisma.plugin.findMany).mockResolvedValue([
      { name: 'ai-paper-reviewer', version: '1.1.0' },
    ] as any);

    const { getGalleryWithStatus } = await import('@/lib/plugins/gallery');
    const result = await getGalleryWithStatus(true);

    const reviewer = result!.plugins.find((p) => p.name === 'ai-paper-reviewer');
    expect(reviewer!.installStatus).toBe('installed');

    globalThis.fetch = originalFetch;
  });
});
