/**
 * AI Review Capability Implementation
 * @version 1.19.0
 *
 * Implements AI review tracking using the plugin's key-value data store.
 * This makes the capability fully portable - works identically on both
 * self-hosted and main platform without requiring dedicated database tables.
 *
 * Data is stored in the PluginData table with namespace 'ai_reviews'.
 * Each AI review is stored with key = submissionId for easy lookup.
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type { AiReviewCapability, AiReview, AiReviewUpdateData } from '../types';

const AI_REVIEWS_NAMESPACE = 'ai_reviews';

/**
 * Real implementation of AiReviewCapability using plugin data store.
 * Stores AI review records in the PluginData table for full portability.
 */
export class AiReviewCapabilityImpl implements AiReviewCapability {
  constructor(
    private prisma: PrismaClient,
    private pluginId: string
  ) {}

  /**
   * Get an AI review by submission ID
   */
  async get(submissionId: string): Promise<AiReview | null> {
    const record = await this.prisma.pluginData.findUnique({
      where: {
        pluginId_namespace_key: {
          pluginId: this.pluginId,
          namespace: AI_REVIEWS_NAMESPACE,
          key: submissionId,
        },
      },
    });

    if (!record) return null;

    const data = record.value as Record<string, unknown>;
    return this.deserializeAiReview(data);
  }

  /**
   * List all AI reviews for this plugin
   */
  async list(): Promise<AiReview[]> {
    const records = await this.prisma.pluginData.findMany({
      where: {
        pluginId: this.pluginId,
        namespace: AI_REVIEWS_NAMESPACE,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return records.map((record) => {
      const data = record.value as Record<string, unknown>;
      return this.deserializeAiReview(data);
    });
  }

  /**
   * Create a new AI review record
   */
  async create(data: { submissionId: string; eventId: string }): Promise<AiReview> {
    const now = new Date();
    const id = `air_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const aiReview: AiReview = {
      id,
      submissionId: data.submissionId,
      eventId: data.eventId,
      status: 'pending',
      error_message: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.prisma.pluginData.upsert({
      where: {
        pluginId_namespace_key: {
          pluginId: this.pluginId,
          namespace: AI_REVIEWS_NAMESPACE,
          key: data.submissionId,
        },
      },
      create: {
        pluginId: this.pluginId,
        namespace: AI_REVIEWS_NAMESPACE,
        key: data.submissionId,
        value: this.serializeAiReview(aiReview) as Prisma.InputJsonValue,
        encrypted: false,
      },
      update: {
        value: this.serializeAiReview(aiReview) as Prisma.InputJsonValue,
      },
    });

    return aiReview;
  }

  /**
   * Update an AI review by ID
   */
  async update(id: string, data: AiReviewUpdateData): Promise<AiReview> {
    // Find the record by ID (need to scan since key is submissionId)
    const records = await this.prisma.pluginData.findMany({
      where: {
        pluginId: this.pluginId,
        namespace: AI_REVIEWS_NAMESPACE,
      },
    });

    const record = records.find((r) => {
      const value = r.value as Record<string, unknown>;
      return value.id === id;
    });

    if (!record) {
      throw new Error(`AI review not found: ${id}`);
    }

    const existing = record.value as Record<string, unknown>;
    const updated: AiReview = {
      ...this.deserializeAiReview(existing),
      ...data,
      updatedAt: new Date(),
    };

    await this.prisma.pluginData.update({
      where: {
        pluginId_namespace_key: {
          pluginId: this.pluginId,
          namespace: AI_REVIEWS_NAMESPACE,
          key: record.key,
        },
      },
      data: {
        value: this.serializeAiReview(updated) as Prisma.InputJsonValue,
      },
    });

    return updated;
  }

  /**
   * Delete an AI review by ID
   */
  async delete(id: string): Promise<void> {
    // Find the record by ID (need to scan since key is submissionId)
    const records = await this.prisma.pluginData.findMany({
      where: {
        pluginId: this.pluginId,
        namespace: AI_REVIEWS_NAMESPACE,
      },
    });

    const record = records.find((r) => {
      const value = r.value as Record<string, unknown>;
      return value.id === id;
    });

    if (record) {
      await this.prisma.pluginData.delete({
        where: {
          pluginId_namespace_key: {
            pluginId: this.pluginId,
            namespace: AI_REVIEWS_NAMESPACE,
            key: record.key,
          },
        },
      });
    }
  }

  /**
   * Serialize AiReview for JSON storage
   */
  private serializeAiReview(review: AiReview): Record<string, unknown> {
    return {
      ...review,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }

  /**
   * Deserialize AiReview from JSON storage
   */
  private deserializeAiReview(data: Record<string, unknown>): AiReview {
    return {
      id: data.id as string,
      submissionId: data.submissionId as string,
      eventId: data.eventId as string,
      status: data.status as string,
      error_message: data.error_message as string | null | undefined,
      review_id: data.review_id as string | null | undefined,
      criteria_scores: data.criteria_scores as Record<string, number> | null | undefined,
      overall_score: data.overall_score as number | null | undefined,
      summary: data.summary as string | null | undefined,
      strengths: data.strengths as string[] | null | undefined,
      weaknesses: data.weaknesses as string[] | null | undefined,
      suggestions: data.suggestions as string[] | null | undefined,
      recommendation: data.recommendation as string | null | undefined,
      confidence: data.confidence as number | null | undefined,
      similar_submissions: data.similar_submissions as unknown,
      model_used: data.model_used as string | null | undefined,
      provider: data.provider as string | null | undefined,
      input_tokens: data.input_tokens as number | null | undefined,
      output_tokens: data.output_tokens as number | null | undefined,
      cost_usd: data.cost_usd as number | null | undefined,
      processing_time_ms: data.processing_time_ms as number | null | undefined,
      completed_at: data.completed_at as string | null | undefined,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    };
  }
}

/**
 * No-op stub for when plugin data store is not available.
 * @deprecated Use AiReviewCapabilityImpl instead
 */
export class AiReviewCapabilityStub implements AiReviewCapability {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(submissionId: string): Promise<AiReview | null> {
    return null;
  }

  async list(): Promise<AiReview[]> {
    return [];
  }

  async create(data: { submissionId: string; eventId: string }): Promise<AiReview> {
    return {
      id: `stub-${Date.now()}`,
      submissionId: data.submissionId,
      eventId: data.eventId,
      status: 'stub',
      error_message: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async update(id: string, data: AiReviewUpdateData): Promise<AiReview> {
    return {
      id,
      submissionId: 'unknown',
      eventId: 'unknown',
      status: data.status || 'stub',
      error_message: data.error_message ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(id: string): Promise<void> {
    // No-op
  }
}
