import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { RedisTokenBlocklist } from '../../../../shared/infrastructure/security/redis-token-blocklist.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';
import { env } from '../../../../shared/config/env.config.js';

const logoutInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  accessToken: z.string().optional(),
});

export type LogoutInput = z.infer<typeof logoutInputSchema>;

const JWT_SECRET = env.JWT_SECRET;

export class LogoutUseCase {
  constructor(
    private tokenBlocklistRepo: RedisTokenBlocklist,
    private uow: IUnitOfWork
  ) {}

  private async blockToken(token: string): Promise<void> {
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch {
      return;
    }

    const { jti, exp } = decoded;
    if (!jti || !exp) {
      return;
    }

    // JWT exp is Unix seconds; Date.now() is Unix milliseconds.
    // Normalize once, stay in seconds throughout — no Date objects cross into Redis.
    const CLOCK_SKEW_BUFFER_SEC = 60;
    const nowSec = Math.floor(Date.now() / 1000);
    const ttlSec = (exp + CLOCK_SKEW_BUFFER_SEC) - nowSec;  // pure seconds arithmetic
    if (ttlSec > 0) {
      await this.tokenBlocklistRepo.block(jti, ttlSec);
    }
  }

  async execute(input: LogoutInput): Promise<void> {
    const validatedInput = logoutInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      await this.blockToken(validatedInput.refreshToken);

      // Block access token immediately so it cannot be reused after logout
      if (validatedInput.accessToken) {
        await this.blockToken(validatedInput.accessToken);
      }
    });
  }
}
export default LogoutUseCase;
