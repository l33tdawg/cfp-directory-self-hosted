/**
 * Event Capability Implementation
 * @version 1.1.0
 *
 * Permission-gated access to event data.
 */

import type { PrismaClient, Event } from '@prisma/client';
import type { EventCapability, EventFilters, PluginPermission } from '../types';
import { PluginPermissionError } from '../types';

export class EventCapabilityImpl implements EventCapability {
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

  async get(id: string): Promise<Event | null> {
    this.requirePermission('events:read');
    
    return this.prisma.event.findUnique({
      where: { id },
    });
  }

  async getBySlug(slug: string): Promise<Event | null> {
    this.requirePermission('events:read');
    
    return this.prisma.event.findUnique({
      where: { slug },
    });
  }

  async list(filters?: EventFilters): Promise<Event[]> {
    this.requirePermission('events:read');
    
    const now = new Date();
    
    return this.prisma.event.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.cfpOpen !== undefined && filters.cfpOpen && {
          cfpOpensAt: { lte: now },
          cfpClosesAt: { gte: now },
        }),
        ...(filters?.cfpOpen !== undefined && !filters.cfpOpen && {
          OR: [
            { cfpOpensAt: { gt: now } },
            { cfpClosesAt: { lt: now } },
            { cfpOpensAt: null },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
