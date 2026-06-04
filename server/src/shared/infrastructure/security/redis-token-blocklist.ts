import { ITokenBlocklist } from '../../application/security/token-blocklist.interface.js';
import { redisClient } from '../redis/redis.client.js';

export class RedisTokenBlocklist implements ITokenBlocklist {
  async block(jti: string, expiresAt: Date): Promise<boolean> {
    const ttlSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    if (ttlSeconds <= 0) return true;

    // Use atomic SET with NX (Set if Not eXists) and EX (Expiration in seconds)
    // - Returns 'OK' if the key was set (meaning this thread won the race condition).
    // - Returns null if the key already exists (meaning a concurrent duplicate request is running).
    const result = await redisClient.set(`jwt:blocklist:${jti}`, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  async isBlocked(jti: string): Promise<boolean> {
    const exists = await redisClient.exists(`jwt:blocklist:${jti}`);
    return exists === 1;
  }

  async invalidateUser(userId: string, expiresAt: Date): Promise<void> {
    const ttlSeconds = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
    if (ttlSeconds > 0) {
      await redisClient.set(`user:invalidated:${userId}`, '1', 'EX', ttlSeconds);
    }
  }

  async isUserInvalidated(userId: string): Promise<boolean> {
    const exists = await redisClient.exists(`user:invalidated:${userId}`);
    return exists === 1;
  }
}
export default RedisTokenBlocklist;
