import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { UserIdentityModel } from '../../modules/identity/infrastructure/mongoose/user-identity.model.js';
import { logSecurityEvent } from '../infrastructure/logging/security-event-logger.js';
import { UserRole } from '../../modules/identity/domain/user-identity.entity.js';
import { cacheService } from '../services/cache.service.js';

// Declaration merging to add user to Express Request
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: {
        uid: string;
        email?: string;
        name: string;
        picture: string;
        email_verified: boolean;
        sign_in_provider: string;
      };
      user?: {
        id: string;
        role: UserRole;
        status: string;
        /** JWT ID — presente apenas em fluxos autenticados por JWT próprio (MFA, delete account). */
        jti?: string;
      };
    }
  }
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
        error: 'missing_token',
        message: 'Authentication token is missing. Access denied.',
      });
    }

    try {
      // checkRevoked=true: força verificação de revogação (revokeRefreshTokens / conta desabilitada).
      // Sem isso, um ID Token já assinado continua válido até expirar (~1h) mesmo após /revoke-sessions.
      const decoded = await getAuth().verifyIdToken(token, true);
      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || '',
        picture: decoded.picture || '',
        email_verified: decoded.email_verified || false,
        sign_in_provider: decoded.firebase?.sign_in_provider || 'password'
      };
    } catch (err: any) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
      logSecurityEvent('auth.invalid_token' as any, { ip, message: err.message } as any);
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Invalid authentication token.',
      });
    }

    // Optimized: Check cache first before hitting database
    // Cache key: user:{uid} with 10-second TTL for 90% cache hit reduction
    const cacheKey = `user:${req.firebaseUser.uid}`;
    let userDoc = await cacheService.get<any>(cacheKey);

    if (!userDoc) {
      const queryConditions: any[] = [{ 'providers.providerId': req.firebaseUser.uid }];
      if (req.firebaseUser.email) {
        queryConditions.push({ email: req.firebaseUser.email });
      }

      // Lookup user in MongoDB to populate req.user for role/admin guards
      userDoc = await UserIdentityModel.findOne({ $or: queryConditions }).select('role status').lean();

      // Cache successful lookups — suspended/banned accounts get 2s TTL so suspension
      // takes effect quickly; active accounts get 10s TTL to reduce DB load
      if (userDoc) {
        const ttl = userDoc.status === 'active' ? 10 : 2;
        await cacheService.set(cacheKey, userDoc, ttl);
      }
    }

    if (userDoc) {
      req.user = {
        id: userDoc._id.toString(),
        role: userDoc.role as UserRole,
        status: userDoc.status
      };
    } else if (!req.originalUrl.includes('/auth/sync')) {
      return res.status(401).json({
        success: false,
        error: 'user_not_synced',
        message: 'User profile not synchronized with database.',
      });
    }

    next();
  } catch (error) {
    // Log full error internally for debugging
    console.error('Error in requireAuth middleware:', error);

    // Return generic error message to client (no stack trace)
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: 'An error occurred during authentication. Please try again later.'
    });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req);
    if (!token) {
      return next();
    }

    try {
      const decoded = await getAuth().verifyIdToken(token, true);
      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || '',
        picture: decoded.picture || '',
        email_verified: decoded.email_verified || false,
        sign_in_provider: decoded.firebase?.sign_in_provider || 'password'
      };

      const optCacheKey = `user:${decoded.uid}`;
      let userDoc = await cacheService.get<any>(optCacheKey);
      if (!userDoc) {
        userDoc = await UserIdentityModel.findOne({
          $or: [
            { email: decoded.email },
            { 'providers.providerId': decoded.uid }
          ]
        }).select('role status').lean();
        if (userDoc) await cacheService.set(optCacheKey, userDoc, 10);
      }
      if (userDoc) {
        req.user = {
          id: userDoc._id.toString(),
          role: userDoc.role as UserRole,
          status: userDoc.status
        };
      }
    } catch (err) {
      // Optional auth ignores invalid tokens
    }

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
  if (!req.firebaseUser) {
    return res.status(401).json({
      success: false,
      error: 'unauthenticated',
      message: 'Authentication is required for this resource.',
    });
  }

  const { email_verified, sign_in_provider } = req.firebaseUser;
  
  // Trusted providers (like Google) automatically verify emails
  const isTrustedProvider = sign_in_provider !== 'password';

  if (!email_verified && !isTrustedProvider) {
    return res.status(403).json({
      success: false,
      error: 'email_not_verified',
      message: 'Email verification is required to access this resource.',
    });
  }

  next();
};

export const authenticateToken = requireAuth;

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  requireAuth(req, res, async () => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'user_not_found' });
      }

      if (req.user.status !== 'active') {
        return res.status(403).json({
          success: false,
          error: 'account_inactive',
          message: 'Your account is not active.',
        });
      }

      if (req.user.role !== 'admin') {
        logSecurityEvent('auth.role_denied', {
          userId: req.user.id,
          requiredRole: 'admin',
          actualRole: req.user.role,
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

export const requirePreAuth = requireAuth; // Removido fluxo de pre_auth local, agora usa Firebase MFA.

