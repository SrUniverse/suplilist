import { UserIdentity } from '../domain/user-identity.entity.js';

export interface IUserIdentityRepository {
  findById(id: string): Promise<UserIdentity | null>;
  findByEmail(email: string): Promise<UserIdentity | null>;
  findByProvider(provider: 'google', providerId: string): Promise<UserIdentity | null>;
  save(user: UserIdentity): Promise<UserIdentity>;
  deleteById(id: string): Promise<void>;
}
