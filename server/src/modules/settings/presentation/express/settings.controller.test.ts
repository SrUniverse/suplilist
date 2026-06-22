/**
 * SettingsController — integration tests
 *
 * Three mandatory pillars under test:
 *
 *  PILLAR 1 — Reactive Initialization
 *    Publish UserRegisteredEvent on the shared eventBus (the same singleton
 *    that createApp() wires its listeners to). Assert that users_settings is
 *    created with marketing opt-in flags strictly false (LGPD: opt-in by default
 *    is illegal) and all consents false.
 *
 *  PILLAR 2 — Legal Audit Proof (Append-only + OCC Snapshot)
 *    Authenticated POST /api/settings/consents (action=granted).
 *    Assert:
 *      - users_settings snapshot flag = true AND __v incremented (OCC round-trip).
 *      - users_consents entry carries ipAddress, userAgent, and the SHA-256 hash
 *        from DocumentCatalogService — NOT any value the client could inject.
 *
 *  PILLAR 3 — Whitelist Rejection (invalid document version)
 *    POST /api/settings/consents with a version absent from DocumentCatalogService.
 *    Assert:
 *      - 4xx response.
 *      - ZERO rows written to users_consents (audit log stays clean).
 *      - users_settings snapshot UNCHANGED (privacyPolicy still false, __v still 0).
 *
 * Supporting coverage:
 *  - Auth + CSRF guards on every mutating route.
 *  - GET /api/settings/       — 200 defaults, 404 missing, field exposure.
 *  - PATCH /api/settings/notifications — immutability of transactional/security.
 *  - PATCH /api/settings/locale.
 *  - GET  /api/settings/consents — history, cross-user isolation.
 *
 * Infrastructure (all managed globally):
 *  - MongoDB: MongoMemoryReplSet (global-setup.ts) — all use cases require transactions.
 *  - Redis:   InMemoryRedis (ioredis alias) — requireAuth blocklist check.
 *  - Express: full app via createApp() — registers all event listeners on import.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// requireAuth now verifies a Firebase ID token via getAuth().verifyIdToken (the
// auth migration). Mock it: the mock decodes the JWT that bearerToken() signs and
// idempotently provisions a synced UserIdentity whose _id equals the token sub,
// so requireAuth populates req.user.id = sub. This keeps every existing
// `bearerToken(id)` call site working without changes.
const verifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken }) }));

import { createApp } from '../../../../app.js';
import { eventBus } from '../../../../shared/infrastructure/event-bus/in-memory-event-bus.js';
import { UserRegisteredEvent } from '../../../identity/domain/events/user-registered.event.js';
import { UserSettingsModel } from '../../infrastructure/mongoose/user-settings.model.js';
import { UserConsentModel } from '../../infrastructure/mongoose/user-consent.model.js';
import { UserIdentityModel } from '../../../identity/infrastructure/mongoose/user-identity.model.js';

/**
 * Official hashes from DocumentCatalogService — used to verify that the backend
 * ignores any hash a client might supply and always stores the server-side value.
 */
const OFFICIAL_HASHES = {
  privacy_policy: {
    '1.0.0': '8f4e2b6a2c3f8c5d1e7b9a0c3f5d2e1b8a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d',
    '2.0.0': '3f5d2e1b8a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d1e7b9a0c',
  },
  terms_of_service: {
    '1.0.0': '1e7b9a0c3f5d2e1b8a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d',
  },
  marketing_emails: {
    '1.0.0': '3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d1e7b9a0c3f5d2e1b8a4f9c6d',
  },
} as const;

// ── Singleton app — createApp() registers all module event listeners ───────────
const app = createApp();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-unsafe-change-me';

// ── Helpers ────────────────────────────────────────────────────────────────────

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function bearerToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: `jti-${Math.random().toString(36).slice(2)}`, role: 'user', status: 'active' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

/**
 * Seed a UserSettings document directly (bypasses the event listener).
 * Used by tests that need pre-existing settings without testing initialization.
 */
async function seedSettings(userId: string, overrides: Record<string, unknown> = {}) {
  return UserSettingsModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    notifications: {
      email: { transactional: true, security: true, marketing: false, productUpdates: true },
      push: { enabled: true, marketing: false, reminders: true },
    },
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    consents: { privacyPolicy: false, termsOfService: false, marketingEmails: false },
    ...overrides,
  });
}

const USER_ID = new mongoose.Types.ObjectId().toHexString();

// Decode the bearer JWT and provision a matching synced identity for every
// authenticated request, so requireAuth resolves req.user.id = the token sub.
beforeEach(() => {
  verifyIdToken.mockImplementation(async (token: string) => {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string };
    const uid = decoded.sub;
    await UserIdentityModel.updateOne(
      { _id: new mongoose.Types.ObjectId(uid) },
      {
        $setOnInsert: {
          email: `${uid}@test.com`,
          emailVerified: true,
          status: 'active',
          role: 'user',
          tier: 'free',
          providers: [{ provider: 'password', providerId: uid, providerEmail: `${uid}@test.com`, linkedAt: new Date() }],
        },
      },
      { upsert: true },
    );
    return {
      uid,
      email: `${uid}@test.com`,
      name: '',
      picture: '',
      email_verified: true,
      firebase: { sign_in_provider: 'password' },
    };
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PILLAR 1 — Reactive Initialization via UserRegisteredEvent
// ══════════════════════════════════════════════════════════════════════════════

describe('PILLAR 1 — Reactive Initialization via UserRegisteredEvent', () => {
  it('creates users_settings document when UserRegisteredEvent is published', async () => {
    if (!mongoReady()) return;

    const newUserId = new mongoose.Types.ObjectId().toHexString();

    // Publish through the same singleton eventBus that createApp() registered
    // the CreateSettingsOnUserRegisteredListener on.
    await eventBus.publish(new UserRegisteredEvent(newUserId, `reg-${newUserId}@test.com`));

    const doc = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(newUserId),
    }).lean();

    expect(doc).not.toBeNull();
  });

  it('initializes with marketing flags strictly false — LGPD opt-in compliance', async () => {
    if (!mongoReady()) return;

    const newUserId = new mongoose.Types.ObjectId().toHexString();
    await eventBus.publish(new UserRegisteredEvent(newUserId, `lgpd-${newUserId}@test.com`));

    const doc = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(newUserId),
    }).lean();

    expect(doc).not.toBeNull();

    // LGPD-critical: opt-in marketing must start as false — never true
    expect(doc!.notifications.email.marketing).toBe(false);
    expect(doc!.notifications.push.marketing).toBe(false);

    // All consent flags must default to false (explicit consent not yet given)
    expect(doc!.consents.privacyPolicy).toBe(false);
    expect(doc!.consents.termsOfService).toBe(false);
    expect(doc!.consents.marketingEmails).toBe(false);
  });

  it('initializes with required transactional flags true (cannot be opted out)', async () => {
    if (!mongoReady()) return;

    const newUserId = new mongoose.Types.ObjectId().toHexString();
    await eventBus.publish(new UserRegisteredEvent(newUserId, `trans-${newUserId}@test.com`));

    const doc = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(newUserId),
    }).lean();

    // These are service-critical — always true regardless of user preference
    expect(doc!.notifications.email.transactional).toBe(true);
    expect(doc!.notifications.email.security).toBe(true);
  });

  it('sets default locale pt-BR and timezone America/Sao_Paulo', async () => {
    if (!mongoReady()) return;

    const newUserId = new mongoose.Types.ObjectId().toHexString();
    await eventBus.publish(new UserRegisteredEvent(newUserId, `locale-${newUserId}@test.com`));

    const doc = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(newUserId),
    }).lean();

    expect(doc!.locale).toBe('pt-BR');
    expect(doc!.timezone).toBe('America/Sao_Paulo');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PILLAR 2 — Legal Audit Proof (Append-only + OCC Snapshot)
// ══════════════════════════════════════════════════════════════════════════════

describe('PILLAR 2 — Legal Audit Proof: Append-only log + OCC Snapshot', () => {
  /**
   * The core LGPD proof: one HTTP request must atomically produce two writes:
   *  1. users_consents — immutable audit entry (append-only)
   *  2. users_settings — snapshot updated with OCC (__v incremented)
   */
  it('grant consent: appends to audit log AND increments __v in snapshot atomically', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    // Capture __v BEFORE the grant
    const before = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();
    const versionBefore = before!.__v as number;

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'granted' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Snapshot: flag flipped to true AND __v incremented (OCC proof)
    const after = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();
    expect(after!.consents.privacyPolicy).toBe(true);
    expect(after!.__v as number).toBe(versionBefore + 1);

    // Audit log: exactly one entry for this user+type
    const entries = await UserConsentModel.find({
      userId: new mongoose.Types.ObjectId(USER_ID),
      type: 'privacy_policy',
    }).lean();
    expect(entries.length).toBe(1);
    expect(entries[0].action).toBe('granted');
  });

  it('stores the official SHA-256 hash from DocumentCatalogService — ignores any client-supplied hash', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    // The client sends no hash field at all — the backend must inject it from the catalog
    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'granted' });

    expect(res.status).toBe(200);

    const entry = await UserConsentModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
      type: 'privacy_policy',
    }).lean();

    // documentHash must be the server-authoritative value — cryptographic proof
    expect(entry!.documentHash).toBe(OFFICIAL_HASHES.privacy_policy['1.0.0']);
  });

  it('stores ipAddress and userAgent from the HTTP request metadata', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .set('User-Agent', 'TestBrowser/1.0 IntegrationTest')
      .send({ consentType: 'terms_of_service', version: '1.0.0', action: 'granted' });

    const entry = await UserConsentModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
      type: 'terms_of_service',
    }).lean();

    // ipAddress must be present (loopback or ::1 in test environment)
    expect(entry!.ipAddress).toBeTruthy();
    expect(typeof entry!.ipAddress).toBe('string');

    // userAgent must match the request header
    expect(entry!.userAgent).toBe('TestBrowser/1.0 IntegrationTest');
  });

  it('revoke consent: appends second entry to log, snapshot reflects false, __v incremented again', async () => {
    if (!mongoReady()) return;

    // Start with privacyPolicy already granted (simulates prior state)
    await seedSettings(USER_ID, {
      consents: { privacyPolicy: true, termsOfService: false, marketingEmails: false },
    });

    const before = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();
    const versionBefore = before!.__v as number;

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'revoked' });

    expect(res.status).toBe(200);

    const after = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();

    // OCC: version incremented
    expect(after!.__v as number).toBe(versionBefore + 1);
    // Snapshot: flag back to false
    expect(after!.consents.privacyPolicy).toBe(false);
    // Hash is also the official one for revoke entries
    const entry = await UserConsentModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();
    expect(entry!.documentHash).toBe(OFFICIAL_HASHES.privacy_policy['1.0.0']);
    expect(entry!.action).toBe('revoked');
  });

  it('grant → revoke produces 2 log entries; no row is mutated (append-only invariant)', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'marketing_emails', version: '1.0.0', action: 'granted' });

    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'marketing_emails', version: '1.0.0', action: 'revoked' });

    const entries = await UserConsentModel.find({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).sort({ timestamp: 1 }).lean();

    // Exactly 2 entries — the original grant is never mutated
    expect(entries.length).toBe(2);
    expect(entries[0].action).toBe('granted');
    expect(entries[1].action).toBe('revoked');

    // Both entries carry the official hash — never client-supplied
    expect(entries[0].documentHash).toBe(OFFICIAL_HASHES.marketing_emails['1.0.0']);
    expect(entries[1].documentHash).toBe(OFFICIAL_HASHES.marketing_emails['1.0.0']);

    // Snapshot reflects final state (revoked)
    const settings = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();
    expect(settings!.consents.marketingEmails).toBe(false);
    // __v incremented twice (once per transactional write)
    expect(settings!.__v as number).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PILLAR 3 — Whitelist Rejection (invalid/unknown document version)
// ══════════════════════════════════════════════════════════════════════════════

describe('PILLAR 3 — Whitelist Rejection: unknown version rejected atomically', () => {
  /**
   * The core invariant: a version absent from DocumentCatalogService must be
   * rejected before any write occurs. Neither users_consents nor users_settings
   * should be touched — the transaction must never start.
   */
  it('returns 4xx when version is not in DocumentCatalogService', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '9.9.9', action: 'granted' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('writes ZERO rows to users_consents when version is not in catalog', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '9.9.9', action: 'granted' });

    const count = await UserConsentModel.countDocuments({
      userId: new mongoose.Types.ObjectId(USER_ID),
    });

    // Audit log must be pristine — no partial write
    expect(count).toBe(0);
  });

  it('leaves users_settings snapshot UNCHANGED when version is not in catalog', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const before = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();

    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '9.9.9', action: 'granted' });

    const after = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();

    // Snapshot flags must be identical — no mutation occurred
    expect(after!.consents.privacyPolicy).toBe(false);
    // __v must not have changed — the OCC counter is untouched
    expect(after!.__v).toBe(before!.__v);
  });

  it('rejects unknown consentType (not in Zod enum) — zero DB writes', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'gdpr_consent', version: '1.0.0', action: 'granted' });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const count = await UserConsentModel.countDocuments({
      userId: new mongoose.Types.ObjectId(USER_ID),
    });
    expect(count).toBe(0);
  });

  it('rejects non-SemVer version format (Zod regex guard) — zero DB writes', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: 'latest', action: 'granted' });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const count = await UserConsentModel.countDocuments({
      userId: new mongoose.Types.ObjectId(USER_ID),
    });
    expect(count).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Supporting coverage — Auth/CSRF guards + basic route behaviour
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/settings/', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;
    const res = await request(app).get('/api/settings/');
    expect(res.status).toBe(401);
  });

  it('returns 404 when no settings document exists for the authenticated user', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .get('/api/settings/')
      .set('Authorization', `Bearer ${bearerToken(new mongoose.Types.ObjectId().toHexString())}`);
    expect(res.status).toBe(404);
  });

  it('returns 200 with correct defaults and never exposes __v or _id', async () => {
    if (!mongoReady()) return;
    await seedSettings(USER_ID);

    const res = await request(app)
      .get('/api/settings/')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.locale).toBe('pt-BR');
    // version is the domain field (mapped from __v); _id and raw __v must not appear
    const body = res.body.data as Record<string, unknown>;
    expect(body['_id']).toBeUndefined();
    expect(body['__v']).toBeUndefined();
  });
});

describe('PATCH /api/settings/notifications', () => {
  const validPayload = {
    email: { marketing: true, productUpdates: false },
    push: { enabled: false, marketing: false, reminders: true },
  };

  it('returns 403 without X-SupliList-Client — CSRF guard', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .patch('/api/settings/notifications')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .send(validPayload);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });

  it('returns 200 and updates mutable fields while keeping transactional+security immutable', async () => {
    if (!mongoReady()) return;
    await seedSettings(USER_ID);

    const res = await request(app)
      .patch('/api/settings/notifications')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send(validPayload);

    expect(res.status).toBe(200);
    const n = res.body.data.notifications;
    expect(n.email.marketing).toBe(true);
    expect(n.push.enabled).toBe(false);
    // Immutable fields must survive regardless of what the payload contained
    expect(n.email.transactional).toBe(true);
    expect(n.email.security).toBe(true);
  });
});

describe('PATCH /api/settings/locale', () => {
  it('returns 200 and updates locale and timezone', async () => {
    if (!mongoReady()) return;
    await seedSettings(USER_ID);

    const res = await request(app)
      .patch('/api/settings/locale')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ locale: 'en-US', timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.data.locale).toBe('en-US');
    expect(res.body.data.timezone).toBe('America/New_York');
  });

  it('returns 4xx when locale is empty string — Zod min(2)', async () => {
    if (!mongoReady()) return;
    await seedSettings(USER_ID);

    const res = await request(app)
      .patch('/api/settings/locale')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ locale: '', timezone: 'America/New_York' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('GET /api/settings/consents', () => {
  it('returns 401 without Authorization', async () => {
    if (!mongoReady()) return;
    const res = await request(app).get('/api/settings/consents');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty array when no consent history exists', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .get('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('returns only the requesting user\'s entries — no cross-user data leakage', async () => {
    if (!mongoReady()) return;

    const otherId = new mongoose.Types.ObjectId().toHexString();

    // Insert a consent entry for OTHER user directly
    await UserConsentModel.create({
      userId: new mongoose.Types.ObjectId(otherId),
      type: 'privacy_policy',
      version: '1.0.0',
      documentHash: OFFICIAL_HASHES.privacy_policy['1.0.0'],
      action: 'granted',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date(),
    });

    // Request as USER_ID (different user — must see nothing)
    const res = await request(app)
      .get('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('returns history entries with type, action, version, documentHash, and consentedAt (ISO 8601)', async () => {
    if (!mongoReady()) return;
    await seedSettings(USER_ID);

    // Create one entry via the HTTP endpoint so the full stack is exercised
    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'terms_of_service', version: '1.0.0', action: 'granted' });

    const res = await request(app)
      .get('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);

    const entry = res.body.data[0] as Record<string, unknown>;
    expect(entry['type']).toBe('terms_of_service');
    expect(entry['action']).toBe('granted');
    expect(entry['version']).toBe('1.0.0');
    expect(entry['documentHash']).toBe(OFFICIAL_HASHES.terms_of_service['1.0.0']);
    // ConsentMapper renames timestamp → consentedAt (ISO 8601 string)
    expect(entry['consentedAt']).toBeDefined();
    expect(typeof entry['consentedAt']).toBe('string');
    expect(entry['consentedAt']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(entry['timestamp']).toBeUndefined(); // raw domain field must NOT appear
  });
});

// ── POST /api/settings/consents — auth/CSRF guards ────────────────────────────

describe('POST /api/settings/consents — auth and CSRF guards', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .post('/api/settings/consents')
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'granted' });
    expect(res.status).toBe(401);
  });

  it('returns 403 without X-SupliList-Client — CSRF guard', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'granted' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELETE /api/settings/consents/:consentType — LGPD right to withdraw
// ══════════════════════════════════════════════════════════════════════════════

describe('DELETE /api/settings/consents/:consentType — revogação (LGPD)', () => {
  it('revokes a granted consent: flips snapshot to false, appends a revoked audit entry, returns the settings DTO', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID, {
      consents: { privacyPolicy: true, termsOfService: false, marketingEmails: false },
    });

    const res = await request(app)
      .delete('/api/settings/consents/privacy_policy')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Symmetric with grant: returns the full settings snapshot (not just a message)
    expect(res.body.data).toBeTruthy();
    expect(res.body.data.consents.privacyPolicy).toBe(false);

    // Snapshot persisted as revoked
    const after = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    }).lean();
    expect(after!.consents.privacyPolicy).toBe(false);

    // Immutable audit log gained a 'revoked' entry with the in-force version
    const revoked = await UserConsentModel.find({
      userId: new mongoose.Types.ObjectId(USER_ID),
      type: 'privacy_policy',
      action: 'revoked',
    }).lean();
    expect(revoked.length).toBe(1);
    expect(revoked[0].version).toBe('2.0.0'); // current published privacy_policy version
  });

  it('returns 400 for an unknown consent type', async () => {
    if (!mongoReady()) return;
    await seedSettings(USER_ID);

    const res = await request(app)
      .delete('/api/settings/consents/not_a_real_type')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_consent_type');
  });

  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;
    const res = await request(app)
      .delete('/api/settings/consents/privacy_policy')
      .set('X-SupliList-Client', '1');
    expect(res.status).toBe(401);
  });
});
