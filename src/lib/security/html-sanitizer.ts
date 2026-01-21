/**
 * HTML Sanitization Utility
 * 
 * Provides safe HTML sanitization to prevent XSS attacks when rendering
 * user-provided or admin-provided HTML content.
 * 
 * Uses sanitize-html for server-side compatible sanitization.
 * This package works in Node.js without requiring jsdom.
 */

import sanitizeHtmlLib from 'sanitize-html';

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
 * Allowed HTML attributes per tag
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  '*': ['class', 'id'],
  'a': ['href', 'target', 'rel'],
  'img': ['src', 'alt', 'width', 'height'],
  'table': ['border'],
  'th': ['colspan', 'rowspan'],
  'td': ['colspan', 'rowspan'],
};

/**
 * Allowed URL schemes for href and src
 * Blocks javascript:, data:, vbscript:, etc.
 */
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/**
 * Sanitize HTML content for safe rendering
 * 
 * @param dirty - Untrusted HTML content
 * @returns Sanitized HTML safe for rendering with dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  
  return sanitizeHtmlLib(dirty, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    // Transform links to add security attributes
    transformTags: {
      'a': (tagName, attribs) => {
        const href = attribs.href || '';
        // External links get security attributes
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return {
            tagName,
            attribs: {
              ...attribs,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          };
        }
        return { tagName, attribs };
      },
    },
    // Disallow inline styles to prevent CSS-based attacks
    allowedStyles: {},
    // Don't allow data: URLs in images
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
    // Remove empty elements that could be used for click hijacking
    exclusiveFilter: (frame) => {
      // Remove script tags that somehow got through
      if (frame.tag === 'script') return true;
      // Remove style tags
      if (frame.tag === 'style') return true;
      return false;
    },
  });
}

/**
 * Sanitize HTML with even stricter settings (for user-generated content)
 * Strips more formatting options for comments, bios, etc.
 */
export function sanitizeUserHtml(dirty: string): string {
  if (!dirty) return '';
  
  return sanitizeHtmlLib(dirty, {
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li', 'code'],
    allowedAttributes: {
      'a': ['href', 'target', 'rel'],
    },
    allowedSchemes: ALLOWED_SCHEMES,
    transformTags: {
      'a': (tagName, attribs) => {
        const href = attribs.href || '';
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return {
            tagName,
            attribs: {
              ...attribs,
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          };
        }
        return { tagName, attribs };
      },
    },
    allowedStyles: {},
  });
}

/**
 * Strip all HTML tags, returning only text content
 * Useful for excerpts, meta descriptions, etc.
 */
export function stripHtml(dirty: string): string {
  if (!dirty) return '';
  
  return sanitizeHtmlLib(dirty, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export default sanitizeHtml;
