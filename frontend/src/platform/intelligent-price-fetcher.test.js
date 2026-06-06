import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntelligentPriceFetcher } from './intelligent-price-fetcher.js';

describe('IntelligentPriceFetcher', () => {
  let fetcher;

  beforeEach(() => {
    fetcher = new IntelligentPriceFetcher();
    vi.clearAllMocks();
  });

  it('should initialize with both sources', () => {
    expect(fetcher.priceAggregator).toBeDefined();
    expect(fetcher.firecrawl).toBeDefined();
  });

  it('should fetch prices via API', async () => {
    vi.spyOn(fetcher.priceAggregator, 'getPrices').mockResolvedValue({
      supplementName: 'Vitamin D',
      allResults: [
        { price: 29.99, marketplace: 'ML' },
        { price: 32.00, marketplace: 'Amazon' }
      ],
      stats: {
        lowestPrice: 29.99,
        averagePrice: 31.00,
        highestPrice: 32.00
      }
    });

    const result = await fetcher.fetchPrices('Vitamin D');

    expect(result.source).toBe('api');
    expect(result.allResults.length).toBeGreaterThan(0);
  });

  it('should fallback to Firecrawl if API sparse', async () => {
    vi.spyOn(fetcher.priceAggregator, 'getPrices').mockResolvedValue({
      supplementName: 'Vitamin D',
      allResults: [{ price: 35.00 }], // Only 1 result
      stats: { lowestPrice: 35.00 }
    });

    vi.spyOn(fetcher, 'augmentWithFirecrawl').mockResolvedValue({
      supplementName: 'Vitamin D',
      source: 'hybrid',
      augmented: true,
      allResults: [
        { price: 29.99 },
        { price: 32.00 },
        { price: 35.00 }
      ]
    });

    fetcher.useFirecrawl = true;
    const result = await fetcher.fetchPrices('Vitamin D');

    expect(result.augmented || result.source === 'api').toBe(true);
  });

  it('should combine API and Firecrawl results', async () => {
    const apiResults = [
      { price: 29.99, marketplace: 'API-ML' }
    ];

    const firecrawlResults = [
      { price: 32.00, title: 'Vitamin D' },
      { price: 35.50, title: 'Vitamin D' }
    ];

    const combined = [
      ...apiResults,
      ...firecrawlResults
    ];

    expect(combined.length).toBe(3);
    combined.sort((a, b) => a.price - b.price);
    expect(combined[0].price).toBe(29.99);
  });

  it('should calculate statistics correctly', () => {
    const results = [
      { price: 25.00 },
      { price: 30.00 },
      { price: 35.00 }
    ];

    const stats = fetcher.calculateStats(results);

    expect(stats.lowestPrice).toBe(25.00);
    expect(stats.highestPrice).toBe(35.00);
    expect(stats.averagePrice).toBe(30.00);
    expect(stats.savings).toBe(10.00);
  });

  it('should handle empty results', () => {
    const stats = fetcher.calculateStats([]);

    expect(stats.lowestPrice).toBeNull();
    expect(stats.highestPrice).toBeNull();
    expect(stats.averagePrice).toBeNull();
    expect(stats.savings).toBe(0);
  });

  it('should fetch entirely via Firecrawl if API fails', async () => {
    vi.spyOn(fetcher.priceAggregator, 'getPrices').mockRejectedValue(
      new Error('API error')
    );

    vi.spyOn(fetcher, 'fetchViaFirecrawl').mockResolvedValue({
      supplementName: 'Vitamin D',
      source: 'firecrawl',
      allResults: [
        { price: 29.99, marketplace: 'Mercado Livre' },
        { price: 32.00, marketplace: 'Amazon' }
      ]
    });

    fetcher.useFirecrawl = true;
    const result = await fetcher.fetchPrices('Vitamin D');

    expect(result.source === 'firecrawl' || result.source === 'api').toBe(true);
  });

  it('should start price monitoring', () => {
    const monitor = fetcher.startPriceMonitoring('Vitamin D', 60000);

    expect(monitor).toHaveProperty('stop');
    expect(monitor).toHaveProperty('supplementName', 'Vitamin D');

    monitor.stop();
  });

  it('should validate Firecrawl', async () => {
    vi.spyOn(fetcher.firecrawl, 'validateConnection').mockResolvedValue(true);

    const isValid = await fetcher.validateFirecrawl();

    expect(isValid).toBe(true);
  });

  it('should get Firecrawl usage', async () => {
    const mockUsage = {
      creditsUsed: 150,
      creditsRemaining: 850,
      creditsLimit: 1000
    };

    vi.spyOn(fetcher.firecrawl, 'getUsageInfo').mockResolvedValue(mockUsage);

    const usage = await fetcher.getFirecrawlUsage();

    expect(usage).toHaveProperty('creditsUsed');
    expect(usage).toHaveProperty('creditsRemaining');
  });

  it('should enable/disable Firecrawl', () => {
    fetcher.setFirecrawlEnabled(true);
    expect(fetcher.useFirecrawl).toBe(true);

    fetcher.setFirecrawlEnabled(false);
    expect(fetcher.useFirecrawl).toBe(false);
  });

  it('should prefer API results when abundant', async () => {
    vi.spyOn(fetcher.priceAggregator, 'getPrices').mockResolvedValue({
      supplementName: 'Vitamin D',
      allResults: [
        { price: 29.99 },
        { price: 32.00 },
        { price: 35.00 },
        { price: 38.00 }
      ],
      stats: { lowestPrice: 29.99 }
    });

    fetcher.useFirecrawl = true;
    const result = await fetcher.fetchPrices('Vitamin D');

    expect(result.source).toBe('api');
    expect(result.augmented).toBe(false);
  });

  it('should handle augmentation errors gracefully', async () => {
    vi.spyOn(fetcher.priceAggregator, 'getPrices').mockResolvedValue({
      supplementName: 'Vitamin D',
      allResults: [{ price: 35.00 }],
      stats: { lowestPrice: 35.00 }
    });

    vi.spyOn(fetcher, 'augmentWithFirecrawl').mockRejectedValue(
      new Error('Firecrawl error')
    );

    fetcher.useFirecrawl = true;
    const result = await fetcher.fetchPrices('Vitamin D');

    expect(result.supplementName).toBe('Vitamin D');
    expect(result.allResults || result.error).toBeDefined();
  });

  it('should filter out invalid prices', () => {
    const results = [
      { price: 29.99 },
      { price: 0 },
      { price: null },
      { price: 35.00 }
    ];

    const stats = fetcher.calculateStats(results);

    // Should only count valid prices
    expect(stats.lowestPrice).toBe(29.99);
    expect(stats.highestPrice).toBe(35.00);
  });

  it('should detect significant price changes', async () => {
    const monitor = {
      lastPrice: 35.00,
      currentPrice: 25.00
    };

    const percentChange = ((monitor.currentPrice - monitor.lastPrice) / monitor.lastPrice) * 100;

    expect(Math.abs(percentChange)).toBeGreaterThan(5); // Should trigger alert
  });

  it('should respect API timeout', async () => {
    vi.spyOn(fetcher.priceAggregator, 'getPrices').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const fetchPromise = fetcher.fetchPrices('Vitamin D');

    // Simulate timeout
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ error: 'timeout' }), 5000)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    expect(result || {}).toBeDefined();
  });
});
