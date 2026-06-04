// ============================================================
// Analytics Types — SupliList v4.0
// JSDoc type definitions for analytics engine
// ============================================================

/**
 * @typedef {Object} RawAnalyticsEvent
 * @property {string} eventName - Event from EventBus (e.g., 'checkin:logged')
 * @property {*} payload - Original payload from EventBus
 * @property {number} timestamp - Date.now() when captured
 */

/**
 * @typedef {Object} EnrichedAnalyticsEvent
 * @property {string} eventId - UUID/hash for deduplication
 * @property {string} eventName - Event type from EventBus
 * @property {*} payload - Original payload
 * @property {string} sessionId - Anonymous fingerprint (consistent across session)
 * @property {string|null} userId - user.id from StateManager (null if not onboarded)
 * @property {number} timestamp - When event occurred (ms)
 * @property {string} [url] - Current page URL (pathname only, no query)
 * @property {string} [userAgent] - Redacted user agent (browser + OS only)
 * @property {number} [duration] - Optional: milliseconds for action
 */

/**
 * @typedef {Object} AnalyticsMetrics
 * @property {number} dau - Daily Active Users (unique sessionIds)
 * @property {number} wau - Weekly Active Users
 * @property {number} mau - Monthly Active Users
 * @property {number} timestamp - When metrics were calculated
 * @property {string} date - ISO date (YYYY-MM-DD)
 * @property {Object} retentionCurve - D0-D90 retention percentages
 */

/**
 * @typedef {Object} RetentionCurve
 * @property {number} D0 - Always 100 (cohort definition day)
 * @property {number} D1 - % who returned day 1
 * @property {number} D7 - % who returned day 7
 * @property {number} D14 - % who returned day 14
 * @property {number} D30 - % who returned day 30
 * @property {number} D60 - % who returned day 60
 * @property {number} D90 - % who returned day 90
 */

/**
 * @typedef {Object} FunnelStep
 * @property {string} eventName - Event that marks this step
 * @property {number} count - # of users/sessions that reached here
 * @property {number} percentage - % of total cohort
 */

/**
 * @typedef {Object} FunnelConversion
 * @property {string} funnelName - Name of funnel (e.g., 'free-to-premium')
 * @property {FunnelStep[]} steps - Steps in order
 * @property {Array<{from: string, to: string, count: number, percentage: number}>} dropoffs - Where users dropped
 * @property {number} totalEntries - Users who started funnel
 * @property {number} totalCompletions - Users who completed
 * @property {number} conversionRate - % (0-100)
 */

/**
 * @typedef {Object} AffiliateClick
 * @property {string} clickId - UUID for this click
 * @property {string} sessionId - Anonymous session
 * @property {string} utmSource - 'amazon' | 'ml' | 'shopee'
 * @property {string} utmMedium - Usually 'internal-link'
 * @property {string} utmCampaign - Campaign name + date (e.g., 'stack-rec-20260601')
 * @property {string} supplementId - Which supplement was clicked
 * @property {string} supplementName - Supplement name
 * @property {number} timestamp - When clicked
 * @property {boolean} [converted] - Whether user completed purchase (from Stripe webhook)
 * @property {number} [conversionValue] - Revenue if converted
 */

/**
 * @typedef {Object} UserSegment
 * @property {string} id - Segment ID
 * @property {string} name - Human name ('Bulk Enthusiasts', etc)
 * @property {number} count - # users in segment
 * @property {Object} profile - Aggregated profile
 *   @property {number} avgWeight - kg
 *   @property {string} topObjective - 'bulk' | 'cut' | etc
 *   @property {number} avgBudget - Monthly budget (BRL)
 * @property {number} avgLTV - Average lifetime value (BRL)
 * @property {number} retention30d - % retention at D30
 */

/**
 * @typedef {Object} LTVEstimate
 * @property {number} baseValue - From affiliate commissions + free tier
 * @property {number} premiumValue - From Stripe subscriptions
 * @property {number} totalLTV - Estimated lifetime value (BRL)
 * @property {number} cohortLTV - Average for user's cohort
 * @property {number} percentile - 0-100, ranking in cohort
 * @property {number} confidence - 0-100, how confident the estimate is
 * @property {string} segment - Which user segment they belong to
 */

/**
 * @typedef {Object} SessionData
 * @property {string} sessionId - Anonymous session fingerprint
 * @property {number} startTime - When session began
 * @property {number} [endTime] - When session ended (if available)
 * @property {number} duration - Total session duration in ms
 * @property {number} eventCount - # events in session
 * @property {Array<string>} eventNames - Unique events in session
 * @property {string|null} userId - user.id if onboarded
 * @property {string} device - Device type ('mobile' | 'tablet' | 'desktop')
 */

export const ANALYTICS_TYPES = {
  RawAnalyticsEvent: 'RawAnalyticsEvent',
  EnrichedAnalyticsEvent: 'EnrichedAnalyticsEvent',
  AnalyticsMetrics: 'AnalyticsMetrics',
  FunnelConversion: 'FunnelConversion',
  AffiliateClick: 'AffiliateClick',
  UserSegment: 'UserSegment',
  LTVEstimate: 'LTVEstimate',
  SessionData: 'SessionData'
};
