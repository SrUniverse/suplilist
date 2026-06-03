import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      /**
       * Replace ioredis with the in-memory Map-based mock for all tests.
       *
       * The mock implements full command semantics (SET NX EX, EXISTS, LPUSH,
       * LRANGE, LTRIM, FLUSHDB, …) rather than returning static values.
       * This means tests can validate blocklist state after logout, list length
       * after LPUSH, and SET NX atomicity — all without a real Redis connection.
       *
       * Every import chain that reaches ioredis is covered:
       *   redis.client.ts → auth.middleware.ts, redis-token-blocklist.ts,
       *   auth-rate-limiter.ts (uses redisClient.call for rate-limit-redis)
       */
      ioredis: path.resolve(__dirname, 'src/shared/test/mocks/ioredis.mock.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',

    /**
     * globalSetup runs ONCE in the main process before any workers spawn.
     * It starts a single MongoMemoryReplSet and sets MONGO_TEST_URI.
     * Workers inherit the env var and connect in their own beforeAll (setup.ts).
     *
     * This replaces the previous per-file ReplSet instantiation which would
     * have caused O(n) resource consumption with 10+ test files.
     */
    globalSetup: ['./src/shared/test/global-setup.ts'],

    /**
     * setupFiles run in EACH worker before its test file.
     * Responsibilities: mongoose.connect(MONGO_TEST_URI) + afterEach cleanup.
     */
    setupFiles: ['./src/shared/test/setup.ts'],

    pool: 'forks',

    /**
     * fileParallelism: false — run test files sequentially (one fork at a time).
     *
     * Rationale: all workers share the same MongoMemoryReplSet and the same
     * InMemoryRedis instance (via the ioredis alias singleton). Running files in
     * parallel would interleave writes and afterEach cleanups across workers,
     * causing non-deterministic failures. Sequential execution is safe: each
     * worker gets a clean DB state from the previous worker's afterAll disconnect.
     */
    fileParallelism: false,

    hookTimeout: 120_000, // covers first-run MongoDB binary download in CI

    env: {
      // auth.middleware.ts: process.env.JWT_SECRET || 'dev-jwt-secret-unsafe-change-me'
      JWT_SECRET: 'dev-jwt-secret-unsafe-change-me',
      // encryption.ts validates a 64-char hex key at import time
      ENCRYPTION_KEY: 'a'.repeat(64),
      NODE_ENV: 'test',
    },
  },
});
