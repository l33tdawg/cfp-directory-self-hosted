/**
 * Admin User Invite API
 * 
 * Send invitation emails to new users.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';
import { emailService } from '@/lib/email/email-service';
import { logActivity } from '@/lib/activity-logger';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['USER', 'SPEAKER', 'REVIEWER', 'ORGANIZER', 'ADMIN']),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin role required' },
        { status: 403 }
      );
    }
    
    const currentUser = session.user;
    
    const body = await request.json();
    const validatedData = inviteSchema.parse(body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }
    
    // Check if invitation already exists
    const existingInvitation = await prisma.userInvitation.findFirst({
      where: { 
        email: validatedData.email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    
    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 400 }
      );
    }
    
    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Create invitation
    const invitation = await prisma.userInvitation.create({
      data: {
        email: validatedData.email,
        role: validatedData.role,
        token,
        invitedBy: currentUser.id,
        expiresAt,
      },
    });
    
    // Build invitation URL
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/invite?token=${token}`;
    
    // SECURITY: Only log invitation URLs in development to prevent token leakage
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Invitation created for ${validatedData.email}: ${inviteUrl}`);
    }
    
    // Send invitation email
    const emailResult = await emailService.sendTemplatedEmail({
      to: validatedData.email,
      templateType: 'user_invitation',
      variables: {
        inviterName: currentUser.name || 'An administrator',
        inviteUrl,
        roleName: validatedData.role,
        expiresIn: '7 days',
      },
    });
    
    // Log the activity
    await logActivity({
      userId: currentUser.id,
      action: 'USER_INVITED',
      entityType: 'User',
      entityId: invitation.id,
      metadata: {
        invitedEmail: validatedData.email,
        role: validatedData.role,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
      },
    });
    
    // Warn if email failed but invitation was created
    if (!emailResult.success) {
      console.warn(`Invitation created but email failed for ${validatedData.email}:`, emailResult.error);
      return NextResponse.json({
        success: true,
        warning: `Invitation created but email could not be sent: ${emailResult.error}`,
        message: `Invitation created for ${validatedData.email} (email delivery failed)`,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${validatedData.email}`,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get pending invitations
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin role required' },
        { status: 403 }
      );
    }
    
    const invitations = await prisma.userInvitation.findMany({
      where: {
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        inviter: {
          select: { name: true, email: true },
        },
      },
    });
    
    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
