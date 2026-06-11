import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';

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

    const { uid, email, name, picture } = req.firebaseUser;

    await UserIdentityModel.findOneAndUpdate(
      { firebaseUid: uid },
      {
        $set: { email: email || '' },
        $setOnInsert: {
          name: name || '',
          picture: picture || '',
          role: 'user',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
