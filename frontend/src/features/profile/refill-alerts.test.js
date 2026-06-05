import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateDaysUntilRefill,
  getAlertLevel,
  getRefillAlerts,
  getAlertColor,
  getAlertMessage,
  createPurchaseRecord,
  getSupplementSpending,
  getBestPriceSource,
} from './refill-alerts.js';

describe('Refill Alerts', () => {
  let mockPurchases;
  let now;

  beforeEach(() => {
    now = Date.now();
    mockPurchases = [
      // Creatine: 300g, 5g/day = 60 days, purchased 20 days ago = 40 days left
      {
        supplementId: 'creatine',
        quantity: 300,
        dailyConsumption: 5,
        purchasedAt: now - (20 * 24 * 60 * 60 * 1000),
        price: 45.90,
        source: 'Amazon',
        status: 'active',
      },
      // Whey: 1000g, 30g/day = 33 days, purchased 25 days ago = 8 days left
      {
        supplementId: 'whey',
        quantity: 1000,
        dailyConsumption: 30,
        purchasedAt: now - (25 * 24 * 60 * 60 * 1000),
        price: 89.90,
        source: 'Nutrilibrium',
        status: 'active',
      },
      // Vitamin D: 60 pills, 1/day = 60 days, purchased 55 days ago = 5 days left (critical)
      {
        supplementId: 'vitamin-d',
        quantity: 60,
        dailyConsumption: 1,
        purchasedAt: now - (55 * 24 * 60 * 60 * 1000),
        price: 25.00,
        source: 'Amazon',
        status: 'active',
      },
      // Magnesium: 200g, 500mg/day = 400 days, purchased 10 days ago = 390 days left
      {
        supplementId: 'magnesium',
        quantity: 200000, // 200g in mg
        dailyConsumption: 500,
        purchasedAt: now - (10 * 24 * 60 * 60 * 1000),
        price: 35.00,
        source: 'Amazon',
        status: 'active',
      },
    ];
  });

  describe('calculateDaysUntilRefill', () => {
    it('should calculate days remaining correctly', () => {
      const days = calculateDaysUntilRefill(mockPurchases[0]); // Creatine
      expect(days).toBeGreaterThanOrEqual(35); // At least 35 days
      expect(days).toBeLessThanOrEqual(45); // At most 45 days
    });

    it('should return 0 for invalid purchase', () => {
      expect(calculateDaysUntilRefill(null)).toBe(0);
      expect(calculateDaysUntilRefill({})).toBe(0);
      expect(calculateDaysUntilRefill({ quantity: 0 })).toBe(0);
    });

    it('should return 0 if already expired', () => {
      const expired = {
        supplementId: 'old-supp',
        quantity: 100,
        dailyConsumption: 50,
        purchasedAt: now - (100 * 24 * 60 * 60 * 1000), // 100 days ago
      };
      const days = calculateDaysUntilRefill(expired);
      expect(days).toBe(0); // Already expired
    });
  });

  describe('getAlertLevel', () => {
    it('should return critical for 0-3 days', () => {
      expect(getAlertLevel(0)).toBe('expired');
      expect(getAlertLevel(1)).toBe('critical');
      expect(getAlertLevel(3)).toBe('critical');
    });

    it('should return warning for 4-10 days', () => {
      expect(getAlertLevel(4)).toBe('warning');
      expect(getAlertLevel(7)).toBe('warning');
      expect(getAlertLevel(10)).toBe('warning');
    });

    it('should return info for 11-20 days', () => {
      expect(getAlertLevel(11)).toBe('info');
      expect(getAlertLevel(15)).toBe('info');
      expect(getAlertLevel(20)).toBe('info');
    });

    it('should return ok for 21+ days', () => {
      expect(getAlertLevel(21)).toBe('ok');
      expect(getAlertLevel(100)).toBe('ok');
    });
  });

  describe('getRefillAlerts', () => {
    it('should return alerts sorted by urgency', () => {
      const alerts = getRefillAlerts(mockPurchases);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].supplementId).toBe('vitamin-d'); // Most urgent (5 days)
      expect(alerts[1].supplementId).toBe('whey'); // Second (8 days)
    });

    it('should only include alerts for next 30 days', () => {
      const alerts = getRefillAlerts(mockPurchases);

      for (const alert of alerts) {
        expect(alert.daysRemaining).toBeLessThanOrEqual(30);
      }

      // Magnesium has 390 days, shouldn't be in alerts
      const magnesiumAlert = alerts.find(a => a.supplementId === 'magnesium');
      expect(magnesiumAlert).toBeUndefined();
    });

    it('should handle empty purchases array', () => {
      const alerts = getRefillAlerts([]);
      expect(alerts).toEqual([]);
    });

    it('should handle null/undefined', () => {
      expect(getRefillAlerts(null)).toEqual([]);
      expect(getRefillAlerts(undefined)).toEqual([]);
    });
  });

  describe('getAlertColor', () => {
    it('should return correct color for each level', () => {
      expect(getAlertColor('critical')).toBe('var(--color-error)');
      expect(getAlertColor('warning')).toBe('var(--color-warning)');
      expect(getAlertColor('info')).toBe('var(--color-info)');
      expect(getAlertColor('ok')).toBe('var(--color-success)');
    });
  });

  describe('getAlertMessage', () => {
    it('should return appropriate message for each level', () => {
      const critical = getAlertMessage('critical', 2);
      expect(critical).toContain('2 dias');
      expect(critical).toContain('AGORA');

      const warning = getAlertMessage('warning', 7);
      expect(warning).toContain('7 dias');

      const expired = getAlertMessage('expired', 0);
      expect(expired).toContain('expirado');
    });
  });

  describe('createPurchaseRecord', () => {
    it('should create valid purchase record', () => {
      const purchase = createPurchaseRecord('creatine', 300, 5, 45.90, 'Amazon');

      expect(purchase.supplementId).toBe('creatine');
      expect(purchase.quantity).toBe(300);
      expect(purchase.dailyConsumption).toBe(5);
      expect(purchase.price).toBe(45.90);
      expect(purchase.source).toBe('Amazon');
      expect(purchase.purchasedAt).toBeDefined();
      expect(purchase.status).toBe('active');
    });

    it('should throw error for missing required fields', () => {
      expect(() => createPurchaseRecord(null, 300, 5)).toThrow();
      expect(() => createPurchaseRecord('creatine', null, 5)).toThrow();
      expect(() => createPurchaseRecord('creatine', 300, null)).toThrow();
    });
  });

  describe('getSupplementSpending', () => {
    it('should calculate total spending on a supplement', () => {
      const spending = getSupplementSpending('creatine', mockPurchases);

      expect(spending.total).toBe(45.90);
      expect(spending.count).toBe(1);
      expect(spending.average).toBe(45.90);
    });

    it('should aggregate multiple purchases', () => {
      const multiplePurchases = [
        ...mockPurchases,
        {
          supplementId: 'creatine',
          quantity: 300,
          dailyConsumption: 5,
          purchasedAt: now - (100 * 24 * 60 * 60 * 1000),
          price: 42.00,
          source: 'Nutrilibrium',
          status: 'active',
        },
      ];

      const spending = getSupplementSpending('creatine', multiplePurchases);

      expect(spending.count).toBe(2);
      expect(spending.total).toBe(87.90);
      expect(spending.average).toBeCloseTo(43.95, 1);
    });

    it('should return 0 for supplement with no purchases', () => {
      const spending = getSupplementSpending('non-existent', mockPurchases);

      expect(spending.total).toBe(0);
      expect(spending.count).toBe(0);
      expect(spending.average).toBe(0);
    });
  });

  describe('getBestPriceSource', () => {
    it('should find cheapest source', () => {
      const multiplePurchases = [
        ...mockPurchases,
        {
          supplementId: 'creatine',
          quantity: 300,
          dailyConsumption: 5,
          purchasedAt: now - (100 * 24 * 60 * 60 * 1000),
          price: 39.90, // Cheaper than 45.90
          source: 'OleoShop',
          status: 'active',
        },
      ];

      const best = getBestPriceSource('creatine', multiplePurchases);

      expect(best.source).toBe('OleoShop');
      expect(best.price).toBe(39.90);
    });

    it('should return null for supplement with no source data', () => {
      const best = getBestPriceSource('non-existent', mockPurchases);

      expect(best.source).toBeNull();
      expect(best.price).toBeNull();
    });
  });
});
