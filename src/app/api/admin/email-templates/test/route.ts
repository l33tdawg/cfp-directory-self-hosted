/**
 * Email Template Test API
 * 
 * POST - Send a test email using a template
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { emailService } from '@/lib/email/email-service';
import { z } from 'zod';
import type { EmailTemplateType } from '@/types/email-templates';

const testEmailSchema = z.object({
  templateId: z.string(),
  toEmail: z.string().email(),
});

// Sample data for test emails
const SAMPLE_DATA: Record<string, string> = {
  userName: 'Test User',
  userEmail: 'test@example.com',
  dashboardUrl: '',  // Will be populated from siteUrl
  eventName: 'Sample Conference 2026',
  eventUrl: '',
  eventDate: 'June 15-17, 2026',
  eventTime: '9:00 AM - 5:00 PM',
  eventLocation: 'San Francisco, CA',
  submissionTitle: 'Sample Talk Title',
  submissionUrl: '',
  senderName: 'Test Organizer',
  messagePreview: 'This is a sample message preview text...',
  messageUrl: '',
  resetUrl: '',
  verifyUrl: '',
  inviteUrl: '',
  expiresIn: '24 hours',
  inviterName: 'Test Admin',
  roleName: 'Reviewer',
  organizerName: 'Test Organizer',
  cfpOpensAt: 'January 15, 2026',
  cfpClosesAt: 'March 15, 2026',
  daysRemaining: '7 days',
  publicUrl: '',
  speakerName: 'Test Speaker',
  reviewUrl: '',
  deadline: 'April 1, 2026',
  feedbackSection: '',
  topicsList: '<li>Technology</li><li>Innovation</li>',
};

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = testEmailSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    // Get template
    const template = await prisma.emailTemplate.findUnique({
      where: { id: result.data.templateId },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Get site settings for URLs
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { name: true, websiteUrl: true },
    });

    const siteUrl = settings?.websiteUrl || 'http://localhost:3000';
    
    // Build sample data with real URLs
    const variables: Record<string, string> = {
      ...SAMPLE_DATA,
      siteName: settings?.name || 'CFP System',
      siteUrl,
      dashboardUrl: `${siteUrl}/dashboard`,
      eventUrl: `${siteUrl}/events/sample`,
      submissionUrl: `${siteUrl}/submissions/sample`,
      messageUrl: `${siteUrl}/messages/sample`,
      resetUrl: `${siteUrl}/auth/reset?token=sample`,
      verifyUrl: `${siteUrl}/auth/verify?token=sample`,
      inviteUrl: `${siteUrl}/auth/invite?token=sample`,
      publicUrl: `${siteUrl}/events/sample`,
      reviewUrl: `${siteUrl}/review/sample`,
    };

    // Send test email using the template type
    const sendResult = await emailService.sendTemplatedEmail({
      to: result.data.toEmail,
      templateType: template.type as EmailTemplateType,
      variables,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || 'Failed to send test email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${result.data.toEmail}`,
      messageId: sendResult.messageId,
    });
  } catch (error) {
    console.error('Failed to send test email:', error);
    return NextResponse.json(
      { error: 'Failed to send test email' },
      { status: 500 }
    );
  }
}
