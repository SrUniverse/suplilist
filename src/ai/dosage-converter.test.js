import { describe, it, expect } from 'vitest';
import { convertToGrams, isConvertibleToGrams } from './dosage-converter.js';

describe('dosage-converter', () => {
  describe('convertToGrams', () => {
    it('should convert grams to grams (identity)', () => {
      expect(convertToGrams(5, 'g')).toBe(5);
    });

    it('should convert milligrams to grams', () => {
      expect(convertToGrams(1000, 'mg')).toBe(1);
      expect(convertToGrams(500, 'mg')).toBe(0.5);
    });

    it('should convert micrograms to grams', () => {
      expect(convertToGrams(1_000_000, 'mcg')).toBe(1);
      expect(convertToGrams(50, 'mcg')).toBe(0.00005);
    });

    it('should convert UI to grams for vitamina-d3', () => {
      const result = convertToGrams(2000, 'UI', 'vitamina-d3');
      expect(result).toBeCloseTo(0.00005, 8); // 2000 UI = 50 mcg = 0.00005 g (floating point tolerance)
    });

    it('should throw error for UI without supplementId', () => {
      expect(() => convertToGrams(2000, 'UI')).toThrow('supplementId is required');
    });

    it('should throw error for unconfigured UI supplement', () => {
      expect(() => convertToGrams(100, 'UI', 'unknown-supplement')).toThrow(
        'UI to grams conversion not configured'
      );
    });

    it('should throw error for bi UFC (bacterial units)', () => {
      expect(() => convertToGrams(10, 'bi UFC')).toThrow('cannot be converted to grams');
    });

    it('should throw error for unknown unit', () => {
      expect(() => convertToGrams(100, 'invalid-unit')).toThrow('Unknown unit');
    });

    it('should throw error for negative dose', () => {
      expect(() => convertToGrams(-10, 'mg')).toThrow('must be a non-negative number');
    });

    it('should throw error for non-numeric dose', () => {
      expect(() => convertToGrams('100', 'mg')).toThrow('must be a non-negative number');
    });
  });

  describe('isConvertibleToGrams', () => {
    it('should return true for convertible units', () => {
      expect(isConvertibleToGrams('g')).toBe(true);
      expect(isConvertibleToGrams('mg')).toBe(true);
      expect(isConvertibleToGrams('mcg')).toBe(true);
    });

    it('should return true for UI with configured supplementId', () => {
      expect(isConvertibleToGrams('UI', 'vitamina-d3')).toBe(true);
    });

    it('should return false for UI without supplementId', () => {
      expect(isConvertibleToGrams('UI')).toBe(false);
    });

    it('should return false for UI with unconfigured supplementId', () => {
      expect(isConvertibleToGrams('UI', 'unknown-supplement')).toBe(false);
    });

    it('should return false for non-convertible units', () => {
      expect(isConvertibleToGrams('bi UFC')).toBe(false);
      expect(isConvertibleToGrams('invalid-unit')).toBe(false);
    });
  });
});
