import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    /**
     * globalSetup runs ONCE in the main process before any workers spawn.
     * Starts a single MongoMemoryReplSet and sets MONGO_TEST_URI.
     * Workers inherit the env var and connect in their own beforeAll (setup.ts).
     */
    globalSetup: ['./src/shared/test/global-setup.ts'],

    /**
     * setupFiles run in EACH worker before its test file.
     *
     * IMPORTANT: setup.ts contains vi.mock('ioredis', ...) and
     * vi.mock('rate-limit-redis', ...) which are hoisted by Vitest's transform
     * and applied before any module in the test file is loaded.
     *
     * resolve.alias is intentionally NOT used for ioredis here.
     * The `forks` pool uses Node.js's native ESM loader, which bypasses Vite's
     * transform pipeline and therefore ignores resolve.alias. vi.mock() in
     * setupFiles is the correct interception mechanism for the forks pool.
     */
    setupFiles: ['./src/shared/test/setup.ts'],

    pool: 'forks',

    /**
     * fileParallelism: false — test files run sequentially (one fork at a time).
     * Required because all workers share a single MongoMemoryReplSet and the
     * InMemoryRedis singleton (via vi.mock). Parallel execution would interleave
     * writes across workers and break idempotency.
     */
    fileParallelism: false,

    hookTimeout: 120_000,

    env: {
      JWT_SECRET: 'dev-jwt-secret-unsafe-change-me',
      ENCRYPTION_KEY: 'a'.repeat(64),
      // Provide a non-routable URI so redis.client.ts doesn't receive undefined.
      // The real ioredis is never instantiated (vi.mock intercepts it), but
      // having a defined value prevents potential url-parse errors if the mock
      // is bypassed for any reason.
      REDIS_URI: 'redis://test-mock:6379',
      NODE_ENV: 'test',
    },
  },
});
