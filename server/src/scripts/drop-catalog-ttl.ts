/**
 * drop-catalog-ttl.ts — Remove the legacy 7-day TTL index from the supplements
 * collection so the curated affiliate catalog persists permanently.
 *
 * Removing the index from the Mongoose schema stops it being recreated, but it
 * does NOT drop an index that already exists in a live database. Run this once
 * against each environment (local, Atlas) after deploying the schema change.
 *
 * Safe to run repeatedly — it no-ops if the TTL index is already gone.
 *
 * Usage:
 *   npm run catalog:drop-ttl
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { SupplementDataModel } from '../modules/supplements/infrastructure/mongoose/supplement-data.model.js';

dotenv.config();

async function main(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[drop-ttl] MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  try {
    const collection = SupplementDataModel.collection;
    const indexes = await collection.indexes();

    // Find any index with an expireAfterSeconds option (the TTL), regardless of name.
    const ttlIndexes = indexes.filter((idx) => typeof idx.expireAfterSeconds === 'number');

    if (ttlIndexes.length === 0) {
      console.log('[drop-ttl] No TTL index found — nothing to do.');
      return;
    }

    for (const idx of ttlIndexes) {
      if (!idx.name) continue;
      await collection.dropIndex(idx.name);
      console.log(`[drop-ttl] Dropped TTL index "${idx.name}" (expireAfterSeconds: ${idx.expireAfterSeconds}).`);
    }
    console.log('[drop-ttl] Done. Catalog entries will now persist.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('[drop-ttl] fatal error:', err);
  process.exit(1);
});
