/**
 * API Authentication Helpers
 * 
 * Server-side auth utilities for API routes.
 * Simplified for single-organization model.
 */

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import type { UserRole } from '@prisma/client';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
}

export interface AuthResult {
  user: AuthenticatedUser | null;
  error?: string;
}

// ============================================================================
// Authentication
// ============================================================================

/**
 * Get the current authenticated user from the session
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  const session = await auth();
  
  if (!session?.user) {
    return { user: null, error: 'Authentication required' };
  }
  
  return { user: session.user as AuthenticatedUser };
}

/**
 * Require authentication or throw
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const { user, error } = await getAuthenticatedUser();
  
  if (!user) {
    throw new Error(error || 'Authentication required');
  }
  
  return user;
}

// ============================================================================
// Role-Based Authorization
// ============================================================================

/**
 * Check if user is an admin
 */
export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === 'ADMIN';
}

/**
 * Check if user is an organizer or higher
 */
export function isOrganizer(user: AuthenticatedUser): boolean {
  return ['ADMIN', 'ORGANIZER'].includes(user.role);
}

/**
 * Check if user is a reviewer or higher
 */
export function isReviewerRole(user: AuthenticatedUser): boolean {
  return ['ADMIN', 'ORGANIZER', 'REVIEWER'].includes(user.role);
}

/**
 * Check if user can manage events (create, edit, delete)
 */
export function canManageEvents(user: AuthenticatedUser): boolean {
  return isOrganizer(user);
}

/**
 * Check if user can manage site settings
 */
export function canManageSettings(user: AuthenticatedUser): boolean {
  return isAdmin(user);
}

// ============================================================================
// Event-Level Authorization
// ============================================================================

/**
 * Check if user is on the review team for an event
 */
export async function isEventReviewer(
  userId: string,
  eventId: string
): Promise<boolean> {
  const member = await prisma.reviewTeamMember.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId,
      },
    },
  });
  
  return member !== null;
}

/**
 * Check if user can review submissions for an event
 */
export async function canReviewEvent(
  user: AuthenticatedUser,
  eventId: string
): Promise<boolean> {
  // Admins and organizers can review any event
  if (isOrganizer(user)) return true;
  
  // Reviewers can review if on the review team
  if (user.role === 'REVIEWER') {
    return isEventReviewer(user.id, eventId);
  }
  
  // Regular users can only review if explicitly on the team
  return isEventReviewer(user.id, eventId);
}

/**
 * Check if user can manage a specific event
 * 
 * Access is granted to:
 * - ADMINs (can manage all events)
 * - ORGANIZERs who are LEAD on the event's review team
 * - ORGANIZERs for events they created (future: track createdBy)
 * 
 * Note: For a single-org self-hosted system, we allow ORGANIZERs to manage
 * events if they are on the review team as LEAD. This provides reasonable
 * access control while keeping the system simple.
 */
export async function canManageEvent(
  user: AuthenticatedUser,
  eventId: string
): Promise<boolean> {
  // Admins can manage all events
  if (isAdmin(user)) return true;
  
  // Non-organizers cannot manage events
  if (!isOrganizer(user)) return false;
  
  // ORGANIZERs can manage events where they are a LEAD on the review team
  const reviewTeamMember = await prisma.reviewTeamMember.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId: user.id,
      },
    },
    select: { role: true },
  });
  
  // Must be on review team as LEAD to manage
  return reviewTeamMember?.role === 'LEAD';
}

/**
 * Check if user can view an event (published or has permissions)
 */
export async function canViewEvent(
  user: AuthenticatedUser | null,
  eventId: string
): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { isPublished: true },
  });
  
  if (!event) return false;
  
  // Published events are visible to everyone
  if (event.isPublished) return true;
  
  // Must be authenticated for unpublished events
  if (!user) return false;
  
  // Organizers and admins can view unpublished events
  return isOrganizer(user);
}

// ============================================================================
// Site Settings
// ============================================================================

/**
 * Get or create site settings (singleton pattern)
 */
export async function getSiteSettings() {
  let settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
  });
  
  if (!settings) {
    settings = await prisma.siteSettings.create({
      data: { id: 'default' },
    });
  }
  
  return settings;
}
