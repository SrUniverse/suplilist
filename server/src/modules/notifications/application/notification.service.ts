import { CheckinModel } from '../../checkin/infrastructure/mongoose/checkin.model.js';
import { NotificationPreferenceModel } from '../infrastructure/mongoose/notification-preference.model.js';
import { NotificationScheduleModel } from '../infrastructure/mongoose/notification-schedule.model.js';
import { NotificationEngagementModel } from '../infrastructure/mongoose/notification-engagement.model.js';
import { v4 as uuidv4 } from 'uuid';

interface CheckinRecord {
  checkedAt: Date;
}

interface OpenRateResult {
  openCount: number;
  sentCount: number;
  openRate: number;
}

export class NotificationService {
  private messageTemplates = {
    daily: [
      'Time to check in! 💊',
      'Don\'t forget your supplements today! ✨',
      'Your health routine awaits 🏃',
      'Let\'s keep the streak alive! 🔥',
      'Check in with your supplements now 📋',
    ],
    streak: [
      'You\'ve got a {streakDays}-day streak! Keep it going! 🔥',
      'Amazing! {streakDays} days of consistency! 💪',
      '{streakDays}-day streak—legendary! 👑',
      'Wow! {streakDays} days straight! 🌟',
      '{streakDays}-day streak unlocked! 🎉',
    ],
    milestones: [
      'Milestone unlocked! First check-in! 🎯',
      'You\'ve completed a full week! 🏆',
      'One month of consistency! 🎊',
      'You\'ve completed 100 check-ins! 💯',
      'Legendary status: 6 months! 👑',
    ],
    comeback: [
      'We miss you! Come back and check in 👋',
      'Your streak is waiting for you! 💪',
      'Let\'s restart—one check-in today! 🚀',
      'Your health matters. Check in today 💚',
      'Ready to get back on track? 🎯',
    ],
    social: [
      'Your friend just completed their streak! 🏆',
      'Challenge your friends to supplement streaks! 🔥',
      'See how your friends are doing! 👥',
      'Join the supplement challenge! 💪',
      'Your community is thriving! 🌟',
    ],
  };

  async getOrCreatePreferences(userId: string) {
    let prefs = await NotificationPreferenceModel.findOne({ userId });
    if (!prefs) {
      const id = uuidv4();
      prefs = await NotificationPreferenceModel.create({
        _id: id,
        userId,
        enabled: true,
        optimalTime: '08:00',
        notificationTypes: {
          daily: true,
          streak: true,
          milestones: true,
          comeback: true,
          social: false,
        },
      });
    }
    return prefs;
  }

  async updatePreferences(userId: string, updates: {
    optimalTime?: string;
    notificationTypes?: Record<string, boolean>;
  }) {
    const prefs = await this.getOrCreatePreferences(userId);
    if (updates.optimalTime) prefs.optimalTime = updates.optimalTime;
    if (updates.notificationTypes) {
      prefs.notificationTypes = { ...prefs.notificationTypes, ...updates.notificationTypes };
    }
    return prefs.save();
  }

  async detectOptimalTime(userId: string): Promise<string> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const checkins: CheckinRecord[] = await CheckinModel.find({
      userId,
      checkedAt: { $gte: thirtyDaysAgo },
    }).lean();

    if (checkins.length === 0) {
      return '08:00';
    }

    const hourCounts: Record<number, number> = {};
    checkins.forEach((c) => {
      const hour = new Date(c.checkedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const optimalHour = Object.entries(hourCounts).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0];

    return `${String(parseInt(optimalHour)).padStart(2, '0')}:00`;
  }

  getPersonalizedMessage(type: string, context: Record<string, unknown> = {}): string {
    const templates = this.messageTemplates[type as keyof typeof this.messageTemplates] || ['Check in now!'];
    const template = templates[Math.floor(Math.random() * templates.length)];

    let message = template;
    Object.entries(context).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, String(value));
    });

    return message;
  }

  async checkStreakAlert(userId: string): Promise<{ streakDays: number; shouldNotify: boolean }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkedToday = await CheckinModel.findOne({
      userId,
      checkedAt: { $gte: today },
    });

    if (checkedToday) {
      return { streakDays: 0, shouldNotify: false };
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const checkedYesterday = await CheckinModel.findOne({
      userId,
      checkedAt: { $gte: yesterday, $lt: today },
    });

    if (!checkedYesterday) {
      return { streakDays: 0, shouldNotify: false };
    }

    let streakDays = 1;
    const current = new Date(yesterday);

    while (true) {
      current.setDate(current.getDate() - 1);
      const dayStart = new Date(current);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const hasCheckin = await CheckinModel.findOne({
        userId,
        checkedAt: { $gte: dayStart, $lt: dayEnd },
      });

      if (hasCheckin) {
        streakDays += 1;
      } else {
        break;
      }
    }

    return {
      streakDays,
      shouldNotify: streakDays > 0 && streakDays % 7 === 0,
    };
  }

  async scheduleUserNotifications(userId: string): Promise<void> {
    const prefs = await this.getOrCreatePreferences(userId);

    if (!prefs.enabled) return;

    const [hour, minute] = prefs.optimalTime.split(':').map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    if (scheduledTime < new Date()) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    if (prefs.notificationTypes.daily) {
      const message = this.getPersonalizedMessage('daily');
      await this.createSchedule(userId, 'daily', scheduledTime, message);
    }

    const streakAlert = await this.checkStreakAlert(userId);
    if (prefs.notificationTypes.streak && streakAlert.shouldNotify) {
      const message = this.getPersonalizedMessage('streak', { streakDays: streakAlert.streakDays });
      await this.createSchedule(userId, 'streak', scheduledTime, message);
    }
  }

  private async createSchedule(userId: string, type: string, time: Date, message: string): Promise<void> {
    const id = uuidv4();
    await NotificationScheduleModel.create({
      _id: id,
      userId,
      type: type as any,
      scheduledTime: time,
      message,
      sent: false,
    });
  }

  async trackEngagement(userId: string, notificationScheduleId: string, action: string): Promise<void> {
    const id = uuidv4();
    await NotificationEngagementModel.create({
      _id: id,
      userId,
      notificationScheduleId,
      action: action as any,
      timestamp: new Date(),
    });

    if (action === 'opened' || action === 'clicked') {
      await NotificationScheduleModel.updateOne(
        { _id: notificationScheduleId },
        { sent: true, sentAt: new Date() }
      );
    }
  }

  async optimizeNotificationTiming(userId: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const engagements = await NotificationEngagementModel.find({
      userId,
      action: 'opened',
      timestamp: { $gte: thirtyDaysAgo },
    });

    const totalScheduled = await NotificationScheduleModel.countDocuments({
      userId,
      createdAt: { $gte: thirtyDaysAgo },
    });

    const openRate = totalScheduled > 0 ? engagements.length / totalScheduled : 0;

    if (openRate < 0.3) {
      const newOptimalTime = await this.detectOptimalTime(userId);
      await this.updatePreferences(userId, { optimalTime: newOptimalTime });
    }
  }

  async getAnalytics(userId: string): Promise<{
    sentCount: number;
    openCount: number;
    clickCount: number;
    openRate: number;
    clickRate: number;
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sentCount = await NotificationScheduleModel.countDocuments({
      userId,
      sent: true,
      sentAt: { $gte: thirtyDaysAgo },
    });

    const openCount = await NotificationEngagementModel.countDocuments({
      userId,
      action: 'opened',
      timestamp: { $gte: thirtyDaysAgo },
    });

    const clickCount = await NotificationEngagementModel.countDocuments({
      userId,
      action: 'clicked',
      timestamp: { $gte: thirtyDaysAgo },
    });

    const openRate = sentCount > 0 ? Math.round((openCount / sentCount) * 100) : 0;
    const clickRate = sentCount > 0 ? Math.round((clickCount / sentCount) * 100) : 0;

    return { sentCount, openCount, clickCount, openRate, clickRate };
  }

  async getPendingNotifications(userId: string): Promise<Array<{
    id: string;
    type: string;
    message: string;
  }>> {
    const pending = await NotificationScheduleModel.find({
      userId,
      sent: false,
      scheduledTime: { $lte: new Date() },
    }).lean();

    return pending.map((n) => ({
      id: n._id,
      type: n.type,
      message: n.message,
    }));
  }
}
