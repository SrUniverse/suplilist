import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metricsAggregator } from './metrics-aggregator.js';
import { analyticsStorage } from './storage/analytics-storage.js';
import { stateManager } from '../state/state-manager.js';

let mockEvents = [];
let mockUniqueSessionCount = 0;

vi.mock('./storage/analytics-storage.js', () => ({
  analyticsStorage: {
    addEvent: vi.fn(async (event) => {
      mockEvents.push(event);
    }),
    getEvents: vi.fn(async () => mockEvents),
    getEventsBetween: vi.fn(async (start, end) => {
      return mockEvents.filter(e => e.timestamp >= start && e.timestamp <= end);
    }),
    getEventsByName: vi.fn(async (name) => {
      return mockEvents.filter(e => e.eventName === name);
    }),
    countUniqueSessionIds: vi.fn(async () => mockUniqueSessionCount)
  }
}));

vi.mock('../state/state-manager.js', () => ({
  stateManager: {
    getState: vi.fn(),
    get state() { return this.getState(); }
  }
}));

describe('metrics-aggregator — Analytics Brain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvents = [];
    mockUniqueSessionCount = 0;
    metricsAggregator.clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Active Users (DAU/WAU/MAU)', () => {
    it('1. getDAU() counts unique sessions and caches results', async () => {
      mockUniqueSessionCount = 5;

      const dau1 = await metricsAggregator.getDAU('2026-06-01');
      expect(dau1).toBe(5);
      expect(analyticsStorage.countUniqueSessionIds).toHaveBeenCalledWith('2026-06-01');

      // Call again (hits cache)
      const dau2 = await metricsAggregator.getDAU('2026-06-01');
      expect(dau2).toBe(5);
      expect(analyticsStorage.countUniqueSessionIds).toHaveBeenCalledTimes(1);
    });

    it('2. getWAU() aggregates unique sessionIds over a 7-day period', async () => {
      const todayMs = Date.now();

      // Events inside current week
      mockEvents.push({ sessionId: 'session-1', timestamp: todayMs });
      mockEvents.push({ sessionId: 'session-2', timestamp: todayMs - 1 * 24 * 3600 * 1000 });
      mockEvents.push({ sessionId: 'session-1', timestamp: todayMs - 2 * 24 * 3600 * 1000 }); // Dup

      const wau = await metricsAggregator.getWAU(0);
      expect(wau).toBe(2);
    });

    it('3. getMAU() aggregates unique sessionIds over a 30-day period', async () => {
      const todayMs = Date.now();

      mockEvents.push({ sessionId: 'session-1', timestamp: todayMs });
      mockEvents.push({ sessionId: 'session-2', timestamp: todayMs - 1 * 3600 * 1000 });
      mockEvents.push({ sessionId: 'session-3', timestamp: todayMs - 2 * 3600 * 1000 });

      const mau = await metricsAggregator.getMAU(0);
      expect(mau).toBe(3);
    });
  });

  describe('User Retention Curves', () => {
    it('4. getRetention() calculates percentage of users who returned on Day N', async () => {
      // Day 0: 3 users active
      mockUniqueSessionCount = 3;
      const startMs = new Date('2026-06-01T00:00:00Z').getTime();

      mockEvents.push({ sessionId: 's1', timestamp: startMs + 10 });
      mockEvents.push({ sessionId: 's2', timestamp: startMs + 20 });
      mockEvents.push({ sessionId: 's3', timestamp: startMs + 30 });

      // Day 7: s1 and s3 returned, s2 did not
      const day7Ms = startMs + 7 * 24 * 3600 * 1000;
      mockEvents.push({ sessionId: 's1', timestamp: day7Ms + 10 });
      mockEvents.push({ sessionId: 's3', timestamp: day7Ms + 30 });
      mockEvents.push({ sessionId: 's4', timestamp: day7Ms + 50 }); // New user

      const retention = await metricsAggregator.getRetention('2026-06-01', 7);

      expect(retention.cohortSize).toBe(3);
      expect(retention.retained).toBe(2); // s1 & s3
      expect(retention.retentionRate).toBe(66.7); // 2 out of 3 (66.7%)
    });

    it('5. getRetention() returns zero if cohort size is empty', async () => {
      mockUniqueSessionCount = 0;
      const res = await metricsAggregator.getRetention('2026-06-01', 7);
      expect(res.cohortSize).toBe(0);
      expect(res.retentionRate).toBe(0);
    });

    it('6. getRetentionCurve() computes full curve intervals D0 to D90', async () => {
      mockUniqueSessionCount = 2;
      const curve = await metricsAggregator.getRetentionCurve('2026-06-01');

      expect(curve.D0).toBe(100);
      expect(curve.D1).toBeDefined();
      expect(curve.D7).toBeDefined();
    });
  });

  describe('Business Metrics & Affiliate click conversions', () => {
    it('7. trackAffiliateClick() enriches details and records tracking event', async () => {
      const clickData = {
        sessionId: 'session-xyz',
        supplementId: 'creatina-1',
        supplementName: 'Creatina Monohidratada',
        utmSource: 'amazon',
        utmCampaign: 'stack-rec'
      };

      await metricsAggregator.trackAffiliateClick(clickData);

      expect(analyticsStorage.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'analytics:affiliateClick',
          sessionId: 'session-xyz',
          payload: expect.objectContaining({
            utmSource: 'amazon',
            utmCampaign: 'stack-rec'
          })
        })
      );
    });

    it('8. getAffiliateStats() calculates conversions, commissions, and revenue', async () => {
      const click1 = {
        eventName: 'analytics:affiliateClick',
        timestamp: Date.now(),
        payload: { utmSource: 'ml', converted: true, conversionValue: 100 }
      };
      const click2 = {
        eventName: 'analytics:affiliateClick',
        timestamp: Date.now(),
        payload: { utmSource: 'ml', converted: false }
      };
      mockEvents.push(click1, click2);

      const stats = await metricsAggregator.getAffiliateStats('ml');

      expect(stats.totalClicks).toBe(2);
      expect(stats.conversions).toBe(1);
      expect(stats.conversionRate).toBe(50); // 50%
      expect(stats.totalRevenue).toBe(100);
      expect(stats.estimatedCommission).toBe(12); // ML rate 12% = 12 BRL
    });

    it('9. getMarketplaceComparison() compares commission yields across marketplaces', async () => {
      mockEvents.push({
        eventName: 'analytics:affiliateClick',
        timestamp: Date.now(),
        payload: { utmSource: 'amazon', converted: true, conversionValue: 100 }
      });

      const comparison = await metricsAggregator.getMarketplaceComparison();
      expect(comparison).toHaveLength(3); // amazon, ml, shopee
      expect(comparison[0].utmSource).toBe('amazon'); // Most revenue first
    });

    it('10. getTopSupplements() ranks best selling supplements by clicks', async () => {
      mockEvents.push({
        eventName: 'analytics:affiliateClick',
        payload: { supplementId: 'creatina', supplementName: 'Creatina', utmSource: 'amazon', converted: true, conversionValue: 50 }
      });
      mockEvents.push({
        eventName: 'analytics:affiliateClick',
        payload: { supplementId: 'creatina', supplementName: 'Creatina', utmSource: 'amazon', converted: false }
      });
      mockEvents.push({
        eventName: 'analytics:affiliateClick',
        payload: { supplementId: 'whey', supplementName: 'Whey', utmSource: 'shopee', converted: false }
      });

      const top = await metricsAggregator.getTopSupplements(null, 5);

      expect(top).toHaveLength(2);
      expect(top[0].supplementId).toBe('creatina'); // 2 clicks vs 1 click
      expect(top[0].clicks).toBe(2);
      expect(top[0].conversionRate).toBe(50);
    });
  });

  describe('Lifetime Value (LTV) Estimations', () => {
    it('11. estimateLTV() forecasts total future revenues based on budget and objective', async () => {
      const userProfile = {
        id: 'user-123',
        tier: 'pro',
        weight: 90,
        objective: 'bulk',
        budget: 400
      };
      stateManager.getState.mockReturnValue({ user: userProfile });

      // Clicks and checkins mocks to raise factors
      mockEvents.push({ eventName: 'checkin:logged', userId: 'user-123' });
      mockEvents.push({ eventName: 'affiliate_click', sessionId: 'user-123' }); // session as userId contribution check

      const forecast = await metricsAggregator.estimateLTV('user-123');

      expect(forecast.userId).toBe('user-123');
      expect(forecast.segment).toBe('bulk-enthusiasts');
      expect(forecast.tierValue).toBe(1.5); // Pro tier multiplier
      expect(forecast.monthlyRevenue).toBe(400); // Equal to budget
      expect(forecast.totalLTV).toBeGreaterThan(0);
    });

    it('12. estimateLTV() handles empty profiles gracefully', async () => {
      stateManager.getState.mockReturnValue(null);

      const res = await metricsAggregator.estimateLTV('anonymous-user');
      expect(res.error).toBeDefined();
    });

    it('13. getCohortLTV() aggregates average onboarding valuations', async () => {
      mockEvents.push({
        eventName: 'user:onboardingComplete',
        timestamp: new Date('2026-06-01T12:00:00Z').getTime()
      });

      const res = await metricsAggregator.getCohortLTV('2026-06-01');

      expect(res.cohortSize).toBe(1);
      expect(res.totalLTV).toBe(150); // Cohort constant R$150 estimate
      expect(res.avgLTV).toBe(150);
    });

    it('14. compareSegments() returns static segment lists', async () => {
      const segments = await metricsAggregator.compareSegments();
      expect(segments.length).toBe(4);
      expect(segments[0].segmentId).toBe('bulk-enthusiasts');
    });
  });
});
