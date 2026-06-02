// ============================================================
// AffiliateTracker — SupliList v4.0
// Tracks affiliate links, conversions, and revenue
// ============================================================

import { analyticsStorage, STORES } from './storage/analytics-storage.js';
import { generateUUID } from './utils/crypto-utils.js';
import { logger } from '../utils/logger.js';

/**
 * Tracks affiliate marketing performance
 * Links → clicks → conversions → revenue
 */
export class AffiliateTracker {
  constructor() {
    this.marketplaces = new Map([
      ['amazon', { name: 'Amazon Associates', commissionRate: 0.10 }],
      ['ml', { name: 'Mercado Livre Afiliados', commissionRate: 0.12 }],
      ['shopee', { name: 'Shopee Afiliados', commissionRate: 0.08 }]
    ]);
  }

  /**
   * Track an affiliate click
   * @param {Object} click - Click data
   * @returns {Promise<void>}
   */
  async trackClick(click) {
    const clickId = generateUUID();

    const enrichedClick = {
      clickId,
      sessionId: click.sessionId,
      supplementId: click.supplementId,
      supplementName: click.supplementName,
      utmSource: click.utmSource,  // 'amazon' | 'ml' | 'shopee'
      utmMedium: click.utmMedium || 'internal-link',
      utmCampaign: click.utmCampaign,
      url: click.url,
      timestamp: Date.now(),
      converted: false,
      conversionValue: null
    };

    await analyticsStorage.addEvent({
      eventId: `affiliate-click-${clickId}`,
      eventName: 'analytics:affiliateClick',
      payload: enrichedClick,
      sessionId: click.sessionId,
      userId: null,
      timestamp: Date.now(),
      url: '',
      userAgent: '',
      device: 'unknown'
    });

    logger.debug(`[AffiliateTracker] Click tracked: ${click.supplementName} → ${click.utmSource}`);
  }

  /**
   * Mark a click as converted (from Stripe webhook or checkout event)
   * @param {string} clickId - UUID from trackClick
   * @param {number} conversionValue - Revenue in BRL
   * @returns {Promise<void>}
   */
  async markConversion(clickId, conversionValue) {
    // In real scenario, would update IndexedDB
    // For now, log conversion
    logger.info(`[AffiliateTracker] Conversion: ${clickId} = R$${conversionValue}`);
  }

  /**
   * Get clicks for a marketplace
   * @param {string} utmSource - 'amazon' | 'ml' | 'shopee'
   * @param {string} [startDateISO] - YYYY-MM-DD (optional)
   * @param {string} [endDateISO] - YYYY-MM-DD (optional)
   * @returns {Promise<Object[]>}
   */
  async getClicksBySource(utmSource, startDateISO = null, endDateISO = null) {
    let clicks = await analyticsStorage.getClicksBySource(utmSource);

    // Filter by date if provided
    if (startDateISO && endDateISO) {
      const startMs = new Date(`${startDateISO}T00:00:00Z`).getTime();
      const endMs = new Date(`${endDateISO}T23:59:59Z`).getTime();
      clicks = clicks.filter(c => c.timestamp >= startMs && c.timestamp <= endMs);
    }

    return clicks;
  }

  /**
   * Get performance stats for a marketplace
   * @param {string} utmSource - 'amazon' | 'ml' | 'shopee'
   * @param {string} [startDateISO] - YYYY-MM-DD
   * @param {string} [endDateISO] - YYYY-MM-DD
   * @returns {Promise<Object>}
   */
  async getSourceStats(utmSource, startDateISO = null, endDateISO = null) {
    const clicks = await this.getClicksBySource(utmSource, startDateISO, endDateISO);
    const marketplace = this.marketplaces.get(utmSource);

    if (!marketplace) {
      throw new Error(`Unknown marketplace: ${utmSource}`);
    }

    // Calculate stats
    const totalClicks = clicks.length;
    const conversions = clicks.filter(c => c.converted).length;
    const totalRevenue = clicks
      .filter(c => c.converted)
      .reduce((sum, c) => sum + (c.conversionValue || 0), 0);

    const conversionRate = totalClicks > 0
      ? (conversions / totalClicks) * 100
      : 0;

    const estimatedCommission = totalRevenue * marketplace.commissionRate;

    return {
      marketplace: marketplace.name,
      utmSource,
      dateRange: startDateISO && endDateISO ? `${startDateISO} to ${endDateISO}` : 'all-time',
      totalClicks,
      conversions,
      conversionRate: Math.round(conversionRate * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      estimatedCommission: Math.round(estimatedCommission * 100) / 100,
      commissionRate: Math.round(marketplace.commissionRate * 100) + '%',
      avgRevenuePerClick: totalClicks > 0
        ? Math.round((totalRevenue / totalClicks) * 100) / 100
        : 0
    };
  }

  /**
   * Get performance by marketplace (comparison)
   * @param {string} startDateISO - YYYY-MM-DD
   * @param {string} endDateISO - YYYY-MM-DD
   * @returns {Promise<Array<Object>>}
   */
  async getMarketplaceComparison(startDateISO, endDateISO) {
    const stats = [];

    for (const [utmSource] of this.marketplaces) {
      const stat = await this.getSourceStats(utmSource, startDateISO, endDateISO);
      stats.push(stat);
    }

    // Sort by revenue
    stats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return stats;
  }

  /**
   * Get top supplements by clicks
   * @param {string} utmSource - Optional filter by marketplace
   * @param {number} limit - How many to return
   * @returns {Promise<Array<Object>>}
   */
  async getTopSupplements(utmSource = null, limit = 10) {
    const allEvents = await analyticsStorage.getEvents();

    // Filter affiliate clicks
    const clicks = allEvents
      .filter(e => e.eventName === 'analytics:affiliateClick')
      .filter(c => !utmSource || c.payload.utmSource === utmSource);

    // Count by supplement
    const supplementCounts = {};
    clicks.forEach(click => {
      const suppId = click.payload.supplementId;
      const suppName = click.payload.supplementName;

      if (!supplementCounts[suppId]) {
        supplementCounts[suppId] = {
          supplementId: suppId,
          supplementName: suppName,
          clicks: 0,
          conversions: 0,
          revenue: 0
        };
      }

      supplementCounts[suppId].clicks++;
      if (click.payload.converted) {
        supplementCounts[suppId].conversions++;
        supplementCounts[suppId].revenue += click.payload.conversionValue || 0;
      }
    });

    // Sort by clicks, return top N
    return Object.values(supplementCounts)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit)
      .map(s => ({
        ...s,
        conversionRate: s.clicks > 0
          ? Math.round((s.conversions / s.clicks) * 1000) / 10
          : 0,
        revenue: Math.round(s.revenue * 100) / 100
      }));
  }

  /**
   * Get top campaigns
   * @param {number} limit - How many to return
   * @returns {Promise<Array<Object>>}
   */
  async getTopCampaigns(limit = 10) {
    const allEvents = await analyticsStorage.getEvents();

    const campaignStats = {};
    allEvents
      .filter(e => e.eventName === 'analytics:affiliateClick')
      .forEach(click => {
        const campaign = click.payload.utmCampaign;
        if (!campaignStats[campaign]) {
          campaignStats[campaign] = {
            campaign,
            clicks: 0,
            conversions: 0,
            revenue: 0
          };
        }

        campaignStats[campaign].clicks++;
        if (click.payload.converted) {
          campaignStats[campaign].conversions++;
          campaignStats[campaign].revenue += click.payload.conversionValue || 0;
        }
      });

    return Object.values(campaignStats)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, limit)
      .map(c => ({
        ...c,
        conversionRate: c.clicks > 0
          ? Math.round((c.conversions / c.clicks) * 1000) / 10
          : 0,
        revenue: Math.round(c.revenue * 100) / 100
      }));
  }

  /**
   * Estimate LTV from affiliate performance
   * @param {string} supplementId
   * @param {number} conversions - Total conversions
   * @returns {Object}
   */
  estimateLTVFromAffiliate(supplementId, conversions) {
    // Rough estimate: avg product price ~R$100, conversion value ~R$20
    // Affiliate commission = 10% of revenue
    const avgRevenue = 100;
    const grossRevenue = avgRevenue * conversions;
    const affiliateCommission = grossRevenue * 0.10;  // 10% avg

    return {
      supplementId,
      conversions,
      estimatedRevenue: Math.round(grossRevenue * 100) / 100,
      estimatedCommission: Math.round(affiliateCommission * 100) / 100
    };
  }

  /**
   * Get all marketplaces
   * @returns {Array<Object>}
   */
  getMarketplaces() {
    return Array.from(this.marketplaces.values()).map((m, i) => ({
      name: m.name,
      key: Array.from(this.marketplaces.keys())[i],
      commissionRate: Math.round(m.commissionRate * 100) + '%'
    }));
  }
}

// Export singleton
export const affiliateTracker = new AffiliateTracker();
