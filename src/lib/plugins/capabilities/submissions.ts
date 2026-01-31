/**
 * Submission Capability Implementation
 * @version 1.13.0
 *
 * Permission-gated access to submission data and operations.
 *
 * PRIVACY NOTE: getWithSpeakers() intentionally excludes email addresses
 * to prevent PII from being sent to external AI services.
 */

import type { PrismaClient, Submission, SubmissionStatus } from '@prisma/client';
import type { SubmissionCapability, SubmissionFilters, PluginPermission, SubmissionWithSpeakers } from '../types';
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

  async getWithSpeakers(id: string): Promise<SubmissionWithSpeakers | null> {
    this.requirePermission('submissions:read');

    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        speaker: {
          select: {
            id: true,
            name: true,
            // NOTE: email intentionally excluded for privacy
            speakerProfile: {
              select: {
                fullName: true,
                bio: true,
                speakingExperience: true,
                experienceLevel: true,
                company: true,
                position: true,
                expertiseTags: true,
                // Social handles (public info, safe to share with AI)
                linkedinUrl: true,
                twitterHandle: true,
                githubUsername: true,
                websiteUrl: true,
              },
            },
          },
        },
        coSpeakers: {
          select: {
            id: true,
            name: true,
            bio: true,
            // NOTE: email intentionally excluded for privacy
          },
        },
      },
    });

    if (!submission) {
      return null;
    }

    // Transform to match the expected interface
    return {
      ...submission,
      speaker: {
        id: submission.speaker.id,
        name: submission.speaker.name,
        profile: submission.speaker.speakerProfile,
      },
      coSpeakers: submission.coSpeakers,
    } as SubmissionWithSpeakers;
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
