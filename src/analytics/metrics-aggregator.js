// ============================================================
// BusinessMetrics — SupliList v4.0
// Consolidated: DAU/WAU/MAU, retention, affiliate tracking, LTV prediction
// Previously: metrics-aggregator.js, affiliate-tracker.js, ltv-predictor.js
// ============================================================

import { analyticsStorage } from './storage/analytics-storage.js';
import { logger } from '../utils/logger.js';
import { todayISO, offsetISO } from '../utils/date.js';
import { generateUUID } from './utils/crypto-utils.js';
import { stateManager } from '../state/state-manager.js';

/**
 * Consolidated business metrics: usage (DAU/WAU/MAU), affiliate performance, customer LTV
 */
export class BusinessMetrics {
  constructor() {
    this.cache = new Map();  // Date -> metrics (1-day cache)
    this.marketplaces = new Map([
      ['amazon', { name: 'Amazon Associates', commissionRate: 0.10 }],
      ['ml', { name: 'Mercado Livre Afiliados', commissionRate: 0.12 }],
      ['shopee', { name: 'Shopee Afiliados', commissionRate: 0.08 }]
    ]);
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

  // ============================================================
  // Affiliate Tracking (merged from affiliate-tracker.js)
  // ============================================================

  /**
   * Track an affiliate click
   * @param {Object} click - Click data
   * @returns {Promise<void>}
   */
  async trackAffiliateClick(click) {
    const clickId = generateUUID();
    const enrichedClick = {
      clickId, sessionId: click.sessionId, supplementId: click.supplementId,
      supplementName: click.supplementName, utmSource: click.utmSource,
      utmMedium: click.utmMedium || 'internal-link', utmCampaign: click.utmCampaign,
      url: click.url, timestamp: Date.now(), converted: false, conversionValue: null
    };

    await analyticsStorage.addEvent({
      eventId: `affiliate-click-${clickId}`, eventName: 'analytics:affiliateClick',
      payload: enrichedClick, sessionId: click.sessionId, userId: null,
      timestamp: Date.now(), url: '', userAgent: '', device: 'unknown'
    });

    logger.debug(`[BusinessMetrics] Affiliate click: ${click.supplementName} → ${click.utmSource}`);
  }

  /**
   * Get source performance stats
   * @param {string} utmSource - 'amazon' | 'ml' | 'shopee'
   * @param {string} [startDateISO]
   * @param {string} [endDateISO]
   * @returns {Promise<Object>}
   */
  async getAffiliateStats(utmSource, startDateISO = null, endDateISO = null) {
    const events = await analyticsStorage.getEvents();
    const clicks = events
      .filter(e => e.eventName === 'analytics:affiliateClick')
      .filter(e => e.payload.utmSource === utmSource);

    let filtered = clicks;
    if (startDateISO && endDateISO) {
      const startMs = new Date(`${startDateISO}T00:00:00Z`).getTime();
      const endMs = new Date(`${endDateISO}T23:59:59Z`).getTime();
      filtered = clicks.filter(c => c.timestamp >= startMs && c.timestamp <= endMs);
    }

    const marketplace = this.marketplaces.get(utmSource);
    if (!marketplace) throw new Error(`Unknown marketplace: ${utmSource}`);

    const totalClicks = filtered.length;
    const conversions = filtered.filter(c => c.payload.converted).length;
    const totalRevenue = filtered.filter(c => c.payload.converted)
      .reduce((sum, c) => sum + (c.payload.conversionValue || 0), 0);

    return {
      marketplace: marketplace.name, utmSource,
      totalClicks, conversions,
      conversionRate: totalClicks > 0 ? Math.round((conversions / totalClicks) * 10000) / 100 : 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      estimatedCommission: Math.round(totalRevenue * marketplace.commissionRate * 100) / 100,
      avgRevenuePerClick: totalClicks > 0 ? Math.round((totalRevenue / totalClicks) * 100) / 100 : 0
    };
  }

  /**
   * Compare affiliate performance across marketplaces
   * @param {string} startDateISO
   * @param {string} endDateISO
   * @returns {Promise<Array<Object>>}
   */
  async getMarketplaceComparison(startDateISO, endDateISO) {
    const stats = [];
    for (const [utmSource] of this.marketplaces) {
      const stat = await this.getAffiliateStats(utmSource, startDateISO, endDateISO);
      stats.push(stat);
    }
    return stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get top supplements by affiliate clicks
   * @param {string} [utmSource] - Optional filter
   * @param {number} limit
   * @returns {Promise<Array<Object>>}
   */
  async getTopSupplements(utmSource = null, limit = 10) {
    const allEvents = await analyticsStorage.getEvents();
    const clicks = allEvents
      .filter(e => e.eventName === 'analytics:affiliateClick')
      .filter(c => !utmSource || c.payload.utmSource === utmSource);

    const counts = {};
    clicks.forEach(click => {
      const id = click.payload.supplementId;
      const name = click.payload.supplementName;
      if (!counts[id]) counts[id] = { supplementId: id, supplementName: name, clicks: 0, conversions: 0, revenue: 0 };
      counts[id].clicks++;
      if (click.payload.converted) {
        counts[id].conversions++;
        counts[id].revenue += click.payload.conversionValue || 0;
      }
    });

    return Object.values(counts)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit)
      .map(s => ({
        ...s,
        conversionRate: s.clicks > 0 ? Math.round((s.conversions / s.clicks) * 1000) / 10 : 0,
        revenue: Math.round(s.revenue * 100) / 100
      }));
  }

  // ============================================================
  // LTV Prediction (merged from ltv-predictor.js)
  // ============================================================

  /**
   * Estimate LTV for a user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async estimateLTV(userId) {
    const state = stateManager.getState();
    const userProfile = state?.user;

    if (!userProfile || !userId) return { error: 'User not found', userId };

    const segment = this.#classifySegment(userProfile);
    const tierValue = this.#getTierValue(userProfile.tier);
    const retentionFactor = await this.#getRetentionFactor(userId);
    const engagementFactor = await this.#getEngagementFactor(userId);
    const affiliateValue = await this.#getAffiliateContribution(userId);

    const monthlyRevenue = userProfile.budget || segment.baseValue;
    const expectedMonths = 12 * (0.5 + retentionFactor);
    const baseValue = monthlyRevenue * expectedMonths * (0.5 + engagementFactor);
    const totalLTV = baseValue + affiliateValue;

    return {
      userId, segment: segment.id, segmentName: segment.name,
      baseValue: Math.round(baseValue * 100) / 100,
      affiliateValue: Math.round(affiliateValue * 100) / 100,
      totalLTV: Math.round(totalLTV * 100) / 100,
      tier: userProfile.tier, tierValue,
      monthlyRevenue, expectedMonths: Math.round(expectedMonths * 10) / 10,
      retentionFactor: Math.round(retentionFactor * 100),
      engagementFactor: Math.round(engagementFactor * 100),
      confidence: 65 + (engagementFactor * 30)
    };
  }

  /**
   * Get cohort LTV
   * @param {string} cohortDateISO
   * @returns {Promise<Object>}
   */
  async getCohortLTV(cohortDateISO) {
    const events = await analyticsStorage.getEventsByName('user:onboardingComplete');
    const cohortStart = new Date(`${cohortDateISO}T00:00:00Z`).getTime();
    const cohortEnd = new Date(`${cohortDateISO}T23:59:59Z`).getTime();

    const cohortEvents = events.filter(e => e.timestamp >= cohortStart && e.timestamp <= cohortEnd);
    const cohortSize = cohortEvents.length;

    let totalLTV = cohortSize > 0 ? cohortSize * 150 : 0;  // Estimate ~R$150 avg per user
    const avgLTV = cohortSize > 0 ? totalLTV / cohortSize : 0;

    return {
      cohortDate: cohortDateISO, cohortSize,
      totalLTV: Math.round(totalLTV * 100) / 100,
      avgLTV: Math.round(avgLTV * 100) / 100,
      estimatedRevenue: Math.round(totalLTV * 0.15 * 100) / 100
    };
  }

  /**
   * Compare segments by LTV
   * @returns {Promise<Array<Object>>}
   */
  async compareSegments() {
    const segments = this.#defineSegments();
    return segments.map(segment => ({
      segmentId: segment.id, segmentName: segment.name,
      baseMonthlyValue: segment.baseValue,
      expectedLTV: segment.baseValue * 12 * 0.7,
      conversionRate: Math.round(segment.conversionRate * 100) + '%'
    }));
  }

  // Private helpers for LTV
  #defineSegments() {
    return [
      { id: 'bulk-enthusiasts', name: 'Bulk Enthusiasts', filters: { weight: [75, 120], objective: 'bulk', budget: [300, 1000] }, baseValue: 250, conversionRate: 0.15 },
      { id: 'cut-disciplined', name: 'Cut & Disciplined', filters: { weight: [50, 80], objective: 'cut', budget: [100, 300] }, baseValue: 120, conversionRate: 0.08 },
      { id: 'strength-seekers', name: 'Strength Seekers', filters: { weight: [80, 130], objective: 'strength', budget: [200, 800] }, baseValue: 200, conversionRate: 0.12 },
      { id: 'casual-health', name: 'Casual Health', filters: { weight: [50, 100], objective: 'general', budget: [50, 200] }, baseValue: 50, conversionRate: 0.05 }
    ];
  }

  #classifySegment(userProfile) {
    for (const segment of this.#defineSegments()) {
      const f = segment.filters;
      if (userProfile.weight && (userProfile.weight < f.weight[0] || userProfile.weight > f.weight[1])) continue;
      if (userProfile.objective && userProfile.objective !== f.objective) continue;
      if (userProfile.budget && (userProfile.budget < f.budget[0] || userProfile.budget > f.budget[1])) continue;
      return segment;
    }
    return this.#defineSegments()[3];  // Default to casual
  }

  async #getRetentionFactor(userId) {
    const events = await analyticsStorage.getEventsByName('checkin:logged');
    const userEvents = events.filter(e => e.userId === userId);
    if (userEvents.length === 0) return 0;
    if (userEvents.length < 5) return 0.2;
    if (userEvents.length < 15) return 0.5;
    if (userEvents.length < 30) return 0.8;
    return 0.95;
  }

  async #getEngagementFactor(userId) {
    const events = await analyticsStorage.getEvents();
    const userEvents = events.filter(e => e.userId === userId);
    const uniqueEventTypes = new Set(userEvents.map(e => e.eventName)).size;
    if (uniqueEventTypes === 0) return 0;
    if (uniqueEventTypes < 3) return 0.3;
    if (uniqueEventTypes < 7) return 0.6;
    return 0.9;
  }

  async #getAffiliateContribution(userId) {
    const events = await analyticsStorage.getEventsByName('affiliate_click');
    const userClicks = events.filter(e => e.sessionId === userId);
    return userClicks.length * 5;  // ~R$5 per affiliate click
  }

  #getTierValue(tier) {
    switch (tier) {
      case 'master': return 2.0;
      case 'pro': return 1.5;
      default: return 1.0;
    }
  }
}

// Export singleton
export const metricsAggregator = new BusinessMetrics();
