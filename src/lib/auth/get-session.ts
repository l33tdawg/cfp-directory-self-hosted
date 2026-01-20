/**
 * Session Helpers
 * 
 * Server-side utilities for getting the current session and user.
 */

import { auth } from './auth';
import { redirect } from 'next/navigation';
import type { UserRole } from '@prisma/client';

/**
 * Get the current session (nullable)
 * Use this when you want to optionally show user info
 */
export async function getSession() {
  return await auth();
}

/**
 * Get the current user or redirect to sign in
 * Use this in protected pages/components
 */
export async function getCurrentUser() {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }
  
  return session.user;
}

/**
 * Require a specific role or redirect
 * Use this in admin pages
 */
export async function requireRole(requiredRole: UserRole) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin');
  }
  
  // ADMIN has access to everything
  if (session.user.role === 'ADMIN') {
    return session.user;
  }
  
  if (session.user.role !== requiredRole) {
    redirect('/dashboard?error=unauthorized');
  }
  
  return session.user;
}

/**
 * Require admin role or redirect
 */
export async function requireAdmin() {
  return requireRole('ADMIN');
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === 'ADMIN';
}

/**
 * Get the current user ID or throw
 * Useful in API routes
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  
  return session.user.id;
}
