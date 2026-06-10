import { db } from '../database';
import { logger } from '../utils/logger';
import { firebaseService } from './firebase.service';
import axios from 'axios';

interface PriceData {
  productId: string;
  source: string;
  currentPrice: number;
}

interface PriceDropAlert {
  userId: string;
  productId: string;
  productName?: string;
  previousPrice: number;
  currentPrice: number;
  dropPercentage: number;
  targetPrice?: number;
}

const PRICE_CHECK_THRESHOLD = 10; // 10% drop to trigger notification
const PRICE_SOURCES = [
  { name: 'source_a', url: 'https://api.source-a.com/products' },
  { name: 'source_b', url: 'https://api.source-b.com/products' },
  { name: 'source_c', url: 'https://api.source-c.com/products' },
];

class PriceMonitorService {
  /**
   * Monitor prices across all sources and detect drops
   */
  async monitorPrices(): Promise<{
    processed: number;
    alerts: number;
    errors: number;
  }> {
    const stats = {
      processed: 0,
      alerts: 0,
      errors: 0,
    };

    try {
      logger.info('Starting price monitoring cycle');

      // Get all active price alerts
      const result = await db.query<any>(
        `SELECT DISTINCT product_id FROM user_price_alerts WHERE active = true`
      );

      const productIds = result.rows.map((r) => r.product_id);

      if (productIds.length === 0) {
        logger.info('No active price alerts to monitor');
        return stats;
      }

      // Check prices for each product across sources
      for (const productId of productIds) {
        try {
          await this.monitorProductPrices(productId);
          stats.processed++;
        } catch (error) {
          logger.error('Error monitoring product', { error, productId });
          stats.errors++;
        }
      }

      logger.info('Price monitoring cycle completed', stats);
      return stats;
    } catch (error) {
      logger.error('Error in monitorPrices', { error });
      throw error;
    }
  }

  /**
   * Monitor prices for a specific product
   */
  private async monitorProductPrices(productId: string): Promise<void> {
    try {
      const prices = await this.fetchPricesFromSources(productId);

      // Process each source's price
      for (const priceData of prices) {
        await this.processPriceData(productId, priceData);
      }
    } catch (error) {
      logger.error('Error monitoring product prices', { error, productId });
      throw error;
    }
  }

  /**
   * Fetch current prices from all sources
   */
  private async fetchPricesFromSources(productId: string): Promise<PriceData[]> {
    const prices: PriceData[] = [];

    for (const source of PRICE_SOURCES) {
      try {
        const response = await axios.get(
          `${source.url}/${productId}`,
          {
            timeout: 5000,
            headers: {
              'User-Agent': 'SupliList-PriceMonitor/1.0',
            },
          }
        );

        if (response.data?.price) {
          prices.push({
            productId,
            source: source.name,
            currentPrice: response.data.price,
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch price from source', {
          error,
          source: source.name,
          productId,
        });
      }
    }

    return prices;
  }

  /**
   * Process and store price data, detect drops
   */
  private async processPriceData(
    productId: string,
    priceData: PriceData
  ): Promise<void> {
    try {
      // Get previous price
      const previousPriceResult = await db.query<any>(
        `SELECT current_price FROM price_history
         WHERE product_id = $1 AND source = $2
         ORDER BY checked_at DESC LIMIT 1`,
        [productId, priceData.source]
      );

      const previousPrice = previousPriceResult.rows[0]?.current_price;

      // Calculate drop percentage
      let dropPercentage = 0;
      if (previousPrice && previousPrice > 0) {
        dropPercentage =
          ((previousPrice - priceData.currentPrice) / previousPrice) * 100;
      }

      // Insert into price history
      await db.query(
        `INSERT INTO price_history
         (product_id, source, current_price, previous_price, drop_percentage, checked_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          productId,
          priceData.source,
          priceData.currentPrice,
          previousPrice || null,
          dropPercentage || null,
        ]
      );

      // Detect if significant drop occurred
      if (dropPercentage >= PRICE_CHECK_THRESHOLD) {
        await this.notifyUsersOfDrop({
          productId,
          previousPrice: previousPrice || priceData.currentPrice,
          currentPrice: priceData.currentPrice,
          dropPercentage,
        });
      }
    } catch (error) {
      logger.error('Error processing price data', {
        error,
        productId,
        source: priceData.source,
      });
    }
  }

  /**
   * Detect price drop for a product
   */
  async detectPriceDrop(
    productId: string,
    threshold: number = PRICE_CHECK_THRESHOLD
  ): Promise<PriceDropAlert | null> {
    try {
      const result = await db.query<any>(
        `SELECT
          ph.current_price,
          LAG(ph.current_price) OVER (
            PARTITION BY ph.source ORDER BY ph.checked_at DESC
          ) as previous_price,
          ph.source
         FROM price_history ph
         WHERE ph.product_id = $1
         ORDER BY ph.checked_at DESC
         LIMIT 1`,
        [productId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const { current_price, previous_price } = row;

      if (!previous_price || current_price >= previous_price) {
        return null;
      }

      const dropPercentage = ((previous_price - current_price) / previous_price) * 100;

      if (dropPercentage >= threshold) {
        return {
          productId,
          previousPrice: previous_price,
          currentPrice: current_price,
          dropPercentage,
        };
      }

      return null;
    } catch (error) {
      logger.error('Error detecting price drop', { error, productId });
      return null;
    }
  }

  /**
   * Notify users of a price drop
   */
  async notifyUsersOfDrop(dropData: {
    productId: string;
    previousPrice: number;
    currentPrice: number;
    dropPercentage: number;
  }): Promise<{ notified: number; failed: number }> {
    try {
      // Get all users with active alerts for this product
      const result = await db.query<any>(
        `SELECT u.id, u.email, upa.target_price, upa.id as alert_id
         FROM user_price_alerts upa
         JOIN users u ON u.id = upa.user_id
         WHERE upa.product_id = $1 AND upa.active = true`,
        [dropData.productId]
      );

      const users = result.rows;
      let notified = 0;
      let failed = 0;

      for (const user of users) {
        try {
          // Only notify if current price is below or near target
          if (
            !user.target_price ||
            dropData.currentPrice <= user.target_price
          ) {
            const success = await this.sendPriceDropNotification(user.id, {
              productId: dropData.productId,
              previousPrice: dropData.previousPrice,
              currentPrice: dropData.currentPrice,
              dropPercentage: dropData.dropPercentage,
            });

            if (success) {
              notified++;

              // Update notification_sent_at
              await db.query(
                `UPDATE user_price_alerts
                 SET notification_sent_at = NOW()
                 WHERE id = $1`,
                [user.alert_id]
              );
            } else {
              failed++;
            }
          }
        } catch (error) {
          logger.error('Error notifying user of price drop', {
            error,
            userId: user.id,
          });
          failed++;
        }
      }

      logger.info('Price drop notifications sent', {
        productId: dropData.productId,
        notified,
        failed,
        dropPercentage: dropData.dropPercentage,
      });

      return { notified, failed };
    } catch (error) {
      logger.error('Error notifying users of price drop', {
        error,
        productId: dropData.productId,
      });
      return { notified: 0, failed: 0 };
    }
  }

  /**
   * Send price drop notification to a user
   */
  private async sendPriceDropNotification(
    userId: string,
    dropData: {
      productId: string;
      previousPrice: number;
      currentPrice: number;
      dropPercentage: number;
    }
  ): Promise<boolean> {
    try {
      // Get user's device tokens
      const tokensResult = await db.query<any>(
        `SELECT device_token FROM firebase_tokens
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      const deviceTokens = tokensResult.rows.map((r) => r.device_token);

      if (deviceTokens.length === 0) {
        logger.warn('No active device tokens for user', { userId });
        return false;
      }

      const priceDropPercentage = dropData.dropPercentage.toFixed(1);
      const title = 'Price Drop Alert!';
      const body = `Product price dropped by ${priceDropPercentage}%! Now at $${dropData.currentPrice.toFixed(
        2
      )}`;

      const result = await firebaseService.sendToDevices(deviceTokens, {
        title,
        body,
        data: {
          productId: dropData.productId,
          previousPrice: dropData.previousPrice.toString(),
          currentPrice: dropData.currentPrice.toString(),
          dropPercentage: priceDropPercentage,
          type: 'price_drop',
        },
        priority: 'high',
        sound: 'default',
      });

      return result.successful > 0;
    } catch (error) {
      logger.error('Error sending price drop notification', {
        error,
        userId,
      });
      return false;
    }
  }

  /**
   * Get price history for a product
   */
  async getPriceHistory(
    productId: string,
    limit: number = 100
  ): Promise<
    Array<{
      source: string;
      price: number;
      dropPercentage: number | null;
      checkedAt: Date;
    }>
  > {
    try {
      const result = await db.query<any>(
        `SELECT source, current_price as price, drop_percentage, checked_at
         FROM price_history
         WHERE product_id = $1
         ORDER BY checked_at DESC
         LIMIT $2`,
        [productId, limit]
      );

      return result.rows.map((row) => ({
        source: row.source,
        price: parseFloat(row.price),
        dropPercentage: row.drop_percentage
          ? parseFloat(row.drop_percentage)
          : null,
        checkedAt: new Date(row.checked_at),
      }));
    } catch (error) {
      logger.error('Error getting price history', { error, productId });
      return [];
    }
  }

  /**
   * Get current lowest price across sources for a product
   */
  async getLowestPrice(
    productId: string
  ): Promise<{ source: string; price: number; checkedAt: Date } | null> {
    try {
      const result = await db.query<any>(
        `SELECT source, current_price as price, checked_at
         FROM price_history
         WHERE product_id = $1 AND source IN ('source_a', 'source_b', 'source_c')
         ORDER BY current_price ASC, checked_at DESC
         LIMIT 1`,
        [productId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        source: row.source,
        price: parseFloat(row.price),
        checkedAt: new Date(row.checked_at),
      };
    } catch (error) {
      logger.error('Error getting lowest price', { error, productId });
      return null;
    }
  }
}

export const priceMonitorService = new PriceMonitorService();
