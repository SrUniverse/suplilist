import { db } from '../database.js';
import { logger } from '../utils/logger.js';
import { gamificationService } from './gamification.service.js';
import { firebaseService } from './firebase.service.js';

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  pointsReward: number;
  unlockedAt?: Date;
}

class AchievementService {
  /**
   * Check and unlock achievements for a user
   */
  async checkAndUnlockAchievements(userId: string): Promise<Achievement[]> {
    try {
      const result = await db.query(
        `SELECT * FROM check_achievements($1)`,
        [userId]
      );

      const unlockedAchievements: Achievement[] = [];

      for (const row of result.rows) {
        // Get achievement details
        const achievementResult = await db.query(
          `SELECT code, name, description, points_reward FROM achievements WHERE id = $1`,
          [row.achievement_id]
        );

        if (achievementResult.rows.length > 0) {
          const achievement = achievementResult.rows[0];
          unlockedAchievements.push({
            id: row.achievement_id,
            code: achievement.code,
            name: achievement.name,
            description: achievement.description,
            category: 'general',
            pointsReward: achievement.points_reward,
          });

          // Award points for achievement
          await gamificationService.addPoints({
            userId,
            points: achievement.points_reward,
            reason: `Achieved: ${achievement.name}`,
            metadata: { achievementId: row.achievement_id },
          });

          // Send notification
          await this.notifyAchievementUnlock(userId, achievement);
        }
      }

      if (unlockedAchievements.length > 0) {
        logger.info('Achievements unlocked', {
          userId,
          count: unlockedAchievements.length,
          achievements: unlockedAchievements.map((a) => a.code),
        });
      }

      return unlockedAchievements;
    } catch (error) {
      logger.error('Error checking achievements', { error });
      return [];
    }
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(userId: string): Promise<{
    unlocked: Achievement[];
    locked: Achievement[];
    progress: Record<string, any>;
  }> {
    try {
      // Get unlocked achievements
      const unlockedResult = await db.query(
        `SELECT
          a.id,
          a.code,
          a.name,
          a.description,
          a.category,
          a.points_reward,
          ua.unlocked_at
         FROM achievements a
         JOIN user_achievements ua ON ua.achievement_id = a.id
         WHERE ua.user_id = $1
         ORDER BY ua.unlocked_at DESC`,
        [userId]
      );

      // Get locked achievements
      const lockedResult = await db.query(
        `SELECT
          a.id,
          a.code,
          a.name,
          a.description,
          a.category,
          a.points_reward
         FROM achievements a
         WHERE a.id NOT IN (
           SELECT achievement_id FROM user_achievements WHERE user_id = $1
         )
         ORDER BY a.code`,
        [userId]
      );

      const unlockedAchievements: Achievement[] = unlockedResult.rows.map(
        (row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          category: row.category,
          pointsReward: row.points_reward,
          unlockedAt: row.unlocked_at,
        })
      );

      const lockedAchievements: Achievement[] = lockedResult.rows.map(
        (row) => ({
          id: row.id,
          code: row.code,
          name: row.name,
          description: row.description,
          category: row.category,
          pointsReward: row.points_reward,
        })
      );

      // Get progress toward locked achievements
      const progress = await this.getAchievementProgress(userId, lockedAchievements);

      return {
        unlocked: unlockedAchievements,
        locked: lockedAchievements,
        progress,
      };
    } catch (error) {
      logger.error('Error getting user achievements', { error });
      return { unlocked: [], locked: [], progress: {} };
    }
  }

  /**
   * Get progress toward achievements
   */
  private async getAchievementProgress(
    userId: string,
    achievements: Achievement[]
  ): Promise<Record<string, any>> {
    const progress: Record<string, any> = {};

    try {
      // Count various user actions
      const listsResult = await db.query(
        `SELECT COUNT(*) as count FROM wishlists WHERE user_id = $1`,
        [userId]
      );
      const listCount = parseInt(listsResult.rows[0].count);

      const itemsResult = await db.query(
        `SELECT COUNT(*) as count FROM wishlist_items wi
         JOIN wishlists w ON w.id = wi.wishlist_id WHERE w.user_id = $1`,
        [userId]
      );
      const itemCount = parseInt(itemsResult.rows[0].count);

      const priceAlertsResult = await db.query(
        `SELECT COUNT(*) as count FROM user_price_alerts WHERE user_id = $1`,
        [userId]
      );
      const priceAlertCount = parseInt(priceAlertsResult.rows[0].count);

      const reviewsResult = await db.query(
        `SELECT COUNT(*) as count FROM reviews WHERE user_id = $1`,
        [userId]
      );
      const reviewCount = parseInt(reviewsResult.rows[0].count);

      const helpfulResult = await db.query(
        `SELECT COALESCE(SUM(helpful_count), 0) as count FROM reviews WHERE user_id = $1`,
        [userId]
      );
      const helpfulCount = parseInt(helpfulResult.rows[0].count);

      const sharesResult = await db.query(
        `SELECT COUNT(DISTINCT list_id) as count FROM list_shares WHERE shared_by_user_id = $1`,
        [userId]
      );
      const shareCount = parseInt(sharesResult.rows[0].count);

      // Map progress for each achievement
      progress['first_list'] = { current: listCount, target: 1, completed: listCount >= 1 };
      progress['obsessed_shopper'] = { current: itemCount, target: 50, completed: itemCount >= 50 };
      progress['bargain_hunter'] = { current: priceAlertCount, target: 10, completed: priceAlertCount >= 10 };
      progress['community_leader'] = { current: helpfulCount, target: 50, completed: helpfulCount >= 50 };
      progress['recommendation_seeker'] = { current: 0, target: 10, completed: false };
      progress['wishlist_master'] = { current: listCount, target: 5, completed: listCount >= 5 };
      progress['social_butterfly'] = { current: shareCount, target: 10, completed: shareCount >= 10 };

      return progress;
    } catch (error) {
      logger.error('Error getting achievement progress', { error });
      return {};
    }
  }

  /**
   * Notify user of achievement unlock
   */
  private async notifyAchievementUnlock(
    userId: string,
    achievement: any
  ): Promise<void> {
    try {
      // Get user's device tokens
      const tokensResult = await db.query(
        `SELECT device_token FROM firebase_tokens
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      const deviceTokens = tokensResult.rows.map((r) => r.device_token);

      if (deviceTokens.length === 0) {
        return;
      }

      await firebaseService.sendToDevices(deviceTokens, {
        title: 'Achievement Unlocked!',
        body: `You unlocked "${achievement.name}"! +${achievement.points_reward} points`,
        data: {
          type: 'achievement_unlocked',
          achievementCode: achievement.code,
          achievementName: achievement.name,
          pointsReward: achievement.points_reward.toString(),
        },
        priority: 'high',
      });
    } catch (error) {
      logger.error('Error notifying achievement unlock', { error });
    }
  }

  /**
   * Seed default achievements if not present
   */
  async seedDefaultAchievements(): Promise<void> {
    try {
      const achievements = [
        {
          code: 'first_list',
          name: 'First Steps',
          description: 'Create your first shopping list',
          pointsReward: 10,
          category: 'actions',
        },
        {
          code: 'obsessed_shopper',
          name: 'Obsessed Shopper',
          description: 'Add 50 items to your wishlists',
          pointsReward: 50,
          category: 'actions',
        },
        {
          code: 'bargain_hunter',
          name: 'Bargain Hunter',
          description: 'Find 10 products with price drops',
          pointsReward: 50,
          category: 'actions',
        },
        {
          code: 'community_leader',
          name: 'Community Leader',
          description: 'Get 50 helpful votes on your reviews',
          pointsReward: 100,
          category: 'social',
        },
        {
          code: 'recommendation_seeker',
          name: 'Recommendation Seeker',
          description: 'Click on 10 personalized recommendations',
          pointsReward: 25,
          category: 'engagement',
        },
        {
          code: 'wishlist_master',
          name: 'Wishlist Master',
          description: 'Create 5 wishlists',
          pointsReward: 50,
          category: 'actions',
        },
        {
          code: 'social_butterfly',
          name: 'Social Butterfly',
          description: 'Share 10 lists with friends',
          pointsReward: 75,
          category: 'social',
        },
      ];

      for (const achievement of achievements) {
        const result = await db.query(
          `SELECT id FROM achievements WHERE code = $1`,
          [achievement.code]
        );

        if (result.rows.length === 0) {
          await db.query(
            `INSERT INTO achievements (code, name, description, points_reward, category)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              achievement.code,
              achievement.name,
              achievement.description,
              achievement.pointsReward,
              achievement.category,
            ]
          );
        }
      }

      logger.info('Default achievements seeded');
    } catch (error) {
      logger.error('Error seeding default achievements', { error });
    }
  }
}

export const achievementService = new AchievementService();
