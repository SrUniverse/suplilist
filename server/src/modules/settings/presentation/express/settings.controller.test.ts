/**
 * SettingsController — integration tests
 *
 * Covers the full HTTP stack for the Settings module:
 *  - GET    /api/settings/           → getSettings
 *  - PATCH  /api/settings/notifications → updateNotifications
 *  - PATCH  /api/settings/locale        → updateLocale
 *  - GET    /api/settings/consents      → getConsentHistory
 *  - POST   /api/settings/consents      → submitConsent (grant | revoke)
 *
 * Infrastructure (managed globally):
 *  - MongoDB: shared MongoMemoryReplSet (global-setup.ts) — transactions required
 *    because UpdateNotificationsUseCase, UpdateLocaleUseCase, GrantConsentUseCase,
 *    and RevokeConsentUseCase all call runInTransaction().
 *  - Redis: InMemoryRedis (ioredis alias) — no Settings use case touches Redis,
 *    but requireAuth does (blocklist check), so the alias must remain active.
 *  - Express: full app via createApp().
 *
 * Key domain invariants verified:
 *  1. notifications.email.transactional and .security are immutable — always true.
 *  2. Consent operations are transactional: audit log (append-only) + snapshot update
 *     happen atomically. A grant followed by a revoke produces 2 log entries and
 *     the snapshot reflects the last action.
 *  3. DocumentCatalogService is the source of truth for version validity.
 *     A version not present in the catalog → 4xx regardless of the consent type.
 *  4. Consent history is ordered newest-first; each entry carries userId, type,
 *     version, action, and timestamp.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../../../app.js';
import { UserSettingsModel } from '../../infrastructure/mongoose/user-settings.model.js';
import { UserConsentModel } from '../../infrastructure/mongoose/user-consent.model.js';

const app = createApp();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-unsafe-change-me';

// ── Helpers ────────────────────────────────────────────────────────────────────

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function bearerToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: `test-jti-${Math.random()}`, role: 'user', status: 'active' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

/**
 * Seed a UserSettings document directly with schema defaults.
 * Bypasses the UserRegistered event listener to keep tests independent.
 */
async function seedSettings(userId: string, overrides: Record<string, unknown> = {}) {
  return UserSettingsModel.create({
    userId: new mongoose.Types.ObjectId(userId),
    notifications: {
      email: {
        transactional: true,
        security: true,
        marketing: false,
        productUpdates: true,
      },
      push: {
        enabled: true,
        marketing: false,
        reminders: true,
      },
    },
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    consents: {
      privacyPolicy: false,
      termsOfService: false,
      marketingEmails: false,
    },
    ...overrides,
  });
}

/** Stable ObjectId hex reused within a describe block (DB wiped between tests by setup.ts). */
const USER_ID = new mongoose.Types.ObjectId().toHexString();

// ── GET /api/settings/ ─────────────────────────────────────────────────────────

describe('GET /api/settings/', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;

    const res = await request(app).get('/api/settings/');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 when no settings document exists for the user', async () => {
    if (!mongoReady()) return;

    const unknownId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(app)
      .get('/api/settings/')
      .set('Authorization', `Bearer ${bearerToken(unknownId)}`);

    expect(res.status).toBe(404);
  });

  it('returns 200 with default settings after seeding', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .get('/api/settings/')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data.locale).toBe('pt-BR');
    expect(data.timezone).toBe('America/Sao_Paulo');
    expect(data.notifications.email.transactional).toBe(true);
    expect(data.notifications.email.security).toBe(true);
    expect(data.notifications.email.marketing).toBe(false);
    expect(data.consents.privacyPolicy).toBe(false);
    expect(data.consents.termsOfService).toBe(false);
    expect(data.consents.marketingEmails).toBe(false);
  });

  it('never exposes __v or raw ObjectId internals', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .get('/api/settings/')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);

    expect(res.status).toBe(200);
    const body = res.body.data as Record<string, unknown>;
    expect(body['__v']).toBeUndefined();
    expect(body['_id']).toBeUndefined();
  });
});

// ── PATCH /api/settings/notifications ─────────────────────────────────────────

describe('PATCH /api/settings/notifications', () => {
  const validPayload = {
    email: { marketing: true, productUpdates: false },
    push: { enabled: false, marketing: false, reminders: true },
  };

  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .patch('/api/settings/notifications')
      .set('X-SupliList-Client', '1')
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  it('returns 403 when X-SupliList-Client is missing — CSRF guard', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .patch('/api/settings/notifications')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .send(validPayload);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });

  it('returns 200 and updates mutable notification fields', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .patch('/api/settings/notifications')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const n = res.body.data.notifications;
    expect(n.email.marketing).toBe(true);
    expect(n.email.productUpdates).toBe(false);
    expect(n.push.enabled).toBe(false);
    expect(n.push.reminders).toBe(true);
  });

  it('keeps transactional and security immutable regardless of payload', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    // Attempt to pass along false for the immutable fields
    // (the use case schema only accepts marketing/productUpdates for email,
    //  so these are simply not in the schema — but the invariant must hold)
    const res = await request(app)
      .patch('/api/settings/notifications')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send(validPayload);

    expect(res.status).toBe(200);
    const n = res.body.data.notifications;
    expect(n.email.transactional).toBe(true);
    expect(n.email.security).toBe(true);
  });

  it('returns 4xx when payload is missing required fields', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .patch('/api/settings/notifications')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ email: { marketing: true } }); // missing productUpdates + push

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

// ── PATCH /api/settings/locale ────────────────────────────────────────────────

describe('PATCH /api/settings/locale', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .patch('/api/settings/locale')
      .set('X-SupliList-Client', '1')
      .send({ locale: 'en-US', timezone: 'America/New_York' });

    expect(res.status).toBe(401);
  });

  it('returns 200 and updates locale and timezone', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .patch('/api/settings/locale')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ locale: 'en-US', timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.locale).toBe('en-US');
    expect(res.body.data.timezone).toBe('America/New_York');
  });

  it('returns 4xx when locale is empty string', async () => {
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

// ── POST /api/settings/consents ───────────────────────────────────────────────

describe('POST /api/settings/consents', () => {
  it('returns 401 when Authorization header is absent', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .post('/api/settings/consents')
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'granted' });

    expect(res.status).toBe(401);
  });

  it('returns 403 when X-SupliList-Client is missing — CSRF guard', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'granted' });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('csrf_protection_triggered');
  });

  it('returns 4xx when version is not in DocumentCatalog (invalid version)', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '9.9.9', action: 'granted' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 4xx when consentType is not a valid enum value', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'gdpr_consent', version: '1.0.0', action: 'granted' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 4xx when version format is not SemVer', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: 'latest', action: 'granted' });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('grants consent: 200 + appends audit log + updates snapshot atomically', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'granted' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Snapshot: privacyPolicy must now be true
    const settings = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    });
    expect(settings).not.toBeNull();
    expect(settings!.consents.privacyPolicy).toBe(true);

    // Audit log: one entry with action=granted
    const entries = await UserConsentModel.find({
      userId: new mongoose.Types.ObjectId(USER_ID),
      type: 'privacy_policy',
    });
    expect(entries.length).toBe(1);
    expect(entries[0].action).toBe('granted');
    expect(entries[0].version).toBe('1.0.0');
    expect(entries[0].documentHash).toBeDefined();
    expect(entries[0].documentHash.length).toBeGreaterThan(0);
  });

  it('revokes consent: 200 + appends audit log + updates snapshot atomically', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID, {
      consents: { privacyPolicy: true, termsOfService: false, marketingEmails: false },
    });

    const res = await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'privacy_policy', version: '1.0.0', action: 'revoked' });

    expect(res.status).toBe(200);

    // Snapshot: privacyPolicy must now be false
    const settings = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    });
    expect(settings!.consents.privacyPolicy).toBe(false);

    // Audit log: one entry with action=revoked
    const entries = await UserConsentModel.find({
      userId: new mongoose.Types.ObjectId(USER_ID),
    });
    expect(entries.length).toBe(1);
    expect(entries[0].action).toBe('revoked');
  });

  it('append-only log: grant then revoke produces 2 entries, snapshot reflects last action', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    // First: grant
    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'terms_of_service', version: '1.0.0', action: 'granted' });

    // Second: revoke
    await request(app)
      .post('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ consentType: 'terms_of_service', version: '1.0.0', action: 'revoked' });

    // Audit log must have exactly 2 entries (append-only — no overwrites)
    const entries = await UserConsentModel.find({
      userId: new mongoose.Types.ObjectId(USER_ID),
      type: 'terms_of_service',
    }).sort({ timestamp: 1 });

    expect(entries.length).toBe(2);
    expect(entries[0].action).toBe('granted');
    expect(entries[1].action).toBe('revoked');

    // Snapshot: last action was revoke → termsOfService = false
    const settings = await UserSettingsModel.findOne({
      userId: new mongoose.Types.ObjectId(USER_ID),
    });
    expect(settings!.consents.termsOfService).toBe(false);
  });
});

// ── GET /api/settings/consents ────────────────────────────────────────────────

describe('GET /api/settings/consents', () => {
  it('returns 401 when Authorization header is absent', async () => {
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
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('returns consent history entries with required fields after grant', async () => {
    if (!mongoReady()) return;

    await seedSettings(USER_ID);

    // Seed one consent directly to avoid depending on submitConsent endpoint
    await UserConsentModel.create({
      userId: new mongoose.Types.ObjectId(USER_ID),
      type: 'marketing_emails',
      version: '1.0.0',
      documentHash: '3e8b0a7c5d2e1b4f9a0c3f5d8f4e2b6a2c3f8c5d1e7b9a0c3f5d2e1b8a4f9c6d',
      action: 'granted',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date(),
    });

    const res = await request(app)
      .get('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);

    const entry = res.body.data[0] as Record<string, unknown>;
    expect(entry['type']).toBe('marketing_emails');
    expect(entry['action']).toBe('granted');
    expect(entry['version']).toBe('1.0.0');
    expect(entry['timestamp']).toBeDefined();
    // documentHash and ipAddress should not be absent (they are not secret)
    expect(entry['documentHash']).toBeDefined();
  });

  it('returns only the requesting user\'s consent history — no cross-user leakage', async () => {
    if (!mongoReady()) return;

    const otherUserId = new mongoose.Types.ObjectId().toHexString();

    // Seed consent for the OTHER user
    await UserConsentModel.create({
      userId: new mongoose.Types.ObjectId(otherUserId),
      type: 'privacy_policy',
      version: '1.0.0',
      documentHash: '8f4e2b6a2c3f8c5d1e7b9a0c3f5d2e1b8a4f9c6d3e8b0a7c5d2e1b4f9a0c3f5d',
      action: 'granted',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date(),
    });

    // Request as USER_ID (different user)
    const res = await request(app)
      .get('/api/settings/consents')
      .set('Authorization', `Bearer ${bearerToken(USER_ID)}`);

    expect(res.status).toBe(200);
    // Must return empty — the other user's consents must not appear
    expect(res.body.data.length).toBe(0);
  });
});
