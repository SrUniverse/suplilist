/**
 * seed-catalog.ts — One-time bootstrap of the catalog metadata into MongoDB.
 *
 * The public catalog has long been maintained as a static file
 * (frontend/public/data/supplements-db.json, ~55 entries). This script imports
 * each entry's metadata into the `supplements_data` collection so the admin
 * panel becomes the single source of truth. After running this once,
 * `catalog:export` can safely regenerate supplements-db.json from Mongo without
 * losing the existing curated entries.
 *
 * It is idempotent and non-destructive:
 *   - Upserts by supplementId.
 *   - $set updates only `name` and `metadata`.
 *   - Existing prices/priceHistory are preserved (never touched).
 *
 * Usage:
 *   npm run catalog:seed
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  SupplementDataModel,
  type ISupplementMetadata,
} from '../modules/supplements/infrastructure/mongoose/supplement-data.model.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../');
const CATALOG_DB_PATH = resolve(REPO_ROOT, 'frontend/public/data/supplements-db.json');

interface CatalogEntry extends ISupplementMetadata {
  id: string;
  name: string;
}

function loadCatalog(): CatalogEntry[] {
  const raw = readFileSync(CATALOG_DB_PATH, 'utf8');
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const data = JSON.parse(text);
  const arr = Array.isArray(data) ? data : data?.supplements;
  if (!Array.isArray(arr)) {
    throw new Error('supplements-db.json is not an array (or {supplements:[]}).');
  }
  return arr as CatalogEntry[];
}

/** Strip id/name from a catalog entry to get the metadata subdocument. */
function toMetadata(entry: CatalogEntry): ISupplementMetadata {
  const { id: _id, name: _name, ...metadata } = entry;
  return metadata as ISupplementMetadata;
}

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[seed-catalog] MONGO_URI is not set. Add it to server/.env or the environment.');
    process.exit(1);
  }

  const entries = loadCatalog();
  console.log(`[seed-catalog] loaded ${entries.length} entries from supplements-db.json`);

  await mongoose.connect(mongoUri);
  let inserted = 0;
  let updated = 0;
  try {
    for (const entry of entries) {
      if (!entry.id) {
        console.warn('[seed-catalog] skipping entry without id:', entry.name ?? '(unnamed)');
        continue;
      }
      const result = await SupplementDataModel.updateOne(
        { supplementId: entry.id },
        {
          $set: { name: entry.name, metadata: toMetadata(entry) },
          $setOnInsert: {
            _id: uuidv4(),
            supplementId: entry.id,
            prices: {},
            bestPrice: 'amazon',
            bestPriceValue: 0,
            priceHistory: [],
            lastCrawled: new Date(),
          },
        },
        { upsert: true }
      );
      if (result.upsertedCount > 0) inserted++;
      else updated++;
    }
  } finally {
    await mongoose.disconnect();
  }

  console.log('────────────────────────────────────────');
  console.log(`[seed-catalog] done: ${inserted} inserted, ${updated} updated (metadata refreshed).`);
  console.log('[seed-catalog] prices/priceHistory were preserved. Run `npm run catalog:export` to regenerate the static files.');
}

main().catch((err) => {
  console.error('[seed-catalog] fatal error:', err);
  process.exit(1);
});
