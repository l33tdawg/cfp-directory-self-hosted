/**
 * User Capability Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { User, UserRole } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

import { UserCapabilityImpl } from '@/lib/plugins/capabilities/users';
import { PluginPermissionError } from '@/lib/plugins/types';

describe('UserCapability', () => {
  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    emailVerified: new Date(),
    passwordHash: 'hashed-password',
    name: 'Test User',
    image: null,
    role: 'USER',
    sessionVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSafeUser = {
    id: 'user-1',
    email: 'test@example.com',
    emailVerified: mockUser.emailVerified,
    name: 'Test User',
    image: null,
    role: 'USER',
    sessionVersion: 0,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should get user with read permission (excluding passwordHash)', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set(['users:read']),
        'test-plugin'
      );
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const result = await capability.get('user-1');
      
      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.id).toBe('user-1');
      expect(result?.email).toBe('test@example.com');
    });

    it('should throw without read permission', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set([]),
        'test-plugin'
      );
      
      await expect(capability.get('user-1')).rejects.toThrow(PluginPermissionError);
    });

    it('should return null for non-existent user', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set(['users:read']),
        'test-plugin'
      );
      
      mockPrisma.user.findUnique.mockResolvedValue(null);
      
      const result = await capability.get('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list users with read permission', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set(['users:read']),
        'test-plugin'
      );
      
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      
      const result = await capability.list();
      
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('passwordHash');
    });

    it('should filter by role', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set(['users:read']),
        'test-plugin'
      );
      
      mockPrisma.user.findMany.mockResolvedValue([]);
      
      await capability.list({ role: 'ADMIN' });
      
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by email', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set(['users:read']),
        'test-plugin'
      );
      
      mockPrisma.user.findMany.mockResolvedValue([]);
      
      await capability.list({ email: 'test@' });
      
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { email: { contains: 'test@', mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw without read permission', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set([]),
        'test-plugin'
      );
      
      await expect(capability.list()).rejects.toThrow(PluginPermissionError);
    });
  });

  describe('getByEmail', () => {
    it('should get user by email with read permission', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set(['users:read']),
        'test-plugin'
      );
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      
      const result = await capability.getByEmail('test@example.com');
      
      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.email).toBe('test@example.com');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should throw without read permission', async () => {
      const capability = new UserCapabilityImpl(
        mockPrisma as any,
        new Set([]),
        'test-plugin'
      );
      
      await expect(capability.getByEmail('test@example.com')).rejects.toThrow(
        PluginPermissionError
      );
    });
  });
});
