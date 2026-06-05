import { describe, it, expect } from 'vitest';
import {
  findRedundancies,
  findGaps,
  optimizeStack,
  calculateROI,
} from './stack-optimizer.js';

describe('Stack Optimizer', () => {
  describe('findRedundancies', () => {
    it('should identify redundant protein sources', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'casein' },
        { supplementId: 'egg-protein' },
      ];

      const redundancies = findRedundancies(stack);

      expect(redundancies.length).toBeGreaterThan(0);
      const proteinRedundancy = redundancies.find(r => r.category === 'protein');
      expect(proteinRedundancy).toBeDefined();
      expect(proteinRedundancy.supplements.length).toBe(3);
    });

    it('should identify redundant amino acids', () => {
      const stack = [
        { supplementId: 'bcaa' },
        { supplementId: 'eaa' },
      ];

      const redundancies = findRedundancies(stack);

      const aminoRedundancy = redundancies.find(r => r.category === 'amino');
      expect(aminoRedundancy).toBeDefined();
      expect(aminoRedundancy.supplements).toContain('bcaa');
      expect(aminoRedundancy.supplements).toContain('eaa');
    });

    it('should identify redundant creatine forms', () => {
      const stack = [
        { supplementId: 'creatine-monohydrate' },
        { supplementId: 'creatine-hcl' },
      ];

      const redundancies = findRedundancies(stack);

      const creatineRedundancy = redundancies.find(r => r.category === 'creatine');
      expect(creatineRedundancy).toBeDefined();
      expect(creatineRedundancy.supplements.length).toBe(2);
    });

    it('should not flag single supplements as redundant', () => {
      const stack = [{ supplementId: 'whey' }];

      const redundancies = findRedundancies(stack);

      expect(redundancies.length).toBe(0);
    });

    it('should not flag unrelated supplements', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'creatine' },
      ];

      const redundancies = findRedundancies(stack);

      expect(redundancies.length).toBe(0);
    });

    it('should handle empty stack', () => {
      const redundancies = findRedundancies([]);
      expect(redundancies.length).toBe(0);
    });

    it('should be case-insensitive', () => {
      const stack = [
        { supplementId: 'WHEY' },
        { supplementId: 'Casein' },
      ];

      const redundancies = findRedundancies(stack);

      const proteinRedundancy = redundancies.find(r => r.category === 'protein');
      expect(proteinRedundancy).toBeDefined();
    });
  });

  describe('findGaps', () => {
    it('should recommend whey for bulk goal', () => {
      const stack = [{ supplementId: 'creatine' }];

      const gaps = findGaps(stack, 'bulk', 500);

      const whey = gaps.find(g => g.id === 'whey');
      expect(whey).toBeDefined();
      expect(whey.priority).toBe('critical');
    });

    it('should recommend thermogenic for cut goal', () => {
      const stack = [];

      const gaps = findGaps(stack, 'cut', 500);

      const thermo = gaps.find(g => g.id === 'thermogenic');
      expect(thermo).toBeDefined();
      expect(thermo.priority).toBe('high');
    });

    it('should recommend creatine as critical for strength', () => {
      const stack = [];

      const gaps = findGaps(stack, 'strength', 500);

      const creatine = gaps.find(g => g.id === 'creatine');
      expect(creatine).toBeDefined();
      expect(creatine.priority).toBe('critical');
    });

    it('should exclude supplements already in stack', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'creatine' },
      ];

      const gaps = findGaps(stack, 'bulk', 500);

      expect(gaps.find(g => g.id === 'whey')).toBeUndefined();
      expect(gaps.find(g => g.id === 'creatine')).toBeUndefined();
    });

    it('should respect budget constraint (30%)', () => {
      const stack = [];
      const lowBudget = 50; // Only R$ 50/month

      const gaps = findGaps(stack, 'bulk', lowBudget);

      // All recommended supplements should cost <= 15 (30% of 50)
      for (const gap of gaps) {
        expect(gap.cost).toBeLessThanOrEqual(lowBudget * 0.3);
      }
    });

    it('should sort by priority (critical > high > medium > low)', () => {
      const stack = [];

      const gaps = findGaps(stack, 'bulk', 500);

      const priorityOrder = gaps.map(g => g.priority);
      for (let i = 0; i < priorityOrder.length - 1; i++) {
        const priorityMap = { critical: 0, high: 1, medium: 2, low: 3 };
        expect(priorityMap[priorityOrder[i]]).toBeLessThanOrEqual(priorityMap[priorityOrder[i + 1]]);
      }
    });

    it('should return empty array for unknown goal', () => {
      const gaps = findGaps([], 'unknown-goal', 500);
      expect(gaps.length).toBe(0);
    });

    it('should handle 0 budget', () => {
      const gaps = findGaps([], 'bulk', 0);
      // No supplements can fit in 0 budget
      expect(gaps.length).toBe(0);
    });
  });

  describe('optimizeStack', () => {
    it('should detect when stack has redundancies and suggest removal', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'casein' },
      ];
      const purchases = [
        { supplementId: 'whey', price: 80, status: 'active' },
        { supplementId: 'casein', price: 70, status: 'active' },
      ];

      const result = optimizeStack(stack, purchases, 'bulk', 500);

      expect(result.hasOptimizationPotential).toBe(true);
      expect(result.recommendation).toContain('Remove');
    });

    it('should calculate savings potential', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'casein' },
      ];
      const purchases = [
        { supplementId: 'whey', price: 80, status: 'active' },
        { supplementId: 'casein', price: 70, status: 'active' },
      ];

      const result = optimizeStack(stack, purchases, 'bulk', 500);

      expect(result.savingsPotential).toBeGreaterThan(0);
    });

    it('should suggest adding missing supplements', () => {
      const stack = [{ supplementId: 'creatine' }];
      const purchases = [];

      const result = optimizeStack(stack, purchases, 'bulk', 500);

      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('should recognize well-optimized stack', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'creatine' },
        { supplementId: 'carbs' },
      ];
      const purchases = [];

      const result = optimizeStack(stack, purchases, 'bulk', 500);

      expect(result.recommendation).toContain('bem otimizado');
    });

    it('should provide recommendations combining redundancy removal and gap filling', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'casein' },
        { supplementId: 'creatine' },
      ];
      const purchases = [
        { supplementId: 'whey', price: 80, status: 'active' },
        { supplementId: 'casein', price: 70, status: 'active' },
      ];

      const result = optimizeStack(stack, purchases, 'bulk', 500);

      expect(result.redundancies.length).toBeGreaterThan(0);
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.recommendation).toContain('Remove');
      expect(result.recommendation).toContain('add');
    });

    it('should handle empty stack', () => {
      const result = optimizeStack([], [], 'bulk', 500);

      expect(result.hasOptimizationPotential).toBe(true);
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('should sum savings from multiple redundancies', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'casein' },
        { supplementId: 'bcaa' },
        { supplementId: 'eaa' },
      ];
      const purchases = [
        { supplementId: 'whey', price: 80, status: 'active' },
        { supplementId: 'casein', price: 70, status: 'active' },
        { supplementId: 'bcaa', price: 60, status: 'active' },
        { supplementId: 'eaa', price: 55, status: 'active' },
      ];

      const result = optimizeStack(stack, purchases, 'bulk', 500);

      // Should include savings from both redundancy groups
      expect(result.savingsPotential).toBeGreaterThan(100);
    });
  });

  describe('calculateROI', () => {
    it('should return high ROI for whey in bulk', () => {
      const whey = { supplementId: 'whey' };
      const roi = calculateROI(whey, 'bulk');

      expect(roi).toBe(95);
    });

    it('should return different ROI by goal', () => {
      const whey = { supplementId: 'whey' };

      const bulkROI = calculateROI(whey, 'bulk');
      const cutROI = calculateROI(whey, 'cut');
      const strengthROI = calculateROI(whey, 'strength');

      expect(bulkROI).toBe(95);
      expect(cutROI).toBe(90);
      expect(strengthROI).toBe(95);
    });

    it('should return low ROI for BCAA in general goal', () => {
      const bcaa = { supplementId: 'bcaa' };
      const roi = calculateROI(bcaa, 'general');

      expect(roi).toBe(40);
    });

    it('should return default 50 for unknown supplement', () => {
      const unknown = { supplementId: 'unknown-supp' };
      const roi = calculateROI(unknown, 'bulk');

      expect(roi).toBe(50);
    });

    it('should evaluate creatine differently for endurance', () => {
      const creatine = { supplementId: 'creatine' };

      const bulkROI = calculateROI(creatine, 'bulk');
      const enduranceROI = calculateROI(creatine, 'endurance');

      expect(bulkROI).toBe(90);
      expect(enduranceROI).toBe(50);
    });

    it('should show beta-alanine as high ROI for endurance', () => {
      const betaAlanine = { supplementId: 'beta-alanine' };

      const bulkROI = calculateROI(betaAlanine, 'bulk');
      const enduranceROI = calculateROI(betaAlanine, 'endurance');

      expect(bulkROI).toBe(50);
      expect(enduranceROI).toBe(80);
    });
  });

  describe('Integration tests', () => {
    it('should suggest a complete optimized stack for bulking', () => {
      const currentStack = [{ supplementId: 'whey' }];
      const purchases = [{ supplementId: 'whey', price: 80, status: 'active' }];

      const result = optimizeStack(currentStack, purchases, 'bulk', 500);

      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.gaps[0].id).toBe('creatine'); // Should be critical
    });

    it('should handle mixed redundancy and gap scenarios', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'casein' },
        { supplementId: 'bcaa' },
      ];
      const purchases = [
        { supplementId: 'whey', price: 80, status: 'active' },
        { supplementId: 'casein', price: 70, status: 'active' },
        { supplementId: 'bcaa', price: 60, status: 'active' },
      ];

      const result = optimizeStack(stack, purchases, 'strength', 500);

      expect(result.redundancies.length).toBeGreaterThan(0);
      expect(result.gaps.length).toBeGreaterThan(0);
      expect(result.hasOptimizationPotential).toBe(true);
    });

    it('should provide actionable recommendations', () => {
      const stack = [
        { supplementId: 'whey' },
        { supplementId: 'casein' },
      ];
      const purchases = [
        { supplementId: 'whey', price: 80, status: 'active' },
        { supplementId: 'casein', price: 70, status: 'active' },
      ];

      const result = optimizeStack(stack, purchases, 'bulk', 500);

      // Recommendation should contain specific action items
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(0);
      expect(typeof result.recommendation).toBe('string');
    });
  });
});
