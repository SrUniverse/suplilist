import rateLimit from 'express-rate-limit';
import { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../infrastructure/redis/redis.client.js';
import crypto from 'crypto';
import { Request } from 'express';

function makeRedisStore(prefix: string) {
  return new RedisStore({
    prefix,
    // @ts-ignore
    sendCommand: (...args: string[]) => redisClient.call(args[0], ...args.slice(1)),
  });
}

function ipKey(req: Request): string {
  const raw =
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    'unknown-ip';
  return ipKeyGenerator(raw);
}

/**
 * Limitador por IP: Máximo de 20 tentativas de login/auth por IP a cada 15 minutos.
 */
export const ipAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:ip-auth:'),
  keyGenerator: ipKey,
  message: {
    success: false,
    error: 'too_many_requests_from_ip',
    message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
  },
});

/**
 * Limitador por Conta: Máximo de 5 tentativas por e-mail a cada 15 minutos.
 */
export const emailAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:email-auth:'),
  keyGenerator: (req: Request) => {
    const email = req.body?.email
      ? String(req.body.email).toLowerCase().trim()
      : 'anonymous';
    return crypto.createHash('sha256').update(email).digest('hex');
  },
  message: {
    success: false,
    error: 'too_many_attempts_on_account',
    message: 'Too many authentication attempts on this account. Please try again in 15 minutes.',
  },
});

/**
 * Limitador IP de Mensageria: Máximo de 3 tentativas por IP a cada 1 hora.
 */
export const messagingIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:msg-ip:'),
  keyGenerator: ipKey,
  message: {
    success: false,
    error: 'too_many_messaging_requests_from_ip',
    message: 'Muitas solicitações a partir desta rede. Tente novamente em uma hora.',
  },
});

/**
 * Limitador de Conta de Mensageria: Máximo de 3 tentativas por e-mail a cada 1 hora.
 */
export const messagingEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:msg-email:'),
  keyGenerator: (req: Request) => {
    const email = req.body?.email
      ? String(req.body.email).toLowerCase().trim()
      : 'anonymous';
    return crypto.createHash('sha256').update(email).digest('hex');
  },
  message: {
    success: false,
    error: 'too_many_messaging_attempts_on_account',
    message: 'Muitas solicitações para este endereço. Tente novamente em uma hora.',
  },
});

/**
 * Limitador para rotas de Autenticação Geral (MFA, Google): 30 tentativas / 15 min.
 */
export const authApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore('rl:api:'),
  keyGenerator: ipKey,
  message: {
    success: false,
    error: 'too_many_requests',
    message: 'Too many requests. Please try again later.',
  },
});
