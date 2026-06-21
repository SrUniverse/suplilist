/**
 * admin-allowlist.ts — Email allowlist for admin access (defense in depth).
 *
 * Admin routes are guarded by `requireAdmin`, which already requires
 * role === 'admin' on the user's MongoDB identity. This allowlist adds a second
 * gate: when ADMIN_EMAILS is configured, the authenticated Firebase email must
 * also be on the list. This means that even if another account is somehow
 * promoted to role=admin in the database, it still cannot reach admin routes
 * unless its email was explicitly allowlisted in the environment.
 *
 * When ADMIN_EMAILS is empty/unset, the allowlist is disabled and access falls
 * back to role-only (so local development without the env var still works).
 */

import { env } from './env.config.js';

let cachedList: string[] | null = null;

export function getAdminAllowlist(): string[] {
  if (cachedList) return cachedList;
  cachedList = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return cachedList;
}

/** True when an allowlist is configured (non-empty). */
export function isAllowlistEnabled(): boolean {
  return getAdminAllowlist().length > 0;
}

/**
 * Returns true if the email may act as admin.
 * - Allowlist configured → email must be present (case-insensitive).
 * - Allowlist not configured → returns true (role-only fallback).
 */
export function isEmailAllowedAdmin(email?: string | null): boolean {
  const list = getAdminAllowlist();
  if (list.length === 0) return true;
  if (!email) return false;
  return list.includes(email.toLowerCase());
}
