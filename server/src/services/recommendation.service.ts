import { db } from '../database';
import { logger } from '../utils/logger';

interface RecommendationInput {
  userId: string;
  limit?: number;
}

class RecommendationService {
  /**
   * Get personalized recommendations for a user
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      // Get user preferences
      const prefsResult = await db.query(
        `SELECT preferred_categories, preferred_brands, price_range_min, price_range_max
         FROM user_preferences WHERE user_id = $1`,
        [userId]
      );

      const prefs = prefsResult.rows[0];
      const categories = prefs?.preferred_categories || [];
      const minPrice = prefs?.price_range_min || 0;
      const maxPrice = prefs?.price_range_max || 999999;

      // Get collaborative filtering recommendations (products liked by similar users)
      const collaborativeResult = await db.query(
        `SELECT DISTINCT p.id, p.name, p.price, cs.avg_rating, 'collaborative_filtering' as reason,
                85 as score
         FROM products p
         JOIN reviews r ON r.product_id = p.id
         LEFT JOIN community_stats cs ON cs.product_id = p.id
         WHERE r.user_id IN (
           SELECT DISTINCT r2.user_id
           FROM reviews r2
           WHERE r2.product_id IN (
             SELECT DISTINCT product_id FROM reviews WHERE user_id = $1
           )
           AND r2.user_id != $1
         )
         AND p.id NOT IN (SELECT product_id FROM reviews WHERE user_id = $1)
         AND p.price BETWEEN $2 AND $3
         ORDER BY r.rating DESC
         LIMIT $4`,
        [userId, minPrice, maxPrice, Math.floor(limit / 2)]
      );

      // Get content-based recommendations (similar products)
      let contentBasedResult = { rows: [] };
      if (categories.length > 0) {
        const categoryPlaceholders = categories.map((_, i) => `$${i + 2}`).join(',');
        contentBasedResult = await db.query(
          `SELECT p.id, p.name, p.price, cs.avg_rating, 'content_based' as reason,
                  75 as score
           FROM products p
           LEFT JOIN community_stats cs ON cs.product_id = p.id
           WHERE p.category = ANY($1)
           AND p.id NOT IN (SELECT product_id FROM purchase_history WHERE user_id = $2)
           AND p.id NOT IN (SELECT product_id FROM reviews WHERE user_id = $2)
           AND p.price BETWEEN $3 AND $4
           ORDER BY cs.avg_rating DESC NULLS LAST
           LIMIT $5`,
          [categories, userId, minPrice, maxPrice, Math.floor(limit / 2)]
        );
      }

      // Combine and deduplicate
      const recommendations = [
        ...collaborativeResult.rows,
        ...contentBasedResult.rows,
      ];

      const seen = new Set<string>();
      const unique = recommendations.filter((r) => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      return unique.slice(0, limit);
    } catch (error) {
      logger.error('Error getting personalized recommendations', { error });
      throw error;
    }
  }

  /**
   * Get trending products in user's category
   */
  async getTrendingRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT DISTINCT p.id, p.name, p.price, cs.avg_rating, 'trending' as reason, 80 as score
         FROM products p
         LEFT JOIN community_stats cs ON cs.product_id = p.id
         LEFT JOIN price_history ph ON ph.product_id = p.id
         WHERE ph.drop_percentage > 10
         AND p.id NOT IN (SELECT product_id FROM purchase_history WHERE user_id = $1)
         ORDER BY ph.drop_percentage DESC, cs.review_count DESC NULLS LAST
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting trending recommendations', { error });
      throw error;
    }
  }

  /**
   * Get recommendations from similar users
   */
  async getSimilarUsersRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT DISTINCT p.id, p.name, p.price, cs.avg_rating, 'similar_users' as reason,
                90 as score
         FROM products p
         LEFT JOIN community_stats cs ON cs.product_id = p.id
         WHERE p.id IN (
           SELECT DISTINCT r.product_id
           FROM reviews r
           WHERE r.user_id IN (
             SELECT DISTINCT r2.user_id FROM reviews r2
             WHERE r2.product_id IN (
               SELECT product_id FROM reviews WHERE user_id = $1 AND rating >= 4
             )
             AND r2.rating >= 4
             AND r2.user_id != $1
             LIMIT 10
           )
         )
         AND p.id NOT IN (SELECT product_id FROM purchase_history WHERE user_id = $1)
         ORDER BY cs.avg_rating DESC NULLS LAST
         LIMIT $2`,
        [userId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting similar user recommendations', { error });
      throw error;
    }
  }

  /**
   * Generate and store recommendations for all users
   */
  async generateRecommendationsForAllUsers(): Promise<{
    processed: number;
    created: number;
  }> {
    try {
      let processed = 0;
      let created = 0;

      const usersResult = await db.query(`SELECT id FROM users`);

      for (const user of usersResult.rows) {
        try {
          const recommendations = await this.getPersonalizedRecommendations(
            user.id,
            20
          );

          for (const rec of recommendations) {
            await db.query(
              `INSERT INTO recommendations (user_id, product_id, score, reason)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING`,
              [user.id, rec.id, rec.score, rec.reason]
            );
            created++;
          }

          processed++;
        } catch (error) {
          logger.error('Error generating recommendations for user', {
            userId: user.id,
            error,
          });
        }
      }

      logger.info('Generated recommendations for all users', {
        processed,
        created,
      });

      return { processed, created };
    } catch (error) {
      logger.error('Error generating recommendations', { error });
      throw error;
    }
  }

  /**
   * Track product view for recommendation purposes
   */
  async trackProductView(userId: string, productId: string): Promise<void> {
    try {
      await db.query(
        `INSERT INTO product_views (user_id, product_id, viewed_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id, product_id, DATE(viewed_at)) DO NOTHING`,
        [userId, productId]
      );
    } catch (error) {
      logger.error('Error tracking product view', { error });
    }
  }
}

export const recommendationService = new RecommendationService();
