/**
 * Shared test helpers — NOT wired as vitest setupFiles.
 *
 * Each test file that needs MongoDB creates its own MongoMemoryReplSet and
 * manages the connection lifecycle via local beforeAll / afterAll hooks.
 * This prevents pure unit test files from being blocked by a MongoDB binary
 * download or connection timeout.
 *
 * Usage in integration test files:
 *
 *   import { startReplSet, stopReplSet, cleanCollections } from '../../../shared/test/setup.js';
 *
 *   beforeAll(startReplSet);
 *   afterEach(cleanCollections);
 *   afterAll(stopReplSet);
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

let replSet: MongoMemoryReplSet;

export async function startReplSet(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
}

export async function cleanCollections(): Promise<void> {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

export async function stopReplSet(): Promise<void> {
  await mongoose.disconnect();
  await replSet.stop();
}
