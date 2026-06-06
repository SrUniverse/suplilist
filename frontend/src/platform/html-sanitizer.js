/**
 * HTML Sanitizer Utility
 * Prevents XSS attacks by escaping dangerous HTML characters
 */

/**
 * Sanitize HTML by escaping dangerous characters
 * @param {string} text - Raw text that may contain HTML
 * @returns {string} - Safe HTML-escaped text
 */
export function sanitizeHtml(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };

  return text.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Strip all HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} - Plain text without HTML
 */
export function stripHtmlTags(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * Validate and clean URLs to prevent javascript: and data: attacks
 * @param {string} url - URL to validate
 * @returns {string} - Safe URL or empty string
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Remove dangerous protocols
  const dangerous = /^(javascript:|data:|vbscript:|file:|about:)/i;
  if (dangerous.test(url)) {
    return '';
  }

  return url;
}

/**
 * Create safe HTML attributes
 * @param {object} attributes - Attributes to sanitize
 * @returns {string} - Safe HTML attribute string
 */
export function sanitizeAttributes(attributes) {
  const safe = {};
  const allowedAttrs = ['href', 'src', 'alt', 'title', 'style', 'class', 'id'];

  for (const [key, value] of Object.entries(attributes || {})) {
    if (allowedAttrs.includes(key) && typeof value === 'string') {
      if (key === 'href' || key === 'src') {
        safe[key] = sanitizeUrl(value);
      } else {
        safe[key] = sanitizeHtml(value);
      }
    }
  }

  return Object.entries(safe)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
}

export default {
  sanitizeHtml,
  stripHtmlTags,
  sanitizeUrl,
  sanitizeAttributes
};
