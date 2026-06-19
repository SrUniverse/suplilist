import { Redis } from 'ioredis';

// Resolve Redis connection URI. Missing config must NOT crash the serverless
// function on cold start — that would take down every /api route (including auth)
// before a single request runs. Rate limiters all use `passOnStoreError: true`,
// so an unreachable Redis degrades gracefully. We only need a syntactically valid
// URL so ioredis can construct the client; a dead localhost target fails fast.
const redisUri = process.env.REDIS_URL ?? process.env.REDIS_URI;
if (!redisUri) {
  console.warn(
    '⚠️  REDIS_URL/REDIS_URI not set — falling back to localhost. ' +
    'Rate limiters will degrade open (passOnStoreError). Set REDIS_URL in production.'
  );
}

const resolvedUri = redisUri ?? 'redis://localhost:6379/0';

// TLS is required for rediss:// (Upstash/Vercel); plain redis:// must not use it.
const useTls = resolvedUri.startsWith('rediss://');

export const redisClient = new Redis(resolvedUri, {
  ...(useTls ? { tls: {} } : {}),
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  // Fail fast when Redis is unreachable: without this, commands queue forever
  // while ioredis reconnects, hanging every request that touches Redis
  // (rate limiters, OTP, blocklist) until the serverless 30s timeout (504).
  enableOfflineQueue: false,
});

redisClient.on('error', (err: Error) => {
  console.error('❌ Critical: Shared Redis connection error:', err);
});

export default redisClient;
