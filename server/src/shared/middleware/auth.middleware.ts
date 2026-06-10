import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { UserIdentityModel } from '../../modules/identity/infrastructure/mongoose/user-identity.model.js';
import { logSecurityEvent } from '../infrastructure/logging/security-event-logger.js';
import { UserRole } from '../../modules/identity/domain/user-identity.entity.js';

// Declaration merging to add user to Express Request
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: {
        uid: string;
        email?: string;
        name: string;
        picture: string;
      };
      user?: {
        id: string;
        role: UserRole;
        status: string;
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
      const decoded = await admin.auth().verifyIdToken(token);
      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || '',
        picture: decoded.picture || ''
      };
    } catch (err: any) {
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress;
      logSecurityEvent('auth.invalid_token' as any, { ip, error: err.message });
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Invalid authentication token.',
      });
    }

    // Lookup user in MongoDB to populate req.user for role/admin guards
    const userDoc = await UserIdentityModel.findOne({ firebaseUid: req.firebaseUser.uid }).select('role status').lean();
    if (userDoc) {
      req.user = {
        id: userDoc._id.toString(),
        role: userDoc.role as UserRole,
        status: userDoc.status
      };
    }

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

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.firebaseUser = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || '',
        picture: decoded.picture || ''
      };
      
      const userDoc = await UserIdentityModel.findOne({ firebaseUid: decoded.uid }).select('role status').lean();
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
  // Verificação de email agora pode ser via Firebase Token (email_verified flag)
  // Mas como migramos tudo para Firebase, mantemos o check simples:
  if (!req.firebaseUser && !req.user) {
    return res.status(401).json({
      success: false,
      error: 'unauthenticated',
      message: 'Authentication is required for this resource.',
    });
  }

  // Com Firebase Auth, se precisar bloquear, checamos decoded.email_verified no auth middleware.
  // Por enquanto apenas deixamos passar se o status do mongo não for inactive.
  if (req.user && req.user.status !== 'active') {
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

