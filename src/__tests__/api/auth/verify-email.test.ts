/**
 * Email Verification API Unit Tests
 * 
 * Tests for the email verification endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    verificationToken: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimitMiddleware: vi.fn().mockReturnValue(null),
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/activity-logger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/lib/db/prisma';
import { logActivity } from '@/lib/activity-logger';
import { GET } from '@/app/api/auth/verify-email/route';

function createMockRequest(token?: string): NextRequest {
  const url = token 
    ? `http://localhost:3000/api/auth/verify-email?token=${token}`
    : 'http://localhost:3000/api/auth/verify-email';
  
  return {
    url,
    nextUrl: new URL(url),
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe('GET /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('token validation', () => {
    it('should redirect to error page when token is missing', async () => {
      const request = createMockRequest();

      const response = await GET(request);

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('location')).toContain('/auth/error?error=MissingToken');
    });

    it('should redirect to error page when token is invalid', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue(null);

      const request = createMockRequest('invalid-token');

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error?error=InvalidToken');
    });

    it('should redirect to error page when token is expired', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: 'test@example.com',
        token: 'expired-token',
        expires: new Date(Date.now() - 1000), // Expired 1 second ago
      } as never);

      const request = createMockRequest('expired-token');

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error?error=TokenExpired');

      // Should delete the expired token
      expect(prisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: 'expired-token' },
      });
    });

    it('should redirect to error page when user not found', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: 'deleted@example.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 86400000), // Tomorrow
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = createMockRequest('valid-token');

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error?error=UserNotFound');

      // Should clean up orphaned token
      expect(prisma.verificationToken.delete).toHaveBeenCalled();
    });
  });

  describe('successful verification', () => {
    it('should verify email and redirect to signin', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: 'test@example.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 86400000), // Tomorrow
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: null,
        role: 'SPEAKER',
      } as never);

      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const request = createMockRequest('valid-token');

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/signin?verified=true');
    });

    it('should update user emailVerified timestamp', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: 'test@example.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 86400000),
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: null,
        role: 'SPEAKER',
      } as never);

      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const request = createMockRequest('valid-token');

      await GET(request);

      // Verify transaction was called (it receives an array of Prisma operations)
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should log verification activity', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: 'test@example.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 86400000),
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: null,
        role: 'SPEAKER',
      } as never);

      vi.mocked(prisma.$transaction).mockResolvedValue(undefined);

      const request = createMockRequest('valid-token');

      await GET(request);

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          action: 'USER_EMAIL_VERIFIED',
          entityType: 'User',
          entityId: 'user-1',
          metadata: expect.objectContaining({
            email: 'test@example.com',
          }),
        })
      );
    });
  });

  describe('already verified users', () => {
    it('should redirect with already verified message if user already verified', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockResolvedValue({
        identifier: 'test@example.com',
        token: 'valid-token',
        expires: new Date(Date.now() + 86400000),
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        emailVerified: new Date(), // Already verified
        role: 'SPEAKER',
      } as never);

      const request = createMockRequest('valid-token');

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/signin?verified=already');

      // Should still clean up the token
      expect(prisma.verificationToken.delete).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should redirect to error page on unexpected errors', async () => {
      vi.mocked(prisma.verificationToken.findUnique).mockRejectedValue(
        new Error('Database error')
      );

      const request = createMockRequest('valid-token');

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/auth/error?error=VerificationFailed');
    });
  });
});
