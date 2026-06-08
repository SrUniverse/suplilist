import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { redisClient } from '../../../../shared/infrastructure/redis/redis.client.js';
import { env } from '../../../../shared/config/env.config.js';

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  code: z.string().min(6, 'Invalid OTP code'),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export type VerifyOtpResult = {
  accessToken: string;
  refreshToken: string;
};

const JWT_SECRET = env.JWT_SECRET;

export class VerifyOtpUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository
  ) {}

  async execute(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const validatedInput = verifyOtpSchema.parse(input);
    const redisKey = `otp:email:${validatedInput.email}`;
    
    // 1. Fetch code from Redis
    const storedCode = await redisClient.get(redisKey);
    
    if (!storedCode) {
      throw new Error('otp_expired_or_not_found'); // 400
    }

    // 2. Trava de segurança: If code doesn't match, throw without deleting (allows retry)
    if (storedCode !== validatedInput.code) {
      throw new Error('invalid_otp_code'); // 401
    }

    // 3. Sucesso: Delete code immediately to prevent Replay Attacks
    await redisClient.del(redisKey);

    // 4. Update user status in MongoDB
    const user = await this.userIdentityRepo.findByEmail(validatedInput.email);
    if (!user) {
      throw new Error('user_not_found');
    }

    user.emailVerified = true;
    user.status = 'active'; // Promoting from pending_verification
    await this.userIdentityRepo.save(user);

    // 5. Generate Session Tokens (same as LoginUseCase)
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
  }
}
export default VerifyOtpUseCase;
