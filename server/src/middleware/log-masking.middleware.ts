/**
 * Log Masking Middleware and Utilities
 *
 * Sanitizes sensitive data from logs:
 * - URLs with affiliate IDs (Amazon, eBay, etc.)
 * - Client IP addresses (hashed for GDPR compliance)
 * - Tokens and Bearer authentication
 * - API keys and secrets
 * - Personal identifiable information
 *
 * Performance: Built-in Map cache for IP hashing to avoid recalculation
 */

import { createHash } from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// Cache Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache for IP hash results (avoid recalculating same IPs)
 * Entries are stored with timestamp for optional expiration
 * Max ~10k entries should be sufficient for most deployments
 */
interface CacheEntry {
  hash: string;
  timestamp: number;
}

const MAX_CACHE_SIZE = 10000;
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

const ipHashCache = new Map<string, CacheEntry>();

/**
 * Get cached IP hash or compute new one
 */
function getOrComputeIPHash(ip: string): string {
  const cached = ipHashCache.get(ip);

  // Return if cached and not expired
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.hash;
  }

  // Remove expired entry
  if (cached) {
    ipHashCache.delete(ip);
  }

  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Masking Patterns (Production-Grade Security)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regex patterns for detecting sensitive data
 */
const PATTERNS = {
  // Bearer tokens: "Bearer xyz" → "Bearer ***"
  bearerToken: /Bearer\s+[^\s]+/gi,

  // Authorization header values (basic, digest, custom schemes)
  authHeader: /(?:Authorization|X-API-Key|X-Auth-Token|API-Key|Access-Token)\s*:\s*[^\s\n]+/gi,

  // Query string tokens (common in URLs)
  queryToken: /(?:token|api_key|apikey|auth|secret|pwd|password)=([^\s&]+)/gi,

  // URL affiliate/tracking parameters
  affiliateParam: /(?:tag|affiliate_id|referrer|utm_campaign|utm_medium|utm_source|utm_content)=([^\s&]+)/gi,

  // AWS S3 keys, GCP service accounts, etc
  awsKey: /AKIA[0-9A-Z]{16}/g,

  // Generic secret patterns (common env var patterns)
  secretPattern: /(?:password|pwd|secret|token|api_key|apikey|key|credential)["']?\s*[:=]\s*["']?([^\s"']+)["']?/gi,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // Phone numbers (basic pattern)
  phone: /\b(?:\+?55)?(?:\(?\d{2}\)?)?\s*9?\d{4}-?\d{4}\b/g,

  // Credit card patterns (16 digits with optional separators)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // SSN / CPF (Brazilian tax ID)
  cpf: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g,

  // IPv4 addresses (for explicit hashing)
  ipv4: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
};

// ─────────────────────────────────────────────────────────────────────────────
// Core Masking Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hash an IP address using SHA-256 (GDPR compliant)
 * Uses cache to avoid recalculation for same IPs
 *
 * @example
 * hashIP('192.168.1.1') // 'ip:a1b2c3d4...'
 */
export function hashIP(ip: string): string {
  if (!ip || ip === 'unknown-ip') {
    return 'ip:unknown';
  }

  // Check cache first
  const cached = getOrComputeIPHash(ip);
  if (cached) {
    return cached;
  }

  // Compute hash
  const hash = createHash('sha256').update(ip).digest('hex').substring(0, 16);
  const result = `ip:${hash}`;

  // Store in cache (with basic size management)
  if (ipHashCache.size >= MAX_CACHE_SIZE) {
    // Clear oldest entries (rough LRU without timestamp sorting)
    const firstKey = ipHashCache.keys().next().value;
    if (firstKey) {
      ipHashCache.delete(firstKey);
    }
  }

  ipHashCache.set(ip, { hash: result, timestamp: Date.now() });
  return result;
}

/**
 * Mask Bearer token: "Bearer xyz" → "Bearer ***"
 * Preserves the scheme, masks the actual token
 */
export function maskBearerToken(value: string): string {
  return value.replace(PATTERNS.bearerToken, 'Bearer ***');
}

/**
 * Mask Authorization header values
 * Removes credential data while keeping header name
 */
export function maskAuthHeaders(value: string): string {
  return value.replace(PATTERNS.authHeader, (match) => {
    const headerName = match.split(/[:=]/)[0].trim();
    return `${headerName}: ***`;
  });
}

/**
 * Sanitize URL by removing sensitive query parameters
 *
 * @example
 * sanitizeUrl('https://amazon.com.br/dp/B123?tag=supli-20')
 * // 'https://amazon.com.br/dp/B123?tag=***'
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Mask sensitive query parameters
    const sensitiveParams = [
      'tag', // Amazon affiliate tag
      'affiliate_id', // Generic affiliate ID
      'referrer', // Referrer tracking
      'utm_campaign', // UTM campaign ID
      'utm_medium', // UTM medium
      'utm_source', // UTM source
      'utm_content', // UTM content
      'utm_term', // UTM term
      'token', // Auth token
      'api_key', // API key
      'apikey', // API key variant
      'auth', // Auth credential
      'secret', // Secret
      'pwd', // Password
      'password', // Password
      'key', // Generic key
      'credential', // Credential
      'session', // Session ID
      'sid', // Session ID variant
    ];

    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***');
      }
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return masked version
    return url.replace(/([?&])([^=]+)=([^\s&]+)/g, '$1$2=***');
  }
}

/**
 * Mask email addresses
 * john.doe@example.com → j***@example.com
 */
export function maskEmail(email: string): string {
  return email.replace(PATTERNS.email, (match) => {
    const [localPart, domain] = match.split('@');
    const masked = localPart.charAt(0) + '***';
    return `${masked}@${domain}`;
  });
}

/**
 * Mask phone numbers
 * +5511987654321 → ***654321
 */
export function maskPhoneNumber(phone: string): string {
  return phone.replace(PATTERNS.phone, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }
    return `***${digits.slice(-4)}`;
  });
}

/**
 * Mask credit card numbers
 * 1234-5678-9012-3456 → 1234-5678-9012-****
 */
export function maskCreditCard(card: string): string {
  return card.replace(PATTERNS.creditCard, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 8) {
      return '****';
    }
    return `${digits.substring(0, 4)}****${digits.slice(-4)}`;
  });
}

/**
 * Mask CPF (Brazilian Tax ID)
 * 123.456.789-00 → 123.456.***-**
 */
export function maskCPF(cpf: string): string {
  return cpf.replace(PATTERNS.cpf, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length !== 11) {
      return '***.***.***-**';
    }
    return `${digits.substring(0, 3)}.${digits.substring(3, 6)}.***-**`;
  });
}

/**
 * Mask Bearer tokens and secrets in any string
 */
export function maskSecrets(value: string): string {
  let result = value;

  // Mask Bearer tokens
  result = maskBearerToken(result);

  // Mask Authorization headers
  result = maskAuthHeaders(result);

  // Mask query parameter secrets
  result = result.replace(PATTERNS.queryToken, (match) => {
    const paramName = match.split('=')[0];
    return `${paramName}=***`;
  });

  // Mask AWS keys (always mask completely)
  result = result.replace(PATTERNS.awsKey, '***');

  return result;
}

/**
 * Comprehensive masking for log entries
 * Handles multiple types of sensitive data
 */
export function maskLogEntry(entry: string): string {
  let result = entry;

  // Mask secrets first (includes Bearer tokens, API keys)
  result = maskSecrets(result);

  // Mask emails
  result = maskEmail(result);

  // Mask phone numbers
  result = maskPhoneNumber(result);

  // Mask credit cards
  result = maskCreditCard(result);

  // Mask CPF
  result = maskCPF(result);

  // Mask IPv4 addresses
  result = result.replace(PATTERNS.ipv4, (match) => hashIP(match));

  // Sanitize URLs (must be after secret masking)
  result = result.replace(/https?:\/\/[^\s]+/g, (url) => {
    try {
      return sanitizeUrl(url);
    } catch {
      return url;
    }
  });

  return result;
}

/**
 * Mask object properties deeply (for structured logs)
 * Recursively processes nested objects and arrays
 */
export function maskObjectProperties(obj: any, depth: number = 0): any {
  // Prevent infinite recursion
  if (depth > 20) {
    return obj;
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return maskLogEntry(obj);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskObjectProperties(item, depth + 1));
  }

  // Handle objects
  const masked: Record<string, any> = {};
  const sensitiveKeys = [
    'password', 'pwd', 'secret', 'token', 'api_key', 'apikey',
    'authorization', 'x-api-key', 'x-auth-token', 'access_token',
    'refresh_token', 'bearer', 'credential', 'aws_key', 'google_key',
    'private_key', 'secret_key', 'apiSecret', 'appSecret',
  ];

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Completely mask sensitive keys
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      masked[key] = '***';
      continue;
    }

    // For IP addresses, use the hash
    if (lowerKey.includes('ip') || lowerKey.includes('ipaddr') || lowerKey.includes('client_ip')) {
      if (typeof value === 'string') {
        masked[key] = hashIP(value);
        continue;
      }
    }

    // Recursively mask nested objects
    masked[key] = maskObjectProperties(value, depth + 1);
  }

  return masked;
}

/**
 * Extract IP from Express request
 * Respects proxy headers (Cloudflare, AWS ELB, etc.)
 */
export function extractClientIP(req: any): string {
  return (
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown-ip'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Express Middleware
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attach masked IP to request object for use in logger
 * Placed early in middleware stack before logging middleware
 */
export function logMaskingMiddleware(req: any, _res: any, next: any) {
  try {
    const clientIP = extractClientIP(req);
    req.maskedIP = hashIP(clientIP);
  } catch {
    req.maskedIP = 'ip:unknown';
  }

  next();
}

/**
 * Clear cache (useful for testing or memory management)
 */
export function clearIPHashCache(): void {
  ipHashCache.clear();
}

/**
 * Get cache stats (for monitoring)
 */
export function getIPHashCacheStats(): {
  size: number;
  max: number;
} {
  return {
    size: ipHashCache.size,
    max: MAX_CACHE_SIZE,
  };
}
