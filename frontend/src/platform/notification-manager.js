/**
 * Notification Manager — Push & Email reminders for daily adherence
 * Critical for retention - users forget without reminders
 */

import { stateManager, ACTIONS } from '../state/state-manager.js';
import logger from './logger.js';

export class NotificationManager {
  constructor() {
    this.reminders = new Map(); // supplementId -> reminder config
    this.scheduledNotifications = [];
    this.notificationPermission = null;
    this.checkPermission();
  }

  /**
   * Set daily reminder for a supplement
   */
  setReminder(supplementId, supplementName, config = {}) {
    const {
      hour = 9,
      minute = 0,
      enabled = true,
      notifyPush = true,
      notifyEmail = false
    } = config;

    const reminder = {
      supplementId,
      supplementName,
      hour,
      minute,
      enabled,
      notifyPush,
      notifyEmail,
      createdAt: Date.now(),
      nextNotification: this.getNextNotificationTime(hour, minute)
    };

    this.reminders.set(supplementId, reminder);
    this.scheduleNotification(reminder);

    logger.info(`Reminder set: ${supplementName} at ${hour}:${String(minute).padStart(2, '0')}`);

    return reminder;
  }

  /**
   * Get next notification time for a given hour:minute
   */
  getNextNotificationTime(hour, minute) {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.getTime();
  }

  /**
   * Schedule notification to trigger at specific time
   */
  scheduleNotification(reminder) {
    const now = Date.now();
    const timeUntilNotification = reminder.nextNotification - now;

    if (timeUntilNotification > 0) {
      const timeoutId = setTimeout(async () => {
        await this.sendNotification(reminder);
      }, timeUntilNotification);

      this.scheduledNotifications.push({
        supplementId: reminder.supplementId,
        timeoutId
      });

      logger.info(`Notification scheduled for ${reminder.supplementName}`);
    }
  }

  /**
   * Send notification (push + optional email)
   */
  async sendNotification(reminder) {
    if (!reminder.enabled) return;

    // Push notification
    if (reminder.notifyPush && this.notificationPermission === 'granted') {
      this.sendPushNotification(reminder);
    }

    // Email notification (would integrate with email service)
    if (reminder.notifyEmail) {
      await this.sendEmailNotification(reminder);
    }

    // Reschedule for next day
    reminder.nextNotification = this.getNextNotificationTime(reminder.hour, reminder.minute);
    this.scheduleNotification(reminder);

    logger.info(`Notification sent: ${reminder.supplementName}`);
  }

  /**
   * Send browser push notification
   */
  sendPushNotification(reminder) {
    if (!('Notification' in window)) {
      logger.warn('Push notifications not supported');
      return;
    }

    const title = `Hora de tomar ${reminder.supplementName}!`;
    const options = {
      body: 'Toque para marcar como tomado',
      icon: '/assets/icon-192x192.png',
      badge: '/assets/badge-72x72.png',
      tag: `reminder-${reminder.supplementId}`,
      requireInteraction: false,
      data: {
        supplementId: reminder.supplementId,
        supplementName: reminder.supplementName,
        type: 'adherence-reminder'
      }
    };

    // Send notification via service worker if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SEND_NOTIFICATION',
        title,
        options
      });
    } else {
      // Fallback: use Notification API directly
      new Notification(title, options);
    }
  }

  /**
   * Send email notification (integrate with email service)
   */
  async sendEmailNotification(reminder) {
    try {
      const user = stateManager.select(s => s.profile);

      if (!user?.email) {
        logger.warn('No email configured for notifications');
        return;
      }

      // Would integrate with email service (SendGrid, Mailgun, etc)
      logger.info(`Email notification queued: ${reminder.supplementName} to ${user.email}`);

      // This would call your email API
      // await emailService.sendReminder({
      //   to: user.email,
      //   supplementName: reminder.supplementName,
      //   time: `${reminder.hour}:${String(reminder.minute).padStart(2, '0')}`
      // });
    } catch (error) {
      logger.error('Failed to send email notification', error);
    }
  }

  /**
   * Check and request notification permission
   */
  async checkPermission() {
    if (!('Notification' in window)) {
      logger.warn('Notifications not supported');
      this.notificationPermission = 'denied';
      return;
    }

    this.notificationPermission = Notification.permission;

    if (this.notificationPermission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        this.notificationPermission = permission;
      } catch (error) {
        logger.error('Failed to request notification permission', error);
      }
    }
  }

  /**
   * Update reminder
   */
  updateReminder(supplementId, config) {
    const existing = this.reminders.get(supplementId);
    if (!existing) {
      logger.warn(`Reminder not found: ${supplementId}`);
      return null;
    }

    const updated = { ...existing, ...config };
    this.reminders.set(supplementId, updated);

    // Cancel old notification and reschedule
    this.cancelReminder(supplementId);
    this.scheduleNotification(updated);

    logger.info(`Reminder updated: ${supplementId}`);

    return updated;
  }

  /**
   * Cancel reminder
   */
  cancelReminder(supplementId) {
    const scheduled = this.scheduledNotifications.find(
      s => s.supplementId === supplementId
    );

    if (scheduled) {
      clearTimeout(scheduled.timeoutId);
      this.scheduledNotifications = this.scheduledNotifications.filter(
        s => s.supplementId !== supplementId
      );
    }

    this.reminders.delete(supplementId);
    logger.info(`Reminder cancelled: ${supplementId}`);
  }

  /**
   * Get all reminders
   */
  getAllReminders() {
    return Array.from(this.reminders.values());
  }

  /**
   * Get reminder config
   */
  getReminder(supplementId) {
    return this.reminders.get(supplementId);
  }

  /**
   * Enable/disable all reminders
   */
  setAllEnabled(enabled) {
    for (const [id, reminder] of this.reminders.entries()) {
      reminder.enabled = enabled;
      this.updateReminder(id, { enabled });
    }

    logger.info(`All reminders ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Handle notification click (from service worker)
   */
  handleNotificationClick(supplementId) {
    const reminder = this.reminders.get(supplementId);
    if (!reminder) return;

    logger.info(`User clicked notification: ${reminder.supplementName}`);

    // Dispatch action to mark as taken
    stateManager.dispatch(ACTIONS.RECORD_CHECKIN, {
      supplementId,
      date: new Date().toISOString().split('T')[0],
      taken: true,
      timestamp: Date.now()
    });
  }

  /**
   * Get notification stats
   */
  getStats() {
    const reminders = this.getAllReminders();

    return {
      totalReminders: reminders.length,
      enabledReminders: reminders.filter(r => r.enabled).length,
      pushEnabled: reminders.filter(r => r.notifyPush).length,
      emailEnabled: reminders.filter(r => r.notifyEmail).length,
      notificationPermission: this.notificationPermission,
      nextNotifications: reminders.slice(0, 5).map(r => ({
        supplementName: r.supplementName,
        nextAt: new Date(r.nextNotification).toLocaleTimeString('pt-BR')
      }))
    };
  }
}

export default new NotificationManager();
