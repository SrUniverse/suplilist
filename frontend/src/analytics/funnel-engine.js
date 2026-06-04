// ============================================================
// FunnelEngine — SupliList v4.0
// Configurable conversion funnel tracking and analysis
// ============================================================

import { analyticsStorage } from './storage/analytics-storage.js';
import { logger } from '../utils/logger.js';

/**
 * Tracks user progression through conversion funnels
 * A funnel = sequence of events (e.g., Free → Onboarding → Stack → Premium)
 */
export class FunnelEngine {
  #funnels = new Map();  // funnelName -> {steps: [...], created}

  constructor() {
    this.#definePredefinedFunnels();
  }

  /**
   * Define pre-built funnels
   * @private
   */
  #definePredefinedFunnels() {
    // Funnel 1: Free to Premium conversion
    this.defineFunnel('free-to-premium', [
      'app:ready',
      'user:onboardingComplete',
      'stack:itemAdded',
      'premium:unlocked'
    ]);

    // Funnel 2: Stack adoption
    this.defineFunnel('stack-adoption', [
      'app:ready',
      'user:onboardingComplete',
      'stack:itemAdded',
      'checkin:logged'
    ]);

    // Funnel 3: Affiliate conversion
    this.defineFunnel('affiliate-conversion', [
      'supplement:view',
      'supplement:favorite:toggle',
      'affiliate_click',
      'checkout:initiated'
    ]);

    // Funnel 4: Engagement funnel
    this.defineFunnel('engagement', [
      'app:ready',
      'user:onboardingComplete',
      'checkin:logged',
      'checkin:streakUpdated'
    ]);
  }

  /**
   * Define a custom funnel
   * @param {string} funnelName - Unique funnel ID
   * @param {Array<string>} steps - Event names in order
   * @returns {void}
   */
  defineFunnel(funnelName, steps) {
    if (!Array.isArray(steps) || steps.length < 2) {
      throw new Error('Funnel must have at least 2 steps');
    }

    this.#funnels.set(funnelName, {
      name: funnelName,
      steps,
      created: Date.now()
    });

    logger.info(`[FunnelEngine] Funnel defined: "${funnelName}" (${steps.length} steps)`);
  }

  /**
   * Track funnel step for a session
   * @param {string} sessionId - Anonymous session
   * @param {string} funnelName - Which funnel
   * @param {string} stepName - Event name
   * @returns {Promise<void>}
   */
  async trackFunnelStep(sessionId, funnelName, stepName) {
    const funnel = this.#funnels.get(funnelName);
    if (!funnel) {
      logger.warn(`[FunnelEngine] Unknown funnel: "${funnelName}"`);
      return;
    }

    const stepIndex = funnel.steps.indexOf(stepName);
    if (stepIndex === -1) {
      // Event not in this funnel, ignore
      return;
    }

    // Store funnel progression
    await analyticsStorage.addEvent({
      eventId: `funnel-${funnelName}-${sessionId}-${stepIndex}`,
      eventName: 'analytics:funnelStep',
      payload: {
        funnelName,
        sessionId,
        stepName,
        stepIndex,
        timestamp: Date.now()
      },
      sessionId,
      userId: null,
      timestamp: Date.now(),
      url: '',
      userAgent: '',
      device: 'unknown'
    });
  }

  /**
   * Analyze funnel conversion for a date range
   * @param {string} funnelName - Which funnel to analyze
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @returns {Promise<Object>} FunnelConversion
   */
  async analyzeFunnel(funnelName, startDateISO, endDateISO) {
    const funnel = this.#funnels.get(funnelName);
    if (!funnel) {
      throw new Error(`Unknown funnel: "${funnelName}"`);
    }

    const startMs = new Date(`${startDateISO}T00:00:00Z`).getTime();
    const endMs = new Date(`${endDateISO}T23:59:59Z`).getTime();

    // Get all events in date range
    const events = await analyticsStorage.getEventsBetween(startMs, endMs);

    // Track which sessions reached which steps
    const sessions = new Map();  // sessionId -> array of reached step indices

    events.forEach(event => {
      // Check if event is in this funnel
      const stepIndex = funnel.steps.indexOf(event.eventName);
      if (stepIndex !== -1) {
        if (!sessions.has(event.sessionId)) {
          sessions.set(event.sessionId, new Set());
        }
        sessions.get(event.sessionId).add(stepIndex);
      }
    });

    // Calculate step progression
    const steps = [];
    const cohortSize = sessions.size;

    funnel.steps.forEach((eventName, stepIndex) => {
      let count = 0;
      sessions.forEach(reachedSteps => {
        if (reachedSteps.has(stepIndex)) {
          count++;
        }
      });

      steps.push({
        stepIndex,
        eventName,
        count,
        percentage: cohortSize > 0 ? Math.round((count / cohortSize) * 1000) / 10 : 0
      });
    });

    // Calculate dropoffs
    const dropoffs = [];
    for (let i = 0; i < funnel.steps.length - 1; i++) {
      const from = steps[i].count;
      const to = steps[i + 1].count;
      const dropoff = from - to;

      dropoffs.push({
        fromStep: funnel.steps[i],
        toStep: funnel.steps[i + 1],
        fromIndex: i,
        toIndex: i + 1,
        count: dropoff,
        percentage: from > 0 ? Math.round((dropoff / from) * 1000) / 10 : 0,
        label: `${funnel.steps[i]} → ${funnel.steps[i + 1]}`
      });
    }

    // Calculate overall conversion
    const completions = steps[funnel.steps.length - 1].count;
    const conversionRate = cohortSize > 0
      ? Math.round((completions / cohortSize) * 1000) / 10
      : 0;

    return {
      funnelName,
      dateRange: `${startDateISO} to ${endDateISO}`,
      cohortSize,
      steps,
      dropoffs,
      totalCompletions: completions,
      conversionRate,
      analysis: this.#analyzeFunnelInsights(steps, dropoffs)
    };
  }

  /**
   * Generate insights from funnel data
   * @private
   */
  #analyzeFunnelInsights(steps, dropoffs) {
    const insights = [];

    // Find biggest dropoff
    const biggestDropoff = dropoffs.reduce((max, current) =>
      current.count > max.count ? current : max,
      dropoffs[0]
    );

    if (biggestDropoff && biggestDropoff.percentage > 20) {
      insights.push({
        type: 'warning',
        message: `Large dropoff (${biggestDropoff.percentage}%) from "${biggestDropoff.fromStep}" to "${biggestDropoff.toStep}"`,
        metric: biggestDropoff.percentage,
        step: biggestDropoff.label
      });
    }

    // Check if early stage has low adoption
    if (steps[0].count < 10) {
      insights.push({
        type: 'info',
        message: 'Low early-stage adoption. Consider optimization.',
        metric: steps[0].count,
        step: steps[0].eventName
      });
    }

    return insights;
  }

  /**
   * Get all defined funnels
   * @returns {Array<Object>}
   */
  getFunnels() {
    return Array.from(this.#funnels.values());
  }

  /**
   * Compare two funnels (e.g., last week vs this week)
   * @param {string} funnelName
   * @param {string} period1Start, period1End - First period
   * @param {string} period2Start, period2End - Second period
   * @returns {Promise<Object>}
   */
  async compareFunnels(funnelName, period1Start, period1End, period2Start, period2End) {
    const period1 = await this.analyzeFunnel(funnelName, period1Start, period1End);
    const period2 = await this.analyzeFunnel(funnelName, period2Start, period2End);

    return {
      funnelName,
      period1: { dateRange: `${period1Start} to ${period1End}`, ...period1 },
      period2: { dateRange: `${period2Start} to ${period2End}`, ...period2 },
      delta: {
        conversionRateChange: Math.round((period2.conversionRate - period1.conversionRate) * 10) / 10,
        cohortSizeChange: period2.cohortSize - period1.cohortSize,
        improved: period2.conversionRate > period1.conversionRate
      }
    };
  }

  /**
   * Get conversion rate for a specific step transition
   * @param {string} funnelName
   * @param {string} fromStep
   * @param {string} toStep
   * @param {string} startDateISO
   * @param {string} endDateISO
   * @returns {Promise<Object>}
   */
  async getStepConversionRate(funnelName, fromStep, toStep, startDateISO, endDateISO) {
    const analysis = await this.analyzeFunnel(funnelName, startDateISO, endDateISO);
    const dropoff = analysis.dropoffs.find(d =>
      d.fromStep === fromStep && d.toStep === toStep
    );

    if (!dropoff) {
      return {
        error: 'Step transition not found in funnel',
        fromStep,
        toStep,
        funnelName
      };
    }

    const fromStepData = analysis.steps.find(s => s.eventName === fromStep);
    return {
      funnelName,
      fromStep,
      toStep,
      usersAtFromStep: fromStepData.count,
      usersAtToStep: analysis.steps.find(s => s.eventName === toStep).count,
      conversionRate: 100 - dropoff.percentage,  // inverse of dropoff
      dropoffPercentage: dropoff.percentage
    };
  }
}

// Export singleton
export const funnelEngine = new FunnelEngine();
