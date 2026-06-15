import { describe, it, expect, vi, beforeEach } from 'vitest';

let checkinsStore = [];
vi.mock('../../state/state-manager.js', () => ({
  stateManager: { get checkins() { return checkinsStore; } },
}));
vi.mock('./stack-recommender.js', () => ({
  SUPPLEMENTS_DB: [
    { id: 'creatina', pricePerGram: 0.3, image: '/assets/creatina.webp', evidenceLevel: 'A' },
    { id: 'vitd', pricePerGram: 0.5, evidenceLevel: 'B' },
  ],
}));
vi.mock('../../utils/stack.js', () => ({
  getSupplementId: (item) => item?.supplementId ?? item?.id,
}));
vi.mock('./stack-dose.js', () => ({
  resolveItemDose: (item) => ({ daily: parseFloat(item.dosage) || 5, unit: item.unit || 'g' }),
  dailyDoseInGrams: (daily, unit) => (unit === 'ui' ? null : daily),
}));
// offsetISO(i) → datas determinísticas "D-0".."D-6"
vi.mock('../../utils/date.js', () => ({
  offsetISO: (i) => `D-${i}`,
}));

import {
  formatBRL, calcMonthlyInvestment, calcAdherenceRate,
  getSupplementImage, getEvidenceLevel, calcDaysLeft, fetchPrices,
} from './my-stack-page-utils.js';

describe('my-stack-page-utils', () => {
  beforeEach(() => { checkinsStore = []; });

  describe('formatBRL', () => {
    it('formata moeda', () => {
      expect(formatBRL(12.5)).toBe('R$ 12,50');
      expect(formatBRL(0)).toBe('R$ 0,00');
    });
  });

  describe('calcMonthlyInvestment', () => {
    it('soma custo mensal = dose×ppg×30', () => {
      // creatina: daily 5g × 0.3 × 30 = 45
      const stack = [{ supplementId: 'creatina', dosage: '5', unit: 'g' }];
      expect(calcMonthlyInvestment(stack)).toBeCloseTo(45, 5);
    });
    it('ignora itens com unidade não-mássica (UI → null)', () => {
      const stack = [{ supplementId: 'vitd', dosage: '2000', unit: 'ui' }];
      expect(calcMonthlyInvestment(stack)).toBe(0);
    });
    it('stack vazio retorna 0', () => {
      expect(calcMonthlyInvestment([])).toBe(0);
    });
  });

  describe('calcAdherenceRate', () => {
    it('0% quando stack vazio', () => {
      expect(calcAdherenceRate([])).toBe('0%');
    });
    it('100% quando todos os itens marcados nos 7 dias', () => {
      const stack = [{ supplementId: 'creatina' }];
      checkinsStore = Array.from({ length: 7 }, (_, i) => ({ date: `D-${i}`, supplementId: 'creatina' }));
      expect(calcAdherenceRate(stack)).toBe('100%');
    });
    it('aproxima parcial — 1 de 7 dias completos', () => {
      const stack = [{ supplementId: 'creatina' }];
      checkinsStore = [{ date: 'D-0', supplementId: 'creatina' }];
      expect(calcAdherenceRate(stack)).toBe(Math.round((1 / 7) * 100) + '%');
    });
  });

  describe('getSupplementImage', () => {
    it('usa imagem do banco', () => {
      expect(getSupplementImage({ supplementId: 'creatina' })).toBe('/assets/creatina.webp');
    });
    it('gera slug webp quando o banco não tem imagem', () => {
      expect(getSupplementImage({ id: 'desconhecido', name: 'Ácido Fólico' })).toBe('/assets/cido_flico.webp');
    });
  });

  describe('getEvidenceLevel', () => {
    it('lê do banco, default C', () => {
      expect(getEvidenceLevel({ supplementId: 'creatina' })).toBe('A');
      expect(getEvidenceLevel({ supplementId: 'inexistente' })).toBe('C');
    });
  });

  describe('calcDaysLeft', () => {
    it('floor(qty/dosage)', () => {
      expect(calcDaysLeft({ quantity: '300', dosage: '5' })).toBe(60);
    });
    it('null para dados ausentes/zero', () => {
      expect(calcDaysLeft({ quantity: '0', dosage: '5' })).toBeNull();
      expect(calcDaysLeft({ quantity: '300', dosage: '0' })).toBeNull();
    });
  });

  describe('fetchPrices', () => {
    it('retorna {} e cacheia em falha de fetch', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('offline')));
      const r = await fetchPrices();
      expect(r).toEqual({});
    });
  });
});
