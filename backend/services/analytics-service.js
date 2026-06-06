/**
 * Analytics Service — Calculate adherence metrics and statistics
 * Powers visual reports with heatmaps, trends, and insights
 */

import { logger } from '../utils/logger.js';

const MILESTONES = [7, 14, 30, 60, 90, 100, 365];
const ACHIEVEMENT_BADGES = {
  FIRST_CHECKIN: { id: 'first_checkin', name: '🚀 Primeiro Passo', description: 'Registrou o primeiro check-in' },
  WEEK_STREAK: { id: 'week_streak', name: '🔥 Semana Consistente', description: '7 dias seguidos' },
  MONTH_PERFECT: { id: 'month_perfect', name: '⭐ Mês Perfeito', description: '30 dias de 100% aderência' },
  COMEBACK: { id: 'comeback', name: '💪 Voltou Forte', description: 'Retomou após pausa' },
  MASTER: { id: 'master', name: '🏆 Mestre', description: '100 dias de aderência' },
};

export class AnalyticsService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get adherence data for heatmap visualization
   * Returns daily adherence for last 90 days
   */
  async getAdherenceHeatmap(userId, days = 90) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Get all check-ins in range
      const checkins = await this.db.collection('checkins').find({
        userId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).toArray();

      // Group by date
      const checkInsByDate = {};
      checkins.forEach(c => {
        const date = c.createdAt.toISOString().split('T')[0];
        checkInsByDate[date] = (checkInsByDate[date] || 0) + 1;
      });

      // Get user's stack size for normalization
      const user = await this.db.collection('users').findOne(
        { _id: userId },
        { projection: { stack: 1 } }
      );
      const stackSize = user?.stack?.length || 1;

      // Build heatmap data
      const heatmapData = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const checkinsCount = checkInsByDate[dateStr] || 0;
        const adherence = Math.min((checkinsCount / stackSize) * 100, 100);

        heatmapData.push({
          date: dateStr,
          dayOfWeek: date.getDay(),
          checkins: checkinsCount,
          adherence: Math.round(adherence),
          intensity: this._getIntensity(adherence)
        });
      }

      return heatmapData;
    } catch (error) {
      logger.error('[AnalyticsService] Error getting heatmap:', error);
      return [];
    }
  }

  /**
   * Get monthly adherence trend (line chart data)
   */
  async getMonthlyTrend(userId, months = 6) {
    try {
      const now = new Date();
      const trendData = [];

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        // Count check-ins in month
        const checkins = await this.db.collection('checkins').find({
          userId,
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }).toArray();

        // Get user stack size
        const user = await this.db.collection('users').findOne(
          { _id: userId },
          { projection: { stack: 1 } }
        );
        const stackSize = user?.stack?.length || 1;
        const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

        // Calculate adherence %
        const maxPossible = daysInMonth * stackSize;
        const adherence = maxPossible > 0 ? Math.round((checkins.length / maxPossible) * 100) : 0;

        trendData.push({
          month: monthStart.toISOString().split('T')[0],
          monthName: monthStart.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
          adherence,
          checkins: checkins.length,
          daysActive: new Set(checkins.map(c => c.createdAt.toISOString().split('T')[0])).size
        });
      }

      return trendData;
    } catch (error) {
      logger.error('[AnalyticsService] Error getting trend:', error);
      return [];
    }
  }

  /**
   * Get current streak and related metrics
   */
  async getStreakMetrics(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all check-ins sorted by date
      const checkins = await this.db.collection('checkins')
        .find({ userId })
        .sort({ createdAt: -1 })
        .toArray();

      if (checkins.length === 0) {
        return { currentStreak: 0, longestStreak: 0, lastCheckin: null, totalCheckins: 0 };
      }

      // Get user's stack
      const user = await this.db.collection('users').findOne(
        { _id: userId },
        { projection: { stack: 1 } }
      );
      const stackSize = user?.stack?.length || 1;

      // Group check-ins by date
      const checkInDates = {};
      checkins.forEach(c => {
        const date = c.createdAt.toISOString().split('T')[0];
        if (!checkInDates[date]) {
          checkInDates[date] = [];
        }
        checkInDates[date].push(c);
      });

      const dates = Object.keys(checkInDates).sort().reverse();

      // Calculate current streak
      let currentStreak = 0;
      let checkingDate = new Date(today);

      for (let i = 0; i < 365; i++) {
        const dateStr = checkingDate.toISOString().split('T')[0];
        const dayCheckins = checkInDates[dateStr] || [];

        if (dayCheckins.length >= stackSize) {
          currentStreak++;
          checkingDate.setDate(checkingDate.getDate() - 1);
        } else {
          break;
        }
      }

      // Calculate longest streak (historically)
      let longestStreak = 0;
      let tempStreak = 0;
      checkingDate = new Date(dates[0]);

      for (let i = 0; i < dates.length; i++) {
        const dayCheckins = checkInDates[dates[i]] || [];
        if (dayCheckins.length >= stackSize) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 0;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);

      const lastCheckinDate = checkins[0]?.createdAt || null;

      return {
        currentStreak,
        longestStreak,
        lastCheckin: lastCheckinDate?.toISOString(),
        totalCheckins: checkins.length,
        daysSinceLastCheckin: lastCheckinDate
          ? Math.floor((today - lastCheckinDate) / (24 * 60 * 60 * 1000))
          : null
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error getting streak metrics:', error);
      return { currentStreak: 0, longestStreak: 0, lastCheckin: null, totalCheckins: 0 };
    }
  }

  /**
   * Get unlocked achievements/badges
   */
  async getAchievements(userId) {
    try {
      const streakMetrics = await this.getStreakMetrics(userId);
      const user = await this.db.collection('users').findOne({ _id: userId });
      const checkins = await this.db.collection('checkins').countDocuments({ userId });

      const achievements = [];

      // First check-in
      if (checkins > 0) {
        achievements.push(ACHIEVEMENT_BADGES.FIRST_CHECKIN);
      }

      // Week streak
      if (streakMetrics.currentStreak >= 7) {
        achievements.push(ACHIEVEMENT_BADGES.WEEK_STREAK);
      }

      // Month perfect (30 days)
      if (streakMetrics.longestStreak >= 30) {
        achievements.push(ACHIEVEMENT_BADGES.MONTH_PERFECT);
      }

      // Master (100 days)
      if (streakMetrics.longestStreak >= 100) {
        achievements.push(ACHIEVEMENT_BADGES.MASTER);
      }

      // Comeback (resumiu após pausa)
      const recentCheckins = await this.db.collection('checkins')
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(2)
        .toArray();

      if (recentCheckins.length >= 2) {
        const daysBetween = (recentCheckins[0].createdAt - recentCheckins[1].createdAt) / (24 * 60 * 60 * 1000);
        if (daysBetween > 7) {
          achievements.push(ACHIEVEMENT_BADGES.COMEBACK);
        }
      }

      // Deduplicate
      const uniqueAchievements = [];
      const seen = new Set();
      achievements.forEach(a => {
        if (!seen.has(a.id)) {
          uniqueAchievements.push(a);
          seen.add(a.id);
        }
      });

      return uniqueAchievements;
    } catch (error) {
      logger.error('[AnalyticsService] Error getting achievements:', error);
      return [];
    }
  }

  /**
   * Get supplement-specific adherence
   */
  async getSupplementAdherence(userId, supplementId) {
    try {
      const checkins = await this.db.collection('checkins').find({
        userId,
        supplementId
      }).toArray();

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentCheckins = checkins.filter(c => c.createdAt >= thirtyDaysAgo);

      const adherence = recentCheckins.length > 0
        ? Math.round((recentCheckins.length / 30) * 100)
        : 0;

      return {
        supplementId,
        totalCheckins: checkins.length,
        recentCheckins: recentCheckins.length,
        adherence30Days: adherence,
        lastCheckin: checkins.length > 0
          ? checkins[checkins.length - 1].createdAt
          : null
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error getting supplement adherence:', error);
      return { supplementId, totalCheckins: 0, recentCheckins: 0, adherence30Days: 0 };
    }
  }

  /**
   * Get overall report for a month
   */
  async getMonthlyReport(userId, year, month) {
    try {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      const checkins = await this.db.collection('checkins').find({
        userId,
        createdAt: { $gte: monthStart, $lte: monthEnd }
      }).toArray();

      const user = await this.db.collection('users').findOne({ _id: userId });
      const stackSize = user?.stack?.length || 1;
      const daysInMonth = monthEnd.getDate();

      const daysActive = new Set(
        checkins.map(c => c.createdAt.toISOString().split('T')[0])
      ).size;

      const adherence = Math.round((daysActive / daysInMonth) * 100);

      return {
        month: monthStart.toISOString().split('T')[0],
        daysActive,
        totalDays: daysInMonth,
        adherence,
        totalCheckins: checkins.length,
        supplementsTracked: stackSize,
        avgCheckinsPerDay: (checkins.length / daysActive).toFixed(1)
      };
    } catch (error) {
      logger.error('[AnalyticsService] Error getting monthly report:', error);
      return null;
    }
  }

  /**
   * Helper: Get intensity level for heatmap color
   */
  _getIntensity(adherence) {
    if (adherence === 0) return 'none';
    if (adherence < 25) return 'low';
    if (adherence < 50) return 'medium-low';
    if (adherence < 75) return 'medium';
    if (adherence < 100) return 'high';
    return 'perfect';
  }
}

export default AnalyticsService;
