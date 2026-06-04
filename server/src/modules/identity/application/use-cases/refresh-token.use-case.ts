import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { RedisTokenBlocklist } from '../../../../shared/infrastructure/security/redis-token-blocklist.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;

export interface RefreshTokenResult {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-unsafe-change-me';

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

      // 1. Refresh Token Rotation (RTR): Theft Detection via Blocklist
      const isRevoked = await this.tokenBlocklistRepo.isBlocked(jti);
      if (isRevoked) {
        // Minimum viable RTR: if already in blocklist, the session is cloned.
        // In a more complex family implementation, we'd revoke all tokens for this user.
        // For now, we simply reject the rotation.
        throw new Error('invalid_refresh_token');
      }

      // 2. Retrieve user and verify account status
      const user = await this.userIdentityRepo.findById(userId);
      if (!user || user.status === 'deleted' || user.status === 'suspended') {
        throw new Error('user_inactive');
      }

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
        { expiresIn: '15m' }
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
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresInSec = Math.max(0, exp - nowSec);
      if (expiresInSec > 0) {
        await this.tokenBlocklistRepo.block(jti, new Date(exp * 1000));
      }

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    });
  }
}
export default RefreshTokenUseCase;
