/**
 * Review Validation Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createReviewSchema,
  updateReviewSchema,
  addDiscussionSchema,
} from '@/lib/validations/review';

describe('Review Validation Schemas', () => {
  describe('createReviewSchema', () => {
    it('should validate a complete review', () => {
      const review = {
        contentScore: 4,
        presentationScore: 5,
        relevanceScore: 4,
        overallScore: 4,
        privateNotes: 'Good content but could use more examples',
        publicNotes: 'Looking forward to this talk!',
        recommendation: 'ACCEPT',
      };

      const result = createReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it('should allow minimal review with just one score', () => {
      const review = {
        overallScore: 3,
      };

      const result = createReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });

    it('should allow empty review', () => {
      const result = createReviewSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should enforce score range 1-5', () => {
      const invalidScores = [
        { contentScore: 0 },
        { contentScore: 6 },
        { presentationScore: -1 },
        { relevanceScore: 10 },
        { overallScore: 0 },
      ];

      for (const score of invalidScores) {
        const result = createReviewSchema.safeParse(score);
        expect(result.success).toBe(false);
      }
    });

    it('should accept all valid scores (1-5)', () => {
      for (let score = 1; score <= 5; score++) {
        const review = { overallScore: score };
        const result = createReviewSchema.safeParse(review);
        expect(result.success).toBe(true);
      }
    });

    it('should validate recommendation enum', () => {
      const validRecommendations = ['STRONG_ACCEPT', 'ACCEPT', 'NEUTRAL', 'REJECT', 'STRONG_REJECT'];
      
      for (const recommendation of validRecommendations) {
        const review = { recommendation };
        const result = createReviewSchema.safeParse(review);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid recommendation', () => {
      const review = {
        recommendation: 'MAYBE',
      };

      const result = createReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });

    it('should enforce notes max length', () => {
      const review = {
        privateNotes: 'a'.repeat(10001),
      };

      const result = createReviewSchema.safeParse(review);
      expect(result.success).toBe(false);
    });
  });

  describe('updateReviewSchema', () => {
    it('should allow partial updates', () => {
      const update = {
        overallScore: 5,
      };

      const result = updateReviewSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should allow updating just notes', () => {
      const update = {
        privateNotes: 'Updated thoughts after discussion',
      };

      const result = updateReviewSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should allow updating recommendation alone', () => {
      const update = {
        recommendation: 'STRONG_ACCEPT',
      };

      const result = updateReviewSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate score range on update', () => {
      const update = {
        contentScore: 7,
      };

      const result = updateReviewSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should allow empty update', () => {
      const result = updateReviewSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('addDiscussionSchema', () => {
    it('should validate a valid discussion comment', () => {
      const discussion = {
        content: 'I agree with this assessment. The speaker has great credentials.',
      };

      const result = addDiscussionSchema.safeParse(discussion);
      expect(result.success).toBe(true);
    });

    it('should require content', () => {
      const result = addDiscussionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should require non-empty content', () => {
      const discussion = {
        content: '',
      };

      const result = addDiscussionSchema.safeParse(discussion);
      expect(result.success).toBe(false);
    });

    it('should require minimum content length', () => {
      const discussion = {
        content: 'a',
      };

      const result = addDiscussionSchema.safeParse(discussion);
      expect(result.success).toBe(false);
    });

    it('should enforce max content length', () => {
      const discussion = {
        content: 'a'.repeat(5001),
      };

      const result = addDiscussionSchema.safeParse(discussion);
      expect(result.success).toBe(false);
    });

    it('should accept reasonable length content', () => {
      const discussion = {
        content: 'This is a thoughtful discussion comment about the review. I think we should consider the speaker\'s background and previous talks.',
      };

      const result = addDiscussionSchema.safeParse(discussion);
      expect(result.success).toBe(true);
    });
  });
});
