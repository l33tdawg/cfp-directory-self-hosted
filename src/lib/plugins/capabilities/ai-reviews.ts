/**
 * AI Review Capability Implementation (Stub for Self-Hosted)
 * @version 1.19.0
 *
 * Self-hosted platforms don't have the ai_reviews table.
 * This stub provides no-op implementations so plugins can still function.
 *
 * The ai_reviews table on the main platform tracks:
 * - AI review processing status (pending, processing, completed, failed)
 * - Review results (scores, summary, strengths, weaknesses, suggestions)
 * - Cost tracking (tokens used, cost in USD)
 * - Performance metrics (processing time)
 *
 * On self-hosted, the core review data is still stored in the regular
 * Review model - only the AI-specific tracking metadata is stubbed out.
 */

import type { AiReviewCapability, AiReview, AiReviewUpdateData } from '../types';

/**
 * No-op stub implementation of AiReviewCapability for self-hosted.
 * All operations are no-ops that return empty/null values.
 */
export class AiReviewCapabilityStub implements AiReviewCapability {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(submissionId: string): Promise<AiReview | null> {
    // Self-hosted doesn't track AI reviews separately
    return null;
  }

  async list(): Promise<AiReview[]> {
    // Self-hosted doesn't track AI reviews separately
    return [];
  }

  async create(data: { submissionId: string; eventId: string }): Promise<AiReview> {
    // Return a dummy record that won't be persisted
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
    // Return a dummy updated record with the provided data
    return {
      id,
      submissionId: 'unknown',
      eventId: 'unknown',
      status: data.status || 'stub',
      error_message: data.error_message ?? null,
      review_id: data.review_id,
      criteria_scores: data.criteria_scores,
      overall_score: data.overall_score,
      summary: data.summary,
      strengths: data.strengths,
      weaknesses: data.weaknesses,
      suggestions: data.suggestions,
      recommendation: data.recommendation,
      confidence: data.confidence,
      similar_submissions: data.similar_submissions,
      model_used: data.model_used,
      provider: data.provider,
      input_tokens: data.input_tokens,
      output_tokens: data.output_tokens,
      cost_usd: data.cost_usd,
      processing_time_ms: data.processing_time_ms,
      completed_at: data.completed_at,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(id: string): Promise<void> {
    // No-op for self-hosted
  }
}
