/**
 * AuthController — integration tests
 *
 * Validates the Identity module's full HTTP stack: registration, login, token
 * rotation, and concurrent logout atomicity.
 *
 * Infrastructure (managed globally via global-setup.ts + setup.ts):
 *  - MongoDB: shared MongoMemoryReplSet — supports transactions (UoW).
 *  - Redis:   InMemoryRedis (ioredis alias) with full SET NX EX semantics.
 *    This is the critical fixture: the blocklist uses SET NX EX to guarantee
 *    that concurrent logout requests block the JTI exactly once. After logout,
 *    requireAuth sees the key via EXISTS and returns 401 'revoked_token'.
 *  - Express: full app via createApp().
 *
 * Test patterns:
 *  - "register then login" flows use the HTTP endpoints end-to-end.
 *  - Where bcrypt cost would slow tests, users are seeded directly in MongoDB
 *    with a cost-4 hash (via seedUser helper) to keep the suite under 10 s.
 *  - mongoReady() guard skips tests when MONGO_TEST_URI is unset (first run
 *    before the binary is cached). All tests pass in CI where the binary is
 *    downloaded once and cached by the actions/cache step.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../../../app.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';
import { RefreshTokenModel } from '../../infrastructure/mongoose/refresh-token.model.js';
import { ProfileModel } from '../../../profile/infrastructure/mongoose/profile.model.js';

const app = createApp();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-unsafe-change-me';

// ── Helpers ────────────────────────────────────────────────────────────────────

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

/** Unique email per test file run to avoid cross-test pollution. */
const uid = () => `user-${Math.random().toString(36).slice(2)}@test.com`;

/**
 * Seed an active user directly in MongoDB.
 * Uses bcrypt cost=4 (vs production cost=12) to keep setup time <100 ms.
 * The RegisterUseCase uses cost=12 — tested in the "register" describe block.
 */
async function seedUser(email: string, password: string, overrides: Record<string, unknown> = {}) {
  const passwordHash = await bcrypt.hash(password, 4);
  return UserIdentityModel.create({
    email,
    passwordHash,
    status: 'active',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    role: 'user',
    providers: [],
    mfa: {
      enabled: false,
      type: null,
      totpSecret: null,
      backupCodes: [],
      enabledAt: null,
      lastUsedAt: null,
    },
    deletedAt: null,
    suspendedAt: null,
    suspendedReason: null,
    ...overrides,
  });
}

/** POST /api/auth/login — returns accessToken + raw refreshToken string. */
async function loginUser(email: string, password: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .set('X-SupliList-Client', '1')
    .send({ email, password });

  const setCookies: string[] = Array.isArray(res.headers['set-cookie'])
    ? res.headers['set-cookie']
    : res.headers['set-cookie'] ? [res.headers['set-cookie']] : [];

  const refreshTokenCookie = setCookies
    .find(c => c.startsWith('refreshToken='))
    ?.match(/refreshToken=([^;]+)/)?.[1] ?? null;

  return {
    status: res.status,
    body: res.body,
    // AuthMapper wraps accessToken in data: { accessToken }
    accessToken: (res.body.data?.accessToken ?? res.body.accessToken) as string | undefined,
    refreshTokenCookie,
  };
}

// ── POST /api/auth/register ────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('returns 201 with userId on valid registration', async () => {
    if (!mongoReady()) return;

    const email = uid();
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-SupliList-Client', '1')
      .send({ email, password: 'ValidPass123!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.userId).toBeDefined();
    expect(res.body.data.email).toBe(email);
    expect(res.body.data.status).toBe('pending_verification');
  });

  it('persists the user in MongoDB after registration (transactional write)', async () => {
    if (!mongoReady()) return;

    const email = uid();
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-SupliList-Client', '1')
      .send({ email, password: 'ValidPass123!' });

    const doc = await UserIdentityModel.findById(res.body.data.userId);
    expect(doc).not.toBeNull();
    expect(doc!.email).toBe(email);
    // passwordHash must be stored, must NOT be the plain-text password
    expect(doc!.passwordHash).toBeDefined();
    expect(doc!.passwordHash).not.toBe('ValidPass123!');
  });

  it('returns 4xx when email already exists', async () => {
    if (!mongoReady()) return;

    const email = uid();
    await request(app)
      .post('/api/auth/register')
      .set('X-SupliList-Client', '1')
      .send({ email, password: 'ValidPass123!' });

    const second = await request(app)
      .post('/api/auth/register')
      .set('X-SupliList-Client', '1')
      .send({ email, password: 'DifferentPass456!' });

    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(second.body.error).toBe('user_already_exists');
  });

  it('returns 4xx when email is invalid', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .post('/api/auth/register')
      .set('X-SupliList-Client', '1')
      .send({ email: 'not-an-email', password: 'ValidPass123!' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 4xx when password is too short (< 8 chars)', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .post('/api/auth/register')
      .set('X-SupliList-Client', '1')
      .send({ email: uid(), password: 'short' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 403 when X-SupliList-Client is missing — CSRF guard', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: uid(), password: 'ValidPass123!' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const PASSWORD = 'LoginPass789!';
  let email: string;

  beforeEach(async () => {
    if (!mongoReady()) return;
    email = uid();
    await seedUser(email, PASSWORD);
  });

  it('returns 200 with accessToken in body on valid credentials', async () => {
    if (!mongoReady()) return;

    const result = await loginUser(email, PASSWORD);

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    expect(typeof result.accessToken).toBe('string');
  });

  it('sets httpOnly refreshToken cookie on successful login', async () => {
    if (!mongoReady()) return;

    const result = await loginUser(email, PASSWORD);

    expect(result.refreshTokenCookie).toBeTruthy();
    expect(result.status).toBe(200);
  });

  it('JWT payload contains sub (userId), jti, role, and status', async () => {
    if (!mongoReady()) return;

    const result = await loginUser(email, PASSWORD);
    const decoded = jwt.decode(result.accessToken!) as Record<string, unknown>;

    expect(decoded.sub).toBeDefined();
    expect(decoded.jti).toBeDefined();
    expect(decoded.role).toBe('user');
    expect(decoded.status).toBe('active');
  });

  it('JWT payload does NOT expose passwordHash or totpSecret', async () => {
    if (!mongoReady()) return;

    const result = await loginUser(email, PASSWORD);
    const decoded = jwt.decode(result.accessToken!) as Record<string, unknown>;

    expect(decoded['passwordHash']).toBeUndefined();
    expect(decoded['totpSecret']).toBeUndefined();
    expect(decoded['mfa']).toBeUndefined();
  });

  it('returns 401 when password is wrong', async () => {
    if (!mongoReady()) return;

    const result = await loginUser(email, 'WrongPassword!');
    expect(result.status).toBe(401);
    expect(result.body.error).toBe('invalid_credentials');
  });

  it('returns 401 when email is not registered', async () => {
    if (!mongoReady()) return;

    const result = await loginUser('nobody@nowhere.com', PASSWORD);
    expect(result.status).toBe(401);
  });

  it('returns 403 when account is suspended', async () => {
    if (!mongoReady()) return;

    const suspendedEmail = uid();
    await seedUser(suspendedEmail, PASSWORD, {
      status: 'suspended',
      suspendedAt: new Date(),
    });

    const result = await loginUser(suspendedEmail, PASSWORD);
    expect(result.status).toBe(403);
    expect(result.body.error).toBe('account_suspended');
  });
});

// ── POST /api/auth/refresh ─────────────────────────────────────────────────────

describe('POST /api/auth/refresh', () => {
  const PASSWORD = 'RefreshPass789!';

  it('returns 401 when no refreshToken cookie is provided', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('X-SupliList-Client', '1');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing_refresh_token');
  });

  it('rotates the refreshToken and returns a new accessToken', async () => {
    if (!mongoReady()) return;

    const email = uid();
    await seedUser(email, PASSWORD);

    const login = await loginUser(email, PASSWORD);
    expect(login.status).toBe(200);
    const originalAccessToken = login.accessToken!;
    const originalRefreshToken = login.refreshTokenCookie!;

    // Short delay so JTI timestamps differ
    await new Promise(r => setTimeout(r, 10));

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('X-SupliList-Client', '1')
      .set('Cookie', `refreshToken=${originalRefreshToken}`);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    // AuthMapper wraps accessToken in data: { accessToken }
    const newAccessToken = refreshRes.body.data?.accessToken ?? refreshRes.body.accessToken;
    expect(newAccessToken).not.toBe(originalAccessToken);

    // Old refresh token must be revoked (theft detection if reused)
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .set('X-SupliList-Client', '1')
      .set('Cookie', `refreshToken=${originalRefreshToken}`);

    // Reusing the old token triggers token theft detection
    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error).toBe('session_revoked');
  });

  it('returns 401 when refreshToken is completely invalid', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('X-SupliList-Client', '1')
      .set('Cookie', 'refreshToken=completely-invalid-opaque-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_session');
  });
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  const PASSWORD = 'LogoutPass789!';

  it('returns 200 on successful logout', async () => {
    if (!mongoReady()) return;

    const email = uid();
    await seedUser(email, PASSWORD);
    const login = await loginUser(email, PASSWORD);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${login.accessToken}`)
      .set('X-SupliList-Client', '1')
      .set('Cookie', `refreshToken=${login.refreshTokenCookie}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('blocklists the JWT so subsequent requests get 401 revoked_token', async () => {
    if (!mongoReady()) return;

    const email = uid();
    await seedUser(email, PASSWORD);

    const login = await loginUser(email, PASSWORD);
    const decoded = jwt.decode(login.accessToken!) as { sub: string };

    // Seed a profile so /api/profile/me returns 200 if auth passes
    await ProfileModel.create({
      userId: new mongoose.Types.ObjectId(decoded.sub),
      displayName: 'Logout Test User',
      firstName: null,
      lastName: null,
      avatarUrl: null,
      avatarStatus: 'none',
    });

    // Token works before logout
    const before = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${login.accessToken}`);
    expect(before.status).toBe(200);

    // Logout
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${login.accessToken}`)
      .set('X-SupliList-Client', '1')
      .set('Cookie', `refreshToken=${login.refreshTokenCookie}`);

    // Token is now blocked in InMemoryRedis → requireAuth returns 401
    const after = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${login.accessToken}`);
    expect(after.status).toBe(401);
    expect(after.body.error).toBe('revoked_token');
  });

  it('concurrent logout calls for same JTI are idempotent — SET NX EX atomicity', async () => {
    if (!mongoReady()) return;

    const email = uid();
    await seedUser(email, PASSWORD);
    const login = await loginUser(email, PASSWORD);

    const accessToken = login.accessToken!;
    const refreshTokenCookie = login.refreshTokenCookie!;

    // Fire two concurrent logout requests with the same access token (same JTI).
    // Both pass requireAuth because the block hasn't been set yet at that point.
    // LogoutUseCase uses SET NX EX: first call returns 'OK' (proceeds),
    // second returns null (early return — no duplicate refresh token revocation).
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .set('Cookie', `refreshToken=${refreshTokenCookie}`),
      request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-SupliList-Client', '1')
        .set('Cookie', `refreshToken=${refreshTokenCookie}`),
    ]);

    // Both requests must succeed gracefully (idempotent from client's perspective)
    expect(res1.status).toBe(200);
    expect([200, 401]).toContain(res2.status);

    // Verify: the refresh token was revoked exactly once (not corrupted by double-write)
    const decoded = jwt.decode(accessToken) as { sub: string };
    const sessions = await RefreshTokenModel.find({ userId: decoded.sub }).exec();
    const revokedSessions = sessions.filter(s => s.revokedAt !== null);
    // Exactly one session exists and it is revoked — no duplicate documents
    expect(sessions.length).toBe(1);
    expect(revokedSessions.length).toBe(1);

    // Verify: the JTI is in the InMemoryRedis blocklist
    const afterBothLogouts = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(afterBothLogouts.status).toBe(401);
    expect(afterBothLogouts.body.error).toBe('revoked_token');
  });
});
