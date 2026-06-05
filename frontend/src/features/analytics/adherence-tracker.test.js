import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  calculateAdherence,
  getTopSupplements,
  renderAdherenceChart,
  getAdherenceOverview,
  calculateStreak,
} from './adherence-tracker.js';

describe('Adherence Tracker', () => {
  let mockCheckins;
  let now;

  beforeEach(() => {
    now = Date.now();
    // Create mock checkins for testing
    // Simulate: User took Creatine 25/30 days, Whey 20/30 days, etc
    mockCheckins = [
      // Creatine: 25 days (83%)
      ...Array.from({ length: 25 }, (_, i) => ({
        supplementId: 'creatine',
        timestamp: now - (i * 24 * 60 * 60 * 1000),
      })),
      // Whey: 20 days (67%)
      ...Array.from({ length: 20 }, (_, i) => ({
        supplementId: 'whey',
        timestamp: now - (i * 24 * 60 * 60 * 1000),
      })),
      // Vitamin D: 15 days (50%)
      ...Array.from({ length: 15 }, (_, i) => ({
        supplementId: 'vitamin-d',
        timestamp: now - (i * 24 * 60 * 60 * 1000),
      })),
    ];
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe('calculateAdherence', () => {
    it('should calculate adherence for 30 days', () => {
      const result = calculateAdherence(mockCheckins, 30);

      expect(result.creatine).toBeDefined();
      expect(result.creatine.taken).toBe(25);
      expect(result.creatine.missed).toBe(5);
      expect(result.creatine.percentage).toBe(83);

      expect(result.whey.percentage).toBe(67);
      expect(result['vitamin-d'].percentage).toBe(50);
    });

    it('should return empty object for no checkins', () => {
      const result = calculateAdherence([], 30);
      expect(result).toEqual({});
    });

    it('should handle different time periods (7 days)', () => {
      const result = calculateAdherence(mockCheckins, 7);
      expect(result.creatine.percentage).toBeGreaterThanOrEqual(0);
      expect(result.creatine.percentage).toBeLessThanOrEqual(100);
    });

    it('should only include checkins within cutoff', () => {
      const oldCheckin = {
        supplementId: 'old-supp',
        timestamp: now - (100 * 24 * 60 * 60 * 1000), // 100 days ago
      };
      const result = calculateAdherence([oldCheckin], 30);
      expect(result['old-supp']).toBeUndefined();
    });
  });

  describe('getTopSupplements', () => {
    it('should return supplements sorted by adherence descending', () => {
      const adherence = calculateAdherence(mockCheckins, 30);
      const top = getTopSupplements(adherence);

      expect(top[0].supplementId).toBe('creatine');
      expect(top[1].supplementId).toBe('whey');
      expect(top[2].supplementId).toBe('vitamin-d');
    });

    it('should limit results to specified count', () => {
      const adherence = calculateAdherence(mockCheckins, 30);
      const top = getTopSupplements(adherence, 2);
      expect(top.length).toBe(2);
    });

    it('should return empty array if no adherence data', () => {
      const top = getTopSupplements({});
      expect(top).toEqual([]);
    });
  });

  describe('renderAdherenceChart', () => {
    it('should create chart DOM element', () => {
      const container = document.createElement('div');
      const chart = renderAdherenceChart('creatine', mockCheckins, container);

      expect(chart).toBeDefined();
      expect(chart.className).toBe('adherence-chart');
      expect(chart.getAttribute('data-supplement-id')).toBe('creatine');
    });

    it('should render 30 day elements', () => {
      const container = document.createElement('div');
      renderAdherenceChart('creatine', mockCheckins, container);

      const days = container.querySelectorAll('.chart-day');
      expect(days.length).toBe(30);
    });

    it('should mark taken days with taken class', () => {
      const container = document.createElement('div');
      renderAdherenceChart('creatine', mockCheckins, container);

      const takenDays = container.querySelectorAll('.chart-day.taken');
      expect(takenDays.length).toBeGreaterThan(0);
    });

    it('should mark missed days with missed class', () => {
      const container = document.createElement('div');
      renderAdherenceChart('creatine', mockCheckins, container);

      const missedDays = container.querySelectorAll('.chart-day.missed');
      expect(missedDays.length).toBeGreaterThan(0);
    });
  });

  describe('getAdherenceOverview', () => {
    it('should return overview stats for user checkins', () => {
      const overview = getAdherenceOverview(mockCheckins);

      expect(overview.averageAdherence).toBeGreaterThan(0);
      expect(overview.topSupplements).toBeDefined();
      expect(overview.consistency).toBeDefined();
      expect(overview.message).toBeDefined();
    });

    it('should return consistency level based on average adherence', () => {
      // Create high adherence scenario
      const highAdherence = Array.from({ length: 29 }, (_, i) => ({
        supplementId: 'test-supp',
        timestamp: now - (i * 24 * 60 * 60 * 1000),
      }));
      const overview = getAdherenceOverview(highAdherence);
      expect(overview.consistency).toBe('excellent');
    });

    it('should handle no checkins', () => {
      const overview = getAdherenceOverview([]);
      expect(overview.averageAdherence).toBe(0);
      expect(overview.topSupplements).toEqual([]);
    });
  });

  describe('calculateStreak', () => {
    it('should calculate current streak for supplement', () => {
      const streak = calculateStreak('creatine', mockCheckins);
      expect(streak.current).toBeGreaterThan(0);
      expect(streak.best).toBeGreaterThanOrEqual(streak.current);
    });

    it('should return 0 streak for supplement with no checkins', () => {
      const streak = calculateStreak('non-existent', mockCheckins);
      expect(streak.current).toBe(0);
      expect(streak.best).toBe(0);
    });

    it('should correctly identify consecutive days', () => {
      const streakCheckins = [
        { supplementId: 'test', timestamp: now },
        { supplementId: 'test', timestamp: now - (1 * 24 * 60 * 60 * 1000) },
        { supplementId: 'test', timestamp: now - (2 * 24 * 60 * 60 * 1000) },
        { supplementId: 'test', timestamp: now - (4 * 24 * 60 * 60 * 1000) }, // Skip day 3
        { supplementId: 'test', timestamp: now - (5 * 24 * 60 * 60 * 1000) },
      ];
      const streak = calculateStreak('test', streakCheckins);
      expect(streak.best).toBeGreaterThanOrEqual(3);
    });
  });
});
