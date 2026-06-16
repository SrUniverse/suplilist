/**
 * Password Reset Integration Tests
 *
 * Tests the complete password reset flow:
 * 1. Forgot password request — generates reset token
 * 2. Reset password with valid token — updates password hash
 * 3. Error scenarios — invalid/expired tokens, malformed input
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { createApp } from '../../../../app.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';

const app = createApp();
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-jwt-secret';

function mongoReady(): boolean {
  return mongoose.connection.readyState === 1;
}

const uid = () => `user-${Math.random().toString(36).slice(2)}@test.com`;

async function seedUser(email: string, password: string) {
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
  });
}

describe('Password Reset Flow', () => {
  let email: string;
  const newPassword = 'NewSecurePass123!';

  beforeEach(async () => {
    if (!mongoReady()) return;
    email = uid();
    await seedUser(email, 'OldPassword123!');
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns 200 and sends reset email on valid request', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-SupliList-Client', '1')
        .send({ email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset');
    });

    it('returns 200 even for non-existent email (security: no user enumeration)', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-SupliList-Client', '1')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Email doesn't leak existence
    });

    it('returns 400 for invalid email format', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .set('X-SupliList-Client', '1')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('returns 403 when X-SupliList-Client header is missing', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('resets password with valid reset token', async () => {
      if (!mongoReady()) return;

      // Generate a valid reset token (expires in 1 hour)
      const resetToken = jwt.sign(
        { email, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email,
          resetToken,
          newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify password was actually updated in DB
      const user = await UserIdentityModel.findOne({ email });
      expect(user).not.toBeNull();

      const isNewPasswordCorrect = await bcrypt.compare(
        newPassword,
        user!.passwordHash
      );
      expect(isNewPasswordCorrect).toBe(true);

      const isOldPasswordCorrect = await bcrypt.compare(
        'OldPassword123!',
        user!.passwordHash
      );
      expect(isOldPasswordCorrect).toBe(false);
    });

    it('returns 401 with expired reset token', async () => {
      if (!mongoReady()) return;

      // Generate an expired reset token (expired 1 second ago)
      const expiredToken = jwt.sign(
        { email, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email,
          resetToken: expiredToken,
          newPassword,
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('expired');

      // Verify password was NOT changed
      const user = await UserIdentityModel.findOne({ email });
      const isOldPasswordStillCorrect = await bcrypt.compare(
        'OldPassword123!',
        user!.passwordHash
      );
      expect(isOldPasswordStillCorrect).toBe(true);
    });

    it('returns 400 with invalid/malformed reset token', async () => {
      if (!mongoReady()) return;

      const res = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email,
          resetToken: 'not-a-valid-jwt-token',
          newPassword,
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when new password is too short', async () => {
      if (!mongoReady()) return;

      const resetToken = jwt.sign(
        { email, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email,
          resetToken,
          newPassword: 'short',
        });

      expect(res.status).toBe(400);
    });

    it('returns 401 when email in token does not match user in DB', async () => {
      if (!mongoReady()) return;

      const resetToken = jwt.sign(
        { email: 'different@example.com', type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email: 'different@example.com',
          resetToken,
          newPassword,
        });

      expect(res.status).toBeGreaterThanOrEqual(401);
    });

    it('blocks password reset for suspended accounts', async () => {
      if (!mongoReady()) return;

      const suspendedEmail = uid();
      await seedUser(suspendedEmail, 'OldPassword123!');
      await UserIdentityModel.updateOne(
        { email: suspendedEmail },
        { status: 'suspended', suspendedAt: new Date() }
      );

      const resetToken = jwt.sign(
        { email: suspendedEmail, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email: suspendedEmail,
          resetToken,
          newPassword,
        });

      expect(res.status).toBeGreaterThanOrEqual(403);
    });

    it('can login with new password immediately after reset', async () => {
      if (!mongoReady()) return;

      const resetToken = jwt.sign(
        { email, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Reset password
      await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email,
          resetToken,
          newPassword,
        });

      // Now login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-SupliList-Client', '1')
        .send({ email, password: newPassword });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();
    });
  });

  describe('Multi-request Reset Attempt (Security)', () => {
    it('invalidates reset token after first use (prevents token replay)', async () => {
      if (!mongoReady()) return;

      const resetToken = jwt.sign(
        { email, type: 'password_reset' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // First reset — succeeds
      const first = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email,
          resetToken,
          newPassword: 'FirstNewPass123!',
        });

      expect(first.status).toBe(200);

      // Second reset with same token — should fail
      const second = await request(app)
        .post('/api/auth/reset-password')
        .set('X-SupliList-Client', '1')
        .send({
          email,
          resetToken,
          newPassword: 'SecondNewPass456!',
        });

      expect(second.status).toBeGreaterThanOrEqual(401);

      // Verify only first password works
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('X-SupliList-Client', '1')
        .send({ email, password: 'FirstNewPass123!' });

      expect(loginRes.status).toBe(200);
    });
  });
});
