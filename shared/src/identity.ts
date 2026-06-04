/**
 * Wire contracts for the Identity module (Auth).
 *
 * Rules enforced here:
 *  - Dates are `string` (ISO 8601) — `Date` objects do not survive JSON.stringify.
 *  - `refreshToken` is NEVER in any DTO — it travels exclusively as an HttpOnly
 *    Set-Cookie header. Including it in a DTO would expose it to JavaScript.
 *  - MFA internals (totpSecret, backupCodes, etc.) are NEVER in any public DTO.
 *    Only the derived binary flag `isMfaEnabled` is exposed.
 */

/** Status values a user identity can hold. */
export type UserStatus =
  | 'active'
  | 'pending_verification'
  | 'suspended'
  | 'pending_deletion';

/** Role values — expand as RBAC grows. */
export type UserRole = 'user' | 'admin';

/**
 * Body response for POST /api/auth/login and POST /api/auth/refresh.
 *
 * The `refreshToken` is delivered exclusively via HttpOnly Set-Cookie — it
 * is intentionally absent from this DTO so that JS code cannot read it.
 */
export interface AuthResponseDTO {
  /** Short-lived JWT access token — store in memory only (never localStorage). */
  accessToken: string;
}

/**
 * Body response for POST /api/auth/register.
 * The account starts as pending_verification; a separate email flow activates it.
 */
export interface RegisterResponseDTO {
  userId: string;
  email: string;
  status: 'pending_verification';
}

/**
 * Public identity information — safe to expose to authenticated front-end code.
 *
 * Omits: passwordHash, totpSecret, backupCodes, mfa (internal struct).
 * Exposes only the derived flag `isMfaEnabled` from the mfa sub-document.
 */
export interface UserIdentityDTO {
  id: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  /** Derived from mfa.enabled — never exposes the raw mfa sub-document. */
  isMfaEnabled: boolean;
  emailVerified: boolean;
  createdAt: string; // ISO 8601
}
