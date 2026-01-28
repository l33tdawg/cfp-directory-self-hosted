/**
 * Plugin Slot Registry
 * @version 1.4.0
 *
 * Manages plugin UI component registrations to extension slots.
 * Provides methods to register, unregister, and query slot components.
 */

import type { SlotName, SlotRegistration } from './types';
import type { PluginComponentProps } from '../types';
import { isValidSlotName } from './types';

// =============================================================================
// SLOT REGISTRY
// =============================================================================

class SlotRegistry {
  /** Map of slot name to registered components */
  private slots: Map<SlotName, SlotRegistration[]> = new Map();

  /**
   * Register a component to a slot
   * Returns false if the slot name is invalid
   */
  register(registration: SlotRegistration): boolean {
    if (!isValidSlotName(registration.slot)) {
      return false;
    }

    if (!this.slots.has(registration.slot)) {
      this.slots.set(registration.slot, []);
    }

    const registrations = this.slots.get(registration.slot)!;

    // Prevent duplicate registration from same plugin to same slot
    const existingIndex = registrations.findIndex(
      (r) =>
        r.pluginName === registration.pluginName &&
        r.component === registration.component
    );

    if (existingIndex !== -1) {
      // Update existing registration
      registrations[existingIndex] = registration;
    } else {
      registrations.push(registration);
    }

    // Sort by order (lower first)
    registrations.sort((a, b) => a.order - b.order);

    return true;
  }

  /**
   * Unregister a specific component from a slot
   */
  unregister(
    pluginName: string,
    slot: SlotName,
    component: React.ComponentType<PluginComponentProps>
  ): boolean {
    const registrations = this.slots.get(slot);
    if (!registrations) {
      return false;
    }

    const index = registrations.findIndex(
      (r) => r.pluginName === pluginName && r.component === component
    );

    if (index === -1) {
      return false;
    }

    registrations.splice(index, 1);
    return true;
  }

  /**
   * Unregister all components for a plugin
   * Used when a plugin is disabled or unregistered
   */
  unregisterPlugin(pluginName: string): number {
    let removedCount = 0;

    for (const [slot, registrations] of this.slots) {
      const before = registrations.length;
      const filtered = registrations.filter((r) => r.pluginName !== pluginName);
      removedCount += before - filtered.length;
      this.slots.set(slot, filtered);
    }

    return removedCount;
  }

  /**
   * Get all registered components for a slot, sorted by order
   */
  getSlotComponents(slot: SlotName): SlotRegistration[] {
    return this.slots.get(slot) || [];
  }

  /**
   * Check if a slot has any registered components
   */
  hasComponents(slot: SlotName): boolean {
    const registrations = this.slots.get(slot);
    return !!registrations && registrations.length > 0;
  }

  /**
   * Get the count of components registered to a slot
   */
  getComponentCount(slot: SlotName): number {
    return this.slots.get(slot)?.length || 0;
  }

  /**
   * Get all slots that have registered components
   */
  getActiveSlots(): SlotName[] {
    const active: SlotName[] = [];
    for (const [slot, registrations] of this.slots) {
      if (registrations.length > 0) {
        active.push(slot);
      }
    }
    return active;
  }

  /**
   * Get all registrations for a plugin across all slots
   */
  getPluginRegistrations(pluginName: string): SlotRegistration[] {
    const result: SlotRegistration[] = [];
    for (const registrations of this.slots.values()) {
      for (const reg of registrations) {
        if (reg.pluginName === pluginName) {
          result.push(reg);
        }
      }
    }
    return result;
  }

  /**
   * Get total count of all registrations across all slots
   */
  totalCount(): number {
    let count = 0;
    for (const registrations of this.slots.values()) {
      count += registrations.length;
    }
    return count;
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.slots.clear();
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

// Use globalThis to ensure the singleton persists across all modules in Next.js
const SLOT_REGISTRY_KEY = '__slot_registry__';

declare global {
  // eslint-disable-next-line no-var
  var __slot_registry__: SlotRegistry | undefined;
}

/**
 * Get the slot registry singleton
 */
export function getSlotRegistry(): SlotRegistry {
  if (!globalThis[SLOT_REGISTRY_KEY]) {
    globalThis[SLOT_REGISTRY_KEY] = new SlotRegistry();
  }
  return globalThis[SLOT_REGISTRY_KEY];
}

/**
 * Reset the slot registry (for testing)
 */
export function resetSlotRegistry(): void {
  if (globalThis[SLOT_REGISTRY_KEY]) {
    globalThis[SLOT_REGISTRY_KEY].clear();
  }
  globalThis[SLOT_REGISTRY_KEY] = undefined;
}
