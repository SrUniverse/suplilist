import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { RedisTokenBlocklist } from '../../../../shared/infrastructure/security/redis-token-blocklist.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const loginInputSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  userAgent: z.string().default('unknown'),
  ipAddress: z.string().default('unknown'),
  deviceLabel: z.string().nullable().default(null),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export type LoginResult = 
  | { status: 'success'; accessToken: string; refreshToken: string }
  | { status: 'mfa_required'; mfaToken: string };

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-unsafe-change-me';

export class LoginUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(input: LoginInput): Promise<LoginResult> {
    const validatedInput = loginInputSchema.parse(input);

    return this.uow.runInTransaction(async () => {
      // 1. Fetch user by email
      const user = await this.userIdentityRepo.findByEmail(validatedInput.email);
      if (!user) {
        throw new Error('invalid_credentials');
      }

      // 2. Check Account Status
      if (user.status === 'deleted') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (user.deletedAt && user.deletedAt >= thirtyDaysAgo) {
          // Auto-restore account if it's within the 30-day cancellation window
          user.status = 'active';
          user.deletedAt = null;
          (user as any).purgeAttempts = 0;
          (user as any).purgeFailed = false;
          await this.userIdentityRepo.save(user);
        } else {
          throw new Error('account_deleted');
        }
      }
      if (user.status === 'suspended') {
        throw new Error('account_suspended');
      }

      // 3. Verify Password (only if passwordHash exists - otherwise it's an OAuth user)
      if (!user.passwordHash) {
        throw new Error('oauth_account_only');
      }

      const isPasswordValid = await bcrypt.compare(validatedInput.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error('invalid_credentials');
      }

      // Clear password reset token if it exists (anti-hijack after successful login)
      if (user.passwordReset) {
        user.passwordReset = undefined;
        await this.userIdentityRepo.save(user);
      }

      // 4. Handle MFA if enabled
      if (user.mfa.enabled) {
        // Generate a Pre-Auth JWT with 5-minute expiration
        const preAuthJti = crypto.randomUUID();
        const mfaToken = jwt.sign(
          {
            sub: user.id,
            jti: preAuthJti,
            scope: 'pre_auth',
          },
          JWT_SECRET,
          { expiresIn: '5m' }
        );

        return {
          status: 'mfa_required',
          mfaToken,
        };
      }

      // 5. Generate Sessions (Tokens)
      const accessJti = crypto.randomUUID(); 
      const accessToken = jwt.sign(
        {
          sub: user.id,
          jti: accessJti,
          role: user.role,
          status: user.status,
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      // Generate stateless JWT refresh token
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
        status: 'success',
        accessToken,
        refreshToken,
      };
    });
  }
}
export default LoginUseCase;
