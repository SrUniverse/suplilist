/**
 * Price Aggregator — Centralized price fetching from multiple marketplaces
 */

import {
  MercadoLivreAdapter,
  AmazonAdapter,
  NatueAdapter,
  VitaforAdapter,
  MockMarketplaceAdapter
} from './marketplace-adapters.js';
import { logger } from '../utils/logger.js';

export class PriceAggregator {
  constructor(useMocks = false) {
    this.adapters = this.initializeAdapters(useMocks);
    this.cache = new Map();
    this.cacheExpiry = 3600000; // 1 hour
    this.priceHistory = new Map();
    this.priceAlerts = new Map();
  }

  /**
   * Initialize marketplace adapters
   * @private
   */
  initializeAdapters(useMocks) {
    if (useMocks) {
      return [
        new MockMarketplaceAdapter('Mercado Livre'),
        new MockMarketplaceAdapter('Amazon'),
        new MockMarketplaceAdapter('Natue'),
        new MockMarketplaceAdapter('Vitafor')
      ];
    }

    return [
      new MercadoLivreAdapter(),
      new AmazonAdapter(),
      new NatueAdapter(),
      new VitaforAdapter()
    ];
  }

  /**
   * Get prices for a supplement from all marketplaces
   * @param {string} supplementName
   * @returns {Object} Aggregated results
   */
  async getPrices(supplementName) {
    // Check cache
    const cached = this.getFromCache(supplementName);
    if (cached) {
      logger.info(`Price cache hit for: ${supplementName}`);
      return cached;
    }

    logger.info(`Fetching prices for: ${supplementName}`);

    // Fetch from all adapters in parallel
    const promises = this.adapters.map(adapter =>
      adapter.search(supplementName).catch(error => ({
        marketplace: adapter.name,
        results: [],
        error: error.message
      }))
    );

    const results = await Promise.all(promises);

    // Aggregate and sort
    const aggregated = this.aggregateResults(supplementName, results);

    // Cache result
    this.setCache(supplementName, aggregated);

    // Track history
    this.trackPriceHistory(supplementName, aggregated);

    return aggregated;
  }

  /**
   * Aggregate results from all marketplaces
   * @private
   */
  aggregateResults(supplementName, marketplaceResults) {
    const allResults = [];
    const byMarketplace = {};

    marketplaceResults.forEach(result => {
      byMarketplace[result.marketplace] = result.results;
      allResults.push(...result.results.map(r => ({
        ...r,
        marketplace: result.marketplace
      })));
    });

    // Sort by price
    allResults.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

    const lowestPrice = allResults[0]?.price || null;
    const averagePrice = this.calculateAveragePrice(allResults);
    const highestPrice = allResults[allResults.length - 1]?.price || null;

    return {
      supplementName,
      timestamp: Date.now(),
      totalResults: allResults.length,
      byMarketplace,
      allResults: allResults.slice(0, 20),
      bestDeal: allResults[0] || null,
      stats: {
        lowestPrice,
        highestPrice,
        averagePrice,
        priceRange: highestPrice - lowestPrice,
        savings: lowestPrice ? highestPrice - lowestPrice : 0
      }
    };
  }

  /**
   * Calculate average price
   * @private
   */
  calculateAveragePrice(results) {
    const priced = results.filter(r => r.price && r.price > 0);
    if (priced.length === 0) return null;

    const sum = priced.reduce((acc, r) => acc + r.price, 0);
    return sum / priced.length;
  }

  /**
   * Get prices from cache if valid
   * @private
   */
  getFromCache(supplementName) {
    const key = supplementName.toLowerCase();
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached;
    }

    this.cache.delete(key);
    return null;
  }

  /**
   * Store in cache
   * @private
   */
  setCache(supplementName, data) {
    const key = supplementName.toLowerCase();
    this.cache.set(key, { ...data, timestamp: Date.now() });
  }

  /**
   * Track price history for a supplement
   * @private
   */
  trackPriceHistory(supplementName, priceData) {
    const key = supplementName.toLowerCase();
    let history = this.priceHistory.get(key) || [];

    history.push({
      timestamp: Date.now(),
      lowestPrice: priceData.stats.lowestPrice,
      averagePrice: priceData.stats.averagePrice,
      highestPrice: priceData.stats.highestPrice
    });

    // Keep only last 30 days
    history = history.filter(h =>
      Date.now() - h.timestamp < 30 * 24 * 60 * 60 * 1000
    );

    this.priceHistory.set(key, history);
  }

  /**
   * Get price trends
   * @param {string} supplementName
   * @returns {Array} Historical price data
   */
  getPriceTrend(supplementName) {
    const key = supplementName.toLowerCase();
    return this.priceHistory.get(key) || [];
  }

  /**
   * Set price alert
   * @param {string} supplementName
   * @param {number} targetPrice
   * @param {Object} options
   */
  setPriceAlert(supplementName, targetPrice, options = {}) {
    const key = supplementName.toLowerCase();
    const alert = {
      supplementName,
      targetPrice,
      createdAt: Date.now(),
      enabled: true,
      notifyEmail: options.notifyEmail || true,
      notifyPush: options.notifyPush || true,
      maxNotifications: options.maxNotifications || 3,
      sentNotifications: 0
    };

    this.priceAlerts.set(key, alert);
    logger.info(`Price alert set for ${supplementName} at R$ ${targetPrice}`);

    return alert;
  }

  /**
   * Check price alerts
   * @param {Object} priceData
   */
  checkPriceAlerts(priceData) {
    const key = priceData.supplementName.toLowerCase();
    const alert = this.priceAlerts.get(key);

    if (!alert || !alert.enabled) return null;

    if (priceData.stats.lowestPrice <= alert.targetPrice) {
      if (alert.sentNotifications < alert.maxNotifications) {
        alert.sentNotifications++;

        return {
          type: 'price-alert',
          title: `${priceData.supplementName} em promoção!`,
          message: `Encontrado por R$ ${priceData.stats.lowestPrice} em ${priceData.bestDeal.marketplace}`,
          data: priceData.bestDeal,
          savings: priceData.stats.averagePrice - priceData.stats.lowestPrice
        };
      }
    }

    return null;
  }

  /**
   * Get best deals across all supplements
   * @param {Array} supplements - Array of supplement names
   * @returns {Promise<Array>} Best deals
   */
  async getBestDeals(supplements) {
    const deals = [];

    for (const supplement of supplements) {
      const prices = await this.getPrices(supplement);
      if (prices.bestDeal) {
        deals.push({
          supplement,
          ...prices.bestDeal,
          savings: prices.stats.savings,
          averagePrice: prices.stats.averagePrice
        });
      }
    }

    return deals.sort((a, b) => b.savings - a.savings);
  }

  /**
   * Compare prices for similar supplements
   * @param {Array} supplementNames
   * @returns {Promise<Object>} Comparison data
   */
  async compareSupplements(supplementNames) {
    const comparisons = [];

    for (const name of supplementNames) {
      const prices = await this.getPrices(name);
      comparisons.push({
        supplement: name,
        lowestPrice: prices.stats.lowestPrice,
        averagePrice: prices.stats.averagePrice,
        marketplace: prices.bestDeal?.marketplace,
        savings: prices.stats.savings
      });
    }

    return comparisons.sort((a, b) => a.lowestPrice - b.lowestPrice);
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    logger.info('Price cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedItems: this.cache.size,
      cacheSize: this.cache.size,
      alertsSet: this.priceAlerts.size,
      historyItems: this.priceHistory.size
    };
  }
}

export default new PriceAggregator(true); // Use mocks by default
