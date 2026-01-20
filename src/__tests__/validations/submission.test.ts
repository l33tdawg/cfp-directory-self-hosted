/**
 * Submission Validation Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  submissionFiltersSchema,
  updateSubmissionStatusSchema,
  createMaterialSchema,
  createCoSpeakerSchema,
} from '@/lib/validations/submission';

describe('Submission Validation Schemas', () => {
  describe('createSubmissionSchema', () => {
    it('should validate a valid submission', () => {
      const submission = {
        title: 'Building Scalable APIs with Node.js',
        abstract: 'Learn how to build performant and scalable REST APIs using Node.js and modern best practices.',
        outline: '1. Introduction\n2. Architecture patterns\n3. Performance optimization\n4. Q&A',
        targetAudience: 'Intermediate developers',
        prerequisites: 'Basic JavaScript knowledge',
      };

      const result = createSubmissionSchema.safeParse(submission);
      expect(result.success).toBe(true);
    });

    it('should require title', () => {
      const submission = {
        abstract: 'Some abstract',
      };

      const result = createSubmissionSchema.safeParse(submission);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('title'))).toBe(true);
      }
    });

    it('should require abstract', () => {
      const submission = {
        title: 'My Talk',
      };

      const result = createSubmissionSchema.safeParse(submission);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('abstract'))).toBe(true);
      }
    });

    it('should enforce title max length', () => {
      const submission = {
        title: 'a'.repeat(301),
        abstract: 'Some abstract',
      };

      const result = createSubmissionSchema.safeParse(submission);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const submission = {
        title: 'My Talk',
        abstract: 'Brief abstract',
      };

      const result = createSubmissionSchema.safeParse(submission);
      expect(result.success).toBe(true);
    });

    it('should accept trackId and formatId', () => {
      const submission = {
        title: 'My Talk',
        abstract: 'Brief abstract',
        trackId: 'track-123',
        formatId: 'format-456',
      };

      const result = createSubmissionSchema.safeParse(submission);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trackId).toBe('track-123');
        expect(result.data.formatId).toBe('format-456');
      }
    });
  });

  describe('updateSubmissionSchema', () => {
    it('should allow partial updates', () => {
      const update = {
        title: 'Updated Title',
      };

      const result = updateSubmissionSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateSubmissionSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate updated fields', () => {
      const update = {
        title: 'a'.repeat(301), // Too long
      };

      const result = updateSubmissionSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('submissionFiltersSchema', () => {
    it('should parse valid filters', () => {
      const filters = {
        status: 'PENDING',
        trackId: 'track-123',
        search: 'javascript',
        limit: '10',
        offset: '0',
      };

      const result = submissionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('PENDING');
        expect(result.data.search).toBe('javascript');
      }
    });

    it('should validate status enum', () => {
      const filters = {
        status: 'INVALID_STATUS',
      };

      const result = submissionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(false);
    });

    it('should accept all valid statuses', () => {
      const statuses = ['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED', 'WITHDRAWN'];
      
      for (const status of statuses) {
        const result = submissionFiltersSchema.safeParse({ status });
        expect(result.success).toBe(true);
      }
    });

    it('should use default pagination values', () => {
      const result = submissionFiltersSchema.parse({});
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });
  });

  describe('updateSubmissionStatusSchema', () => {
    it('should validate status update', () => {
      const update = {
        status: 'ACCEPTED',
      };

      const result = updateSubmissionStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should allow publicNotes', () => {
      const update = {
        status: 'ACCEPTED',
        publicNotes: 'Great talk! Looking forward to it.',
      };

      const result = updateSubmissionStatusSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should require status', () => {
      const update = {
        publicNotes: 'Some notes',
      };

      const result = updateSubmissionStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const update = {
        status: 'MAYBE',
      };

      const result = updateSubmissionStatusSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('createMaterialSchema', () => {
    it('should validate a valid material', () => {
      const material = {
        type: 'slides',
        title: 'Talk Slides',
        description: 'Slides for the presentation',
        externalUrl: 'https://slides.example.com/my-talk',
      };

      const result = createMaterialSchema.safeParse(material);
      expect(result.success).toBe(true);
    });

    it('should require type', () => {
      const material = {
        title: 'My Slides',
      };

      const result = createMaterialSchema.safeParse(material);
      expect(result.success).toBe(false);
    });

    it('should require title', () => {
      const material = {
        type: 'slides',
      };

      const result = createMaterialSchema.safeParse(material);
      expect(result.success).toBe(false);
    });

    it('should validate externalUrl format', () => {
      const material = {
        type: 'slides',
        title: 'My Slides',
        externalUrl: 'not-a-url',
      };

      const result = createMaterialSchema.safeParse(material);
      expect(result.success).toBe(false);
    });

    it('should accept valid file info', () => {
      const material = {
        type: 'document',
        title: 'Handout PDF',
        fileName: 'handout.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
      };

      const result = createMaterialSchema.safeParse(material);
      expect(result.success).toBe(true);
    });
  });

  describe('createCoSpeakerSchema', () => {
    it('should validate a valid co-speaker', () => {
      const coSpeaker = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        bio: 'Senior Developer at Tech Corp',
      };

      const result = createCoSpeakerSchema.safeParse(coSpeaker);
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const coSpeaker = {
        email: 'jane@example.com',
      };

      const result = createCoSpeakerSchema.safeParse(coSpeaker);
      expect(result.success).toBe(false);
    });

    it('should validate email format', () => {
      const coSpeaker = {
        name: 'Jane Doe',
        email: 'not-an-email',
      };

      const result = createCoSpeakerSchema.safeParse(coSpeaker);
      expect(result.success).toBe(false);
    });

    it('should allow empty email', () => {
      const coSpeaker = {
        name: 'Jane Doe',
        email: '',
      };

      const result = createCoSpeakerSchema.safeParse(coSpeaker);
      expect(result.success).toBe(true);
    });

    it('should accept avatarUrl', () => {
      const coSpeaker = {
        name: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const result = createCoSpeakerSchema.safeParse(coSpeaker);
      expect(result.success).toBe(true);
    });
  });
});
