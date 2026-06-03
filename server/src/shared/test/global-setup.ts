/**
 * Vitest globalSetup — runs ONCE in the main process before any workers spawn.
 *
 * Architecture:
 *  - Starts a single MongoMemoryReplSet shared across all integration test files.
 *  - Writes the URI to process.env.MONGO_TEST_URI; workers inherit it and
 *    connect in their own beforeAll (see setup.ts).
 *  - Using one global instance prevents the O(n) resource spike that would occur
 *    if each of the n integration test files created its own mongod process.
 *
 * Binary caching:
 *  - mongodb-memory-server downloads the MongoDB binary (~600 MB) on first run
 *    from fastdl.mongodb.org to ~/.cache/mongodb-binaries.
 *  - We check for the extracted binary BEFORE calling create() so that pure unit
 *    test files (ProfileMapper, etc.) are not forced to wait for a download that
 *    they don't need. If the binary is absent, globalSetup returns immediately
 *    and MONGO_TEST_URI stays unset; setup.ts then skips the connection and
 *    every DB-dependent test guards with mongoReady().
 *  - In CI, the binary is downloaded once and cached via the actions/cache step
 *    in deploy.yml (key: mongodb-binary-${{ hashFiles('server/package.json') }}).
 */
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

const MONGOMS_CACHE = join(homedir(), '.cache', 'mongodb-binaries');

/**
 * Returns true if the MongoDB binary has been extracted into the cache directory.
 * We look for any subdirectory inside the cache (the extracted archive) rather
 * than the zip or the in-progress .downloading file.
 * This avoids triggering a network download just to check availability.
 */
function isBinaryCached(): boolean {
  try {
    if (!existsSync(MONGOMS_CACHE)) return false;
    const entries = readdirSync(MONGOMS_CACHE, { withFileTypes: true });
    return entries.some(e => e.isDirectory());
  } catch {
    return false;
  }
}

let replSet: MongoMemoryReplSet | null = null;

export async function setup(): Promise<void> {
  if (!isBinaryCached()) {
    console.warn(
      '\n[globalSetup] ⚠️  MongoDB binary not yet cached in ' + MONGOMS_CACHE + '\n' +
      '   DB-dependent tests will be skipped on this run.\n' +
      '   The binary will be downloaded automatically on the next full test run\n' +
      '   OR you can run: MONGOMS_DOWNLOAD_URL=<mirror> npm run test:server\n' +
      '   In CI the binary is cached via the actions/cache step in deploy.yml.\n',
    );
    // MONGO_TEST_URI stays unset → setup.ts skips connect → tests guard with mongoReady()
    return;
  }

  try {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 }, // single-node replica set — supports transactions
    });
    process.env.MONGO_TEST_URI = replSet.getUri();
    console.log('[globalSetup] MongoMemoryReplSet ready →', process.env.MONGO_TEST_URI);
  } catch (err) {
    console.warn(
      `[globalSetup] Failed to start MongoMemoryReplSet: ${(err as Error).message}\n` +
      '   DB-dependent tests will be skipped.',
    );
  }
}

export async function teardown(): Promise<void> {
  if (replSet) {
    await replSet.stop();
    console.log('[globalSetup] MongoMemoryReplSet stopped.');
  }
}
