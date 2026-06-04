import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../../../app.js';
import { CheckinModel } from '../../infrastructure/mongoose/checkin.model.js';

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

describe('POST /api/checkin/bulk', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app)
      .post('/api/checkin/bulk')
      .set('X-SupliList-Client', '1')
      .send({ entries: [] });
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-SupliList-Client header is missing', async () => {
    const res = await request(app)
      .post('/api/checkin/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .send({ entries: [] });
    expect(res.status).toBe(403);
  });

  it('performs bulk insert ignore successfully', async () => {
    if (!mongoReady()) return;

    // Seed one checkin with clientId first
    await CheckinModel.create({
      userId: new mongoose.Types.ObjectId(VALID_USER_ID),
      clientId: 'chk_existing_123',
      supplementId: 'creatine',
      date: '2026-06-03',
      timestamp: Date.now(),
    });

    const payload = {
      entries: [
        {
          clientId: 'chk_existing_123', // duplicate
          supplementId: 'creatine',
          date: '2026-06-03',
          timestamp: Date.now(),
        },
        {
          clientId: 'chk_new_456', // new
          supplementId: 'whey',
          date: '2026-06-03',
          timestamp: Date.now(),
          note: 'Post workout whey',
        },
      ],
    };

    const res = await request(app)
      .post('/api/checkin/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.inserted).toBe(1);
    expect(res.body.data.duplicates).toBe(1);
    expect(res.body.data.total).toBe(2);

    const saved = await CheckinModel.find({ userId: new mongoose.Types.ObjectId(VALID_USER_ID) });
    expect(saved).toHaveLength(2);
    expect(saved.some(c => c.clientId === 'chk_existing_123')).toBe(true);
    expect(saved.some(c => c.clientId === 'chk_new_456')).toBe(true);
  });
});
