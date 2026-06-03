import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      /**
       * Replace the real ioredis with a no-op mock for all tests.
       *
       * Every `import … from 'ioredis'` in the server source resolves here:
       *   redis.client.ts → auth.middleware.ts, auth-rate-limiter.ts, …
       *
       * MockRedis.exists() returns 0 → token/user NOT blocked → requireAuth
       * passes for every well-signed JWT.
       */
      ioredis: path.resolve(__dirname, 'src/shared/test/mocks/ioredis.mock.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    /**
     * No global setupFiles — each test file manages its own infrastructure.
     *
     * Rationale: ProfileMapper tests are pure unit tests (no DB needed).
     * ProfileController tests manage their own MongoMemoryReplSet lifecycle
     * via beforeAll/afterAll in the test file itself. Forcing the replica-set
     * startup on every file would block pure unit tests from running when
     * the MongoDB binary is not yet cached locally.
     */
    pool: 'forks',
    hookTimeout: 120_000, // covers first-run binary download + RS negotiation
    env: {
      JWT_SECRET: 'dev-jwt-secret-unsafe-change-me',
      ENCRYPTION_KEY: 'a'.repeat(64),
      NODE_ENV: 'test',
    },
  },
});
