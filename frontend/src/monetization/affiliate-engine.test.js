import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock eventBus before importing engine
vi.mock('../core/event-bus.js', () => ({
  eventBus: { emit: vi.fn() },
  EVENTS: { AFFILIATE_CLICK: 'affiliate_click' },
}));

import { eventBus, EVENTS } from '../core/event-bus.js';
import affiliateEngine from './affiliate-engine.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AffiliateEngine.getLinks', () => {
  it('returns amazon, mercadolivre, and shopee keys', () => {
    const links = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(links).toHaveProperty('amazon');
    expect(links).toHaveProperty('mercadolivre');
    expect(links).toHaveProperty('shopee');
  });

  it('Amazon URL contains affiliate tag suplilist01-20', () => {
    const { amazon } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(amazon).toContain('tag=suplilist01-20');
  });

  it('Amazon URL encodes supplement name in query', () => {
    const { amazon } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(amazon).toContain('Creatina%20Monoidratada');
  });

  it('Mercado Livre URL contains slug with Ordenação e Filtro', () => {
    const { mercadolivre } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(mercadolivre).toContain('creatina-monoidratada_OrderId_PRICE_ASC');
  });

  it('Shopee URL contains supplement name in query and filters', () => {
    const { shopee } = affiliateEngine.getLinks('Creatina Monoidratada');
    expect(shopee).toContain('keyword=Creatina%20Monoidratada');
    expect(shopee).toContain('sortBy=sales');
  });

  it('encodes special characters in supplement name correctly', () => {
    const { amazon } = affiliateEngine.getLinks('Vitamina C 1000mg + Zinco');
    expect(amazon).toContain(encodeURIComponent('Vitamina C 1000mg + Zinco'));
    expect(amazon).not.toContain(' ');
  });
});

describe('AffiliateEngine.trackClick', () => {
  it('emits AFFILIATE_CLICK event with supplementId and marketplace', () => {
    affiliateEngine.trackClick('creatina-monohidratada', 'amazon');
    expect(eventBus.emit).toHaveBeenCalledWith(
      EVENTS.AFFILIATE_CLICK,
      { supplementId: 'creatina-monohidratada', marketplace: 'amazon' }
    );
  });

  it('emits the event on each call (no dedup)', () => {
    affiliateEngine.trackClick('whey-protein', 'shopee');
    affiliateEngine.trackClick('whey-protein', 'shopee');
    expect(eventBus.emit).toHaveBeenCalledTimes(2);
  });
});
