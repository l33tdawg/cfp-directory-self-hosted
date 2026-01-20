/**
 * Email Templates
 * 
 * All email templates for the self-hosted CFP platform.
 */

import { emailLayout } from '../email-service';
import { config } from '@/lib/env';

// ============================================================================
// Welcome Email
// ============================================================================

export interface WelcomeEmailData {
  userName: string;
  isFirstUser: boolean;
}

export function welcomeEmail(data: WelcomeEmailData): { subject: string; html: string } {
  const appUrl = config.app.url;
  
  const content = `
    <h1>Welcome to ${config.app.name}!</h1>
    <p>Hi ${data.userName},</p>
    <p>Thank you for registering. Your account has been created successfully.</p>
    ${data.isFirstUser ? `
      <div class="info-box">
        <strong>You are the first user!</strong>
        <p style="margin-bottom: 0;">You have been automatically granted administrator privileges.</p>
      </div>
    ` : ''}
    <p>You can now:</p>
    <ul>
      <li>Create or join organizations</li>
      <li>Create events with CFPs</li>
      <li>Submit talks to events</li>
      <li>Review submissions</li>
    </ul>
    <p style="text-align: center;">
      <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
    </p>
    <p>If you have any questions, feel free to reach out.</p>
  `;
  
  return {
    subject: `Welcome to ${config.app.name}!`,
    html: emailLayout(content, { preheader: 'Your account has been created' }),
  };
}

// ============================================================================
// Password Reset Email
// ============================================================================

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
}

export function passwordResetEmail(data: PasswordResetEmailData): { subject: string; html: string } {
  const content = `
    <h1>Reset Your Password</h1>
    <p>Hi ${data.userName},</p>
    <p>We received a request to reset your password. Click the button below to choose a new password:</p>
    <p style="text-align: center;">
      <a href="${data.resetUrl}" class="button">Reset Password</a>
    </p>
    <p>This link will expire in ${data.expiresIn}.</p>
    <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <div class="divider"></div>
    <p style="font-size: 14px; color: #6b7280;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${data.resetUrl}" style="word-break: break-all;">${data.resetUrl}</a>
    </p>
  `;
  
  return {
    subject: 'Reset Your Password',
    html: emailLayout(content, { preheader: 'Reset your password' }),
  };
}

// ============================================================================
// Submission Confirmation Email
// ============================================================================

export interface SubmissionConfirmationEmailData {
  speakerName: string;
  eventName: string;
  submissionTitle: string;
  eventUrl: string;
}

export function submissionConfirmationEmail(data: SubmissionConfirmationEmailData): { subject: string; html: string } {
  const content = `
    <h1>Submission Received!</h1>
    <p>Hi ${data.speakerName},</p>
    <p>Your submission has been received for <strong>${data.eventName}</strong>.</p>
    <div class="info-box">
      <strong>${data.submissionTitle}</strong>
      <p style="margin-bottom: 0;">Status: <span class="badge badge-info">Pending Review</span></p>
    </div>
    <p>We will notify you when there are updates on your submission.</p>
    <p style="text-align: center;">
      <a href="${data.eventUrl}" class="button">View Event</a>
    </p>
    <p>Thank you for your submission!</p>
  `;
  
  return {
    subject: `Submission Received: ${data.submissionTitle}`,
    html: emailLayout(content, { preheader: `Your submission to ${data.eventName} has been received` }),
  };
}

// ============================================================================
// Submission Status Update Email
// ============================================================================

export interface SubmissionStatusEmailData {
  speakerName: string;
  eventName: string;
  submissionTitle: string;
  status: 'ACCEPTED' | 'REJECTED' | 'WAITLISTED' | 'UNDER_REVIEW';
  feedback?: string;
  eventUrl: string;
}

export function submissionStatusEmail(data: SubmissionStatusEmailData): { subject: string; html: string } {
  const statusConfig = {
    ACCEPTED: {
      badge: 'badge-success',
      label: 'Accepted',
      message: 'Congratulations! Your submission has been accepted.',
      preheader: 'Great news! Your submission has been accepted',
    },
    REJECTED: {
      badge: 'badge-error',
      label: 'Not Selected',
      message: 'Unfortunately, your submission was not selected this time.',
      preheader: 'Update on your submission',
    },
    WAITLISTED: {
      badge: 'badge-warning',
      label: 'Waitlisted',
      message: 'Your submission has been waitlisted. We will notify you if a spot becomes available.',
      preheader: 'Your submission has been waitlisted',
    },
    UNDER_REVIEW: {
      badge: 'badge-info',
      label: 'Under Review',
      message: 'Your submission is now being reviewed by our team.',
      preheader: 'Your submission is under review',
    },
  };
  
  const statusInfo = statusConfig[data.status];
  
  const content = `
    <h1>Submission Update</h1>
    <p>Hi ${data.speakerName},</p>
    <p>${statusInfo.message}</p>
    <div class="info-box">
      <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${data.eventName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Submission:</strong> ${data.submissionTitle}</p>
      <p style="margin: 0;"><strong>Status:</strong> <span class="badge ${statusInfo.badge}">${statusInfo.label}</span></p>
    </div>
    ${data.feedback ? `
      <h2>Feedback</h2>
      <p>${data.feedback.replace(/\n/g, '<br>')}</p>
    ` : ''}
    <p style="text-align: center;">
      <a href="${data.eventUrl}" class="button">View Details</a>
    </p>
    <p>Thank you for your participation!</p>
  `;
  
  return {
    subject: `${statusInfo.label}: ${data.submissionTitle}`,
    html: emailLayout(content, { preheader: statusInfo.preheader }),
  };
}

// ============================================================================
// New Message Email
// ============================================================================

export interface NewMessageEmailData {
  recipientName: string;
  senderName: string;
  eventName: string;
  submissionTitle: string;
  messagePreview: string;
  messageUrl: string;
}

export function newMessageEmail(data: NewMessageEmailData): { subject: string; html: string } {
  const content = `
    <h1>New Message</h1>
    <p>Hi ${data.recipientName},</p>
    <p>You have a new message from <strong>${data.senderName}</strong> regarding your submission:</p>
    <div class="info-box">
      <p style="margin: 0 0 8px 0;"><strong>Event:</strong> ${data.eventName}</p>
      <p style="margin: 0;"><strong>Submission:</strong> ${data.submissionTitle}</p>
    </div>
    <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; font-style: italic;">"${data.messagePreview}..."</p>
    </div>
    <p style="text-align: center;">
      <a href="${data.messageUrl}" class="button">View Message</a>
    </p>
  `;
  
  return {
    subject: `New message about: ${data.submissionTitle}`,
    html: emailLayout(content, { preheader: `${data.senderName} sent you a message` }),
  };
}

// ============================================================================
// Review Team Invitation Email
// ============================================================================

export interface ReviewInvitationEmailData {
  reviewerName: string;
  eventName: string;
  organizerName: string;
  role: 'LEAD' | 'REVIEWER';
  eventUrl: string;
}

export function reviewInvitationEmail(data: ReviewInvitationEmailData): { subject: string; html: string } {
  const roleLabel = data.role === 'LEAD' ? 'Lead Reviewer' : 'Reviewer';
  
  const content = `
    <h1>You've Been Added to a Review Team!</h1>
    <p>Hi ${data.reviewerName},</p>
    <p><strong>${data.organizerName}</strong> has added you to the review team for <strong>${data.eventName}</strong> as a ${roleLabel}.</p>
    <div class="info-box">
      <p style="margin: 0;"><strong>Your Role:</strong> <span class="badge badge-info">${roleLabel}</span></p>
    </div>
    <p>As a reviewer, you will be able to:</p>
    <ul>
      <li>View and score submissions</li>
      <li>Add private notes for the team</li>
      <li>Participate in review discussions</li>
      ${data.role === 'LEAD' ? '<li>Manage the review process</li>' : ''}
    </ul>
    <p style="text-align: center;">
      <a href="${data.eventUrl}" class="button">View Event</a>
    </p>
    <p>Thank you for being part of the review team!</p>
  `;
  
  return {
    subject: `You're a ${roleLabel} for ${data.eventName}`,
    html: emailLayout(content, { preheader: `You've been added to the review team` }),
  };
}

// ============================================================================
// Event Published Email
// ============================================================================

export interface EventPublishedEmailData {
  organizerName: string;
  eventName: string;
  eventUrl: string;
  cfpOpensAt?: Date;
  cfpClosesAt?: Date;
}

export function eventPublishedEmail(data: EventPublishedEmailData): { subject: string; html: string } {
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const content = `
    <h1>Event Published!</h1>
    <p>Hi ${data.organizerName},</p>
    <p>Your event <strong>${data.eventName}</strong> is now live and visible to the public.</p>
    ${data.cfpOpensAt && data.cfpClosesAt ? `
      <div class="info-box">
        <p style="margin: 0 0 8px 0;"><strong>CFP Opens:</strong> ${formatDate(data.cfpOpensAt)}</p>
        <p style="margin: 0;"><strong>CFP Closes:</strong> ${formatDate(data.cfpClosesAt)}</p>
      </div>
    ` : ''}
    <p style="text-align: center;">
      <a href="${data.eventUrl}" class="button">View Event</a>
    </p>
    <p>Share this link with potential speakers to start receiving submissions!</p>
  `;
  
  return {
    subject: `${data.eventName} is Now Live!`,
    html: emailLayout(content, { preheader: 'Your event is published and accepting submissions' }),
  };
}
