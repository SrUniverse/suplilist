/**
 * Intelligent Price Fetcher — Combines API + Firecrawl scraping
 */

import priceAggregator from './price-aggregator.js';
import firecrawlAdapter from './firecrawl-adapter.js';
import { logger } from '../utils/logger.js';

export class IntelligentPriceFetcher {
  constructor() {
    this.priceAggregator = priceAggregator;
    this.firecrawl = firecrawlAdapter;
    this.mixedResults = new Map();
    this.useFirecrawl = process.env.USE_FIRECRAWL === 'true';
  }

  /**
   * Fetch prices using best available method
   * @param {string} supplementName
   * @param {Object} options
   * @returns {Promise<Object>} Price data
   */
  async fetchPrices(supplementName, _options = {}) {
    logger.info(`Fetching prices for: ${supplementName}`, { useFirecrawl: this.useFirecrawl });

    try {
      // Try API first (faster)
      const apiPrices = await this.priceAggregator.getPrices(supplementName);

      // If API has good results, return them
      if (apiPrices.allResults.length > 3) {
        return {
          ...apiPrices,
          source: 'api',
          augmented: false
        };
      }

      // Fallback to Firecrawl if API results are sparse
      if (this.useFirecrawl && apiPrices.allResults.length < 3) {
        logger.info(`API results sparse, augmenting with Firecrawl`);
        return await this.augmentWithFirecrawl(supplementName, apiPrices);
      }

      return {
        ...apiPrices,
        source: 'api',
        augmented: false
      };
    } catch (error) {
      logger.error(`Price fetch failed: ${supplementName}`, error);

      // Last resort: try Firecrawl
      if (this.useFirecrawl) {
        return await this.fetchViaFirecrawl(supplementName);
      }

      return {
        supplementName,
        error: error.message,
        allResults: []
      };
    }
  }

  /**
   * Augment API results with Firecrawl scraping
   * @private
   */
  async augmentWithFirecrawl(supplementName, apiPrices) {
    try {
      const mercadoLivreResults = await this.firecrawl.scrapeMercadoLivre(supplementName);
      const amazonResults = await this.firecrawl.scrapeAmazon(supplementName);

      // Combine results
      const allResults = [
        ...apiPrices.allResults,
        ...mercadoLivreResults.map(r => ({
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

      // Recalculate stats
      const sortedResults = allResults.sort((a, b) => a.price - b.price);
      const stats = this.calculateStats(sortedResults);

      return {
        supplementName,
        source: 'hybrid',
        augmented: true,
        allResults: sortedResults.slice(0, 20),
        stats,
        scrapedCount: mercadoLivreResults.length + amazonResults.length
      };
    } catch (error) {
      logger.error(`Firecrawl augmentation failed`, error);
      return {
        ...apiPrices,
        source: 'api',
        augmented: false
      };
    }
  }

  /**
   * Fetch entirely via Firecrawl
   * @private
   */
  async fetchViaFirecrawl(supplementName) {
    try {
      const [mercadoLivre, amazon, natue] = await Promise.all([
        this.firecrawl.scrapeMercadoLivre(supplementName),
        this.firecrawl.scrapeAmazon(supplementName),
        this.scrapeNatueViaFirecrawl(supplementName)
      ]);

      const allResults = [
        ...mercadoLivre.map(r => ({ ...r, marketplace: 'Mercado Livre' })),
        ...amazon.map(r => ({ ...r, marketplace: 'Amazon' })),
        ...natue.map(r => ({ ...r, marketplace: 'Natue' }))
      ].sort((a, b) => a.price - b.price);

      const stats = this.calculateStats(allResults);

      return {
        supplementName,
        source: 'firecrawl',
        augmented: false,
        allResults: allResults.slice(0, 20),
        stats,
        bestDeal: allResults[0] || null,
        disclaimer: 'Preços obtidos via web scraping'
      };
    } catch (error) {
      logger.error(`Firecrawl-only fetch failed`, error);
      return {
        supplementName,
        error: error.message,
        allResults: []
      };
    }
  }

  /**
   * Scrape Natue via Firecrawl
   * @private
   */
  async scrapeNatueViaFirecrawl(supplementName) {
    const searchUrl = `https://www.natue.com.br/busca/${encodeURIComponent(supplementName)}`;

    const schema = {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              price: { type: 'number' },
              originalPrice: { type: 'number' },
              discount: { type: 'number' },
              rating: { type: 'number' },
              reviews: { type: 'number' },
              availability: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    };

    const result = await this.firecrawl.extractStructuredData(searchUrl, schema);
    return result.success ? result.data.products || [] : [];
  }

  /**
   * Calculate price statistics
   * @private
   */
  calculateStats(results) {
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
   * Monitor prices continuously
   * @param {string} supplementName
   * @param {number} intervalMs
   */
  startPriceMonitoring(supplementName, intervalMs = 3600000) {
    let lastPrice = null;

    const monitor = setInterval(async () => {
      try {
        const prices = await this.fetchPrices(supplementName);

        if (prices.stats?.lowestPrice && lastPrice) {
          const priceChange = prices.stats.lowestPrice - lastPrice;
          const percentChange = (priceChange / lastPrice) * 100;

          if (Math.abs(percentChange) > 5) {
            logger.info(`Price alert: ${supplementName}`, {
              previousPrice: lastPrice,
              currentPrice: prices.stats.lowestPrice,
              percentChange
            });
          }
        }

        lastPrice = prices.stats?.lowestPrice;
      } catch (error) {
        logger.error(`Price monitoring failed: ${supplementName}`, error);
      }
    }, intervalMs);

    return {
      stop: () => clearInterval(monitor),
      supplementName
    };
  }

  /**
   * Validate Firecrawl connection
   * @returns {Promise<boolean>}
   */
  async validateFirecrawl() {
    return await this.firecrawl.validateConnection();
  }

  /**
   * Get Firecrawl usage
   * @returns {Promise<Object>}
   */
  async getFirecrawlUsage() {
    return await this.firecrawl.getUsageInfo();
  }

  /**
   * Enable/disable Firecrawl
   * @param {boolean} enabled
   */
  setFirecrawlEnabled(enabled) {
    this.useFirecrawl = enabled;
    logger.info(`Firecrawl ${enabled ? 'enabled' : 'disabled'}`);
  }
}

export default new IntelligentPriceFetcher();
