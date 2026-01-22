/**
 * Next.js Middleware
 * 
 * Handles authentication and route protection for the application.
 * This middleware runs on every request and checks authentication status.
 * Also applies security headers including CSP and HSTS.
 * 
 * SECURITY: Uses a default-deny policy for API routes to prevent
 * accidentally exposing new endpoints without authentication.
 * 
 * SECURITY: Public API routes use EXACT MATCH to prevent accidental
 * exposure of new endpoints under "public" prefixes.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';

// Whether we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Security headers based on OWASP recommendations
const securityHeaders: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-DNS-Prefetch-Control': 'off',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Add HSTS in production (assumes HTTPS is configured)
// max-age=31536000 = 1 year, includeSubDomains for full coverage
if (isProduction) {
  securityHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
}

// Content Security Policy directives
// NOTE: 'unsafe-inline' and 'unsafe-eval' are required for Next.js
// TODO: Consider nonce-based CSP for stricter XSS protection in future
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js hydration
  "style-src 'self' 'unsafe-inline'", // Required for CSS-in-JS
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://cfp.directory",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Report CSP violations in production for visibility
  ...(isProduction && process.env.CSP_REPORT_URI 
    ? [`report-uri ${process.env.CSP_REPORT_URI}`] 
    : []),
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
  '/browse',
  '/consent',
  // Note: Public event pages are handled via specific pattern matching below
];

/**
 * Public API routes configuration
 * 
 * SECURITY: Routes are matched EXACTLY unless explicitly marked as prefix.
 * This prevents accidental exposure of new endpoints under "public" prefixes.
 * 
 * Each entry specifies:
 * - path: The route path (exact match unless isPrefix is true)
 * - isPrefix: If true, matches all routes under this path (use sparingly!)
 * - methods: Optional array of allowed HTTP methods (default: all)
 * - note: Documentation for why this route is public
 */
interface PublicApiRoute {
  path: string;
  isPrefix?: boolean;
  methods?: string[];
  note: string;
}

const publicApiRoutes: PublicApiRoute[] = [
  // NextAuth.js routes - must be prefix as NextAuth uses multiple sub-routes
  { path: '/api/auth', isPrefix: true, note: 'NextAuth.js authentication routes' },
  
  // Health check - single endpoint, GET only for basic info
  { path: '/api/health', methods: ['GET'], note: 'Health check endpoint (detailed requires auth)' },
  
  // Setup routes - protected by SETUP_TOKEN in handler
  { path: '/api/setup/status', methods: ['GET'], note: 'Check setup completion status' },
  { path: '/api/setup/complete', methods: ['POST'], note: 'Complete initial setup (requires SETUP_TOKEN)' },
  
  // Public API - explicit public data endpoints
  { path: '/api/public', isPrefix: true, note: 'Explicitly public data endpoints' },
  
  // Topics - GET only for public listing, POST requires auth in handler
  { path: '/api/topics', methods: ['GET'], note: 'Public topics listing' },
  
  // Cron endpoints - protected by CRON_SECRET in handler
  { path: '/api/cron/heartbeat', methods: ['GET', 'POST'], note: 'Federation heartbeat (requires CRON_SECRET)' },
  { path: '/api/cron/cleanup', methods: ['POST'], note: 'Cleanup job (requires CRON_SECRET)' },
  
  // Federation endpoints - protected by signature/license in handlers
  { path: '/api/federation/consent', methods: ['GET', 'POST'], note: 'Federation consent callback' },
  { path: '/api/federation/heartbeat', methods: ['POST'], note: 'Federation heartbeat (requires license)' },
  { path: '/api/federation/incoming-message', methods: ['POST'], note: 'Webhook (requires valid signature)' },
];

// Onboarding routes (authenticated but don't require profile completion)
// Reserved for future onboarding flow enforcement
const onboardingRoutes = [
  '/onboarding',
  '/auth/welcome',
  '/auth/signout',
];
void onboardingRoutes;

// Routes that require admin role
const adminRoutes = [
  '/admin',
  '/api/admin', // Admin API routes
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
 * Check if a path matches any of the given route patterns
 */
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => {
    // Exact match
    if (path === route) return true;
    // Prefix match (e.g., /admin matches /admin/users)
    if (path.startsWith(route + '/')) return true;
    return false;
  });
}

/**
 * Check if a request matches a public API route
 * 
 * SECURITY: This function enforces exact matching by default.
 * Prefix matching is only used when explicitly configured.
 */
function matchesPublicApiRoute(path: string, method: string): boolean {
  return publicApiRoutes.some(route => {
    // Check if path matches
    let pathMatches = false;
    if (route.isPrefix) {
      // Prefix match - route and all sub-routes
      pathMatches = path === route.path || path.startsWith(route.path + '/');
    } else {
      // Exact match only
      pathMatches = path === route.path;
    }
    
    if (!pathMatches) return false;
    
    // Check if method is allowed (if methods are specified)
    if (route.methods && route.methods.length > 0) {
      return route.methods.includes(method.toUpperCase());
    }
    
    // No method restriction
    return true;
  });
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;
  
  const path = nextUrl.pathname;
  const method = req.method;
  const isApiRoute = path.startsWith('/api/');
  
  // Allow public routes (non-API)
  if (matchesRoute(path, publicRoutes) || isPublicEventRoute(path)) {
    // Redirect logged-in users away from auth pages
    if (isLoggedIn && path.startsWith('/auth/') && !path.includes('signout')) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return applySecurityHeaders(NextResponse.next());
  }
  
  // Allow explicitly public API routes (with method checking)
  if (isApiRoute && matchesPublicApiRoute(path, method)) {
    return applySecurityHeaders(NextResponse.next());
  }
  
  // Check admin routes (including /api/admin)
  if (matchesRoute(path, adminRoutes)) {
    if (!isLoggedIn) {
      // For API routes, return 401 instead of redirect
      if (isApiRoute) {
        return new NextResponse(
          JSON.stringify({ error: 'Authentication required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const signInUrl = new URL('/auth/signin', nextUrl);
      signInUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(signInUrl);
    }
    
    if (userRole !== 'ADMIN') {
      // User is logged in but not admin
      if (isApiRoute) {
        return new NextResponse(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
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
  
  // SECURITY: Default-deny for API routes not explicitly listed as public
  // All API routes require authentication unless explicitly listed in publicApiRoutes
  if (isApiRoute) {
    if (!isLoggedIn) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // User is authenticated, allow access (handler may do additional authz checks)
    return applySecurityHeaders(NextResponse.next());
  }
  
  // Default for non-API routes: allow access with security headers
  // Page routes that need protection should be added to protectedRoutes
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
     * 
     * SECURITY: Do NOT use extension-based global exclusions like .*\.(png|jpg|...)$
     * This could allow bypassing middleware by appending file extensions to routes.
     * If Next.js routing accepts /api/admin/users.png, middleware wouldn't run!
     * 
     * Instead, we only exclude known framework paths. Public assets in /public
     * are served directly by Next.js without hitting middleware anyway.
     */
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
};
