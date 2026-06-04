import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../../../../app.js';
import { StackItemModel } from '../../infrastructure/mongoose/stack-item.model.js';

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

describe('PUT /api/stack/bulk', () => {
  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app)
      .put('/api/stack/bulk')
      .set('X-SupliList-Client', '1')
      .send([]);
    expect(res.status).toBe(401);
  });

  it('returns 403 when X-SupliList-Client header is missing', async () => {
    const res = await request(app)
      .put('/api/stack/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .send([]);
    expect(res.status).toBe(403);
  });

  it('performs bulk upsert successfully', async () => {
    if (!mongoReady()) return;

    const payload = [
      {
        supplementId: 'creatine-123',
        name: 'Creatine Monohydrate',
        dosage: {
          amount: 5,
          unit: 'g',
          frequency: 'daily',
          times: 1,
        },
      },
      {
        supplementId: 'whey-456',
        name: 'Whey Protein',
        dosage: {
          amount: 30,
          unit: 'g',
          frequency: 'post-workout',
          times: 1,
        },
      },
    ];

    const res = await request(app)
      .put('/api/stack/bulk')
      .set('Authorization', `Bearer ${bearerToken(VALID_USER_ID)}`)
      .set('X-SupliList-Client', '1')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.upserted).toBe(2);
    expect(res.body.data.modified).toBe(0);

    const saved = await StackItemModel.find({ userId: new mongoose.Types.ObjectId(VALID_USER_ID) });
    expect(saved).toHaveLength(2);
    expect(saved.some(i => i.supplementId === 'creatine-123')).toBe(true);
    expect(saved.some(i => i.supplementId === 'whey-456')).toBe(true);
  });
});
