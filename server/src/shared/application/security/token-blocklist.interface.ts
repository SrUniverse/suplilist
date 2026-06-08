export interface ITokenBlocklist {
  /**
   * Blocklists a single JWT by its unique ID (jti) for `ttlSeconds` seconds.
   * Callers compute the TTL directly (seconds-only arithmetic, no Date objects)
   * so the integer reaches Redis without any coercion risk.
   * Uses atomic SETNX under the hood to prevent TOCTOU race conditions.
   *
   * @param ttlSeconds - whole seconds until the JTI entry should expire (> 0)
   * @returns Promise<boolean> - true if successfully blocklisted (first call), false if already present.
   */
  block(jti: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Checks if a single JWT jti has been blocklisted (e.g. user logged out).
   */
  isBlocked(jti: string): Promise<boolean>;

  /**
   * Invalidates all active tokens for a user (e.g. role change, suspension).
   * Blocks access for that user until their active JWTs naturally expire (5 min).
   */
  invalidateUser(userId: string, expiresAt: Date): Promise<void>;

  /**
   * Checks if all sessions for the given user are invalidated.
   */
  isUserInvalidated(userId: string): Promise<boolean>;

  setSessionsValidAfterCache(userId: string, epochMs: number): Promise<void>;

  getSessionsValidAfterCache(userId: string): Promise<number | null>;

  deleteSessionsValidAfterCache(userId: string): Promise<void>;
}
export default ITokenBlocklist;
