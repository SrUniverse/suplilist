import { describe, it, expect } from 'vitest';
import { getGoalConfig, prioritizeByGoal, getGoalMetrics } from './goal-optimizer.js';
import { SUPPLEMENTS_DB } from '../../data/supplements.js';

vi.mock('../../data/supplements.js', () => ({
  SUPPLEMENTS_DB: [
    { id: 'creatina-monohidratada', name: 'Creatina', targets: { bulk: 1, strength: 1, cut: 0.5, general: 0.4 } },
    { id: 'whey-protein', name: 'Whey Protein', targets: { bulk: 1, strength: 0.9, cut: 0.8, general: 0.6 } },
    { id: 'vitamina-d3', name: 'Vitamina D3', targets: { general: 0.9, bulk: 0.5 } },
  ]
}));

import { vi } from 'vitest';

describe('getGoalConfig', () => {
  it('returns config for known goal', () => {
    const config = getGoalConfig('bulk');
    expect(config.key).toBe('bulk');
    expect(config.label).toBe('Hipertrofia');
    expect(Array.isArray(config.priority)).toBe(true);
  });

  it('falls back to general for unknown goal', () => {
    const config = getGoalConfig('unknown-goal');
    expect(config.key).toBe('general');
  });

  it('returns general config for cut goal', () => {
    const config = getGoalConfig('cut');
    expect(config.key).toBe('cut');
    expect(config.label).toBe('Emagrecimento');
  });

  it('returns endurance config', () => {
    const config = getGoalConfig('endurance');
    expect(config.key).toBe('endurance');
    expect(config.label).toBe('Performance');
  });

  it('returns strength config', () => {
    const config = getGoalConfig('strength');
    expect(config.key).toBe('strength');
  });
});

describe('prioritizeByGoal', () => {
  it('does not throw on empty array', () => {
    expect(() => prioritizeByGoal([], 'bulk')).not.toThrow();
    expect(prioritizeByGoal([], 'bulk')).toEqual([]);
  });

  it('returns same-length array', () => {
    const supps = [
      { name: 'Vitamina D', id: 'vitamina-d' },
      { name: 'Creatina Monohidratada', id: 'creatina' },
      { name: 'Whey Protein', id: 'whey-protein' },
    ];
    const result = prioritizeByGoal(supps, 'bulk');
    expect(result).toHaveLength(3);
  });

  it('puts creatina first for strength goal (priority includes creatina)', () => {
    const supps = [
      { name: 'Vitamina D', id: 'vitamina-d' },
      { name: 'Creatina Monohidratada', id: 'creatina' },
    ];
    const result = prioritizeByGoal([...supps], 'strength');
    expect(result[0].id).toBe('creatina');
  });
});

describe('getGoalMetrics', () => {
  it('returns 0 coverage for empty stack', () => {
    const metrics = getGoalMetrics([], 'bulk');
    expect(metrics.coverage).toBe(0);
    expect(metrics.count).toBe(0);
  });

  it('returns correct coverage when all stack items match goal', () => {
    const stack = [
      { supplementId: 'creatina-monohidratada' },
      { supplementId: 'whey-protein' },
    ];
    const metrics = getGoalMetrics(stack, 'bulk');
    expect(metrics.count).toBe(2);
    expect(metrics.coverage).toBe(100);
  });

  it('returns correct coverage when some stack items match', () => {
    const stack = [
      { supplementId: 'creatina-monohidratada' }, // has bulk target
      { supplementId: 'vitamina-d3' },             // has bulk target
    ];
    const metrics = getGoalMetrics(stack, 'bulk');
    expect(metrics.coverage).toBe(100);
    expect(metrics.count).toBe(2);
  });

  it('returns goal label from config', () => {
    const metrics = getGoalMetrics([], 'bulk');
    expect(metrics.goal).toBe('Hipertrofia');
  });
});
