/**
 * Vitest setupFiles — runs once per worker process before the test file executes.
 *
 * CRITICAL: vi.mock() calls are hoisted before all imports by Vitest's transform.
 * They must appear at the top of this file and use the globals-mode `vi`
 * (no import needed — globals: true in vitest.config.ts makes `vi` available).
 *
 * WHY vi.mock() here instead of resolve.alias:
 *   The `forks` pool loads modules through Node.js's native ESM loader, not
 *   through Vite's transform pipeline. As a result, resolve.alias entries are
 *   NOT applied to node_modules imports in fork workers. vi.mock() is processed
 *   by Vitest's hoisting transform BEFORE any module is imported, so it works
 *   correctly regardless of the pool type.
 *
 * Modules mocked:
 *
 *   ioredis — replaced by InMemoryRedis (Map-backed, full SET NX EX semantics).
 *     Prevents real TCP connections to 127.0.0.1:6379 (ECONNREFUSED open handle).
 *     The singleton exported by redis.client.ts is shared across all import
 *     chains in the worker (Node.js module cache), so blocklist writes from
 *     LogoutUseCase are visible to requireAuth in the same test request.
 *
 *   rate-limit-redis — replaced by a no-op RedisStore.
 *     rate-limit-redis.RedisStore.init() calls sendCommand('script', 'load',…)
 *     which, when the real ioredis is somehow loaded, throws MaxRetriesPerRequest-
 *     Error and leaves an open socket handle in the event loop — causing CI
 *     pipelines to hang until the 6-hour timeout.
 *
 * Responsibility: connect this worker's Mongoose instance to the shared
 * MongoMemoryReplSet started by global-setup.ts, and clean collections
 * between tests for idempotency.
 *
 * MONGO_TEST_URI is set by global-setup.ts before any worker spawns.
 * If it is undefined (e.g., MongoDB binary not yet cached on first run),
 * this setup logs a warning and skips the connection — individual test files
 * that need MongoDB check mongoose.connection.readyState themselves.
 */

// ── Module mocks (hoisted before any import) ─────────────────────────────────
// Import vi explicitly so TypeScript resolves the type.
// ES module imports are hoisted BEFORE code execution, so vi is available
// when the hoisted vi.mock() calls are evaluated — no circular reference.
import { vi, beforeAll, afterEach, afterAll } from 'vitest';

vi.mock('ioredis', async () => {
  // Dynamic import resolves relative to this file's directory at call time.
  // Returns { Redis: InMemoryRedis, default: InMemoryRedis } — matching the
  // named + default export shape of the real ioredis package.
  return import('./mocks/ioredis.mock.js');
});

vi.mock('rate-limit-redis', async () => {
  const { RedisStore } = await import('./mocks/rate-limit-redis.mock.js');
  return { RedisStore, default: RedisStore };
});

// firebase-admin/auth — requireAuth verifies Firebase ID tokens. Globally mock
// getAuth().verifyIdToken with a shared vi.fn() (see firebase-auth.mock.ts). A
// default implementation is installed in beforeEach below; suites that need
// custom decoded tokens import { verifyIdToken } and override per-test.
vi.mock('firebase-admin/auth', () => import('./mocks/firebase-auth.mock.js'));

// ── MongoDB lifecycle (Mongoose per-worker connection) ────────────────────────

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { verifyIdToken } from './mocks/firebase-auth.mock.js';
import { UserIdentityModel } from '../../modules/identity/infrastructure/mongoose/user-identity.model.js';

const uri = process.env.MONGO_TEST_URI;

// ── Default Firebase auth behaviour (shared) ──────────────────────────────────
// Suites authenticate by signing a JWT with JWT_SECRET whose `sub` is the user's
// Mongo ObjectId (the established `bearerToken(id)` convention). The default
// verifyIdToken: decodes that token (throws on missing/garbage → preserves 401),
// best-effort provisions a synced UserIdentity when `sub` is a 24-hex ObjectId so
// requireAuth resolves req.user.id = sub, and honours role/status/emailVerified
// claims embedded in the token. Suites with bespoke needs (literal tokens,
// non-ObjectId uids, provider linking) override verifyIdToken per-file.
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ci_key_that_must_be_32_chars_long';
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

beforeEach(() => {
  verifyIdToken.mockImplementation(async (token: string) => {
    const decoded = jwt.verify(token, TEST_JWT_SECRET) as Record<string, any>;
    const uid: string = decoded.sub;
    const email: string = decoded.email || `${uid}@test.com`;

    if (mongoose.connection.readyState === 1 && OBJECT_ID_RE.test(uid)) {
      await UserIdentityModel.updateOne(
        { _id: new mongoose.Types.ObjectId(uid) },
        {
          $setOnInsert: {
            email,
            emailVerified: decoded.email_verified ?? true,
            status: decoded.status || 'active',
            role: decoded.role || 'user',
            tier: decoded.tier || 'free',
            providers: [{ provider: 'password', providerId: uid, providerEmail: email, linkedAt: new Date() }],
          },
        },
        { upsert: true },
      );
    }

    return {
      uid,
      email,
      name: decoded.name || '',
      picture: decoded.picture || '',
      email_verified: decoded.email_verified ?? true,
      firebase: { sign_in_provider: decoded.sign_in_provider || 'password' },
    };
  });
});

beforeAll(async () => {
  if (!uri) {
    console.warn('[setup] MONGO_TEST_URI not set — DB-dependent tests will be skipped.');
    return;
  }
  // Each worker gets its own Mongoose connection to the shared replica set.
  await mongoose.connect(uri);

  // Ensure all collections exist beforehand to prevent MongoDB transaction WriteConflict/creation errors.
  const modelNames = mongoose.modelNames();
  await Promise.all(
    modelNames.map(async (name) => {
      try {
        await mongoose.model(name).createCollection();
      } catch (err) {
        // Ignore if collection already exists
      }
    })
  );
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  // Wipe every collection between tests for idempotency.
  // Cheaper than reconnecting; safe because fileParallelism: false ensures
  // only one worker is active at a time.
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 1) return;
  await mongoose.disconnect();
});
