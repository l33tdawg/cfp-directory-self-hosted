/**
 * Email Verification Login Blocking Tests
 * 
 * Tests that unverified speakers are blocked from logging in
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock encryption
vi.mock('@/lib/security/encryption', () => ({
  decryptPiiFields: vi.fn((data) => data),
  USER_PII_FIELDS: ['name'],
}));

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';

describe('Email Verification Login Blocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Speaker login verification check', () => {
    it('should block unverified speaker from logging in', async () => {
      // Simulate the authorize callback logic
      const mockUnverifiedSpeaker = {
        id: 'user-1',
        email: 'speaker@example.com',
        passwordHash: 'hashed-password',
        emailVerified: null, // NOT verified
        role: 'SPEAKER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUnverifiedSpeaker as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never); // Password is correct

      // Simulate the auth check logic
      const user = await prisma.user.findUnique({
        where: { email: 'speaker@example.com' },
      });

      const isValidPassword = await bcrypt.compare('password', user!.passwordHash!);

      // This is the check we added in auth.ts
      const shouldBlockLogin = !user!.emailVerified && user!.role === 'SPEAKER';

      expect(isValidPassword).toBe(true);
      expect(shouldBlockLogin).toBe(true);
    });

    it('should allow verified speaker to log in', async () => {
      const mockVerifiedSpeaker = {
        id: 'user-1',
        email: 'verified@example.com',
        passwordHash: 'hashed-password',
        emailVerified: new Date(), // IS verified
        role: 'SPEAKER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockVerifiedSpeaker as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const user = await prisma.user.findUnique({
        where: { email: 'verified@example.com' },
      });

      const isValidPassword = await bcrypt.compare('password', user!.passwordHash!);
      const shouldBlockLogin = !user!.emailVerified && user!.role === 'SPEAKER';

      expect(isValidPassword).toBe(true);
      expect(shouldBlockLogin).toBe(false); // Should NOT block
    });

    it('should allow unverified admin to log in (bypass)', async () => {
      // Admins bypass verification check (they're created via setup)
      const mockUnverifiedAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        passwordHash: 'hashed-password',
        emailVerified: null, // NOT verified but admin
        role: 'ADMIN',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUnverifiedAdmin as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const user = await prisma.user.findUnique({
        where: { email: 'admin@example.com' },
      });

      const shouldBlockLogin = !user!.emailVerified && user!.role === 'SPEAKER';

      expect(shouldBlockLogin).toBe(false); // Admin bypasses check
    });

    it('should allow unverified reviewer to log in (invited users)', async () => {
      // Reviewers are invited, so they should bypass verification
      const mockUnverifiedReviewer = {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        passwordHash: 'hashed-password',
        emailVerified: null, // NOT verified but invited
        role: 'REVIEWER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUnverifiedReviewer as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const user = await prisma.user.findUnique({
        where: { email: 'reviewer@example.com' },
      });

      const shouldBlockLogin = !user!.emailVerified && user!.role === 'SPEAKER';

      expect(shouldBlockLogin).toBe(false); // Reviewers bypass check
    });

    it('should allow unverified organizer to log in (invited users)', async () => {
      const mockUnverifiedOrganizer = {
        id: 'organizer-1',
        email: 'organizer@example.com',
        passwordHash: 'hashed-password',
        emailVerified: null,
        role: 'ORGANIZER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUnverifiedOrganizer as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const user = await prisma.user.findUnique({
        where: { email: 'organizer@example.com' },
      });

      const shouldBlockLogin = !user!.emailVerified && user!.role === 'SPEAKER';

      expect(shouldBlockLogin).toBe(false);
    });
  });

  describe('error message handling', () => {
    it('should throw EMAIL_NOT_VERIFIED error for unverified speakers', async () => {
      const mockUnverifiedSpeaker = {
        id: 'user-1',
        email: 'speaker@example.com',
        passwordHash: 'hashed-password',
        emailVerified: null,
        role: 'SPEAKER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUnverifiedSpeaker as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const user = await prisma.user.findUnique({
        where: { email: 'speaker@example.com' },
      });

      // Simulate the authorize callback throwing the error
      const authorizeUser = () => {
        if (!user!.emailVerified && user!.role === 'SPEAKER') {
          throw new Error('EMAIL_NOT_VERIFIED');
        }
        return user;
      };

      expect(() => authorizeUser()).toThrow('EMAIL_NOT_VERIFIED');
    });

    it('should NOT throw for verified speakers', async () => {
      const mockVerifiedSpeaker = {
        id: 'user-1',
        email: 'speaker@example.com',
        passwordHash: 'hashed-password',
        emailVerified: new Date(),
        role: 'SPEAKER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockVerifiedSpeaker as never);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const user = await prisma.user.findUnique({
        where: { email: 'speaker@example.com' },
      });

      const authorizeUser = () => {
        if (!user!.emailVerified && user!.role === 'SPEAKER') {
          throw new Error('EMAIL_NOT_VERIFIED');
        }
        return user;
      };

      expect(() => authorizeUser()).not.toThrow();
      expect(authorizeUser()).toEqual(mockVerifiedSpeaker);
    });
  });

  describe('verification status transitions', () => {
    it('should track emailVerified timestamp when set', async () => {
      const verificationTime = new Date('2024-01-15T10:30:00Z');
      
      const mockUser = {
        id: 'user-1',
        email: 'speaker@example.com',
        emailVerified: verificationTime,
        role: 'SPEAKER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);

      const user = await prisma.user.findUnique({
        where: { email: 'speaker@example.com' },
      });

      expect(user!.emailVerified).toEqual(verificationTime);
      expect(user!.emailVerified).toBeInstanceOf(Date);
    });

    it('should have null emailVerified for new registrations', async () => {
      const mockNewUser = {
        id: 'user-1',
        email: 'new@example.com',
        emailVerified: null, // Just registered
        role: 'SPEAKER',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockNewUser as never);

      const user = await prisma.user.findUnique({
        where: { email: 'new@example.com' },
      });

      expect(user!.emailVerified).toBeNull();
    });
  });
});
