import crypto from 'crypto';
import { z } from 'zod';
import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.js';
import { ITokenBlocklist } from '../../../../shared/application/security/token-blocklist.interface.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const logoutInputSchema = z.object({
  refreshToken: z.string().nullable().optional(),
  jti: z.string().min(1, 'JWT ID (jti) is required'),
  jwtExpiresAt: z.date(),
});

export type LogoutInput = z.infer<typeof logoutInputSchema>;

export class LogoutUseCase {
  constructor(
    private refreshTokenRepo: IRefreshTokenRepository,
    private tokenBlocklist: ITokenBlocklist,
    private uow: IUnitOfWork
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const validatedInput = logoutInputSchema.parse(input);

    await this.uow.runInTransaction(async () => {
      // 1. Blocklist the current JWT in Redis immediately using atomic SETNX.
      // If block() returns false, it means another concurrent request has already
      // processed the block list write. We abort immediately to prevent duplicate
      // refresh token mutations (which would trigger the session theft detection).
      const isFirstBlocked = await this.tokenBlocklist.block(validatedInput.jti, validatedInput.jwtExpiresAt);
      if (!isFirstBlocked) {
        return;
      }

      // 2. Revoke the refresh token session if provided
      if (validatedInput.refreshToken) {
        const tokenHash = crypto.createHash('sha256').update(validatedInput.refreshToken).digest('hex');
        const session = await this.refreshTokenRepo.findByTokenHash(tokenHash);
        
        if (session && !session.revokedAt) {
          session.revokedAt = new Date();
          await this.refreshTokenRepo.save(session);
        }
      }
    });
  }
}
export default LogoutUseCase;
