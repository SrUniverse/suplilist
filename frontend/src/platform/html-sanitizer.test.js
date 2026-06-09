import { describe, it, expect } from 'vitest';
import { sanitizeHtml, stripHtmlTags, sanitizeUrl, sanitizeAttributes } from './html-sanitizer.js';

describe('sanitizeHtml', () => {
  it('should escape ampersand', () => {
    expect(sanitizeHtml('a & b')).toBe('a &amp; b');
  });

  it('should escape < and >', () => {
    expect(sanitizeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('should escape double quotes', () => {
    expect(sanitizeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(sanitizeHtml("it's")).toBe('it&#x27;s');
  });

  it('should escape forward slash', () => {
    expect(sanitizeHtml('a/b')).toBe('a&#x2F;b');
  });

  it('should return empty string for null', () => {
    expect(sanitizeHtml(null)).toBe('');
  });

  it('should return empty string for non-string', () => {
    expect(sanitizeHtml(42)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('should not modify safe text', () => {
    expect(sanitizeHtml('Hello World')).toBe('Hello World');
  });

  it('should escape XSS attack vector', () => {
    const result = sanitizeHtml('<img src=x onerror=alert(1)>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

describe('stripHtmlTags', () => {
  it('should strip basic tags', () => {
    expect(stripHtmlTags('<p>hello</p>')).toBe('hello');
  });

  it('should strip nested tags', () => {
    expect(stripHtmlTags('<div><span>text</span></div>')).toBe('text');
  });

  it('should return empty string for null', () => {
    expect(stripHtmlTags(null)).toBe('');
  });

  it('should not modify plain text', () => {
    expect(stripHtmlTags('plain text')).toBe('plain text');
  });
});

describe('sanitizeUrl', () => {
  it('should allow https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('should allow http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('should block javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('should block data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<script>')).toBe('');
  });

  it('should block vbscript:', () => {
    expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('');
  });

  it('should block file:', () => {
    expect(sanitizeUrl('file:///etc/passwd')).toBe('');
  });

  it('should return empty for null', () => {
    expect(sanitizeUrl(null)).toBe('');
  });

  it('should be case-insensitive for protocol check', () => {
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('');
  });
});

describe('sanitizeAttributes', () => {
  it('should allow href with safe URL', () => {
    const result = sanitizeAttributes({ href: 'https://example.com' });
    expect(result).toContain('href="https://example.com"');
  });

  it('should sanitize href with javascript:', () => {
    const result = sanitizeAttributes({ href: 'javascript:alert(1)' });
    expect(result).toContain('href=""');
  });

  it('should allow class attribute', () => {
    const result = sanitizeAttributes({ class: 'my-class' });
    expect(result).toContain('class="my-class"');
  });

  it('should escape HTML in attribute values', () => {
    const result = sanitizeAttributes({ title: '<script>' });
    expect(result).toContain('&lt;script&gt;');
  });

  it('should ignore non-allowed attributes', () => {
    const result = sanitizeAttributes({ onclick: 'alert(1)', class: 'safe' });
    expect(result).not.toContain('onclick');
    expect(result).toContain('class');
  });

  it('should return empty string for null', () => {
    expect(sanitizeAttributes(null)).toBe('');
  });

  it('should handle empty object', () => {
    expect(sanitizeAttributes({})).toBe('');
  });
});
