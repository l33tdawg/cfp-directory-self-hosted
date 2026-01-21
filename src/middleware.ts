/**
 * Next.js Middleware
 * 
 * Handles authentication and route protection for the application.
 * This middleware runs on every request and checks authentication status.
 * Also applies security headers including CSP.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

// Security headers based on OWASP recommendations
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'off',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Content Security Policy directives
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://cfp.directory",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * Apply security headers to a response
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(securityHeaders)) {
    response.headers.set(header, value);
  }
  response.headers.set('Content-Security-Policy', cspDirectives);
  return response;
}

// Routes that don't require authentication
// Note: Order matters - public routes are checked first
const publicRoutes = [
  '/',
  '/setup',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-request',
  '/api/auth',
  '/api/health',
  '/api/setup',
  '/api/public', // Public API endpoints (reviewers, etc.)
  '/browse',
  '/consent',
  // Note: Public event pages are handled via specific pattern matching below
];

// Onboarding routes (authenticated but don't require profile completion)
const _onboardingRoutes = [
  '/onboarding',
  '/auth/welcome',
  '/auth/signout',
];

// Routes that require admin role
const adminRoutes = [
  '/admin',
];

// Routes that require any authenticated user
// Note: /events is NOT here as public event viewing is handled separately
const protectedRoutes = [
  '/dashboard',
  '/submissions',
  '/reviews',
  '/settings',
  '/profile',
];

/**
 * Check if a path is a public event route.
 * Public: /events (listing), /events/[slug] (viewing specific event)
 * Protected: /events/manage/*, /events/[slug]/edit, etc. (handled by API auth)
 */
function isPublicEventRoute(path: string): boolean {
  // Exact match for event listing
  if (path === '/events') return true;
  
  // Match /events/[slug] pattern (single segment after /events/)
  // But NOT /events/[slug]/edit, /events/[slug]/submissions, etc.
  const eventSlugPattern = /^\/events\/[^\/]+$/;
  return eventSlugPattern.test(path);
}

/**
 * Check if a path matches any of the given patterns
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => {
    // Exact match
    if (path === route) return true;
    // Prefix match (e.g., /admin matches /admin/users)
    if (path.startsWith(route + '/')) return true;
    // API route matching
    if (route.startsWith('/api/') && path.startsWith(route)) return true;
    return false;
  });
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  
  const path = nextUrl.pathname;
  
  // Allow public routes
  if (matchesRoute(path, publicRoutes) || isPublicEventRoute(path)) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && path.startsWith('/auth/') && !path.includes('signout')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return applySecurityHeaders(NextResponse.next());
  }
  
  // Check admin routes
  if (matchesRoute(path, adminRoutes)) {
    if (!isLoggedIn) {
      const signInUrl = new URL('/auth/signin', nextUrl);
      signInUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(signInUrl);
    }
    
    if (userRole !== 'ADMIN') {
      // User is logged in but not admin
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', nextUrl));
    }
    
    return applySecurityHeaders(NextResponse.next());
  }
  
  // Check protected routes
  if (matchesRoute(path, protectedRoutes)) {
    if (!isLoggedIn) {
      const signInUrl = new URL('/auth/signin', nextUrl);
      signInUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(signInUrl);
    }
    
    return applySecurityHeaders(NextResponse.next());
  }
  
  // Default: allow access with security headers
  return applySecurityHeaders(NextResponse.next());
});

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
