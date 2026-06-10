import { db } from '../database';
import { logger } from '../utils/logger';
import { AppError } from '../utils/app-error';

interface ComparisonData {
  productIds: string[];
  userId: string;
  notes?: string;
}

class ComparisonService {
  /**
   * Compare multiple products
   */
  async compareProducts(productIds: string[]): Promise<any> {
    try {
      if (productIds.length < 2) {
        throw new AppError('At least 2 products required for comparison', 400);
      }

      // Fetch product data
      const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
      const result = await db.query(
        `SELECT
          p.id,
          p.name,
          p.description,
          p.price,
          p.category,
          p.image_url,
          COALESCE(cs.avg_rating, 0) as avg_rating,
          COALESCE(cs.review_count, 0) as review_count,
          (SELECT current_price FROM price_history WHERE product_id = p.id ORDER BY checked_at DESC LIMIT 1) as current_price,
          (SELECT source FROM price_history WHERE product_id = p.id ORDER BY checked_at DESC LIMIT 1) as price_source
         FROM products p
         LEFT JOIN community_stats cs ON cs.product_id = p.id
         WHERE p.id IN (${placeholders})`,
        productIds
      );

      if (result.rows.length === 0) {
        throw new AppError('Products not found', 404);
      }

      return {
        products: result.rows,
        comparisonData: this.buildComparisonData(result.rows),
      };
    } catch (error) {
      logger.error('Error comparing products', { error });
      throw error;
    }
  }

  /**
   * Create a saved comparison
   */
  async createComparison(
    userId: string,
    data: ComparisonData
  ): Promise<any> {
    try {
      const { productIds, notes } = data;

      if (productIds.length < 2) {
        throw new AppError('At least 2 products required', 400);
      }

      const comparison = await this.compareProducts(productIds);

      const result = await db.query(
        `INSERT INTO product_comparisons
         (user_id, product_ids, comparison_data, notes)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, product_ids, notes, created_at`,
        [
          userId,
          productIds,
          JSON.stringify(comparison.comparisonData),
          notes || null,
        ]
      );

      logger.info('Comparison created', {
        userId,
        comparisonId: result.rows[0].id,
        productCount: productIds.length,
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating comparison', { error });
      throw error;
    }
  }

  /**
   * Get user's saved comparisons
   */
  async getSavedComparisons(userId: string): Promise<any[]> {
    try {
      const result = await db.query(
        `SELECT
          id,
          product_ids,
          notes,
          created_at,
          updated_at,
          array_length(product_ids, 1) as product_count
         FROM product_comparisons
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error fetching saved comparisons', { error });
      throw error;
    }
  }

  /**
   * Get a specific comparison
   */
  async getComparison(comparisonId: string, userId: string): Promise<any> {
    try {
      const result = await db.query(
        `SELECT
          id,
          product_ids,
          comparison_data,
          notes,
          created_at
         FROM product_comparisons
         WHERE id = $1 AND user_id = $2`,
        [comparisonId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Comparison not found', 404);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error fetching comparison', { error });
      throw error;
    }
  }

  /**
   * Delete a comparison
   */
  async deleteComparison(comparisonId: string, userId: string): Promise<void> {
    try {
      const result = await db.query(
        `DELETE FROM product_comparisons WHERE id = $1 AND user_id = $2 RETURNING id`,
        [comparisonId, userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Comparison not found', 404);
      }

      logger.info('Comparison deleted', { comparisonId, userId });
    } catch (error) {
      logger.error('Error deleting comparison', { error });
      throw error;
    }
  }

  /**
   * Build comparison data from products
   */
  private buildComparisonData(products: any[]): Record<string, any> {
    const data: Record<string, any> = {
      priceComparison: {},
      ratingComparison: {},
      reviewComparison: {},
    };

    products.forEach((product) => {
      data.priceComparison[product.id] = {
        basePrice: product.price,
        currentPrice: product.current_price,
        source: product.price_source,
      };

      data.ratingComparison[product.id] = {
        averageRating: product.avg_rating,
        reviewCount: product.review_count,
      };
    });

    // Find cheapest option
    const cheapest = products.reduce((prev, current) =>
      (prev.current_price || prev.price) < (current.current_price || current.price)
        ? prev
        : current
    );

    data.cheapestOption = {
      productId: cheapest.id,
      productName: cheapest.name,
      price: cheapest.current_price || cheapest.price,
    };

    // Find highest rated
    const highestRated = products.reduce((prev, current) =>
      prev.avg_rating > current.avg_rating ? prev : current
    );

    data.highestRatedOption = {
      productId: highestRated.id,
      productName: highestRated.name,
      rating: highestRated.avg_rating,
      reviewCount: highestRated.review_count,
    };

    return data;
  }
}

export const comparisonService = new ComparisonService();
