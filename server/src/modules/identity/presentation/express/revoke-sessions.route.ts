import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { getAuth } from 'firebase-admin/auth';

const router = Router();

router.post('/revoke-sessions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, error: 'unauthenticated' });
    }

    // Revoke all refresh tokens for the user in Firebase Auth
    // This forces any existing sessions (other devices) to log out when their token expires (max 1h)
    // or when they try to refresh it.
    await getAuth().revokeRefreshTokens(uid);

    res.json({ success: true, message: 'sessions_revoked' });
  } catch (err: any) {
    console.error('[AuthRevoke] Falha ao revogar sessões no Firebase:', err);
    res.status(500).json({ success: false, error: 'internal_server_error', message: err?.message });
  }
});

export default router;
