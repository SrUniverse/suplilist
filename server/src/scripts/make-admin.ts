/**
 * make-admin.ts — Promote a user to the "admin" role.
 *
 * The admin catalog panel (/admin/products) calls POST/PUT/DELETE
 * /api/supplements, all guarded by requireAdmin. A freshly registered account
 * has role "user", so it gets 403 until promoted. This script flips the role on
 * the user's identity document in MongoDB.
 *
 * Usage:
 *   npm run make-admin -- you@email.com
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { UserIdentityModel } from '../modules/identity/infrastructure/mongoose/user-identity.model.js';

dotenv.config();

async function main(): Promise<void> {
  const email = (process.argv[2] ?? '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run make-admin -- you@email.com');
    process.exit(1);
  }
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[make-admin] MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  try {
    const result = await UserIdentityModel.updateOne(
      { email },
      { $set: { role: 'admin', status: 'active' } }
    );

    if (result.matchedCount === 0) {
      console.error(`[make-admin] No user found with email "${email}". Log in once first so the account is synced.`);
      process.exitCode = 1;
      return;
    }
    console.log(`[make-admin] "${email}" is now an active admin.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('[make-admin] fatal error:', err);
  process.exit(1);
});
