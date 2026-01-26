/**
 * Email Capability Implementation
 * @version 1.1.0
 *
 * Permission-gated access to email sending.
 */

import type { EmailCapability, EmailRecipient, PluginPermission } from '../types';
import { PluginPermissionError } from '../types';
import { emailService } from '@/lib/email/email-service';

export class EmailCapabilityImpl implements EmailCapability {
  constructor(
    private permissions: Set<PluginPermission>,
    private pluginName: string
  ) {}

  private requirePermission(permission: PluginPermission): void {
    if (!this.permissions.has(permission)) {
      throw new PluginPermissionError(permission);
    }
  }

  async send(options: {
    to: EmailRecipient | EmailRecipient[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<void> {
    this.requirePermission('email:send');
    
    // Normalize recipients to array
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const recipientEmails = recipients.map(r => r.email);
    
    // Send email using the singleton email service
    await emailService.send({
      to: recipientEmails,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}
