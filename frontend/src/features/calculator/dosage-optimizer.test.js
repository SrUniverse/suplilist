import { describe, it, expect } from 'vitest';
import {
  getRecommendedDosage,
  compareWithRecommended,
  getStatusIndicator,
  getStatusColor,
  analyzeStackDosages,
  getOptimizationSummary,
} from './dosage-optimizer.js';

describe('Dosage Optimizer', () => {
  describe('getRecommendedDosage', () => {
    it('should return recommended dosage for supported supplements', () => {
      // Creatine: 5g for bulking
      expect(getRecommendedDosage('creatine', 75, 'bulk')).toBe(5);
      // Whey: weight * 2.2 for bulking
      expect(getRecommendedDosage('whey', 75, 'bulk')).toBe(75 * 2.2);
      // Vitamin D: 2000 IU for all goals
      expect(getRecommendedDosage('vitamin-d', 75, 'general')).toBe(2000);
    });

    it('should vary dosage by goal', () => {
      // Creatine varies by goal
      expect(getRecommendedDosage('creatine', 75, 'bulk')).toBe(5);
      expect(getRecommendedDosage('creatine', 75, 'cut')).toBe(3);
      expect(getRecommendedDosage('creatine', 75, 'strength')).toBe(5);
    });

    it('should return null for 0 or no weight', () => {
      expect(getRecommendedDosage('creatine', 0, 'bulk')).toBeNull();
      expect(getRecommendedDosage('creatine', null, 'bulk')).toBeNull();
    });

    it('should return null for unsupported supplements', () => {
      expect(getRecommendedDosage('unknown-supp', 75, 'bulk')).toBeNull();
    });

    it('should handle endurance goal with creatine (not recommended)', () => {
      expect(getRecommendedDosage('creatine', 75, 'endurance')).toBe(0);
    });
  });

  describe('compareWithRecommended', () => {
    it('should identify optimal dosage', () => {
      const result = compareWithRecommended('creatine', 5, 75, 'bulk');
      expect(result.status).toBe('optimal');
      expect(result.percentage).toBe(100);
    });

    it('should identify too-high dosage', () => {
      const result = compareWithRecommended('creatine', 8, 75, 'bulk');
      expect(result.status).toBe('too-high');
      expect(result.percentage).toBe(160);
      expect(result.message).toContain('reduzir');
    });

    it('should identify too-low dosage', () => {
      const result = compareWithRecommended('creatine', 2, 75, 'bulk');
      expect(result.status).toBe('too-low');
      expect(result.percentage).toBe(40);
      expect(result.message).toContain('aumentar');
    });

    it('should identify slightly-high dosage (105-125%)', () => {
      const result = compareWithRecommended('creatine', 5.5, 75, 'bulk');
      expect(result.status).toBe('slightly-high');
    });

    it('should identify slightly-low dosage (75-95%)', () => {
      const result = compareWithRecommended('creatine', 4, 75, 'bulk');
      expect(result.status).toBe('slightly-low');
    });

    it('should identify missing supplement', () => {
      const result = compareWithRecommended('creatine', 0, 75, 'bulk');
      expect(result.status).toBe('missing');
      expect(result.message).toContain('Recomendado');
    });

    it('should handle weight-based supplements', () => {
      // Whey: 75kg * 2.2 = 165g for bulking
      const result = compareWithRecommended('whey', 165, 75, 'bulk');
      expect(result.status).toBe('optimal');
    });
  });

  describe('getStatusIndicator', () => {
    it('should return correct emoji for each status', () => {
      expect(getStatusIndicator('optimal')).toBe('✅');
      expect(getStatusIndicator('too-high')).toBe('⚠️');
      expect(getStatusIndicator('too-low')).toBe('📈');
      expect(getStatusIndicator('missing')).toBe('❌');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct color for each status', () => {
      expect(getStatusColor('optimal')).toBe('var(--color-success)');
      expect(getStatusColor('too-high')).toBe('var(--color-error)');
      expect(getStatusColor('too-low')).toBe('var(--color-error)');
      expect(getStatusColor('slightly-high')).toBe('var(--color-warning)');
    });
  });

  describe('analyzeStackDosages', () => {
    it('should analyze multiple supplements', () => {
      const stack = [
        { supplementId: 'creatine', name: 'Creatina', dailyDosage: 5 },
        { supplementId: 'whey', name: 'Whey Protein', dailyDosage: 150 },
        { supplementId: 'vitamin-d', name: 'Vitamina D', dailyDosage: 2000 },
      ];

      const analysis = analyzeStackDosages(stack, 75, 'bulk');

      expect(analysis.length).toBe(3);
      expect(analysis[0].supplementId).toBeDefined();
      expect(analysis[0].status).toBeDefined();
    });

    it('should sort by priority (needs-attention first)', () => {
      const stack = [
        { supplementId: 'creatine', name: 'Creatina', dailyDosage: 5 }, // optimal
        { supplementId: 'whey', name: 'Whey', dailyDosage: 50 }, // too-low
      ];

      const analysis = analyzeStackDosages(stack, 75, 'bulk');

      // too-low should come before optimal
      const wheyIndex = analysis.findIndex(a => a.supplementId === 'whey');
      const creatineIndex = analysis.findIndex(a => a.supplementId === 'creatine');

      expect(wheyIndex).toBeLessThan(creatineIndex);
    });

    it('should filter out supplements with no recommendations', () => {
      const stack = [
        { supplementId: 'creatine', name: 'Creatina', dailyDosage: 5 },
        { supplementId: 'unknown', name: 'Unknown', dailyDosage: 10 },
      ];

      const analysis = analyzeStackDosages(stack, 75, 'bulk');

      // Unknown supplement should be filtered
      expect(analysis.find(a => a.supplementId === 'unknown')).toBeUndefined();
    });
  });

  describe('getOptimizationSummary', () => {
    it('should report when stack is optimized', () => {
      const stack = [
        { supplementId: 'creatine', name: 'Creatina', dailyDosage: 5 },
        { supplementId: 'whey', name: 'Whey', dailyDosage: 165 },
      ];

      const summary = getOptimizationSummary(stack, 75, 'bulk');

      expect(summary.optimal).toBeGreaterThan(0);
      expect(summary.needsAttention).toBe(0);
      expect(summary.message).toContain('bem otimizado');
    });

    it('should identify optimization opportunities', () => {
      const stack = [
        { supplementId: 'creatine', name: 'Creatina', dailyDosage: 10 }, // too-high
        { supplementId: 'whey', name: 'Whey', dailyDosage: 50 }, // too-low
      ];

      const summary = getOptimizationSummary(stack, 75, 'bulk');

      expect(summary.needsAttention).toBe(2);
      expect(summary.optimizationPotential).toBe(true);
      expect(summary.message).toContain('otimizado');
    });

    it('should count total and optimal supplements', () => {
      const stack = [
        { supplementId: 'creatine', name: 'Creatina', dailyDosage: 5 },
        { supplementId: 'whey', name: 'Whey', dailyDosage: 165 },
        { supplementId: 'vitamin-d', name: 'Vitamina D', dailyDosage: 2000 },
      ];

      const summary = getOptimizationSummary(stack, 75, 'bulk');

      expect(summary.total).toBe(3);
      expect(summary.optimal).toBe(3);
    });
  });
});
