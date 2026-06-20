import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { getAuth } from 'firebase-admin/auth';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';
import { ProfileModel } from '../../../profile/infrastructure/mongoose/profile.model.js';
import { logSecurityEvent } from '../../../../shared/infrastructure/logging/security-event-logger.js';
import { logger } from '../../../../shared/utils/logger.js';

const router = Router();

/**
 * DELETE /account - Securely delete user account
 *
 * SECURITY: Requires password confirmation for accounts with local auth.
 * All sensitive data is purged and action is logged for audit.
 */
router.delete('/account', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.firebaseUser) {
      return res.status(401).json({
        success: false,
        error: 'unauthenticated',
        message: 'Authentication required.'
      });
    }

    const { uid } = req.firebaseUser;
    const userId = req.user.id;
    const { password } = req.body;

    // 1. Fetch user identity
    const userIdentity = await UserIdentityModel.findById(userId);
    if (!userIdentity) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User account not found.'
      });
    }

    // 2. SECURITY: If user has a password hash, require password verification
    if (userIdentity.passwordHash) {
      if (!password) {
        return res.status(400).json({
          success: false,
          error: 'password_required',
          message: 'Password confirmation is required to delete your account.'
        });
      }

      const isPasswordValid = await bcrypt.compare(password, userIdentity.passwordHash);
      if (!isPasswordValid) {
        // Log failed deletion attempt
        logSecurityEvent('account.deletion_failed_invalid_password', {
          userId,
          ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress
        });

        return res.status(403).json({
          success: false,
          error: 'invalid_password',
          message: 'Invalid password. Account deletion cancelled.'
        });
      }
    }

    // 3. Delete from Firebase
    try {
      await getAuth().deleteUser(uid);
    } catch (firebaseError) {
      logger.error('Firebase user deletion error:', firebaseError);
      // Continue with local deletion even if Firebase fails
    }

    // 4. Delete related data (Profile)
    await ProfileModel.findOneAndDelete({ userId });

    // 5. Delete Identity
    await UserIdentityModel.findByIdAndDelete(userId);

    // 6. AUDIT: Log account deletion for compliance
    logSecurityEvent('account.deletion_successful', {
      userId,
      email: req.firebaseUser.email,
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted.'
    });
  } catch (err) {
    next(err);
  }
});

export default router;
