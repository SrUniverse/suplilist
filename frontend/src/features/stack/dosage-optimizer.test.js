import { describe, it, expect, vi } from 'vitest';
import { compareWithRecommended, getStatusColor, calcDailyCost, STATUS_COLORS } from './dosage-optimizer.js';

vi.mock('./stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    {
      id: 'creatina',
      pricePerGram: 0.25,
      dosage: { maintenance: 5, upperLimit: 10, unit: 'g' },
    },
    {
      id: 'vitamina-d3',
      pricePerGram: 100,
      dosage: { maintenance: 2000, upperLimit: 4000, unit: 'UI' },
    },
  ],
}));

describe('STATUS_COLORS', () => {
  it('defines all expected statuses', () => {
    expect(STATUS_COLORS.optimal).toBeDefined();
    expect(STATUS_COLORS.suboptimal).toBeDefined();
    expect(STATUS_COLORS['not-recommended']).toBeDefined();
    expect(STATUS_COLORS.missing).toBeDefined();
  });
});

describe('compareWithRecommended', () => {
  it('returns null for unknown supplement', () => {
    expect(compareWithRecommended({ supplementId: 'unknown', dosage: 5 })).toBeNull();
  });

  it('returns optimal when dose is within range', () => {
    const r = compareWithRecommended({ supplementId: 'creatina', dosage: 5 });
    expect(r.status).toBe('optimal');
    expect(r.ratio).toBeCloseTo(1);
  });

  it('returns suboptimal when dose is < 80% of maintenance', () => {
    const r = compareWithRecommended({ supplementId: 'creatina', dosage: 3 }); // 60%
    expect(r.status).toBe('suboptimal');
    expect(r.ratio).toBeLessThan(1);
  });

  it('returns not-recommended when dose exceeds upperLimit', () => {
    const r = compareWithRecommended({ supplementId: 'creatina', dosage: 15 }); // > 10g upperLimit
    expect(r.status).toBe('not-recommended');
    expect(r.ratio).toBeGreaterThan(1);
  });

  it('returns null when supplement has no dosage.maintenance', () => {
    // No dosage.maintenance means null
    expect(compareWithRecommended({ supplementId: 'creatina', dosage: NaN })).not.toBeNull();
  });
});

describe('getStatusColor', () => {
  it('returns color for known status', () => {
    expect(getStatusColor('optimal')).toBe(STATUS_COLORS.optimal);
    expect(getStatusColor('suboptimal')).toBe(STATUS_COLORS.suboptimal);
  });

  it('returns fallback for unknown status', () => {
    expect(getStatusColor('unknown')).toBe('#666');
  });
});

describe('calcDailyCost', () => {
  it('returns 0 for unknown supplement', () => {
    expect(calcDailyCost({ supplementId: 'unknown', dosage: 5 })).toBe(0);
  });

  it('calculates cost correctly', () => {
    // creatina: pricePerGram=0.25, dosage=5g → 0.25 * 5 = 1.25
    const cost = calcDailyCost({ supplementId: 'creatina', dosage: 5 });
    expect(cost).toBeCloseTo(1.25);
  });

  it('handles zero dosage', () => {
    const cost = calcDailyCost({ supplementId: 'creatina', dosage: 0 });
    expect(cost).toBe(0);
  });
});
