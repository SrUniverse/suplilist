import { db } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';

interface ReviewData {
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  text?: string;
  verifiedPurchase?: boolean;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  helpfulReviews: number;
  ratingBreakdown: Record<number, number>;
}

class ReviewService {
  /**
   * Add a review for a product
   */
  async addReview(reviewData: ReviewData): Promise<any> {
    try {
      const { productId, userId, rating, title, text, verifiedPurchase } =
        reviewData;

      // Validate rating
      if (rating < 1 || rating > 5) {
        throw new AppError('Rating must be between 1 and 5', 400);
      }

      // Check if user already reviewed this product
      const existingResult = await db.query(
        `SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2`,
        [productId, userId]
      );

      if (existingResult.rows.length > 0) {
        throw new AppError(
          'You have already reviewed this product',
          409
        );
      }

      // Insert review
      const result = await db.query(
        `INSERT INTO reviews
         (product_id, user_id, rating, title, text, verified_purchase)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, product_id, user_id, rating, title, text, created_at`,
        [productId, userId, rating, title || null, text || null, verifiedPurchase || false]
      );

      const review = result.rows[0];

      logger.info('Review added', {
        productId,
        userId,
        rating,
        reviewId: review.id,
      });

      return review;
    } catch (error) {
      logger.error('Error adding review', { error });
      throw error;
    }
  }

  /**
   * Get reviews for a product
   */
  async getProductReviews(
    productId: string,
    limit: number = 20,
    offset: number = 0,
    sortBy: 'helpful' | 'recent' | 'rating' = 'helpful'
  ): Promise<{
    total: number;
    reviews: any[];
  }> {
    try {
      let orderBy = 'helpful_count DESC, created_at DESC';
      if (sortBy === 'recent') {
        orderBy = 'created_at DESC';
      } else if (sortBy === 'rating') {
        orderBy = 'rating DESC';
      }

      const result = await db.query(
        `SELECT
          r.id,
          r.rating,
          r.title,
          r.text,
          r.helpful_count,
          r.unhelpful_count,
          r.verified_purchase,
          r.created_at,
          u.id as user_id,
          u.name as reviewer_name
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.product_id = $1 AND r.deleted_at IS NULL
         ORDER BY ${orderBy}
         LIMIT $2 OFFSET $3`,
        [productId, limit, offset]
      );

      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM reviews
         WHERE product_id = $1 AND deleted_at IS NULL`,
        [productId]
      );

      return {
        total: parseInt(countResult.rows[0].total),
        reviews: result.rows,
      };
    } catch (error) {
      logger.error('Error fetching product reviews', { error });
      throw error;
    }
  }

  /**
   * Mark review as helpful
   */
  async markHelpful(
    reviewId: string,
    userId: string,
    isHelpful: boolean
  ): Promise<void> {
    try {
      // Check if user already voted
      const existingResult = await db.query(
        `SELECT id FROM review_helpfulness
         WHERE review_id = $1 AND user_id = $2`,
        [reviewId, userId]
      );

      if (existingResult.rows.length > 0) {
        // Update existing vote
        await db.query(
          `UPDATE review_helpfulness
           SET is_helpful = $1
           WHERE review_id = $2 AND user_id = $3`,
          [isHelpful, reviewId, userId]
        );
      } else {
        // Insert new vote
        await db.query(
          `INSERT INTO review_helpfulness
           (review_id, user_id, is_helpful)
           VALUES ($1, $2, $3)`,
          [reviewId, userId, isHelpful]
        );
      }

      logger.info('Review helpfulness marked', {
        reviewId,
        userId,
        isHelpful,
      });
    } catch (error) {
      logger.error('Error marking review helpful', { error });
      throw error;
    }
  }

  /**
   * Get review statistics for a product
   */
  async getReviewStats(productId: string): Promise<ReviewStats> {
    try {
      const result = await db.query(
        `SELECT
          COALESCE(ROUND(AVG(rating)::DECIMAL, 2), 0) as avg_rating,
          COUNT(*) as total_reviews,
          COALESCE(SUM(CASE WHEN helpful_count > 0 THEN 1 ELSE 0 END), 0) as helpful_count
         FROM reviews
         WHERE product_id = $1 AND deleted_at IS NULL`,
        [productId]
      );

      const ratingBreakdownResult = await db.query(
        `SELECT rating, COUNT(*) as count
         FROM reviews
         WHERE product_id = $1 AND deleted_at IS NULL
         GROUP BY rating
         ORDER BY rating DESC`,
        [productId]
      );

      const ratingBreakdown: Record<number, number> = {};
      for (let i = 1; i <= 5; i++) {
        ratingBreakdown[i] = 0;
      }

      ratingBreakdownResult.rows.forEach((row) => {
        ratingBreakdown[row.rating] = parseInt(row.count);
      });

      const stats = result.rows[0];

      return {
        averageRating: parseFloat(stats.avg_rating),
        totalReviews: parseInt(stats.total_reviews),
        helpfulReviews: parseInt(stats.helpful_count),
        ratingBreakdown,
      };
    } catch (error) {
      logger.error('Error getting review statistics', { error });
      throw error;
    }
  }

  /**
   * Delete a review (soft delete)
   */
  async deleteReview(reviewId: string, userId: string): Promise<void> {
    try {
      const result = await db.query(
        `UPDATE reviews
         SET deleted_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [reviewId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Review not found', 404);
      }

      logger.info('Review deleted', { reviewId, userId });
    } catch (error) {
      logger.error('Error deleting review', { error });
      throw error;
    }
  }

  /**
   * Update a review
   */
  async updateReview(
    reviewId: string,
    userId: string,
    updates: {
      rating?: number;
      title?: string;
      text?: string;
    }
  ): Promise<any> {
    try {
      const updateFields: string[] = [];
      const values: any[] = [reviewId, userId];
      let paramCount = 2;

      if (updates.rating !== undefined) {
        if (updates.rating < 1 || updates.rating > 5) {
          throw new AppError('Rating must be between 1 and 5', 400);
        }
        updateFields.push(`rating = $${++paramCount}`);
        values.push(updates.rating);
      }

      if (updates.title !== undefined) {
        updateFields.push(`title = $${++paramCount}`);
        values.push(updates.title);
      }

      if (updates.text !== undefined) {
        updateFields.push(`text = $${++paramCount}`);
        values.push(updates.text);
      }

      if (updateFields.length === 0) {
        throw new AppError('No updates provided', 400);
      }

      const result = await db.query(
        `UPDATE reviews
         SET ${updateFields.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING id, product_id, user_id, rating, title, text, created_at`,
        values
      );

      if (result.rows.length === 0) {
        throw new AppError('Review not found', 404);
      }

      logger.info('Review updated', { reviewId, userId });
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating review', { error });
      throw error;
    }
  }

  /**
   * Search reviews by text
   */
  async searchReviews(
    productId: string,
    query: string,
    limit: number = 20
  ): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT
          r.id,
          r.rating,
          r.title,
          r.text,
          r.helpful_count,
          r.created_at,
          u.name as reviewer_name,
          ts_rank(to_tsvector('english', r.text), plainto_tsquery('english', $1)) as rank
         FROM reviews r
         JOIN users u ON u.id = r.user_id
         WHERE r.product_id = $2 AND r.deleted_at IS NULL
         AND to_tsvector('english', r.text) @@ plainto_tsquery('english', $1)
         ORDER BY rank DESC
         LIMIT $3`,
        [query, productId, limit]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error searching reviews', { error });
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
