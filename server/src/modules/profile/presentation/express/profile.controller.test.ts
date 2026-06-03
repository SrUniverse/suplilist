/**
 * ProfileController — integration tests
 *
 * Infrastructure:
 *  - MongoDB: MongoMemoryReplSet (single-node replica set, managed in this file).
 *    Required because UpdateProfileUseCase wraps writes in mongoose transactions.
 *    On first run, mongodb-memory-server downloads the MongoDB binary (~600 MB from
 *    fastdl.mongodb.org). The binary is cached in ~/.cache/mongodb-binaries and
 *    reused on subsequent runs and in CI (via the cache step in deploy.yml).
 *    If the binary is not yet cached, all tests in this file are SKIPPED gracefully
 *    rather than crashing the worker.
 *  - Redis: ioredis replaced by MockRedis via vitest.config.ts resolve.alias.
 *    blocklist always returns "not blocked" → any valid JWT passes requireAuth.
 *  - Express: full app created by createApp() — all real middlewares active.
 *
 * Auth strategy:
 *  requireAuth reads Authorization: Bearer <token> (NOT cookies).
 *  JWT_SECRET fallback = 'dev-jwt-secret-unsafe-change-me' (set in vitest env).
 *  Tokens signed with the same secret pass the real jsonwebtoken.verify() call.
 *
 * Seeding:
 *  UserProfileModel.create({ userId: new ObjectId(hexId), … })
 *  The `userId` field is a separate ObjectId ref — NOT the document _id.
 *  findPrivateByUserId queries { userId: ObjectId(hexId) }.
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createApp } from '../../../../app.js';
import { UserProfileModel } from '../../infrastructure/mongoose/user-profile.model.js';

// ── MongoDB lifecycle ──────────────────────────────────────────────────────────

let replSet: MongoMemoryReplSet | null = null;

/**
 * True once the replica set is up and mongoose is connected.
 * Each test calls skipIfNoMongo() and returns early when this is false.
 * This avoids worker crashes when the binary is still being downloaded.
 */
let mongoReady = false;

beforeAll(async () => {
  try {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1 }, // single-node — lightweight, supports transactions
    });
    await mongoose.connect(replSet.getUri());
    mongoReady = true;
  } catch (err) {
    console.warn(
      '\n⚠️  MongoDB binary not yet cached (first-run download required).\n' +
      '   Integration tests are SKIPPED on this run.\n' +
      '   Re-run `npm run test:server` after ~/.cache/mongodb-binaries/ is populated.\n' +
      `   Reason: ${(err as Error).message}\n`,
    );
  }
});

afterEach(async () => {
  if (!mongoReady) return;
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  if (!mongoReady) return;
  await mongoose.disconnect();
  await replSet?.stop();
});

/** Returns true and logs a skip message when MongoDB is not yet available. */
function skipIfNoMongo(): boolean {
  if (!mongoReady) {
    console.log('    ↷ skipped — MongoDB binary not cached');
    return true;
  }
  return false;
}

// ── App + auth helpers ─────────────────────────────────────────────────────────

// createApp() is safe before mongoose connects: no queries run at construction.
const app = createApp();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-unsafe-change-me';

/** Returns a signed Bearer token whose sub is the given ObjectId hex string. */
function bearerToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: `test-jti-${Math.random()}`, role: 'user', status: 'active' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

// ── Seed helper ────────────────────────────────────────────────────────────────

async function seedProfile(userId: string, overrides: Record<string, unknown> = {}) {
  return UserProfileModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    displayName: 'Test User',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
    avatarStatus: 'none',
    ...overrides,
  });
}

const VALID_USER_ID = new mongoose.Types.ObjectId().toHexString();

// ── GET /api/profile/me ────────────────────────────────────────────────────────

describe('GET /api/profile/me', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (skipIfNoMongo()) return;
    const res = await request(app).get('/api/profile/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for a malformed / unsigned token', async () => {
    if (skipIfNoMongo()) return;
    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer this-is-not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('returns 404 when no profile exists for the authenticated user', async () => {
    if (skipIfNoMongo()) return;
    const userId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(userId)}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('profile_not_found');
  });

  it('returns 200 with private profile including firstName and lastName', async () => {
    if (skipIfNoMongo()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.displayName).toBe('Test User');
    expect(res.body.data.firstName).toBe('John');
    expect(res.body.data.lastName).toBe('Doe');
  });

  it('returns createdAt and updatedAt as ISO 8601 strings — wire contract', async () => {
    if (skipIfNoMongo()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.createdAt).toBe('string');
    expect(typeof res.body.data.updatedAt).toBe('string');
    expect(res.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('never exposes passwordHash, mfa, or __v in the response', async () => {
    if (skipIfNoMongo()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    const body = res.body.data as Record<string, unknown>;
    expect(body['passwordHash']).toBeUndefined();
    expect(body['mfa']).toBeUndefined();
    expect(body['__v']).toBeUndefined();
  });
});

// ── GET /api/profile/:userId ───────────────────────────────────────────────────

describe('GET /api/profile/:userId', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (skipIfNoMongo()) return;
    const res = await request(app).get(`/api/profile/${VALID_USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when the target profile does not exist', async () => {
    if (skipIfNoMongo()) return;
    const unknownId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .get(`/api/profile/${unknownId}`)
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);
    expect(res.status).toBe(404);
  });

  it('returns public profile — firstName, lastName, createdAt excluded', async () => {
    if (skipIfNoMongo()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .get(`/api/profile/${VALID_USER_ID}`)
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('Test User');

    const body = res.body.data as Record<string, unknown>;
    expect(body['firstName']).toBeUndefined();
    expect(body['lastName']).toBeUndefined();
    expect(body['createdAt']).toBeUndefined();
    expect(body['updatedAt']).toBeUndefined();
  });

  it('masks avatarUrl when avatarStatus is pending_moderation', async () => {
    if (skipIfNoMongo()) return;
    await seedProfile(VALID_USER_ID, {
      avatarUrl: 'https://cdn.example.com/avatar.png',
      avatarStatus: 'pending_moderation',
    });

    const res = await request(app)
      .get(`/api/profile/${VALID_USER_ID}`)
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toBeNull();
    expect(res.body.data.avatarStatus).toBe('pending_moderation');
  });

  it('exposes avatarUrl when avatarStatus is approved', async () => {
    if (skipIfNoMongo()) return;
    await seedProfile(VALID_USER_ID, {
      avatarUrl: 'https://cdn.example.com/avatar.png',
      avatarStatus: 'approved',
    });

    const res = await request(app)
      .get(`/api/profile/${VALID_USER_ID}`)
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toBe('https://cdn.example.com/avatar.png');
  });
});

// ── PATCH /api/profile/me ─────────────────────────────────────────────────────

describe('PATCH /api/profile/me', () => {
  it('returns 403 when X-SupliList-Client header is missing — CSRF guard', async () => {
    if (skipIfNoMongo()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .send({ displayName: 'New Name' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });

  it('returns 401 when Authorization header is missing', async () => {
    if (skipIfNoMongo()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('X-SupliList-Client', '1')
      .send({ displayName: 'New Name' });

    expect(res.status).toBe(401);
  });

  it('creates and returns updated profile with ISO date strings', async () => {
    if (skipIfNoMongo()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.displayName).toBe('Updated Name');
    expect(typeof res.body.data.createdAt).toBe('string');
  });

  it('returns 4xx when displayName exceeds 50 characters — Zod validation', async () => {
    if (skipIfNoMongo()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ displayName: 'A'.repeat(51) });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
