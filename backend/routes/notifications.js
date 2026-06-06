/**
 * Notifications Routes — Smart push notification management
 * Handles scheduling, preferences, analytics, and delivery
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import NotificationScheduler from '../services/notification-scheduler.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Initialize scheduler (would be injected from app.js)
let scheduler = null;

export function initNotifications(schedulerInstance) {
  scheduler = schedulerInstance;
}

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const db = req.app.locals.db;

    const user = await db.collection('users').findOne(
      { _id: userId },
      { projection: { notificationPreferences: 1, notificationOptimalTime: 1 } }
    );

    const preferences = user?.notificationPreferences || {
      enabled: true,
      dailyReminder: true,
      streakAlerts: true,
      milestones: true,
      comebackReminders: true,
      socialNotifications: false,
    };

    const optimalTime = user?.notificationOptimalTime || {
      hour: 8,
      minute: 0,
      confidence: 0
    };

    return res.json({
      success: true,
      preferences,
      optimalTime,
      message: 'Notificações serão enviadas às ' + optimalTime.hour.toString().padStart(2, '0') + ':' + optimalTime.minute.toString().padStart(2, '0')
    });
  } catch (error) {
    logger.error('[NotificationsRoute] Error getting preferences:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put(
  '/preferences',
  authenticateToken,
  rateLimit({ windowMs: 60 * 1000, max: 10 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const { preferences, preferredHour } = req.body;
      const db = req.app.locals.db;

      // Validate preferences
      if (typeof preferences !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'preferences must be an object'
        });
      }

      if (preferredHour !== undefined) {
        if (!Number.isInteger(preferredHour) || preferredHour < 0 || preferredHour > 23) {
          return res.status(400).json({
            success: false,
            error: 'preferredHour must be 0-23'
          });
        }
      }

      // Update database
      const updateData = {
        notificationPreferences: preferences,
        updatedAt: new Date()
      };

      if (preferredHour !== undefined) {
        updateData.notificationOptimalTime = {
          hour: preferredHour,
          minute: 0,
          confidence: 1 // User manually set
        };
      }

      await db.collection('users').updateOne(
        { _id: userId },
        { $set: updateData }
      );

      logger.info(`[NotificationsRoute] Updated preferences for ${userId}`);

      return res.json({
        success: true,
        message: 'Preferências de notificação atualizadas'
      });
    } catch (error) {
      logger.error('[NotificationsRoute] Error updating preferences:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/notifications/schedule
 * Manually trigger notification scheduling (admin/cron)
 */
router.post(
  '/schedule',
  authenticateToken,
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }),
  async (req, res) => {
    try {
      const userId = req.user?.id;

      if (!scheduler) {
        return res.status(500).json({
          success: false,
          error: 'Notification scheduler not initialized'
        });
      }

      const result = await scheduler.scheduleUserNotifications(userId);

      return res.json({
        success: true,
        scheduled: result.scheduled,
        message: `${result.scheduled} notificações agendadas`
      });
    } catch (error) {
      logger.error('[NotificationsRoute] Error scheduling:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/notifications/track
 * Track notification engagement (opened, clicked, ignored)
 */
router.post(
  '/track',
  rateLimit({ windowMs: 60 * 1000, max: 100 }),
  async (req, res) => {
    try {
      const { notificationId, action } = req.body;
      const db = req.app.locals.db;

      // Validate action
      if (!['sent', 'opened', 'clicked', 'ignored'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action'
        });
      }

      await db.collection('notificationAnalytics').insertOne({
        notificationId,
        action,
        timestamp: new Date()
      });

      logger.debug(`[NotificationsRoute] Tracked ${action} for ${notificationId}`);

      return res.json({
        success: true,
        message: 'Engagement tracked'
      });
    } catch (error) {
      logger.error('[NotificationsRoute] Error tracking engagement:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/notifications/pending
 * Get pending notifications for service worker
 */
router.get('/pending', async (req, res) => {
  try {
    const { userId } = req.query;
    const db = req.app.locals.db;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId required'
      });
    }

    const now = new Date();
    const notifications = await db.collection('scheduledNotifications').find({
      userId,
      status: 'pending',
      scheduledTime: { $lte: now }
    }).toArray();

    // Update status to 'sent'
    if (notifications.length > 0) {
      await db.collection('scheduledNotifications').updateMany(
        { _id: { $in: notifications.map(n => n._id) } },
        { $set: { status: 'sent', sentAt: now } }
      );
    }

    return res.json({
      success: true,
      notifications: notifications.map(n => ({
        id: n._id.toString(),
        title: n.supplementName,
        body: n.message,
        tag: n.supplementId,
        data: {
          supplementId: n.supplementId,
          type: n.type,
          url: '/app/checkin'
        }
      }))
    });
  } catch (error) {
    logger.error('[NotificationsRoute] Error getting pending:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/notifications/analytics
 * Get notification engagement analytics
 */
router.get(
  '/analytics',
  authenticateToken,
  async (req, res) => {
    try {
      const userId = req.user?.id;
      const db = req.app.locals.db;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const analytics = await db.collection('notificationAnalytics').aggregate([
        {
          $match: {
            timestamp: { $gte: sevenDaysAgo }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const stats = {
        sent: 0,
        opened: 0,
        clicked: 0,
        ignored: 0
      };

      analytics.forEach(a => {
        stats[a._id] = a.count;
      });

      const openRate = stats.sent > 0
        ? ((stats.opened / stats.sent) * 100).toFixed(1)
        : 0;

      const clickRate = stats.opened > 0
        ? ((stats.clicked / stats.opened) * 100).toFixed(1)
        : 0;

      return res.json({
        success: true,
        stats,
        metrics: {
          openRate: `${openRate}%`,
          clickRate: `${clickRate}%`,
          totalEngagement: stats.opened + stats.clicked
        }
      });
    } catch (error) {
      logger.error('[NotificationsRoute] Error getting analytics:', error);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
