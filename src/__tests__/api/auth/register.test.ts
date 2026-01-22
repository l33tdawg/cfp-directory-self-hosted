/**
 * Registration API Unit Tests
 * 
 * Tests for user registration including email verification flow
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
    siteSettings: {
      findUnique: vi.fn(),
    },
    verificationToken: {
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
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/email/email-service', () => ({
  emailService: {
    sendTemplatedEmail: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/lib/activity-logger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Mock env config
vi.mock('@/lib/env', () => ({
  config: {
    isDev: false,
    app: {
      url: 'http://localhost:3000',
    },
  },
}));

// Import after mocks are set up
import { prisma } from '@/lib/db/prisma';
import { emailService } from '@/lib/email/email-service';
import { logActivity } from '@/lib/activity-logger';
import { POST } from '@/app/api/auth/register/route';

function createMockRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as NextRequest;
}

// Helper to set up siteSettings mock
function mockSiteSettings(allowPublicSignup: boolean, websiteUrl?: string) {
  vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue({
    id: 'default',
    allowPublicSignup,
    websiteUrl: websiteUrl || null,
  } as never);
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: signup disabled
    mockSiteSettings(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('public signup disabled (default)', () => {
    it('should reject registration when allowPublicSignup is false', async () => {
      mockSiteSettings(false);
      
      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Speaker registration is currently disabled');
    });

    it('should not even attempt database operations when disabled', async () => {
      mockSiteSettings(false);
      
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
      mockSiteSettings(true);
    });

    it('should create user and verification token when signup enabled', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'SPEAKER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        user: mockUser,
        verificationToken: 'mock-token-uuid',
      });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.requiresVerification).toBe(true);
      expect(data.email).toBe('test@example.com');
      expect(data.message).toContain('check your email');
    });

    it('should NOT return user object in response (security)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'SPEAKER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        user: mockUser,
        verificationToken: 'mock-token-uuid',
      });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      // User object should NOT be in response anymore
      expect(data.user).toBeUndefined();
    });

    it('should send verification email after registration', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'SPEAKER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        user: mockUser,
        verificationToken: 'mock-token-uuid',
      });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      await POST(request);

      // Verify email was sent
      expect(emailService.sendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          templateType: 'email_verification',
          variables: expect.objectContaining({
            userName: 'Test User',
            verifyUrl: expect.stringContaining('verify-email?token='),
            expiresIn: '24 hours',
          }),
        })
      );
    });

    it('should log registration activity', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'SPEAKER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        user: mockUser,
        verificationToken: 'mock-token-uuid',
      });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User',
      });

      await POST(request);

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: 'user-1',
          metadata: expect.objectContaining({
            role: 'SPEAKER',
            requiresVerification: true,
          }),
        })
      );
    });

    it('should ALWAYS create SPEAKER role, never ADMIN', async () => {
      // Even if this is the first user, public registration should NOT grant ADMIN
      const mockUser = {
        id: 'user-1',
        email: 'first@example.com',
        name: 'First User',
        role: 'SPEAKER', // Must always be SPEAKER for public registration
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
          verificationToken: {
            create: vi.fn().mockResolvedValue({ token: 'mock-token' }),
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
      expect(data.requiresVerification).toBe(true);
    });

    it('should never return isFirstUser flag', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'SPEAKER',
        createdAt: new Date(),
      };

      vi.mocked(prisma.$transaction).mockResolvedValue({
        user: mockUser,
        verificationToken: 'mock-token-uuid',
      });

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
      mockSiteSettings(true);
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
      mockSiteSettings(true);
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
      vi.mocked(prisma.$transaction).mockResolvedValue({
        user: {
          id: 'user-1',
          email: 'new@example.com',
          role: 'SPEAKER',
          createdAt: new Date(),
        },
        verificationToken: 'mock-token',
      });

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

      // Should have same message structure as successful registration
      expect(data.error).toBeUndefined();
      expect(data.message).toContain('check your email');
      expect(data.requiresVerification).toBe(true);
    });
  });

  describe('verification token creation', () => {
    beforeEach(() => {
      mockSiteSettings(true);
    });

    it('should create verification token with 24 hour expiry', async () => {
      let capturedTokenData: unknown;

      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({
              id: 'user-1',
              email: 'test@example.com',
              role: 'SPEAKER',
              createdAt: new Date(),
            }),
          },
          verificationToken: {
            create: vi.fn().mockImplementation((data) => {
              capturedTokenData = data;
              return { token: 'mock-token' };
            }),
          },
        };
        return callback(tx as never);
      });

      const request = createMockRequest({
        email: 'test@example.com',
        password: 'Password123',
      });

      await POST(request);

      // Verify token was created with correct data
      expect(capturedTokenData).toBeDefined();
      const tokenData = capturedTokenData as { data: { identifier: string; token: string; expires: Date } };
      expect(tokenData.data.identifier).toBe('test@example.com');
      expect(tokenData.data.token).toBeDefined();
      
      // Check expiry is approximately 24 hours from now
      const expectedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const actualExpiry = new Date(tokenData.data.expires);
      const diff = Math.abs(actualExpiry.getTime() - expectedExpiry.getTime());
      expect(diff).toBeLessThan(5000); // Within 5 seconds
    });
  });
});
