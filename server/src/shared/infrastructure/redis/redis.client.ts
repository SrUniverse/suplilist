import { Redis } from 'ioredis';

// Resolve Redis connection URI (Guaranteed to be present and validated on boot)
const redisUri = process.env.REDIS_URI!;

export const redisClient = new Redis(redisUri, {
  maxRetriesPerRequest: 3,
  connectTimeout: 5000,
});

redisClient.on('error', (err: Error) => {
  console.error('❌ Critical: Shared Redis connection error:', err);
});

export default redisClient;
