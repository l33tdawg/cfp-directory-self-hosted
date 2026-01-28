/**
 * Slot Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  SLOT_NAMES,
  SLOT_DEFINITIONS,
  isValidSlotName,
  isStaticSlotName,
  isDynamicAdminPagesSlot,
  getSlotDefinition,
} from '@/lib/plugins/slots/types';
import type { StaticSlotName } from '@/lib/plugins/slots/types';

describe('Slot Types', () => {
  describe('SLOT_NAMES', () => {
    it('should contain all expected static slot names', () => {
      const expectedSlots: StaticSlotName[] = [
        'submission.review.sidebar',
        'submission.review.panel',
        'submission.detail.tabs',
        'dashboard.widgets',
        'admin.sidebar.items',
      ];

      expect(SLOT_NAMES).toEqual(expectedSlots);
    });

    it('should have 5 static slots defined', () => {
      expect(SLOT_NAMES).toHaveLength(5);
    });
  });

  describe('SLOT_DEFINITIONS', () => {
    it('should have a definition for every slot name', () => {
      for (const name of SLOT_NAMES) {
        expect(SLOT_DEFINITIONS).toHaveProperty(name);
      }
    });

    it('should have correct structure for each definition', () => {
      for (const name of SLOT_NAMES) {
        const definition = SLOT_DEFINITIONS[name];

        expect(definition.name).toBe(name);
        expect(typeof definition.description).toBe('string');
        expect(definition.description.length).toBeGreaterThan(0);
        expect(typeof definition.location).toBe('string');
        expect(definition.location.length).toBeGreaterThan(0);
        expect(typeof definition.acceptsData).toBe('boolean');
      }
    });

    it('should have dataDescription when acceptsData is true', () => {
      for (const name of SLOT_NAMES) {
        const definition = SLOT_DEFINITIONS[name];
        if (definition.acceptsData) {
          expect(typeof definition.dataDescription).toBe('string');
          expect(definition.dataDescription!.length).toBeGreaterThan(0);
        }
      }
    });

    it('should mark submission slots as accepting data', () => {
      expect(SLOT_DEFINITIONS['submission.review.sidebar'].acceptsData).toBe(true);
      expect(SLOT_DEFINITIONS['submission.review.panel'].acceptsData).toBe(true);
      expect(SLOT_DEFINITIONS['submission.detail.tabs'].acceptsData).toBe(true);
    });

    it('should mark dashboard as not accepting data', () => {
      expect(SLOT_DEFINITIONS['dashboard.widgets'].acceptsData).toBe(false);
    });

    it('should mark admin sidebar as accepting data', () => {
      expect(SLOT_DEFINITIONS['admin.sidebar.items'].acceptsData).toBe(true);
      expect(SLOT_DEFINITIONS['admin.sidebar.items'].dataDescription).toContain('pathname');
      expect(SLOT_DEFINITIONS['admin.sidebar.items'].dataDescription).toContain('pluginBasePath');
    });
  });

  describe('isStaticSlotName', () => {
    it('should return true for valid static slot names', () => {
      for (const name of SLOT_NAMES) {
        expect(isStaticSlotName(name)).toBe(true);
      }
    });

    it('should return false for invalid static slot names', () => {
      expect(isStaticSlotName('invalid.slot')).toBe(false);
      expect(isStaticSlotName('')).toBe(false);
      expect(isStaticSlotName('admin.pages.test-plugin')).toBe(false);
    });
  });

  describe('isDynamicAdminPagesSlot', () => {
    it('should return true for valid admin.pages.* patterns', () => {
      expect(isDynamicAdminPagesSlot('admin.pages.test-plugin')).toBe(true);
      expect(isDynamicAdminPagesSlot('admin.pages.ai-paper-reviewer')).toBe(true);
      expect(isDynamicAdminPagesSlot('admin.pages.my-plugin123')).toBe(true);
    });

    it('should return false for invalid patterns', () => {
      expect(isDynamicAdminPagesSlot('admin.pages.')).toBe(false);
      expect(isDynamicAdminPagesSlot('admin.pages')).toBe(false);
      expect(isDynamicAdminPagesSlot('admin.pages.Test-Plugin')).toBe(false); // Uppercase
      expect(isDynamicAdminPagesSlot('admin.pages.test plugin')).toBe(false); // Space
      expect(isDynamicAdminPagesSlot('dashboard.widgets')).toBe(false);
      expect(isDynamicAdminPagesSlot('')).toBe(false);
    });
  });

  describe('isValidSlotName', () => {
    it('should return true for valid static slot names', () => {
      for (const name of SLOT_NAMES) {
        expect(isValidSlotName(name)).toBe(true);
      }
    });

    it('should return true for valid dynamic admin.pages.* slot names', () => {
      expect(isValidSlotName('admin.pages.test-plugin')).toBe(true);
      expect(isValidSlotName('admin.pages.ai-paper-reviewer')).toBe(true);
    });

    it('should return false for invalid slot names', () => {
      expect(isValidSlotName('invalid.slot')).toBe(false);
      expect(isValidSlotName('')).toBe(false);
      expect(isValidSlotName('submission')).toBe(false);
      expect(isValidSlotName('submission.review')).toBe(false);
      expect(isValidSlotName('admin.pages.')).toBe(false);
    });
  });

  describe('getSlotDefinition', () => {
    it('should return the correct definition for a slot', () => {
      const definition = getSlotDefinition('submission.review.sidebar');

      expect(definition.name).toBe('submission.review.sidebar');
      expect(definition.description).toBe('Sidebar panels on the submission review page');
      expect(definition.location).toBe('Review page sidebar');
      expect(definition.acceptsData).toBe(true);
    });

    it('should return definitions for all slots', () => {
      for (const name of SLOT_NAMES) {
        const definition = getSlotDefinition(name);
        expect(definition).toBeDefined();
        expect(definition.name).toBe(name);
      }
    });
  });
});
