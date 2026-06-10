import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RedisTokenBlocklist } from '../infrastructure/security/redis-token-blocklist.js';
import { UserIdentityModel } from '../../modules/identity/infrastructure/mongoose/user-identity.model.js';
import { logSecurityEvent } from '../infrastructure/logging/security-event-logger.js';
import { env } from '../config/env.config.js';
import { UserRole } from '../../modules/identity/domain/user-identity.entity.js';

// Declaration merging to add user to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        jti: string;
        role: UserRole;
        status: string;
        exp: number;
      };
    }
  }
}

// Importing env triggers the Zod validation + process.exit(1) at module load time.
// If JWT_SECRET is absent or too short, the server crashes here — not silently at request time.
const JWT_SECRET = env.JWT_SECRET;
const blocklist = new RedisTokenBlocklist();

interface JwtPayload {
  sub: string;
  jti: string;
  role?: string;
  status?: string;
  scope?: string;
  exp: number;
  iat: number;
}

const extractTokenFromHeader = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        message: 'Authentication token is missing. Access denied.',
      });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        logSecurityEvent('auth.token_expired', { ip, userAgent });
        return res.status(401).json({
          success: false,
          error: 'token_expired',
          message: 'Authentication token has expired.',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Invalid authentication token.',
      });
    }

    if (!decoded.sub || !decoded.jti) {
      return res.status(401).json({
        success: false,
        error: 'malformed_token',
        message: 'Authentication token is malformed.',
      });
    }

    if (decoded.scope === 'pre_auth') {
      logSecurityEvent('auth.insufficient_scope', { userId: decoded.sub, ip });
      return res.status(401).json({
        success: false,
        error: 'insufficient_scope',
        message: 'This token is exclusively for MFA verification and does not grant system access.',
      });
    }

    // JTI blocklist check — catches tokens revoked at logout
    const isRevoked = await blocklist.isBlocked(decoded.jti);
    if (isRevoked) {
      logSecurityEvent('auth.token_revoked', { userId: decoded.sub, ip, userAgent });
      return res.status(401).json({
        success: false,
        error: 'token_revoked',
        message: 'This token has been revoked.',
      });
    }

    // Global Revocation Check via Negative Caching (Epoch)
    let validAfterEpoch = await blocklist.getSessionsValidAfterCache(decoded.sub);

    if (validAfterEpoch === null) {
      // Cache miss -> Fallback to MongoDB
      const userDoc = await UserIdentityModel.findById(decoded.sub).select('sessionsValidAfter').lean();

      if (userDoc && userDoc.sessionsValidAfter) {
        validAfterEpoch = userDoc.sessionsValidAfter.getTime();
      } else {
        validAfterEpoch = 0; // Clean user
      }

      // Repopulate negative cache (TTL is 5min as defined in blocklist)
      await blocklist.setSessionsValidAfterCache(decoded.sub, validAfterEpoch);
    }

    if (validAfterEpoch > 0) {
      const iatMs = decoded.iat * 1000;
      if (iatMs < validAfterEpoch) {
        logSecurityEvent('auth.token_revoked_globally', { userId: decoded.sub, ip, userAgent });
        return res.status(401).json({
          success: false,
          error: 'token_revoked_globally',
          message: 'Security breach detected. All sessions have been invalidated.',
        });
      }
    }

    req.user = {
      id: decoded.sub,
      jti: decoded.jti,
      role: (decoded.role as UserRole) || 'user',
      status: decoded.status || 'active',
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error('Error in requireAuth middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'An error occurred during authentication.',
    });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      return next();
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      return next();
    }

    if (!decoded.sub || !decoded.jti) {
      return next();
    }

    if (decoded.scope === 'pre_auth') {
      return next(); // Ignore pre_auth tokens for optional routes
    }

    // Token signature is enough for optionalAuth
    // Optional check for global revocation too, to not load an invalidated session state
    let validAfterEpoch = await blocklist.getSessionsValidAfterCache(decoded.sub);
    if (validAfterEpoch === null) {
      const userDoc = await UserIdentityModel.findById(decoded.sub).select('sessionsValidAfter').lean();
      validAfterEpoch = userDoc && userDoc.sessionsValidAfter ? userDoc.sessionsValidAfter.getTime() : 0;
      await blocklist.setSessionsValidAfterCache(decoded.sub, validAfterEpoch);
    }
    if (validAfterEpoch > 0 && (decoded.iat * 1000) < validAfterEpoch) {
      return next(); // Just fallback to anonymous if revoked
    }

    req.user = {
      id: decoded.sub,
      jti: decoded.jti,
      role: (decoded.role as UserRole) || 'user',
      status: decoded.status || 'active',
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error('Error in optionalAuth middleware:', error);
    next();
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        message: 'Authentication is required for this resource.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logSecurityEvent('auth.role_denied', {
        userId: req.user.id,
        requiredRole: allowedRoles.join('|'),
        actualRole: req.user.role,
      });
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
};

export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'unauthenticated',
      message: 'Authentication is required for this resource.',
    });
  }

  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: 'email_not_verified',
      message: 'Email verification is required to access this resource.',
    });
  }

  next();
};

// Convenience aliases for route definitions that prefer explicit naming
export const authenticateToken = requireAuth;

// Composed guard: validates JWT first, then re-validates the admin role
// directly from MongoDB — never trusting the role embedded in the token.
//
// Why real-time DB check? If an admin account is compromised or the user
// is removed from the team, a still-valid JWT would otherwise grant full
// catalog-mutation access until token expiry. Querying the DB here closes
// that window to zero.
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireAuth(req, res, async () => {
    try {
      const userDoc = await UserIdentityModel
        .findById(req.user!.id)
        .select('role status')
        .lean();

      if (!userDoc) {
        return res.status(401).json({ success: false, error: 'user_not_found' });
      }

      if (userDoc.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'account_inactive',
          message: 'Your account is not active.',
        });
      }

      if (userDoc.role !== 'admin') {
        logSecurityEvent('auth.role_denied', {
          userId: req.user!.id,
          requiredRole: 'admin',
          actualRole: userDoc.role,
        });
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'You do not have permission to access this resource.',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  });
};

export const requirePreAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'unauthenticated', message: 'MFA Token missing' });
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      return res.status(401).json({ success: false, error: 'invalid_token', message: 'Invalid or expired MFA Token.' });
    }

    if (!decoded.sub || !decoded.jti || decoded.scope !== 'pre_auth') {
      return res.status(401).json({ success: false, error: 'invalid_scope', message: 'Valid Pre-Auth Token required.' });
    }

    // Check if this specific JTI was blocked due to bruteforce limit
    const isBlocked = await blocklist.isBlocked(decoded.jti);
    if (isBlocked) {
      return res.status(401).json({ success: false, error: 'token_revoked', message: 'Too many attempts. Token revoked.' });
    }

    req.user = {
      id: decoded.sub,
      jti: decoded.jti,
      role: (decoded.role as UserRole) || 'user',
      status: decoded.status || 'active',
      exp: decoded.exp,
    };

    next();
  } catch (error) {
    console.error('Error in requirePreAuth middleware:', error);
    return res.status(500).json({ success: false, error: 'internal_server_error', message: 'Error verifying MFA token' });
  }
};
