/**
 * Email Template Preview API
 * 
 * POST - Generate a preview of an email template with sample data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const previewSchema = z.object({
  templateId: z.string().optional(),
  subject: z.string().optional(),
  content: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
});

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  userName: 'Jane Speaker',
  userEmail: 'jane@example.com',
  siteName: 'TechConf 2026',
  siteUrl: 'https://example.com',
  dashboardUrl: 'https://example.com/dashboard',
  eventName: 'TechConf 2026',
  eventUrl: 'https://example.com/events/techconf-2026',
  eventDate: 'June 15-17, 2026',
  eventTime: '9:00 AM - 5:00 PM',
  eventLocation: 'San Francisco, CA',
  submissionTitle: 'Building Scalable APIs with GraphQL',
  submissionUrl: 'https://example.com/submissions/abc123',
  senderName: 'John Organizer',
  messagePreview: 'Thank you for your submission! We had a few questions about...',
  messageUrl: 'https://example.com/messages/xyz789',
  resetUrl: 'https://example.com/auth/reset?token=abc123',
  verifyUrl: 'https://example.com/auth/verify?token=abc123',
  inviteUrl: 'https://example.com/auth/invite?token=abc123',
  expiresIn: '24 hours',
  inviterName: 'Sarah Admin',
  roleName: 'Reviewer',
  organizerName: 'John Organizer',
  cfpOpensAt: 'January 15, 2026',
  cfpClosesAt: 'March 15, 2026',
  daysRemaining: '7 days',
  publicUrl: 'https://example.com/events/techconf-2026',
  speakerName: 'Jane Speaker',
  reviewUrl: 'https://example.com/review/abc123',
  deadline: 'April 1, 2026',
  feedbackSection: '<h2>Feedback</h2><p>Great proposal! We especially liked the practical examples you included.</p>',
  topicsList: '<li>Cloud Architecture</li><li>DevOps</li><li>Security</li>',
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
    const result = previewSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    let subject: string;
    let content: string;

    if (result.data.templateId) {
      // Load template from database
      const template = await prisma.emailTemplate.findUnique({
        where: { id: result.data.templateId },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      subject = template.subject;
      content = template.content;
    } else if (result.data.subject && result.data.content) {
      // Use provided subject and content
      subject = result.data.subject;
      content = result.data.content;
    } else {
      return NextResponse.json(
        { error: 'Either templateId or both subject and content are required' },
        { status: 400 }
      );
    }

    // Merge sample data with any custom variables
    const variables = {
      ...SAMPLE_DATA,
      ...result.data.variables,
    };

    // Replace variables in subject and content
    const processedSubject = subject.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });

    const processedContent = content.replace(/\{(\w+)\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });

    // Get site settings for branding
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { name: true, websiteUrl: true },
    });

    const siteName = settings?.name || 'CFP System';
    const siteUrl = settings?.websiteUrl || '';
    const year = new Date().getFullYear();

    // Generate full HTML preview
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        ${processedContent}
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

    return NextResponse.json({
      subject: processedSubject,
      html,
    });
  } catch (error) {
    console.error('Failed to generate preview:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
