import { db } from '../database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/app-error';

interface PointTransaction {
  userId: string;
  points: number;
  reason: string;
  metadata?: Record<string, any>;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  points: number;
  achievementCount: number;
}

class GamificationService {
  /**
   * Add points to a user
   */
  async addPoints(transaction: PointTransaction): Promise<{
    newBalance: number;
    transactionId: string;
  }> {
    try {
      const result = await db.query(
        `SELECT * FROM add_user_points($1, $2, $3)`,
        [transaction.userId, transaction.points, transaction.reason]
      );

      logger.info('Points added to user', {
        userId: transaction.userId,
        points: transaction.points,
        reason: transaction.reason,
      });

      return {
        newBalance: result.rows[0].new_balance,
        transactionId: result.rows[0].transaction_id,
      };
    } catch (error) {
      logger.error('Error adding points', { error });
      throw error;
    }
  }

  /**
   * Get user's points balance
   */
  async getPointsBalance(userId: string): Promise<{
    currentBalance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
  }> {
    try {
      const result = await db.query(
        `SELECT current_balance, lifetime_earned, lifetime_spent
         FROM user_points WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        // Create initial record if doesn't exist
        await db.query(
          `INSERT INTO user_points (user_id, current_balance, lifetime_earned)
           VALUES ($1, 0, 0)`,
          [userId]
        );

        return {
          currentBalance: 0,
          lifetimeEarned: 0,
          lifetimeSpent: 0,
        };
      }

      const row = result.rows[0];
      return {
        currentBalance: row.current_balance,
        lifetimeEarned: row.lifetime_earned,
        lifetimeSpent: row.lifetime_spent,
      };
    } catch (error) {
      logger.error('Error getting points balance', { error });
      throw error;
    }
  }

  /**
   * Get point transaction history
   */
  async getPointHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT id, user_id, points, reason, metadata, created_at
         FROM point_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting point history', { error });
      throw error;
    }
  }

  /**
   * Get global leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const result = await db.query(
        `SELECT rank, user_id, name, points, achievement_count
         FROM user_leaderboard
         LIMIT $1`,
        [limit]
      );

      return result.rows.map((row) => ({
        rank: row.rank,
        userId: row.user_id,
        name: row.name,
        points: row.points,
        achievementCount: row.achievement_count,
      }));
    } catch (error) {
      logger.error('Error getting leaderboard', { error });
      throw error;
    }
  }

  /**
   * Get user's rank on leaderboard
   */
  async getUserRank(userId: string): Promise<{ rank: number; points: number } | null> {
    try {
      const result = await db.query(
        `SELECT rank, points FROM user_leaderboard WHERE user_id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        rank: result.rows[0].rank,
        points: result.rows[0].points,
      };
    } catch (error) {
      logger.error('Error getting user rank', { error });
      return null;
    }
  }

  /**
   * Award points for common actions
   */
  async awardActionPoints(userId: string, action: string): Promise<void> {
    const pointMap: Record<string, { points: number; reason: string }> = {
      review_created: { points: 10, reason: 'Created product review' },
      review_helpful: { points: 5, reason: 'Review marked helpful' },
      list_created: { points: 15, reason: 'Created shopping list' },
      list_shared: { points: 20, reason: 'Shared list with user' },
      price_alert_created: { points: 5, reason: 'Created price alert' },
      recommendation_clicked: { points: 2, reason: 'Clicked recommendation' },
      purchase_tracked: { points: 25, reason: 'Made purchase' },
      daily_login: { points: 1, reason: 'Daily login bonus' },
    };

    const actionPoints = pointMap[action];
    if (!actionPoints) {
      logger.warn('Unknown action for points', { action });
      return;
    }

    try {
      await this.addPoints({
        userId,
        points: actionPoints.points,
        reason: actionPoints.reason,
      });
    } catch (error) {
      logger.error('Error awarding action points', { error, action });
    }
  }

  /**
   * Redeem points for a reward
   */
  async redeemReward(userId: string, rewardId: string): Promise<{
    redemptionId: string;
    pointsSpent: number;
  }> {
    try {
      // Get reward details
      const rewardResult = await db.query(
        `SELECT points_cost, quantity_available, quantity_claimed
         FROM rewards WHERE id = $1 AND is_active = true`,
        [rewardId]
      );

      if (rewardResult.rows.length === 0) {
        throw new AppError('Reward not found', 404);
      }

      const reward = rewardResult.rows[0];

      // Check quantity
      if (
        reward.quantity_available &&
        reward.quantity_claimed >= reward.quantity_available
      ) {
        throw new AppError('Reward out of stock', 409);
      }

      // Check user points
      const balance = await this.getPointsBalance(userId);
      if (balance.currentBalance < reward.points_cost) {
        throw new AppError('Insufficient points', 400);
      }

      // Create redemption
      const result = await db.query(
        `INSERT INTO reward_redemptions (user_id, reward_id, points_spent, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '30 days')
         RETURNING id, points_spent`,
        [userId, rewardId, reward.points_cost]
      );

      // Deduct points
      await this.addPoints({
        userId,
        points: -reward.points_cost,
        reason: `Redeemed reward: ${rewardId}`,
        metadata: { rewardId },
      });

      // Update reward quantity
      await db.query(
        `UPDATE rewards SET quantity_claimed = quantity_claimed + 1 WHERE id = $1`,
        [rewardId]
      );

      logger.info('Reward redeemed', {
        userId,
        rewardId,
        pointsSpent: reward.points_cost,
      });

      return {
        redemptionId: result.rows[0].id,
        pointsSpent: result.rows[0].points_spent,
      };
    } catch (error) {
      logger.error('Error redeeming reward', { error });
      throw error;
    }
  }

  /**
   * Get available rewards for user
   */
  async getAvailableRewards(userId: string): Promise<any[]> {
    try {
      const balance = await this.getPointsBalance(userId);

      const result = await db.query(
        `SELECT
          r.id,
          r.code,
          r.name,
          r.description,
          r.points_cost,
          r.reward_type,
          r.quantity_available,
          r.quantity_claimed,
          ($1 >= r.points_cost) as can_afford,
          (r.quantity_available IS NULL OR (r.quantity_available - r.quantity_claimed) > 0) as is_available
         FROM rewards r
         WHERE r.is_active = true
         AND (r.expires_at IS NULL OR r.expires_at > NOW())
         ORDER BY r.points_cost`,
        [balance.currentBalance]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting available rewards', { error });
      throw error;
    }
  }

  /**
   * Get user's redeemed rewards
   */
  async getRedeemedRewards(userId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT
          rr.id,
          rr.reward_id,
          r.code,
          r.name,
          rr.points_spent,
          rr.status,
          rr.redeemed_at,
          rr.expires_at
         FROM reward_redemptions rr
         JOIN rewards r ON r.id = rr.reward_id
         WHERE rr.user_id = $1
         ORDER BY rr.redeemed_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting redeemed rewards', { error });
      throw error;
    }
  }
}

export const gamificationService = new GamificationService();
