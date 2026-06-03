import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { IUserIdentityRepository } from '../../repositories/user-identity.repository.js';
import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.js';
import { RefreshToken } from '../../domain/refresh-token.entity.js';
import { IUnitOfWork } from '../../../../shared/application/unit-of-work.interface.js';

const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  userAgent: z.string().default('unknown'),
  ipAddress: z.string().default('unknown'),
  deviceLabel: z.string().nullable().default(null),
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
    private refreshTokenRepo: IRefreshTokenRepository,
    private uow: IUnitOfWork
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenResult> {
    const validatedInput = refreshTokenInputSchema.parse(input);
    const tokenHash = crypto.createHash('sha256').update(validatedInput.refreshToken).digest('hex');

    return this.uow.runInTransaction(async () => {
      // 1. Find the refresh token in the repository
      const session = await this.refreshTokenRepo.findByTokenHash(tokenHash);
      if (!session) {
        throw new Error('invalid_refresh_token');
      }

      // 2. Token Theft Detection
      if (session.revokedAt) {
        await this.refreshTokenRepo.revokeFamily(session.family);
        throw new Error('token_theft_detected');
      }

      // 3. Check Expiration
      if (session.expiresAt < new Date()) {
        throw new Error('refresh_token_expired');
      }

      // 4. Retrieve user and verify account status
      const user = await this.userIdentityRepo.findById(session.userId);
      if (!user || user.status === 'deleted' || user.status === 'suspended') {
        throw new Error('user_inactive');
      }

      // 5. Generate a new session (Rotation)
      const newOpaqueToken = crypto.randomBytes(40).toString('hex');
      const newTokenHash = crypto.createHash('sha256').update(newOpaqueToken).digest('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Extended for another 7 days

      const newSession: RefreshToken = {
        id: '', // Mongoose generated
        userId: user.id,
        tokenHash: newTokenHash,
        family: session.family,
        replacedBy: null,
        userAgent: validatedInput.userAgent,
        ipAddress: validatedInput.ipAddress,
        deviceLabel: validatedInput.deviceLabel,
        issuedAt: new Date(),
        expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const savedNewSession = await this.refreshTokenRepo.save(newSession);

      // 6. Invalidate old token
      session.revokedAt = new Date();
      session.replacedBy = savedNewSession.id;
      await this.refreshTokenRepo.save(session);

      // 7. Generate a new JWT access token with the user's role
      const jwtId = crypto.randomUUID();
      const accessToken = jwt.sign(
        {
          sub: user.id,
          jti: jwtId,
          role: user.role, // Embed the user role
          status: user.status,
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      return {
        accessToken,
        refreshToken: newOpaqueToken,
      };
    });
  }
}
export default RefreshTokenUseCase;
