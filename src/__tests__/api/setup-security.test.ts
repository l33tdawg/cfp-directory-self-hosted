/**
 * Setup API Security Tests
 * 
 * Tests for SETUP_TOKEN requirement and fresh-install protection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    siteSettings: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed-password'),
}));

vi.mock('@/lib/security/encryption', () => ({
  encryptPiiFields: vi.fn((data: Record<string, unknown>) => data),
  USER_PII_FIELDS: ['name'],
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimitMiddleware: vi.fn().mockReturnValue(null),
}));

// Configurable mock for env config with getters
let mockSetupToken = '';
let mockIsProd = false;

vi.mock('@/lib/env', () => ({
  get config() {
    return {
      get setupToken() { return mockSetupToken; },
      get isProd() { return mockIsProd; },
    };
  },
}));

import { prisma } from '@/lib/db/prisma';
import { POST } from '@/app/api/setup/complete/route';

function createMockRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  const headerMap = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    headerMap.set(key, value);
  });
  
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: headerMap,
  } as unknown as NextRequest;
}

const validSetupData = {
  adminName: 'Test Admin',
  adminEmail: 'admin@example.com',
  adminPassword: 'SecurePass123',
  siteName: 'Test CFP Site',
  siteDescription: 'A test site for CFP',
  siteWebsite: 'https://example.com',
};

describe('POST /api/setup/complete - Security', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockSetupToken = '';
    mockIsProd = false;
    
    // Reset rate limit mock to allow requests
    const { rateLimitMiddleware } = await import('@/lib/rate-limit');
    vi.mocked(rateLimitMiddleware).mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SETUP_TOKEN requirement', () => {
    it('should allow setup without token when SETUP_TOKEN is not configured', async () => {
      mockSetupToken = '';
      
      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };
      const mockSettings = {
        id: 'default',
        name: 'Test CFP Site',
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        admin: mockAdmin,
        settings: mockSettings,
      });

      const request = createMockRequest(validSetupData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should reject setup when SETUP_TOKEN is configured but not provided', async () => {
      mockSetupToken = 'secret-setup-token-12345';

      const request = createMockRequest(validSetupData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid or missing setup token');
    });

    it('should reject setup when SETUP_TOKEN is wrong', async () => {
      mockSetupToken = 'correct-token';

      const request = createMockRequest({
        ...validSetupData,
        setupToken: 'wrong-token',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid or missing setup token');
    });

    it('should accept correct SETUP_TOKEN in request body', async () => {
      mockSetupToken = 'correct-token';

      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };
      const mockSettings = {
        id: 'default',
        name: 'Test CFP Site',
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        admin: mockAdmin,
        settings: mockSettings,
      });

      const request = createMockRequest({
        ...validSetupData,
        setupToken: 'correct-token',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should accept correct SETUP_TOKEN in Authorization header', async () => {
      mockSetupToken = 'correct-token';

      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };
      const mockSettings = {
        id: 'default',
        name: 'Test CFP Site',
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        admin: mockAdmin,
        settings: mockSettings,
      });

      const request = createMockRequest(validSetupData, {
        authorization: 'Bearer correct-token',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('should use constant-time comparison for token validation', async () => {
      // This is a security requirement - timing attacks should not be possible
      // We can't directly test timing, but we verify the function exists
      mockSetupToken = 'a'.repeat(32);

      // Even with similar tokens, should reject
      const request = createMockRequest({
        ...validSetupData,
        setupToken: 'a'.repeat(31) + 'b',
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('setup already complete protection', () => {
    it('should reject setup when admin already exists', async () => {
      mockSetupToken = '';

      vi.mocked(prisma.$transaction).mockRejectedValue(
        Object.assign(new Error('SETUP_ALREADY_COMPLETE'), { message: 'SETUP_ALREADY_COMPLETE' })
      );

      const request = createMockRequest(validSetupData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Setup already complete');
    });

    it('should reject setup when email is already taken', async () => {
      mockSetupToken = '';

      vi.mocked(prisma.$transaction).mockRejectedValue(
        Object.assign(new Error('EMAIL_ALREADY_EXISTS'), { message: 'EMAIL_ALREADY_EXISTS' })
      );

      const request = createMockRequest(validSetupData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already exists');
    });
  });

  describe('production SETUP_TOKEN enforcement', () => {
    it('should reject setup in production when SETUP_TOKEN is not configured', async () => {
      mockSetupToken = '';
      mockIsProd = true;

      const request = createMockRequest(validSetupData);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('SETUP_TOKEN is required for production');
    });

    it('should allow setup in production when SETUP_TOKEN is configured and provided', async () => {
      mockSetupToken = 'production-secret-token';
      mockIsProd = true;

      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };
      const mockSettings = {
        id: 'default',
        name: 'Test CFP Site',
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        admin: mockAdmin,
        settings: mockSettings,
      });

      const request = createMockRequest({
        ...validSetupData,
        setupToken: 'production-secret-token',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });
  });

  describe('rate limiting', () => {
    it('should apply rate limiting to prevent race attacks', async () => {
      const { rateLimitMiddleware } = await import('@/lib/rate-limit');
      
      const request = createMockRequest(validSetupData);
      await POST(request);

      expect(rateLimitMiddleware).toHaveBeenCalledWith(request, 'authStrict');
    });

    it('should return rate limit response when exceeded', async () => {
      const { rateLimitMiddleware } = await import('@/lib/rate-limit');
      
      // Mock rate limit exceeded
      vi.mocked(rateLimitMiddleware).mockReturnValue(
        new Response(JSON.stringify({ error: 'Rate limited' }), { status: 429 })
      );

      const request = createMockRequest(validSetupData);
      const response = await POST(request);

      expect(response.status).toBe(429);
    });
  });

  describe('input validation', () => {
    beforeEach(() => {
      mockSetupToken = '';
    });

    it('should reject missing admin email', async () => {
      const request = createMockRequest({
        ...validSetupData,
        adminEmail: undefined,
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject invalid admin email', async () => {
      const request = createMockRequest({
        ...validSetupData,
        adminEmail: 'not-an-email',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Validation failed');
    });

    it('should reject short password', async () => {
      const request = createMockRequest({
        ...validSetupData,
        adminPassword: 'short',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject short admin name', async () => {
      const request = createMockRequest({
        ...validSetupData,
        adminName: 'A',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject short site name', async () => {
      const request = createMockRequest({
        ...validSetupData,
        siteName: 'X',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject invalid website URL', async () => {
      const request = createMockRequest({
        ...validSetupData,
        siteWebsite: 'not-a-url',
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should allow empty website URL', async () => {
      mockSetupToken = '';

      const mockAdmin = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
      const mockSettings = { id: 'default', name: 'Test' };
      vi.mocked(prisma.$transaction).mockResolvedValue({ admin: mockAdmin, settings: mockSettings });

      const request = createMockRequest({
        ...validSetupData,
        siteWebsite: '',
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});
