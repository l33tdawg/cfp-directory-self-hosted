/**
 * Rate Limiting
 *
 * In-memory rate limiting for API endpoints.
 *
 * SECURITY WARNING: This in-memory implementation is NOT suitable for
 * multi-instance/serverless deployments. Each instance maintains its own
 * rate limit buckets, allowing attackers to bypass limits by distributing
 * requests across instances.
 *
 * For production deployments with multiple instances or serverless:
 * - Use Redis-backed rate limiting (recommended)
 * - Use CDN/WAF rate limiting (Cloudflare, AWS WAF, etc.)
 * - Configure upstream load balancer rate limits
 *
 * Critical endpoints that need shared state rate limiting:
 * - /api/setup/* (prevents setup brute force)
 * - /api/auth/* (prevents credential stuffing)
 * - /api/federation/incoming-message (prevents webhook spam)
 * - /api/upload (prevents storage exhaustion)
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
 * Whether to trust proxy headers for client IP extraction
 * 
 * SECURITY: By default, DO NOT trust proxy headers. An attacker can spoof
 * X-Forwarded-For, CF-Connecting-IP, and X-Real-IP headers to bypass rate limiting.
 * 
 * Only set TRUST_PROXY_HEADERS=true if you KNOW your deployment is behind a
 * reverse proxy that:
 * 1. Strips or overwrites these headers from client requests
 * 2. Sets the correct client IP before forwarding
 * 
 * Examples of when to enable:
 * - Behind Cloudflare (which sets CF-Connecting-IP)
 * - Behind nginx with proper configuration to set X-Real-IP
 * - Behind a load balancer that manages X-Forwarded-For
 */
const TRUST_PROXY_HEADERS = process.env.TRUST_PROXY_HEADERS === 'true';

/**
 * Number of trusted reverse proxies in the X-Forwarded-For chain
 * 
 * Only used when TRUST_PROXY_HEADERS=true
 * 
 * X-Forwarded-For format: "client_ip, proxy1_ip, proxy2_ip, ..."
 * - Each proxy appends its IP to the right
 * - TRUSTED_PROXY_COUNT tells us how many rightmost IPs are our proxies
 * - The client IP is at index: length - TRUSTED_PROXY_COUNT - 1
 * 
 * Examples:
 * - "client" with count=0 → client (index 0)
 * - "client, proxy" with count=1 → client (index 0)
 * - "spoofed, client, proxy" with count=1 → client (index 1)
 * - "client, cdn, nginx" with count=2 → client (index 0)
 */
const TRUSTED_PROXY_COUNT = parseInt(process.env.TRUSTED_PROXY_COUNT || '1', 10);

/**
 * Extract client identifier from request
 * 
 * SECURITY: Client IP extraction is security-critical for rate limiting.
 * Incorrect extraction allows attackers to:
 * - Bypass rate limits by spoofing headers
 * - DoS other users by filling their rate limit buckets
 * 
 * This function ONLY trusts proxy headers when TRUST_PROXY_HEADERS=true.
 * When not behind a trusted proxy, we use multiple strategies to avoid
 * a single shared bucket that could enable application-wide DoS.
 */
export function getClientIdentifier(request: Request): string {
  // If not explicitly trusting proxy headers, use fallback strategies
  // to avoid all requests sharing a single bucket (DoS vulnerability)
  if (!TRUST_PROXY_HEADERS) {
    // Strategy 1: Use NextRequest.ip if available (set by Vercel/some platforms)
    // This is safe because it's set by the platform, not from headers
    const nextRequest = request as { ip?: string };
    if (nextRequest.ip) {
      return `platform:${nextRequest.ip}`;
    }
    
    // Strategy 2: Use a hash of request characteristics as a fingerprint
    // This creates some bucketing while preventing spoofing
    // Note: This is less accurate but better than a single shared bucket
    const userAgent = request.headers.get('user-agent') || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const acceptEncoding = request.headers.get('accept-encoding') || '';
    
    // Create a simple fingerprint hash
    // This won't be unique per client but will create multiple buckets
    const fingerprint = `${userAgent.slice(0, 50)}|${acceptLanguage.slice(0, 20)}|${acceptEncoding.slice(0, 20)}`;
    
    // Use a simple hash function to create a bucket identifier
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Return a fingerprint-based identifier
    // This creates ~1000 buckets instead of 1, reducing DoS impact
    return `fingerprint:${Math.abs(hash % 1000)}`;
  }
  
  // ONLY check these headers when we trust our proxy infrastructure
  
  // 1. Cloudflare: CF-Connecting-IP is set by Cloudflare edge
  // Only trust if you're actually behind Cloudflare
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }
  
  // 2. X-Real-IP: Typically set by nginx with "proxy_set_header X-Real-IP $remote_addr"
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  // 3. X-Forwarded-For: Standard proxy header, format "client, proxy1, proxy2, ..."
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(Boolean);
    if (ips.length > 0) {
      // Calculate the index of the client IP
      // The rightmost TRUSTED_PROXY_COUNT IPs are our trusted proxies
      // Client IP is just before those: length - TRUSTED_PROXY_COUNT - 1
      // But we use max(0, ...) to handle edge cases
      // 
      // Example: "client, nginx" with count=1:
      //   length=2, index = max(0, 2 - 1 - 1) = 0 → "client" ✓
      // Example: "spoofed, client, nginx" with count=1:
      //   length=3, index = max(0, 3 - 1 - 1) = 1 → "client" ✓
      // Example: "client" with count=1:
      //   length=1, index = max(0, 1 - 1 - 1) = 0 → "client" ✓
      const clientIndex = Math.max(0, ips.length - TRUSTED_PROXY_COUNT - 1);
      return ips[clientIndex];
    }
  }
  
  // Fallback when behind proxy but no headers found
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
