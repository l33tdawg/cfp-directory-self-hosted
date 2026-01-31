/**
 * Review Capability Implementation
 * @version 1.1.0
 *
 * Permission-gated access to review data and operations.
 */

import type { PrismaClient, Review } from '@prisma/client';
import type { ReviewCapability, ReviewFilters, ReviewCreateData, PluginPermission } from '../types';
import { PluginPermissionError } from '../types';

export class ReviewCapabilityImpl implements ReviewCapability {
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

  async get(id: string): Promise<Review | null> {
    this.requirePermission('reviews:read');
    
    return this.prisma.review.findUnique({
      where: { id },
    });
  }

  async list(filters?: ReviewFilters): Promise<Review[]> {
    this.requirePermission('reviews:read');
    
    return this.prisma.review.findMany({
      where: {
        ...(filters?.submissionId && { submissionId: filters.submissionId }),
        ...(filters?.reviewerId && { reviewerId: filters.reviewerId }),
        ...(filters?.recommendation && { recommendation: filters.recommendation }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBySubmission(submissionId: string): Promise<Review[]> {
    this.requirePermission('reviews:read');
    
    return this.prisma.review.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: ReviewCreateData): Promise<Review> {
    this.requirePermission('reviews:write');
    
    return this.prisma.review.create({
      data: {
        submissionId: data.submissionId,
        reviewerId: data.reviewerId,
        contentScore: data.contentScore,
        presentationScore: data.presentationScore,
        relevanceScore: data.relevanceScore,
        overallScore: data.overallScore,
        privateNotes: data.privateNotes,
        publicNotes: data.publicNotes,
        recommendation: data.recommendation,
      },
    });
  }

  async update(id: string, data: Partial<ReviewCreateData>): Promise<Review> {
    this.requirePermission('reviews:write');

    return this.prisma.review.update({
      where: { id },
      data: {
        ...(data.contentScore !== undefined && { contentScore: data.contentScore }),
        ...(data.presentationScore !== undefined && { presentationScore: data.presentationScore }),
        ...(data.relevanceScore !== undefined && { relevanceScore: data.relevanceScore }),
        ...(data.overallScore !== undefined && { overallScore: data.overallScore }),
        ...(data.privateNotes !== undefined && { privateNotes: data.privateNotes }),
        ...(data.publicNotes !== undefined && { publicNotes: data.publicNotes }),
        ...(data.recommendation !== undefined && { recommendation: data.recommendation }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    this.requirePermission('reviews:write');

    await this.prisma.review.delete({
      where: { id },
    });
  }
}
