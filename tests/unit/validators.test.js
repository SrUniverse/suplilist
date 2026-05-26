import { describe, it, expect } from 'vitest';
import {
  isValidSlug,
  isPositive,
  isUnique
} from '../../src/js/utils/validators.js';

describe('Validators', () => {
  it('isValidSlug() deve validar apenas strings que contenham minúsculas, números e hífens', () => {
    expect(isValidSlug('creatina-mono')).toBe(true);
    expect(isValidSlug('creatina')).toBe(true);
    expect(isValidSlug('l-citrulina-1kg')).toBe(true);
    
    // Rejeições
    expect(isValidSlug('Creatina Mono')).toBe(false);
    expect(isValidSlug('creatina_mono')).toBe(false);
    expect(isValidSlug('creatina-mono ')).toBe(false);
    expect(isValidSlug('')).toBe(false);
    expect(isValidSlug(null)).toBe(false);
  });

  it('isPositive() deve retornar true se for número estritamente positivo', () => {
    expect(isPositive(5)).toBe(true);
    expect(isPositive(0.1)).toBe(true);
    
    // Rejeições
    expect(isPositive(0)).toBe(false);
    expect(isPositive(-1)).toBe(false);
    expect(isPositive('5')).toBe(false);
    expect(isPositive(NaN)).toBe(false);
  });

  it('isUnique() deve retornar true se todos os elementos no array forem únicos', () => {
    expect(isUnique([1, 2, 3])).toBe(true);
    expect(isUnique(['creatina', 'whey', 'maca'])).toBe(true);
    
    // Rejeições
    expect(isUnique([1, 1, 2])).toBe(false);
    expect(isUnique(['creatina', 'creatina'])).toBe(false);
    expect(isUnique('não é um array')).toBe(false);
  });
});
