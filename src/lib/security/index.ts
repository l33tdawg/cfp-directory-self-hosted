/**
 * Security Module
 * 
 * Centralized security utilities including:
 * - Input sanitization
 * - Security headers
 * - CSRF protection helpers
 * - Content Security Policy
 */

import { NextResponse } from 'next/server';
import path from 'path';
import crypto from 'crypto';

// =============================================================================
// Security Headers
// =============================================================================

/**
 * Security headers to apply to all responses.
 * Based on OWASP recommendations.
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS filter in browsers
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Disable DNS prefetching
  'X-DNS-Prefetch-Control': 'off',
  
  // Permit only HTTPS (in production)
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  
  // Permissions policy (restrict features)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

// =============================================================================
// Content Security Policy
// =============================================================================

/**
 * Generate Content Security Policy header value.
 * Customize based on your application's needs.
 */
export function getContentSecurityPolicy(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://cfp.directory",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  
  return directives.join('; ');
}

// =============================================================================
// Input Sanitization
// =============================================================================

/**
 * Sanitize a string to prevent XSS attacks.
 * Escapes HTML special characters.
 */
export function sanitizeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return input.replace(/[&<>"'/]/g, char => htmlEscapes[char]);
}

/**
 * Remove potentially dangerous characters from a string.
 * Useful for file names, slugs, etc.
 */
export function sanitizeFileName(input: string): string {
  // Remove path traversal attempts
  let sanitized = input.replace(/\.\./g, '');
  
  // Remove special characters
  sanitized = sanitized.replace(/[<>:"|?*\\\/]/g, '');
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  
  return sanitized;
}

/**
 * Validate and sanitize a URL.
 * Returns null if the URL is invalid or potentially malicious.
 */
export function sanitizeUrl(input: string): string | null {
  try {
    const url = new URL(input);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    
    // Block javascript: URLs (shouldn't happen due to protocol check, but be safe)
    if (input.toLowerCase().includes('javascript:')) {
      return null;
    }
    
    return url.toString();
  } catch {
    return null;
  }
}

// =============================================================================
// SQL Injection Prevention
// =============================================================================

/**
 * Check if a string contains potential SQL injection patterns.
 * This is a defense-in-depth measure - always use parameterized queries.
 */
export function containsSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
    /(--|\/\*|\*\/)/,
    /(\bOR\b.*=.*\bOR\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(;\s*DROP)/i,
    /('\s*OR\s*'.*'=')/i,
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

// =============================================================================
// Path Traversal Prevention
// =============================================================================

/**
 * Check if a path contains traversal attempts.
 */
export function containsPathTraversal(input: string): boolean {
  const traversalPatterns = [
    /\.\./,
    /%2e%2e/i,
    /%252e%252e/i,
    /\.%2e/i,
    /%2e\./i,
  ];
  
  return traversalPatterns.some(pattern => pattern.test(input));
}

/**
 * Normalize and validate a file path within a base directory.
 * Returns null if the path would escape the base directory.
 */
export function safeResolvePath(basePath: string, userPath: string): string | null {
  // Normalize the paths
  const normalizedBase = path.resolve(basePath);
  const resolvedPath = path.resolve(basePath, userPath);
  
  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(normalizedBase + path.sep) && resolvedPath !== normalizedBase) {
    return null;
  }
  
  return resolvedPath;
}

// =============================================================================
// Rate Limiting Helpers
// =============================================================================

/**
 * Get rate limit key for a request.
 * Combines IP and optional user ID for more accurate limiting.
 */
export function getRateLimitKey(request: Request, userId?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  const ip = cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : 'unknown');
  
  if (userId) {
    return `${userId}:${ip}`;
  }
  
  return ip;
}

// =============================================================================
// CSRF Token Helpers
// =============================================================================

/**
 * Generate a CSRF token.
 * NextAuth handles this automatically, but this can be used for custom forms.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify origin header matches allowed origins.
 */
export function verifyOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  if (origin) {
    return allowedOrigins.some(allowed => origin === allowed || origin.endsWith(`.${allowed}`));
  }
  
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.some(
        allowed => refererUrl.origin === allowed || refererUrl.host.endsWith(`.${allowed}`)
      );
    } catch {
      return false;
    }
  }
  
  // No origin or referer header
  return false;
}

// All exports are declared inline with their definitions above
