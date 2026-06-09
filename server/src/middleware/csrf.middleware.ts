import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { redisClient } from '../shared/infrastructure/redis/redis.client.js';

const CSRF_TOKEN_TTL = 3600; // 1 hour
const CSRF_BLACKLIST_PREFIX = 'csrf:blacklist:';
const CSRF_TOKEN_PREFIX = 'csrf:token:';

/**
 * CSRF Token Management Middleware
 *
 * Implements:
 * 1. Token generation and storage in Redis (TTL: 1 hour)
 * 2. Token rotation on successful login/MFA
 * 3. Token invalidation (blacklist old tokens in Redis)
 * 4. Rejection of old/invalid tokens (403)
 *
 * Flow:
 * - User logs in → generate new token, invalidate old
 * - Each request: validate token matches current (not blacklisted)
 * - On logout: invalidate token
 */

export interface AuthenticatedRequestWithCSRF extends Request {
  csrfToken?: string;
  csrfTokenNew?: string; // Rotated token for response
}

/**
 * Generate a new CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Store CSRF token in Redis with TTL
 */
async function storeCSRFToken(userId: string, token: string, ttl: number = CSRF_TOKEN_TTL): Promise<void> {
  const key = `${CSRF_TOKEN_PREFIX}${userId}`;
  await redisClient.setex(key, ttl, token);
}

/**
 * Retrieve current CSRF token for user
 */
async function getCSRFToken(userId: string): Promise<string | null> {
  const key = `${CSRF_TOKEN_PREFIX}${userId}`;
  return await redisClient.get(key);
}

/**
 * Blacklist (invalidate) a CSRF token
 */
async function blacklistCSRFToken(userId: string, token: string, ttl: number = CSRF_TOKEN_TTL): Promise<void> {
  const key = `${CSRF_BLACKLIST_PREFIX}${userId}:${token}`;
  await redisClient.setex(key, ttl, '1');
}

/**
 * Check if token is blacklisted
 */
async function isTokenBlacklisted(userId: string, token: string): Promise<boolean> {
  const key = `${CSRF_BLACKLIST_PREFIX}${userId}:${token}`;
  const exists = await redisClient.exists(key);
  return exists === 1;
}

/**
 * Rotate CSRF token (invalidate old, generate new)
 * Called after successful login or MFA
 */
export async function rotateCSRFToken(userId: string): Promise<string> {
  // Get old token (if exists)
  const oldToken = await getCSRFToken(userId);

  // Blacklist old token
  if (oldToken) {
    await blacklistCSRFToken(userId, oldToken);
  }

  // Generate and store new token
  const newToken = generateCSRFToken();
  await storeCSRFToken(userId, newToken);

  return newToken;
}

/**
 * Invalidate user's CSRF token (logout)
 */
export async function invalidateCSRFToken(userId: string): Promise<void> {
  const key = `${CSRF_TOKEN_PREFIX}${userId}`;
  await redisClient.del(key);
}

/**
 * Middleware: Validate CSRF token on state-mutating requests
 * Should be applied after authentication middleware
 */
export const csrfValidationMiddleware = async (
  req: AuthenticatedRequestWithCSRF,
  res: Response,
  next: NextFunction
) => {
  // Safe methods don't need CSRF validation
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Must be authenticated
  if (!req.user?.id) {
    return res.status(401).json({
      success: false,
      error: 'unauthorized',
      message: 'CSRF validation requires authentication',
    });
  }

  try {
    // Get CSRF token from header or body
    const tokenFromRequest = (req.headers['x-csrf-token'] as string) ||
                            req.body?.csrfToken;

    if (!tokenFromRequest) {
      return res.status(403).json({
        success: false,
        error: 'csrf_token_missing',
        message: 'CSRF token is required for this request',
      });
    }

    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(req.user.id, tokenFromRequest);
    if (blacklisted) {
      return res.status(403).json({
        success: false,
        error: 'csrf_token_invalid',
        message: 'CSRF token is invalid. Please refresh and try again.',
      });
    }

    // Validate token matches current token
    const currentToken = await getCSRFToken(req.user.id);
    if (!currentToken || currentToken !== tokenFromRequest) {
      return res.status(403).json({
        success: false,
        error: 'csrf_token_mismatch',
        message: 'CSRF token validation failed',
      });
    }

    // Token is valid, store it in request for use in handlers
    req.csrfToken = tokenFromRequest;

    next();
  } catch (error) {
    console.error('[CSRF] Validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'csrf_validation_error',
      message: 'CSRF validation failed',
    });
  }
};

/**
 * Middleware: Add CSRF token to response headers
 * Should be applied to all responses to provide fresh token
 */
export const csrfTokenResponseMiddleware = async (
  req: AuthenticatedRequestWithCSRF,
  res: Response,
  next: NextFunction
) => {
  // For authenticated requests, include CSRF token in response
  if (req.user?.id) {
    try {
      const token = await getCSRFToken(req.user.id);
      if (token) {
        res.setHeader('X-CSRF-Token', token);
      }
    } catch (error) {
      console.error('[CSRF] Error setting response token:', error);
    }
  }

  next();
};

/**
 * Express middleware factory for CSRF protection
 * Combines validation and response middleware
 */
export function createCSRFProtectionMiddleware() {
  return [csrfTokenResponseMiddleware, csrfValidationMiddleware];
}

export default {
  generateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  blacklistCSRFToken,
  isTokenBlacklisted,
  rotateCSRFToken,
  invalidateCSRFToken,
  csrfValidationMiddleware,
  csrfTokenResponseMiddleware,
  createCSRFProtectionMiddleware,
};
