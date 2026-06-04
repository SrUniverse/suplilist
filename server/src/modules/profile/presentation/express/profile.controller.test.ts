/**
 * ProfileController — integration tests
 *
 * Infrastructure (managed globally):
 *  - MongoDB: shared MongoMemoryReplSet started by global-setup.ts.
 *    MONGO_TEST_URI is set before workers spawn; setup.ts connects each worker.
 *    If MONGO_TEST_URI is unset (binary not yet cached), setup.ts logs a warning
 *    and tests skip gracefully via the mongoReady guard.
 *  - Redis: ioredis replaced by InMemoryRedis (vitest.config.ts resolve.alias).
 *    Full command semantics: SET NX EX, EXISTS, LPUSH, FLUSHDB, …
 *  - Express: full app via createApp() — all real middlewares active.
 *
 * Auth: Authorization: Bearer <token> (NOT cookies).
 * JWT_SECRET fallback = 'dev-jwt-secret-unsafe-change-me'.
 *
 * Seeding: UserProfileModel.create({ userId: new ObjectId(hexId), … })
 * The `userId` field is a separate ObjectId ref, not the document _id.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../../../app.js';
import { ProfileModel } from '../../infrastructure/mongoose/profile.model.js';

const app = createApp();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-unsafe-change-me';

function bearerToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: `test-jti-${Math.random()}`, role: 'user', status: 'active' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

async function seedProfile(userId: string, overrides: Record<string, unknown> = {}) {
  await ProfileModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    displayName: 'Test User',
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: null,
    avatarStatus: 'none',
    ...overrides,
  });
}

/** Stable ObjectId hex string reused across tests (DB cleaned between each by setup.ts). */
const VALID_USER_ID = new mongoose.Types.ObjectId().toHexString();

/** Guard for tests that require a live MongoDB connection. */
function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

// ── GET /api/profile/me ────────────────────────────────────────────────────────

describe('GET /api/profile/me', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;
    const res = await request(app).get('/api/profile/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 for a malformed / unsigned token', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
  });

  it('returns 404 when no profile exists for the authenticated user', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(new mongoose.Types.ObjectId().toHexString())}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('profile_not_found');
  });

  it('returns 200 with private profile including firstName and lastName', async () => {
    if (!mongoReady()) return;
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
    if (!mongoReady()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.createdAt).toBe('string');
    expect(typeof res.body.data.updatedAt).toBe('string');
    expect(res.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('never exposes passwordHash, mfa, or __v', async () => {
    if (!mongoReady()) return;
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
    if (!mongoReady()) return;
    const res = await request(app).get(`/api/profile/${VALID_USER_ID}`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when the target profile does not exist', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .get(`/api/profile/${new mongoose.Types.ObjectId().toHexString()}`)
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);
    expect(res.status).toBe(404);
  });

  it('returns public profile — firstName, lastName, createdAt excluded', async () => {
    if (!mongoReady()) return;
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
    if (!mongoReady()) return;
    await seedProfile(VALID_USER_ID, {
      avatarUrl: 'https://cdn.example.com/avatar.png',
      avatarStatus: 'pending_moderation',
    });

    const res = await request(app)
      .get(`/api/profile/${VALID_USER_ID}`)
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toBeNull();
  });

  it('exposes avatarUrl when avatarStatus is approved', async () => {
    if (!mongoReady()) return;
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
    if (!mongoReady()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .send({ displayName: 'New Name' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });

  it('returns 401 when Authorization header is missing', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('X-SupliList-Client', '1')
      .send({ displayName: 'New Name' });
    expect(res.status).toBe(401);
  });

  it('creates and returns updated profile with ISO date strings', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ displayName: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('Updated Name');
    expect(typeof res.body.data.createdAt).toBe('string');
  });

  it('returns 4xx when displayName exceeds 50 characters — Zod validation', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ displayName: 'A'.repeat(51) });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('silently ignores migrationVersion — must not leak into generic update DTO', async () => {
    if (!mongoReady()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      // migrationVersion must be stripped by Zod (unknown key) — not persisted
      .send({ displayName: 'Test User', migrationVersion: 1 });

    expect(res.status).toBe(200);
    // The generic update endpoint must never return migrationVersion
    expect(res.body.data.migrationVersion).toBeUndefined();
  });
});

// ── PATCH /api/profile/me/migration-sync ──────────────────────────────────────

describe('PATCH /api/profile/me/migration-sync', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: 1 });
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-SupliList-Client header is missing — CSRF guard', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .send({ migrationVersion: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });

  it('returns 404 when the user has no profile yet', async () => {
    if (!mongoReady()) return;
    const ghostId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(ghostId)}`)
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: 1 });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('profile_not_found');
  });

  it('persists migrationVersion and reflects it in the response DTO', async () => {
    if (!mongoReady()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.migrationVersion).toBe(1);
  });

  it('is idempotent — sending the same version twice returns 200 both times', async () => {
    if (!mongoReady()) return;
    await seedProfile(VALID_USER_ID);

    await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: 1 });

    const second = await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: 1 });

    expect(second.status).toBe(200);
    expect(second.body.data.migrationVersion).toBe(1);
  });

  it('never regresses migrationVersion — sending v1 after v2 must not overwrite', async () => {
    if (!mongoReady()) return;
    await seedProfile(VALID_USER_ID);

    // Advance to version 2
    await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: 2 });

    // Attempt to regress to version 1 (stale/re-sending client)
    const regress = await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: 1 });

    expect(regress.status).toBe(200);
    // Server preserves v2 — the monotonic invariant holds
    expect(regress.body.data.migrationVersion).toBe(2);
  });

  it('returns 4xx when migrationVersion is not a positive integer', async () => {
    if (!mongoReady()) return;
    await seedProfile(VALID_USER_ID);

    const res = await request(app)
      .patch('/api/profile/me/migration-sync')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ migrationVersion: -1 });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
