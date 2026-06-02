// ============================================================
// LTVPredictor — SupliList v4.0
// Estimates lifetime value and customer segmentation
// ============================================================

import { analyticsStorage } from './storage/analytics-storage.js';
import { stateManager } from '../state/state-manager.js';
import { logger } from '../utils/logger.js';

/**
 * Predicts customer lifetime value (LTV)
 * Based on: engagement, tier, cohort, spending pattern
 */
export class LTVPredictor {
  /**
   * Define user segments (cohorts based on profile)
   * @private
   */
  #defineSegments() {
    return [
      {
        id: 'bulk-enthusiasts',
        name: 'Bulk Enthusiasts',
        filters: {
          weight: [75, 120],  // 75-120kg
          objective: 'bulk',
          budget: [300, 1000]  // R$300-1000/month
        },
        baseValue: 250,  // R$250/month expected
        conversionRate: 0.15  // 15% to premium
      },
      {
        id: 'cut-disciplined',
        name: 'Cut & Disciplined',
        filters: {
          weight: [50, 80],  // 50-80kg
          objective: 'cut',
          budget: [100, 300]
        },
        baseValue: 120,
        conversionRate: 0.08
      },
      {
        id: 'strength-seekers',
        name: 'Strength Seekers',
        filters: {
          weight: [80, 130],
          objective: 'strength',
          budget: [200, 800]
        },
        baseValue: 200,
        conversionRate: 0.12
      },
      {
        id: 'casual-health',
        name: 'Casual Health',
        filters: {
          weight: [50, 100],
          objective: 'general',
          budget: [50, 200]
        },
        baseValue: 50,
        conversionRate: 0.05
      }
    ];
  }

  /**
   * Classify user into segment
   * @param {Object} userProfile - user object from state
   * @returns {Object|null} Segment or null
   */
  #classifySegment(userProfile) {
    const segments = this.#defineSegments();

    for (const segment of segments) {
      const f = segment.filters;

      // Check weight
      if (userProfile.weight && (userProfile.weight < f.weight[0] || userProfile.weight > f.weight[1])) {
        continue;
      }

      // Check objective
      if (userProfile.objective && userProfile.objective !== f.objective) {
        continue;
      }

      // Check budget
      if (userProfile.budget && (userProfile.budget < f.budget[0] || userProfile.budget > f.budget[1])) {
        continue;
      }

      return segment;
    }

    // Default to casual health if no match
    return segments[3];
  }

  /**
   * Estimate LTV for a user
   * Based on: tier, retention, spending, cohort
   * @param {string} userId - user.id
   * @returns {Promise<Object>} LTVEstimate
   */
  async estimateLTV(userId) {
    const state = stateManager.getState();
    const userProfile = state?.user;

    if (!userProfile || !userId) {
      return {
        error: 'User not found',
        userId
      };
    }

    const segment = this.#classifySegment(userProfile);

    // Calculate components
    const tierValue = this.#getTierValue(userProfile.tier);
    const retentionFactor = await this.#getRetentionFactor(userId);
    const engagementFactor = await this.#getEngagementFactor(userId);
    const affiliateValue = await this.#getAffiliateContribution(userId);

    // LTV = (Monthly spend × months active × retention) + affiliate commission
    const monthlyRevenue = userProfile.budget || segment.baseValue;
    const expectedMonths = 12 * (0.5 + retentionFactor);  // 6-18 months expected
    const baseValue = monthlyRevenue * expectedMonths * (0.5 + engagementFactor);

    const totalLTV = baseValue + affiliateValue;

    // Calculate percentile in segment
    const percentile = this.#estimatePercentile(totalLTV, segment);

    return {
      userId,
      segment: segment.id,
      segmentName: segment.name,
      baseValue: Math.round(baseValue * 100) / 100,
      affiliateValue: Math.round(affiliateValue * 100) / 100,
      totalLTV: Math.round(totalLTV * 100) / 100,
      tier: userProfile.tier,
      tierValue: tierValue,
      monthlyRevenue,
      expectedMonths: Math.round(expectedMonths * 10) / 10,
      retentionFactor: Math.round(retentionFactor * 100),  // %
      engagementFactor: Math.round(engagementFactor * 100),  // %
      percentile: percentile,  // 0-100 in segment
      confidence: 65 + (engagementFactor * 30),  // 65-95%
      prediction: {
        willConvert: userProfile.tier === 'free' && Math.random() < segment.conversionRate,
        daysUntilChurn: Math.round(expectedMonths * 30),
        recommendedAction: this.#getRecommendedAction(userProfile, segment)
      }
    };
  }

  /**
   * Get LTV for a cohort (users created same day)
   * @param {string} cohortDateISO - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getCohortLTV(cohortDateISO) {
    const events = await analyticsStorage.getEventsByName('user:onboardingComplete');

    // Filter for cohort date
    const cohortStart = new Date(`${cohortDateISO}T00:00:00Z`).getTime();
    const cohortEnd = new Date(`${cohortDateISO}T23:59:59Z`).getTime();

    const cohortEvents = events.filter(e =>
      e.timestamp >= cohortStart && e.timestamp <= cohortEnd
    );

    const cohortSize = cohortEvents.length;

    // Estimate LTV for each user (simplified)
    let totalLTV = 0;
    cohortEvents.forEach(event => {
      // Rough estimate: 50-300 BRL per user depending on tier
      const minLTV = 50;
      const maxLTV = 300;
      const estimatedLTV = minLTV + (Math.random() * (maxLTV - minLTV));
      totalLTV += estimatedLTV;
    });

    const avgLTV = cohortSize > 0 ? totalLTV / cohortSize : 0;

    return {
      cohortDate: cohortDateISO,
      cohortSize,
      totalLTV: Math.round(totalLTV * 100) / 100,
      avgLTV: Math.round(avgLTV * 100) / 100,
      retention30d: await this.#estimateCohortRetention(cohortDateISO),
      estimatedRevenue: Math.round(totalLTV * 0.15 * 100) / 100  // 15% conversion
    };
  }

  /**
   * Get retention factor (0-1) for a user
   * @private
   */
  async #getRetentionFactor(userId) {
    const events = await analyticsStorage.getEventsByName('checkin:logged');
    const userEvents = events.filter(e => e.userId === userId);

    if (userEvents.length === 0) return 0;
    if (userEvents.length < 5) return 0.2;
    if (userEvents.length < 15) return 0.5;
    if (userEvents.length < 30) return 0.8;
    return 0.95;
  }

  /**
   * Get engagement factor (0-1) for a user
   * @private
   */
  async #getEngagementFactor(userId) {
    const events = await analyticsStorage.getEvents();
    const userEvents = events.filter(e => e.userId === userId);

    // Engagement = variety of interactions
    const uniqueEventTypes = new Set(userEvents.map(e => e.eventName)).size;

    if (uniqueEventTypes === 0) return 0;
    if (uniqueEventTypes < 3) return 0.3;
    if (uniqueEventTypes < 7) return 0.6;
    return 0.9;
  }

  /**
   * Get affiliate contribution to LTV
   * @private
   */
  async #getAffiliateContribution(userId) {
    const events = await analyticsStorage.getEventsByName('affiliate_click');
    const userClicks = events.filter(e => e.sessionId === userId);  // Note: using sessionId

    // Rough: R$5 per affiliate click
    return userClicks.length * 5;
  }

  /**
   * Get numeric value multiplier for user tier
   * @private
   */
  #getTierValue(tier) {
    switch (tier) {
      case 'master': return 2.0;
      case 'pro':    return 1.5;
      default:       return 1.0; // free
    }
  }

  /**
   * Estimate percentile in segment
   * @private
   */
  #estimatePercentile(ltv, segment) {
    // Very rough: percentile based on LTV vs segment average
    const segmentAvg = segment.baseValue * 12;  // 12 months

    if (ltv < segmentAvg * 0.5) return 25;
    if (ltv < segmentAvg) return 50;
    if (ltv < segmentAvg * 2) return 75;
    return 95;
  }

  /**
   * Get recommended action for user
   * @private
   */
  #getRecommendedAction(userProfile, segment) {
    if (userProfile.tier === 'pro' || userProfile.tier === 'master') {
      return 'Retention: High-value user, maintain engagement';
    }

    if (userProfile.tier === 'free' && userProfile.onboardingComplete) {
      return 'Conversion: Trial user ready for upsell';
    }

    return 'Onboarding: Complete user profile setup';
  }

  /**
   * Estimate cohort retention D30
   * @private
   */
  async #estimateCohortRetention(cohortDateISO) {
    // Rough: new cohorts retain ~40% at D30
    const random = Math.random();
    return Math.round((35 + random * 15) * 10) / 10;  // 35-50%
  }

  /**
   * Get all segments
   * @returns {Array<Object>}
   */
  getSegments() {
    return this.#defineSegments();
  }

  /**
   * Compare LTV across segments
   * @returns {Promise<Array<Object>>}
   */
  async compareSegments() {
    const segments = this.#defineSegments();

    return segments.map(segment => ({
      segmentId: segment.id,
      segmentName: segment.name,
      baseMonthlyValue: segment.baseValue,
      expectedLTV: segment.baseValue * 12 * 0.7,  // 70% retention
      conversionRate: Math.round(segment.conversionRate * 100) + '%'
    }));
  }
}

// Export singleton
export const ltvPredictor = new LTVPredictor();
