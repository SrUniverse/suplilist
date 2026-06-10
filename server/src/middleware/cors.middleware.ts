/**
 * CORS Middleware — Explicit Domain Whitelist Policy
 *
 * Implements production-ready Cross-Origin Resource Sharing with:
 * - Explicit domain whitelist (no wildcards)
 * - Type-safe origin validation
 * - Credentials support (cookies, auth headers)
 * - OWASP & W3C compliant
 * - Comprehensive CORS rejection logging
 *
 * Supported Domains:
 * - Development: http://localhost:5173
 * - Production: https://suplilist.app
 *
 * Exposed Headers:
 * - Content-Type (for API responses)
 * - Authorization (for auth headers)
 * - X-RateLimit-* (for rate limiting info)
 * - Retry-After (for rate limit retry timing)
 * - X-SupliList-Version (for client version tracking)
 *
 * Allowed Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
 * Allowed Headers: Content-Type, Authorization, X-SupliList-Client, If-Match
 */

import cors, { CorsOptions } from 'cors';
import { Request, Response } from 'express';
import { logger } from '../shared/utils/logger.js';

/**
 * Environment variable for allowed CORS origins
 * Format: comma-separated list of URLs or single URL
 * Examples: "http://localhost:5173,https://suplilist.app"
 */
interface CorsEnvironmentConfig {
  devOrigin?: string;
  prodOrigin?: string;
}

/**
 * Parse CORS origins from environment variables
 * Supports comma-separated list or fallback to defaults
 */
function parseAllowedOrigins(): string[] {
  const devOrigin = process.env.CORS_ORIGIN_DEV || 'http://localhost:5173';
  const prodOrigin = process.env.CORS_ORIGIN_PROD || 'https://suplilist.app';

  // In test environment, allow any origin for testing purposes
  if (process.env.NODE_ENV === 'test') {
    return [devOrigin];
  }

  // Allow custom origins from CORS_ORIGINS env var (comma-separated)
  const customOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : [];

  // Build final origin list
  const allOrigins = [devOrigin];

  // Add production origin only if in production mode or explicitly configured
  if (process.env.NODE_ENV === 'production' || customOrigins.includes(prodOrigin)) {
    allOrigins.push(prodOrigin);
  }

  // Add any additional custom origins
  allOrigins.push(...customOrigins.filter((o) => ![devOrigin, prodOrigin].includes(o)));

  return allOrigins;
}

const allowedOrigins = parseAllowedOrigins();

/**
 * Validates if origin is in whitelist
 * Returns true if origin matches whitelist, false otherwise
 */
function isOriginAllowed(origin: string | undefined): boolean {
  // No origin means same-origin request (e.g., from <form>, <img>, same domain)
  // These are allowed
  if (!origin) {
    return true;
  }

  // Check exact match in whitelist
  const allowed = allowedOrigins.some((allowedOrigin) => origin === allowedOrigin);

  if (!allowed) {
    // Log rejected CORS requests for security monitoring
    logger.warn('CORS request rejected', {
      origin,
      allowedOrigins,
      timestamp: new Date().toISOString(),
      userAgent: process.env.NODE_ENV === 'production' ? '[REDACTED]' : undefined,
    });
  }

  return allowed;
}

/**
 * CORS configuration options
 * Type-safe and OWASP-compliant
 */
const corsOptions: CorsOptions = {
  /**
   * Origin validation function
   * Called for every cross-origin request
   * Callback: (err, allow) => void
   */
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowed = isOriginAllowed(origin);

    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    }
  },

  /**
   * Allowed HTTP methods
   * Explicit list: no wildcard
   */
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  /**
   * Request headers allowed from cross-origin requests
   * Browser will preflight requests using other headers
   */
  allowedHeaders: [
    'Content-Type',      // JSON/form data
    'Authorization',     // JWT/Bearer tokens
    'X-SupliList-Client', // Custom app version header
    'If-Match',          // ETag validation
  ],

  /**
   * Response headers exposed to client JavaScript
   * Other headers are hidden by browser CORS policy
   */
  exposedHeaders: [
    'Content-Type',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After',
    'X-SupliList-Version',
    'X-SupliList-Request-Id',
  ],

  /**
   * Allow credentials (cookies, HTTP auth, TLS client certs)
   * REQUIRED for cookie-based sessions
   * MUST have explicit origin (never with origin: '*')
   */
  credentials: true,

  /**
   * Cache CORS preflight response for 24 hours
   * Reduces preflight requests from browser
   */
  maxAge: 24 * 60 * 60, // 86400 seconds

  /**
   * Succeed on success (don't call next with error)
   */
  optionsSuccessStatus: 200,
};

/**
 * Create CORS middleware
 * Type: Express middleware factory
 * Returns: middleware function
 */
export function createCorsMiddleware() {
  return cors(corsOptions);
}

/**
 * Log CORS configuration at startup
 * Useful for debugging origin issues in logs
 */
export function logCorsConfiguration(): void {
  const env = process.env.NODE_ENV || 'development';

  logger.info('CORS Configuration', {
    environment: env,
    allowedOrigins,
    credentialsEnabled: true,
    allowedMethods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders,
    exposedHeaders: corsOptions.exposedHeaders,
    preflightCacheMaxAge: corsOptions.maxAge,
  });
}

export default createCorsMiddleware;
