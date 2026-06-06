/**
 * Smart Notification Scheduler — Intelligent push notification timing
 *
 * Analyzes user behavior to determine:
 * - Optimal notification times
 * - Message variation (prevents fatigue)
 * - Streak reminders (when user stops checking in)
 * - Milestone celebrations (7d, 30d, 100d)
 */

import { logger } from '../utils/logger.js';

const NOTIFICATION_TYPES = {
  DAILY_REMINDER: 'daily_reminder',
  STREAK_ALERT: 'streak_alert',
  MILESTONE: 'milestone',
  COMEBACK: 'comeback',
  SOCIAL_CHALLENGE: 'social_challenge',
};

const MESSAGE_TEMPLATES = {
  daily_reminder: [
    'Hora de tomar {{supplementName}}! 💊',
    'Não esqueça seu {{supplementName}} hoje',
    'Mantém a aderência: {{supplementName}} agora? ✓',
    '{{supplementName}} — consistência é chave! 🎯',
    'Seu corpo agradece: {{supplementName}} ❤️',
  ],
  streak_alert: [
    '{{days}} dias de aderência! Não pare agora 🔥',
    'Você está arrasando com {{days}} dias seguidos! 💪',
    'Streak em risco? Faltam 2 dias sem registrar {{supplementName}}',
    'Volta aqui! Seu streak de {{days}} dias está em risco ⚠️',
  ],
  milestone: [
    '🎉 {{days}} DIAS! Você é consistente!',
    '⭐ Parabéns! {{days}} dias de aderência perfeita',
    '🏆 MILESTONE: {{days}} dias no seu protocolo',
  ],
  comeback: [
    'Sentindo falta de {{supplementName}}? Volta ao protocolo 👋',
    'Deixou de tomar {{supplementName}} por {{days}} dias. Tá na hora? ⏰',
  ],
};

export class NotificationScheduler {
  constructor(db, notificationService) {
    this.db = db;
    this.notificationService = notificationService;
  }

  /**
   * Detect user's optimal notification time based on check-in history
   * Analyzes past 30 days of check-in times
   */
  async detectOptimalTime(userId) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get check-ins from last 30 days
      const checkins = await this.db.collection('checkins').find({
        userId,
        createdAt: { $gte: thirtyDaysAgo }
      }).toArray();

      if (checkins.length < 3) {
        // Not enough data — default to 8 AM
        return { hour: 8, minute: 0, confidence: 0 };
      }

      // Extract hours from check-in timestamps
      const hours = checkins.map(c => {
        const time = new Date(c.createdAt);
        return time.getHours();
      });

      // Find most common hour
      const hourFreq = {};
      hours.forEach(h => {
        hourFreq[h] = (hourFreq[h] || 0) + 1;
      });

      const optimalHour = Object.keys(hourFreq).reduce((a, b) =>
        hourFreq[a] > hourFreq[b] ? a : b
      );

      // Calculate confidence (0-1: how consistent the user is)
      const maxFreq = Math.max(...Object.values(hourFreq));
      const confidence = Math.min(maxFreq / checkins.length, 1);

      logger.debug(`[NotificationScheduler] Optimal time for ${userId}: ${optimalHour}:00 (confidence: ${confidence.toFixed(2)})`);

      return {
        hour: parseInt(optimalHour),
        minute: Math.random() < 0.5 ? 0 : 30, // Vary by 30 min
        confidence,
      };
    } catch (error) {
      logger.error('[NotificationScheduler] Error detecting optimal time:', error);
      return { hour: 8, minute: 0, confidence: 0 };
    }
  }

  /**
   * Get personalized message for user
   * Rotates through templates to prevent fatigue
   */
  getPersonalizedMessage(type, data) {
    const templates = MESSAGE_TEMPLATES[type] || MESSAGE_TEMPLATES.daily_reminder;

    // Rotate message (simple hash-based selection)
    const messageIndex = (data.rotationSeed || 0) % templates.length;
    let message = templates[messageIndex];

    // Replace placeholders
    message = message.replace('{{supplementName}}', data.supplementName || 'seu suplemento');
    message = message.replace('{{days}}', data.days || '7');

    return message;
  }

  /**
   * Check if user should receive milestone notification
   */
  shouldCelebrateMilestone(streakDays) {
    const milestones = [7, 14, 30, 60, 90, 100, 365];
    return milestones.includes(streakDays);
  }

  /**
   * Check if user's streak is at risk (3+ days without check-in)
   */
  async checkStreakAlert(userId) {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

      const recentCheckin = await this.db.collection('checkins').findOne({
        userId,
        createdAt: { $gte: threeDaysAgo }
      }, { sort: { createdAt: -1 } });

      if (!recentCheckin) {
        // No check-in in 3+ days — user is at risk
        return {
          isAtRisk: true,
          daysSinceLastCheckin: Math.floor((Date.now() - (recentCheckin?.createdAt || Date.now())) / (24 * 60 * 60 * 1000))
        };
      }

      return { isAtRisk: false };
    } catch (error) {
      logger.error('[NotificationScheduler] Error checking streak:', error);
      return { isAtRisk: false };
    }
  }

  /**
   * Schedule all notifications for a user
   * Called once daily at off-peak time (2 AM UTC)
   */
  async scheduleUserNotifications(userId) {
    try {
      const user = await this.db.collection('users').findOne({ _id: userId });
      if (!user?.notificationPreferences?.enabled) {
        return { scheduled: 0 };
      }

      const stack = user.stack || [];
      let scheduledCount = 0;

      // Get user's optimal time
      const optimalTime = user.notificationOptimalTime ||
        await this.detectOptimalTime(userId);

      // For each supplement in stack
      for (const supplement of stack) {
        const supplementName = supplement.name || 'Suplemento';

        // Check streak
        const streakData = await this.checkStreakAlert(userId);

        // Determine notification type
        let notificationType = NOTIFICATION_TYPES.DAILY_REMINDER;
        let messageData = {
          supplementName,
          rotationSeed: Date.now() % 5
        };

        if (streakData.isAtRisk && streakData.daysSinceLastCheckin >= 3) {
          notificationType = NOTIFICATION_TYPES.STREAK_ALERT;
          messageData.days = streakData.daysSinceLastCheckin;
        }

        // Check for milestones
        // (would require additional streak calculation here)

        // Create notification
        const message = this.getPersonalizedMessage(notificationType, messageData);

        await this.db.collection('scheduledNotifications').insertOne({
          userId,
          supplementId: supplement.id,
          supplementName,
          type: notificationType,
          message,
          scheduledTime: this._getNextOccurrence(optimalTime),
          status: 'pending',
          createdAt: new Date(),
          metadata: {
            optimalTime,
            supplement
          }
        });

        scheduledCount++;
      }

      logger.info(`[NotificationScheduler] Scheduled ${scheduledCount} notifications for ${userId}`);
      return { scheduled: scheduledCount };
    } catch (error) {
      logger.error('[NotificationScheduler] Error scheduling notifications:', error);
      throw error;
    }
  }

  /**
   * Get next occurrence of time (today if still in future, else tomorrow)
   */
  _getNextOccurrence(optimalTime) {
    const now = new Date();
    const next = new Date();
    next.setHours(optimalTime.hour, optimalTime.minute, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Track notification engagement (sent, opened, clicked)
   */
  async trackEngagement(notificationId, action) {
    try {
      await this.db.collection('notificationAnalytics').insertOne({
        notificationId,
        action, // 'sent' | 'opened' | 'clicked' | 'ignored'
        timestamp: new Date()
      });

      logger.debug(`[NotificationScheduler] Tracked ${action} for notification ${notificationId}`);
    } catch (error) {
      logger.error('[NotificationScheduler] Error tracking engagement:', error);
    }
  }

  /**
   * Update user's optimal time based on engagement
   * If notification is consistently ignored, shift time
   */
  async optimizeNotificationTiming(userId) {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const analytics = await this.db.collection('notificationAnalytics').aggregate([
        {
          $match: {
            userId,
            timestamp: { $gte: sevenDaysAgo },
            action: 'opened'
          }
        },
        {
          $group: {
            _id: null,
            openedCount: { $sum: 1 }
          }
        }
      ]).toArray();

      const sentCount = 7; // Assume 1 per day
      const openRate = (analytics[0]?.openedCount || 0) / sentCount;

      // If open rate < 30%, shift notification time
      if (openRate < 0.3) {
        const currentTime = await this.detectOptimalTime(userId);
        const newHour = (currentTime.hour + 2) % 24; // Shift by 2 hours

        await this.db.collection('users').updateOne(
          { _id: userId },
          { $set: { notificationOptimalTime: { ...currentTime, hour: newHour } } }
        );

        logger.info(`[NotificationScheduler] Optimized notification time for ${userId}: ${newHour}:00`);
      }
    } catch (error) {
      logger.error('[NotificationScheduler] Error optimizing timing:', error);
    }
  }
}

export default NotificationScheduler;
