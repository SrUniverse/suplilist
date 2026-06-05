import { RefreshToken } from '../domain/refresh-token.entity.js';

export interface IRefreshTokenRepository {
  findById(id: string): Promise<RefreshToken | null>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  findByUserId(userId: string): Promise<RefreshToken[]>;
  save(token: RefreshToken): Promise<RefreshToken>;
  revokeFamily(family: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
