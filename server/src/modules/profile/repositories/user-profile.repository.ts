import { UserProfile } from '../domain/user-profile.entity.js';

export interface IUserProfileRepository {
  /**
   * Fetches only public profile details.
   * Internally projects out private fields (select: false) to prevent leaks.
   */
  findByUserId(userId: string): Promise<UserProfile | null>;

  /**
   * Fetches the complete profile including private fields.
   * Reserved for the owner or admin operations.
   */
  findPrivateByUserId(userId: string): Promise<UserProfile | null>;

  /**
   * Persists profile changes.
   */
  save(profile: UserProfile): Promise<UserProfile>;

  /**
   * Hard deletes a user profile. Inherent idempotency is expected.
   */
  deleteByUserId(userId: string): Promise<void>;
}
