/**
 * Federation Keypair Management API
 * 
 * POST - Generate a new keypair
 * GET  - Get current public key and status
 * DELETE - Remove keypair (requires confirmation)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { 
  generateKeyPair, 
  getPublicKeyFingerprint,
  verifyKeyPair,
} from '@/lib/security/keypair';

// =============================================================================
// GET - Get keypair status and public key
// =============================================================================

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access keypair info
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: {
        instancePublicKey: true,
        instancePrivateKeyEncrypted: true,
        instanceKeyGeneratedAt: true,
        federationEnabled: true,
        federationLicenseKey: true,
      },
    });

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 });
    }

    const hasKeypair = Boolean(settings.instancePublicKey && settings.instancePrivateKeyEncrypted);
    
    let fingerprint: string | null = null;
    let isValid = false;
    
    if (hasKeypair && settings.instancePublicKey) {
      fingerprint = getPublicKeyFingerprint(settings.instancePublicKey);
      
      // Verify keypair is valid
      if (settings.instancePrivateKeyEncrypted) {
        isValid = verifyKeyPair(settings.instancePublicKey, settings.instancePrivateKeyEncrypted);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        hasKeypair,
        publicKey: settings.instancePublicKey || null,
        fingerprint,
        isValid,
        generatedAt: settings.instanceKeyGeneratedAt,
        federationEnabled: settings.federationEnabled,
        hasLicenseKey: Boolean(settings.federationLicenseKey),
      },
    });

  } catch (error) {
    console.error('Failed to get keypair status:', error);
    return NextResponse.json(
      { error: 'Failed to get keypair status' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Generate new keypair
// =============================================================================

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if keypair already exists
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: {
        instancePublicKey: true,
        federationEnabled: true,
      },
    });

    // Warn if federation is already enabled (changing keys will break things)
    if (settings?.federationEnabled && settings?.instancePublicKey) {
      return NextResponse.json(
        { 
          error: 'Cannot regenerate keypair while federation is enabled',
          message: 'Disable federation first, then regenerate keys and update your license on cfp.directory',
        },
        { status: 400 }
      );
    }

    // Generate new keypair
    const result = generateKeyPair();

    if (!result.success || !result.publicKey || !result.privateKeyEncrypted) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate keypair' },
        { status: 500 }
      );
    }

    // Save to database
    await prisma.siteSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        instancePublicKey: result.publicKey,
        instancePrivateKeyEncrypted: result.privateKeyEncrypted,
        instanceKeyGeneratedAt: new Date(),
      },
      update: {
        instancePublicKey: result.publicKey,
        instancePrivateKeyEncrypted: result.privateKeyEncrypted,
        instanceKeyGeneratedAt: new Date(),
      },
    });

    const fingerprint = getPublicKeyFingerprint(result.publicKey);

    return NextResponse.json({
      success: true,
      data: {
        publicKey: result.publicKey,
        fingerprint,
        generatedAt: new Date().toISOString(),
        message: 'Keypair generated successfully. Copy the public key to cfp.directory when registering for a license.',
      },
    });

  } catch (error) {
    console.error('Failed to generate keypair:', error);
    return NextResponse.json(
      { error: 'Failed to generate keypair' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Remove keypair (with confirmation)
// =============================================================================

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Require confirmation in request body
    const body = await request.json().catch(() => ({}));
    
    if (body.confirm !== 'DELETE_KEYPAIR') {
      return NextResponse.json(
        { 
          error: 'Confirmation required',
          message: 'Send { "confirm": "DELETE_KEYPAIR" } to delete the keypair',
        },
        { status: 400 }
      );
    }

    // Check if federation is enabled
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
      select: { federationEnabled: true },
    });

    if (settings?.federationEnabled) {
      return NextResponse.json(
        { 
          error: 'Cannot delete keypair while federation is enabled',
          message: 'Disable federation first before deleting keys',
        },
        { status: 400 }
      );
    }

    // Remove keypair
    await prisma.siteSettings.update({
      where: { id: 'default' },
      data: {
        instancePublicKey: null,
        instancePrivateKeyEncrypted: null,
        instanceKeyGeneratedAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: 'Keypair deleted successfully',
      },
    });

  } catch (error) {
    console.error('Failed to delete keypair:', error);
    return NextResponse.json(
      { error: 'Failed to delete keypair' },
      { status: 500 }
    );
  }
}
