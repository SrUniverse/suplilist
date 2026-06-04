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
      NODE_ENV: 'test',
      PORT: '5000',
      MONGO_URI: 'mongodb://127.0.0.1:27017/suplilist_unit_test',
      REDIS_URI: 'redis://127.0.0.1:6379',
      JWT_SECRET: 'super_secret_ci_key_that_must_be_32_chars_long',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      FRONTEND_ORIGIN: 'http://localhost:3000',
    },
  },
});
