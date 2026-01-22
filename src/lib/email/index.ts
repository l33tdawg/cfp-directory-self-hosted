/**
 * Email Module Index
 * 
 * Re-exports email service and helper functions.
 */

export { 
  emailService, 
  type EmailOptions, 
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendSubmissionConfirmationEmail,
  sendSubmissionStatusEmail,
  sendNewMessageEmail,
  sendReviewInvitationEmail,
} from './email-service';

export type { EmailSendResult } from '@/types/email-templates';
