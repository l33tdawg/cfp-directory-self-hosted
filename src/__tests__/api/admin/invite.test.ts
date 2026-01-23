/**
 * Admin User Invite API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Type for mock user
interface MockUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  image?: string | null;
}

// Type for mock invitation
interface MockInvitation {
  id: string;
  email: string;
  role?: string;
  token?: string;
  expiresAt: Date;
  createdAt?: Date;
  inviter?: { name: string; email: string };
}

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  getSession: vi.fn(),
}));

// Mock activity logger
vi.mock('@/lib/activity-logger', () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Mock email service
vi.mock('@/lib/email/email-service', () => ({
  emailService: {
    sendTemplatedEmail: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    userInvitation: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

describe('Admin User Invite API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/admin/users/invite', () => {
    it('should return 403 for non-admin users', async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: 'user1',
          email: 'user@test.com',
          role: 'USER',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const { POST } = await import('@/app/api/admin/users/invite/route');
      const request = new Request('http://localhost/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@test.com', role: 'USER' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('Forbidden');
    });

    it('should reject invalid email', async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: 'admin1',
          email: 'admin@test.com',
          role: 'ADMIN',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const { POST } = await import('@/app/api/admin/users/invite/route');
      const request = new Request('http://localhost/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email', role: 'USER' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid data');
    });

    it('should reject existing user', async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: 'admin1',
          email: 'admin@test.com',
          role: 'ADMIN',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'existing',
        email: 'existing@test.com',
      } as MockUser);

      const { POST } = await import('@/app/api/admin/users/invite/route');
      const request = new Request('http://localhost/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'existing@test.com', role: 'USER' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already exists');
    });

    it('should reject if active invitation exists', async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: 'admin1',
          email: 'admin@test.com',
          role: 'ADMIN',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.userInvitation.findFirst).mockResolvedValue({
        id: 'inv1',
        email: 'new@test.com',
        expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      } as MockInvitation);

      const { POST } = await import('@/app/api/admin/users/invite/route');
      const request = new Request('http://localhost/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@test.com', role: 'USER' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('active invitation');
    });

    it('should create invitation successfully', async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: 'admin1',
          email: 'admin@test.com',
          role: 'ADMIN',
          name: 'Admin User',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.userInvitation.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.userInvitation.create).mockResolvedValue({
        id: 'inv1',
        email: 'new@test.com',
        role: 'REVIEWER',
        token: 'test-token',
        expiresAt: new Date(Date.now() + 604800000), // 7 days
        createdAt: new Date(),
      } as MockInvitation);

      const { POST } = await import('@/app/api/admin/users/invite/route');
      const request = new Request('http://localhost/api/admin/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: 'new@test.com', role: 'REVIEWER' }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.invitation.email).toBe('new@test.com');
      expect(data.invitation.role).toBe('REVIEWER');
    });
  });

  describe('GET /api/admin/users/invite', () => {
    it('should return pending invitations', async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: {
          id: 'admin1',
          email: 'admin@test.com',
          role: 'ADMIN',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      vi.mocked(prisma.userInvitation.findMany).mockResolvedValue([
        {
          id: 'inv1',
          email: 'pending@test.com',
          role: 'USER',
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          inviter: { name: 'Admin', email: 'admin@test.com' },
        },
      ] as MockInvitation[]);

      const { GET } = await import('@/app/api/admin/users/invite/route');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.invitations).toHaveLength(1);
      expect(data.invitations[0].email).toBe('pending@test.com');
    });
  });
});
