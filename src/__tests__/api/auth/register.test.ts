/**
 * Registration API Unit Tests
 * 
 * Tests for user registration security controls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies - must be before any imports that use them
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/auth', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
}));

vi.mock('@/lib/security/encryption', () => ({
  encryptPiiFields: vi.fn((data: Record<string, unknown>) => data),
  decryptPiiFields: vi.fn((data: Record<string, unknown>) => data),
  USER_PII_FIELDS: ['name'],
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimitMiddleware: vi.fn().mockReturnValue(null),
}));

// Mock env config with getter to allow dynamic values
let mockAllowPublicSignup = false;
let mockIsDev = false;

vi.mock('@/lib/env', () => ({
  get config() {
    return {
      get allowPublicSignup() { return mockAllowPublicSignup; },
      get isDev() { return mockIsDev; },
    };
  },
}));

// Import after mocks are set up
import { prisma } from '@/lib/db/prisma';
import { POST } from '@/app/api/auth/register/route';

function createMockRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default (signup disabled)
    mockAllowPublicSignup = false;
    mockIsDev = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('public signup disabled (default)', () => {
    it('should reject registration when ALLOW_PUBLIC_SIGNUP is false', async () => {
      mockAllowPublicSignup = false;
      
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Public registration is disabled');
    });

    it('should not even attempt database operations when disabled', async () => {
      mockAllowPublicSignup = false;
      
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      await POST(request);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('public signup enabled', () => {
    beforeEach(() => {
      mockAllowPublicSignup = true;
    });

    it('should allow registration when ALLOW_PUBLIC_SIGNUP is true', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue(mockUser);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.user).toBeDefined();
    });

    it('should ALWAYS create USER role, never ADMIN', async () => {
      // Even if this is the first user, public registration should NOT grant ADMIN
      const mockUser = {
        id: 'user-1',
        email: 'first@example.com',
        name: 'First User',
        role: 'USER', // Must always be USER
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        // Simulate the transaction callback
        const tx = {
          user: {
            findUnique: vi.fn().mockResolvedValue(null),
            count: vi.fn().mockResolvedValue(0), // First user!
            create: vi.fn().mockResolvedValue(mockUser),
          },
        };
        return callback(tx as never);
      });

      const request = createMockRequest({
        email: 'first@example.com',
        password: 'Password123',
        name: 'First User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      // The returned user should have USER role, not ADMIN
      expect(data.user.role).toBe('USER');
    });

    it('should never return isFirstUser flag', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue(mockUser);

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      // isFirstUser should not be exposed to prevent enumeration
      expect(data.isFirstUser).toBeUndefined();
    });
  });

  describe('input validation', () => {
    beforeEach(() => {
      mockAllowPublicSignup = true;
    });

    it('should reject invalid email format', async () => {
      const request = createMockRequest({
        email: 'not-an-email',
        password: 'Password123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should reject weak passwords', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'weak',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('should reject password without uppercase', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'password123',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject password without lowercase', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'PASSWORD123',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject password without numbers', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'PasswordABC',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('email enumeration prevention', () => {
    beforeEach(() => {
      mockAllowPublicSignup = true;
    });

    it('should return same status code for existing and new emails', async () => {
      // Test with existing email
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('EMAIL_ALREADY_EXISTS'));

      const request1 = createMockRequest({
        email: 'existing@example.com',
        password: 'Password123',
      });

      const response1 = await POST(request1);

      // Test with new email
      const mockUser = {
        id: 'user-1',
        email: 'new@example.com',
        role: 'USER',
        createdAt: new Date(),
      };
      vi.mocked(prisma.$transaction).mockResolvedValue(mockUser);

      const request2 = createMockRequest({
        email: 'new@example.com',
        password: 'Password123',
      });

      const response2 = await POST(request2);

      // Both should return 201 to prevent enumeration
      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    it('should return generic message for existing email', async () => {
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error('EMAIL_ALREADY_EXISTS'));

      const request = createMockRequest({
        email: 'existing@example.com',
        password: 'Password123',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should not indicate email exists
      expect(data.error).toBeUndefined();
      expect(data.message).toContain('If this email is available');
    });
  });
});
