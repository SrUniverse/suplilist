/**
 * Vitest setupFiles — runs once per worker process before the test file executes.
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
import mongoose from 'mongoose';

const uri = process.env.MONGO_TEST_URI;

beforeAll(async () => {
  if (!uri) {
    console.warn('[setup] MONGO_TEST_URI not set — DB-dependent tests will be skipped.');
    return;
  }
  // Each worker gets its own Mongoose connection to the shared replica set.
  await mongoose.connect(uri);
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
