/**
 * NextAuth.js API Route Handler
 * 
 * This route handles all authentication API requests including:
 * - GET /api/auth/signin - Sign in page
 * - POST /api/auth/signin/{provider} - Sign in with provider
 * - GET /api/auth/callback/{provider} - OAuth callback
 * - GET /api/auth/signout - Sign out
 * - POST /api/auth/signout - Sign out
 * - GET /api/auth/session - Get session
 * - GET /api/auth/csrf - Get CSRF token
 * - GET /api/auth/providers - List providers
 */

import { handlers } from '@/lib/auth/auth';

export const { GET, POST } = handlers;
