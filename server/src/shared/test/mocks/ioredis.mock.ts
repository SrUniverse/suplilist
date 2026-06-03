/**
 * Lightweight ioredis replacement for the test environment.
 *
 * Injected via `resolve.alias` in vitest.config.ts — every `import … from 'ioredis'`
 * in the server source resolves to this file during test runs.
 *
 * Contracts upheld:
 *  - `exists()` returns 0  → token/user is NOT blocked → requireAuth passes
 *  - `set()` / `get()` return sane no-op values
 *  - `call()` returns null → rate-limit-redis RedisStore never throws
 *  - `on()` is chainable   → redisClient.on('error', …) silently succeeds
 */
class MockRedis {
  // ioredis constructor accepts (url, options?) or (options?) — ignore both
  constructor(_uri?: string, _options?: unknown) {}

  get(_key: string): Promise<string | null> {
    return Promise.resolve(null);
  }

  set(..._args: unknown[]): Promise<string> {
    return Promise.resolve('OK');
  }

  /** Key does not exist — blocklist always clear in tests. */
  exists(_key: string): Promise<number> {
    return Promise.resolve(0);
  }

  del(_key: string): Promise<number> {
    return Promise.resolve(1);
  }

  /** Chainable — mirrors ioredis EventEmitter API. */
  on(_event: string, _handler: unknown): this {
    return this;
  }

  quit(): Promise<string> {
    return Promise.resolve('OK');
  }

  flushdb(): Promise<string> {
    return Promise.resolve('OK');
  }

  /**
   * Used by rate-limit-redis RedisStore's sendCommand callback.
   * `SCRIPT LOAD <script>` must return a 40-char SHA1 string; returning null
   * causes rate-limit-redis to throw "unexpected reply from redis client".
   * A fake but valid-looking SHA1 satisfies the type check and silences the error.
   */
  call(command: string, ..._args: unknown[]): Promise<unknown> {
    if (typeof command === 'string' && command.toLowerCase() === 'script') {
      // Fake SHA1 digest — rate-limit-redis stores this as the script handle
      return Promise.resolve('0000000000000000000000000000000000000000');
    }
    return Promise.resolve(null);
  }
}

export { MockRedis as Redis };
export default MockRedis;
