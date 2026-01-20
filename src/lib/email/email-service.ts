/**
 * Email Service
 * 
 * SMTP-based email service with configurable templates.
 * Uses nodemailer for sending emails.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { config } from '@/lib/env';

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

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================================
// Email Service
// ============================================================================

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;
  
  constructor() {
    this.initialize();
  }
  
  private initialize() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn('Email service not configured: Missing SMTP credentials');
      this.isConfigured = false;
      return;
    }
    
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    
    this.isConfigured = true;
    console.log('Email service initialized');
  }
  
  /**
   * Check if email service is configured
   */
  isReady(): boolean {
    return this.isConfigured && this.transporter !== null;
  }
  
  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    if (!this.isReady()) {
      console.warn('Email service not ready, skipping email send');
      return {
        success: false,
        error: 'Email service not configured',
      };
    }
    
    const fromName = process.env.SMTP_FROM_NAME || config.app.name;
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    
    try {
      const result = await this.transporter!.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
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
  async verify(): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }
    
    try {
      await this.transporter!.verify();
      return true;
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return false;
    }
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
}

// Export singleton instance
export const emailService = new EmailService();

// ============================================================================
// Template Helpers
// ============================================================================

/**
 * Base email layout wrapper
 */
export function emailLayout(content: string, options?: { 
  preheader?: string;
  footerText?: string;
}): string {
  const appName = config.app.name;
  const appUrl = config.app.url;
  const year = new Date().getFullYear();
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${appName}</title>
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
    .button-secondary {
      background-color: #6b7280;
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
    .preheader {
      display: none;
      font-size: 1px;
      color: #f4f4f5;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
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
  ${options?.preheader ? `<div class="preheader">${options.preheader}</div>` : ''}
  <div class="container">
    <div class="card">
      <div class="header">
        <a href="${appUrl}" class="logo">${appName}</a>
      </div>
      <div class="content">
        ${content}
      </div>
    </div>
    <div class="footer">
      <p>${options?.footerText || `&copy; ${year} ${appName}. All rights reserved.`}</p>
      <p>
        <a href="${appUrl}">Visit ${appName}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
