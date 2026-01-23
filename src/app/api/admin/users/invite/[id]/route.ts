/**
 * Admin User Invite Management API
 * 
 * DELETE /api/admin/users/invite/[id] - Revoke an invitation
 * POST /api/admin/users/invite/[id] - Resend an invitation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth';
import { emailService } from '@/lib/email/email-service';
import { logActivity } from '@/lib/activity-logger';
import { decryptPiiFields, USER_PII_FIELDS } from '@/lib/security/encryption';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// DELETE - Revoke an invitation
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
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
    
    const { id } = await params;
    
    // Find the invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: { id },
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Cannot revoke an accepted invitation' },
        { status: 400 }
      );
    }
    
    // Delete the invitation
    await prisma.userInvitation.delete({
      where: { id },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get a specific invitation (for admin viewing)
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
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
    
    const { id } = await params;
    
    const invitation = await prisma.userInvitation.findUnique({
      where: { id },
      include: {
        inviter: {
          select: { name: true, email: true },
        },
      },
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Decrypt inviter PII fields
    const decryptedInvitation = {
      ...invitation,
      inviter: invitation.inviter ? decryptPiiFields(
        invitation.inviter as Record<string, unknown>,
        USER_PII_FIELDS
      ) : null,
    };
    
    return NextResponse.json({ invitation: decryptedInvitation });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Resend an invitation email
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
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
    
    const { id } = await params;
    
    // Find the invitation with inviter info
    const invitation = await prisma.userInvitation.findUnique({
      where: { id },
      include: {
        inviter: {
          select: { name: true, email: true },
        },
      },
    });
    
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }
    
    // Check if already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Cannot resend an accepted invitation' },
        { status: 400 }
      );
    }
    
    // Check if expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Cannot resend an expired invitation. Please create a new one.' },
        { status: 400 }
      );
    }
    
    // Decrypt inviter name for the email
    const inviterDecrypted = invitation.inviter ? decryptPiiFields(
      invitation.inviter as Record<string, unknown>,
      USER_PII_FIELDS
    ) : null;
    
    // Build invitation URL with existing token
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/invite?token=${invitation.token}`;
    
    // Calculate remaining time
    const hoursRemaining = Math.ceil((invitation.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60));
    const daysRemaining = Math.ceil(hoursRemaining / 24);
    const expiresIn = daysRemaining >= 1 ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}` : `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`;
    
    // Resend invitation email
    const emailResult = await emailService.sendTemplatedEmail({
      to: invitation.email,
      templateType: 'user_invitation',
      variables: {
        inviterName: (inviterDecrypted?.name as string) || 'An administrator',
        inviteUrl,
        roleName: invitation.role,
        expiresIn,
      },
    });
    
    // Log the activity
    await logActivity({
      userId: session.user.id,
      action: 'USER_INVITATION_RESENT',
      entityType: 'User',
      entityId: invitation.id,
      metadata: {
        invitedEmail: invitation.email,
        role: invitation.role,
        emailSent: emailResult.success,
        emailError: emailResult.error || null,
      },
    });
    
    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to send email: ${emailResult.error}`,
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: `Invitation resent to ${invitation.email}`,
    });
  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
