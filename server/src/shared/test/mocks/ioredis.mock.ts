/**
 * In-memory Redis mock — replaces ioredis via vitest.config.ts resolve.alias.
 *
 * Implements the command subset used across the server modules:
 *
 *   Strings (blocklist, invalidation):
 *     SET key value [EX secs] [NX]  — atomic set-if-not-exists with TTL
 *     GET key
 *     EXISTS key
 *     DEL key
 *     EXPIRE key secs
 *
 *   Lists (Audit DLQ):
 *     LPUSH key value [value …]
 *     LRANGE key start stop
 *     LTRIM key start stop
 *
 *   Infrastructure:
 *     FLUSHDB          — wipe all keys (called in afterEach)
 *     QUIT             — no-op
 *     ON event handler — chainable, no-op
 *     CALL command     — returns fake SHA1 for SCRIPT LOAD (rate-limit-redis)
 *
 * Correctness notes:
 *   - SET NX returns 'OK' on first call, null on subsequent calls for the same key.
 *     This is the exact atomicity contract that LogoutUseCase relies on to prevent
 *     duplicate refresh-token revocation on concurrent logout requests.
 *   - TTL is tracked in absolute ms (Date.now() + EX * 1000); isExpired() lazily
 *     evicts keys on access, matching Redis' passive expiry model.
 *   - All methods are async (return Promise) to match the ioredis API contract.
 */

interface Entry {
  value: string | string[];
  expiresAt?: number; // undefined = no expiry
}

class InMemoryRedis {
  // The constructor accepts ioredis-style arguments (uri, options) but ignores them.
  constructor(_uri?: string, _options?: unknown) {}

  private store = new Map<string, Entry>();

  // ── Internal helpers ──────────────────────────────────────────────────────

  private isExpired(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return true;
    if (entry.expiresAt !== undefined && Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return true;
    }
    return false;
  }

  private stringEntry(key: string): string | null {
    if (this.isExpired(key)) return null;
    const entry = this.store.get(key);
    return typeof entry?.value === 'string' ? entry.value : null;
  }

  private listEntry(key: string): string[] {
    if (this.isExpired(key)) return [];
    const entry = this.store.get(key);
    return Array.isArray(entry?.value) ? (entry!.value as string[]) : [];
  }

  // ── String commands ───────────────────────────────────────────────────────

  async get(key: string): Promise<string | null> {
    return this.stringEntry(key);
  }

  /**
   * SET key value [EX seconds] [PX milliseconds] [NX]
   *
   * Returns 'OK' when the key was written, null when NX prevents the write.
   * This is the critical operation for the JWT blocklist (LogoutUseCase) and
   * the user-invalidation store (auth.middleware).
   */
  async set(key: string, value: string, ...args: unknown[]): Promise<string | null> {
    let ttlMs: number | undefined;
    let nx = false;

    let i = 0;
    while (i < args.length) {
      const flag = String(args[i]).toUpperCase();
      if (flag === 'EX' && i + 1 < args.length) {
        ttlMs = Number(args[i + 1]) * 1000;
        i += 2;
      } else if (flag === 'PX' && i + 1 < args.length) {
        ttlMs = Number(args[i + 1]);
        i += 2;
      } else if (flag === 'NX') {
        nx = true;
        i++;
      } else {
        i++;
      }
    }

    // NX: refuse to overwrite an existing, non-expired key
    if (nx && !this.isExpired(key) && this.store.has(key)) {
      return null;
    }

    this.store.set(key, {
      value,
      expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
    });
    return 'OK';
  }

  async exists(...keys: string[]): Promise<number> {
    return keys.filter(k => !this.isExpired(k) && this.store.has(k)).length;
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.isExpired(key) || !this.store.has(key)) return 0;
    this.store.get(key)!.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  // ── List commands (Audit DLQ) ─────────────────────────────────────────────

  /**
   * LPUSH key value [value …]
   * Prepends values to the head of the list (leftmost = most recent).
   * Returns the new list length.
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    if (!this.store.has(key) || this.isExpired(key)) {
      this.store.set(key, { value: [] });
    }
    const list = this.store.get(key)!.value as string[];
    // Redis LPUSH prepends each value in order, so reverse for correct semantics
    for (let i = values.length - 1; i >= 0; i--) {
      list.unshift(values[i]);
    }
    return list.length;
  }

  /**
   * LRANGE key start stop
   * Returns a slice of the list. stop = -1 means last element.
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.listEntry(key);
    if (list.length === 0) return [];
    const normalizedStop = stop < 0 ? list.length + stop : stop;
    return list.slice(start, normalizedStop + 1);
  }

  /**
   * LTRIM key start stop
   * Trims the list to elements in [start, stop].
   */
  async ltrim(key: string, start: number, stop: number): Promise<string> {
    if (!this.store.has(key)) return 'OK';
    const entry = this.store.get(key)!;
    if (!Array.isArray(entry.value)) return 'OK';
    const list = entry.value as string[];
    const normalizedStop = stop < 0 ? list.length + stop : stop;
    entry.value = list.slice(start, normalizedStop + 1);
    return 'OK';
  }

  // ── Infrastructure ────────────────────────────────────────────────────────

  /** Chainable EventEmitter stub — mirrors ioredis API, no-op. */
  on(_event: string, _handler: unknown): this {
    return this;
  }

  async quit(): Promise<string> {
    return 'OK';
  }

  /** Wipe all keys — called in afterEach to reset state between tests. */
  async flushdb(): Promise<string> {
    this.store.clear();
    return 'OK';
  }

  /**
   * CALL command [args…]
   * rate-limit-redis invokes sendCommand('script', 'load', scriptBody) during
   * RedisStore.init(). Returning a fake 40-char SHA1 silences the error without
   * affecting any test assertion.
   */
  call(command: string, ..._args: unknown[]): Promise<unknown> {
    if (typeof command === 'string' && command.toLowerCase() === 'script') {
      return Promise.resolve('0000000000000000000000000000000000000000');
    }
    return Promise.resolve(null);
  }

  // ── Test inspection ───────────────────────────────────────────────────────

  /**
   * Access the internal store for assertion in tests that need to verify
   * Redis state directly (e.g., checking a key was set with correct TTL).
   * Not part of the ioredis API — call this only from test code.
   */
  _snapshot(): ReadonlyMap<string, Readonly<Entry>> {
    return this.store;
  }
}

// ioredis exports `Redis` as a named export AND as the default.
// redis.client.ts uses: import { Redis } from 'ioredis'
export { InMemoryRedis as Redis };
export default InMemoryRedis;
