/**
 * Idempotent migration: backfills `role: 'user'` on every document
 * that currently has no role field. Run once after deploying the
 * schema change that added 'moderator' to the enum.
 *
 * Usage:
 *   npx tsx server/scripts/migrate-add-role.ts
 */
import mongoose from 'mongoose';
import { config } from 'dotenv';

config({ path: './server/.env' });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGO_URI as string);
  console.log('Connected to MongoDB');

  const result = await mongoose.connection
    .collection('users_identity')
    .updateMany(
      { role: { $exists: false } },
      { $set: { role: 'user' } }
    );

  console.log(`Migration complete: ${result.modifiedCount} documents backfilled`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
