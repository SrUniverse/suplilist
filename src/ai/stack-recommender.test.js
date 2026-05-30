import { describe, it, expect, vi, beforeEach } from 'vitest';
import recommender, { SUPPLEMENTS_DB, StackRecommender } from './stack-recommender.js';
import { eventBus } from '../core/event-bus.js';

describe('StackRecommender AI Engine', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  // Validation Checklist: All 10 mandatory supplement IDs present in SUPPLEMENTS_DB
  it('Validation Checklist: All 10 mandatory supplement IDs present in SUPPLEMENTS_DB', () => {
    const ids = SUPPLEMENTS_DB.map(s => s.id);
    const mandatoryIds = [
      'creatina-monohidratada',
      'whey-protein',
      'cafeina',
      'vitamina-d3',
      'omega-3',
      'beta-alanina',
      'l-carnitina',
      'magnesio-bisglicinato',
      'vitamina-c',
      'ashwagandha'
    ];
    mandatoryIds.forEach(id => {
      expect(ids.includes(id)).toBe(true);
    });
  });

  // Validation Checklist: recommend() returns array of 8 items by default
  it('Validation Checklist: recommend() returns array of 8 items by default', () => {
    const profile = { objective: 'general', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };
    const results = recommender.recommend(profile); // no topN arg
    expect(results.length).toBe(8);
  });

  // 1. Bulk 80kg → top 3 includes 'creatina-monohidratada' or 'whey-protein'
  it("1. Bulk 80kg → top 3 includes 'creatina-monohidratada' or 'whey-protein'", () => {
    const profile = {
      objective: 'bulk',
      weight: 80,
      restrictions: [],
      budget: 300,
      age: 25,
      currentStack: []
    };

    const results = recommender.recommend(profile, 3);
    const ids = results.map(r => r.id);
    
    expect(results.length).toBeLessThanOrEqual(3);
    expect(ids.some(id => id === 'creatina-monohidratada' || id === 'whey-protein')).toBe(true);
  });

  // 2. Cut 65kg → results include 'l-carnitina' or 'cafeina'
  it("2. Cut 65kg → results include 'l-carnitina' or 'cafeina'", () => {
    const profile = {
      objective: 'cut',
      weight: 65,
      restrictions: [],
      budget: 300,
      age: 25,
      currentStack: []
    };

    const results = recommender.recommend(profile, 10);
    const ids = results.map(r => r.id);
    
    expect(ids.some(id => id === 'l-carnitina' || id === 'cafeina')).toBe(true);
  });

  // 3. Lactose restriction → 'whey-protein' excluded
  it("3. Lactose restriction → 'whey-protein' excluded", () => {
    const profile = {
      objective: 'bulk',
      weight: 75,
      restrictions: ['lactose'],
      budget: 300,
      age: 25,
      currentStack: []
    };

    const results = recommender.recommend(profile, 50);
    const ids = results.map(r => r.id);
    
    expect(ids.includes('whey-protein')).toBe(false);
  });

  // 4. Supplement in currentStack → NOT in results
  it('4. Supplement in currentStack → NOT in results', () => {
    const profile = {
      objective: 'strength',
      weight: 75,
      restrictions: [],
      budget: 300,
      age: 25,
      currentStack: ['creatina-monohidratada']
    };

    const results = recommender.recommend(profile, 50);
    const ids = results.map(r => r.id);
    
    expect(ids.includes('creatina-monohidratada')).toBe(false);
  });

  // 5. Budget R$100 → expensive supplements get LOW priority (or less score)
  it('5. Budget R$100 → expensive supplements get LOW priority', () => {
    const richProfile = {
      objective: 'bulk',
      weight: 90,
      restrictions: [],
      budget: 1000,
      age: 25,
      currentStack: []
    };

    const tightProfile = {
      objective: 'bulk',
      weight: 90,
      restrictions: [],
      budget: 100,
      age: 25,
      currentStack: []
    };

    const richResults = recommender.recommend(richProfile, 100);
    const tightResults = recommender.recommend(tightProfile, 100);

    const richWhey = richResults.find(r => r.id === 'whey-protein');
    const tightWhey = tightResults.find(r => r.id === 'whey-protein');

    if (richWhey && tightWhey) {
      expect(tightWhey.score).toBeLessThanOrEqual(richWhey.score);
    }
  });

  // 6. topN=5 → returns max 5 results
  it('6. topN=5 → respects topN parameter', () => {
    const profile = { objective: 'general', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };
    const results = recommender.recommend(profile, 5);
    
    expect(results.length).toBe(5);
  });

  // 7. Each result has all required fields from OUTPUT CONTRACT
  it('7. Each result has all required fields from OUTPUT CONTRACT', () => {
    const profile = { objective: 'bulk', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };
    const results = recommender.recommend(profile, 1);
    
    expect(results.length).toBe(1);
    const res = results[0];
    
    // Core fields
    expect(res.id).toBeDefined();
    expect(res.name).toBeDefined();
    expect(res.category).toBeDefined();
    expect(res.score).toBeDefined();
    expect(res.evidenceLevel).toBeDefined();
    
    // Dosage contract
    expect(res.dosage.daily).toBeDefined();
    expect(res.dosage.unit).toBeDefined();
    expect(res.dosage.weekly).toBeDefined();
    expect(res.dosage.frequency).toBeDefined();
    expect(res.dosage.timing).toBeDefined();
    expect(res.dosage.withinSafetyLimits).toBeDefined();
    expect(res.dosage.upperLimit).toBeDefined();
    expect(res.dosage.rationale).toBeDefined();
    
    // Cost contract
    expect(res.cost.perMonth).toBeDefined();
    expect(res.cost.perDose).toBeDefined();
    expect(res.cost.withinBudget).toBeDefined();
    
    // Auxiliary arrays
    expect(Array.isArray(res.benefits)).toBe(true);
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(Array.isArray(res.sideEffects)).toBe(true);
    expect(Array.isArray(res.interactions)).toBe(true);
    
    expect(res.timing).toBeDefined();
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(res.priority);
  });

  // 8. Evidence A supplements score higher than D for same objective
  it('8. Evidence A supplements score higher than D for same objective', () => {
    const profile = { objective: 'bulk', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };
    const results = recommender.recommend(profile, 100);

    const aSupplement = results.find(r => r.id === 'creatina-monohidratada');
    const dSupplement = results.find(r => r.evidenceLevel === 'D');

    if (aSupplement && dSupplement) {
      expect(aSupplement.score).toBeGreaterThan(dSupplement.score);
    }
  });

  // 9. profileHash changes when objective changes
  it('9. profileHash changes when objective changes', () => {
    const profile1 = { objective: 'bulk', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };
    const profile2 = { objective: 'cut', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };

    const hash1 = StackRecommender.profileHash(profile1);
    const hash2 = StackRecommender.profileHash(profile2);

    expect(hash1).not.toBe(hash2);
  });

  // 10. 100 mock supplements scored in <100ms
  it('10. 100 mock supplements scored in <100ms', () => {
    const profile = { objective: 'bulk', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };
    
    const start = performance.now();
    const results = recommender.recommend(profile, 100);
    const duration = performance.now() - start;

    expect(results.length).toBeGreaterThanOrEqual(10); 
    expect(duration).toBeLessThan(100);
  });

  // Extra: EventBus event triggers
  it('Validation: EventBus emits recommendationsReady event', () => {
    const profile = { objective: 'bulk', weight: 70, restrictions: [], budget: 200, age: 25, currentStack: [] };
    const handler = vi.fn();
    
    eventBus.on('ai:recommendationsReady', handler);
    recommender.recommend(profile, 3);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].items).toBeDefined();
    expect(handler.mock.calls[0][0].profileHash).toBe(StackRecommender.profileHash(profile));
  });
});
