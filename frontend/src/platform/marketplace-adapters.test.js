import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../utils/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}));

import {
  MercadoLivreAdapter,
  AmazonAdapter,
  NatueAdapter,
  VitaforAdapter,
} from './marketplace-adapters.js';

describe('MercadoLivreAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MercadoLivreAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct name', () => {
    expect(adapter.name).toBe('Mercado Livre');
  });

  it('should return results on success', async () => {
    const mockData = {
      results: [
        {
          id: 'MLB1', title: 'Creatina 300g', price: 79.90,
          currency_id: 'BRL', permalink: 'https://ml.com/item/1',
          seller: { nickname: 'SellerX', seller_reputation: { power_seller_status: 'gold' } },
          shipping: { free_shipping: true },
          available_quantity: 5
        }
      ]
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const result = await adapter.search('creatina');
    expect(result.marketplace).toBe('Mercado Livre');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].price).toBe(79.90);
    expect(result.results[0].shipping).toBe('Frete grátis');
  });

  it('should return error structure on HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

    const result = await adapter.search('creatina');
    expect(result.results).toEqual([]);
    expect(result.error).toBeDefined();
  });

  it('should return error structure on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const result = await adapter.search('creatina');
    expect(result.results).toEqual([]);
    expect(result.error).toBe('network down');
  });

  it('should return null from getLowestPrice on empty results', () => {
    expect(adapter.getLowestPrice([])).toBeNull();
  });

  it('should return the cheapest item from getLowestPrice', () => {
    const results = [
      { price: 100 },
      { price: 50 },
      { price: 75 }
    ];
    const lowest = adapter.getLowestPrice(results);
    expect(lowest.price).toBe(50);
  });

  it('should mark out-of-stock when quantity is 0', async () => {
    const mockData = {
      results: [
        {
          id: 'MLB2', title: 'Whey 900g', price: 120,
          currency_id: 'BRL', permalink: 'https://ml.com/item/2',
          seller: { nickname: 'SellerY', seller_reputation: {} },
          shipping: { free_shipping: false },
          available_quantity: 0
        }
      ]
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockData });

    const result = await adapter.search('whey');
    expect(result.results[0].availability).toBe('Fora de estoque');
    expect(result.results[0].shipping).toBe('Frete a calcular');
  });
});

describe('AmazonAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new AmazonAdapter();
  });

  it('should have correct name', () => {
    expect(adapter.name).toBe('Amazon');
  });

  it('should return results on success', async () => {
    const mockData = {
      Items: [
        {
          ASIN: 'B001', Title: 'Creatina Amazon',
          Offers: { Listings: [{ Price: { Amount: 89.90 }, MerchantInfo: { Name: 'Amazon.com.br' }, DeliveryInfo: { IsAmazonFulfilled: true }, Availability: { Message: 'Em estoque' } }] },
          CustomerReviews: { AmazonCustomerReviews: { Rating: 4.5, Count: 200 } }
        }
      ]
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockData });

    const result = await adapter.search('creatina');
    expect(result.marketplace).toBe('Amazon');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].shipping).toBe('Prime');
  });

  it('should return error structure on failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    const result = await adapter.search('creatina');
    expect(result.results).toEqual([]);
    expect(result.error).toBe('timeout');
  });

  it('should handle missing Items in response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const result = await adapter.search('creatina');
    expect(result.results).toEqual([]);
  });
});

describe('NatueAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new NatueAdapter();
  });

  it('should have correct name', () => {
    expect(adapter.name).toBe('Natue');
  });

  it('should return results on success', async () => {
    const mockData = {
      products: [
        { sku: 'N001', name: 'Vitamina C', price: 45.00, original_price: 55.00, discount_percent: 10, url: 'https://natue.com.br/vitamina-c', rating: 4.2, reviews_count: 80, free_shipping: true, in_stock: true }
      ]
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockData });

    const result = await adapter.search('vitamina c');
    expect(result.marketplace).toBe('Natue');
    expect(result.results[0].discount).toBe(10);
    expect(result.results[0].shipping).toBe('Frete grátis');
  });

  it('should handle empty products array', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ products: [] }) });
    const result = await adapter.search('vitamina');
    expect(result.results).toEqual([]);
  });
});

describe('VitaforAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new VitaforAdapter();
  });

  it('should have correct name', () => {
    expect(adapter.name).toBe('Vitafor');
  });

  it('should return results on success', async () => {
    const mockData = {
      items: [
        { code: 'V001', title: 'Whey Vitafor', sale_price: 99.90, price: 120.00, discount: 20, url: 'https://vitafor.com.br/whey', rating: 4.8, review_count: 300, stock: 10 }
      ]
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => mockData });

    const result = await adapter.search('whey');
    expect(result.marketplace).toBe('Vitafor');
    expect(result.results[0].price).toBe(99.90);
    expect(result.results[0].availability).toBe('Em estoque');
  });

  it('should return error on HTTP 404', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await adapter.search('whey');
    expect(result.results).toEqual([]);
    expect(result.error).toBeDefined();
  });
});
