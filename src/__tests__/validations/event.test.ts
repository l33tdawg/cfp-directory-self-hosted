/**
 * Event Validation Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createEventSchema,
  updateEventSchema,
  eventFiltersSchema,
  createTrackSchema,
  createFormatSchema,
  addReviewerSchema,
} from '@/lib/validations/event';

describe('Event Validation Schemas', () => {
  describe('createEventSchema', () => {
    it('should validate a valid event', () => {
      const validEvent = {
        name: 'DevConf 2025',
        slug: 'devconf-2025',
        description: 'A great developer conference',
        websiteUrl: 'https://devconf.example.com',
        location: 'San Francisco, CA',
        isVirtual: false,
        timezone: 'America/Los_Angeles',
        isPublished: false,
      };

      const result = createEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const invalidEvent = {
        slug: 'devconf-2025',
      };

      const result = createEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name');
      }
    });

    it('should require slug', () => {
      const invalidEvent = {
        name: 'DevConf 2025',
      };

      const result = createEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it('should validate slug format', () => {
      const invalidSlug = {
        name: 'DevConf 2025',
        slug: 'DevConf 2025', // Invalid - contains spaces and uppercase
      };

      const result = createEventSchema.safeParse(invalidSlug);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('slug');
      }
    });

    it('should accept valid slug with hyphens', () => {
      const validSlug = {
        name: 'DevConf 2025',
        slug: 'devconf-2025-spring',
      };

      const result = createEventSchema.safeParse(validSlug);
      expect(result.success).toBe(true);
    });

    it('should validate website URL format', () => {
      const invalidUrl = {
        name: 'DevConf 2025',
        slug: 'devconf-2025',
        websiteUrl: 'not-a-url',
      };

      const result = createEventSchema.safeParse(invalidUrl);
      expect(result.success).toBe(false);
    });

    it('should allow empty website URL', () => {
      const emptyUrl = {
        name: 'DevConf 2025',
        slug: 'devconf-2025',
        websiteUrl: '',
      };

      const result = createEventSchema.safeParse(emptyUrl);
      expect(result.success).toBe(true);
    });

    it('should validate datetime format for dates', () => {
      const validDates = {
        name: 'DevConf 2025',
        slug: 'devconf-2025',
        startDate: '2025-06-15T09:00:00.000Z',
        endDate: '2025-06-17T18:00:00.000Z',
        cfpOpensAt: '2025-01-01T00:00:00.000Z',
        cfpClosesAt: '2025-04-30T23:59:59.000Z',
      };

      const result = createEventSchema.safeParse(validDates);
      expect(result.success).toBe(true);
    });

    it('should default isVirtual to false', () => {
      const event = {
        name: 'DevConf 2025',
        slug: 'devconf-2025',
      };

      const result = createEventSchema.parse(event);
      expect(result.isVirtual).toBe(false);
    });

    it('should default isPublished to false', () => {
      const event = {
        name: 'DevConf 2025',
        slug: 'devconf-2025',
      };

      const result = createEventSchema.parse(event);
      expect(result.isPublished).toBe(false);
    });

    it('should enforce name max length', () => {
      const longName = {
        name: 'a'.repeat(201),
        slug: 'devconf-2025',
      };

      const result = createEventSchema.safeParse(longName);
      expect(result.success).toBe(false);
    });
  });

  describe('updateEventSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };

      const result = updateEventSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should not allow slug updates', () => {
      const withSlug = {
        name: 'Updated Name',
        slug: 'new-slug',
      };

      const result = updateEventSchema.safeParse(withSlug);
      // Slug should be stripped out
      if (result.success) {
        expect(result.data).not.toHaveProperty('slug');
      }
    });

    it('should allow empty object', () => {
      const result = updateEventSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('eventFiltersSchema', () => {
    it('should parse valid filters', () => {
      const filters = {
        isPublished: 'true',
        cfpOpen: 'true',
        search: 'javascript',
        limit: '10',
        offset: '0',
      };

      const result = eventFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublished).toBe(true);
        expect(result.data.cfpOpen).toBe(true);
        expect(result.data.search).toBe('javascript');
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should use default limit', () => {
      const result = eventFiltersSchema.parse({});
      expect(result.limit).toBe(20);
    });

    it('should use default offset', () => {
      const result = eventFiltersSchema.parse({});
      expect(result.offset).toBe(0);
    });

    it('should enforce max limit', () => {
      const filters = { limit: '200' };
      const result = eventFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });

    it('should enforce min limit', () => {
      const filters = { limit: '0' };
      const result = eventFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });
  });

  describe('createTrackSchema', () => {
    it('should validate a valid track', () => {
      const track = {
        name: 'Web Development',
        description: 'Frontend and backend web technologies',
        color: '#3B82F6',
      };

      const result = createTrackSchema.safeParse(track);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const track = {
        description: 'Some description',
      };

      const result = createTrackSchema.safeParse(track);
      expect(result.success).toBe(false);
    });

    it('should validate hex color format', () => {
      const invalidColor = {
        name: 'Web Development',
        color: 'blue', // Invalid - not hex
      };

      const result = createTrackSchema.safeParse(invalidColor);
      expect(result.success).toBe(false);
    });

    it('should accept valid hex colors', () => {
      const validColor = {
        name: 'Web Development',
        color: '#FF5733',
      };

      const result = createTrackSchema.safeParse(validColor);
      expect(result.success).toBe(true);
    });
  });

  describe('createFormatSchema', () => {
    it('should validate a valid format', () => {
      const format = {
        name: 'Workshop',
        durationMin: 120,
      };

      const result = createFormatSchema.safeParse(format);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const format = {
        durationMin: 45,
      };

      const result = createFormatSchema.safeParse(format);
      expect(result.success).toBe(false);
    });

    it('should require durationMin', () => {
      const format = {
        name: 'Talk',
      };

      const result = createFormatSchema.safeParse(format);
      expect(result.success).toBe(false);
    });

    it('should enforce min duration of 5 minutes', () => {
      const format = {
        name: 'Quick Talk',
        durationMin: 3,
      };

      const result = createFormatSchema.safeParse(format);
      expect(result.success).toBe(false);
    });

    it('should enforce max duration of 480 minutes', () => {
      const format = {
        name: 'Full Day Workshop',
        durationMin: 500,
      };

      const result = createFormatSchema.safeParse(format);
      expect(result.success).toBe(false);
    });
  });

  describe('addReviewerSchema', () => {
    it('should validate a valid reviewer', () => {
      const reviewer = {
        userId: 'clxxxxxxxxxxxxxxxxxxx',
        role: 'REVIEWER',
      };

      const result = addReviewerSchema.safeParse(reviewer);
      expect(result.success).toBe(true);
    });

    it('should require userId', () => {
      const reviewer = {
        role: 'REVIEWER',
      };

      const result = addReviewerSchema.safeParse(reviewer);
      expect(result.success).toBe(false);
    });

    it('should default role to REVIEWER', () => {
      const reviewer = {
        userId: 'clxxxxxxxxxxxxxxxxxxx',
      };

      const result = addReviewerSchema.parse(reviewer);
      expect(result.role).toBe('REVIEWER');
    });

    it('should accept LEAD role', () => {
      const reviewer = {
        userId: 'clxxxxxxxxxxxxxxxxxxx',
        role: 'LEAD',
      };

      const result = addReviewerSchema.safeParse(reviewer);
      expect(result.success).toBe(true);
    });

    it('should reject invalid roles', () => {
      const reviewer = {
        userId: 'clxxxxxxxxxxxxxxxxxxx',
        role: 'ADMIN',
      };

      const result = addReviewerSchema.safeParse(reviewer);
      expect(result.success).toBe(false);
    });
  });
});
