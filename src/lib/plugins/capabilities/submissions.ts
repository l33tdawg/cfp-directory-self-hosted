/**
 * Submission Capability Implementation
 * @version 1.1.0
 *
 * Permission-gated access to submission data and operations.
 */

import type { PrismaClient, Submission, SubmissionStatus } from '@prisma/client';
import type { SubmissionCapability, SubmissionFilters, PluginPermission } from '../types';
import { PluginPermissionError } from '../types';

export class SubmissionCapabilityImpl implements SubmissionCapability {
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

  async get(id: string): Promise<Submission | null> {
    this.requirePermission('submissions:read');
    
    return this.prisma.submission.findUnique({
      where: { id },
    });
  }

  async list(filters?: SubmissionFilters): Promise<Submission[]> {
    this.requirePermission('submissions:read');
    
    return this.prisma.submission.findMany({
      where: {
        ...(filters?.eventId && { eventId: filters.eventId }),
        ...(filters?.speakerId && { speakerId: filters.speakerId }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.trackId && { trackId: filters.trackId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: SubmissionStatus): Promise<Submission> {
    this.requirePermission('submissions:manage');
    
    return this.prisma.submission.update({
      where: { id },
      data: {
        status,
        statusUpdatedAt: new Date(),
      },
    });
  }
}
