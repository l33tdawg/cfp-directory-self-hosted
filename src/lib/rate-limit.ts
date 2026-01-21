/**
 * Rate Limiting
 * 
 * Simple in-memory rate limiting for API endpoints.
 * For production with multiple instances, consider using Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// Default limits by type
export const RATE_LIMITS = {
  // General API endpoints
  api: { requests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  
  // Authentication endpoints (stricter)
  auth: { requests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  authStrict: { requests: 5, windowMs: 5 * 60 * 1000 }, // 5 requests per 5 minutes
  
  // Submission endpoints
  submission: { requests: 20, windowMs: 60 * 1000 }, // 20 per minute
  
  // Upload endpoints (stricter)
  upload: { requests: 10, windowMs: 60 * 1000 }, // 10 per minute
  
  // Webhook endpoints
  webhook: { requests: 60, windowMs: 60 * 1000 }, // 60 per minute
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Check if a request should be rate limited
 * 
 * @param identifier - Unique identifier for the client (e.g., IP, user ID)
 * @param type - The type of rate limit to apply
 * @returns Object with allowed status and limit info
 */
export function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'api'
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = RATE_LIMITS[type];
  const key = `${type}:${identifier}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  // Create new entry if none exists or window has expired
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + limit.windowMs,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  const allowed = entry.count <= limit.requests;
  const remaining = Math.max(0, limit.requests - entry.count);
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit headers for a response
 */
export function getRateLimitHeaders(
  type: RateLimitType,
  remaining: number,
  resetAt: number
): Record<string, string> {
  const limit = RATE_LIMITS[type];
  
  return {
    'X-RateLimit-Limit': limit.requests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetAt / 1000).toString(),
  };
}

/**
 * Extract client identifier from request
 * 
 * SECURITY: IP header handling strategy:
 * 1. Cloudflare's CF-Connecting-IP is the most trusted (set by CF edge)
 * 2. X-Real-IP is typically set by nginx/reverse proxy
 * 3. X-Forwarded-For: Use the RIGHTMOST IP that's not a known proxy
 *    (the last IP is added by your trusted proxy, earlier ones can be spoofed)
 * 
 * For production deployments behind a reverse proxy, configure the proxy
 * to set a trusted header that can't be spoofed by clients.
 */
export function getClientIdentifier(request: Request): string {
  // Cloudflare's header is most trusted - CF strips client-provided values
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }
  
  // X-Real-IP set by nginx is typically trustworthy
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // X-Forwarded-For: Use the LAST IP (added by our proxy) not the first
  // First IP can be spoofed by clients, last IP is added by trusted proxy
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    // Use the last IP in the chain (added by our reverse proxy)
    // In single-proxy setups this is the real client IP
    // If you have multiple proxies, adjust this logic accordingly
    if (ips.length > 0) {
      return ips[ips.length - 1];
    }
  }
  
  return 'unknown';
}

/**
 * Rate limit middleware helper
 * 
 * @param request - The incoming request
 * @param type - The type of rate limit to apply
 * @returns Response if rate limited, null if allowed
 */
export function rateLimitMiddleware(
  request: Request,
  type: RateLimitType = 'api'
): Response | null {
  const identifier = getClientIdentifier(request);
  const result = checkRateLimit(identifier, type);
  
  if (!result.allowed) {
    const headers = getRateLimitHeaders(type, result.remaining, result.resetAt);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  return null;
}

// Cleanup old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now >= entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Reset rate limit for an identifier (useful for testing)
 */
export function resetRateLimit(identifier: string, type: RateLimitType = 'api'): void {
  const key = `${type}:${identifier}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
