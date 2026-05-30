import { describe, it, expect } from 'vitest';
import DosageCalculator from './dosage-calculator.js';
import { SUPPLEMENTS_DB } from './stack-recommender.js';

// Helper to get supplement by ID
function getSupp(id) {
  const s = SUPPLEMENTS_DB.find(s => s.id === id);
  if (!s) throw new Error(`Supplement '${id}' not found in SUPPLEMENTS_DB`);
  return s;
}

describe('DosageCalculator v4.0 Unit Tests', () => {
  // 1. Creatina 75kg moderate → daily between 4.5g and 6.0g
  it('1. Creatina 75kg moderate → daily between 4.5g and 6.0g', () => {
    const supplement = getSupp('creatina-monohidratada');
    const profile = {
      weight: 75,
      trainingFrequency: 3, // moderate
      objective: 'general',
      age: 25
    };

    const result = DosageCalculator.calculate(supplement, profile);
    expect(result.daily).toBeGreaterThanOrEqual(4.5);
    expect(result.daily).toBeLessThanOrEqual(6.0);
  });

  // 2. Bulk objective → higher dose than cut (same weight, same supplement)
  it('2. Bulk objective → higher dose than cut', () => {
    const supplement = getSupp('creatina-monohidratada');
    const bulkProfile = {
      weight: 70,
      trainingFrequency: 3,
      objective: 'bulk',
      age: 25
    };
    const cutProfile = {
      weight: 70,
      trainingFrequency: 3,
      objective: 'cut',
      age: 25
    };

    const bulkResult = DosageCalculator.calculate(supplement, bulkProfile);
    const cutResult = DosageCalculator.calculate(supplement, cutProfile);

    expect(bulkResult.daily).toBeGreaterThan(cutResult.daily);
  });

  // 3. Dose never exceeds upperLimit (test with weights 120, 130, 150kg)
  it('3. Dose never exceeds upperLimit (test with weights 120, 130, 150kg)', () => {
    const supplement = getSupp('creatina-monohidratada'); // upperLimit is 10g

    [120, 130, 150].forEach(weight => {
      const profile = {
        weight,
        trainingFrequency: 5,
        objective: 'bulk',
        age: 25
      };

      const result = DosageCalculator.calculate(supplement, profile);
      expect(result.daily).toBeLessThanOrEqual(supplement.dosage.upperLimit);
    });
  });

  // 4. Creatina has loadingProtocol with dose === 20
  it('4. Creatina has loadingProtocol with dose === 20', () => {
    const supplement = getSupp('creatina-monohidratada');
    const profile = {
      weight: 75,
      trainingFrequency: 3,
      objective: 'general',
      age: 25
    };

    const result = DosageCalculator.calculate(supplement, profile);
    expect(result.loadingProtocol).not.toBeNull();
    expect(result.loadingProtocol.dose).toBe(20);
  });

  // 5. Vitamina D3 → same dose for 50kg and 120kg (fixed dose)
  it('5. Vitamina D3 → same dose for 50kg and 120kg (fixed dose)', () => {
    const supplement = getSupp('vitamina-d3');
    
    const lightProfile = {
      weight: 50,
      trainingFrequency: 3,
      objective: 'general',
      age: 25
    };
    const heavyProfile = {
      weight: 120,
      trainingFrequency: 3,
      objective: 'general',
      age: 25
    };

    const lightResult = DosageCalculator.calculate(supplement, lightProfile);
    const heavyResult = DosageCalculator.calculate(supplement, heavyProfile);

    expect(lightResult.daily).toBe(heavyResult.daily);
  });

  // 6. User under 18 → warnings array contains message with '18'
  it("6. User under 18 → warnings array contains message with '18'", () => {
    const supplement = getSupp('creatina-monohidratada');
    const profile = {
      weight: 70,
      trainingFrequency: 3,
      objective: 'general',
      age: 16 // under 18
    };

    const result = DosageCalculator.calculate(supplement, profile);
    const under18Warning = result.warnings.find(w => w.message.includes('18'));

    expect(under18Warning).toBeDefined();
    expect(under18Warning.type).toBe('warning');
  });

  // 7. Result contains all required DosageResult fields
  it('7. Result contains all required DosageResult fields', () => {
    const supplement = getSupp('creatina-monohidratada');
    const profile = {
      weight: 70,
      trainingFrequency: 3,
      objective: 'general',
      age: 25
    };

    const res = DosageCalculator.calculate(supplement, profile);

    expect(res.daily).toBeDefined();
    expect(res.unit).toBeDefined();
    expect(res.weekly).toBeDefined();
    expect(res.monthly).toBeDefined();
    expect(res.frequency).toBeDefined();
    expect(res.timing).toBeDefined();
    expect(res.withFood).toBeDefined();
    expect(res.withWater).toBeDefined();
    expect(res.withinSafetyLimits).toBeDefined();
    expect(res.upperLimit).toBeDefined();
    expect(res.rationale).toBeDefined();
    expect(Array.isArray(res.warnings)).toBe(true);
    expect(res.methodology).toBeDefined();
  });

  // 8. calculateStack() returns one result per supplement in input array
  it('8. calculateStack() returns one result per supplement in input array', () => {
    const supplements = [
      getSupp('creatina-monohidratada'),
      getSupp('vitamina-d3'),
      getSupp('omega-3')
    ];
    const profile = {
      weight: 70,
      trainingFrequency: 3,
      objective: 'general',
      age: 25
    };

    const stackResults = DosageCalculator.calculateStack(supplements, profile);
    expect(stackResults.length).toBe(3);
    expect(stackResults[0].supplementId).toBe('creatina-monohidratada');
    expect(stackResults[1].supplementId).toBe('vitamina-d3');
    expect(stackResults[2].supplementId).toBe('omega-3');
  });
});
