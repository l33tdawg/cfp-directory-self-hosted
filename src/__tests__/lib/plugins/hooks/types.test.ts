/**
 * Hook Types Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  HOOK_NAMES,
  HOOK_METADATA,
  getHookMetadata,
  getHooksByCategory,
} from '@/lib/plugins/hooks/types';

describe('Hook Types', () => {
  describe('HOOK_NAMES', () => {
    it('should contain all expected hooks', () => {
      const expectedHooks = [
        'submission.created',
        'submission.statusChanged',
        'submission.updated',
        'submission.deleted',
        'user.registered',
        'user.roleChanged',
        'user.profileUpdated',
        'review.submitted',
        'review.updated',
        'review.allCompleted',
        'event.published',
        'event.cfpOpened',
        'event.cfpClosed',
        'event.updated',
        'email.beforeSend',
        'email.sent',
      ];

      expect(HOOK_NAMES).toEqual(expect.arrayContaining(expectedHooks));
      expect(HOOK_NAMES).toHaveLength(expectedHooks.length);
    });
  });

  describe('HOOK_METADATA', () => {
    it('should have metadata for all hooks', () => {
      expect(HOOK_METADATA).toHaveLength(HOOK_NAMES.length);
      
      for (const hookName of HOOK_NAMES) {
        const metadata = HOOK_METADATA.find(h => h.name === hookName);
        expect(metadata).toBeDefined();
      }
    });

    it('should have required fields in metadata', () => {
      for (const metadata of HOOK_METADATA) {
        expect(metadata).toHaveProperty('name');
        expect(metadata).toHaveProperty('description');
        expect(metadata).toHaveProperty('category');
        expect(metadata).toHaveProperty('canModifyPayload');
        expect(typeof metadata.name).toBe('string');
        expect(typeof metadata.description).toBe('string');
        expect(typeof metadata.canModifyPayload).toBe('boolean');
      }
    });

    it('should categorize hooks correctly', () => {
      const submissionHooks = HOOK_METADATA.filter(h => h.category === 'submission');
      const userHooks = HOOK_METADATA.filter(h => h.category === 'user');
      const reviewHooks = HOOK_METADATA.filter(h => h.category === 'review');
      const eventHooks = HOOK_METADATA.filter(h => h.category === 'event');
      const emailHooks = HOOK_METADATA.filter(h => h.category === 'email');

      expect(submissionHooks.length).toBe(4);
      expect(userHooks.length).toBe(3);
      expect(reviewHooks.length).toBe(3);
      expect(eventHooks.length).toBe(4);
      expect(emailHooks.length).toBe(2);
    });

    it('should mark email.beforeSend as modifiable', () => {
      const emailBeforeSend = HOOK_METADATA.find(h => h.name === 'email.beforeSend');
      expect(emailBeforeSend?.canModifyPayload).toBe(true);
    });
  });

  describe('getHookMetadata', () => {
    it('should return metadata for existing hook', () => {
      const metadata = getHookMetadata('submission.created');
      
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('submission.created');
      expect(metadata?.category).toBe('submission');
    });

    it('should return undefined for non-existent hook', () => {
      const metadata = getHookMetadata('non.existent' as any);
      expect(metadata).toBeUndefined();
    });
  });

  describe('getHooksByCategory', () => {
    it('should return hooks for submission category', () => {
      const hooks = getHooksByCategory('submission');
      
      expect(hooks.length).toBe(4);
      expect(hooks.every(h => h.category === 'submission')).toBe(true);
    });

    it('should return hooks for user category', () => {
      const hooks = getHooksByCategory('user');
      
      expect(hooks.length).toBe(3);
      expect(hooks.every(h => h.category === 'user')).toBe(true);
    });

    it('should return hooks for email category', () => {
      const hooks = getHooksByCategory('email');
      
      expect(hooks.length).toBe(2);
      expect(hooks.map(h => h.name)).toContain('email.beforeSend');
      expect(hooks.map(h => h.name)).toContain('email.sent');
    });

    it('should return empty array for invalid category', () => {
      const hooks = getHooksByCategory('invalid' as any);
      expect(hooks).toEqual([]);
    });
  });
});
