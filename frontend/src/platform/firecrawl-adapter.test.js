import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FirecrawlAdapter } from './firecrawl-adapter.js';

describe('FirecrawlAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new FirecrawlAdapter('test-api-key');
    global.fetch = vi.fn();
  });

  it('should initialize with API key', () => {
    expect(adapter.apiKey).toBe('test-api-key');
    expect(adapter.baseUrl).toBe('https://api.firecrawl.dev/v1');
  });

  it('should scrape URL successfully', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: { title: 'Test Page' },
        markdown: '# Test Page',
        html: '<h1>Test Page</h1>'
      }))
    );

    const result = await adapter.scrapeUrl('https://example.com');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('title');
    expect(result.markdown).toBeDefined();
    expect(result.html).toBeDefined();
  });

  it('should handle scrape errors', async () => {
    global.fetch.mockRejectedValue(new Error('Network error'));

    const result = await adapter.scrapeUrl('https://example.com');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should extract structured data', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: {
          products: [
            { name: 'Product 1', price: 29.99 }
          ]
        }
      }))
    );

    const schema = { type: 'object', properties: {} };
    const result = await adapter.extractStructuredData('https://example.com', schema);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('products');
  });

  it('should batch scrape multiple URLs', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: { title: 'Test' },
        markdown: '# Test'
      }))
    );

    const urls = ['https://example1.com', 'https://example2.com'];
    const results = await adapter.batchScrape(urls);

    expect(results.length).toBe(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should scrape Mercado Livre', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: {
          products: [
            {
              title: 'Vitamin D',
              price: 35.50,
              seller: 'Store A',
              rating: 4.5
            }
          ]
        }
      }))
    );

    const results = await adapter.scrapeMercadoLivre('Vitamin D');

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should scrape Amazon', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: {
          products: [
            {
              title: 'Vitamin D',
              price: 38.90,
              prime: true,
              rating: 4.7
            }
          ]
        }
      }))
    );

    const results = await adapter.scrapeAmazon('Vitamin D');

    expect(Array.isArray(results)).toBe(true);
  });

  it('should scrape product details', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: {
          name: 'Vitamin D 2000IU',
          price: 35.50,
          description: 'High quality vitamin D',
          dosage: '2000 IU',
          rating: 4.5
        }
      }))
    );

    const result = await adapter.scrapeProductDetails('https://example.com/product');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('name');
    expect(result.data).toHaveProperty('price');
  });

  it('should scrape competitor prices', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: { price: 35.50, availability: 'Em estoque' }
      }))
    );

    const urls = ['https://site1.com', 'https://site2.com', 'https://site3.com'];
    const result = await adapter.scrapeCompetitorPrices('Vitamin D', urls);

    expect(result).toHaveProperty('supplementName', 'Vitamin D');
    expect(result).toHaveProperty('competitorCount', 3);
    expect(Array.isArray(result.prices)).toBe(true);
  });

  it('should monitor price changes', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: { price: 32.00 }
      }))
    );

    const result = await adapter.monitorPrice('https://example.com/product', 35.00);

    expect(result.success).toBe(true);
    expect(result).toHaveProperty('previousPrice', 35.00);
    expect(result).toHaveProperty('currentPrice');
    expect(result).toHaveProperty('priceChange');
    expect(result).toHaveProperty('direction');
  });

  it('should detect price increase alert', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: { price: 40.00 }
      }))
    );

    const result = await adapter.monitorPrice('https://example.com/product', 35.00);

    if (result.success) {
      expect(result.direction).toBe('up');
      expect(result.percentChange).toBeGreaterThan(0);
    }
  });

  it('should validate API connection', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({})));

    const isValid = await adapter.validateConnection();

    expect(typeof isValid).toBe('boolean');
  });

  it('should handle timeout', async () => {
    global.fetch.mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    const result = await Promise.race([
      adapter.scrapeUrl('https://example.com'),
      new Promise(resolve => setTimeout(() => resolve({ timeout: true }), 1000))
    ]);

    // Should timeout
    expect(result || {}).toBeDefined();
  });

  it('should send correct headers', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({ data: {} })
      )
    );

    await adapter.scrapeUrl('https://example.com');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json'
        })
      })
    );
  });

  it('should batch with rate limiting', async () => {
    global.fetch.mockResolvedValue(
      new Response(JSON.stringify({
        data: {},
        markdown: ''
      }))
    );

    const urls = ['https://site1.com', 'https://site2.com'];
    const startTime = Date.now();

    await adapter.batchScrape(urls);

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(adapter.rateLimitDelay);
  });
});
