/**
 * Email Template Types
 * 
 * Type definitions for the email template system.
 */

// =============================================================================
// Template Types (matching database values)
// =============================================================================

export type EmailTemplateType =
  // Authentication
  | 'welcome'
  | 'password_reset'
  | 'user_invitation'
  | 'email_verification'
  // Submissions
  | 'submission_confirmation'
  | 'submission_accepted'
  | 'submission_rejected'
  | 'submission_waitlisted'
  | 'submission_under_review'
  // Communication
  | 'new_message'
  | 'review_invitation'
  | 'review_assignment'
  // Announcements
  | 'event_published'
  | 'cfp_opening'
  | 'cfp_closing_reminder'
  | 'event_reminder';

export type EmailTemplateCategory =
  | 'authentication'
  | 'submissions'
  | 'communication'
  | 'announcements';

// =============================================================================
// Template Interface
// =============================================================================

export interface EmailTemplate {
  id: string;
  type: EmailTemplateType;
  name: string;
  subject: string;
  content: string;
  variables: Record<string, string>;
  description: string | null;
  category: EmailTemplateCategory;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplateInput {
  type: EmailTemplateType;
  name: string;
  subject: string;
  content: string;
  variables?: Record<string, string>;
  description?: string;
  category: EmailTemplateCategory;
  enabled?: boolean;
}

export interface EmailTemplateUpdate {
  name?: string;
  subject?: string;
  content?: string;
  variables?: Record<string, string>;
  description?: string;
  category?: EmailTemplateCategory;
  enabled?: boolean;
}

// =============================================================================
// Template Labels for UI
// =============================================================================

export const EMAIL_TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  // Authentication
  welcome: 'Welcome Email',
  password_reset: 'Password Reset',
  user_invitation: 'Platform Invitation',
  email_verification: 'Email Verification',
  // Submissions
  submission_confirmation: 'Submission Confirmation',
  submission_accepted: 'Submission Accepted',
  submission_rejected: 'Submission Not Selected',
  submission_waitlisted: 'Submission Waitlisted',
  submission_under_review: 'Submission Under Review',
  // Communication
  new_message: 'New Message',
  review_invitation: 'Review Team Invitation',
  review_assignment: 'Review Assignment',
  // Announcements
  event_published: 'Event Published',
  cfp_opening: 'CFP Opening',
  cfp_closing_reminder: 'CFP Closing Reminder',
  event_reminder: 'Event Reminder',
};

export const EMAIL_TEMPLATE_CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  authentication: 'Authentication',
  submissions: 'Submissions',
  communication: 'Communication',
  announcements: 'Announcements',
};

// =============================================================================
// Common Variables
// =============================================================================

/**
 * Common variables available across multiple templates
 */
export const COMMON_EMAIL_VARIABLES = {
  siteName: 'Platform name',
  siteUrl: 'Platform URL',
  userName: 'Recipient\'s display name',
  userEmail: 'Recipient\'s email address',
} as const;

/**
 * Variables specific to submission-related templates
 */
export const SUBMISSION_EMAIL_VARIABLES = {
  ...COMMON_EMAIL_VARIABLES,
  eventName: 'Event name',
  submissionTitle: 'Talk/paper title',
  submissionUrl: 'Link to submission details',
  feedbackSection: 'Optional feedback from reviewers (HTML)',
} as const;

/**
 * Variables specific to event-related templates
 */
export const EVENT_EMAIL_VARIABLES = {
  ...COMMON_EMAIL_VARIABLES,
  eventName: 'Event name',
  eventUrl: 'Link to event page',
  eventDate: 'Event date',
  eventTime: 'Event time',
  eventLocation: 'Event location or virtual link',
  cfpOpensAt: 'CFP opening date',
  cfpClosesAt: 'CFP closing date',
} as const;

// =============================================================================
// Email Send Options
// =============================================================================

export interface SendTemplatedEmailOptions {
  to: string | string[];
  templateType: EmailTemplateType;
  variables: Record<string, string>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =============================================================================
// SMTP Configuration
// =============================================================================

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromName: string;
  fromEmail: string;
}
