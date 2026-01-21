/**
 * Rate Limiting Unit Tests
 * 
 * Tests for rate limiting functionality and client IP extraction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Helper to create mock Request objects
function createMockRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
    },
  } as unknown as Request;
}

// We need to dynamically import the module after setting env vars
async function importRateLimit() {
  // Clear the module cache
  vi.resetModules();
  return import('@/lib/rate-limit');
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.resetModules();
    // Reset env vars
    delete process.env.TRUST_PROXY_HEADERS;
    delete process.env.TRUSTED_PROXY_COUNT;
  });

  describe('checkRateLimit', () => {
    it('should allow requests within the limit', async () => {
      const { checkRateLimit, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const identifier = 'test-user-1';
      const limit = RATE_LIMITS.api;
      
      for (let i = 0; i < limit.requests; i++) {
        const result = checkRateLimit(identifier, 'api');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(limit.requests - i - 1);
      }
    });

    it('should block requests exceeding the limit', async () => {
      const { checkRateLimit, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const identifier = 'test-user-2';
      const limit = RATE_LIMITS.api;
      
      // Exhaust the limit
      for (let i = 0; i < limit.requests; i++) {
        checkRateLimit(identifier, 'api');
      }
      
      // Next request should be blocked
      const result = checkRateLimit(identifier, 'api');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should have stricter limits for auth endpoints', async () => {
      const { RATE_LIMITS } = await importRateLimit();
      
      expect(RATE_LIMITS.authStrict.requests).toBeLessThan(RATE_LIMITS.api.requests);
      expect(RATE_LIMITS.auth.requests).toBeLessThan(RATE_LIMITS.api.requests);
    });

    it('should track different identifiers separately', async () => {
      const { checkRateLimit, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const user1 = 'user-1';
      const user2 = 'user-2';
      
      // Exhaust user1's limit
      for (let i = 0; i < RATE_LIMITS.api.requests; i++) {
        checkRateLimit(user1, 'api');
      }
      
      // user2 should still have full limit
      const result = checkRateLimit(user2, 'api');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.api.requests - 1);
    });

    it('should track different rate limit types separately', async () => {
      const { checkRateLimit, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const identifier = 'test-user';
      
      // Exhaust API limit
      for (let i = 0; i < RATE_LIMITS.api.requests; i++) {
        checkRateLimit(identifier, 'api');
      }
      
      // Auth limit should be unaffected
      const result = checkRateLimit(identifier, 'auth');
      expect(result.allowed).toBe(true);
    });
  });

  describe('getClientIdentifier - without proxy trust', () => {
    it('should return fingerprint-based identifier when TRUST_PROXY_HEADERS is false', async () => {
      process.env.TRUST_PROXY_HEADERS = 'false';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({
        'cf-connecting-ip': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
        'x-forwarded-for': '9.10.11.12, 13.14.15.16',
      });
      
      const result = getClientIdentifier(request);
      // Should return a fingerprint-based bucket, not the spoofed IPs
      expect(result).toMatch(/^fingerprint:\d+$/);
      expect(result).not.toBe('1.2.3.4');
      expect(result).not.toBe('5.6.7.8');
      expect(result).not.toContain('9.10.11.12');
    });

    it('should ignore all proxy headers when trust is disabled', async () => {
      process.env.TRUST_PROXY_HEADERS = 'false';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({
        'x-forwarded-for': 'attacker-spoofed-ip',
      });
      
      const result = getClientIdentifier(request);
      // Should use fingerprint-based bucketing, not spoofed headers
      expect(result).toMatch(/^fingerprint:\d+$/);
      expect(result).not.toBe('attacker-spoofed-ip');
    });
    
    it('should create different buckets for different user agents', async () => {
      process.env.TRUST_PROXY_HEADERS = 'false';
      const { getClientIdentifier } = await importRateLimit();
      
      const request1 = createMockRequest({
        'user-agent': 'Mozilla/5.0 Chrome/100',
      });
      const request2 = createMockRequest({
        'user-agent': 'Mozilla/5.0 Firefox/100',
      });
      
      const result1 = getClientIdentifier(request1);
      const result2 = getClientIdentifier(request2);
      
      // Different user agents may create different fingerprints
      expect(result1).toMatch(/^fingerprint:\d+$/);
      expect(result2).toMatch(/^fingerprint:\d+$/);
    });
  });

  describe('getClientIdentifier - with proxy trust enabled', () => {
    it('should prefer CF-Connecting-IP when present', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      process.env.TRUSTED_PROXY_COUNT = '1';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({
        'cf-connecting-ip': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
        'x-forwarded-for': '9.10.11.12',
      });
      
      const result = getClientIdentifier(request);
      expect(result).toBe('1.2.3.4');
    });

    it('should use X-Real-IP when CF-Connecting-IP is absent', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      process.env.TRUSTED_PROXY_COUNT = '1';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({
        'x-real-ip': '5.6.7.8',
        'x-forwarded-for': '9.10.11.12',
      });
      
      const result = getClientIdentifier(request);
      expect(result).toBe('5.6.7.8');
    });

    it('should extract client IP from X-Forwarded-For with 1 proxy', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      process.env.TRUSTED_PROXY_COUNT = '1';
      const { getClientIdentifier } = await importRateLimit();
      
      // Format: "client, proxy"
      const request = createMockRequest({
        'x-forwarded-for': '203.0.113.50, 10.0.0.1',
      });
      
      const result = getClientIdentifier(request);
      expect(result).toBe('203.0.113.50');
    });

    it('should extract client IP from X-Forwarded-For with 2 proxies', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      process.env.TRUSTED_PROXY_COUNT = '2';
      const { getClientIdentifier } = await importRateLimit();
      
      // Format: "client, cdn, nginx"
      const request = createMockRequest({
        'x-forwarded-for': '203.0.113.50, 198.51.100.1, 10.0.0.1',
      });
      
      const result = getClientIdentifier(request);
      expect(result).toBe('203.0.113.50');
    });

    it('should handle spoofed IPs before real client with correct proxy count', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      process.env.TRUSTED_PROXY_COUNT = '1';
      const { getClientIdentifier } = await importRateLimit();
      
      // Attacker adds "spoofed" at the front, proxy adds real client
      // Format: "spoofed, real_client, proxy"
      const request = createMockRequest({
        'x-forwarded-for': 'spoofed-by-attacker, 203.0.113.50, 10.0.0.1',
      });
      
      // With TRUSTED_PROXY_COUNT=1, we trust the last 1 IP is our proxy
      // So client should be at index length - 1 - 1 = 1 → "203.0.113.50"
      const result = getClientIdentifier(request);
      expect(result).toBe('203.0.113.50');
    });

    it('should handle single IP in X-Forwarded-For', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      process.env.TRUSTED_PROXY_COUNT = '1';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({
        'x-forwarded-for': '203.0.113.50',
      });
      
      const result = getClientIdentifier(request);
      expect(result).toBe('203.0.113.50');
    });

    it('should trim whitespace from IPs', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({
        'cf-connecting-ip': '  1.2.3.4  ',
      });
      
      const result = getClientIdentifier(request);
      expect(result).toBe('1.2.3.4');
    });

    it('should handle X-Forwarded-For with extra whitespace', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      process.env.TRUSTED_PROXY_COUNT = '1';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({
        'x-forwarded-for': '  203.0.113.50  ,  10.0.0.1  ',
      });
      
      const result = getClientIdentifier(request);
      expect(result).toBe('203.0.113.50');
    });

    it('should return unknown when no proxy headers present', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      const { getClientIdentifier } = await importRateLimit();
      
      const request = createMockRequest({});
      
      const result = getClientIdentifier(request);
      expect(result).toBe('unknown');
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should return null when under limit', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      const { rateLimitMiddleware, clearAllRateLimits } = await importRateLimit();
      clearAllRateLimits();
      
      const request = createMockRequest({
        'cf-connecting-ip': 'test-ip-middleware-1',
      });
      
      const result = rateLimitMiddleware(request, 'api');
      expect(result).toBeNull();
    });

    it('should return 429 response when over limit', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      const { rateLimitMiddleware, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const request = createMockRequest({
        'cf-connecting-ip': 'test-ip-middleware-2',
      });
      
      // Exhaust the limit
      for (let i = 0; i < RATE_LIMITS.api.requests; i++) {
        rateLimitMiddleware(request, 'api');
      }
      
      // Next request should be blocked
      const result = rateLimitMiddleware(request, 'api');
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('should include rate limit headers in 429 response', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      const { rateLimitMiddleware, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const request = createMockRequest({
        'cf-connecting-ip': 'test-ip-middleware-3',
      });
      
      // Exhaust the limit
      for (let i = 0; i < RATE_LIMITS.api.requests; i++) {
        rateLimitMiddleware(request, 'api');
      }
      
      const result = rateLimitMiddleware(request, 'api');
      expect(result?.headers.get('X-RateLimit-Limit')).toBe(RATE_LIMITS.api.requests.toString());
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('Retry-After')).toBeDefined();
    });

    it('should return JSON error body', async () => {
      process.env.TRUST_PROXY_HEADERS = 'true';
      const { rateLimitMiddleware, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const request = createMockRequest({
        'cf-connecting-ip': 'test-ip-middleware-4',
      });
      
      // Exhaust the limit
      for (let i = 0; i < RATE_LIMITS.api.requests; i++) {
        rateLimitMiddleware(request, 'api');
      }
      
      const result = rateLimitMiddleware(request, 'api');
      const body = await result?.json();
      
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMITED');
      expect(body.error.message).toContain('Too many requests');
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific identifier', async () => {
      const { checkRateLimit, resetRateLimit, clearAllRateLimits, RATE_LIMITS } = await importRateLimit();
      clearAllRateLimits();
      
      const identifier = 'reset-test-user';
      
      // Use up some requests
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, 'api');
      }
      
      // Reset
      resetRateLimit(identifier, 'api');
      
      // Should have full limit again
      const result = checkRateLimit(identifier, 'api');
      expect(result.remaining).toBe(RATE_LIMITS.api.requests - 1);
    });
  });

  describe('rate limit types', () => {
    it('should have appropriate limits for different endpoint types', async () => {
      const { RATE_LIMITS } = await importRateLimit();
      
      // API should have highest limit
      expect(RATE_LIMITS.api.requests).toBeGreaterThanOrEqual(100);
      
      // Auth should be stricter
      expect(RATE_LIMITS.auth.requests).toBeLessThan(RATE_LIMITS.api.requests);
      expect(RATE_LIMITS.authStrict.requests).toBeLessThan(RATE_LIMITS.auth.requests);
      
      // Upload should be limited
      expect(RATE_LIMITS.upload.requests).toBeLessThan(RATE_LIMITS.api.requests);
      
      // Webhook should allow frequent calls
      expect(RATE_LIMITS.webhook.requests).toBeGreaterThanOrEqual(60);
    });
  });
});
