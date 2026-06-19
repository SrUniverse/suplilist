import { Router, Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';
import { ProfileModel } from '../../../profile/infrastructure/mongoose/profile.model.js';
import mongoose from 'mongoose';

import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../../../../shared/infrastructure/redis/redis.client.js';
import { cacheService } from '../../../../shared/services/cache.service.js';

const router = Router();

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Redis indisponível não pode derrubar o auth — degrada para "sem limite".
  // Sem isto, um erro do store propaga e quebra todo login/signup no Vercel.
  passOnStoreError: true,
  store: new RedisStore({
    prefix: 'rl:auth-sync:',
    // @ts-expect-error - Known issue with express-rate-limit and ioredis types mismatch
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
  }),
  keyGenerator: (req: Request) => {
    const raw =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown-ip';
    return ipKeyGenerator(raw);
  },
  message: { success: false, error: 'Too many requests, please try again later.' }
});

router.post('/sync', syncLimiter, requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ success: false, error: 'unauthenticated' });
    }

    const { uid, email, name, picture, email_verified, sign_in_provider } = req.firebaseUser;
    const isVerified = email_verified || false;
    const providerId = sign_in_provider || 'password';
    
    const mappedProvider = 
      providerId === 'google.com' ? 'google' : 
      providerId === 'phone' ? 'phone' : 'password';

    let userIdentity = await UserIdentityModel.findOne({ 'providers.providerId': uid });

    if (!userIdentity && email) {
      userIdentity = await UserIdentityModel.findOne({ email });
    }

    const finalEmail = email || `${uid}@phone.suplilist.com`;

    const session = await mongoose.startSession();
    session.startTransaction();
    let savedUserIdentityId: string;
    let savedEmail: string;
    let savedRole: string;
    let savedStatus: string;
    let savedEmailVerified: boolean;

    try {
      if (!userIdentity) {
        userIdentity = new UserIdentityModel({
          email: finalEmail,
          emailVerified: isVerified,
          emailVerifiedAt: isVerified ? new Date() : null,
          role: 'user',
          status: isVerified ? 'active' : 'pending_verification',
          tier: 'free',
          providers: [{
            provider: mappedProvider,
            providerId: uid,
            providerEmail: email,
            linkedAt: new Date()
          }]
        });
        await userIdentity.save({ session });
      } else {
        const hasProvider = userIdentity.providers.some(p => p.provider === mappedProvider && p.providerId === uid);
        if (!hasProvider) {
          userIdentity.providers.push({
            provider: mappedProvider,
            providerId: uid,
            providerEmail: email,
            linkedAt: new Date()
          });
          await userIdentity.save({ session });
        }
      }

      savedUserIdentityId = userIdentity._id.toString();
      savedEmail = userIdentity.email;
      savedRole = userIdentity.role;
      savedStatus = userIdentity.status;
      savedEmailVerified = userIdentity.emailVerified;

      const existingProfile = await ProfileModel.findOne({ userId: savedUserIdentityId }).session(session);

      if (!existingProfile) {
        const newProfile = new ProfileModel({
          userId: savedUserIdentityId,
          firstName: name ? name.split(' ')[0] : null,
          lastName: name && name.includes(' ') ? name.split(' ').slice(1).join(' ') : null,
          displayName: name || email?.split('@')[0] || 'Usuário',
          avatarUrl: picture || null,
          avatarStatus: picture ? 'approved' : 'none',
          onboardingState: 'pending'
        });
        await newProfile.save({ session });
      }

      await session.commitTransaction();
    } catch (transactionErr) {
      await session.abortTransaction();
      console.error('[AuthSync] Transaction aborted due to error:', transactionErr);
      throw transactionErr; // Re-throw to be caught by the outer catch
    } finally {
      await session.endSession();
    }

    // Cache invalidation must happen OUTSIDE and AFTER the transaction commits successfully
    try {
      await cacheService.delete(`user:${uid}`);
    } catch (cacheErr) {
      console.error('[AuthSync] Falha ao deletar cache no Redis (não crítico):', cacheErr);
    }

    res.json({
      success: true,
      data: {
        userId: savedUserIdentityId,
        email: savedEmail,
        role: savedRole,
        emailVerified: savedEmailVerified,
        status: savedStatus,
      }
    });
  } catch (err: any) {
    console.error('[AuthSync] Erro interno não tratado:', err);
    res.status(500).json({ success: false, error: 'internal_server_error', message: err?.message, stack: err?.stack });
  }
});

export default router;
