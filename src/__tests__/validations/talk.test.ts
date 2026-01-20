/**
 * Talk Validation Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createTalkSchema,
  updateTalkSchema,
  talkFiltersSchema,
  getTalkTypeLabel,
  formatDuration,
  TALK_TYPES,
} from '@/lib/validations/talk';

describe('Talk Validation Schemas', () => {
  
  // =========================================================================
  // Create Talk Schema
  // =========================================================================
  
  describe('createTalkSchema', () => {
    const validTalk = {
      title: 'Building Scalable APIs with Node.js',
      abstract: 'Learn how to build performant and scalable REST APIs using Node.js and modern best practices. We will cover architecture patterns, caching strategies, and more.',
      description: 'Extended description of the talk',
      outline: '1. Introduction\n2. Architecture\n3. Demo\n4. Q&A',
      type: 'SESSION' as const,
      durationMin: 45,
      targetAudience: ['Developers', 'Architects'],
      prerequisites: 'Basic JavaScript knowledge',
      speakerNotes: 'Remember to show the demo',
      tags: ['nodejs', 'api', 'backend'],
    };

    it('should validate a valid talk', () => {
      const result = createTalkSchema.safeParse(validTalk);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const data = { ...validTalk, title: '' };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require title minimum length', () => {
      const data = { ...validTalk, title: 'Hi' };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce title max length', () => {
      const data = { ...validTalk, title: 'a'.repeat(201) };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require abstract', () => {
      const data = { ...validTalk, abstract: '' };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require abstract minimum length (50 chars)', () => {
      const data = { ...validTalk, abstract: 'Too short' };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce abstract max length', () => {
      const data = { ...validTalk, abstract: 'a'.repeat(5001) };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow empty optional fields', () => {
      const data = {
        title: 'My Talk Title',
        abstract: 'This is a valid abstract that is at least 50 characters long for validation.',
        type: 'SESSION',
        durationMin: 30,
        targetAudience: [],
        tags: [],
      };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require type field', () => {
      const data = {
        title: 'My Talk Title',
        abstract: 'This is a valid abstract that is at least 50 characters long for validation.',
        durationMin: 30,
        targetAudience: [],
        tags: [],
      };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should require duration field', () => {
      const data = {
        title: 'My Talk Title',
        abstract: 'This is a valid abstract that is at least 50 characters long for validation.',
        type: 'SESSION',
        targetAudience: [],
        tags: [],
      };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate talk type enum', () => {
      const data = { ...validTalk, type: 'INVALID_TYPE' };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept all valid talk types', () => {
      for (const type of TALK_TYPES) {
        const data = { ...validTalk, type };
        const result = createTalkSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it('should enforce duration minimum (5 min)', () => {
      const data = { ...validTalk, durationMin: 2 };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce duration maximum (8 hours)', () => {
      const data = { ...validTalk, durationMin: 500 };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce max target audiences (5)', () => {
      const data = { 
        ...validTalk, 
        targetAudience: ['A', 'B', 'C', 'D', 'E', 'F'] 
      };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce max tags (10)', () => {
      const data = { 
        ...validTalk, 
        tags: Array(11).fill('tag') 
      };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce description max length', () => {
      const data = { ...validTalk, description: 'a'.repeat(10001) };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce outline max length', () => {
      const data = { ...validTalk, outline: 'a'.repeat(5001) };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should enforce speaker notes max length', () => {
      const data = { ...validTalk, speakerNotes: 'a'.repeat(5001) };
      const result = createTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Update Talk Schema
  // =========================================================================

  describe('updateTalkSchema', () => {
    it('should allow partial updates', () => {
      const data = { title: 'Updated Title' };
      const result = updateTalkSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateTalkSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate updated fields', () => {
      const data = { title: 'Hi' }; // Too short
      const result = updateTalkSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow isArchived field', () => {
      const data = { isArchived: true };
      const result = updateTalkSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isArchived).toBe(true);
      }
    });
  });

  // =========================================================================
  // Talk Filters Schema
  // =========================================================================

  describe('talkFiltersSchema', () => {
    it('should parse valid filters', () => {
      const filters = {
        search: 'nodejs',
        type: 'WORKSHOP',
        includeArchived: 'true',
        limit: '10',
        offset: '0',
      };
      const result = talkFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.search).toBe('nodejs');
        expect(result.data.type).toBe('WORKSHOP');
        expect(result.data.includeArchived).toBe(true);
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should use default values', () => {
      const result = talkFiltersSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeArchived).toBe(false);
        expect(result.data.limit).toBe(20);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should validate type enum', () => {
      const filters = { type: 'INVALID' };
      const result = talkFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });

    it('should enforce limit max (100)', () => {
      const filters = { limit: '150' };
      const result = talkFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });
  });

  // =========================================================================
  // Helper Functions
  // =========================================================================

  describe('getTalkTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getTalkTypeLabel('SESSION')).toBe('Session/Talk');
      expect(getTalkTypeLabel('WORKSHOP')).toBe('Workshop');
      expect(getTalkTypeLabel('LIGHTNING')).toBe('Lightning Talk');
      expect(getTalkTypeLabel('KEYNOTE')).toBe('Keynote');
      expect(getTalkTypeLabel('PANEL')).toBe('Panel Discussion');
      expect(getTalkTypeLabel('BOF')).toBe('Birds of a Feather');
      expect(getTalkTypeLabel('TUTORIAL')).toBe('Tutorial');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes under 60', () => {
      expect(formatDuration(30)).toBe('30 min');
      expect(formatDuration(45)).toBe('45 min');
    });

    it('should format exactly 1 hour', () => {
      expect(formatDuration(60)).toBe('1 hour');
    });

    it('should format multiple hours', () => {
      expect(formatDuration(120)).toBe('2 hours');
      expect(formatDuration(180)).toBe('3 hours');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(150)).toBe('2h 30m');
    });
  });
});
