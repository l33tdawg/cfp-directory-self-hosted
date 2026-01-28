/**
 * AI Paper Reviewer Plugin
 *
 * Automatically analyzes paper submissions using AI to provide
 * preliminary reviews with scoring, feedback, and recommendations.
 *
 * Uses the background job queue for async AI processing so that
 * submission creation is not blocked by API calls.
 */

import type { Plugin, PluginContext, PluginManifest } from '@/lib/plugins';
import { AiReviewPanel } from './components/ai-review-panel';
import manifestJson from './manifest.json';

const manifest: PluginManifest = manifestJson as PluginManifest;

// =============================================================================
// CONFIGURATION
// =============================================================================

interface AiReviewerConfig {
  aiProvider?: 'openai' | 'anthropic';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  autoReview?: boolean;
  analysisPrompt?: string;
}

// =============================================================================
// DEFAULT PROMPT
// =============================================================================

const DEFAULT_ANALYSIS_PROMPT = `You are a conference paper reviewer. Analyze the following submission and provide a structured review.

Evaluate the submission on these criteria (score each 1-5):
1. **Content Quality** - Is the topic well-defined? Is the content technically accurate and substantive?
2. **Presentation Clarity** - Is the abstract clear and well-structured? Will the audience understand the talk?
3. **Relevance** - Is this topic relevant to the conference audience?
4. **Originality** - Does this bring something new or a fresh perspective?

Provide your response in the following JSON format:
{
  "contentScore": <1-5>,
  "presentationScore": <1-5>,
  "relevanceScore": <1-5>,
  "originalityScore": <1-5>,
  "overallScore": <1-5>,
  "summary": "<2-3 sentence summary of your assessment>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "recommendation": "<STRONG_ACCEPT|ACCEPT|NEUTRAL|REJECT|STRONG_REJECT>"
}

Respond ONLY with the JSON object, no additional text.`;

// =============================================================================
// AI API CALLS
// =============================================================================

interface AiAnalysisResult {
  contentScore: number;
  presentationScore: number;
  relevanceScore: number;
  originalityScore: number;
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  recommendation: string;
}

/**
 * Call the AI provider API to analyze a submission
 */
export async function callAiProvider(
  config: AiReviewerConfig,
  submissionText: string
): Promise<AiAnalysisResult> {
  const provider = config.aiProvider || 'openai';
  const model = config.model || 'gpt-4o';
  const maxTokens = config.maxTokens || 2000;
  const systemPrompt = config.analysisPrompt || DEFAULT_ANALYSIS_PROMPT;

  let responseText: string;

  if (provider === 'openai') {
    responseText = await callOpenAI(config.apiKey!, model, maxTokens, systemPrompt, submissionText);
  } else if (provider === 'anthropic') {
    responseText = await callAnthropic(config.apiKey!, model, maxTokens, systemPrompt, submissionText);
  } else {
    throw new Error(`Unsupported AI provider: ${provider}`);
  }

  // Parse the JSON response
  const parsed = JSON.parse(responseText) as AiAnalysisResult;

  // Validate scores are in range
  const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
  parsed.contentScore = clamp(parsed.contentScore);
  parsed.presentationScore = clamp(parsed.presentationScore);
  parsed.relevanceScore = clamp(parsed.relevanceScore);
  parsed.originalityScore = clamp(parsed.originalityScore);
  parsed.overallScore = clamp(parsed.overallScore);

  return parsed;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(
  apiKey: string,
  model: string,
  maxTokens: number,
  systemPrompt: string,
  userContent: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.content[0].text;
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

      // Skip if auto-review is disabled
      if (config.autoReview === false) {
        ctx.logger.debug('Auto-review disabled, skipping AI analysis', {
          submissionId: payload.submission.id,
        });
        return;
      }

      // Skip if no API key configured
      if (!config.apiKey) {
        ctx.logger.warn('Cannot run AI review - no API key configured');
        return;
      }

      ctx.logger.info('Queuing AI review for new submission', {
        submissionId: payload.submission.id,
        title: payload.submission.title,
      });

      // Queue a background job for AI analysis
      await ctx.jobs!.enqueue({
        type: 'ai-review',
        payload: {
          submissionId: payload.submission.id,
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

      // Only re-review if content changed meaningfully
      const hasContentChanges =
        payload.changes.abstract !== undefined ||
        payload.changes.title !== undefined ||
        payload.changes.outline !== undefined;

      if (!hasContentChanges) {
        return;
      }

      if (config.autoReview === false || !config.apiKey) {
        return;
      }

      ctx.logger.info('Queuing AI re-review for updated submission', {
        submissionId: payload.submission.id,
      });

      await ctx.jobs!.enqueue({
        type: 'ai-review',
        payload: {
          submissionId: payload.submission.id,
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

  ctx.logger.info('Processing AI review job', { submissionId });

  try {
    // Build submission text
    const submissionText = buildSubmissionText({
      title: payload.title as string,
      abstract: (payload.abstract as string) || null,
      outline: (payload.outline as string) || null,
      targetAudience: (payload.targetAudience as string) || null,
      prerequisites: (payload.prerequisites as string) || null,
    });

    // Call AI provider
    const result = await callAiProvider(config, submissionText);

    ctx.logger.info('AI review completed', {
      submissionId,
      overallScore: result.overallScore,
      recommendation: result.recommendation,
    });

    return {
      success: true,
      data: {
        submissionId,
        analysis: result,
        analyzedAt: new Date().toISOString(),
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
