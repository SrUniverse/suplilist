/**
 * Firecrawl Scraper — Optimized for Free Tier (300 credits/month)
 * Single search scrape covers all marketplaces efficiently
 */

import logger from './logger.js';

const API_KEY = process.env.FIRECRAWL_API_KEY || 'FIRECRAWL_KEY_REMOVED';
const BASE_URL = 'https://api.firecrawl.dev/v1';

export class FirecrawlScraper {
  constructor() {
    this.apiKey = API_KEY;
    this.baseUrl = BASE_URL;
    this.cache = new Map();
    this.cacheExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days cache
    this.creditsUsed = 0;
    this.maxCreditsPerMonth = 300;
  }

  /**
   * Get prices for supplement — optimized single search
   * One scrape covers all marketplaces
   */
  async getPrices(supplementName) {
    // Check cache first
    const cached = this.getFromCache(supplementName);
    if (cached) {
      logger.info(`Cache hit for: ${supplementName} (${this.creditsUsed}/300 credits used)`);
      return cached;
    }

    try {
      logger.info(`Scraping prices for: ${supplementName}`);

      // Single optimized search that covers all marketplaces
      const searchUrl = this.buildSearchUrl(supplementName);
      const result = await this.scrapeAndExtract(searchUrl, supplementName);

      if (result.success) {
        // Cache result for 7 days
        this.setCache(supplementName, result);
        this.creditsUsed++;
        logger.info(`Scraped: ${supplementName} (${this.creditsUsed}/300 credits)`);
      }

      return result;
    } catch (error) {
      logger.error(`Scrape failed: ${supplementName}`, error);
      return {
        supplementName,
        success: false,
        error: error.message,
        products: []
      };
    }
  }

  /**
   * Build optimized search URL (searches all marketplaces at once)
   */
  buildSearchUrl(supplementName) {
    // Google Shopping often has marketplace prices aggregated
    return `https://www.google.com/shopping?q=${encodeURIComponent(supplementName + ' comprar Brasil')}`;
  }

  /**
   * Scrape and extract structured data in one request
   * Uses Firecrawl LLM to intelligently extract prices from any page
   */
  async scrapeAndExtract(url, supplementName) {
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
              marketplace: { type: 'string' },
              seller: { type: 'string' },
              rating: { type: 'number' },
              reviews: { type: 'number' },
              availability: { type: 'string' },
              url: { type: 'string' },
              image: { type: 'string' }
            }
          }
        }
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          schema,
          prompt: `Extract product listings for "${supplementName}" from Brazilian marketplaces (Mercado Livre, Amazon, Natue, Vitafor, etc).

For each product include:
- Title: Full product name
- Price: Current price in BRL
- Original Price: If on sale
- Discount: Percentage off
- Marketplace: Store name (Mercado Livre, Amazon, Natue, etc)
- Seller: Seller name if available
- Rating: Customer rating (0-5)
- Reviews: Number of reviews
- Availability: In stock/Out of stock
- URL: Link to product page
- Image: Product image URL if available

Return products sorted by price (lowest first), maximum 10 products.
Make sure to extract from actual Brazilian e-commerce sites, not just Google results.`
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.message || 'Extract failed'}`);
      }

      const data = await response.json();

      if (data.data?.products && data.data.products.length > 0) {
        return {
          supplementName,
          success: true,
          products: data.data.products,
          timestamp: Date.now(),
          source: 'firecrawl'
        };
      } else {
        return {
          supplementName,
          success: true,
          products: [],
          timestamp: Date.now(),
          source: 'firecrawl',
          warning: 'No products extracted'
        };
      }
    } catch (error) {
      logger.error(`Extraction failed: ${supplementName}`, error);
      throw error;
    }
  }

  /**
   * Batch scrape multiple supplements efficiently
   * Spreads credit usage across month
   */
  async batchScrape(supplementNames, options = {}) {
    const {
      delayMs = 2000,  // 2s between requests to avoid rate limits
      maxCreditsToUse = 50  // Max 50 credits per batch (leaving room for month)
    } = options;

    const results = [];
    let creditsUsedThisBatch = 0;

    for (const name of supplementNames) {
      // Check if we have enough credits left
      if (this.creditsUsed + creditsUsedThisBatch >= maxCreditsToUse) {
        logger.warn(`Batch limit reached. Used ${creditsUsedThisBatch}/${maxCreditsToUse} credits.`);
        break;
      }

      // Check cache first (doesn't use credits)
      const cached = this.getFromCache(name);
      if (cached) {
        results.push(cached);
        logger.info(`Cache: ${name}`);
      } else {
        // Scrape (uses credits)
        const result = await this.getPrices(name);
        results.push(result);
        creditsUsedThisBatch++;

        // Delay between requests
        if (supplementNames.indexOf(name) < supplementNames.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    return {
      supplements: results.length,
      creditsUsed: creditsUsedThisBatch,
      results
    };
  }

  /**
   * Get prices with fallback to cached data if API fails
   */
  async getPricesWithFallback(supplementName) {
    try {
      return await this.getPrices(supplementName);
    } catch (error) {
      logger.warn(`Using fallback for ${supplementName}`, error);

      // Try to get oldest cache entry (better than nothing)
      const cached = this.getFromCache(supplementName);
      if (cached) {
        return {
          ...cached,
          cached: true,
          warning: 'Using cached data (API error)'
        };
      }

      return {
        supplementName,
        success: false,
        products: [],
        error: error.message,
        cached: false
      };
    }
  }

  /**
   * Format results for display
   */
  formatForDisplay(result) {
    if (!result.success || !result.products || result.products.length === 0) {
      return {
        supplementName: result.supplementName,
        message: 'Sem preços encontrados',
        products: []
      };
    }

    const products = result.products
      .filter(p => p.price && p.price > 0)
      .sort((a, b) => a.price - b.price)
      .map(p => ({
        title: p.title,
        price: p.price,
        originalPrice: p.originalPrice,
        discount: p.discount || 0,
        marketplace: p.marketplace || 'Desconhecido',
        seller: p.seller || '-',
        rating: p.rating ? `${p.rating.toFixed(1)}⭐` : 'N/A',
        reviews: p.reviews ? `(${p.reviews})` : '',
        availability: p.availability || 'Verificar',
        url: p.url
      }));

    const stats = this.calculateStats(result.products);

    return {
      supplementName: result.supplementName,
      totalFound: products.length,
      products,
      stats,
      cached: result.cached || false
    };
  }

  /**
   * Calculate price statistics
   */
  calculateStats(products) {
    const prices = products
      .map(p => p.price)
      .filter(p => p && p > 0)
      .sort((a, b) => a - b);

    if (prices.length === 0) {
      return null;
    }

    const min = prices[0];
    const max = prices[prices.length - 1];
    const avg = prices.reduce((a, b) => a + b) / prices.length;
    const median = prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)];

    return {
      lowestPrice: min,
      highestPrice: max,
      averagePrice: avg,
      medianPrice: median,
      savings: max - min,
      marketplaceCount: new Set(products.map(p => p.marketplace)).size
    };
  }

  /**
   * Cache management
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

  setCache(supplementName, data) {
    const key = supplementName.toLowerCase();
    this.cache.set(key, {
      ...data,
      timestamp: Date.now()
    });
  }

  /**
   * Cache statistics
   */
  getCacheStats() {
    const cached = Array.from(this.cache.values());
    const expired = cached.filter(c => Date.now() - c.timestamp >= this.cacheExpiry);

    return {
      totalCached: this.cache.size,
      expiredCount: expired.length,
      activeCount: this.cache.size - expired.length,
      cacheExpiresDays: (this.cacheExpiry / (24 * 60 * 60 * 1000)).toFixed(0),
      creditsUsed: this.creditsUsed,
      creditsRemaining: this.maxCreditsPerMonth - this.creditsUsed,
      creditsPercent: ((this.creditsUsed / this.maxCreditsPerMonth) * 100).toFixed(1)
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    let removed = 0;
    for (const [key, value] of this.cache.entries()) {
      if (Date.now() - value.timestamp >= this.cacheExpiry) {
        this.cache.delete(key);
        removed++;
      }
    }
    logger.info(`Cleared ${removed} expired cache entries`);
    return removed;
  }

  /**
   * Get usage report
   */
  getUsageReport() {
    const stats = this.getCacheStats();
    const creditsPerDay = stats.creditsUsed / 30;
    const daysUntilLimit = stats.creditsRemaining / (creditsPerDay || 0.1);

    return {
      creditsUsed: stats.creditsUsed,
      creditsRemaining: stats.creditsRemaining,
      maxCredits: this.maxCreditsPerMonth,
      usagePercent: stats.creditsPercent,
      averagePerDay: creditsPerDay.toFixed(1),
      estimatedDaysLeft: Math.max(0, Math.floor(daysUntilLimit)),
      cacheSize: stats.activeCount,
      recommendation: this.getUsageRecommendation(stats)
    };
  }

  /**
   * Get usage recommendation
   */
  getUsageRecommendation(stats) {
    const percent = parseFloat(stats.creditsPercent);

    if (percent < 30) {
      return '✅ Plenty of credits. Can scrape aggressively.';
    } else if (percent < 60) {
      return '⚠️  Moderate usage. Be selective with scrapes.';
    } else if (percent < 80) {
      return '🟡 Getting close to limit. Use cache more, scrape less.';
    } else if (percent < 95) {
      return '🔴 Low credits. Only scrape critical supplements.';
    } else {
      return '❌ Almost out of credits. Rely on cache only.';
    }
  }
}

export default new FirecrawlScraper();
