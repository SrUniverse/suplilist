import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';

const router = Router();

router.post('/sync', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
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
