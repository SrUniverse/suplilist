export interface ITokenBlocklist {
  /**
   * Blocklists a single JWT by its unique ID (jti) until the token's natural expiration.
   * Uses atomic SETNX under the hood to prevent TOCTOU race conditions.
   * 
   * @returns Promise<boolean> - true if successfully blocklisted (first thread), false if already blocklisted.
   */
  block(jti: string, expiresAt: Date): Promise<boolean>;

  /**
   * Checks if a single JWT jti has been blocklisted (e.g. user logged out).
   */
  isBlocked(jti: string): Promise<boolean>;

  /**
   * Invalidates all active tokens for a user (e.g. role change, suspension).
   * Blocks access for that user until their active JWTs naturally expire (15 min).
   */
  invalidateUser(userId: string, expiresAt: Date): Promise<void>;

  /**
   * Checks if all sessions for the given user are invalidated.
   */
  isUserInvalidated(userId: string): Promise<boolean>;
}
export default ITokenBlocklist;
