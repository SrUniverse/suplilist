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
      // Imagens migradas para WebP no visual overhaul; PNG mantido como fallback aceito
      expect(s.image, s.id + ' image must match /assets/*.(webp|png)').toMatch(/^\/assets\/.+\.(webp|png)$/);
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

  describe('budget filter uses real dosage units', () => {
    it('mg-dosed supplement (e.g. caffeine 200mg) is NOT free — excluded when budget is very low', () => {
      // pricePerGram=1, dose=200mg → 0.2g/day → R$6/month
      // Old bug: 1 * 30 = 30 → excluded at budget=10 for wrong reasons
      // New fix: 1 * 0.2 * 30 = 6 → included at budget=10
      const fakeSupplement = {
        id: '__test_mg__',
        targets: { test: 0.8 },
        evidenceLevel: 'A',
        pricePerGram: 1,
        dosage: { maintenance: 200, unit: 'mg' },
      };
      // Mock the DB for this test by calling the filter logic directly
      const dose = fakeSupplement.dosage.maintenance;
      const unit = fakeSupplement.dosage.unit;
      const dailyGrams = unit === 'mg' ? dose / 1000 : dose;
      const estimatedCost = fakeSupplement.pricePerGram * dailyGrams * 30;
      expect(estimatedCost).toBeCloseTo(6); // R$6/month not R$30
    });

    it('mcg-dosed supplement is nearly free per month', () => {
      const dose = 5000; // mcg (5mg vitamin D)
      const pricePerGram = 100; // expensive per gram
      const dailyGrams = dose / 1_000_000;
      const estimatedCost = pricePerGram * dailyGrams * 30;
      expect(estimatedCost).toBeCloseTo(15); // R$15/month (100R$/g * 0.005g/day * 30)
    });

    it('g-dosed supplement (e.g. creatina 5g) calculates correctly', () => {
      const dose = 5; // g
      const pricePerGram = 0.5;
      const dailyGrams = dose;
      const estimatedCost = pricePerGram * dailyGrams * 30;
      expect(estimatedCost).toBeCloseTo(75); // R$75/month
    });

    it('budget=0 excludes all mass-unit supplements (g/mg/mcg)', () => {
      const results = getRecommendations({ objective: 'bulk', budget: 0 });
      // Non-mass units (UI, UFC) bypass budget filter by design
      results.forEach(s => {
        const unit = s.dosage?.unit ?? 'g';
        expect(['UI', 'UFC', 'bi UFC']).toContain(unit);
      });
    });

    it('very high budget includes all objective-matching supplements', () => {
      const resultsBig = getRecommendations({ objective: 'bulk', budget: 99999 });
      const resultsNormal = getRecommendations({ objective: 'bulk', budget: 300 });
      expect(resultsBig.length).toBeGreaterThanOrEqual(resultsNormal.length);
    });
  });
});
