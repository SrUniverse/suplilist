import { describe, it, expect, vi, beforeEach } from 'vitest';

// stateManager é usado por getFavoritesFromState/toggleFavorite
const dispatchMock = vi.fn();
let favoritesStore = [];
vi.mock('../../state/state-manager.js', () => ({
  ACTIONS: { ADD_FAVORITE: 'ADD_FAVORITE', REMOVE_FAVORITE: 'REMOVE_FAVORITE' },
  stateManager: {
    get favorites() { return favoritesStore; },
    dispatch: (...args) => dispatchMock(...args),
  },
}));

import {
  CATEGORIES, OBJECTIVES, OBJECTIVE_KEY_MAP,
  sanitizeUrl, isProductUrl, getEffectiveCost, getCheapestStore,
  getPriceLabel, getDosePrice, getMaxSaving, formatPrice,
  matchesCategory, matchesObjective, getFavoritesFromState, toggleFavorite,
} from './list-page-utils.js';

describe('list-page-utils', () => {
  describe('constantes exportadas', () => {
    it('CATEGORIES inclui Todos e Performance', () => {
      expect(CATEGORIES).toContain('Todos');
      expect(CATEGORIES).toContain('Performance');
    });
    it('OBJECTIVE_KEY_MAP mapeia Hipertrofia → bulk', () => {
      expect(OBJECTIVE_KEY_MAP['Hipertrofia']).toBe('bulk');
      expect(OBJECTIVES).toContain('Foco');
    });
  });

  describe('sanitizeUrl', () => {
    it('aceita https e http', () => {
      expect(sanitizeUrl('https://amazon.com.br/dp/X')).toBe('https://amazon.com.br/dp/X');
      expect(sanitizeUrl('http://x.com')).toBe('http://x.com');
    });
    it('rejeita javascript: e protocolos não-HTTP', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
      expect(sanitizeUrl('ftp://x.com')).toBe('#');
    });
    it('retorna # para entrada inválida', () => {
      expect(sanitizeUrl('')).toBe('#');
      expect(sanitizeUrl(null)).toBe('#');
      expect(sanitizeUrl('não é url')).toBe('#');
    });
  });

  describe('isProductUrl', () => {
    it('reconhece deep-links de produto', () => {
      expect(isProductUrl('https://amzn.to/abc')).toBe(true);
      expect(isProductUrl('https://amazon.com.br/dp/B01')).toBe(true);
      expect(isProductUrl('https://meli.la/xyz')).toBe(true);
      expect(isProductUrl('https://shope.ee/abc')).toBe(true);
    });
    it('rejeita links de busca genéricos e nulos', () => {
      expect(isProductUrl('https://amazon.com.br/s?k=creatina')).toBe(false);
      expect(isProductUrl(null)).toBe(false);
    });
  });

  describe('getEffectiveCost / getCheapestStore', () => {
    it('prefere pricePerUnit, cai para price', () => {
      expect(getEffectiveCost({ pricePerUnit: 0.3, price: 90 })).toBe(0.3);
      expect(getEffectiveCost({ price: 90 })).toBe(90);
    });
    it('retorna a loja mais barata por custo-unitário', () => {
      const prices = { creatina: { a: { pricePerUnit: 0.30, label: 'A' }, b: { pricePerUnit: 0.25, label: 'B' } } };
      expect(getCheapestStore({ id: 'creatina' }, prices).label).toBe('B');
    });
    it('retorna null sem dados de preço', () => {
      expect(getCheapestStore({ id: 'x' }, null)).toBeNull();
      expect(getCheapestStore({ id: 'x' }, {})).toBeNull();
    });
  });

  describe('getPriceLabel', () => {
    it('usa loja mais barata quando há preço', () => {
      const prices = { c: { a: { price: 80, pricePerUnit: 0.27, label: 'ML' } } };
      const r = getPriceLabel({ id: 'c' }, prices);
      expect(r.price).toBe(80);
      expect(r.label).toBe('ML');
    });
    it('estima por pricePerGram sem dados live (label null)', () => {
      const r = getPriceLabel({ id: 'x', dosage: { maintenance: 5, unit: 'g' }, pricePerGram: 0.3 }, {});
      expect(r.label).toBeNull();
      expect(r.price).toBeCloseTo(5 * 0.3 * 30, 5); // 45
    });
  });

  describe('getDosePrice', () => {
    it('calcula por pricePerUnit×dose quando disponível', () => {
      const prices = { c: { a: { pricePerUnit: 0.3, unit: 'g', price: 90, label: 'A' } } };
      expect(getDosePrice({ id: 'c', dosage: { maintenance: 5, unit: 'g' } }, prices)).toBe('R$ 1,50 / dose');
    });
    it('estima via pricePerGram sem dados live', () => {
      const r = getDosePrice({ id: 'x', dosage: { maintenance: 5, unit: 'g' }, pricePerGram: 0.3 }, {});
      expect(r).toBe('R$ 1,50 / dose');
    });
    it('retorna string vazia quando preço estimado é zero', () => {
      expect(getDosePrice({ id: 'x', dosage: { maintenance: 0, unit: 'g' }, pricePerGram: 0 }, {})).toBe('');
    });

    // Regressão: a dose deve ser convertida pela unidade DELA (item.dosage.unit),
    // não pela unidade da embalagem da loja (cheapest.unit).
    it('converte dose em mg contra preço por grama (Colágeno 10000mg)', () => {
      const prices = { colageno: { s: { pricePerUnit: 0.18, unit: 'g', price: 54.9, label: 'S' } } };
      // 10000mg = 10g × R$0,18/g = R$ 1,80 (não R$ 1800)
      expect(getDosePrice({ id: 'colageno', dosage: { maintenance: 10000, unit: 'mg' } }, prices))
        .toBe('R$ 1,80 / dose');
    });
    it('usa preço por cápsula para dose em mg (Boro 3mg, embalagem em caps)', () => {
      const prices = { boro: { s: { pricePerUnit: 0.75, unit: 'caps', price: 44.9, label: 'S' } } };
      // 1 cápsula por dose = R$ 0,75 (não R$ 0,00)
      expect(getDosePrice({ id: 'boro', dosage: { maintenance: 3, unit: 'mg' } }, prices))
        .toBe('R$ 0,75 / dose');
    });
    it('converte dose em mcg contra preço por grama', () => {
      const prices = { c: { s: { pricePerUnit: 4, unit: 'g', price: 30, label: 'S' } } };
      // 200mcg = 0,0002g × R$4/g = R$ 0,0008 → arredonda para R$ 0,00
      expect(getDosePrice({ id: 'c', dosage: { maintenance: 200, unit: 'mcg' } }, prices))
        .toBe('R$ 0,00 / dose');
    });
    it('nunca excede o preço do pacote (clamp de sanidade)', () => {
      const prices = { c: { s: { pricePerUnit: 9999, unit: 'g', price: 50, label: 'S' } } };
      expect(getDosePrice({ id: 'c', dosage: { maintenance: 100, unit: 'g' } }, prices))
        .toBe('R$ 50,00 / dose');
    });
  });

  describe('getMaxSaving', () => {
    it('retorna economia quando >5% do melhor preço', () => {
      const prices = { c: { a: { price: 100, saving: 0 }, b: { price: 90, saving: 10 } } };
      expect(getMaxSaving({ id: 'c' }, prices)).toBe(10);
    });
    it('retorna null quando economia é insignificante (≤5%)', () => {
      const prices = { c: { a: { price: 100, saving: 2 } } };
      expect(getMaxSaving({ id: 'c' }, prices)).toBeNull();
    });
    it('retorna null sem dados', () => {
      expect(getMaxSaving({ id: 'c' }, null)).toBeNull();
      expect(getMaxSaving({ id: 'c' }, {})).toBeNull();
    });
  });

  describe('formatPrice', () => {
    it('formata moeda BRL com separador de milhar', () => {
      expect(formatPrice(123.45)).toBe('R$ 123,45');
      expect(formatPrice(1234.5)).toBe('R$ 1.234,50');
    });
  });

  describe('matchesCategory', () => {
    it('Todos e vazio retornam true', () => {
      expect(matchesCategory({ category: 'Qualquer' }, 'Todos')).toBe(true);
      expect(matchesCategory({ category: 'Qualquer' }, '')).toBe(true);
    });
    it('Performance casa força/queima/recovery', () => {
      expect(matchesCategory({ category: 'Força & Performance' }, 'Performance')).toBe(true);
      expect(matchesCategory({ category: 'Queima de Gordura & Recovery' }, 'Performance')).toBe(true);
    });
    it('Proteínas casa por prefixo prote', () => {
      expect(matchesCategory({ category: 'Proteínas' }, 'Proteínas')).toBe(true);
      expect(matchesCategory({ category: 'Vitaminas' }, 'Proteínas')).toBe(false);
    });
    it('Saúde Geral casa intestino/articular/ômega', () => {
      expect(matchesCategory({ category: 'Saúde Intestinal' }, 'Saúde Geral')).toBe(true);
      expect(matchesCategory({ category: 'Saúde Articular & Pele' }, 'Saúde Geral')).toBe(true);
    });
  });

  describe('matchesObjective', () => {
    it('sem objetivo retorna true', () => {
      expect(matchesObjective({ targets: {} }, '')).toBe(true);
    });
    it('casa quando target da chave mapeada é >0', () => {
      expect(matchesObjective({ targets: { bulk: 0.9 } }, 'Hipertrofia')).toBe(true);
      expect(matchesObjective({ targets: { bulk: 0 } }, 'Hipertrofia')).toBe(false);
      expect(matchesObjective({ targets: {} }, 'Hipertrofia')).toBe(false);
    });
  });

  describe('favoritos', () => {
    beforeEach(() => { favoritesStore = []; dispatchMock.mockClear(); });
    it('getFavoritesFromState devolve Set', () => {
      favoritesStore = ['a', 'b'];
      const s = getFavoritesFromState();
      expect(s).toBeInstanceOf(Set);
      expect(s.has('a')).toBe(true);
    });
    it('toggleFavorite adiciona quando ausente', () => {
      favoritesStore = [];
      toggleFavorite('creatina');
      expect(dispatchMock).toHaveBeenCalledWith('ADD_FAVORITE', { supplementId: 'creatina' });
    });
    it('toggleFavorite remove quando presente', () => {
      favoritesStore = ['creatina'];
      toggleFavorite('creatina');
      expect(dispatchMock).toHaveBeenCalledWith('REMOVE_FAVORITE', { supplementId: 'creatina' });
    });
  });
});
