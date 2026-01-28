/**
 * Slot Registry Tests
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Prisma before importing registry
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pluginLog: { create: vi.fn().mockResolvedValue({}) },
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
  getSlotRegistry,
  resetSlotRegistry,
} from '@/lib/plugins/slots/registry';
import type { SlotRegistration } from '@/lib/plugins/slots/types';
import type { PluginComponentProps, PluginContext } from '@/lib/plugins/types';

// Simple mock components for testing
const MockComponentA: React.ComponentType<PluginComponentProps> = () => null;
const MockComponentB: React.ComponentType<PluginComponentProps> = () => null;
const MockComponentC: React.ComponentType<PluginComponentProps> = () => null;

// Mock plugin context
const mockContext: PluginContext = {
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  config: {},
  submissions: {} as any,
  users: {} as any,
  events: {} as any,
  reviews: {} as any,
  storage: {} as any,
  email: {} as any,
};

/** Helper to create a registration with default context */
function reg(
  overrides: Partial<SlotRegistration> & Pick<SlotRegistration, 'pluginName' | 'pluginId' | 'slot' | 'component' | 'order'>
): SlotRegistration {
  return { context: mockContext, ...overrides };
}

describe('Slot Registry', () => {
  beforeEach(() => {
    resetSlotRegistry();
  });

  afterEach(() => {
    resetSlotRegistry();
  });

  describe('getSlotRegistry', () => {
    it('should return singleton instance', () => {
      const registry1 = getSlotRegistry();
      const registry2 = getSlotRegistry();

      expect(registry1).toBe(registry2);
    });
  });

  describe('register', () => {
    it('should register a component to a slot', () => {
      const registry = getSlotRegistry();
      const registration = reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id-1',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      });

      const result = registry.register(registration);

      expect(result).toBe(true);
      expect(registry.getSlotComponents('dashboard.widgets')).toHaveLength(1);
    });

    it('should return false for invalid slot name', () => {
      const registry = getSlotRegistry();
      const registration = {
        pluginName: 'test-plugin',
        pluginId: 'db-id-1',
        slot: 'invalid.slot' as never,
        component: MockComponentA,
        context: mockContext,
        order: 100,
      };

      const result = registry.register(registration);

      expect(result).toBe(false);
    });

    it('should allow multiple components in the same slot', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'plugin-a',
        pluginId: 'db-a',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'plugin-b',
        pluginId: 'db-b',
        slot: 'dashboard.widgets',
        component: MockComponentB,
        order: 200,
      }));

      expect(registry.getSlotComponents('dashboard.widgets')).toHaveLength(2);
    });

    it('should sort components by order (lower first)', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'plugin-b',
        pluginId: 'db-b',
        slot: 'dashboard.widgets',
        component: MockComponentB,
        order: 200,
      }));

      registry.register(reg({
        pluginName: 'plugin-a',
        pluginId: 'db-a',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 50,
      }));

      const components = registry.getSlotComponents('dashboard.widgets');
      expect(components[0].pluginName).toBe('plugin-a');
      expect(components[1].pluginName).toBe('plugin-b');
    });

    it('should update existing registration from same plugin with same component', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 50,
      }));

      const components = registry.getSlotComponents('dashboard.widgets');
      expect(components).toHaveLength(1);
      expect(components[0].order).toBe(50);
    });

    it('should allow same plugin to register different components to same slot', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentB,
        order: 200,
      }));

      expect(registry.getSlotComponents('dashboard.widgets')).toHaveLength(2);
    });
  });

  describe('unregister', () => {
    it('should unregister a specific component', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      const result = registry.unregister('test-plugin', 'dashboard.widgets', MockComponentA);

      expect(result).toBe(true);
      expect(registry.getSlotComponents('dashboard.widgets')).toHaveLength(0);
    });

    it('should return false for non-existent registration', () => {
      const registry = getSlotRegistry();

      const result = registry.unregister('test-plugin', 'dashboard.widgets', MockComponentA);

      expect(result).toBe(false);
    });

    it('should only remove the specified component', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentB,
        order: 200,
      }));

      registry.unregister('test-plugin', 'dashboard.widgets', MockComponentA);

      const components = registry.getSlotComponents('dashboard.widgets');
      expect(components).toHaveLength(1);
      expect(components[0].component).toBe(MockComponentB);
    });
  });

  describe('unregisterPlugin', () => {
    it('should unregister all components for a plugin', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'admin.sidebar.items',
        component: MockComponentB,
        order: 100,
      }));

      const removedCount = registry.unregisterPlugin('test-plugin');

      expect(removedCount).toBe(2);
      expect(registry.getSlotComponents('dashboard.widgets')).toHaveLength(0);
      expect(registry.getSlotComponents('admin.sidebar.items')).toHaveLength(0);
    });

    it('should return 0 when plugin has no registrations', () => {
      const registry = getSlotRegistry();

      const removedCount = registry.unregisterPlugin('non-existent');

      expect(removedCount).toBe(0);
    });

    it('should not affect other plugins', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'plugin-a',
        pluginId: 'db-a',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'plugin-b',
        pluginId: 'db-b',
        slot: 'dashboard.widgets',
        component: MockComponentB,
        order: 200,
      }));

      registry.unregisterPlugin('plugin-a');

      const components = registry.getSlotComponents('dashboard.widgets');
      expect(components).toHaveLength(1);
      expect(components[0].pluginName).toBe('plugin-b');
    });
  });

  describe('getSlotComponents', () => {
    it('should return empty array for slot with no components', () => {
      const registry = getSlotRegistry();

      expect(registry.getSlotComponents('dashboard.widgets')).toEqual([]);
    });

    it('should return components sorted by order', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'plugin-c',
        pluginId: 'db-c',
        slot: 'submission.review.sidebar',
        component: MockComponentC,
        order: 300,
      }));

      registry.register(reg({
        pluginName: 'plugin-a',
        pluginId: 'db-a',
        slot: 'submission.review.sidebar',
        component: MockComponentA,
        order: 10,
      }));

      registry.register(reg({
        pluginName: 'plugin-b',
        pluginId: 'db-b',
        slot: 'submission.review.sidebar',
        component: MockComponentB,
        order: 100,
      }));

      const components = registry.getSlotComponents('submission.review.sidebar');
      expect(components[0].order).toBe(10);
      expect(components[1].order).toBe(100);
      expect(components[2].order).toBe(300);
    });
  });

  describe('hasComponents', () => {
    it('should return false for empty slot', () => {
      const registry = getSlotRegistry();

      expect(registry.hasComponents('dashboard.widgets')).toBe(false);
    });

    it('should return true for slot with components', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      expect(registry.hasComponents('dashboard.widgets')).toBe(true);
    });
  });

  describe('getComponentCount', () => {
    it('should return 0 for empty slot', () => {
      const registry = getSlotRegistry();

      expect(registry.getComponentCount('dashboard.widgets')).toBe(0);
    });

    it('should return correct count', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'plugin-a',
        pluginId: 'db-a',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'plugin-b',
        pluginId: 'db-b',
        slot: 'dashboard.widgets',
        component: MockComponentB,
        order: 200,
      }));

      expect(registry.getComponentCount('dashboard.widgets')).toBe(2);
    });
  });

  describe('getActiveSlots', () => {
    it('should return empty array when no slots have components', () => {
      const registry = getSlotRegistry();

      expect(registry.getActiveSlots()).toEqual([]);
    });

    it('should return only slots that have components', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'admin.sidebar.items',
        component: MockComponentB,
        order: 100,
      }));

      const activeSlots = registry.getActiveSlots();
      expect(activeSlots).toHaveLength(2);
      expect(activeSlots).toContain('dashboard.widgets');
      expect(activeSlots).toContain('admin.sidebar.items');
    });
  });

  describe('getPluginRegistrations', () => {
    it('should return empty array for unknown plugin', () => {
      const registry = getSlotRegistry();

      expect(registry.getPluginRegistrations('non-existent')).toEqual([]);
    });

    it('should return all registrations for a plugin', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'admin.sidebar.items',
        component: MockComponentB,
        order: 200,
      }));

      const registrations = registry.getPluginRegistrations('test-plugin');
      expect(registrations).toHaveLength(2);
    });

    it('should not include registrations from other plugins', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'plugin-a',
        pluginId: 'db-a',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'plugin-b',
        pluginId: 'db-b',
        slot: 'dashboard.widgets',
        component: MockComponentB,
        order: 200,
      }));

      const registrations = registry.getPluginRegistrations('plugin-a');
      expect(registrations).toHaveLength(1);
      expect(registrations[0].pluginName).toBe('plugin-a');
    });
  });

  describe('totalCount', () => {
    it('should return 0 when empty', () => {
      const registry = getSlotRegistry();

      expect(registry.totalCount()).toBe(0);
    });

    it('should return total across all slots', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'plugin-a',
        pluginId: 'db-a',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'plugin-b',
        pluginId: 'db-b',
        slot: 'admin.sidebar.items',
        component: MockComponentB,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'plugin-c',
        pluginId: 'db-c',
        slot: 'dashboard.widgets',
        component: MockComponentC,
        order: 200,
      }));

      expect(registry.totalCount()).toBe(3);
    });
  });

  describe('clear', () => {
    it('should remove all registrations', () => {
      const registry = getSlotRegistry();

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      registry.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'admin.sidebar.items',
        component: MockComponentB,
        order: 100,
      }));

      registry.clear();

      expect(registry.totalCount()).toBe(0);
      expect(registry.getActiveSlots()).toEqual([]);
    });
  });

  describe('resetSlotRegistry', () => {
    it('should create new instance after reset', () => {
      const registry1 = getSlotRegistry();

      registry1.register(reg({
        pluginName: 'test-plugin',
        pluginId: 'db-id',
        slot: 'dashboard.widgets',
        component: MockComponentA,
        order: 100,
      }));

      resetSlotRegistry();

      const registry2 = getSlotRegistry();
      expect(registry2.totalCount()).toBe(0);
    });
  });
});
