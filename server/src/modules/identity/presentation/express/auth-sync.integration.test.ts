/**
 * Auth Sync Integration Tests
 *
 * Exercita o ciclo de backend de cadastro/login que o frontend dispara após
 * autenticar no Firebase: POST /api/auth/sync com um ID token válido cria (ou
 * vincula) o UserIdentity + Profile no Mongo e retorna o DTO de sessão.
 *
 * O Firebase Admin (getAuth().verifyIdToken) é mockado — o que validamos aqui é
 * a LÓGICA da rota (transação, criação idempotente, mapeamento de provider e
 * status), não a verificação criptográfica do token (responsabilidade do SDK).
 *
 * Mongo: MongoMemoryReplSet (global-setup) — suporta a transação da rota.
 * Redis/rate-limit: mockados em setup.ts (InMemoryRedis + no-op store).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';

// Mock do Firebase Admin Auth: requireAuth chama getAuth().verifyIdToken(token, true).
// Um holder mutável deixa cada teste definir o token decodificado retornado.
const verifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

import { createApp } from '../../../../app.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';
import { ProfileModel } from '../../../profile/infrastructure/mongoose/profile.model.js';

const app = createApp();

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

const randomUid = () => `fb-uid-${Math.random().toString(36).slice(2)}`;

/** Define o ID token decodificado que o requireAuth "verá" na próxima chamada. */
function asFirebaseUser(opts: {
  uid: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
  signInProvider?: string;
}) {
  verifyIdToken.mockResolvedValue({
    uid: opts.uid,
    email: opts.email,
    name: opts.name,
    email_verified: opts.emailVerified ?? false,
    picture: undefined,
    firebase: { sign_in_provider: opts.signInProvider ?? 'password' },
  });
}

describe('POST /api/auth/sync', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('cria UserIdentity + Profile para um novo usuário e retorna o DTO de sessão', async () => {
    if (!mongoReady()) return;

    const uid = randomUid();
    const email = `${uid}@test.com`;
    asFirebaseUser({ uid, email, name: 'Ana Paula', emailVerified: false });

    const res = await request(app)
      .post('/api/auth/sync').set('X-SupliList-Client', '1')
      .set('Authorization', 'Bearer fake-id-token')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      email,
      role: 'user',
      emailVerified: false,
      status: 'pending_verification', // e-mail/senha não verificado
    });
    expect(res.body.data.userId).toBeTruthy();

    // Persistência real no Mongo
    const identity = await UserIdentityModel.findOne({ email });
    expect(identity).not.toBeNull();
    expect(identity!.providers.some(p => p.provider === 'password' && p.providerId === uid)).toBe(true);

    const profile = await ProfileModel.findOne({ userId: res.body.data.userId });
    expect(profile).not.toBeNull();
    expect(profile!.displayName).toBe('Ana Paula');
    expect(profile!.firstName).toBe('Ana');
  });

  it('é idempotente: sincronizar duas vezes o mesmo usuário não duplica conta nem perfil', async () => {
    if (!mongoReady()) return;

    const uid = randomUid();
    const email = `${uid}@test.com`;
    asFirebaseUser({ uid, email, name: 'Bruno', emailVerified: false });

    const first = await request(app).post('/api/auth/sync').set('X-SupliList-Client', '1').set('Authorization', 'Bearer t').send({});
    expect(first.status).toBe(200);

    asFirebaseUser({ uid, email, name: 'Bruno', emailVerified: false });
    const second = await request(app).post('/api/auth/sync').set('X-SupliList-Client', '1').set('Authorization', 'Bearer t').send({});
    expect(second.status).toBe(200);
    expect(second.body.data.userId).toBe(first.body.data.userId);

    expect(await UserIdentityModel.countDocuments({ email })).toBe(1);
    expect(await ProfileModel.countDocuments({ userId: first.body.data.userId })).toBe(1);
  });

  it('provider Google com e-mail verificado entra como conta ativa e verificada', async () => {
    if (!mongoReady()) return;

    const uid = randomUid();
    const email = `${uid}@gmail.com`;
    asFirebaseUser({ uid, email, name: 'Carla', emailVerified: true, signInProvider: 'google.com' });

    const res = await request(app).post('/api/auth/sync').set('X-SupliList-Client', '1').set('Authorization', 'Bearer t').send({});

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email, emailVerified: true, status: 'active' });

    const identity = await UserIdentityModel.findOne({ email });
    expect(identity!.providers.some(p => p.provider === 'google' && p.providerId === uid)).toBe(true);
  });

  it('sem token de autenticação retorna 401', async () => {
    if (!mongoReady()) return;

    const res = await request(app).post('/api/auth/sync').set('X-SupliList-Client', '1').send({});
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
