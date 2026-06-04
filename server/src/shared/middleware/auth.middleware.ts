import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RedisTokenBlocklist } from '../infrastructure/security/redis-token-blocklist.js';

// Declaration merging to add user to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        jti: string;
        role: string;
        status: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-unsafe-change-me';
const blocklist = new RedisTokenBlocklist();

interface JwtPayload {
  sub: string;
  jti: string;
  role?: string;
  status?: string;
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

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
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

    // 1. Check if this specific JWT token has been blocklisted (e.g. user logged out)
    const isTokenBlocked = await blocklist.isBlocked(decoded.jti);
    if (isTokenBlocked) {
      return res.status(401).json({
        success: false,
        error: 'revoked_token',
        message: 'Authentication token has been revoked.',
      });
    }

    // 2. Check if the user's sessions have been invalidated globally (e.g. role change or suspension)
    // Rejects the request with a 401 immediately, prompting the front-end to log out/re-authenticate
    const isUserInvalidated = await blocklist.isUserInvalidated(decoded.sub);
    if (isUserInvalidated) {
      return res.status(401).json({
        success: false,
        error: 'user_session_revoked',
        message: 'Your credentials have changed. Please log in again.',
      });
    }

    req.user = {
      id: decoded.sub,
      jti: decoded.jti,
      role: decoded.role || 'user',
      status: decoded.status || 'active',
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

    // Fast check against Redis blocklist
    const isTokenBlocked = await blocklist.isBlocked(decoded.jti);
    if (isTokenBlocked) {
      return next();
    }

    const isUserInvalidated = await blocklist.isUserInvalidated(decoded.sub);
    if (isUserInvalidated) {
      return next();
    }

    req.user = {
      id: decoded.sub,
      jti: decoded.jti,
      role: decoded.role || 'user',
      status: decoded.status || 'active',
    };

    next();
  } catch (error) {
    console.error('Error in optionalAuth middleware:', error);
    next();
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        message: 'Authentication is required for this resource.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
};
