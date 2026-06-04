/**
 * No-op RedisStore mock for rate-limit-redis.
 *
 * rate-limit-redis.RedisStore calls sendCommand('script', 'load', ...) during
 * init(), which routes through redisClient.call(). When the real ioredis is
 * loaded (possible in the forks pool where resolve.alias does not apply),
 * this triggers a MaxRetriesPerRequestError that creates an open handle in
 * the Node.js event loop — causing CI pipelines to hang for hours.
 *
 * This mock replaces the entire RedisStore, eliminating the initialization
 * path entirely. Rate-limiting is not a behaviour under test in the server
 * integration suite; the middleware remains mounted (real app stack) but
 * the store counts are no-ops, so every request counts as 1 hit.
 */

export class RedisStore {
  constructor(_options?: unknown) {}

  async init(): Promise<void> {}

  async increment(
    _key: string,
  ): Promise<{ totalHits: number; resetTime: Date | undefined }> {
    return { totalHits: 1, resetTime: undefined };
  }

  async decrement(_key: string): Promise<void> {}

  async resetKey(_key: string): Promise<void> {}
}

export default RedisStore;
