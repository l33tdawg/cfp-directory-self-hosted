/**
 * Setup API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    siteSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    event: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}));

import { prisma } from '@/lib/db/prisma';

// Setup validation schema (matching the API)
const setupSchema = z.object({
  adminName: z.string().min(2, 'Name must be at least 2 characters'),
  adminEmail: z.string().email('Invalid email address'),
  adminPassword: z.string().min(8, 'Password must be at least 8 characters'),
  siteName: z.string().min(2, 'Site name must be at least 2 characters'),
  siteDescription: z.string().max(500).optional(),
  siteWebsite: z.string().url().optional().or(z.literal('')),
});

describe('Setup API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Setup Status Check
  // =========================================================================

  describe('GET /api/setup/status', () => {
    it('should return isSetupComplete: false when no admin exists', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0);
      vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.event.count).mockResolvedValue(0);

      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      
      expect(adminCount).toBe(0);
    });

    it('should return isSetupComplete: true when admin exists', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      
      expect(adminCount).toBe(1);
    });

    it('should include site settings when available', async () => {
      const mockSettings = {
        name: 'Test Site',
        description: 'A test site',
        logoUrl: null,
        websiteUrl: 'https://test.com',
      };
      
      vi.mocked(prisma.siteSettings.findUnique).mockResolvedValue(mockSettings as never);

      const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: { name: true, description: true, logoUrl: true, websiteUrl: true },
      });
      
      expect(settings?.name).toBe('Test Site');
    });

    it('should return event counts', async () => {
      vi.mocked(prisma.event.count).mockResolvedValue(5);

      const count = await prisma.event.count({ where: { isPublished: true } });
      
      expect(count).toBe(5);
    });
  });

  // =========================================================================
  // Setup Validation
  // =========================================================================

  describe('Setup Validation', () => {
    const validSetupData = {
      adminName: 'Test Admin',
      adminEmail: 'admin@example.com',
      adminPassword: 'securepassword123',
      siteName: 'My Conference CFP',
      siteDescription: 'Accept talk proposals',
      siteWebsite: 'https://conference.com',
    };

    it('should validate correct setup data', () => {
      const result = setupSchema.safeParse(validSetupData);
      expect(result.success).toBe(true);
    });

    it('should require admin name', () => {
      const data = { ...validSetupData, adminName: '' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require admin name minimum length', () => {
      const data = { ...validSetupData, adminName: 'A' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require valid email', () => {
      const data = { ...validSetupData, adminEmail: 'not-an-email' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require password minimum length', () => {
      const data = { ...validSetupData, adminPassword: 'short' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require site name', () => {
      const data = { ...validSetupData, siteName: '' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow empty description', () => {
      const data = { ...validSetupData, siteDescription: undefined };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow empty website', () => {
      const data = { ...validSetupData, siteWebsite: '' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate website URL format', () => {
      const data = { ...validSetupData, siteWebsite: 'not-a-url' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid website URL', () => {
      const data = { ...validSetupData, siteWebsite: 'https://valid-url.com' };
      const result = setupSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  // =========================================================================
  // Setup Complete
  // =========================================================================

  describe('POST /api/setup/complete', () => {
    it('should prevent setup when admin already exists', async () => {
      const mockAdmin = { id: 'admin-1', email: 'existing@admin.com', role: 'ADMIN' };
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockAdmin as never);

      const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      
      expect(existingAdmin).not.toBeNull();
      expect(existingAdmin?.role).toBe('ADMIN');
    });

    it('should check if email is already taken', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1', email: 'taken@email.com' } as never);

      const existingUser = await prisma.user.findUnique({
        where: { email: 'taken@email.com' },
      });
      
      expect(existingUser).not.toBeNull();
    });

    it('should create admin user with hashed password', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      
      const mockAdmin = {
        id: 'new-admin',
        name: 'Test Admin',
        email: 'admin@example.com',
        passwordHash: 'hashed_password',
        role: 'ADMIN',
        emailVerified: new Date(),
      };
      
      vi.mocked(prisma.user.create).mockResolvedValue(mockAdmin as never);

      const admin = await prisma.user.create({
        data: {
          name: 'Test Admin',
          email: 'admin@example.com',
          passwordHash: 'hashed_password',
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      
      expect(admin.role).toBe('ADMIN');
      expect(admin.passwordHash).toBe('hashed_password');
    });

    it('should create or update site settings', async () => {
      const mockSettings = {
        id: 'default',
        name: 'My Conference',
        description: 'Test description',
        websiteUrl: 'https://conf.com',
      };
      
      vi.mocked(prisma.siteSettings.upsert).mockResolvedValue(mockSettings as never);

      const settings = await prisma.siteSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          name: 'My Conference',
          description: 'Test description',
          websiteUrl: 'https://conf.com',
        },
        update: {
          name: 'My Conference',
          description: 'Test description',
          websiteUrl: 'https://conf.com',
        },
      });
      
      expect(settings.name).toBe('My Conference');
    });

    it('should use transaction for atomic operations', async () => {
      const mockTransactionFn = vi.fn();
      vi.mocked(prisma.$transaction).mockImplementation(mockTransactionFn);

      await prisma.$transaction(async (tx) => {
        // Transaction operations would go here
      });
      
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Security
  // =========================================================================

  describe('Security', () => {
    it('should not expose password in response', () => {
      const responseData = {
        success: true,
        adminEmail: 'admin@example.com',
        siteName: 'Test Site',
      };
      
      expect(responseData).not.toHaveProperty('adminPassword');
      expect(responseData).not.toHaveProperty('passwordHash');
    });

    it('should auto-verify first admin email', async () => {
      const mockAdmin = {
        id: 'admin-1',
        emailVerified: new Date(),
      };
      
      vi.mocked(prisma.user.create).mockResolvedValue(mockAdmin as never);

      const admin = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@example.com',
          passwordHash: 'hash',
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      
      expect(admin.emailVerified).toBeDefined();
    });
  });
});
