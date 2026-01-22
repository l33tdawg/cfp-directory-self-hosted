/**
 * Admin Resend Verification API Unit Tests
 * 
 * Tests for the admin-only resend verification email endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

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

vi.mock('@/lib/email/email-service', () => ({
  emailService: {
    sendTemplatedEmail: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/lib/activity-logger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/rate-limit', () => ({
  getClientIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/security/encryption', () => ({
  decryptPiiFields: vi.fn((data) => data),
  USER_PII_FIELDS: ['name'],
}));

vi.mock('@/lib/env', () => ({
  config: {
    app: {
      url: 'http://localhost:3000',
    },
  },
}));

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { emailService } from '@/lib/email/email-service';
import { logActivity } from '@/lib/activity-logger';
import { POST } from '@/app/api/admin/users/resend-verification/route';

function createMockRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe('POST /api/admin/users/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default site settings
    vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue({
      id: 'default',
      websiteUrl: 'http://localhost:3000',
    } as never);
  });

  describe('authentication', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest({
        userId: 'user-1',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 for non-admin users', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com' },
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        role: 'SPEAKER', // Not admin
      } as never);

      const request = createMockRequest({
        userId: 'target-user',
        email: 'target@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Admin access required');
    });

    it('should return 403 for organizer users', async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'user-1', email: 'organizer@example.com' },
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        role: 'ORGANIZER',
      } as never);

      const request = createMockRequest({
        userId: 'target-user',
        email: 'target@example.com',
      });

      const response = await POST(request);

      expect(response.status).toBe(403);
    });
  });

  describe('input validation', () => {
    beforeEach(() => {
      // Mock admin authentication
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'admin-1',
        role: 'ADMIN',
      } as never);
    });

    it('should reject missing userId', async () => {
      const request = createMockRequest({
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });

    it('should reject missing email', async () => {
      const request = createMockRequest({
        userId: 'user-1',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const request = createMockRequest({
        userId: 'user-1',
        email: 'not-an-email',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('target user validation', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      } as never);

      // First call for current user (admin check)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'admin-1',
        role: 'ADMIN',
      } as never);
    });

    it('should return 404 when target user not found', async () => {
      // Second call for target user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);

      const request = createMockRequest({
        userId: 'nonexistent',
        email: 'nonexistent@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should return 400 when user already verified', async () => {
      // Second call for target user
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        email: 'verified@example.com',
        emailVerified: new Date(), // Already verified
      } as never);

      const request = createMockRequest({
        userId: 'user-1',
        email: 'verified@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already verified');
    });
  });

  describe('successful admin resend', () => {
    const mockAdmin = {
      id: 'admin-1',
      role: 'ADMIN',
    };

    const mockTargetUser = {
      id: 'user-1',
      email: 'unverified@example.com',
      name: 'Unverified User',
      emailVerified: null,
    };

    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      } as never);

      // First call: admin check, Second call: target user
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockAdmin as never)
        .mockResolvedValueOnce(mockTargetUser as never);

      vi.mocked(prisma.verificationToken.deleteMany).mockResolvedValue({ count: 0 } as never);
      vi.mocked(prisma.verificationToken.create).mockResolvedValue({
        identifier: 'unverified@example.com',
        token: 'new-token',
        expires: new Date(Date.now() + 86400000),
      } as never);
    });

    it('should send verification email', async () => {
      const request = createMockRequest({
        userId: 'user-1',
        email: 'unverified@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('sent successfully');

      expect(emailService.sendTemplatedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'unverified@example.com',
          templateType: 'email_verification',
        })
      );
    });

    it('should delete old tokens before creating new one', async () => {
      const request = createMockRequest({
        userId: 'user-1',
        email: 'unverified@example.com',
      });

      await POST(request);

      expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: 'unverified@example.com' },
      });

      expect(prisma.verificationToken.create).toHaveBeenCalled();
    });

    it('should log activity with sentByAdmin flag', async () => {
      const request = createMockRequest({
        userId: 'user-1',
        email: 'unverified@example.com',
      });

      await POST(request);

      expect(logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1', // Admin who performed the action
          action: 'USER_VERIFICATION_RESENT',
          entityType: 'User',
          entityId: 'user-1', // Target user
          metadata: expect.objectContaining({
            targetEmail: 'unverified@example.com',
            sentByAdmin: true,
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      } as never);

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'admin-1',
        role: 'ADMIN',
      } as never);
    });

    it('should return 500 on database error', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValueOnce(
        new Error('Database error')
      );

      const request = createMockRequest({
        userId: 'user-1',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed');
    });
  });
});
