import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../../../app.js';
import { FavoriteModel } from '../../infrastructure/mongoose/favorite.model.js';

const app = createApp();

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret-unsafe-change-me';

function bearerToken(userId: string): string {
  return jwt.sign(
    { sub: userId, jti: `test-jti-${Math.random()}`, role: 'user', status: 'active' },
    JWT_SECRET,
    { expiresIn: '15m' },
  );
}

const VALID_USER_ID = new mongoose.Types.ObjectId().toHexString();

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

describe('PUT /api/favorites/bulk', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app)
      .put('/api/favorites/bulk')
      .set('X-SupliList-Client', '1')
      .send({ supplementIds: [] });
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-SupliList-Client header is missing', async () => {
    const res = await request(app)
      .put('/api/favorites/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .send({ supplementIds: [] });
    expect(res.status).toBe(403);
  });

  it('performs bulk set replacement successfully', async () => {
    if (!mongoReady()) return;

    // Seed existing favorites first
    await FavoriteModel.create([
      { userId: new mongoose.Types.ObjectId(VALID_USER_ID), supplementId: 'old-fav-1' },
      { userId: new mongoose.Types.ObjectId(VALID_USER_ID), supplementId: 'old-fav-2' },
    ]);

    const payload = {
      supplementIds: ['new-fav-1', 'new-fav-2', 'new-fav-3'],
    };

    const res = await request(app)
      .put('/api/favorites/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.replaced).toBe(3);

    const saved = await FavoriteModel.find({ userId: new mongoose.Types.ObjectId(VALID_USER_ID) });
    expect(saved).toHaveLength(3);
    expect(saved.some(f => f.supplementId === 'old-fav-1')).toBe(false);
    expect(saved.some(f => f.supplementId === 'new-fav-1')).toBe(true);
  });

  it('returns 4xx when supplementIds is not an array', async () => {
    const res = await request(app)
      .put('/api/favorites/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ supplementIds: 'not-an-array' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('returns 4xx when supplementIds contains non-string values', async () => {
    const res = await request(app)
      .put('/api/favorites/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ supplementIds: [123, null, 'valid-id'] });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('returns 200 with 0 replaced when supplementIds array is empty', async () => {
    if (!mongoReady()) return;

    const res = await request(app)
      .put('/api/favorites/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ supplementIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.replaced).toBe(0);
  });

  it('returns 4xx when supplementIds exceeds maximum length', async () => {
    const tooManyIds = Array.from({ length: 1001 }, (_, i) => `id-${i}`);

    const res = await request(app)
      .put('/api/favorites/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send({ supplementIds: tooManyIds });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
