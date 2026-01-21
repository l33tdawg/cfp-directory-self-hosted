/**
 * HTML Sanitizer Unit Tests
 * 
 * Tests for XSS prevention and HTML sanitization using sanitize-html.
 * These tests run against the actual sanitize-html implementation.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeUserHtml, stripHtml } from '@/lib/security/html-sanitizer';

describe('HTML Sanitizer', () => {
  describe('sanitizeHtml', () => {
    describe('allowed content', () => {
      it('should allow basic text formatting tags', () => {
        const input = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<strong>Bold</strong>');
        expect(result).toContain('<em>italic</em>');
      });

      it('should allow headings', () => {
        const input = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<h1>Title</h1>');
        expect(result).toContain('<h2>Subtitle</h2>');
        expect(result).toContain('<h3>Section</h3>');
      });

      it('should allow lists', () => {
        const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<ul>');
        expect(result).toContain('<li>Item 1</li>');
      });

      it('should allow safe links with https', () => {
        const input = '<a href="https://example.com">Link</a>';
        const result = sanitizeHtml(input);
        expect(result).toContain('href="https://example.com"');
        expect(result).toContain('target="_blank"');
        expect(result).toContain('rel="noopener noreferrer"');
      });

      it('should allow images with https src', () => {
        const input = '<img src="https://example.com/image.jpg" alt="Test" />';
        const result = sanitizeHtml(input);
        expect(result).toContain('src="https://example.com/image.jpg"');
        expect(result).toContain('alt="Test"');
      });

      it('should allow tables', () => {
        const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<table>');
        expect(result).toContain('<th>Header</th>');
        expect(result).toContain('<td>Cell</td>');
      });

      it('should allow code blocks', () => {
        const input = '<pre><code>const x = 1;</code></pre>';
        const result = sanitizeHtml(input);
        expect(result).toContain('<pre>');
        expect(result).toContain('<code>');
      });

      it('should allow class and id attributes', () => {
        const input = '<div class="container" id="main"><p>Content</p></div>';
        const result = sanitizeHtml(input);
        expect(result).toContain('class="container"');
        expect(result).toContain('id="main"');
      });
    });

    describe('XSS prevention - script injection', () => {
      it('should remove script tags', () => {
        const input = '<p>Text</p><script>alert("XSS")</script>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script>');
        expect(result).not.toContain('alert');
      });

      it('should remove script tags with attributes', () => {
        const input = '<script src="https://evil.com/xss.js"></script>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('evil.com');
      });

      it('should handle nested scripts', () => {
        const input = '<div><script><script>alert(1)</script></script></div>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<script');
        expect(result).not.toContain('alert');
      });
    });

    describe('XSS prevention - event handlers', () => {
      it('should remove onclick handlers', () => {
        const input = '<button onclick="alert(1)">Click</button>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onclick');
        expect(result).not.toContain('alert');
      });

      it('should remove onerror handlers', () => {
        const input = '<img src="x" onerror="alert(1)">';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onerror');
        expect(result).not.toContain('alert');
      });

      it('should remove onload handlers', () => {
        const input = '<body onload="alert(1)"><p>Text</p></body>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onload');
        expect(result).not.toContain('alert');
      });

      it('should remove onmouseover handlers', () => {
        const input = '<div onmouseover="alert(1)">Hover me</div>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('onmouseover');
        expect(result).not.toContain('alert');
      });
    });

    describe('XSS prevention - dangerous URLs', () => {
      it('should block javascript: URLs in href', () => {
        const input = '<a href="javascript:alert(1)">Click me</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
      });

      it('should block javascript: URLs in src', () => {
        const input = '<img src="javascript:alert(1)">';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
      });

      it('should block vbscript: URLs', () => {
        const input = '<a href="vbscript:msgbox(1)">Click</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('vbscript:');
      });

      it('should block data: URLs in href', () => {
        const input = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('data:');
      });

      it('should block case-insensitive javascript: URLs', () => {
        const input = '<a href="JaVaScRiPt:alert(1)">Click</a>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('JaVaScRiPt:');
        expect(result).not.toContain('javascript:');
      });
    });

    describe('XSS prevention - dangerous tags', () => {
      it('should remove iframe tags', () => {
        const input = '<iframe src="https://evil.com"></iframe>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<iframe');
        expect(result).not.toContain('evil.com');
      });

      it('should remove object tags', () => {
        const input = '<object data="https://evil.com/exploit.swf"></object>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<object');
      });

      it('should remove embed tags', () => {
        const input = '<embed src="https://evil.com/exploit.swf">';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<embed');
      });

      it('should remove form tags', () => {
        const input = '<form action="https://evil.com"><input type="text"></form>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<form');
        expect(result).not.toContain('<input');
      });

      it('should remove style tags', () => {
        const input = '<style>body { background: url("javascript:alert(1)") }</style>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('<style');
      });
    });

    describe('edge cases', () => {
      it('should handle empty input', () => {
        expect(sanitizeHtml('')).toBe('');
      });

      it('should handle null-like input', () => {
        expect(sanitizeHtml(null as unknown as string)).toBe('');
        expect(sanitizeHtml(undefined as unknown as string)).toBe('');
      });

      it('should handle plain text', () => {
        const input = 'Just plain text without any HTML';
        const result = sanitizeHtml(input);
        expect(result).toBe(input);
      });

      it('should handle deeply nested malicious content', () => {
        const input = '<div><p><span><a href="javascript:alert(1)"><img src="x" onerror="alert(2)"></a></span></p></div>';
        const result = sanitizeHtml(input);
        expect(result).not.toContain('javascript:');
        expect(result).not.toContain('onerror');
      });

      it('should preserve safe content within malicious wrappers', () => {
        const input = '<script>alert(1)</script><p>Safe content</p><script>alert(2)</script>';
        const result = sanitizeHtml(input);
        expect(result).toContain('Safe content');
        expect(result).not.toContain('alert');
      });
    });
  });

  describe('sanitizeUserHtml', () => {
    it('should be more restrictive than sanitizeHtml', () => {
      // sanitizeUserHtml doesn't allow images
      const input = '<img src="https://example.com/img.jpg" alt="test"><p>Safe</p>';
      const result = sanitizeUserHtml(input);
      expect(result).not.toContain('<img');
      expect(result).toContain('Safe');
    });

    it('should allow basic formatting', () => {
      const input = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const result = sanitizeUserHtml(input);
      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    it('should allow links', () => {
      const input = '<a href="https://example.com">Link</a>';
      const result = sanitizeUserHtml(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('should allow code tags', () => {
      const input = '<code>const x = 1;</code>';
      const result = sanitizeUserHtml(input);
      expect(result).toContain('<code>');
    });

    it('should strip style attributes', () => {
      // sanitize-html strips style by default when not in allowedAttributes
      const input = '<p style="color: red;">Text</p>';
      const result = sanitizeUserHtml(input);
      expect(result).toContain('Text');
      expect(result).not.toContain('style=');
    });

    it('should not allow tables', () => {
      const input = '<table><tr><td>Cell</td></tr></table><p>Text</p>';
      const result = sanitizeUserHtml(input);
      expect(result).not.toContain('<table');
      expect(result).toContain('Text');
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      const input = '<h1>Title</h1><p><strong>Bold</strong> text</p>';
      const result = stripHtml(input);
      expect(result).toBe('TitleBold text');
    });

    it('should handle empty input', () => {
      expect(stripHtml('')).toBe('');
    });

    it('should handle plain text', () => {
      const input = 'Just plain text';
      expect(stripHtml(input)).toBe(input);
    });

    it('should strip malicious content', () => {
      const input = '<script>alert(1)</script>Safe text';
      const result = stripHtml(input);
      // sanitize-html removes script tags and their content
      expect(result).not.toContain('alert');
    });

    it('should preserve text content from nested tags', () => {
      const input = '<div><p><span>Nested</span> text</p></div>';
      const result = stripHtml(input);
      expect(result).toBe('Nested text');
    });
  });
});
