import { Profile } from '../entities/profile.entity.js';

export interface IProfileRepository {
  findByUserId(userId: string): Promise<Profile | null>;
  save(profile: Profile): Promise<Profile>;
  // For OCC updates
  updateWithConcurrency(userId: string, expectedVersion: number, updates: Partial<Profile>): Promise<Profile | null>;
}
