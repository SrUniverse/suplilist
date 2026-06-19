import { describe, it, expect } from 'vitest';
import { dosageToGrams, estimatePricePerGram, estimateMonthlyCost, costPerDose, formatDose } from './dosage-converter.js';

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

  describe('costPerDose()', () => {
    // Embalagem em massa (pricePerUnit = R$/grama)
    it('converte dose pela própria unidade contra preço por grama', () => {
      // 5g × R$0,25/g = R$1,25
      expect(costPerDose(5, 'g', 0.25, 'g')).toBeCloseTo(1.25, 5);
      // Colágeno: 10000mg = 10g × R$0,18/g = R$1,80 (não 1800)
      expect(costPerDose(10000, 'mg', 0.18, 'g')).toBeCloseTo(1.8, 5);
      // 200mcg = 0,0002g × R$4/g = R$0,0008
      expect(costPerDose(200, 'mcg', 4, 'g')).toBeCloseTo(0.0008, 6);
    });

    // Embalagem em cápsulas (pricePerUnit = R$/cápsula)
    it('assume 1 cápsula por dose quando a dose é em mg/UI', () => {
      // Boro: 3mg, embalagem em caps → R$0,75 (não 0,00)
      expect(costPerDose(3, 'mg', 0.75, 'caps')).toBe(0.75);
      // Vitamina D3: 2000UI, caps → R$0,27
      expect(costPerDose(2000, 'UI', 0.27, 'caps')).toBe(0.27);
      // Probiótico: 10 bi UFC, caps → R$3,00
      expect(costPerDose(10, 'bi UFC', 3, 'caps')).toBe(3);
    });

    it('multiplica pela contagem quando a dose já está em cápsulas', () => {
      expect(costPerDose(2, 'caps', 1.5, 'caps')).toBe(3);
    });

    it('retorna 0 para entradas inválidas', () => {
      expect(costPerDose(0, 'g', 0.25, 'g')).toBe(0);
      expect(costPerDose(5, 'g', 0, 'g')).toBe(0);
      expect(costPerDose(5, 'g', -1, 'g')).toBe(0);
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
