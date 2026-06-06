/**
 * Enhanced Price Aggregator — Integrated with Firecrawl
 * Combines API-based and web scraping for maximum coverage
 */

import { PriceAggregator } from './price-aggregator.js';
import { FirecrawlAdapter } from './firecrawl-adapter.js';
import logger from './logger.js';

export class EnhancedPriceAggregator extends PriceAggregator {
  constructor(useMocks = false) {
    super(useMocks);
    this.firecrawl = new FirecrawlAdapter(
      process.env.FIRECRAWL_API_KEY || 'mock-key'
    );
    this.useFirecrawl = process.env.USE_FIRECRAWL === 'true';
  }

  /**
   * Get prices with optional Firecrawl augmentation
   * @override
   */
  async getPrices(supplementName, options = {}) {
    // Try API first
    const apiPrices = await super.getPrices(supplementName);

    // If good coverage, return API results
    if (apiPrices.allResults.length >= 5) {
      logger.info(`API provided ${apiPrices.allResults.length} results for ${supplementName}`);
      return {
        ...apiPrices,
        source: 'api',
        augmented: false
      };
    }

    // If sparse and Firecrawl enabled, augment
    if (this.useFirecrawl && apiPrices.allResults.length < 5) {
      logger.info(`Augmenting sparse API results with Firecrawl for ${supplementName}`);
      return this.augmentWithFirecrawl(supplementName, apiPrices);
    }

    return {
      ...apiPrices,
      source: 'api',
      augmented: false
    };
  }

  /**
   * Augment API results with Firecrawl scraping
   */
  async augmentWithFirecrawl(supplementName, apiPrices) {
    try {
      const [mlResults, amazonResults] = await Promise.all([
        this.firecrawl.scrapeMercadoLivre(supplementName).catch(e => {
          logger.warn(`ML scrape failed: ${e.message}`);
          return [];
        }),
        this.firecrawl.scrapeAmazon(supplementName).catch(e => {
          logger.warn(`Amazon scrape failed: ${e.message}`);
          return [];
        })
      ]);

      // Combine results
      const scrapedResults = [
        ...mlResults.map(r => ({
          ...r,
          marketplace: 'Mercado Livre (Scraped)',
          source: 'firecrawl'
        })),
        ...amazonResults.map(r => ({
          ...r,
          marketplace: 'Amazon (Scraped)',
          source: 'firecrawl'
        }))
      ];

      const allResults = [
        ...apiPrices.allResults,
        ...scrapedResults
      ].sort((a, b) => (a.price || Infinity) - (b.price || Infinity));

      const stats = this.recalculateStats(allResults);

      return {
        supplementName,
        source: 'hybrid',
        augmented: true,
        allResults: allResults.slice(0, 20),
        stats,
        scrapedCount: scrapedResults.length,
        bestDeal: allResults[0] || null,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error(`Firecrawl augmentation failed: ${supplementName}`, error);
      return {
        ...apiPrices,
        source: 'api',
        augmented: false
      };
    }
  }

  /**
   * Recalculate statistics for combined results
   */
  recalculateStats(results) {
    const prices = results
      .map(r => r.price)
      .filter(p => p && p > 0);

    if (prices.length === 0) {
      return {
        lowestPrice: null,
        highestPrice: null,
        averagePrice: null,
        priceRange: 0,
        savings: 0
      };
    }

    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = prices.reduce((a, b) => a + b) / prices.length;

    return {
      lowestPrice,
      highestPrice,
      averagePrice,
      priceRange: highestPrice - lowestPrice,
      savings: highestPrice - lowestPrice
    };
  }

  /**
   * Get comprehensive market analysis
   */
  async analyzeMarket(supplementName) {
    const prices = await this.getPrices(supplementName);

    const analysis = {
      supplementName,
      totalListings: prices.allResults.length,
      sources: {
        api: prices.allResults.filter(r => r.source !== 'firecrawl').length,
        scraped: prices.allResults.filter(r => r.source === 'firecrawl').length
      },
      priceAnalysis: {
        min: prices.stats.lowestPrice,
        max: prices.stats.highestPrice,
        avg: prices.stats.averagePrice,
        median: this.calculateMedian(prices.allResults),
        stdDev: this.calculateStdDev(prices.allResults)
      },
      marketplaceBreakdown: this.getMarketplaceBreakdown(prices.allResults),
      bestDeal: prices.bestDeal,
      recommendation: this.generateRecommendation(prices)
    };

    return analysis;
  }

  /**
   * Calculate median price
   */
  calculateMedian(results) {
    const prices = results
      .map(r => r.price)
      .filter(p => p && p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) return null;
    if (prices.length % 2 === 0) {
      return (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
    }
    return prices[Math.floor(prices.length / 2)];
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(results) {
    const prices = results
      .map(r => r.price)
      .filter(p => p && p > 0);

    if (prices.length === 0) return 0;

    const avg = prices.reduce((a, b) => a + b) / prices.length;
    const variance = prices.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  /**
   * Breakdown by marketplace
   */
  getMarketplaceBreakdown(results) {
    const breakdown = {};

    results.forEach(r => {
      const mp = r.marketplace || 'Unknown';
      if (!breakdown[mp]) {
        breakdown[mp] = { count: 0, minPrice: Infinity, avgPrice: 0 };
      }

      breakdown[mp].count++;
      breakdown[mp].minPrice = Math.min(breakdown[mp].minPrice, r.price || Infinity);
      breakdown[mp].avgPrice += r.price || 0;
    });

    // Calculate averages
    Object.keys(breakdown).forEach(mp => {
      breakdown[mp].avgPrice = breakdown[mp].avgPrice / breakdown[mp].count;
    });

    return breakdown;
  }

  /**
   * Generate buying recommendation
   */
  generateRecommendation(prices) {
    if (!prices.bestDeal) {
      return {
        recommendation: 'No prices available',
        reasoning: 'Unable to find any listings'
      };
    }

    const savingsPercent = ((prices.stats.highestPrice - prices.stats.lowestPrice) / prices.stats.highestPrice) * 100;

    let recommendation = '';
    let reasoning = '';

    if (savingsPercent > 20) {
      recommendation = `Buy at ${prices.bestDeal.marketplace}`;
      reasoning = `Save R$ ${prices.stats.savings.toFixed(2)} (${savingsPercent.toFixed(1)}%) compared to most expensive option`;
    } else if (savingsPercent > 10) {
      recommendation = `Buy at ${prices.bestDeal.marketplace}`;
      reasoning = `Reasonable savings of ${savingsPercent.toFixed(1)}%`;
    } else {
      recommendation = `Any marketplace is fine`;
      reasoning = `Prices are competitive (variation ${savingsPercent.toFixed(1)}%)`;
    }

    return {
      recommendation,
      reasoning,
      priceRange: `R$ ${prices.stats.lowestPrice?.toFixed(2)} - R$ ${prices.stats.highestPrice?.toFixed(2)}`
    };
  }

  /**
   * Enable/disable Firecrawl
   */
  setFirecrawlEnabled(enabled) {
    this.useFirecrawl = enabled;
    logger.info(`Firecrawl ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default new EnhancedPriceAggregator(true); // Use with Firecrawl by default
