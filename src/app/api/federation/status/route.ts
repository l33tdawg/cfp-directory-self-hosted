/**
 * Federation Status API
 * 
 * GET /api/federation/status - Get current federation status
 * POST /api/federation/status - Enable/disable federation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFederationState, setFederationEnabled, clearCache } from '@/lib/federation';

export const dynamic = 'force-dynamic';

/**
 * GET - Get federation status
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Only admins can view federation status
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const state = await getFederationState();
    
    return NextResponse.json({
      success: true,
      data: {
        isEnabled: state.isEnabled,
        isConfigured: state.isConfigured,
        isValid: state.isValid,
        license: state.license ? {
          id: state.license.id,
          tier: state.license.tier,
          status: state.license.status,
          organizationName: state.license.organizationName,
          features: state.license.features,
          limits: state.license.limits,
          expiresAt: state.license.expiresAt,
        } : null,
        warnings: state.warnings,
        lastValidated: state.lastValidated?.toISOString() ?? null,
        lastHeartbeat: state.lastHeartbeat?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('Federation status error:', error);
    return NextResponse.json(
      { error: 'Failed to get federation status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Enable or disable federation
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { enabled, refresh } = body;
    
    // Handle refresh request
    if (refresh === true) {
      clearCache();
      const state = await getFederationState(true);
      return NextResponse.json({
        success: true,
        data: {
          isEnabled: state.isEnabled,
          isConfigured: state.isConfigured,
          isValid: state.isValid,
          license: state.license,
          warnings: state.warnings,
          lastValidated: state.lastValidated?.toISOString() ?? null,
        },
      });
    }
    
    // Handle enable/disable
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }
    
    const state = await setFederationEnabled(enabled);
    
    return NextResponse.json({
      success: true,
      data: {
        isEnabled: state.isEnabled,
        isConfigured: state.isConfigured,
        isValid: state.isValid,
        license: state.license,
        warnings: state.warnings,
      },
    });
  } catch (error) {
    console.error('Federation status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update federation status' },
      { status: 500 }
    );
  }
}
