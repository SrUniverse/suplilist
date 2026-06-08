import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { RedisTokenBlocklist } from '../../../../shared/infrastructure/security/redis-token-blocklist.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';
import { logSecurityEvent } from '../../../../shared/infrastructure/logging/security-event-logger.js';
import { env } from '../../../../shared/config/env.config.js';

const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = env.JWT_SECRET;

export class RefreshTokenUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private tokenBlocklistRepo: RedisTokenBlocklist,
    private uow: IUnitOfWork
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenResult> {
    const validatedInput = refreshTokenInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      let decoded: any;
      try {
        decoded = jwt.verify(validatedInput.refreshToken, JWT_SECRET);
      } catch (err) {
        throw new Error('invalid_refresh_token');
      }

      const { sub: userId, jti, exp } = decoded;
      if (!userId || !jti || !exp) {
        throw new Error('invalid_refresh_token');
      }

      // 1. Retrieve user FIRST so we can invalidate them
      const user = await this.userIdentityRepo.findById(userId);
      if (!user || user.status === 'deleted' || user.status === 'suspended') {
        throw new Error('user_inactive');
      }

      // 2. Refresh Token Rotation (RTR): Theft Detection via Blocklist
      const isRevoked = await this.tokenBlocklistRepo.isBlocked(jti);
      if (isRevoked) {
        // Global Revocation: The session was cloned. Invalidate all tokens emitted before now.
        user.sessionsValidAfter = new Date();
        await this.userIdentityRepo.save(user);
        
        // Destroy the negative cache to force Mongoose reload on next request
        await this.tokenBlocklistRepo.deleteSessionsValidAfterCache(userId);

        logSecurityEvent('auth.session_theft_detected', { userId, detail: 'refresh_token_reuse' });
        throw new Error('token_theft_detected');
      }

      // User already retrieved and verified in Step 1.

      // 3. Generate a new session (Rotation)
      const accessJti = crypto.randomUUID();
      const accessToken = jwt.sign(
        {
          sub: user.id,
          jti: accessJti,
          role: user.role, // Embed the user role
          status: user.status,
        },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      const newRefreshJti = crypto.randomUUID();
      const newRefreshToken = jwt.sign(
        {
          sub: user.id,
          jti: newRefreshJti,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // 4. Invalidate old token (Memory Bomb logic for OOM prevention)
      const nowSec = Math.floor(Date.now() / 1000);  // ms → s, normalize once
      const expiresInSec = exp - nowSec;              // pure seconds arithmetic
      if (expiresInSec > 0) {
        await this.tokenBlocklistRepo.block(jti, expiresInSec);
      }

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    });
  }
}
export default RefreshTokenUseCase;
