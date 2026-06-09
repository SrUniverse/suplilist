import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../state/state-manager.js', () => ({
  stateManager: {
    select: vi.fn((fn) => fn({
      checkins: [],
      stack: [],
      profile: { name: 'Test', email: 'test@example.com' }
    }))
  }
}));

import { ReportGenerator } from './report-generator.js';

const mockStack = [
  { supplementId: 'vitD', name: 'Vitamina D' },
  { supplementId: 'omega3', name: 'Ômega 3' }
];

const makeCheckin = (date, supplementId, taken = true) => ({ date, supplementId, taken });

describe('ReportGenerator', () => {
  let gen;

  beforeEach(() => {
    gen = new ReportGenerator();
  });

  describe('getMonthStart / getMonthEnd', () => {
    it('should return correct month start', () => {
      expect(gen.getMonthStart(2026, 6)).toBe('2026-06-01');
    });

    it('should return correct month end', () => {
      expect(gen.getMonthEnd(2026, 6)).toBe('2026-06-30');
    });

    it('should handle February in leap year', () => {
      expect(gen.getMonthEnd(2024, 2)).toBe('2024-02-29');
    });

    it('should handle February in non-leap year', () => {
      expect(gen.getMonthEnd(2023, 2)).toBe('2023-02-28');
    });
  });

  describe('getMonthName', () => {
    it('should return Portuguese month names', () => {
      expect(gen.getMonthName(1)).toBe('Janeiro');
      expect(gen.getMonthName(6)).toBe('Junho');
      expect(gen.getMonthName(12)).toBe('Dezembro');
    });
  });

  describe('getDayCount', () => {
    it('should count days in a date range', () => {
      const count = gen.getDayCount('2026-06-01', '2026-06-30');
      expect(count).toBe(30);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate 0% adherence for empty checkins', () => {
      const metrics = gen.calculateMetrics([], mockStack, '2026-06-01', '2026-06-30');
      expect(metrics.adherencePercent).toBe(0);
      expect(metrics.perfectDays).toBe(0);
    });

    it('should calculate adherence percent', () => {
      const checkins = [
        makeCheckin('2026-06-01', 'vitD'),
        makeCheckin('2026-06-01', 'omega3'),
      ];
      const metrics = gen.calculateMetrics(checkins, mockStack, '2026-06-01', '2026-06-30');
      expect(metrics.adherencePercent).toBeGreaterThan(0);
      expect(metrics.perfectDays).toBe(1);
    });

    it('should return trend as improving or declining', () => {
      const metrics = gen.calculateMetrics([], mockStack, '2026-06-01', '2026-06-30');
      expect(['improving', 'declining']).toContain(metrics.trend);
    });

    it('should return days count', () => {
      const metrics = gen.calculateMetrics([], mockStack, '2026-06-01', '2026-06-30');
      expect(metrics.days).toBe(30);
    });
  });

  describe('generateInsights', () => {
    it('should return positive insight for high adherence', () => {
      const metrics = { adherencePercent: 95, trend: 'improving', improvementPercent: 10, perfectDays: 25, bestDay: { date: '2026-06-15', percent: 100 }, worstDay: { date: '2026-06-20', percent: 0 } };
      const insights = gen.generateInsights([], mockStack, metrics);
      expect(Array.isArray(insights)).toBe(true);
      const positive = insights.filter(i => i.type === 'positive');
      expect(positive.length).toBeGreaterThan(0);
    });

    it('should return warning for low adherence', () => {
      const metrics = { adherencePercent: 30, trend: 'declining', improvementPercent: 5, perfectDays: 0, bestDay: { date: '2026-06-01', percent: 50 }, worstDay: { date: '2026-06-30', percent: 0 } };
      const insights = gen.generateInsights([], mockStack, metrics);
      const warnings = insights.filter(i => i.type === 'warning');
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('generateBadges', () => {
    it('should return array of badges', () => {
      const metrics = { adherencePercent: 95, perfectDays: 25 };
      const badges = gen.generateBadges([], mockStack, metrics);
      expect(Array.isArray(badges)).toBe(true);
    });
  });

  describe('generateMonthlyReport', () => {
    it('should generate a complete report', () => {
      const report = gen.generateMonthlyReport(2026, 6);
      expect(report).toHaveProperty('year', 2026);
      expect(report).toHaveProperty('month', 6);
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('insights');
      expect(report).toHaveProperty('comparison');
    });

    it('should cache reports', () => {
      const report1 = gen.generateMonthlyReport(2026, 5);
      const report2 = gen.generateMonthlyReport(2026, 5);
      expect(report1).toBe(report2);
    });

    it('should include month name', () => {
      const report = gen.generateMonthlyReport(2026, 6);
      expect(report.monthName).toBe('Junho');
    });
  });

  describe('getTopSupplements', () => {
    it('should return array', () => {
      const tops = gen.getTopSupplements([], mockStack);
      expect(Array.isArray(tops)).toBe(true);
    });

    it('should rank by check-in count', () => {
      const checkins = [
        makeCheckin('2026-06-01', 'vitD'),
        makeCheckin('2026-06-02', 'vitD'),
        makeCheckin('2026-06-01', 'omega3'),
      ];
      const tops = gen.getTopSupplements(checkins, mockStack);
      expect(tops[0].name).toBe('Vitamina D');
      expect(tops[0].taken).toBe(2);
    });
  });
});
