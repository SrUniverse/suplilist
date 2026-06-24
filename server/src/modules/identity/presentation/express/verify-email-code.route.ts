import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { requireAuth } from '../../../../shared/middleware/auth.middleware.js';
import { UserIdentityModel } from '../../infrastructure/mongoose/user-identity.model.js';
import { redisClient } from '../../../../shared/infrastructure/redis/redis.client.js';
import { ResendEmailProvider } from '../../../../shared/infrastructure/email/resend.provider.js';
import { IdentityEmailService } from '../../application/services/identity-email.service.js';
import { logger } from '../../../../shared/utils/logger.js';

const router = Router();
const emailService = new IdentityEmailService(new ResendEmailProvider());

const OTP_TTL_SECONDS = 15 * 60;       // 15 min
const RATE_LIMIT_TTL_SECONDS = 60;     // 60 s entre reenvios

/**
 * POST /api/auth/send-verification-code
 * Gera e envia um código OTP de 6 dígitos para o e-mail do usuário logado.
 * Rate-limitado a um envio por minuto via Redis.
 */
router.post(
  '/send-verification-code',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const { email, email_verified } = req.firebaseUser;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'no_email',
          message: 'Conta sem endereço de e-mail.',
        });
      }

      if (email_verified) {
        return res.status(400).json({
          success: false,
          error: 'already_verified',
          message: 'E-mail já verificado.',
        });
      }

      // Rate limit: 1 envio por minuto
      const rateLimitKey = `otp:rate-limit:${email}`;
      const recentAttempt = await redisClient.get(rateLimitKey).catch(() => null);
      if (recentAttempt) {
        return res.status(429).json({
          success: false,
          error: 'too_many_requests',
          message: 'Aguarde 60 segundos antes de solicitar um novo código.',
        });
      }

      const code = crypto.randomInt(100000, 999999).toString();

      await redisClient.set(`otp:email:${email}`, code, 'EX', OTP_TTL_SECONDS);
      await redisClient.set(rateLimitKey, '1', 'EX', RATE_LIMIT_TTL_SECONDS);

      // Disparo assíncrono — não bloqueia a resposta
      emailService.sendVerificationEmail(email, code).catch((err) =>
        logger.error('[VerifyEmailCode] Falha ao enviar e-mail OTP:', err),
      );

      return res.json({ success: true, message: 'Código enviado para seu e-mail.' });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/verify-email-code
 * Valida o OTP informado pelo usuário, marca o e-mail como verificado
 * no Firebase Admin e no MongoDB.
 */
router.post(
  '/verify-email-code',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ success: false, error: 'unauthenticated' });
      }

      const { uid, email } = req.firebaseUser;
      const { code } = req.body;

      if (!email) {
        return res.status(400).json({ success: false, error: 'no_email' });
      }

      if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          success: false,
          error: 'invalid_code',
          message: 'Informe o código de 6 dígitos.',
        });
      }

      const redisKey = `otp:email:${email}`;
      const storedCode = await redisClient.get(redisKey).catch(() => null);

      if (!storedCode) {
        return res.status(400).json({
          success: false,
          error: 'otp_expired',
          message: 'Código expirado ou não encontrado. Solicite um novo.',
        });
      }

      if (storedCode !== code) {
        return res.status(401).json({
          success: false,
          error: 'invalid_code',
          message: 'Código incorreto. Tente novamente.',
        });
      }

      // Código correto — apaga para evitar replay
      await redisClient.del(redisKey).catch(() => {});

      // Marca como verificado no Firebase Admin
      await getAuth().updateUser(uid, { emailVerified: true });

      // Atualiza MongoDB (resiliente — não critica se não encontrar)
      await UserIdentityModel.updateOne(
        { email },
        {
          $set: {
            emailVerified: true,
            emailVerifiedAt: new Date(),
            status: 'active',
          },
        },
      ).catch((err) =>
        logger.error('[VerifyEmailCode] Falha ao atualizar MongoDB:', err),
      );

      return res.json({ success: true, message: 'E-mail verificado com sucesso!' });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
