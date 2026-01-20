/**
 * Auth Helper Tests
 */

import { describe, it, expect, vi } from 'vitest';

// Mock the auth and prisma modules to avoid next-auth import issues
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reviewTeamMember: { findUnique: vi.fn() },
    event: { findUnique: vi.fn() },
    siteSettings: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import {
  isAdmin,
  isOrganizer,
  isReviewerRole,
  canManageEvents,
  canManageSettings,
} from '@/lib/api/auth';
import type { UserRole } from '@prisma/client';

// Mock user type
interface MockUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string | null;
  image?: string | null;
}

describe('Auth Helpers', () => {
  describe('isAdmin', () => {
    it('should return true for ADMIN role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      expect(isAdmin(user)).toBe(true);
    });

    it('should return false for ORGANIZER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'organizer@example.com',
        role: 'ORGANIZER',
      };

      expect(isAdmin(user)).toBe(false);
    });

    it('should return false for REVIEWER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'reviewer@example.com',
        role: 'REVIEWER',
      };

      expect(isAdmin(user)).toBe(false);
    });

    it('should return false for USER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      };

      expect(isAdmin(user)).toBe(false);
    });
  });

  describe('isOrganizer', () => {
    it('should return true for ADMIN role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      expect(isOrganizer(user)).toBe(true);
    });

    it('should return true for ORGANIZER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'organizer@example.com',
        role: 'ORGANIZER',
      };

      expect(isOrganizer(user)).toBe(true);
    });

    it('should return false for REVIEWER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'reviewer@example.com',
        role: 'REVIEWER',
      };

      expect(isOrganizer(user)).toBe(false);
    });

    it('should return false for USER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      };

      expect(isOrganizer(user)).toBe(false);
    });
  });

  describe('isReviewerRole', () => {
    it('should return true for ADMIN role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      expect(isReviewerRole(user)).toBe(true);
    });

    it('should return true for ORGANIZER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'organizer@example.com',
        role: 'ORGANIZER',
      };

      expect(isReviewerRole(user)).toBe(true);
    });

    it('should return true for REVIEWER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'reviewer@example.com',
        role: 'REVIEWER',
      };

      expect(isReviewerRole(user)).toBe(true);
    });

    it('should return false for USER role', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      };

      expect(isReviewerRole(user)).toBe(false);
    });
  });

  describe('canManageEvents', () => {
    it('should return true for ADMIN', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      expect(canManageEvents(user)).toBe(true);
    });

    it('should return true for ORGANIZER', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'organizer@example.com',
        role: 'ORGANIZER',
      };

      expect(canManageEvents(user)).toBe(true);
    });

    it('should return false for REVIEWER', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'reviewer@example.com',
        role: 'REVIEWER',
      };

      expect(canManageEvents(user)).toBe(false);
    });

    it('should return false for USER', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      };

      expect(canManageEvents(user)).toBe(false);
    });
  });

  describe('canManageSettings', () => {
    it('should return true for ADMIN', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      };

      expect(canManageSettings(user)).toBe(true);
    });

    it('should return false for ORGANIZER', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'organizer@example.com',
        role: 'ORGANIZER',
      };

      expect(canManageSettings(user)).toBe(false);
    });

    it('should return false for REVIEWER', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'reviewer@example.com',
        role: 'REVIEWER',
      };

      expect(canManageSettings(user)).toBe(false);
    });

    it('should return false for USER', () => {
      const user: MockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'USER',
      };

      expect(canManageSettings(user)).toBe(false);
    });
  });
});
