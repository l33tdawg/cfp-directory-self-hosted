/**
 * Email Templates Seed Data
 * 
 * Default email templates for the self-hosted CFP platform.
 * All templates support {variable} substitution.
 * 
 * Categories:
 * - authentication: Welcome, password reset, invitations
 * - submissions: Confirmation, accept, reject, waitlist
 * - communication: Messages, review invitations
 * - announcements: Event published, CFP reminders
 */

export interface EmailTemplateSeed {
  type: string;
  name: string;
  subject: string;
  content: string;
  variables: Record<string, string>;
  description: string;
  category: string;
}

export const EMAIL_TEMPLATES: EmailTemplateSeed[] = [
  // ==========================================================================
  // AUTHENTICATION TEMPLATES
  // ==========================================================================
  {
    type: 'welcome',
    name: 'Welcome Email',
    category: 'authentication',
    description: 'Sent to new users when they register',
    subject: 'Welcome to {siteName}!',
    content: `
<h1>Welcome to {siteName}!</h1>
<p>Hi {userName},</p>
<p>Thank you for registering. Your account has been created successfully.</p>
<p>You can now:</p>
<ul>
  <li>Submit talks to events with open CFPs</li>
  <li>Track your submission status</li>
  <li>Communicate with event organizers</li>
</ul>
<p style="text-align: center;">
  <a href="{dashboardUrl}" class="button">Go to Dashboard</a>
</p>
<p>If you have any questions, feel free to reach out to our team.</p>
<p>Best regards,<br>The {siteName} Team</p>
`.trim(),
    variables: {
      userName: 'User\'s display name',
      userEmail: 'User\'s email address',
      siteName: 'Platform name',
      siteUrl: 'Platform URL',
      dashboardUrl: 'Link to user dashboard',
    },
  },
  {
    type: 'password_reset',
    name: 'Password Reset',
    category: 'authentication',
    description: 'Sent when a user requests to reset their password',
    subject: 'Reset Your Password',
    content: `
<h1>Reset Your Password</h1>
<p>Hi {userName},</p>
<p>We received a request to reset your password. Click the button below to choose a new password:</p>
<p style="text-align: center;">
  <a href="{resetUrl}" class="button">Reset Password</a>
</p>
<p>This link will expire in {expiresIn}.</p>
<p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
<div class="divider"></div>
<p style="font-size: 14px; color: #6b7280;">
  If the button doesn't work, copy and paste this link into your browser:<br>
  <a href="{resetUrl}" style="word-break: break-all;">{resetUrl}</a>
</p>
`.trim(),
    variables: {
      userName: 'User\'s display name',
      resetUrl: 'Password reset link',
      expiresIn: 'Time until link expires (e.g., "1 hour")',
      siteName: 'Platform name',
    },
  },
  {
    type: 'user_invitation',
    name: 'Platform Invitation',
    category: 'authentication',
    description: 'Sent when an admin invites a new user to join the platform',
    subject: 'You\'ve been invited to join {siteName}',
    content: `
<h1>You're Invited!</h1>
<p>Hi there,</p>
<p><strong>{inviterName}</strong> has invited you to join <strong>{siteName}</strong> as a {roleName}.</p>
<div class="info-box">
  <p style="margin: 0;"><strong>Your Role:</strong> {roleName}</p>
</div>
<p>Click the button below to create your account and get started:</p>
<p style="text-align: center;">
  <a href="{inviteUrl}" class="button">Accept Invitation</a>
</p>
<p>This invitation will expire in {expiresIn}.</p>
<p>If you weren't expecting this invitation, you can safely ignore this email.</p>
`.trim(),
    variables: {
      inviterName: 'Name of the person who sent the invitation',
      siteName: 'Platform name',
      roleName: 'Role being assigned (e.g., "Reviewer")',
      inviteUrl: 'Invitation acceptance link',
      expiresIn: 'Time until invitation expires',
    },
  },
  {
    type: 'email_verification',
    name: 'Email Verification',
    category: 'authentication',
    description: 'Sent to verify a user\'s email address',
    subject: 'Verify your email address',
    content: `
<h1>Verify Your Email</h1>
<p>Hi {userName},</p>
<p>Please verify your email address by clicking the button below:</p>
<p style="text-align: center;">
  <a href="{verifyUrl}" class="button">Verify Email</a>
</p>
<p>This link will expire in {expiresIn}.</p>
<p>If you didn't create an account on {siteName}, you can safely ignore this email.</p>
`.trim(),
    variables: {
      userName: 'User\'s display name',
      verifyUrl: 'Email verification link',
      expiresIn: 'Time until link expires',
      siteName: 'Platform name',
    },
  },

  // ==========================================================================
  // SUBMISSION TEMPLATES
  // ==========================================================================
  {
    type: 'submission_confirmation',
    name: 'Submission Confirmation',
    category: 'submissions',
    description: 'Sent when a speaker submits a talk to an event',
    subject: 'Submission Received: {submissionTitle}',
    content: `
<h1>Submission Received!</h1>
<p>Hi {userName},</p>
<p>Your submission has been received for <strong>{eventName}</strong>.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Talk:</strong> {submissionTitle}</p>
  <p style="margin: 0;"><strong>Status:</strong> <span class="badge badge-info">Pending Review</span></p>
</div>
<p>We will notify you when there are updates on your submission. You can track its status anytime from your dashboard.</p>
<p style="text-align: center;">
  <a href="{submissionUrl}" class="button">View Submission</a>
</p>
<p>Thank you for submitting to {eventName}!</p>
`.trim(),
    variables: {
      userName: 'Speaker\'s name',
      eventName: 'Event name',
      submissionTitle: 'Talk/paper title',
      submissionUrl: 'Link to submission details',
      siteName: 'Platform name',
    },
  },
  {
    type: 'submission_accepted',
    name: 'Submission Accepted',
    category: 'submissions',
    description: 'Sent when a submission is accepted',
    subject: 'Congratulations! Your submission "{submissionTitle}" has been accepted',
    content: `
<h1>Great News!</h1>
<p>Hi {userName},</p>
<p>We're thrilled to inform you that your submission has been <strong>accepted</strong> for <strong>{eventName}</strong>!</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Talk:</strong> {submissionTitle}</p>
  <p style="margin: 0;"><strong>Status:</strong> <span class="badge badge-success">Accepted</span></p>
</div>
{feedbackSection}
<p style="text-align: center;">
  <a href="{submissionUrl}" class="button">View Details</a>
</p>
<p>Congratulations and thank you for being part of {eventName}! We'll be in touch with more details about the event soon.</p>
`.trim(),
    variables: {
      userName: 'Speaker\'s name',
      eventName: 'Event name',
      submissionTitle: 'Talk/paper title',
      submissionUrl: 'Link to submission details',
      feedbackSection: 'Optional feedback from reviewers (HTML block or empty)',
      siteName: 'Platform name',
    },
  },
  {
    type: 'submission_rejected',
    name: 'Submission Not Selected',
    category: 'submissions',
    description: 'Sent when a submission is not selected',
    subject: 'Update on your submission: {submissionTitle}',
    content: `
<h1>Submission Update</h1>
<p>Hi {userName},</p>
<p>Thank you for submitting to <strong>{eventName}</strong>. After careful consideration by our review committee, we regret to inform you that your submission was not selected for this event.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Talk:</strong> {submissionTitle}</p>
  <p style="margin: 0;"><strong>Status:</strong> <span class="badge badge-error">Not Selected</span></p>
</div>
{feedbackSection}
<p>We received many excellent submissions and making these decisions is never easy. We encourage you to submit to future events and hope to see your proposal again.</p>
<p style="text-align: center;">
  <a href="{submissionUrl}" class="button">View Details</a>
</p>
<p>Thank you for your interest in {eventName}.</p>
`.trim(),
    variables: {
      userName: 'Speaker\'s name',
      eventName: 'Event name',
      submissionTitle: 'Talk/paper title',
      submissionUrl: 'Link to submission details',
      feedbackSection: 'Optional feedback from reviewers (HTML block or empty)',
      siteName: 'Platform name',
    },
  },
  {
    type: 'submission_waitlisted',
    name: 'Submission Waitlisted',
    category: 'submissions',
    description: 'Sent when a submission is placed on the waitlist',
    subject: 'Your submission "{submissionTitle}" has been waitlisted',
    content: `
<h1>Submission Update</h1>
<p>Hi {userName},</p>
<p>Your submission to <strong>{eventName}</strong> has been placed on our <strong>waitlist</strong>.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Talk:</strong> {submissionTitle}</p>
  <p style="margin: 0;"><strong>Status:</strong> <span class="badge badge-warning">Waitlisted</span></p>
</div>
<p>This means your submission was well-received, but we have limited slots available. If a spot opens up, we will notify you immediately.</p>
{feedbackSection}
<p style="text-align: center;">
  <a href="{submissionUrl}" class="button">View Details</a>
</p>
<p>Thank you for your patience and interest in {eventName}!</p>
`.trim(),
    variables: {
      userName: 'Speaker\'s name',
      eventName: 'Event name',
      submissionTitle: 'Talk/paper title',
      submissionUrl: 'Link to submission details',
      feedbackSection: 'Optional feedback from reviewers (HTML block or empty)',
      siteName: 'Platform name',
    },
  },
  {
    type: 'submission_under_review',
    name: 'Submission Under Review',
    category: 'submissions',
    description: 'Sent when a submission moves to the review stage',
    subject: 'Your submission is now under review',
    content: `
<h1>Review Started</h1>
<p>Hi {userName},</p>
<p>Good news! Your submission to <strong>{eventName}</strong> is now being reviewed by our team.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Talk:</strong> {submissionTitle}</p>
  <p style="margin: 0;"><strong>Status:</strong> <span class="badge badge-info">Under Review</span></p>
</div>
<p>We'll notify you once a decision has been made. In the meantime, you can track the status from your dashboard.</p>
<p style="text-align: center;">
  <a href="{submissionUrl}" class="button">View Submission</a>
</p>
`.trim(),
    variables: {
      userName: 'Speaker\'s name',
      eventName: 'Event name',
      submissionTitle: 'Talk/paper title',
      submissionUrl: 'Link to submission details',
      siteName: 'Platform name',
    },
  },

  // ==========================================================================
  // COMMUNICATION TEMPLATES
  // ==========================================================================
  {
    type: 'new_message',
    name: 'New Message',
    category: 'communication',
    description: 'Sent when someone receives a new message about a submission',
    subject: 'New message about: {submissionTitle}',
    content: `
<h1>New Message</h1>
<p>Hi {userName},</p>
<p>You have a new message from <strong>{senderName}</strong> regarding your submission:</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Event:</strong> {eventName}</p>
  <p style="margin: 0;"><strong>Submission:</strong> {submissionTitle}</p>
</div>
<div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
  <p style="margin: 0; font-style: italic;">"{messagePreview}..."</p>
</div>
<p style="text-align: center;">
  <a href="{messageUrl}" class="button">View & Reply</a>
</p>
`.trim(),
    variables: {
      userName: 'Recipient\'s name',
      senderName: 'Sender\'s name',
      eventName: 'Event name',
      submissionTitle: 'Talk/paper title',
      messagePreview: 'Preview of the message content',
      messageUrl: 'Link to view and reply to message',
      siteName: 'Platform name',
    },
  },
  {
    type: 'review_invitation',
    name: 'Review Team Invitation',
    category: 'communication',
    description: 'Sent when someone is added to an event\'s review team',
    subject: 'You\'ve been added to the review team for {eventName}',
    content: `
<h1>Welcome to the Review Team!</h1>
<p>Hi {userName},</p>
<p><strong>{organizerName}</strong> has added you to the review team for <strong>{eventName}</strong>.</p>
<div class="info-box">
  <p style="margin: 0;"><strong>Your Role:</strong> <span class="badge badge-info">{roleName}</span></p>
</div>
<p>As a reviewer, you will be able to:</p>
<ul>
  <li>View and score submissions</li>
  <li>Add private notes for the review team</li>
  <li>Participate in review discussions</li>
</ul>
<p style="text-align: center;">
  <a href="{eventUrl}" class="button">Start Reviewing</a>
</p>
<p>Thank you for being part of the review team!</p>
`.trim(),
    variables: {
      userName: 'Reviewer\'s name',
      organizerName: 'Name of person who added them',
      eventName: 'Event name',
      roleName: 'Role (Lead Reviewer or Reviewer)',
      eventUrl: 'Link to event review page',
      siteName: 'Platform name',
    },
  },
  {
    type: 'review_assignment',
    name: 'New Review Assignment',
    category: 'communication',
    description: 'Sent when a specific submission is assigned to a reviewer',
    subject: 'New submission assigned for review: {submissionTitle}',
    content: `
<h1>New Review Assignment</h1>
<p>Hi {userName},</p>
<p>A new submission has been assigned to you for review.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Event:</strong> {eventName}</p>
  <p style="margin: 0 0 8px 0;"><strong>Submission:</strong> {submissionTitle}</p>
  <p style="margin: 0;"><strong>Speaker:</strong> {speakerName}</p>
</div>
<p style="text-align: center;">
  <a href="{reviewUrl}" class="button">Review Now</a>
</p>
<p>Please complete your review by {deadline}.</p>
`.trim(),
    variables: {
      userName: 'Reviewer\'s name',
      eventName: 'Event name',
      submissionTitle: 'Talk/paper title',
      speakerName: 'Speaker\'s name',
      reviewUrl: 'Link to review the submission',
      deadline: 'Review deadline date',
      siteName: 'Platform name',
    },
  },

  // ==========================================================================
  // ANNOUNCEMENT TEMPLATES
  // ==========================================================================
  {
    type: 'event_published',
    name: 'Event Published',
    category: 'announcements',
    description: 'Sent to organizers when their event is published',
    subject: '{eventName} is Now Live!',
    content: `
<h1>Event Published!</h1>
<p>Hi {userName},</p>
<p>Your event <strong>{eventName}</strong> is now live and visible to the public.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>CFP Opens:</strong> {cfpOpensAt}</p>
  <p style="margin: 0;"><strong>CFP Closes:</strong> {cfpClosesAt}</p>
</div>
<p style="text-align: center;">
  <a href="{eventUrl}" class="button">View Event</a>
</p>
<p>Share this link with potential speakers to start receiving submissions!</p>
<p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
  Public URL: <a href="{publicUrl}">{publicUrl}</a>
</p>
`.trim(),
    variables: {
      userName: 'Organizer\'s name',
      eventName: 'Event name',
      cfpOpensAt: 'CFP opening date',
      cfpClosesAt: 'CFP closing date',
      eventUrl: 'Link to event management',
      publicUrl: 'Public event URL for sharing',
      siteName: 'Platform name',
    },
  },
  {
    type: 'cfp_opening',
    name: 'CFP Opening Announcement',
    category: 'announcements',
    description: 'Announcement that CFP is now open for submissions',
    subject: 'Call for Papers Now Open: {eventName}',
    content: `
<h1>Call for Papers is Open!</h1>
<p>Hi {userName},</p>
<p>The Call for Papers for <strong>{eventName}</strong> is now open!</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Event Date:</strong> {eventDate}</p>
  <p style="margin: 0 0 8px 0;"><strong>Location:</strong> {eventLocation}</p>
  <p style="margin: 0;"><strong>Submission Deadline:</strong> {cfpClosesAt}</p>
</div>
<p>We're looking for speakers to share their knowledge and experience. Topics include:</p>
<ul>
  {topicsList}
</ul>
<p style="text-align: center;">
  <a href="{submitUrl}" class="button">Submit Your Talk</a>
</p>
<p>We look forward to receiving your submission!</p>
`.trim(),
    variables: {
      userName: 'Recipient\'s name',
      eventName: 'Event name',
      eventDate: 'Event date',
      eventLocation: 'Event location',
      cfpClosesAt: 'CFP closing date',
      topicsList: 'HTML list of topics',
      submitUrl: 'Link to submit a talk',
      siteName: 'Platform name',
    },
  },
  {
    type: 'cfp_closing_reminder',
    name: 'CFP Closing Reminder',
    category: 'announcements',
    description: 'Reminder that CFP is closing soon',
    subject: 'Reminder: CFP for {eventName} closes in {daysRemaining}',
    content: `
<h1>CFP Closing Soon!</h1>
<p>Hi {userName},</p>
<p>This is a friendly reminder that the Call for Papers for <strong>{eventName}</strong> closes in <strong>{daysRemaining}</strong>.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Deadline:</strong> {cfpClosesAt}</p>
  <p style="margin: 0;"><strong>Time Remaining:</strong> {daysRemaining}</p>
</div>
<p>Don't miss your chance to speak at {eventName}!</p>
<p style="text-align: center;">
  <a href="{submitUrl}" class="button">Submit Now</a>
</p>
`.trim(),
    variables: {
      userName: 'Recipient\'s name',
      eventName: 'Event name',
      cfpClosesAt: 'CFP closing date and time',
      daysRemaining: 'Days remaining (e.g., "3 days")',
      submitUrl: 'Link to submit a talk',
      siteName: 'Platform name',
    },
  },
  {
    type: 'event_reminder',
    name: 'Event Reminder',
    category: 'announcements',
    description: 'Reminder about upcoming event',
    subject: 'Reminder: {eventName} is coming up!',
    content: `
<h1>Event Reminder</h1>
<p>Hi {userName},</p>
<p><strong>{eventName}</strong> is coming up soon!</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Date:</strong> {eventDate}</p>
  <p style="margin: 0 0 8px 0;"><strong>Time:</strong> {eventTime}</p>
  <p style="margin: 0;"><strong>Location:</strong> {eventLocation}</p>
</div>
<p style="text-align: center;">
  <a href="{eventUrl}" class="button">View Event Details</a>
</p>
<p>We look forward to seeing you there!</p>
`.trim(),
    variables: {
      userName: 'Recipient\'s name',
      eventName: 'Event name',
      eventDate: 'Event date',
      eventTime: 'Event time',
      eventLocation: 'Event location or virtual link',
      eventUrl: 'Link to event page',
      siteName: 'Platform name',
    },
  },
];

/**
 * Get email templates organized by category
 */
export function getTemplatesByCategory(): Record<string, EmailTemplateSeed[]> {
  return EMAIL_TEMPLATES.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, EmailTemplateSeed[]>);
}

/**
 * Get all unique categories
 */
export function getEmailCategories(): string[] {
  return [...new Set(EMAIL_TEMPLATES.map(t => t.category))];
}

/**
 * Get email template count
 */
export function getEmailTemplateCount(): number {
  return EMAIL_TEMPLATES.length;
}
