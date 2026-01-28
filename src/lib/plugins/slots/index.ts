/**
 * Plugin UI Slots Module
 * @version 1.4.0
 */

// Types
export type {
  SlotName,
  SlotDefinition,
  SlotRegistration,
  SlotComponentProps,
} from './types';

export {
  SLOT_NAMES,
  SLOT_DEFINITIONS,
  isValidSlotName,
  getSlotDefinition,
} from './types';

// Registry
export {
  getSlotRegistry,
  resetSlotRegistry,
} from './registry';
