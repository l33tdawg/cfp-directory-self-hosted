/**
 * Typed Hook Contracts
 * @version 1.1.0
 *
 * Strongly typed hook definitions for the plugin system.
 * Instead of loose string-based hooks, we use typed contracts
 * that ensure type safety for both hook dispatchers and handlers.
 */

import type {
  Submission,
  SubmissionStatus,
  User,
  UserRole,
  Event,
  Review,
  ReviewRecommendation,
} from '@prisma/client';
import type { PluginContext } from '../types';

// =============================================================================
// HOOK PAYLOADS
// =============================================================================

/**
 * All hook payloads mapped by hook name
 */
export interface HookPayloads {
  // -------------------------------------------------------------------------
  // Submission Hooks
  // -------------------------------------------------------------------------
  
  /**
   * Fired when a new submission is created
   */
  'submission.created': {
    submission: Submission;
    speaker: {
      id: string;
      email: string;
      name: string | null;
    };
    event: {
      id: string;
      name: string;
      slug: string;
    };
  };
  
  /**
   * Fired when a submission's status changes
   */
  'submission.statusChanged': {
    submission: Submission;
    oldStatus: SubmissionStatus;
    newStatus: SubmissionStatus;
    changedBy: {
      id: string;
      role: UserRole;
      name: string | null;
    };
  };
  
  /**
   * Fired when a submission is updated (content changes)
   */
  'submission.updated': {
    submission: Submission;
    changes: Partial<Pick<Submission, 'title' | 'abstract' | 'outline' | 'targetAudience' | 'prerequisites'>>;
    updatedBy: {
      id: string;
      name: string | null;
    };
  };
  
  /**
   * Fired when a submission is deleted/withdrawn
   */
  'submission.deleted': {
    submissionId: string;
    eventId: string;
    speakerId: string;
    deletedBy: {
      id: string;
      role: UserRole;
    };
  };
  
  // -------------------------------------------------------------------------
  // User Hooks
  // -------------------------------------------------------------------------
  
  /**
   * Fired when a new user is registered
   */
  'user.registered': {
    user: Omit<User, 'passwordHash'>;
    registrationMethod: 'invite' | 'signup' | 'oauth';
    invitedBy?: {
      id: string;
      name: string | null;
    };
  };
  
  /**
   * Fired when a user's role changes
   */
  'user.roleChanged': {
    user: Omit<User, 'passwordHash'>;
    oldRole: UserRole;
    newRole: UserRole;
    changedBy: {
      id: string;
      name: string | null;
    };
  };
  
  /**
   * Fired when a user's profile is updated
   */
  'user.profileUpdated': {
    user: Omit<User, 'passwordHash'>;
    changes: Partial<Pick<User, 'name' | 'email' | 'image'>>;
  };
  
  // -------------------------------------------------------------------------
  // Review Hooks
  // -------------------------------------------------------------------------
  
  /**
   * Fired when a review is submitted
   */
  'review.submitted': {
    review: Review;
    submission: Submission;
    reviewer: {
      id: string;
      name: string | null;
      email: string;
    };
    isUpdate: boolean;
  };
  
  /**
   * Fired when a review is updated
   */
  'review.updated': {
    review: Review;
    submission: Submission;
    reviewer: {
      id: string;
      name: string | null;
    };
    changes: Partial<Pick<Review, 'contentScore' | 'presentationScore' | 'relevanceScore' | 'overallScore' | 'recommendation' | 'privateNotes' | 'publicNotes'>>;
  };
  
  /**
   * Fired when all required reviews are completed for a submission
   */
  'review.allCompleted': {
    submission: Submission;
    reviews: Review[];
    averageScore: number;
    recommendations: {
      recommendation: ReviewRecommendation;
      count: number;
    }[];
  };
  
  // -------------------------------------------------------------------------
  // Event Hooks
  // -------------------------------------------------------------------------
  
  /**
   * Fired when an event is published (made visible to speakers)
   */
  'event.published': {
    event: Event;
    cfpOpensAt: Date | null;
    cfpClosesAt: Date | null;
    publishedBy: {
      id: string;
      name: string | null;
    };
  };
  
  /**
   * Fired when an event's CFP opens
   */
  'event.cfpOpened': {
    event: Event;
    cfpClosesAt: Date | null;
    totalTracks: number;
  };
  
  /**
   * Fired when an event's CFP closes
   */
  'event.cfpClosed': {
    event: Event;
    totalSubmissions: number;
    submissionsByStatus: {
      status: SubmissionStatus;
      count: number;
    }[];
  };
  
  /**
   * Fired when an event is updated
   */
  'event.updated': {
    event: Event;
    changes: Partial<Event>;
    updatedBy: {
      id: string;
      name: string | null;
    };
  };
  
  // -------------------------------------------------------------------------
  // Email Hooks
  // -------------------------------------------------------------------------
  
  /**
   * Fired before an email is sent (can modify variables)
   */
  'email.beforeSend': {
    template: string;
    recipient: {
      email: string;
      name?: string;
    };
    variables: Record<string, unknown>;
    subject: string;
  };
  
  /**
   * Fired after an email is sent
   */
  'email.sent': {
    template: string;
    recipient: {
      email: string;
      name?: string;
    };
    subject: string;
    success: boolean;
    error?: string;
  };
}

// =============================================================================
// HOOK HANDLER TYPES
// =============================================================================

/**
 * Hook handler function type
 * Returns void for side-effect only hooks, or partial payload for hooks that can modify data
 */
export type HookHandler<K extends keyof HookPayloads> = (
  ctx: PluginContext,
  payload: HookPayloads[K]
) => Promise<void | Partial<HookPayloads[K]>>;

/**
 * Plugin hooks object - maps hook names to handlers
 */
export type PluginHooks = {
  [K in keyof HookPayloads]?: HookHandler<K>;
};

/**
 * List of all available hook names
 */
export type HookName = keyof HookPayloads;

/**
 * Array of all hook names for iteration
 */
export const HOOK_NAMES: HookName[] = [
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

// =============================================================================
// HOOK METADATA
// =============================================================================

/**
 * Hook metadata for documentation and admin UI
 */
export interface HookMetadata {
  name: HookName;
  description: string;
  category: 'submission' | 'user' | 'review' | 'event' | 'email';
  canModifyPayload: boolean;
}

/**
 * All hook metadata
 */
export const HOOK_METADATA: HookMetadata[] = [
  {
    name: 'submission.created',
    description: 'Fired when a new submission is created',
    category: 'submission',
    canModifyPayload: false,
  },
  {
    name: 'submission.statusChanged',
    description: 'Fired when a submission status changes (e.g., accepted, rejected)',
    category: 'submission',
    canModifyPayload: false,
  },
  {
    name: 'submission.updated',
    description: 'Fired when submission content is updated',
    category: 'submission',
    canModifyPayload: false,
  },
  {
    name: 'submission.deleted',
    description: 'Fired when a submission is deleted or withdrawn',
    category: 'submission',
    canModifyPayload: false,
  },
  {
    name: 'user.registered',
    description: 'Fired when a new user registers',
    category: 'user',
    canModifyPayload: false,
  },
  {
    name: 'user.roleChanged',
    description: 'Fired when a user role changes',
    category: 'user',
    canModifyPayload: false,
  },
  {
    name: 'user.profileUpdated',
    description: 'Fired when a user profile is updated',
    category: 'user',
    canModifyPayload: false,
  },
  {
    name: 'review.submitted',
    description: 'Fired when a review is submitted',
    category: 'review',
    canModifyPayload: false,
  },
  {
    name: 'review.updated',
    description: 'Fired when a review is updated',
    category: 'review',
    canModifyPayload: false,
  },
  {
    name: 'review.allCompleted',
    description: 'Fired when all required reviews for a submission are complete',
    category: 'review',
    canModifyPayload: false,
  },
  {
    name: 'event.published',
    description: 'Fired when an event is published',
    category: 'event',
    canModifyPayload: false,
  },
  {
    name: 'event.cfpOpened',
    description: 'Fired when CFP opens for an event',
    category: 'event',
    canModifyPayload: false,
  },
  {
    name: 'event.cfpClosed',
    description: 'Fired when CFP closes for an event',
    category: 'event',
    canModifyPayload: false,
  },
  {
    name: 'event.updated',
    description: 'Fired when an event is updated',
    category: 'event',
    canModifyPayload: false,
  },
  {
    name: 'email.beforeSend',
    description: 'Fired before an email is sent - can modify template variables',
    category: 'email',
    canModifyPayload: true,
  },
  {
    name: 'email.sent',
    description: 'Fired after an email is sent',
    category: 'email',
    canModifyPayload: false,
  },
];

/**
 * Get hook metadata by name
 */
export function getHookMetadata(hookName: HookName): HookMetadata | undefined {
  return HOOK_METADATA.find(h => h.name === hookName);
}

/**
 * Get hooks by category
 */
export function getHooksByCategory(category: HookMetadata['category']): HookMetadata[] {
  return HOOK_METADATA.filter(h => h.category === category);
}
