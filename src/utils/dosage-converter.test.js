import { describe, it, expect } from 'vitest';
import { dosageToGrams, estimatePricePerGram, estimateMonthlyCost, formatDose } from './dosage-converter.js';

describe('dosage-converter — Supplement Unit Conversions', () => {
  describe('dosageToGrams()', () => {
    it('converts grams directly', () => {
      expect(dosageToGrams(5, 'g')).toBe(5);
      expect(dosageToGrams(5, 'G ')).toBe(5);
    });

    it('converts milligrams to grams', () => {
      expect(dosageToGrams(500, 'mg')).toBe(0.5);
      expect(dosageToGrams(250, 'MG')).toBe(0.25);
    });

    it('converts micrograms to grams', () => {
      expect(dosageToGrams(1000, 'mcg')).toBe(0.001);
      expect(dosageToGrams(500, 'MCG')).toBe(0.0005);
    });

    it('converts UI / caps / pills using safety fallback coefficients', () => {
      // 1 UI/cap/pill ≈ 0.001g (1/1000)
      expect(dosageToGrams(5000, 'ui')).toBe(5);
      expect(dosageToGrams(10, 'caps')).toBe(0.01);
      expect(dosageToGrams(2, 'capsules')).toBe(0.002);
      expect(dosageToGrams(3, 'pills')).toBe(0.003);
    });

    it('falls back to input dose as grams for unknown or undefined units', () => {
      expect(dosageToGrams(10, 'scoops')).toBe(10);
      expect(dosageToGrams(5, null)).toBe(5);
      expect(dosageToGrams(3, undefined)).toBe(3);
    });
  });

  describe('estimatePricePerGram()', () => {
    it('estimates price per gram successfully', () => {
      // 100 BRL for 5g = 20 BRL/g
      expect(estimatePricePerGram(100, 5, 'g')).toBe(20);
      // 50 BRL for 500mg (0.5g) = 100 BRL/g
      expect(estimatePricePerGram(50, 500, 'mg')).toBe(100);
    });

    it('returns 0 if dosage is zero or negative', () => {
      expect(estimatePricePerGram(100, 0, 'g')).toBe(0);
      expect(estimatePricePerGram(100, -2, 'g')).toBe(0);
    });
  });

  describe('estimateMonthlyCost()', () => {
    it('calculates monthly cost based on daily dose and price per gram', () => {
      // Daily dose 5g, price per gram is 2 BRL, 30 days = 5 * 2 * 30 = 300 BRL
      expect(estimateMonthlyCost(5, 'g', 2)).toBe(300);
      // Daily dose 500mg (0.5g), price per gram 10 BRL, 30 days = 0.5 * 10 * 30 = 150 BRL
      expect(estimateMonthlyCost(500, 'mg', 10)).toBe(150);
    });

    it('allows customizing days per month', () => {
      // Daily dose 5g, price 2 BRL, 7 days = 5 * 2 * 7 = 70 BRL
      expect(estimateMonthlyCost(5, 'g', 2, 7)).toBe(70);
    });
  });

  describe('formatDose()', () => {
    it('concatenates dose and unit without spaces', () => {
      expect(formatDose(5, 'g')).toBe('5g');
      expect(formatDose(500, 'mg')).toBe('500mg');
    });

    it('returns stringified dose if unit is missing or falsy', () => {
      expect(formatDose(5, null)).toBe('5');
      expect(formatDose(10, '')).toBe('10');
    });
  });
});
