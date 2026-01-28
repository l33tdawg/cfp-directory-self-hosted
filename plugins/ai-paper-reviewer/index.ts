/**
 * AI Paper Reviewer Plugin
 *
 * Automatically analyzes paper submissions using AI to provide
 * preliminary reviews with scoring, feedback, and recommendations.
 *
 * v1.1.0: Event-aware criteria, duplicate detection, Gemini support,
 * confidence thresholds, and JSON repair.
 */

import type { Plugin, PluginContext, PluginManifest } from '@/lib/plugins';
import { AiReviewPanel } from './components/ai-review-panel';
import { buildSystemPrompt } from './lib/prompts';
import type { ReviewCriterion, SimilarSubmissionInfo, EventContext } from './lib/prompts';
import { callProvider } from './lib/providers';
import { parseWithRetry } from './lib/json-repair';
import { findSimilarSubmissions } from './lib/similarity';
import type { SimilarSubmission } from './lib/similarity';
import manifestJson from './manifest.json';

const manifest: PluginManifest = manifestJson as PluginManifest;

// =============================================================================
// CONFIGURATION
// =============================================================================

interface AiReviewerConfig {
  /** @deprecated Use aiProvider */
  aiProvider?: 'openai' | 'anthropic' | 'gemini';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  autoReview?: boolean;
  analysisPrompt?: string;
  useEventCriteria?: boolean;
  strictnessLevel?: 'lenient' | 'moderate' | 'strict';
  reviewFocus?: string[];
  customPersona?: string;
  enableDuplicateDetection?: boolean;
  duplicateThreshold?: number;
  enableSpeakerResearch?: boolean;
  confidenceThreshold?: number;
  lowConfidenceBehavior?: 'hide' | 'warn' | 'require_override';
}

// =============================================================================
// ANALYSIS RESULT TYPE
// =============================================================================

export interface AiAnalysisResult {
  criteriaScores: Record<string, number>;
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendation: string;
  confidence: number;
  similarSubmissions?: SimilarSubmission[];
  rawResponse: string;
  parseAttempts: number;
  repairApplied: boolean;
  analyzedAt: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build submission text for AI analysis from a submission object
 */
export function buildSubmissionText(submission: {
  title: string;
  abstract: string | null;
  outline?: string | null;
  targetAudience?: string | null;
  prerequisites?: string | null;
}): string {
  const parts = [`Title: ${submission.title}`];

  if (submission.abstract) {
    parts.push(`\nAbstract:\n${submission.abstract}`);
  }
  if (submission.outline) {
    parts.push(`\nOutline:\n${submission.outline}`);
  }
  if (submission.targetAudience) {
    parts.push(`\nTarget Audience: ${submission.targetAudience}`);
  }
  if (submission.prerequisites) {
    parts.push(`\nPrerequisites: ${submission.prerequisites}`);
  }

  return parts.join('\n');
}

/**
 * Call the AI provider API to analyze a submission.
 * Now uses the provider module, temperature, and parseWithRetry.
 */
export async function callAiProvider(
  config: AiReviewerConfig,
  submissionText: string,
  systemPrompt?: string
): Promise<{ result: AiAnalysisResult; rawResponse: string }> {
  const provider = config.aiProvider || 'openai';
  const model = config.model || 'gpt-4o';
  const maxTokens = config.maxTokens || 2000;
  const temperature = config.temperature ?? 0.3;
  const prompt = systemPrompt || buildSystemPrompt();

  const rawResponse = await callProvider(provider, {
    apiKey: config.apiKey!,
    model,
    maxTokens,
    temperature,
    systemPrompt: prompt,
    userContent: submissionText,
  });

  // Create a repair function that asks the AI to fix broken JSON
  const repairFn = async (broken: string): Promise<string> => {
    return callProvider(provider, {
      apiKey: config.apiKey!,
      model,
      maxTokens,
      temperature: 0,
      systemPrompt: 'Fix this JSON so it is valid. Return ONLY the corrected JSON, nothing else.',
      userContent: broken,
    });
  };

  const { data: parsed, parseAttempts, repairApplied } = await parseWithRetry<RawAiResponse>(
    rawResponse,
    repairFn
  );

  // Normalize scores
  const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));

  const criteriaScores: Record<string, number> = {};
  if (parsed.criteriaScores && typeof parsed.criteriaScores === 'object') {
    for (const [name, score] of Object.entries(parsed.criteriaScores)) {
      criteriaScores[name] = clamp(score as number);
    }
  }

  // Backward compat: if old-style fixed scores exist, use them
  if (Object.keys(criteriaScores).length === 0) {
    if (parsed.contentScore !== undefined) criteriaScores['Content Quality'] = clamp(parsed.contentScore);
    if (parsed.presentationScore !== undefined) criteriaScores['Presentation Clarity'] = clamp(parsed.presentationScore);
    if (parsed.relevanceScore !== undefined) criteriaScores['Relevance'] = clamp(parsed.relevanceScore);
    if (parsed.originalityScore !== undefined) criteriaScores['Originality'] = clamp(parsed.originalityScore);
  }

  const result: AiAnalysisResult = {
    criteriaScores,
    overallScore: clamp(parsed.overallScore || 3),
    summary: parsed.summary || '',
    strengths: parsed.strengths || [],
    weaknesses: parsed.weaknesses || [],
    suggestions: parsed.suggestions || [],
    recommendation: parsed.recommendation || 'NEUTRAL',
    confidence: Math.max(0, Math.min(1, parsed.confidence ?? 0.8)),
    rawResponse,
    parseAttempts,
    repairApplied,
    analyzedAt: new Date().toISOString(),
  };

  return { result, rawResponse };
}

/** Raw shape the AI might return (flexible) */
interface RawAiResponse {
  criteriaScores?: Record<string, number>;
  contentScore?: number;
  presentationScore?: number;
  relevanceScore?: number;
  originalityScore?: number;
  overallScore?: number;
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  recommendation?: string;
  confidence?: number;
}

// =============================================================================
// PLUGIN DEFINITION
// =============================================================================

const plugin: Plugin = {
  manifest,

  async onEnable(ctx: PluginContext) {
    const config = ctx.config as AiReviewerConfig;
    if (!config.apiKey) {
      ctx.logger.warn('AI Paper Reviewer enabled without an API key - reviews will fail until configured');
    } else {
      ctx.logger.info('AI Paper Reviewer enabled', {
        provider: config.aiProvider || 'openai',
        model: config.model || 'gpt-4o',
        autoReview: config.autoReview !== false,
      });
    }
  },

  async onDisable(ctx: PluginContext) {
    ctx.logger.info('AI Paper Reviewer disabled');
  },

  hooks: {
    'submission.created': async (ctx, payload) => {
      const config = ctx.config as AiReviewerConfig;

      if (config.autoReview === false) {
        ctx.logger.debug('Auto-review disabled, skipping AI analysis', {
          submissionId: payload.submission.id,
        });
        return;
      }

      if (!config.apiKey) {
        ctx.logger.warn('Cannot run AI review - no API key configured');
        return;
      }

      ctx.logger.info('Queuing AI review for new submission', {
        submissionId: payload.submission.id,
        title: payload.submission.title,
      });

      await ctx.jobs!.enqueue({
        type: 'ai-review',
        payload: {
          submissionId: payload.submission.id,
          eventId: payload.event.id,
          title: payload.submission.title,
          abstract: payload.submission.abstract,
          outline: (payload.submission as Record<string, unknown>).outline || null,
          targetAudience: (payload.submission as Record<string, unknown>).targetAudience || null,
          prerequisites: (payload.submission as Record<string, unknown>).prerequisites || null,
        },
      });
    },

    'submission.updated': async (ctx, payload) => {
      const config = ctx.config as AiReviewerConfig;

      const hasContentChanges =
        payload.changes.abstract !== undefined ||
        payload.changes.title !== undefined ||
        payload.changes.outline !== undefined;

      if (!hasContentChanges) return;
      if (config.autoReview === false || !config.apiKey) return;

      ctx.logger.info('Queuing AI re-review for updated submission', {
        submissionId: payload.submission.id,
      });

      await ctx.jobs!.enqueue({
        type: 'ai-review',
        payload: {
          submissionId: payload.submission.id,
          eventId: (payload.submission as Record<string, unknown>).eventId || null,
          title: payload.submission.title,
          abstract: payload.submission.abstract,
          outline: (payload.submission as Record<string, unknown>).outline || null,
          targetAudience: (payload.submission as Record<string, unknown>).targetAudience || null,
          prerequisites: (payload.submission as Record<string, unknown>).prerequisites || null,
          isReReview: true,
        },
      });
    },
  },

  components: [
    {
      slot: 'submission.review.panel',
      component: AiReviewPanel,
      order: 50,
    },
  ],
};

export default plugin;

/**
 * Job handler for AI review processing.
 * This is exported separately so it can be registered with the worker.
 */
export async function handleAiReviewJob(
  payload: Record<string, unknown>,
  ctx: PluginContext
): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
  const config = ctx.config as AiReviewerConfig;
  const submissionId = payload.submissionId as string;
  const eventId = payload.eventId as string | undefined;

  ctx.logger.info('Processing AI review job', { submissionId });

  try {
    // 1. Fetch event criteria if useEventCriteria is enabled
    let criteria: ReviewCriterion[] = [];
    let eventContext: EventContext | null = null;

    if (eventId && config.useEventCriteria !== false) {
      try {
        const eventWithCriteria = await ctx.events.getWithCriteria(eventId);
        if (eventWithCriteria) {
          eventContext = {
            name: eventWithCriteria.name,
            description: eventWithCriteria.description,
            eventType: eventWithCriteria.eventType,
            topics: eventWithCriteria.topics,
            audienceLevel: eventWithCriteria.audienceLevel,
          };
          criteria = eventWithCriteria.reviewCriteria.map((c) => ({
            name: c.name,
            description: c.description,
            weight: c.weight,
          }));
        }
      } catch {
        ctx.logger.warn('Failed to fetch event criteria, using defaults');
      }
    }

    // 2. Run duplicate detection if enabled
    let similarSubmissions: SimilarSubmission[] = [];
    if (eventId && config.enableDuplicateDetection !== false) {
      try {
        const allSubmissions = await ctx.submissions.list({ eventId });
        const others = allSubmissions.filter((s) => s.id !== submissionId);
        similarSubmissions = findSimilarSubmissions(
          payload.title as string,
          (payload.abstract as string) || null,
          others.map((s) => ({ id: s.id, title: s.title, abstract: s.abstract })),
          config.duplicateThreshold ?? 0.7
        );
      } catch {
        ctx.logger.warn('Failed to run duplicate detection');
      }
    }

    // 3. Build dynamic prompt
    const similarInfo: SimilarSubmissionInfo[] = similarSubmissions.map((s) => ({
      title: s.title,
      similarity: s.similarity,
    }));

    const systemPrompt = buildSystemPrompt({
      event: eventContext,
      criteria,
      strictnessLevel: config.strictnessLevel || 'moderate',
      customPersona: config.customPersona,
      similarSubmissions: similarInfo,
      reviewFocus: config.reviewFocus,
    });

    // 4. Build submission text
    const submissionText = buildSubmissionText({
      title: payload.title as string,
      abstract: (payload.abstract as string) || null,
      outline: (payload.outline as string) || null,
      targetAudience: (payload.targetAudience as string) || null,
      prerequisites: (payload.prerequisites as string) || null,
    });

    // 5. Call AI with temperature and parse with retry
    const { result } = await callAiProvider(config, submissionText, systemPrompt);

    // 6. Attach similar submissions to result
    if (similarSubmissions.length > 0) {
      result.similarSubmissions = similarSubmissions;
    }

    ctx.logger.info('AI review completed', {
      submissionId,
      overallScore: result.overallScore,
      recommendation: result.recommendation,
      confidence: result.confidence,
    });

    return {
      success: true,
      data: {
        submissionId,
        analysis: result,
        analyzedAt: result.analyzedAt,
        provider: config.aiProvider || 'openai',
        model: config.model || 'gpt-4o',
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ctx.logger.error('AI review failed', { submissionId, error: message });
    return { success: false, error: message };
  }
}
