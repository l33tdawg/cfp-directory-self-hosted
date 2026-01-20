/**
 * Message Validation Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createMessageSchema,
  markReadSchema,
} from '@/lib/validations/message';

describe('Message Validation Schemas', () => {
  describe('createMessageSchema', () => {
    it('should validate a valid message', () => {
      const message = {
        body: 'Thank you for your submission! We have a few questions about your talk.',
        subject: 'Question about your submission',
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('should validate message without subject', () => {
      const message = {
        body: 'Just a quick follow-up message.',
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('should require body', () => {
      const message = {
        subject: 'Important',
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should require non-empty body', () => {
      const message = {
        body: '',
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should require minimum body length', () => {
      const message = {
        body: 'Hi',
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should enforce body max length', () => {
      const message = {
        body: 'a'.repeat(10001),
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should enforce subject max length', () => {
      const message = {
        body: 'Valid message body here.',
        subject: 'a'.repeat(201),
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(false);
    });

    it('should allow empty subject string', () => {
      const message = {
        body: 'This is a message without a subject line.',
        subject: '',
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
    });

    it('should allow parentId for threading', () => {
      const message = {
        body: 'This is a reply to a previous message.',
        parentId: 'msg-123',
      };

      const result = createMessageSchema.safeParse(message);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parentId).toBe('msg-123');
      }
    });
  });

  describe('markReadSchema', () => {
    it('should validate marking as read', () => {
      const data = {
        messageIds: ['msg-1', 'msg-2', 'msg-3'],
      };

      const result = markReadSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require messageIds', () => {
      const result = markReadSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should require non-empty array', () => {
      const data = {
        messageIds: [],
      };

      const result = markReadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept single message id', () => {
      const data = {
        messageIds: ['msg-1'],
      };

      const result = markReadSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should require string array', () => {
      const data = {
        messageIds: [1, 2, 3],
      };

      const result = markReadSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
