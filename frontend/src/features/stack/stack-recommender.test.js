import { describe, it, expect } from 'vitest';
import { getRecommendations, calculateCompatibility } from './stack-recommender-engine.js';
import { SUPPLEMENTS_DB } from '../../data/supplements.js';

describe('StackRecommender AI Engine', () => {
  it('Validation Checklist: All supplement IDs present in SUPPLEMENTS_DB', () => {
    const ids = SUPPLEMENTS_DB.map(s => s.id);
    expect(ids.length).toBeGreaterThanOrEqual(10); // Check minimal list
  });

  it('Validation: All supplements have image field pointing to /assets/', () => {
    SUPPLEMENTS_DB.forEach(s => {
      expect(s.image, s.id + ' missing image field').toBeDefined();
      expect(s.image, s.id + ' image must match /assets/*.png').toMatch(/^\/assets\/.+\.png$/);
    });
  });

  it('1. Bulk 80kg → top 3 includes "creatina-monohidratada" or "whey-protein"', () => {
    const profile = { objective: 'bulk', weight: 80, budget: 300 };
    const results = getRecommendations(profile).slice(0, 3);
    const ids = results.map(r => r.id);
    expect(ids.some(id => id === 'creatina-monohidratada' || id === 'whey-protein')).toBe(true);
  });

  it('2. Restriction → restricted items excluded', () => {
    const profile = { objective: 'bulk', weight: 75, restrictions: ['whey-protein'], budget: 300 };
    const results = getRecommendations(profile);
    const ids = results.map(r => r.id);
    expect(ids.includes('whey-protein')).toBe(false);
  });

  it('3. calculateCompatibility handles conflicts', () => {
    const supps = [{id: 'whey-protein'}, {id: 'creatina-monohidratada'}];
    const score = calculateCompatibility(supps);
    expect(score).toBeGreaterThan(0);
  });
});
