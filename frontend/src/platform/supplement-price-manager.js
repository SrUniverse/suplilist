/**
 * Supplement Price Manager â€” Optimized for Free Tier
 * Manages pricing data for all supplements with smart caching
 */

import FirecrawlScraper from './firecrawl-scraper.js';
import { logger } from '../utils/logger.js';

export class SupplementPriceManager {
  constructor() {
    this.scraper = FirecrawlScraper;
    this.priceData = new Map();
    this.scrapingQueue = [];
    this.isScrapling = false;
  }

  /**
   * Get prices for a supplement
   * Returns cached data if available, otherwise scrapes
   */
  async getPrice(supplementName) {
    // Check local cache first
    if (this.priceData.has(supplementName.toLowerCase())) {
      logger.info(`Local cache hit: ${supplementName}`);
      return this.priceData.get(supplementName.toLowerCase());
    }

    // Scrape (uses 1 credit)
    const result = await this.scraper.getPrices(supplementName);
    const formatted = this.scraper.formatForDisplay(result);

    // Store in memory
    this.priceData.set(supplementName.toLowerCase(), formatted);

    return formatted;
  }

  /**
   * Get prices for multiple supplements efficiently
   * Prioritizes cached data, scrapes only what's needed
   */
  async getPrices(supplementNames) {
    const results = [];
    const toScrape = [];

    // Separate cached from uncached
    for (const name of supplementNames) {
      const key = name.toLowerCase();
      if (this.priceData.has(key)) {
        results.push(this.priceData.get(key));
      } else {
        toScrape.push(name);
      }
    }

    // Scrape only uncached items
    if (toScrape.length > 0) {
      logger.info(`Scraping ${toScrape.length} supplements (${this.scraper.creditsUsed}/300 credits)`);

      const batchResult = await this.scraper.batchScrape(toScrape, {
        delayMs: 2000,
        maxCreditsToUse: 20  // Scrape max 20 at a time
      });

      // Format and store results
      for (const result of batchResult.results) {
        const formatted = this.scraper.formatForDisplay(result);
        this.priceData.set(result.supplementName.toLowerCase(), formatted);
        results.push(formatted);
      }
    }

    return results;
  }

  /**
   * Get all supplements with prices
   * Tries cached first, only scrapes if needed
   */
  async getAllSupplementPrices(supplementsList) {
    const results = await this.getPrices(supplementsList);

    return {
      supplements: results.length,
      total: supplementsList.length,
      cached: results.filter(r => r.cached).length,
      scraped: results.filter(r => !r.cached).length,
      data: results
    };
  }

  /**
   * Smart refresh â€” only scrape if cache is old
   * Uses minimal credits
   */
  async refreshIfNeeded(supplementName, maxAgeHours = 24) {
    const cached = this.scraper.getFromCache(supplementName);

    // If no cache or too old, scrape
    if (!cached || (Date.now() - cached.timestamp) > (maxAgeHours * 60 * 60 * 1000)) {
      logger.info(`Cache expired for ${supplementName}, refreshing...`);
      return await this.getPrice(supplementName);
    }

    logger.info(`Cache still fresh for ${supplementName}`);
    return this.scraper.formatForDisplay(cached);
  }

  /**
   * Queue scraping for off-peak times
   * Reduces credit usage during peak hours
   */
  queueForLaterScraping(supplementName, priority = 'low') {
    this.scrapingQueue.push({
      supplementName,
      priority,
      queuedAt: Date.now()
    });

    logger.info(`Queued: ${supplementName} (Priority: ${priority})`);
  }

  /**
   * Process queued scraping (run at night/off-peak)
   */
  async processQueue() {
    if (this.isScrapling) {
      logger.warn('Scraping already in progress');
      return;
    }

    if (this.scrapingQueue.length === 0) {
      logger.info('Queue is empty');
      return;
    }

    this.isScrapling = true;

    try {
      // Sort by priority (high first)
      const sorted = this.scrapingQueue.sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
      });

      const names = sorted.map(item => item.supplementName);

      // Scrape all queued items
      const batch = await this.scraper.batchScrape(names, {
        delayMs: 2000,
        maxCreditsToUse: 50
      });

      // Store results
      for (const result of batch.results) {
        const formatted = this.scraper.formatForDisplay(result);
        this.priceData.set(result.supplementName.toLowerCase(), formatted);
      }

      // Clear processed queue
      this.scrapingQueue = this.scrapingQueue.filter(
        item => !names.includes(item.supplementName)
      );

      logger.info(`Processed queue: ${batch.credits}Credits used, ${batch.supplements} supplements`);
    } finally {
      this.isScrapling = false;
    }
  }

  /**
   * Get price comparison for a supplement across all cached marketplaces
   */
  getPriceComparison(supplementName) {
    const data = this.priceData.get(supplementName.toLowerCase());

    if (!data || data.products.length === 0) {
      return {
        supplementName,
        message: 'Sem preÃ§os disponÃ­veis',
        comparison: []
      };
    }

    return {
      supplementName,
      bestDeal: data.products[0],
      allOptions: data.products,
      stats: data.stats,
      savings: data.stats ? `R$ ${data.stats.savings.toFixed(2)}` : 'N/A'
    };
  }

  /**
   * Get trending supplements (most searched in session)
   */
  getTrendingSupplements() {
    const supplements = Array.from(this.priceData.entries())
      .map(([name, data]) => ({
        name,
        products: data.totalFound,
        bestPrice: data.stats?.lowestPrice,
        cached: data.cached
      }))
      .sort((a, b) => b.products - a.products);

    return supplements.slice(0, 10);
  }

  /**
   * Get cache health report
   */
  getHealthReport() {
    const cacheStats = this.scraper.getCacheStats();
    const usageReport = this.scraper.getUsageReport();

    return {
      cache: {
        items: cacheStats.activeCount,
        expired: cacheStats.expiredCount,
        expiresInDays: cacheStats.cacheExpiresDays
      },
      credits: {
        used: usageReport.creditsUsed,
        remaining: usageReport.creditsRemaining,
        percentUsed: usageReport.usagePercent,
        averagePerDay: usageReport.averagePerDay,
        estimatedDaysLeft: usageReport.estimatedDaysLeft,
        recommendation: usageReport.recommendation
      },
      queue: {
        pending: this.scrapingQueue.length,
        isProcessing: this.isScrapling
      },
      supplements: this.priceData.size
    };
  }

  /**
   * Clear old cache to save memory
   */
  cleanup() {
    const removed = this.scraper.clearExpiredCache();
    logger.info(`Cleanup: removed ${removed} expired entries`);
    return removed;
  }

  /**
   * Export all cached data (for backup)
   */
  exportData() {
    const data = {};
    for (const [key, value] of this.priceData.entries()) {
      data[key] = value;
    }

    return {
      exportedAt: new Date().toISOString(),
      supplements: Object.keys(data).length,
      data
    };
  }

  /**
   * Import cached data (for restore)
   */
  importData(exported) {
    if (!exported.data) {
      logger.error('Invalid export format');
      return false;
    }

    for (const [key, value] of Object.entries(exported.data)) {
      this.priceData.set(key, value);
    }

    logger.info(`Imported ${Object.keys(exported.data).length} supplements`);
    return true;
  }
}

export default new SupplementPriceManager();


