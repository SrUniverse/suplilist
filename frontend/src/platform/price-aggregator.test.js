import { describe, it, expect, beforeEach } from 'vitest';
import { PriceAggregator } from './price-aggregator.js';

describe('PriceAggregator', () => {
  let aggregator;

  beforeEach(() => {
    aggregator = new PriceAggregator(true); // Use mocks
  });

  it('should fetch prices from multiple marketplaces', async () => {
    const prices = await aggregator.getPrices('Vitamin D');

    expect(prices).toHaveProperty('supplementName', 'Vitamin D');
    expect(prices).toHaveProperty('byMarketplace');
    expect(Object.keys(prices.byMarketplace).length).toBeGreaterThan(0);
  });

  it('should aggregate results correctly', async () => {
    const prices = await aggregator.getPrices('Vitamin D');

    expect(prices).toHaveProperty('stats');
    expect(prices.stats).toHaveProperty('lowestPrice');
    expect(prices.stats).toHaveProperty('averagePrice');
    expect(prices.stats).toHaveProperty('highestPrice');
  });

  it('should sort results by price ascending', async () => {
    const prices = await aggregator.getPrices('Vitamin D');

    for (let i = 1; i < prices.allResults.length; i++) {
      expect(prices.allResults[i].price).toBeGreaterThanOrEqual(
        prices.allResults[i - 1].price
      );
    }
  });

  it('should identify best deal', async () => {
    const prices = await aggregator.getPrices('Vitamin D');

    expect(prices.bestDeal).toBeDefined();
    expect(prices.bestDeal.price).toBe(prices.stats.lowestPrice);
  });

  it('should calculate price range', async () => {
    const prices = await aggregator.getPrices('Vitamin D');

    const range = prices.stats.highestPrice - prices.stats.lowestPrice;
    expect(prices.stats.priceRange).toBe(range);
  });

  it('should cache results', async () => {
    const p1 = await aggregator.getPrices('Vitamin D');
    const p2 = await aggregator.getPrices('Vitamin D');

    expect(p1.timestamp).toBe(p2.timestamp);
  });

  it('should return cached results', async () => {
    await aggregator.getPrices('Vitamin D');
    const cached = aggregator.getFromCache('Vitamin D');

    expect(cached).toBeDefined();
    expect(cached.supplementName).toBe('Vitamin D');
  });

  it('should expire cache after timeout', async () => {
    aggregator.cacheExpiry = 100; // 100ms

    await aggregator.getPrices('Vitamin D');
    await new Promise(r => setTimeout(r, 150));

    const cached = aggregator.getFromCache('Vitamin D');
    expect(cached).toBeNull();
  });

  it('should track price history', async () => {
    await aggregator.getPrices('Vitamin D');
    const history = aggregator.getPriceTrend('Vitamin D');

    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('timestamp');
    expect(history[0]).toHaveProperty('lowestPrice');
  });

  it('should set price alert', () => {
    const alert = aggregator.setPriceAlert('Vitamin D', 29.99);

    expect(alert).toHaveProperty('supplementName', 'Vitamin D');
    expect(alert).toHaveProperty('targetPrice', 29.99);
    expect(alert.enabled).toBe(true);
  });

  it('should detect price alert trigger', async () => {
    aggregator.setPriceAlert('Vitamin D', 100);

    const prices = await aggregator.getPrices('Vitamin D');
    const notification = aggregator.checkPriceAlerts(prices);

    if (prices.stats.lowestPrice <= 100) {
      expect(notification).toBeDefined();
      expect(notification.type).toBe('price-alert');
    }
  });

  it('should limit price alert notifications', async () => {
    aggregator.setPriceAlert('Vitamin D', 100, { maxNotifications: 1 });
    const prices = await aggregator.getPrices('Vitamin D');

    aggregator.checkPriceAlerts(prices);
    const notification2 = aggregator.checkPriceAlerts(prices);

    expect(notification2).toBeNull();
  });

  it('should get best deals across multiple supplements', async () => {
    const supplements = ['Vitamin D', 'Vitamin B12', 'Calcium'];
    const deals = await aggregator.getBestDeals(supplements);

    expect(deals.length).toBeLessThanOrEqual(supplements.length);
    deals.forEach(deal => {
      expect(deal).toHaveProperty('supplement');
      expect(deal).toHaveProperty('price');
      expect(deal).toHaveProperty('marketplace');
    });
  });

  it('should sort deals by savings', async () => {
    const supplements = ['Vitamin D', 'Vitamin B12', 'Calcium'];
    const deals = await aggregator.getBestDeals(supplements);

    for (let i = 1; i < deals.length; i++) {
      expect(deals[i].savings).toBeLessThanOrEqual(deals[i - 1].savings);
    }
  });

  it('should compare prices across supplements', async () => {
    const supplements = ['Vitamin D', 'Vitamin B12', 'Calcium'];
    const comparison = await aggregator.compareSupplements(supplements);

    expect(comparison.length).toEqual(supplements.length);
    comparison.forEach(item => {
      expect(item).toHaveProperty('supplement');
      expect(item).toHaveProperty('lowestPrice');
      expect(item).toHaveProperty('averagePrice');
    });
  });

  it('should sort comparison by price', async () => {
    const supplements = ['Vitamin D', 'Vitamin B12', 'Calcium'];
    const comparison = await aggregator.compareSupplements(supplements);

    for (let i = 1; i < comparison.length; i++) {
      expect(comparison[i].lowestPrice).toBeGreaterThanOrEqual(
        comparison[i - 1].lowestPrice
      );
    }
  });

  it('should clear cache', async () => {
    await aggregator.getPrices('Vitamin D');
    expect(aggregator.cache.size).toBeGreaterThan(0);

    aggregator.clearCache();
    expect(aggregator.cache.size).toBe(0);
  });

  it('should provide cache statistics', async () => {
    await aggregator.getPrices('Vitamin D');
    aggregator.setPriceAlert('Vitamin D', 29.99);

    const stats = aggregator.getCacheStats();

    expect(stats).toHaveProperty('cachedItems');
    expect(stats).toHaveProperty('alertsSet');
    expect(stats.cachedItems).toBeGreaterThan(0);
  });

  it('should handle missing prices gracefully', async () => {
    const prices = await aggregator.getPrices('Non existent supplement XYZ');

    expect(prices).toHaveProperty('supplementName');
    expect(prices.stats.lowestPrice).toBeNull();
  });

  it('should disable price alert', () => {
    const alert = aggregator.setPriceAlert('Vitamin D', 29.99);
    alert.enabled = false;

    const notification = aggregator.checkPriceAlerts({
      supplementName: 'Vitamin D',
      bestDeal: { price: 25.00 },
      stats: { lowestPrice: 25.00 }
    });

    expect(notification).toBeNull();
  });
});
