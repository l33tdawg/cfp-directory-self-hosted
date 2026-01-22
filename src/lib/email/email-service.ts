/**
 * Email Service
 * 
 * Database-driven SMTP email service with customizable templates.
 * All configuration comes from the database - no environment variables.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { prisma } from '@/lib/db/prisma';
import type { EmailTemplateType, SmtpConfig, EmailSendResult } from '@/types/email-templates';

// ============================================================================
// Types
// ============================================================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendTemplatedEmailOptions {
  to: string | string[];
  templateType: EmailTemplateType;
  variables: Record<string, string>;
  replyTo?: string;
}

// ============================================================================
// Email Service Class
// ============================================================================

class EmailService {
  private transporter: Transporter | null = null;
  private smtpConfig: SmtpConfig | null = null;
  private lastConfigCheck: number = 0;
  private configCacheTTL: number = 60000; // 1 minute cache

  /**
   * Get SMTP configuration from database
   */
  private async getSmtpConfig(): Promise<SmtpConfig | null> {
    // Check cache
    const now = Date.now();
    if (this.smtpConfig && (now - this.lastConfigCheck) < this.configCacheTTL) {
      return this.smtpConfig;
    }

    try {
      const settings = await prisma.siteSettings.findUnique({
        where: { id: 'default' },
        select: {
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          smtpPass: true,
          smtpSecure: true,
          smtpFromName: true,
          smtpFromEmail: true,
          smtpConfigured: true,
          name: true,
        },
      });

      if (!settings?.smtpConfigured || !settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
        this.smtpConfig = null;
        this.lastConfigCheck = now;
        return null;
      }

      this.smtpConfig = {
        host: settings.smtpHost,
        port: settings.smtpPort || 587,
        user: settings.smtpUser,
        pass: settings.smtpPass,
        secure: settings.smtpSecure || false,
        fromName: settings.smtpFromName || settings.name || 'CFP System',
        fromEmail: settings.smtpFromEmail || settings.smtpUser,
      };
      this.lastConfigCheck = now;

      return this.smtpConfig;
    } catch (error) {
      console.error('Failed to load SMTP config:', error);
      return null;
    }
  }

  /**
   * Get or create transporter
   */
  private async getTransporter(): Promise<Transporter | null> {
    const config = await this.getSmtpConfig();
    if (!config) {
      return null;
    }

    // Create new transporter if config changed or doesn't exist
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Check if email service is configured
   */
  async isReady(): Promise<boolean> {
    const config = await this.getSmtpConfig();
    return config !== null;
  }

  /**
   * Get email template from database
   */
  private async getTemplate(type: EmailTemplateType): Promise<{
    subject: string;
    content: string;
    variables: Record<string, string>;
  } | null> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { type },
        select: {
          subject: true,
          content: true,
          variables: true,
          enabled: true,
        },
      });

      if (!template || !template.enabled) {
        return null;
      }

      return {
        subject: template.subject,
        content: template.content,
        variables: template.variables as Record<string, string>,
      };
    } catch (error) {
      console.error(`Failed to load template ${type}:`, error);
      return null;
    }
  }

  /**
   * Replace {variable} placeholders with actual values
   */
  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  /**
   * Send an email using a database template
   */
  async sendTemplatedEmail(options: SendTemplatedEmailOptions): Promise<EmailSendResult> {
    // Get SMTP config
    const smtpConfig = await this.getSmtpConfig();
    if (!smtpConfig) {
      console.warn('Email not configured - skipping send');
      return {
        success: false,
        error: 'Email not configured. Please configure SMTP settings.',
      };
    }

    // Get template
    const template = await this.getTemplate(options.templateType);
    if (!template) {
      return {
        success: false,
        error: `Template "${options.templateType}" not found or disabled`,
      };
    }

    // Add site info to variables
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { name: true, websiteUrl: true },
    });
    
    const enrichedVariables = {
      ...options.variables,
      siteName: settings?.name || 'CFP System',
      siteUrl: settings?.websiteUrl || '',
    };

    // Process template
    const subject = this.replaceVariables(template.subject, enrichedVariables);
    const content = this.replaceVariables(template.content, enrichedVariables);
    const html = this.wrapInLayout(content, enrichedVariables);

    // Send email
    return this.send({
      to: options.to,
      subject,
      html,
      replyTo: options.replyTo,
    });
  }

  /**
   * Send a raw email (for custom use cases)
   */
  async send(options: EmailOptions): Promise<EmailSendResult> {
    const transporter = await this.getTransporter();
    const smtpConfig = await this.getSmtpConfig();

    if (!transporter || !smtpConfig) {
      console.warn('Email service not ready, skipping email send');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const result = await transporter.sendMail({
        from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        replyTo: options.replyTo,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify SMTP connection
   */
  async verify(): Promise<{ success: boolean; error?: string }> {
    const transporter = await this.getTransporter();
    if (!transporter) {
      return { success: false, error: 'SMTP not configured' };
    }

    try {
      await transporter.verify();
      return { success: true };
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail(toEmail: string): Promise<EmailSendResult> {
    const smtpConfig = await this.getSmtpConfig();
    if (!smtpConfig) {
      return {
        success: false,
        error: 'SMTP not configured',
      };
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { name: true },
    });

    const siteName = settings?.name || 'CFP System';
    const html = this.wrapInLayout(`
      <h1>Test Email</h1>
      <p>This is a test email from <strong>${siteName}</strong>.</p>
      <p>If you received this email, your SMTP configuration is working correctly!</p>
      <div class="info-box">
        <p style="margin: 0 0 8px 0;"><strong>SMTP Host:</strong> ${smtpConfig.host}</p>
        <p style="margin: 0 0 8px 0;"><strong>SMTP Port:</strong> ${smtpConfig.port}</p>
        <p style="margin: 0;"><strong>From:</strong> ${smtpConfig.fromName} &lt;${smtpConfig.fromEmail}&gt;</p>
      </div>
    `, { siteName, siteUrl: '' });

    return this.send({
      to: toEmail,
      subject: `Test Email from ${siteName}`,
      html,
    });
  }

  /**
   * Reset transporter (force reload config)
   */
  resetTransporter(): void {
    this.transporter = null;
    this.smtpConfig = null;
    this.lastConfigCheck = 0;
  }

  /**
   * Strip HTML tags for plain text version
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Wrap content in email layout
   */
  private wrapInLayout(content: string, variables: { siteName: string; siteUrl: string }): string {
    const { siteName, siteUrl } = variables;
    const year = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${siteName}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: #1f2937;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 32px;
      margin: 20px 0;
    }
    .header {
      text-align: center;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 24px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #3b82f6;
      text-decoration: none;
    }
    .content {
      color: #374151;
    }
    .content h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px 0;
    }
    .content h2 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 24px 0 12px 0;
    }
    .content p {
      margin: 0 0 16px 0;
    }
    .content ul {
      margin: 0 0 16px 0;
      padding-left: 24px;
    }
    .content li {
      margin-bottom: 8px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #2563eb;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 14px;
    }
    .footer a {
      color: #6b7280;
      text-decoration: underline;
    }
    .divider {
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
    .info-box {
      background-color: #f3f4f6;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 500;
    }
    .badge-success { background-color: #dcfce7; color: #166534; }
    .badge-warning { background-color: #fef3c7; color: #92400e; }
    .badge-error { background-color: #fee2e2; color: #991b1b; }
    .badge-info { background-color: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        ${siteUrl ? `<a href="${siteUrl}" class="logo">${siteName}</a>` : `<span class="logo">${siteName}</span>`}
      </div>
      <div class="content">
        ${content}
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${year} ${siteName}. All rights reserved.</p>
      ${siteUrl ? `<p><a href="${siteUrl}">Visit ${siteName}</a></p>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();

// ============================================================================
// Helper Functions for Common Email Operations
// ============================================================================

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  dashboardUrl: string
): Promise<EmailSendResult> {
  return emailService.sendTemplatedEmail({
    to: userEmail,
    templateType: 'welcome',
    variables: {
      userName,
      userEmail,
      dashboardUrl,
    },
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetUrl: string,
  expiresIn: string = '1 hour'
): Promise<EmailSendResult> {
  return emailService.sendTemplatedEmail({
    to: userEmail,
    templateType: 'password_reset',
    variables: {
      userName,
      resetUrl,
      expiresIn,
    },
  });
}

/**
 * Send submission confirmation email
 */
export async function sendSubmissionConfirmationEmail(
  userEmail: string,
  userName: string,
  eventName: string,
  submissionTitle: string,
  submissionUrl: string
): Promise<EmailSendResult> {
  return emailService.sendTemplatedEmail({
    to: userEmail,
    templateType: 'submission_confirmation',
    variables: {
      userName,
      eventName,
      submissionTitle,
      submissionUrl,
    },
  });
}

/**
 * Send submission status update email
 */
export async function sendSubmissionStatusEmail(
  userEmail: string,
  userName: string,
  eventName: string,
  submissionTitle: string,
  submissionUrl: string,
  status: 'accepted' | 'rejected' | 'waitlisted' | 'under_review',
  feedback?: string
): Promise<EmailSendResult> {
  const templateTypeMap = {
    accepted: 'submission_accepted',
    rejected: 'submission_rejected',
    waitlisted: 'submission_waitlisted',
    under_review: 'submission_under_review',
  } as const;

  const feedbackSection = feedback
    ? `<h2>Feedback</h2><p>${feedback.replace(/\n/g, '<br>')}</p>`
    : '';

  return emailService.sendTemplatedEmail({
    to: userEmail,
    templateType: templateTypeMap[status],
    variables: {
      userName,
      eventName,
      submissionTitle,
      submissionUrl,
      feedbackSection,
    },
  });
}

/**
 * Send new message notification email
 */
export async function sendNewMessageEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string,
  eventName: string,
  submissionTitle: string,
  messagePreview: string,
  messageUrl: string
): Promise<EmailSendResult> {
  return emailService.sendTemplatedEmail({
    to: recipientEmail,
    templateType: 'new_message',
    variables: {
      userName: recipientName,
      senderName,
      eventName,
      submissionTitle,
      messagePreview: messagePreview.substring(0, 200),
      messageUrl,
    },
  });
}

/**
 * Send review team invitation email
 */
export async function sendReviewInvitationEmail(
  reviewerEmail: string,
  reviewerName: string,
  organizerName: string,
  eventName: string,
  roleName: string,
  eventUrl: string
): Promise<EmailSendResult> {
  return emailService.sendTemplatedEmail({
    to: reviewerEmail,
    templateType: 'review_invitation',
    variables: {
      userName: reviewerName,
      organizerName,
      eventName,
      roleName,
      eventUrl,
    },
  });
}
