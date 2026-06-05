import { UserConsent } from '../domain/user-settings.entity.js';

export interface IUserConsentRepository {
  /**
   * Appends a new consent record.
   * Updates and deletions are strictly prohibited to maintain audit trail integrity.
   */
  save(consent: UserConsent): Promise<UserConsent>;

  /**
   * Retrieves the full chronological audit history of consents for a user.
   */
  findHistoryByUserId(userId: string): Promise<UserConsent[]>;

  /**
   * Anonymizes all consent records for a user by replacing their userId with an anonymous ID (UUID/hash).
   * Idempotent operation.
   */
  anonymizeByUserId(userId: string, anonymousId: string): Promise<void>;
}
