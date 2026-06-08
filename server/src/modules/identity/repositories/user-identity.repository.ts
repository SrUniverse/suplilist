import { UserIdentity, UserRole, UserStatus } from '../domain/user-identity.entity.js';

export interface FindAllOptions {
  page: number;
  limit: number;
  role?: UserRole;
  status?: UserStatus;
}

export interface FindAllResult {
  users: UserIdentity[];
  total: number;
}

export interface IUserIdentityRepository {
  findById(id: string): Promise<UserIdentity | null>;
  findByEmail(email: string): Promise<UserIdentity | null>;
  findByProvider(provider: 'google', providerId: string): Promise<UserIdentity | null>;
  findByPasswordResetToken(tokenHash: string): Promise<UserIdentity | null>;
  findAll(options: FindAllOptions): Promise<FindAllResult>;
  save(user: UserIdentity): Promise<UserIdentity>;
  deleteById(id: string): Promise<void>;
}
