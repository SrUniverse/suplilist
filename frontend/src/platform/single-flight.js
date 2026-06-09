/**
 * single-flight.js — Promise deduplication for concurrent async calls.
 *
 * Wraps an async function so that if it is called again while the previous
 * call is still in-flight, all callers share the same Promise — only one
 * real execution happens. The in-flight slot is cleared once the call settles
 * (success or failure), so subsequent calls after settlement trigger a fresh
 * execution.
 *
 * Use this pattern when:
 *   - A resource fetch should not fire twice during the same tick (e.g. page
 *     mount + data init both calling getProfile() simultaneously).
 *   - Rollback or compensatory logic is NOT required (use optimistic-update.js
 *     for those cases).
 *   - The caller must NOT retain the Promise beyond a single session lifecycle
 *     (use a persistent #initPromise field for that — see identity-service.js).
 *
 * @example
 * class ProfileService {
 *   constructor() {
 *     this.getProfile = createSingleFlight(async () => {
 *       const data = await apiFetch('/api/profile/me');
 *       this._applyToState(data);
 *       return data;
 *     });
 *   }
 * }
 *
 * // Both calls fire simultaneously — only one HTTP request is made.
 * const [a, b] = await Promise.all([service.getProfile(), service.getProfile()]);
 */

/**
 * @template T
 * @param {() => Promise<T>} fn  The async function to deduplicate.
 * @returns {() => Promise<T>}   A wrapped version that shares the in-flight Promise.
 */
export function createSingleFlight(fn) {
  let promise = null;

  return () => {
    if (promise) return promise;

    promise = (async () => {
      try {
        return await fn();
      } finally {
        // Always clear so the next call after settlement starts a fresh execution.
        promise = null;
      }
    })();

    return promise;
  };
}
