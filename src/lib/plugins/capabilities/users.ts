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
import type { UserCapability, UserFilters, PluginPermission } from '../types';
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
}
