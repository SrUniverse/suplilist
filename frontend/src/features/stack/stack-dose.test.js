import { describe, it, expect, vi, beforeEach } from 'vitest';

let userState = {};
const calcMock = vi.fn();

vi.mock('../calculator/dosage-calculator.js', () => ({
  dosageCalculator: { calculate: (...a) => calcMock(...a) },
}));
vi.mock('./stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: 'creatina', dosage: { unit: 'g' } },
    { id: 'vitd', dosage: { unit: 'UI' } },
  ],
}));
vi.mock('../../utils/stack.js', () => ({
  getSupplementId: (item) => item?.supplementId ?? item?.id,
}));
vi.mock('../../state/state-manager.js', () => ({
  stateManager: { get: (k) => (k === 'user' ? userState : undefined) },
}));

import {
  getUserDosageProfile, computeDailyDose, resolveItemDose,
  dailyDoseInGrams, normalizeDose, formatDose, formatDoseShort,
} from './stack-dose.js';

describe('stack-dose', () => {
  beforeEach(() => { userState = {}; calcMock.mockReset(); });

  describe('getUserDosageProfile', () => {
    it('aplica defaults seguros quando o estado é vazio', () => {
      expect(getUserDosageProfile()).toEqual({ weight: 70, trainingFrequency: 3, objective: 'general', age: 25 });
    });
    it('usa valores do estado quando presentes', () => {
      userState = { weight: 90, trainingFrequency: 5, objective: 'bulk', age: 30 };
      expect(getUserDosageProfile()).toEqual({ weight: 90, trainingFrequency: 5, objective: 'bulk', age: 30 });
    });
  });

  describe('computeDailyDose', () => {
    it('retorna {null,g} para suplemento ausente', () => {
      expect(computeDailyDose(null)).toEqual({ daily: null, unit: 'g' });
    });
    it('delega ao dosageCalculator', () => {
      calcMock.mockReturnValue({ daily: 5, unit: 'g' });
      expect(computeDailyDose({ id: 'creatina' }, { weight: 80 })).toEqual({ daily: 5, unit: 'g' });
      expect(calcMock).toHaveBeenCalledWith({ id: 'creatina' }, { weight: 80 });
    });
    it('cai para unit do banco quando o cálculo lança', () => {
      calcMock.mockImplementation(() => { throw new Error('boom'); });
      expect(computeDailyDose({ id: 'x', dosage: { unit: 'mg' } })).toEqual({ daily: null, unit: 'mg' });
    });
  });

  describe('resolveItemDose', () => {
    it('usa a dose salva quando numérica e positiva', () => {
      expect(resolveItemDose({ dosage: '7', unit: 'g' })).toEqual({ daily: 7, unit: 'g' });
    });
    it('recomputa via banco quando dose salva é inválida', () => {
      calcMock.mockReturnValue({ daily: 3, unit: 'g' });
      expect(resolveItemDose({ supplementId: 'creatina', dosage: 'undefined' })).toEqual({ daily: 3, unit: 'g' });
    });
  });

  describe('dailyDoseInGrams', () => {
    it('converte g/mg/mcg', () => {
      expect(dailyDoseInGrams(5, 'g')).toBe(5);
      expect(dailyDoseInGrams(500, 'mg')).toBe(0.5);
      expect(dailyDoseInGrams(1_000_000, 'mcg')).toBe(1);
    });
    it('retorna 0 para dose inválida', () => {
      expect(dailyDoseInGrams(0, 'g')).toBe(0);
      expect(dailyDoseInGrams(NaN, 'g')).toBe(0);
    });
    it('retorna null para unidade não-mássica (UI)', () => {
      expect(dailyDoseInGrams(2000, 'ui')).toBeNull();
    });
  });

  describe('normalizeDose', () => {
    it('1000mg → 1g', () => {
      expect(normalizeDose(1000, 'mg')).toEqual({ value: 1, unit: 'g' });
    });
    it('1000mcg → 1mg', () => {
      expect(normalizeDose(1000, 'mcg')).toEqual({ value: 1, unit: 'mg' });
    });
    it('arredonda a 1 casa abaixo de 100 e inteiro acima', () => {
      expect(normalizeDose(5.46, 'g')).toEqual({ value: 5.5, unit: 'g' });
      expect(normalizeDose(123.7, 'g')).toEqual({ value: 124, unit: 'g' });
    });
    it('preserva UI em maiúsculo', () => {
      expect(normalizeDose(500, 'ui')).toEqual({ value: 500, unit: 'UI' });
    });
  });

  describe('formatDose / formatDoseShort', () => {
    it('formata com /dia', () => {
      expect(formatDose({ daily: 5, unit: 'g' })).toBe('5g/dia');
    });
    it('formato curto com espaço', () => {
      expect(formatDoseShort({ daily: 5, unit: 'g' })).toBe('5 g');
    });
    it('retorna — para dose indisponível', () => {
      expect(formatDose({ daily: null, unit: 'g' })).toBe('—');
      expect(formatDoseShort({ daily: 0, unit: 'g' })).toBe('—');
      expect(formatDose(null)).toBe('—');
    });
  });
});
