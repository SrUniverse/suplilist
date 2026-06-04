import { IRefreshTokenRepository } from '../../repositories/refresh-token.repository.js';
import { RefreshToken } from '../../domain/refresh-token.entity.js';

export interface ActiveSessionDTO {
  id: string;
  deviceLabel: string | null;
  userAgent: string;
  ipAddress: string;
  issuedAt: Date;
  expiresAt: Date;
}

export class GetActiveSessionsUseCase {
  constructor(private refreshTokenRepo: IRefreshTokenRepository) {}

  async execute(userId: string): Promise<ActiveSessionDTO[]> {
    const sessions = await this.refreshTokenRepo.findByUserId(userId);
    
    // Filter active, non-expired, non-revoked sessions
    const now = new Date();
    const active = sessions.filter(s => !s.revokedAt && s.expiresAt > now);

    return active.map(s => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      issuedAt: s.issuedAt,
      expiresAt: s.expiresAt,
    }));
  }
}
export default GetActiveSessionsUseCase;
