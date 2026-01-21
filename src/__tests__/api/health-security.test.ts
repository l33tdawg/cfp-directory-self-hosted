/**
 * Health API Security Tests
 * 
 * Tests for health endpoint authorization on detailed info
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Prisma - must be before imports
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

// Mock auth
vi.mock('@/lib/auth/auth', () => ({
  auth: vi.fn().mockResolvedValue(null),
}));

// Mutable config values
let mockCronSecret = '';
let mockIsProd = false;

vi.mock('@/lib/env', () => ({
  get config() {
    return {
      get cronSecret() { return mockCronSecret; },
      get isProd() { return mockIsProd; },
    };
  },
}));

// Import after mocks
import { auth } from '@/lib/auth/auth';
import { GET } from '@/app/api/health/route';

function createMockRequest(searchParams: Record<string, string> = {}, headers: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/health');
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  const headerMap = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    headerMap.set(key, value);
  });
  
  return {
    nextUrl: url,
    headers: headerMap,
  } as unknown as NextRequest;
}

describe('GET /api/health - Security', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockCronSecret = '';
    mockIsProd = false;
    
    // Reset the prisma mock to success state
    const { prisma } = await import('@/lib/db/prisma');
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('basic health check (public)', () => {
    it('should return basic health info without authentication', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.database).toBe('connected');
      // Should NOT include detailed checks
      expect(data.checks).toBeUndefined();
    });

    it('should return unhealthy status when database is down', async () => {
      const { prisma } = await import('@/lib/db/prisma');
      vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('Connection failed'));
      
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.status).toBe('unhealthy');
      expect(data.database).toBe('disconnected');
    });

    it('should not expose exact NODE_ENV value', async () => {
      mockIsProd = false;
      
      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      // Should return 'development' or 'production', not exact env value
      expect(['development', 'production']).toContain(data.environment);
    });
  });

  describe('detailed health check (requires auth)', () => {
    it('should reject detailed request without authentication', async () => {
      vi.mocked(auth).mockResolvedValue(null);
      mockCronSecret = '';
      
      const request = createMockRequest({ detailed: 'true' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('requires admin authentication');
    });

    it('should reject detailed request from non-admin user', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com', role: 'USER' },
      } as never);
      
      const request = createMockRequest({ detailed: 'true' });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should reject detailed request from organizer', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'org-1', email: 'org@example.com', role: 'ORGANIZER' },
      } as never);
      
      const request = createMockRequest({ detailed: 'true' });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should allow detailed request from admin', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
      } as never);
      
      const request = createMockRequest({ detailed: 'true' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checks).toBeDefined();
      expect(data.checks.database).toBeDefined();
      expect(data.checks.storage).toBeDefined();
      expect(data.checks.email).toBeDefined();
    });

    it('should include database latency in detailed checks', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
      } as never);
      
      const request = createMockRequest({ detailed: 'true' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.database.latency).toBeDefined();
      expect(typeof data.checks.database.latency).toBe('number');
    });

    it('should include storage and email configuration status', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
      } as never);
      
      const request = createMockRequest({ detailed: 'true' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.checks.storage.status).toBeDefined();
      expect(data.checks.email.status).toBeDefined();
    });
  });

  describe('CRON_SECRET authentication', () => {
    it('should allow detailed request with valid CRON_SECRET in x-cron-secret header', async () => {
      mockCronSecret = 'valid-cron-secret';
      vi.mocked(auth).mockResolvedValue(null);
      
      const request = createMockRequest({ detailed: 'true' }, {
        'x-cron-secret': 'valid-cron-secret',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checks).toBeDefined();
    });

    it('should allow detailed request with valid CRON_SECRET in Authorization header', async () => {
      mockCronSecret = 'valid-cron-secret';
      vi.mocked(auth).mockResolvedValue(null);
      
      const request = createMockRequest({ detailed: 'true' }, {
        authorization: 'Bearer valid-cron-secret',
      });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.checks).toBeDefined();
    });

    it('should reject detailed request with invalid CRON_SECRET', async () => {
      mockCronSecret = 'valid-cron-secret';
      vi.mocked(auth).mockResolvedValue(null);
      
      const request = createMockRequest({ detailed: 'true' }, {
        'x-cron-secret': 'wrong-secret',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should use constant-time comparison for CRON_SECRET', async () => {
      // We can't directly test timing, but we verify similar-length secrets are rejected
      mockCronSecret = 'a'.repeat(32);
      vi.mocked(auth).mockResolvedValue(null);
      
      const request = createMockRequest({ detailed: 'true' }, {
        'x-cron-secret': 'a'.repeat(31) + 'b',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should handle empty CRON_SECRET gracefully', async () => {
      mockCronSecret = '';
      vi.mocked(auth).mockResolvedValue(null);
      
      // Even with x-cron-secret header, should require auth when CRON_SECRET is empty
      const request = createMockRequest({ detailed: 'true' }, {
        'x-cron-secret': 'anything',
      });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('cache control', () => {
    it('should set no-cache headers', async () => {
      const request = createMockRequest();
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toContain('no-store');
      expect(response.headers.get('Cache-Control')).toContain('no-cache');
    });
  });
});
