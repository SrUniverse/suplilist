// ============================================================
// MetricsAggregator — SupliList v4.0
// Calculates DAU/WAU/MAU and retention curves from events
// ============================================================

import { analyticsStorage } from './storage/analytics-storage.js';
import { logger } from '../utils/logger.js';
import { todayISO, offsetISO } from '../utils/date.js';

/**
 * Aggregates metrics from raw events
 */
export class MetricsAggregator {
  constructor() {
    this.cache = new Map();  // Date -> metrics (1-day cache)
  }

  /**
   * Get DAU (Daily Active Users) for a date
   * Unique sessionIds that had trackable events
   * @param {string} dateISO - YYYY-MM-DD
   * @returns {Promise<number>}
   */
  async getDAU(dateISO) {
    const cacheKey = `dau-${dateISO}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const count = await analyticsStorage.countUniqueSessionIds(dateISO);
    this.cache.set(cacheKey, count);
    return count;
  }

  /**
   * Get WAU (Weekly Active Users)
   * Unique sessionIds in the past 7 days
   * @param {number} weekStartOffset - 0 = current week, -1 = last week
   * @returns {Promise<number>}
   */
  async getWAU(weekStartOffset = 0) {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (weekStartOffset * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const events = await analyticsStorage.getEventsBetween(
      weekStart.getTime(),
      weekEnd.getTime()
    );

    const sessionIds = new Set();
    events.forEach(e => {
      if (e.sessionId) sessionIds.add(e.sessionId);
    });

    return sessionIds.size;
  }

  /**
   * Get MAU (Monthly Active Users)
   * Unique sessionIds in the past 30 days
   * @param {number} monthOffset - 0 = current month, -1 = last month
   * @returns {Promise<number>}
   */
  async getMAU(monthOffset = 0) {
    const today = new Date();
    const monthStart = new Date(today);
    monthStart.setMonth(today.getMonth() + monthOffset);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthStart.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    const events = await analyticsStorage.getEventsBetween(
      monthStart.getTime(),
      monthEnd.getTime()
    );

    const sessionIds = new Set();
    events.forEach(e => {
      if (e.sessionId) sessionIds.add(e.sessionId);
    });

    return sessionIds.size;
  }

  /**
   * Get retention for a cohort
   * Cohort = users who were active on day 0
   * Returns % who came back on day N
   *
   * @param {string} cohortDateISO - YYYY-MM-DD (day 0)
   * @param {number} dayN - How many days later (1, 7, 14, 30, 60, 90)
   * @returns {Promise<Object>} {cohortSize, retained, retentionRate}
   */
  async getRetention(cohortDateISO, dayN) {
    // Get users on day 0 (cohort)
    const cohortSize = await analyticsStorage.countUniqueSessionIds(cohortDateISO);

    if (cohortSize === 0) {
      return { cohortSize: 0, retained: 0, retentionRate: 0 };
    }

    // Get cohort session IDs
    const cohortDate = new Date(cohortDateISO);
    const cohortStart = cohortDate.getTime();
    const cohortEnd = new Date(cohortDate);
    cohortEnd.setDate(cohortEnd.getDate() + 1);

    const cohortEvents = await analyticsStorage.getEventsBetween(
      cohortStart,
      cohortEnd.getTime()
    );

    const cohortSessions = new Set();
    cohortEvents.forEach(e => {
      if (e.sessionId) cohortSessions.add(e.sessionId);
    });

    // Get users on day N
    const dayNDate = new Date(cohortDate);
    dayNDate.setDate(dayNDate.getDate() + dayN);
    const dayNStart = dayNDate.getTime();
    const dayNEnd = new Date(dayNDate);
    dayNEnd.setDate(dayNEnd.getDate() + 1);

    const dayNEvents = await analyticsStorage.getEventsBetween(
      dayNStart,
      dayNEnd.getTime()
    );

    const dayNSessions = new Set();
    dayNEvents.forEach(e => {
      if (e.sessionId) dayNSessions.add(e.sessionId);
    });

    // Count retained = cohort intersect dayN
    let retained = 0;
    cohortSessions.forEach(sessionId => {
      if (dayNSessions.has(sessionId)) {
        retained++;
      }
    });

    const retentionRate = (retained / cohortSize) * 100;

    return {
      cohortSize,
      retained,
      retentionRate: Math.round(retentionRate * 10) / 10  // 1 decimal
    };
  }

  /**
   * Get full retention curve for a cohort
   * Returns D0, D1, D7, D14, D30, D60, D90
   *
   * @param {string} cohortDateISO - YYYY-MM-DD
   * @returns {Promise<Object>} RetentionCurve
   */
  async getRetentionCurve(cohortDateISO) {
    const curve = { D0: 100 };  // Day 0 is always 100%

    const days = [1, 7, 14, 30, 60, 90];
    for (const day of days) {
      const retention = await this.getRetention(cohortDateISO, day);
      const rate = retention.cohortSize > 0
        ? (retention.retained / retention.cohortSize) * 100
        : 0;
      curve[`D${day}`] = Math.round(rate * 10) / 10;
    }

    return curve;
  }

  /**
   * Get top events for a date range
   * @param {string} [startDateISO] - YYYY-MM-DD
   * @param {string} [endDateISO] - YYYY-MM-DD
   * @param {number} limit - How many to return
   * @returns {Promise<Array<{eventName: string, count: number, percentage: number}>>}
   */
  async getTopEvents(startDateISO = null, endDateISO = null, limit = 10) {
    let events = await analyticsStorage.getEvents();

    // Filter by date if provided
    if (startDateISO && endDateISO) {
      const startMs = new Date(`${startDateISO}T00:00:00Z`).getTime();
      const endMs = new Date(`${endDateISO}T23:59:59Z`).getTime();
      events = events.filter(e => e.timestamp >= startMs && e.timestamp <= endMs);
    }

    const counts = {};
    events.forEach(event => {
      counts[event.eventName] = (counts[event.eventName] || 0) + 1;
    });

    const total = events.length;
    return Object.entries(counts)
      .map(([name, count]) => ({
        eventName: name,
        count,
        percentage: Math.round((count / total) * 1000) / 10  // 1 decimal
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Calculate funnel conversion rates
   * @param {Array<string>} steps - Event names in order (cohort → step1 → step2 → ...)
   * @param {string} startDateISO - Cohort start date
   * @param {string} endDateISO - End date for analysis
   * @returns {Promise<Object>}
   */
  async getFunnelConversion(steps, startDateISO, endDateISO) {
    const startMs = new Date(`${startDateISO}T00:00:00Z`).getTime();
    const endMs = new Date(`${endDateISO}T23:59:59Z`).getTime();

    const events = await analyticsStorage.getEventsBetween(startMs, endMs);

    // Build user journey map
    const journeys = {};  // sessionId -> array of reached steps
    events.forEach(event => {
      if (!journeys[event.sessionId]) {
        journeys[event.sessionId] = [];
      }
      for (let i = 0; i < steps.length; i++) {
        if (steps[i] === event.eventName && !journeys[event.sessionId].includes(i)) {
          journeys[event.sessionId].push(i);
        }
      }
    });

    // Calculate funnel
    const results = {
      steps: [],
      dropoffs: [],
      totalEntries: Object.keys(journeys).length,
      totalCompletions: 0
    };

    const stepCounts = {};
    steps.forEach((stepName, idx) => {
      let count = 0;
      Object.values(journeys).forEach(reachedSteps => {
        if (reachedSteps.includes(idx)) {
          count++;
        }
      });
      stepCounts[idx] = count;
    });

    // Add steps to results
    const cohortSize = results.totalEntries;
    steps.forEach((stepName, idx) => {
      const count = stepCounts[idx] || 0;
      results.steps.push({
        stepIndex: idx,
        eventName: stepName,
        count,
        percentage: cohortSize > 0 ? Math.round((count / cohortSize) * 1000) / 10 : 0
      });

      if (idx === steps.length - 1) {
        results.totalCompletions = count;
      }
    });

    // Add dropoffs
    for (let i = 0; i < steps.length - 1; i++) {
      const from = stepCounts[i] || 0;
      const to = stepCounts[i + 1] || 0;
      const dropoff = from - to;
      results.dropoffs.push({
        fromStep: steps[i],
        toStep: steps[i + 1],
        count: dropoff,
        percentage: from > 0 ? Math.round((dropoff / from) * 1000) / 10 : 0
      });
    }

    results.conversionRate = cohortSize > 0
      ? Math.round((results.totalCompletions / cohortSize) * 1000) / 10
      : 0;

    return results;
  }

  /**
   * Get aggregated metrics for a date
   * @param {string} dateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getMetricsForDate(dateISO) {
    const dau = await this.getDAU(dateISO);
    const curve = await this.getRetentionCurve(dateISO);
    const topEvents = await this.getTopEvents(dateISO, dateISO, 5);

    return {
      date: dateISO,
      dau,
      timestamp: new Date(`${dateISO}T23:59:59Z`).getTime(),
      retentionCurve: curve,
      topEvents
    };
  }

  /**
   * Clear cache
   * @returns {void}
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export singleton
export const metricsAggregator = new MetricsAggregator();
