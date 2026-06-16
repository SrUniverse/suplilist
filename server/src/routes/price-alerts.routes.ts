import { Router, Request, Response } from 'express';
import { db } from '../database.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { validateRequest } from '../middlewares/validation.middleware.js';
import { priceMonitorService } from '../services/price-monitor.service.js';
import { firebaseService } from '../services/firebase.service.js';
import {
  createPriceAlertSchema,
  updatePriceAlertSchema,
  priceHistoryQuerySchema,
  registerDeviceTokenSchema,
} from '../validators/price-alert.validator.js';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/price-alerts
 * Subscribe to a price alert for a product
 */
router.post(
  '/',
  validateRequest(createPriceAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const { productId, targetPrice } = req.body;
      const userId = (req as any).user.id;

      // Check if alert already exists
      const existingResult = await db.query(
        `SELECT id FROM user_price_alerts
         WHERE user_id = $1 AND product_id = $2`,
        [userId, productId]
      );

      if (existingResult.rows.length > 0) {
        throw new AppError('Price alert already exists for this product', 409);
      }

      // Create price alert
      const result = await db.query(
        `INSERT INTO user_price_alerts
         (user_id, product_id, target_price, active)
         VALUES ($1, $2, $3, true)
         RETURNING id, user_id, product_id, target_price, created_at, active`,
        [userId, productId, targetPrice]
      );

      const alert = result.rows[0];

      logger.info('Price alert created', {
        userId,
        productId,
        targetPrice,
        alertId: alert.id,
      });

      res.status(201).json({
        success: true,
        data: {
          id: alert.id,
          productId: alert.product_id,
          targetPrice: parseFloat(alert.target_price),
          active: alert.active,
          createdAt: alert.created_at,
        },
      });
    } catch (error) {
      logger.error('Error creating price alert', { error });
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create price alert' });
    }
  }
);

/**
 * GET /api/price-alerts
 * Get all price alerts for the user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const result = await db.query(
      `SELECT id, product_id, target_price, current_price, active, created_at, notification_sent_at
       FROM user_price_alerts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        targetPrice: parseFloat(row.target_price),
        currentPrice: row.current_price ? parseFloat(row.current_price) : null,
        active: row.active,
        createdAt: row.created_at,
        notificationSentAt: row.notification_sent_at,
      })),
    });
  } catch (error) {
    logger.error('Error fetching price alerts', { error });
    res.status(500).json({ error: 'Failed to fetch price alerts' });
  }
});

/**
 * GET /api/price-alerts/:alertId
 * Get a specific price alert
 */
router.get('/:alertId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { alertId } = req.params;

    const result = await db.query(
      `SELECT id, product_id, target_price, current_price, active, created_at, notification_sent_at
       FROM user_price_alerts
       WHERE id = $1 AND user_id = $2`,
      [alertId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Price alert not found', 404);
    }

    const alert = result.rows[0];

    res.json({
      success: true,
      data: {
        id: alert.id,
        productId: alert.product_id,
        targetPrice: parseFloat(alert.target_price),
        currentPrice: alert.current_price ? parseFloat(alert.current_price) : null,
        active: alert.active,
        createdAt: alert.created_at,
        notificationSentAt: alert.notification_sent_at,
      },
    });
  } catch (error) {
    logger.error('Error fetching price alert', { error });
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch price alert' });
  }
});

/**
 * PATCH /api/price-alerts/:alertId
 * Update a price alert
 */
router.patch(
  '/:alertId',
  validateRequest(updatePriceAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { alertId } = req.params;
      const { targetPrice, active } = req.body;

      // Verify alert belongs to user
      const checkResult = await db.query(
        `SELECT id FROM user_price_alerts WHERE id = $1 AND user_id = $2`,
        [alertId, userId]
      );

      if (checkResult.rows.length === 0) {
        throw new AppError('Price alert not found', 404);
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [alertId, userId];
      let paramCount = 2;

      if (targetPrice !== undefined) {
        updates.push(`target_price = $${++paramCount}`);
        values.push(targetPrice);
      }

      if (active !== undefined) {
        updates.push(`active = $${++paramCount}`);
        values.push(active);
      }

      if (updates.length === 0) {
        throw new AppError('No updates provided', 400);
      }

      const result = await db.query(
        `UPDATE user_price_alerts
         SET ${updates.join(', ')}
         WHERE id = $1 AND user_id = $2
         RETURNING id, product_id, target_price, current_price, active, created_at`,
        values
      );

      const alert = result.rows[0];

      logger.info('Price alert updated', { userId, alertId, updates: Object.keys({ targetPrice, active }) });

      res.json({
        success: true,
        data: {
          id: alert.id,
          productId: alert.product_id,
          targetPrice: parseFloat(alert.target_price),
          currentPrice: alert.current_price ? parseFloat(alert.current_price) : null,
          active: alert.active,
          createdAt: alert.created_at,
        },
      });
    } catch (error) {
      logger.error('Error updating price alert', { error });
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update price alert' });
    }
  }
);

/**
 * DELETE /api/price-alerts/:alertId
 * Unsubscribe from a price alert
 */
router.delete('/:alertId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { alertId } = req.params;

    const result = await db.query(
      `DELETE FROM user_price_alerts WHERE id = $1 AND user_id = $2 RETURNING id`,
      [alertId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Price alert not found', 404);
    }

    logger.info('Price alert deleted', { userId, alertId });

    res.json({
      success: true,
      message: 'Price alert deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting price alert', { error });
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete price alert' });
  }
});

/**
 * GET /api/price-alerts/:alertId/history
 * Get price history for a specific alert's product
 * MOVED from: GET /api/price-alerts/history/:productId (to avoid route conflict)
 */
router.get('/:alertId/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { alertId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    // Get the alert to find the product ID and verify user owns it
    const alertResult = await db.query(
      `SELECT product_id FROM user_price_alerts WHERE id = $1 AND user_id = $2`,
      [alertId, userId]
    );

    if (alertResult.rows.length === 0) {
      throw new AppError('Price alert not found', 404);
    }

    const { product_id: productId } = alertResult.rows[0];

    const result = await db.query(
      `SELECT source, current_price, drop_percentage, checked_at
       FROM price_history
       WHERE product_id = $1
       ORDER BY checked_at DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM price_history WHERE product_id = $1`,
      [productId]
    );

    res.json({
      success: true,
      data: {
        total: parseInt(countResult.rows[0].total),
        limit,
        offset,
        history: result.rows.map((row) => ({
          source: row.source,
          price: parseFloat(row.current_price),
          dropPercentage: row.drop_percentage ? parseFloat(row.drop_percentage) : null,
          checkedAt: row.checked_at,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching price history', { error });
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

/**
 * DEPRECATED: Device token endpoints have been moved to /api/notifications module
 *
 * Device token management (Firebase push notifications) should not be in price-alerts.
 * Use the following endpoints instead:
 *
 * - POST /api/notifications/device-tokens
 * - DELETE /api/notifications/device-tokens/:tokenId
 *
 * These endpoints remain here for backward compatibility but are deprecated.
 * Remove in v3 API version.
 *
 * Migration: Update clients to use /api/notifications/device-tokens instead of /api/price-alerts/device-tokens
 */

/**
 * POST /api/price-alerts/device-tokens
 * @deprecated Use POST /api/notifications/device-tokens instead
 * Register a Firebase device token
 */
router.post(
  '/device-tokens',
  validateRequest(registerDeviceTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { deviceToken, deviceName, deviceType } = req.body;

      // Check if token already exists
      const existingResult = await db.query(
        `SELECT id FROM firebase_tokens WHERE user_id = $1 AND device_token = $2`,
        [userId, deviceToken]
      );

      let tokenId: string;

      if (existingResult.rows.length > 0) {
        // Update existing token
        const result = await db.query(
          `UPDATE firebase_tokens
           SET last_used_at = NOW(), is_active = true
           WHERE user_id = $1 AND device_token = $2
           RETURNING id`,
          [userId, deviceToken]
        );
        tokenId = result.rows[0].id;
      } else {
        // Insert new token
        const result = await db.query(
          `INSERT INTO firebase_tokens
           (user_id, device_token, device_name, device_type, is_active)
           VALUES ($1, $2, $3, $4, true)
           RETURNING id`,
          [userId, deviceToken, deviceName || null, deviceType || null]
        );
        tokenId = result.rows[0].id;
      }

      // Register with Firebase
      await firebaseService.registerDeviceToken(userId, deviceToken, deviceName, deviceType);

      logger.info('Device token registered (DEPRECATED endpoint)', { userId, deviceType });

      // Add deprecation header
      res.set('Deprecation', 'true');
      res.set('Sunset', '2024-12-01T00:00:00Z');
      res.set('Link', '</api/notifications/device-tokens>; rel="successor-version"');

      res.status(201).json({
        success: true,
        data: { tokenId },
        deprecation: {
          message: 'This endpoint is deprecated. Use POST /api/notifications/device-tokens instead.',
          sunset: '2024-12-01T00:00:00Z',
          alternative: '/api/notifications/device-tokens',
        },
      });
    } catch (error) {
      logger.error('Error registering device token', { error });
      res.status(500).json({ error: 'Failed to register device token' });
    }
  }
);

/**
 * DELETE /api/price-alerts/device-tokens/:tokenId
 * @deprecated Use DELETE /api/notifications/device-tokens/:tokenId instead
 * Unregister a Firebase device token
 */
router.delete('/device-tokens/:tokenId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { tokenId } = req.params;

    const result = await db.query(
      `SELECT device_token FROM firebase_tokens WHERE id = $1 AND user_id = $2`,
      [tokenId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Device token not found', 404);
    }

    const deviceToken = result.rows[0].device_token;

    await db.query(
      `DELETE FROM firebase_tokens WHERE id = $1 AND user_id = $2`,
      [tokenId, userId]
    );

    await firebaseService.unregisterDeviceToken(userId, deviceToken);

    logger.info('Device token deleted (DEPRECATED endpoint)', { userId, tokenId });

    // Add deprecation header
    res.set('Deprecation', 'true');
    res.set('Sunset', '2024-12-01T00:00:00Z');
    res.set('Link', '</api/notifications/device-tokens>; rel="successor-version"');

    res.json({
      success: true,
      message: 'Device token deleted successfully',
      deprecation: {
        message: 'This endpoint is deprecated. Use DELETE /api/notifications/device-tokens/:tokenId instead.',
        sunset: '2024-12-01T00:00:00Z',
        alternative: '/api/notifications/device-tokens',
      },
    });
  } catch (error) {
    logger.error('Error deleting device token', { error });
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete device token' });
  }
});

export default router;
