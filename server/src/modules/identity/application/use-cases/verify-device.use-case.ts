import { z } from 'zod';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { redisClient } from '../../../../shared/infrastructure/redis/redis.client.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const verifyDeviceSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  otpCode: z.string().length(6, 'OTP must be 6 digits'),
});

export type VerifyDeviceInput = z.infer<typeof verifyDeviceSchema>;

export type VerifyDeviceResult = {
  status: 'success';
  accessToken: string;
  refreshToken: string;
  deviceId: string;
} | {
  status: 'mfa_required';
  mfaToken: string;
  deviceId: string;
};

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-unsafe-change-me';

export class VerifyDeviceUseCase {
  constructor(
    private userIdentityRepo: IUserIdentityRepository,
    private unitOfWork: IUnitOfWork
  ) {}

  async execute(input: VerifyDeviceInput): Promise<VerifyDeviceResult> {
    const validatedInput = verifyDeviceSchema.parse(input);
    const { email, otpCode } = validatedInput;

    const redisKey = `otp:device:${email}`;
    const storedOtp = await redisClient.get(redisKey);

    if (!storedOtp || storedOtp !== otpCode) {
      throw new Error('invalid_otp');
    }

    return this.unitOfWork.runInTransaction(async () => {
      const user = await this.userIdentityRepo.findByEmail(email);
      if (!user) {
        throw new Error('invalid_otp');
      }

      if (user.status === 'deleted' || user.status === 'suspended') {
        throw new Error(`account_${user.status}`);
      }

      // Generate new device fingerprint
      const deviceId = crypto.randomUUID();
      const deviceHash = crypto.createHash('sha256').update(deviceId).digest('hex');

      user.trustedDevices = user.trustedDevices || [];
      user.trustedDevices.push(deviceHash);

      await this.userIdentityRepo.save(user);

      // Clean up OTP
      await redisClient.del(redisKey);

      // 5. Handle MFA
      if (user.mfa.enabled) {
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
          deviceId,
        };
      }

      // 6. Generate Real Sessions
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
        deviceId,
      };
    });
  }
}
