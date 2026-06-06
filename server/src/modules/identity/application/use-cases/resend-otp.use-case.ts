import crypto from 'crypto';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { redisClient } from '../../../../shared/infrastructure/redis/redis.client.js';
import { IdentityEmailService } from '../services/identity-email.service.js';

const resendOtpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export class ResendOtpUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private emailService: IdentityEmailService
  ) {}

  async execute(input: ResendOtpInput): Promise<{ success: boolean }> {
    const validatedInput = resendOtpSchema.parse(input);
    const email = validatedInput.email;

    const user = await this.userIdentityRepo.findByEmail(email);
    if (!user || user.emailVerified) {
      throw new Error('user_not_found_or_already_verified');
    }

    // Trava anti-spam no Redis: Se já houve um envio recente (ex: 60s), bloqueia
    const rateLimitKey = `otp:rate-limit:${email}`;
    const recentAttempt = await redisClient.get(rateLimitKey);
    if (recentAttempt) {
      throw new Error('too_many_requests');
    }

    // Gera novo código
    const newCode = crypto.randomInt(100000, 999999).toString();
    
    // Salva o novo OTP (15 min) e a trava de rate limit (60 segundos)
    await redisClient.set(`otp:email:${email}`, newCode, 'EX', 900);
    await redisClient.set(rateLimitKey, '1', 'EX', 60);

    // Dispara e-mail
    this.emailService.sendVerificationEmail(email, newCode).catch(console.error);

    return { success: true };
  }
}
export default ResendOtpUseCase;
