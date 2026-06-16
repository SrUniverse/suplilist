import { CheckinModel } from '../../checkin/infrastructure/mongoose/checkin.model.js';

interface CheckinRecord {
  _id: string;
  userId: string;
  supplementId: string;
  checkedAt: Date;
  createdAt: Date;
}

export class AnalyticsService {
  async getAdherenceHeatmap(userId: string, days: number = 90): Promise<{
    date: string;
    intensity: number; // 0-5: none, low, medium-low, medium, high, perfect
    percentage: number;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    const checkins: CheckinRecord[] = await CheckinModel.find({
      userId,
      checkedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const checkinsByDate: Record<string, number> = {};
    checkins.forEach((c) => {
      const dateKey = c.checkedAt.toISOString().split('T')[0];
      checkinsByDate[dateKey] = (checkinsByDate[dateKey] || 0) + 1;
    });

    const heatmapData: Array<{ date: string; intensity: number; percentage: number }> = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const count = checkinsByDate[dateKey] || 0;
      const percentage = Math.min(100, count * 20);
      const intensity = Math.min(5, Math.ceil(percentage / 20));

      heatmapData.push({
        date: dateKey,
        intensity,
        percentage,
      });

      current.setDate(current.getDate() + 1);
    }

    return heatmapData;
  }

  async getMonthlyTrend(userId: string, months: number = 6): Promise<{
    month: string;
    adherence: number;
  }[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Optimized: Single aggregation pipeline instead of 6 sequential queries
    const results = await CheckinModel.aggregate([
      {
        $match: {
          userId,
          checkedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$checkedAt' },
            month: { $month: '$checkedAt' },
            day: { $dayOfMonth: '$checkedAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
          },
          uniqueDays: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    const data: Array<{ month: string; adherence: number }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

      const result = results.find(
        (r) => r._id.year === monthDate.getFullYear() && r._id.month === monthDate.getMonth() + 1
      );

      const uniqueDays = result?.uniqueDays || 0;
      const adherence = Math.round((uniqueDays / daysInMonth) * 100);
      const monthStr = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      data.push({ month: monthStr, adherence });
    }

    return data;
  }

  async getStreakMetrics(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastCheckinDate: string | null;
    totalCheckins: number;
  }> {
    const checkins: CheckinRecord[] = await CheckinModel.find({ userId })
      .sort({ checkedAt: -1 })
      .lean();

    if (checkins.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastCheckinDate: null,
        totalCheckins: 0,
      };
    }

    const lastCheckinDate = checkins[0].checkedAt.toISOString().split('T')[0];
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastCheckinTime = new Date(checkins[0].checkedAt);
    lastCheckinTime.setHours(0, 0, 0, 0);

    const daysSinceLastCheckin = Math.floor((today.getTime() - lastCheckinTime.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastCheckin === 0) {
      currentStreak = 1;
    } else if (daysSinceLastCheckin === 1) {
      currentStreak = 1;
    } else {
      currentStreak = 0;
    }

    const checkinDates = new Set(
      checkins.map((c) => c.checkedAt.toISOString().split('T')[0])
    );

    let checkDate = new Date(checkins[0].checkedAt);
    checkDate.setHours(0, 0, 0, 0);

    for (let i = 1; i < Object.keys(checkinDates).length; i++) {
      checkDate.setDate(checkDate.getDate() - 1);
      const checkDateStr = checkDate.toISOString().split('T')[0];

      if (checkinDates.has(checkDateStr)) {
        tempStreak += 1;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    if (currentStreak === 0) {
      currentStreak = tempStreak;
    }

    return {
      currentStreak,
      longestStreak,
      lastCheckinDate,
      totalCheckins: checkins.length,
    };
  }

  async getAchievements(userId: string): Promise<string[]> {
    const achievements: string[] = [];
    const checkins: CheckinRecord[] = await CheckinModel.find({ userId }).lean();

    if (checkins.length >= 1) achievements.push('First Checkin');
    if (checkins.length >= 7) achievements.push('Week Streak');
    if (checkins.length >= 30) achievements.push('Month Perfect');
    if (checkins.length >= 100) achievements.push('Master');

    const streak = await this.getStreakMetrics(userId);
    if (streak.currentStreak === 0 && checkins.length > 0) achievements.push('Comeback');

    return achievements;
  }

  async getSupplementAdherence(userId: string, supplementId: string): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const checkins: CheckinRecord[] = await CheckinModel.find({
      userId,
      supplementId,
      checkedAt: { $gte: thirtyDaysAgo },
    }).lean();

    const uniqueDays = new Set(
      checkins.map((c) => c.checkedAt.toISOString().split('T')[0])
    ).size;

    return Math.round((uniqueDays / 30) * 100);
  }

  async getMonthlyReport(userId: string, year: number, month: number): Promise<{
    daysActive: number;
    totalDays: number;
    adherencePercentage: number;
    avgCheckinsPerDay: number;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const daysInMonth = endDate.getDate();

    const checkins: CheckinRecord[] = await CheckinModel.find({
      userId,
      checkedAt: { $gte: startDate, $lte: endDate },
    }).lean();

    const uniqueDays = new Set(
      checkins.map((c) => c.checkedAt.toISOString().split('T')[0])
    ).size;

    return {
      daysActive: uniqueDays,
      totalDays: daysInMonth,
      adherencePercentage: Math.round((uniqueDays / daysInMonth) * 100),
      avgCheckinsPerDay: checkins.length > 0 ? Math.round(checkins.length / uniqueDays) : 0,
    };
  }

  async getDashboard(userId: string): Promise<{
    streak: any;
    heatmap: any;
    trend: any;
    achievements: any;
    monthlyReport: any;
  }> {
    const streak = await this.getStreakMetrics(userId);
    const heatmap = await this.getAdherenceHeatmap(userId, 30);
    const trend = await this.getMonthlyTrend(userId, 6);
    const achievements = await this.getAchievements(userId);

    const now = new Date();
    const monthlyReport = await this.getMonthlyReport(userId, now.getFullYear(), now.getMonth() + 1);

    return {
      streak,
      heatmap,
      trend,
      achievements,
      monthlyReport,
    };
  }
}
