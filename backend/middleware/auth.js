import jwt from 'jsonwebtoken';
import { createClient } from 'ioredis';
import mongoose from 'mongoose';

// Guaranteed non-empty by server startup (env.config.ts validates at boot)
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Lazy Redis client — only created on first auth check
let redisClient = null;

function getRedis() {
  if (!redisClient) {
    redisClient = new createClient(process.env.REDIS_URI || 'redis://localhost:6379');
  }
  return redisClient;
}

async function isJtiBlocked(jti) {
  try {
    const redis = getRedis();
    const exists = await redis.exists(`jwt:blocklist:${jti}`);
    return exists === 1;
  } catch {
    // Redis unavailable — fail open to avoid locking out users, log the issue
    console.error('[auth] Redis unavailable for blocklist check — failing open');
    return false;
  }
}

async function getSessionsValidAfter(userId) {
  try {
    const redis = getRedis();
    const cached = await redis.get(`user:validAfter:${userId}`);
    if (cached !== null) return parseInt(cached, 10);
  } catch {
    // Redis miss — fall through to MongoDB
  }

  try {
    // Dynamic import to avoid circular deps; model may not be registered in all contexts
    const UserIdentityModel = mongoose.models['UserIdentity'] ||
      (await import('../../server/src/modules/identity/infrastructure/mongoose/user-identity.model.js')).UserIdentityModel;

    const doc = await UserIdentityModel.findById(userId).select('sessionsValidAfter').lean();
    return doc?.sessionsValidAfter ? doc.sessionsValidAfter.getTime() : 0;
  } catch {
    return 0;
  }
}

/**
 * JWT authentication middleware — mirrors server/src/shared/middleware/auth.middleware.ts requireAuth.
 * Checks: signature, expiry, pre_auth scope, JTI blocklist, global session revocation.
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        message: 'Authentication token is missing.',
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, error: 'token_expired', message: 'Authentication token has expired.' });
      }
      return res.status(401).json({ success: false, error: 'invalid_token', message: 'Invalid authentication token.' });
    }

    if (!decoded.sub || !decoded.jti) {
      return res.status(401).json({ success: false, error: 'malformed_token', message: 'Authentication token is malformed.' });
    }

    if (decoded.scope === 'pre_auth') {
      return res.status(401).json({
        success: false,
        error: 'insufficient_scope',
        message: 'This token is exclusively for MFA verification.',
      });
    }

    // JTI blocklist check — tokens revoked at logout are blocked immediately
    const revoked = await isJtiBlocked(decoded.jti);
    if (revoked) {
      return res.status(401).json({ success: false, error: 'token_revoked', message: 'This token has been revoked.' });
    }

    // Global revocation check — all sessions invalidated (e.g. password reset, security breach)
    const validAfterEpoch = await getSessionsValidAfter(decoded.sub);
    if (validAfterEpoch > 0 && decoded.iat * 1000 < validAfterEpoch) {
      return res.status(401).json({
        success: false,
        error: 'token_revoked_globally',
        message: 'All sessions have been invalidated. Please log in again.',
      });
    }

    req.user = {
      id: decoded.sub,
      jti: decoded.jti,
      role: decoded.role || 'user',
      status: decoded.status || 'active',
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error('[auth] Unexpected error in authenticateToken:', error);
    return res.status(500).json({ success: false, error: 'internal_server_error', message: 'Authentication error.' });
  }
}
