import { ITokenBlocklist } from '../../application/security/token-blocklist.interface.js';
import { redisClient } from '../redis/redis.client.js';

export class RedisTokenBlocklist implements ITokenBlocklist {
  async block(jti: string, ttlSeconds: number): Promise<boolean> {
    // Callers compute ttlSeconds as pure integer arithmetic (no Date objects).
    // Redis EX expects a whole-number count of seconds; Math.floor guards against
    // any floating-point residue a caller may pass.
    const ttl = Math.max(0, Math.floor(ttlSeconds));
    if (ttl <= 0) return true;

    // Atomic SET NX EX: sets the key only if it does not already exist.
    // Returns 'OK' on first write, null on duplicate — prevents TOCTOU races.
    const result = await redisClient.set(`jwt:blocklist:${jti}`, '1', 'EX', ttl, 'NX');
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
    // TTL de 5min: sessões revogadas são detectadas em no máximo 5min, reduzindo janela de ataque
    const SESSION_CACHE_TTL_SECONDS = 5 * 60;
    await redisClient.set(`user:validAfter:${userId}`, epochMs.toString(), 'EX', SESSION_CACHE_TTL_SECONDS);
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
