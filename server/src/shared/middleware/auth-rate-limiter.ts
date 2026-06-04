import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../infrastructure/redis/redis.client.js';
import crypto from 'crypto';
import { Request } from 'express';

// Initialize RedisStore for distributed rate limiting (PM2 cluster & multiple instances)
const redisStore = new RedisStore({
  // @ts-ignore
  sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
});

console.log('✅ Redis Store initialized for distributed Rate Limiting.');

/**
 * Limitador por IP: Máximo de 20 tentativas de login/auth por IP a cada 15 minutos.
 * Mitiga scripts automatizados locais de um mesmo host.
 */
export const ipAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req: Request) => {
    return req.ip || 
           (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           'unknown-ip';
  },
  message: {
    success: false,
    error: 'too_many_requests_from_ip',
    message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.'
  }
});

/**
 * Limitador por Conta: Máximo de 5 tentativas por e-mail a cada 15 minutos.
 * Impede força bruta direcionada contra contas específicas, mesmo com IPs rotativos (botnet).
 */
export const emailAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  keyGenerator: (req: Request) => {
    const email = req.body?.email 
      ? String(req.body.email).toLowerCase().trim() 
      : 'anonymous';

    // SHA-256 Hash preserves user privacy in memory/cache limits
    return crypto.createHash('sha256').update(email).digest('hex');
  },
  message: {
    success: false,
    error: 'too_many_attempts_on_account',
    message: 'Too many authentication attempts on this account. Please try again in 15 minutes.'
  }
});
