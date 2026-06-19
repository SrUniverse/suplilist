/**
 * HTTP Caching Middleware
 *
 * Implements smart HTTP caching strategies:
 * - Cache-Control headers based on endpoint
 * - Conditional requests (If-None-Match, If-Modified-Since)
 * - 304 Not Modified responses
 * - Public vs Private cache directives
 * - Immutable resources (hashed assets)
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'node:crypto';
import { logger } from '../shared/utils/logger.js';

interface CachePolicy {
  maxAge: number; // Seconds
  scope: 'public' | 'private';
  revalidate: boolean; // s-maxage for CDN revalidation
  immutable: boolean; // For versioned resources
}

/**
 * Define cache policies for different endpoint patterns
 */
const CACHE_POLICIES: Record<string, CachePolicy> = {
  // Supplements (frequently accessed, changes hourly)
  '/api/supplements': {
    maxAge: 300, // 5 minutes
    scope: 'public',
    revalidate: true,
    immutable: false,
  },
  '/api/supplements/search': {
    maxAge: 600, // 10 minutes
    scope: 'public',
    revalidate: true,
    immutable: false,
  },
  '/api/supplements/.*/price-history': {
    maxAge: 1800, // 30 minutes (price history changes less frequently)
    scope: 'public',
    revalidate: true,
    immutable: false,
  },

  // User profile (private, changes infrequently)
  '/api/profile': {
    maxAge: 3600, // 1 hour
    scope: 'private',
    revalidate: false,
    immutable: false,
  },
  '/api/settings': {
    maxAge: 3600, // 1 hour
    scope: 'private',
    revalidate: false,
    immutable: false,
  },

  // Audit logs (never cache, always fresh)
  '/api/audit': {
    maxAge: 0,
    scope: 'private',
    revalidate: false,
    immutable: false,
  },

  // Stack/Favorites (personal data, cache briefly)
  '/api/stack': {
    maxAge: 300, // 5 minutes
    scope: 'private',
    revalidate: false,
    immutable: false,
  },
  '/api/favorites': {
    maxAge: 300,
    scope: 'private',
    revalidate: false,
    immutable: false,
  },

  // Static/immutable resources
  '/api/reports': {
    maxAge: 86400, // 24 hours for reports
    scope: 'private',
    revalidate: true,
    immutable: false,
  },

  // Default fallback
  'default': {
    maxAge: 0,
    scope: 'private',
    revalidate: false,
    immutable: false,
  },
};

/**
 * HTTP Caching Middleware
 * Sets Cache-Control headers based on endpoint
 */
export function httpCachingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Skip caching for non-GET requests
  if (req.method !== 'GET') {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return next();
  }

  // Find matching cache policy
  const policy = getCachePolicyForEndpoint(req.path);

  if (policy.maxAge === 0) {
    // No caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    // Build Cache-Control header
    const cacheDirectives: string[] = [];

    // Scope (public can be cached by proxies/CDN, private only by browser)
    if (policy.scope === 'public') {
      cacheDirectives.push('public');
    } else {
      cacheDirectives.push('private');
    }

    // Max age for browser cache
    cacheDirectives.push(`max-age=${policy.maxAge}`);

    // Revalidation directive for CDN
    if (policy.revalidate) {
      cacheDirectives.push(`s-maxage=${policy.maxAge * 2}`); // CDN cache longer
    }

    // Immutable for versioned resources
    if (policy.immutable) {
      cacheDirectives.push('immutable');
    } else {
      cacheDirectives.push('must-revalidate');
    }

    res.setHeader('Cache-Control', cacheDirectives.join(', '));

    // Set expiration time
    const expiresDate = new Date(Date.now() + policy.maxAge * 1000);
    res.setHeader('Expires', expiresDate.toUTCString());
  }

  // Set Vary header to indicate cache varies by certain request headers
  res.setHeader('Vary', 'Accept, Accept-Encoding, Authorization');

  // Intercept response to handle conditional requests
  interceptConditionalRequest(req, res);

  next();
}

/**
 * Handle conditional requests (If-None-Match, If-Modified-Since)
 * Return 304 Not Modified if appropriate
 */
function interceptConditionalRequest(req: Request, res: Response): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    // Generate ETag for this response
    const etagValue = generateETag(body);

    // Check If-None-Match (ETag-based)
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etagValue && res.statusCode === 200) {
      logger.debug('304 Not Modified returned', {
        endpoint: req.path,
        etag: etagValue,
      });
      // Return 304 without body
      return res.status(304).end();
    }

    // Set ETag for next request
    res.setHeader('ETag', etagValue);

    // Set Last-Modified header
    res.setHeader('Last-Modified', new Date().toUTCString());

    return originalJson.call(this, body);
  };
}

/**
 * Generate ETag from response body
 */
function generateETag(body: any): string {
  const payload = JSON.stringify(body);
  const hash = createHash('md5').update(payload).digest('hex').substring(0, 8);
  return `"${hash}"`;
}

/**
 * Find cache policy for an endpoint
 */
function getCachePolicyForEndpoint(path: string): CachePolicy {
  // Try exact match first
  for (const [pattern, policy] of Object.entries(CACHE_POLICIES)) {
    if (pattern === 'default') continue;

    // Convert glob pattern to regex
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(path)) {
      return policy;
    }
  }

  // Fallback to default
  return CACHE_POLICIES.default;
}

/**
 * Middleware to validate and enforce cache invalidation
 * Used after mutations
 */
export function cacheInvalidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Invalidate cache on mutations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    // Set headers to prevent caching of mutation responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    // Track which caches to invalidate
    const relatedPaths = getRelatedCachePaths(req);
    if (relatedPaths.length > 0) {
      // Store for potential cache invalidation by response handler
      (req as any).invalidateCachePaths = relatedPaths;
    }
  }

  next();
}

/**
 * Get related API paths that should be invalidated
 * when a mutation occurs
 */
function getRelatedCachePaths(req: Request): string[] {
  const invalidationMap: Record<string, string[]> = {
    '/api/profile': ['/api/profile'],
    '/api/settings': ['/api/settings'],
    '/api/stack': ['/api/stack', '/api/supplements'],
    '/api/favorites': ['/api/favorites', '/api/supplements'],
    '/api/supplements': ['/api/supplements', '/api/supplements/search'],
  };

  for (const [pattern, paths] of Object.entries(invalidationMap)) {
    if (req.path.includes(pattern)) {
      return paths;
    }
  }

  return [];
}

/**
 * Response header middleware to add caching advice
 */
export function cacheAdvisoryHeadersMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: any): Response {
    // Add X-Cache-Status header for debugging
    const cacheControl = res.getHeader('Cache-Control');
    if (cacheControl) {
      const status = String(cacheControl).includes('no-store') ? 'BYPASS' : 'CACHED';
      res.setHeader('X-Cache-Status', status);
    }

    return originalJson.call(this, body);
  };

  next();
}

export default httpCachingMiddleware;
