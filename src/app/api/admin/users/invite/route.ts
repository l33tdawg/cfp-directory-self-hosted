/**
 * Admin User Invite API
 * 
 * Send invitation emails to new users.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import crypto from 'crypto';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['USER', 'SPEAKER', 'REVIEWER', 'ORGANIZER', 'ADMIN']),
  name: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }
    
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
    
    // TODO: Send invitation email
    // For now, just log the invitation URL
    const inviteUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/invite?token=${token}`;
    console.log(`Invitation created for ${validatedData.email}: ${inviteUrl}`);
    
    // In production, you would send an email here:
    // await sendInvitationEmail({
    //   to: validatedData.email,
    //   inviterName: currentUser.name,
    //   inviteUrl,
    //   role: validatedData.role,
    // });
    
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
    const currentUser = await getCurrentUser();
    
    if (currentUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
