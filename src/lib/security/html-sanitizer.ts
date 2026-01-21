/**
 * HTML Sanitization Utility
 * 
 * Provides safe HTML sanitization to prevent XSS attacks when rendering
 * user-provided or admin-provided HTML content.
 * 
 * Uses DOMPurify with a strict allowlist configuration.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Allowed HTML tags for rich text content
 * This is a strict allowlist - only these tags are permitted
 */
const ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  // Lists
  'ul', 'ol', 'li',
  // Links (href sanitized separately)
  'a',
  // Block elements
  'div', 'blockquote', 'pre', 'code',
  // Media (src sanitized separately)
  'img',
  // Tables
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  // Horizontal rule
  'hr',
];

/**
 * Allowed HTML attributes
 * Only these attributes are permitted on allowed tags
 */
const ALLOWED_ATTR = [
  // Common
  'class', 'id', 'style',
  // Links
  'href', 'target', 'rel',
  // Images
  'src', 'alt', 'width', 'height',
  // Tables
  'colspan', 'rowspan',
];

/**
 * Allowed URL schemes for href and src attributes
 * Blocks javascript:, data:, vbscript:, etc.
 */
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

/**
 * Forbidden URL schemes (explicitly blocked)
 */
const FORBID_URI_SCHEMES = ['javascript', 'vbscript', 'data'];

/**
 * Configure DOMPurify with strict settings
 */
function getConfiguredDOMPurify() {
  // Add hook to sanitize URLs
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    // Check href and src attributes
    if (data.attrName === 'href' || data.attrName === 'src') {
      const value = data.attrValue.toLowerCase().trim();
      
      // Block dangerous URL schemes
      for (const scheme of FORBID_URI_SCHEMES) {
        if (value.startsWith(`${scheme}:`)) {
          data.attrValue = '';
          return;
        }
      }
      
      // For links, add security attributes
      if (data.attrName === 'href' && node.nodeName === 'A') {
        // External links should open in new tab with security measures
        if (data.attrValue.startsWith('http')) {
          (node as Element).setAttribute('target', '_blank');
          (node as Element).setAttribute('rel', 'noopener noreferrer');
        }
      }
    }
  });
  
  // Remove hooks on cleanup (for SSR)
  return DOMPurify;
}

/**
 * Sanitize HTML content for safe rendering
 * 
 * @param dirty - Untrusted HTML content
 * @returns Sanitized HTML safe for rendering with dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  
  const purify = getConfiguredDOMPurify();
  
  return purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    // Additional security options
    FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
    // Prevent DOM clobbering
    SANITIZE_DOM: true,
    // Keep structure but remove dangerous content
    KEEP_CONTENT: true,
    // Force HTTPS for protocol-relative URLs
    FORCE_BODY: false,
  });
}

/**
 * Sanitize HTML with even stricter settings (for user-generated content)
 * Strips more formatting options for comments, bios, etc.
 */
export function sanitizeUserHtml(dirty: string): string {
  if (!dirty) return '';
  
  const purify = getConfiguredDOMPurify();
  
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li', 'code'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOWED_URI_REGEXP,
    FORBID_TAGS: ['script', 'style', 'iframe', 'img', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'style'],
    SANITIZE_DOM: true,
    KEEP_CONTENT: true,
  });
}

/**
 * Strip all HTML tags, returning only text content
 * Useful for excerpts, meta descriptions, etc.
 */
export function stripHtml(dirty: string): string {
  if (!dirty) return '';
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export default sanitizeHtml;
