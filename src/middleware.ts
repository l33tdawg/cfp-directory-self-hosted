/**
 * Next.js Middleware
 * 
 * Handles authentication and route protection for the application.
 * This middleware runs on every request and checks authentication status.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

// Routes that don't require authentication
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
  '/events', // Public event pages
];

// Onboarding routes (authenticated but don't require profile completion)
const onboardingRoutes = [
  '/onboarding',
  '/auth/welcome',
  '/auth/signout',
];

// Routes that require admin role
const adminRoutes = [
  '/admin',
];

// Routes that require any authenticated user
const protectedRoutes = [
  '/dashboard',
  '/events',
  '/submissions',
  '/reviews',
  '/settings',
  '/profile',
];

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
  if (matchesRoute(path, publicRoutes)) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && path.startsWith('/auth/') && !path.includes('signout')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
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
    
    return NextResponse.next();
  }
  
  // Check protected routes
  if (matchesRoute(path, protectedRoutes)) {
    if (!isLoggedIn) {
      const signInUrl = new URL('/auth/signin', nextUrl);
      signInUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(signInUrl);
    }
    
    return NextResponse.next();
  }
  
  // Default: allow access
  return NextResponse.next();
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
