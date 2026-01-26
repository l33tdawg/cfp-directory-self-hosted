/**
 * User Capability Implementation
 * @version 1.1.0
 *
 * Permission-gated access to user data.
 * Note: passwordHash is always excluded from returned data.
 */

import type { PrismaClient, User, UserRole } from '@prisma/client';
import type { UserCapability, UserFilters, PluginPermission } from '../types';
import { PluginPermissionError } from '../types';

type SafeUser = Omit<User, 'passwordHash'>;

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

  private sanitizeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async get(id: string): Promise<SafeUser | null> {
    this.requirePermission('users:read');
    
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    
    return user ? this.sanitizeUser(user) : null;
  }

  async list(filters?: UserFilters): Promise<SafeUser[]> {
    this.requirePermission('users:read');
    
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters?.role && { role: filters.role }),
        ...(filters?.email && { email: { contains: filters.email, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return users.map(u => this.sanitizeUser(u));
  }

  async getByEmail(email: string): Promise<SafeUser | null> {
    this.requirePermission('users:read');
    
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    return user ? this.sanitizeUser(user) : null;
  }
}
