/**
 * AI Paper Reviewer Plugin Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma before imports
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pluginLog: { create: vi.fn().mockResolvedValue({}) },
    pluginJob: {
      create: vi.fn().mockResolvedValue({ id: 'job-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
    },
    submission: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    event: { findUnique: vi.fn(), findMany: vi.fn() },
    review: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('@/lib/storage/local-storage-provider', () => ({
  getStorage: vi.fn().mockReturnValue({
    getPublicUrl: vi.fn().mockReturnValue('http://test.com/file'),
    upload: vi.fn().mockResolvedValue({ url: 'http://test.com/uploaded' }),
    delete: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/email/email-service', () => ({
  emailService: { send: vi.fn().mockResolvedValue({ success: true }) },
}));

import {
  buildSubmissionText,
  callAiProvider,
  handleAiReviewJob,
} from '../../../plugins/ai-paper-reviewer/index';
import type { PluginContext } from '@/lib/plugins';

// =============================================================================
// MOCK CONTEXT HELPER
// =============================================================================

function createMockContext(config: Record<string, unknown> = {}): PluginContext {
  return {
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config,
    jobs: {
      enqueue: vi.fn().mockResolvedValue('job-1'),
      getJob: vi.fn().mockResolvedValue(null),
      cancelJob: vi.fn().mockResolvedValue(true),
      getPendingCount: vi.fn().mockResolvedValue(0),
      getJobs: vi.fn().mockResolvedValue([]),
    },
    submissions: {} as any,
    users: {} as any,
    events: {} as any,
    reviews: {} as any,
    storage: {} as any,
    email: {} as any,
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('AI Paper Reviewer Plugin', () => {
  describe('buildSubmissionText', () => {
    it('should build text from title only', () => {
      const text = buildSubmissionText({
        title: 'My Talk',
        abstract: null,
      });

      expect(text).toBe('Title: My Talk');
    });

    it('should include abstract', () => {
      const text = buildSubmissionText({
        title: 'My Talk',
        abstract: 'This is the abstract.',
      });

      expect(text).toContain('Title: My Talk');
      expect(text).toContain('Abstract:\nThis is the abstract.');
    });

    it('should include all fields when provided', () => {
      const text = buildSubmissionText({
        title: 'Advanced TypeScript',
        abstract: 'Deep dive into TS.',
        outline: '1. Intro\n2. Types\n3. Patterns',
        targetAudience: 'Senior developers',
        prerequisites: 'Basic TypeScript knowledge',
      });

      expect(text).toContain('Title: Advanced TypeScript');
      expect(text).toContain('Abstract:\nDeep dive into TS.');
      expect(text).toContain('Outline:\n1. Intro');
      expect(text).toContain('Target Audience: Senior developers');
      expect(text).toContain('Prerequisites: Basic TypeScript knowledge');
    });

    it('should skip null/undefined fields', () => {
      const text = buildSubmissionText({
        title: 'My Talk',
        abstract: null,
        outline: null,
        targetAudience: undefined as any,
      });

      expect(text).toBe('Title: My Talk');
      expect(text).not.toContain('Abstract');
      expect(text).not.toContain('Outline');
      expect(text).not.toContain('Target Audience');
    });
  });

  describe('callAiProvider', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should call OpenAI API with correct parameters', async () => {
      const mockResponse = {
        contentScore: 4,
        presentationScore: 3,
        relevanceScore: 5,
        originalityScore: 4,
        overallScore: 4,
        summary: 'Good submission',
        strengths: ['Clear topic'],
        weaknesses: ['Missing detail'],
        suggestions: ['Add examples'],
        recommendation: 'ACCEPT',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      } as Response);

      const result = await callAiProvider(
        { apiKey: 'test-key', aiProvider: 'openai', model: 'gpt-4o' },
        'Title: Test Talk'
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );

      expect(result.overallScore).toBe(4);
      expect(result.recommendation).toBe('ACCEPT');
    });

    it('should call Anthropic API with correct parameters', async () => {
      const mockResponse = {
        contentScore: 3,
        presentationScore: 4,
        relevanceScore: 3,
        originalityScore: 2,
        overallScore: 3,
        summary: 'Average submission',
        strengths: ['Well-written'],
        weaknesses: ['Not original'],
        suggestions: ['Find unique angle'],
        recommendation: 'NEUTRAL',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: JSON.stringify(mockResponse) }],
        }),
      } as Response);

      const result = await callAiProvider(
        { apiKey: 'test-key', aiProvider: 'anthropic', model: 'claude-sonnet-4-20250514' },
        'Title: Test Talk'
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'test-key',
          }),
        })
      );

      expect(result.overallScore).toBe(3);
      expect(result.recommendation).toBe('NEUTRAL');
    });

    it('should clamp scores to 1-5 range', async () => {
      const mockResponse = {
        contentScore: 0,
        presentationScore: 7,
        relevanceScore: -1,
        originalityScore: 10,
        overallScore: 3.7,
        summary: 'Test',
        strengths: [],
        weaknesses: [],
        suggestions: [],
        recommendation: 'NEUTRAL',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockResponse) } }],
        }),
      } as Response);

      const result = await callAiProvider(
        { apiKey: 'key', aiProvider: 'openai' },
        'Test'
      );

      expect(result.contentScore).toBe(1);
      expect(result.presentationScore).toBe(5);
      expect(result.relevanceScore).toBe(1);
      expect(result.originalityScore).toBe(5);
      expect(result.overallScore).toBe(4); // 3.7 rounds to 4
    });

    it('should throw on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(
        callAiProvider({ apiKey: 'bad-key', aiProvider: 'openai' }, 'Test')
      ).rejects.toThrow('OpenAI API error (401)');
    });

    it('should throw for unsupported provider', async () => {
      await expect(
        callAiProvider(
          { apiKey: 'key', aiProvider: 'unsupported' as any },
          'Test'
        )
      ).rejects.toThrow('Unsupported AI provider: unsupported');
    });
  });

  describe('handleAiReviewJob', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should process a submission and return analysis', async () => {
      const mockAnalysis = {
        contentScore: 4,
        presentationScore: 4,
        relevanceScore: 3,
        originalityScore: 5,
        overallScore: 4,
        summary: 'Excellent talk',
        strengths: ['Original topic'],
        weaknesses: ['Could be clearer'],
        suggestions: ['Add code samples'],
        recommendation: 'ACCEPT',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAnalysis) } }],
        }),
      } as Response);

      const ctx = createMockContext({
        apiKey: 'test-key',
        aiProvider: 'openai',
      });

      const result = await handleAiReviewJob(
        {
          submissionId: 'sub-123',
          title: 'My Great Talk',
          abstract: 'This is about great things',
        },
        ctx
      );

      expect(result.success).toBe(true);
      expect(result.data?.submissionId).toBe('sub-123');
      expect((result.data?.analysis as any).overallScore).toBe(4);
      expect((result.data?.analysis as any).recommendation).toBe('ACCEPT');
      expect(result.data?.provider).toBe('openai');
    });

    it('should return error on failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new Error('Network error')
      );

      const ctx = createMockContext({
        apiKey: 'test-key',
        aiProvider: 'openai',
      });

      const result = await handleAiReviewJob(
        {
          submissionId: 'sub-123',
          title: 'Test',
          abstract: null,
        },
        ctx
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(ctx.logger.error).toHaveBeenCalled();
    });
  });

  describe('plugin hooks', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it('should have correct manifest', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      expect(plugin.manifest.name).toBe('ai-paper-reviewer');
      expect(plugin.manifest.apiVersion).toBe('1.0');
      expect(plugin.manifest.permissions).toContain('submissions:read');
      expect(plugin.manifest.permissions).toContain('reviews:write');
    });

    it('should register a component for submission.review.panel slot', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      expect(plugin.components).toHaveLength(1);
      expect(plugin.components![0].slot).toBe('submission.review.panel');
      expect(plugin.components![0].order).toBe(50);
    });

    it('should queue AI review job on submission.created', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      const ctx = createMockContext({
        apiKey: 'test-key',
        autoReview: true,
      });

      await plugin.hooks!['submission.created']!(ctx, {
        submission: {
          id: 'sub-1',
          title: 'Test Talk',
          abstract: 'An abstract',
        } as any,
        speaker: { id: 'user-1', email: 'test@test.com', name: 'Test' },
        event: { id: 'evt-1', name: 'TestConf', slug: 'testconf' },
      });

      expect(ctx.jobs!.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-review',
          payload: expect.objectContaining({
            submissionId: 'sub-1',
            title: 'Test Talk',
          }),
        })
      );
    });

    it('should skip if autoReview is disabled', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      const ctx = createMockContext({
        apiKey: 'test-key',
        autoReview: false,
      });

      await plugin.hooks!['submission.created']!(ctx, {
        submission: { id: 'sub-1', title: 'Test', abstract: null } as any,
        speaker: { id: 'u1', email: 'a@b.com', name: 'A' },
        event: { id: 'e1', name: 'E', slug: 'e' },
      });

      expect(ctx.jobs!.enqueue).not.toHaveBeenCalled();
    });

    it('should skip if no API key configured', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      const ctx = createMockContext({});

      await plugin.hooks!['submission.created']!(ctx, {
        submission: { id: 'sub-1', title: 'Test', abstract: null } as any,
        speaker: { id: 'u1', email: 'a@b.com', name: 'A' },
        event: { id: 'e1', name: 'E', slug: 'e' },
      });

      expect(ctx.jobs!.enqueue).not.toHaveBeenCalled();
      expect(ctx.logger.warn).toHaveBeenCalled();
    });

    it('should queue re-review on submission.updated with content changes', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      const ctx = createMockContext({
        apiKey: 'test-key',
        autoReview: true,
      });

      await plugin.hooks!['submission.updated']!(ctx, {
        submission: {
          id: 'sub-1',
          title: 'Updated Talk',
          abstract: 'New abstract',
        } as any,
        changes: { abstract: 'New abstract' } as any,
        updatedBy: { id: 'u1', name: 'User' },
      });

      expect(ctx.jobs!.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ai-review',
          payload: expect.objectContaining({
            submissionId: 'sub-1',
            isReReview: true,
          }),
        })
      );
    });

    it('should not re-review on non-content changes', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      const ctx = createMockContext({
        apiKey: 'test-key',
        autoReview: true,
      });

      await plugin.hooks!['submission.updated']!(ctx, {
        submission: { id: 'sub-1', title: 'Talk', abstract: 'A' } as any,
        changes: {} as any,
        updatedBy: { id: 'u1', name: 'User' },
      });

      expect(ctx.jobs!.enqueue).not.toHaveBeenCalled();
    });

    it('should warn on enable without API key', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      const ctx = createMockContext({});

      await plugin.onEnable!(ctx);

      expect(ctx.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('without an API key')
      );
    });

    it('should log info on enable with API key', async () => {
      const plugin = (await import('../../../plugins/ai-paper-reviewer/index')).default;
      const ctx = createMockContext({ apiKey: 'my-key', aiProvider: 'anthropic' });

      await plugin.onEnable!(ctx);

      expect(ctx.logger.info).toHaveBeenCalledWith(
        'AI Paper Reviewer enabled',
        expect.objectContaining({ provider: 'anthropic' })
      );
    });
  });
});
