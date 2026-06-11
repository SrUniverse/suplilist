import { Router, Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';
import { ProfileModel } from '../../../profile/infrastructure/mongoose/profile.model.js';

const router = Router();

router.delete('/account', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.firebaseUser) {
      return res.status(401).json({ success: false, error: 'unauthenticated' });
    }

    const { uid } = req.firebaseUser;
    const userId = req.user.id;

    // 1. Delete from Firebase
    await getAuth().deleteUser(uid);

    // 2. Delete related data (Profile)
    await ProfileModel.findOneAndDelete({ userId });

    // 3. Delete Identity
    await UserIdentityModel.findByIdAndDelete(userId);

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
