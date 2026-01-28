/**
 * Plugin UI Slot Type Definitions
 * @version 1.5.0
 *
 * Defines the available UI extension slots where plugins can inject components.
 */

import type { PluginComponentProps, ClientPluginContext } from '../types';

// =============================================================================
// SLOT NAMES
// =============================================================================

/**
 * Static slot names where plugins can render UI components
 */
export type StaticSlotName =
  | 'submission.review.sidebar'
  | 'submission.review.panel'
  | 'submission.detail.tabs'
  | 'dashboard.widgets'
  | 'admin.sidebar.items';

/**
 * Dynamic slot pattern for plugin admin pages
 * Pattern: admin.pages.{pluginName}
 */
export type DynamicSlotName = `admin.pages.${string}`;

/**
 * All available slot names (static + dynamic)
 */
export type SlotName = StaticSlotName | DynamicSlotName;

/**
 * Array of all valid static slot names
 */
export const SLOT_NAMES: StaticSlotName[] = [
  'submission.review.sidebar',
  'submission.review.panel',
  'submission.detail.tabs',
  'dashboard.widgets',
  'admin.sidebar.items',
];

// =============================================================================
// SLOT DEFINITIONS
// =============================================================================

/**
 * Metadata describing a UI slot
 */
export interface SlotDefinition {
  /** Slot identifier */
  name: SlotName;
  /** Human-readable description */
  description: string;
  /** Where this slot appears in the UI */
  location: string;
  /** Whether slot passes contextual data to components */
  acceptsData: boolean;
  /** Description of data passed to components (if acceptsData is true) */
  dataDescription?: string;
}

/**
 * Definitions for all available UI slots
 */
export const SLOT_DEFINITIONS: Record<SlotName, SlotDefinition> = {
  'submission.review.sidebar': {
    name: 'submission.review.sidebar',
    description: 'Sidebar panels on the submission review page',
    location: 'Review page sidebar',
    acceptsData: true,
    dataDescription: 'Receives { submissionId, eventId } for the current review',
  },
  'submission.review.panel': {
    name: 'submission.review.panel',
    description: 'Panels below or beside reviews on the review page',
    location: 'Below/beside reviews',
    acceptsData: true,
    dataDescription: 'Receives { submissionId, eventId } for the current review',
  },
  'submission.detail.tabs': {
    name: 'submission.detail.tabs',
    description: 'Additional tabs on the submission detail page',
    location: 'Submission detail tabs',
    acceptsData: true,
    dataDescription: 'Receives { submissionId, eventId } for the current submission',
  },
  'dashboard.widgets': {
    name: 'dashboard.widgets',
    description: 'Custom widgets on the dashboard',
    location: 'Dashboard',
    acceptsData: false,
  },
  'admin.sidebar.items': {
    name: 'admin.sidebar.items',
    description: 'Additional menu items in the admin sidebar',
    location: 'Admin sidebar',
    acceptsData: true,
    dataDescription: 'Receives { pathname, pluginBasePath } for active link detection and URL building',
  },
};

// =============================================================================
// SLOT REGISTRATION
// =============================================================================

/**
 * A component registered to a slot by a plugin
 */
export interface SlotRegistration {
  /** Name of the plugin that registered this component */
  pluginName: string;
  /** Database ID of the plugin */
  pluginId: string;
  /** Target slot name */
  slot: SlotName;
  /** The React component to render (receives PluginComponentProps) */
  component: React.ComponentType<PluginComponentProps>;
  /** Sanitized plugin context to inject when rendering (client-safe) */
  context: ClientPluginContext;
  /** Display order (lower = first, default 100) */
  order: number;
  /** Additional metadata for the registration (e.g., page path for admin pages) */
  metadata?: Record<string, unknown>;
}

/**
 * Props passed to the PluginSlot host component
 */
export interface SlotComponentProps {
  /** Slot-specific contextual data */
  data?: Record<string, unknown>;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Check if a string is a valid static slot name
 */
export function isStaticSlotName(name: string): name is StaticSlotName {
  return SLOT_NAMES.includes(name as StaticSlotName);
}

/**
 * Check if a string is a valid dynamic admin pages slot name
 * Pattern: admin.pages.{pluginName}
 */
export function isDynamicAdminPagesSlot(name: string): name is DynamicSlotName {
  return /^admin\.pages\.[a-z0-9-]+$/.test(name);
}

/**
 * Check if a string is a valid slot name (static or dynamic)
 */
export function isValidSlotName(name: string): name is SlotName {
  return isStaticSlotName(name) || isDynamicAdminPagesSlot(name);
}

/**
 * Get the definition for a slot
 */
export function getSlotDefinition(name: SlotName): SlotDefinition {
  return SLOT_DEFINITIONS[name];
}
