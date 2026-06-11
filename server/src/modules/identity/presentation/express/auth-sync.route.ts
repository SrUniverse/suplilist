import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';
import { ProfileModel } from '../../../profile/infrastructure/mongoose/profile.model.js';

import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../../../../shared/config/redis.config.js';

const router = Router();

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: new RedisStore({
    // @ts-expect-error - Known issue with express-rate-limit and ioredis types mismatch
    sendCommand: (...args: string[]) => getRedisClient().call(...args),
  }),
  message: { success: false, error: 'Too many requests, please try again later.' }
});

router.post('/sync', syncLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ success: false, error: 'unauthenticated' });
    }

    const { uid, email, name, picture, email_verified, sign_in_provider } = req.firebaseUser;

    const isTrustedProvider = sign_in_provider !== 'password';
    const isVerified = email_verified || isTrustedProvider;

    let userIdentity = await UserIdentityModel.findOne({ email });

    if (!userIdentity) {
      userIdentity = new UserIdentityModel({
        email: email || '',
        emailVerified: isVerified,
        emailVerifiedAt: isVerified ? new Date() : null,
        role: 'user',
        status: isVerified ? 'active' : 'pending_verification',
        tier: 'free',
        providers: [{
          provider: 'google',
          providerId: uid,
          providerEmail: email,
          linkedAt: new Date()
        }]
      });
      await userIdentity.save();
    } else {
      const hasProvider = userIdentity.providers.some(p => p.provider === 'google' && p.providerId === uid);
      if (!hasProvider) {
        userIdentity.providers.push({
          provider: 'google',
          providerId: uid,
          providerEmail: email,
          linkedAt: new Date()
        });
        await userIdentity.save();
      }
    }

    const userId = userIdentity._id.toString();
    const existingProfile = await ProfileModel.findOne({ userId });

    if (!existingProfile) {
      const newProfile = new ProfileModel({
        userId,
        firstName: name ? name.split(' ')[0] : null,
        lastName: name && name.includes(' ') ? name.split(' ').slice(1).join(' ') : null,
        displayName: name || email?.split('@')[0] || 'Usuário',
        avatarUrl: picture || null,
        avatarStatus: picture ? 'approved' : 'none',
        onboardingState: 'pending'
      });
      await newProfile.save();
    }

    res.json({ 
      success: true,
      data: {
        userId: userIdentity._id.toString(),
        email: userIdentity.email,
        role: userIdentity.role,
        emailVerified: userIdentity.emailVerified,
        status: userIdentity.status,
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message, stack: err?.stack });
  }
});

export default router;
