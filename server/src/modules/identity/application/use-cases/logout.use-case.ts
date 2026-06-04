import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RedisTokenBlocklist } from '../../../../shared/infrastructure/security/redis-token-blocklist.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const logoutInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type LogoutInput = z.infer<typeof logoutInputSchema>;

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-unsafe-change-me';

export class LogoutUseCase {
  constructor(
    private tokenBlocklistRepo: RedisTokenBlocklist,
    private uow: IUnitOfWork
  ) {}

  async execute(input: LogoutInput): Promise<void> {
    const validatedInput = logoutInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      let decoded: any;
      try {
        decoded = jwt.verify(validatedInput.refreshToken, JWT_SECRET, { ignoreExpiration: true });
      } catch (err) {
        // If it's a completely malformed token, we can just ignore and say logout succeeded.
        return;
      }

      const { jti, exp } = decoded;
      if (!jti || !exp) {
        return;
      }

      // Memory Bomb Prevention: Calculate exact TTL remaining
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresInSec = Math.max(0, exp - nowSec);
      
      // If the token hasn't expired yet, block it until it does expire naturally
      if (expiresInSec > 0) {
        await this.tokenBlocklistRepo.revokeToken(jti, expiresInSec);
      }
    });
  }
}
export default LogoutUseCase;
