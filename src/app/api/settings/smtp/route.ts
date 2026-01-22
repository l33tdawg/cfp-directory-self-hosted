/**
 * SMTP Settings API
 * 
 * GET /api/settings/smtp - Get SMTP configuration status
 * PATCH /api/settings/smtp - Update SMTP settings
 * POST /api/settings/smtp/test - Test SMTP connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { emailService } from '@/lib/email/email-service';
import { z } from 'zod';

const updateSmtpSchema = z.object({
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().min(1).max(65535).default(587),
  smtpUser: z.string().min(1, 'SMTP username is required'),
  smtpPass: z.string().min(1, 'SMTP password is required'),
  smtpSecure: z.boolean().default(false),
  smtpFromName: z.string().optional(),
  smtpFromEmail: z.string().email('Invalid from email address'),
});

// ============================================================================
// GET /api/settings/smtp - Get SMTP configuration status
// ============================================================================

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpSecure: true,
        smtpFromName: true,
        smtpFromEmail: true,
        smtpConfigured: true,
        name: true,
      },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }

    // Return config without password
    return NextResponse.json({
      configured: settings.smtpConfigured,
      host: settings.smtpHost || '',
      port: settings.smtpPort || 587,
      user: settings.smtpUser || '',
      secure: settings.smtpSecure || false,
      fromName: settings.smtpFromName || settings.name || '',
      fromEmail: settings.smtpFromEmail || '',
      // Indicate if password is set (without revealing it)
      passwordSet: !!settings.smtpHost && settings.smtpConfigured,
    });
  } catch (error) {
    console.error('Failed to get SMTP settings:', error);
    return NextResponse.json(
      { error: 'Failed to get SMTP settings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/settings/smtp - Update SMTP settings
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const result = updateSmtpSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Update SMTP settings
    const settings = await prisma.siteSettings.update({
      where: { id: 'default' },
      data: {
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpUser: data.smtpUser,
        smtpPass: data.smtpPass,
        smtpSecure: data.smtpSecure,
        smtpFromName: data.smtpFromName || null,
        smtpFromEmail: data.smtpFromEmail,
        smtpConfigured: true,
      },
      select: {
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpSecure: true,
        smtpFromName: true,
        smtpFromEmail: true,
        smtpConfigured: true,
        name: true,
      },
    });

    // Reset email service to pick up new config
    emailService.resetTransporter();

    return NextResponse.json({
      success: true,
      message: 'SMTP settings updated',
      configured: settings.smtpConfigured,
      host: settings.smtpHost,
      port: settings.smtpPort,
      user: settings.smtpUser,
      secure: settings.smtpSecure,
      fromName: settings.smtpFromName || settings.name,
      fromEmail: settings.smtpFromEmail,
    });
  } catch (error) {
    console.error('Failed to update SMTP settings:', error);
    return NextResponse.json(
      { error: 'Failed to update SMTP settings' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/settings/smtp - Test SMTP connection
// ============================================================================

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
    const { action, testEmail } = body;

    if (action === 'test-connection') {
      // Verify SMTP connection
      const result = await emailService.verify();
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || 'Connection failed',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'SMTP connection successful',
      });
    }

    if (action === 'send-test' && testEmail) {
      // Send test email
      const result = await emailService.sendTestEmail(testEmail);
      
      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to send test email',
        });
      }

      return NextResponse.json({
        success: true,
        message: `Test email sent to ${testEmail}`,
        messageId: result.messageId,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('SMTP test failed:', error);
    return NextResponse.json(
      { error: 'SMTP test failed' },
      { status: 500 }
    );
  }
}
