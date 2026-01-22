/**
 * Resend Verification Email API Unit Tests
 * 
 * Tests for the resend verification email endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    verificationToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
    },
    siteSettings: {
      findUnique: vi.fn(),
    },
  },
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

vi.mock('@/lib/env', () => ({
  config: {
    isDev: false,
    app: {
      url: 'http://localhost:3000',
    },
  },
}));

import { prisma } from '@/lib/db/prisma';
import { emailService } from '@/lib/email/email-service';
import { logActivity } from '@/lib/activity-logger';
import { POST } from '@/app/api/auth/resend-verification/route';

function createMockRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default site settings
    vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue({
      id: 'default',
      websiteUrl: 'http://localhost:3000',
    } as never);
  });

  describe('input validation', () => {
    it('should reject invalid email format', async () => {
      const request = createMockRequest({ email: 'not-an-email' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('valid email');
    });

    it('should reject empty email', async () => {
      const request = createMockRequest({ email: '' });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject missing email', async () => {
      const request = createMockRequest({});

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('email enumeration prevention', () => {
    it('should return success even when user does not exist', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = createMockRequest({ email: 'nonexistent@example.com' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('If an account exists');
      
      // Should NOT send email
      expect(emailService.sendTemplatedEmail).not.toHaveBeenCalled();
    });

    it('should return success even when user is already verified', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'verified@example.com',
        emailVerified: new Date(), // Already verified
        role: 'SPEAKER',
      } as never);

      const request = createMockRequest({ email: 'verified@example.com' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('If an account exists');
      
      // Should NOT send email to already verified users
      expect(emailService.sendTemplatedEmail).not.toHaveBeenCalled();
    });
  });

  describe('successful resend', () => {
    const mockUnverifiedUser = {
      id: 'user-1',
      email: 'unverified@example.com',
      name: 'Test User',
      emailVerified: null,
      role: 'SPEAKER',
    };

    beforeEach(() => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUnverifiedUser as never);
      vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 1 } as never);
      vi.mocked(prisma.verificationToken.create).mockResolvedValue({
        identifier: 'unverified@example.com',
        token: 'new-token',
        expires: new Date(Date.now() + 86400000),
      } as never);
    });

    it('should delete old tokens and create new one', async () => {
      const request = createMockRequest({ email: 'unverified@example.com' });

      await POST(request);

      // Should delete old tokens
      expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: 'unverified@example.com' },
      });

      // Should create new token
      expect(prisma.verificationToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          identifier: 'unverified@example.com',
          token: expect.any(String),
          expires: expect.any(Date),
        }),
      });
    });

    it('should send verification email', async () => {
      const request = createMockRequest({ email: 'unverified@example.com' });

      await POST(request);

      expect(emailService.sendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'unverified@example.com',
          templateType: 'email_verification',
          variables: expect.objectContaining({
            userName: 'Test User',
            verifyUrl: expect.stringContaining('verify-email?token='),
            expiresIn: '24 hours',
          }),
        })
      );
    });

    it('should use email prefix as username when name is null', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUnverifiedUser,
        name: null,
      } as never);

      const request = createMockRequest({ email: 'unverified@example.com' });

      await POST(request);

      expect(emailService.sendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            userName: 'unverified', // Email prefix
          }),
        })
      );
    });

    it('should log activity for resend', async () => {
      const request = createMockRequest({ email: 'unverified@example.com' });

      await POST(request);

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'USER_VERIFICATION_RESENT',
          entityType: 'User',
          entityId: 'user-1',
          metadata: expect.objectContaining({
            email: 'unverified@example.com',
          }),
        })
      );
    });

    it('should return success message', async () => {
      const request = createMockRequest({ email: 'unverified@example.com' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('If an account exists');
    });
  });

  describe('token expiry', () => {
    it('should create token with 24 hour expiry', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: null,
        role: 'SPEAKER',
      } as never);

      let capturedExpiry: Date | undefined;
      vi.mocked(prisma.verificationToken.create).mockImplementation(async (args) => {
        capturedExpiry = (args as { data: { expires: Date } }).data.expires;
        return {
          identifier: 'test@example.com',
          token: 'new-token',
          expires: capturedExpiry,
        } as never;
      });

      const request = createMockRequest({ email: 'test@example.com' });

      await POST(request);

      expect(capturedExpiry).toBeDefined();
      
      // Check expiry is approximately 24 hours from now
      const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;
      const diff = Math.abs(capturedExpiry!.getTime() - expectedExpiry);
      expect(diff).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('error handling', () => {
    it('should return 500 on database error', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({ email: 'test@example.com' });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('error occurred');
    });
  });
});
