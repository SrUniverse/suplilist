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
    // Old implementation replaced by deleteSessionsValidAfterCache in Use Cases.
    // Kept here so interfaces don't break until we finish refactoring.
  }

  async isUserInvalidated(userId: string): Promise<boolean> {
    return false;
  }

  async setSessionsValidAfterCache(userId: string, epochMs: number): Promise<void> {
    // TTL de 24h para o negative cache / epoch cache
    await redisClient.set(`user:validAfter:${userId}`, epochMs.toString(), 'EX', 24 * 60 * 60);
  }

  async getSessionsValidAfterCache(userId: string): Promise<number | null> {
    const val = await redisClient.get(`user:validAfter:${userId}`);
    if (val === null) return null;
    return parseInt(val, 10);
  }

  async deleteSessionsValidAfterCache(userId: string): Promise<void> {
    await redisClient.del(`user:validAfter:${userId}`);
  }
}
export default RedisTokenBlocklist;
