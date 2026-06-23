/**
 * Shared mock for `firebase-admin/auth`.
 *
 * requireAuth / optionalAuth call getAuth().verifyIdToken(token, checkRevoked).
 * This module exposes a single `verifyIdToken` vi.fn() that setup.ts wires a
 * default implementation onto (decode the signed test JWT + best-effort identity
 * provisioning). Individual suites that need bespoke behaviour can import
 * `verifyIdToken` and call `.mockImplementation(...)` / `.mockResolvedValue(...)`.
 */
import { vi } from 'vitest';

export const verifyIdToken = vi.fn();

export function getAuth() {
  return { verifyIdToken };
}

export default { getAuth };
