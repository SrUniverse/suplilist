import { Redis } from 'ioredis';

// Resolve Redis connection URI (Guaranteed to be present and validated on boot)
const redisUri = process.env.REDIS_URI!;

export const redisClient = new Redis(redisUri, {
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
