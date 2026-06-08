import { z } from 'zod';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as otplibPkg from 'otplib';
const authenticator = (otplibPkg as any).authenticator || (otplibPkg as any).default?.authenticator;
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { RedisTokenBlocklist } from '../../../../shared/infrastructure/security/redis-token-blocklist.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';
import { redisClient } from '../../../../shared/infrastructure/redis/redis.client.js';
import { env } from '../../../../shared/config/env.config.js';

const verifyMfaInputSchema = z.object({
  userId: z.string().min(1),
  jti: z.string().min(1), // Passed from requirePreAuth
  code: z.string().min(6).max(12),
});

export type VerifyMfaInput = z.infer<typeof verifyMfaInputSchema>;

export interface VerifyMfaResult {
  accessToken: string;
  refreshToken: string;
}

const JWT_SECRET = env.JWT_SECRET;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 15 * 60; // 15 minutes

export class VerifyMfaUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private tokenBlocklistRepo: RedisTokenBlocklist,
    private uow: IUnitOfWork
  ) {}

  async execute(input: VerifyMfaInput): Promise<VerifyMfaResult> {
    const validatedInput = verifyMfaInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      // 1. Bruteforce Protection via User-bound Counter
      const rateLimitKey = `mfa:attempts:user:${validatedInput.userId}`;
      const attemptsStr = await redisClient.get(rateLimitKey);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

      if (attempts >= MAX_ATTEMPTS) {
        throw new Error('too_many_mfa_attempts');
      }

      // 2. Fetch User
      const user = await this.userIdentityRepo.findById(validatedInput.userId);
      if (!user || user.status === 'deleted' || user.status === 'suspended') {
        throw new Error('user_inactive');
      }

      if (!user.mfa.enabled) {
        throw new Error('mfa_not_enabled');
      }

      // 3. Validate Code
      let isValid = false;
      let usedBackupCodeHash: string | null = null;

      // 3a. Check if it's a 6-digit TOTP
      if (validatedInput.code.length === 6 && user.mfa.totpSecret) {
        isValid = authenticator.check(validatedInput.code, user.mfa.totpSecret);
      } 
      // 3b. Check if it's a Backup Code (assuming 12 chars standard)
      else if (validatedInput.code.length > 6) {
        // Hash the input code using SHA-256
        const inputHash = crypto.createHash('sha256').update(validatedInput.code).digest('hex');
        
        // Search in the array
        const matchIndex = user.mfa.backupCodes.findIndex((hash) => hash === inputHash);
        if (matchIndex !== -1) {
          isValid = true;
          usedBackupCodeHash = inputHash; // Remember to delete it later
        }
      }

      // 4. Handle Failure
      if (!isValid) {
        // Increment attempts and set expiration to 15m
        const multi = redisClient.multi();
        multi.incr(rateLimitKey);
        multi.expire(rateLimitKey, COOLDOWN_SECONDS);
        await multi.exec();
        
        throw new Error('invalid_mfa_code');
      }

      // 5. Code is valid: Clear bruteforce counter
      await redisClient.del(rateLimitKey);

      // Consume backup code if it was used
      if (usedBackupCodeHash) {
        user.mfa.backupCodes = user.mfa.backupCodes.filter(hash => hash !== usedBackupCodeHash);
        await this.userIdentityRepo.save(user);
      }

      // Record last used time
      user.mfa.lastUsedAt = new Date();
      await this.userIdentityRepo.save(user);

      // Revoke the Pre-Auth Token (so it can't be reused)
      await this.tokenBlocklistRepo.block(validatedInput.jti, 5 * 60);

      // 6. Generate Sessions
      const accessJti = crypto.randomUUID(); 
      const accessToken = jwt.sign(
        {
          sub: user.id,
          jti: accessJti,
          role: user.role,
          status: user.status,
        },
        JWT_SECRET,
        { expiresIn: '5m' }
      );

      const refreshJti = crypto.randomUUID();
      const refreshToken = jwt.sign(
        {
          sub: user.id,
          jti: refreshJti,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return {
        accessToken,
        refreshToken,
      };
    });
  }
}
export default VerifyMfaUseCase;
