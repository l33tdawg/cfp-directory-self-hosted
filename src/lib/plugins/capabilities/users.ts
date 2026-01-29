/**
 * User Capability Implementation
 * @version 1.5.1
 *
 * Permission-gated access to user data.
 * 
 * Security:
 * - passwordHash is always excluded from returned data
 * - PII fields (name) are decrypted before returning to plugins
 * - Decryption only occurs for plugins with 'users:read' permission
 */

import type { PrismaClient, User } from '@prisma/client';
import type { UserCapability, UserFilters, ServiceAccountData, PluginPermission } from '../types';
import { PluginPermissionError } from '../types';
import { decryptUserPii, type DecryptedUser } from './pii';

export class UserCapabilityImpl implements UserCapability {
  constructor(
    private prisma: PrismaClient,
    private permissions: Set<PluginPermission>,
    private pluginName: string
  ) {}

  private requirePermission(permission: PluginPermission): void {
    if (!this.permissions.has(permission)) {
      throw new PluginPermissionError(permission);
    }
  }

  /**
   * Sanitize and decrypt user data.
   * Removes passwordHash and decrypts PII fields.
   */
  private sanitizeAndDecryptUser(user: User): DecryptedUser {
    return decryptUserPii(user);
  }

  async get(id: string): Promise<DecryptedUser | null> {
    this.requirePermission('users:read');
    
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    
    return user ? this.sanitizeAndDecryptUser(user) : null;
  }

  async list(filters?: UserFilters): Promise<DecryptedUser[]> {
    this.requirePermission('users:read');
    
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters?.role && { role: filters.role }),
        ...(filters?.email && { email: { contains: filters.email, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return users.map(u => this.sanitizeAndDecryptUser(u));
  }

  async getByEmail(email: string): Promise<DecryptedUser | null> {
    this.requirePermission('users:read');

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.sanitizeAndDecryptUser(user) : null;
  }

  async createServiceAccount(data: ServiceAccountData): Promise<DecryptedUser> {
    this.requirePermission('users:manage');

    // Generate a unique email for the service account based on plugin name
    const email = `${this.pluginName}@plugin.system`;

    // Check if service account already exists
    const existing = await this.prisma.user.findUnique({
      where: { email },
      include: { reviewerProfile: true },
    });

    if (existing) {
      // Ensure reviewer profile exists and is hidden
      if (!existing.reviewerProfile) {
        await this.prisma.reviewerProfile.create({
          data: {
            userId: existing.id,
            fullName: data.name,
            showOnTeamPage: false, // Hidden from public reviewers page by default
            onboardingCompleted: true,
          },
        });
      }
      return this.sanitizeAndDecryptUser(existing);
    }

    // Create new service account with REVIEWER role (non-privileged)
    // No passwordHash means it cannot log in via credentials
    const user = await this.prisma.user.create({
      data: {
        email,
        name: data.name,
        image: data.image,
        role: 'REVIEWER',
        emailVerified: null, // Not verified - extra safety against login attempts
        // Create reviewer profile - hidden from public by default
        reviewerProfile: {
          create: {
            fullName: data.name,
            showOnTeamPage: false, // Hidden from public reviewers page
            onboardingCompleted: true,
            bio: 'AI-powered submission reviewer',
          },
        },
      },
    });

    return this.sanitizeAndDecryptUser(user);
  }
}
