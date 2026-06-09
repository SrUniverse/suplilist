/**
 * Firecrawl Adapter — Web scraping with LLM intelligence
 * Integrates Firecrawl API for intelligent data extraction
 */

import { logger } from '../utils/logger.js';

export class FirecrawlAdapter {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY;
    this.baseUrl = 'https://api.firecrawl.dev/v1';
    this.timeout = 30000; // 30 seconds for scraping
    this.rateLimitDelay = 1000; // 1 second between requests
  }

  /**
   * Scrape a single URL with Firecrawl
   * @param {string} url - URL to scrape
   * @param {Object} options - Extraction options
   * @returns {Promise<Object>} Scraped data
   */
  async scrapeUrl(url, options = {}) {
    try {
      logger.info(`Firecrawl scraping: ${url}`);

      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          formats: ['markdown', 'html'],
          ...options
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        url,
        success: true,
        data: data.data,
        markdown: data.markdown,
        html: data.html,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error(`Firecrawl scrape failed: ${url}`, error);
      return {
        url,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Extract structured data using LLM
   * @param {string} url - URL to extract from
   * @param {string} schema - JSON schema for extraction
   * @returns {Promise<Object>} Extracted structured data
   */
  async extractStructuredData(url, schema) {
    try {
      logger.info(`Firecrawl extracting structured data from: ${url}`);

      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url,
          schema,
          prompt: `Extract product information including name, price, availability, and reviews using the provided schema.`
        }),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        url,
        success: true,
        data: data.data,
        timestamp: Date.now()
      };
    } catch (error) {
      logger.error(`Firecrawl extraction failed: ${url}`, error);
      return {
        url,
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Batch scrape multiple URLs
   * @param {Array<string>} urls - Array of URLs to scrape
   * @param {Object} options - Scraping options
   * @returns {Promise<Array>} Results for all URLs
   */
  async batchScrape(urls, options = {}) {
    const results = [];

    for (const url of urls) {
      const result = await this.scrapeUrl(url, options);
      results.push(result);

      // Rate limiting
      if (urls.indexOf(url) < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
    }

    return results;
  }

  /**
   * Scrape product prices from Mercado Livre
   * @param {string} supplementName
   * @returns {Promise<Array>} Product listings
   */
  async scrapeMercadoLivre(supplementName) {
    const searchUrl = `https://listado.mercadolibre.com.br/${encodeURIComponent(supplementName)}`;

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
              seller: { type: 'string' },
              rating: { type: 'number' },
              reviews: { type: 'number' },
              availability: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    };

    const result = await this.extractStructuredData(searchUrl, schema);

    if (result.success) {
      return result.data.products || [];
    }

    return [];
  }

  /**
   * Scrape prices from Amazon
   * @param {string} supplementName
   * @returns {Promise<Array>} Product listings
   */
  async scrapeAmazon(supplementName) {
    const searchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(supplementName)}`;

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
              rating: { type: 'number' },
              reviews: { type: 'number' },
              prime: { type: 'boolean' },
              availability: { type: 'string' },
              url: { type: 'string' }
            }
          }
        }
      }
    };

    const result = await this.extractStructuredData(searchUrl, schema);

    if (result.success) {
      return result.data.products || [];
    }

    return [];
  }

  /**
   * Scrape product details page
   * @param {string} url - Product page URL
   * @returns {Promise<Object>} Product details
   */
  async scrapeProductDetails(url) {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        price: { type: 'number' },
        originalPrice: { type: 'number' },
        description: { type: 'string' },
        ingredients: { type: 'array', items: { type: 'string' } },
        benefits: { type: 'array', items: { type: 'string' } },
        sideEffects: { type: 'array', items: { type: 'string' } },
        dosage: { type: 'string' },
        rating: { type: 'number' },
        reviews: { type: 'number' },
        availability: { type: 'string' },
        seller: { type: 'string' }
      }
    };

    return this.extractStructuredData(url, schema);
  }

  /**
   * Scrape competitor prices
   * @param {string} supplementName
   * @param {Array<string>} urls - Competitor URLs
   * @returns {Promise<Object>} Competitive analysis
   */
  async scrapeCompetitorPrices(supplementName, urls) {
    const results = await this.batchScrape(urls);

    const prices = [];
    for (const result of results) {
      if (result.success) {
        const data = result.data;
        prices.push({
          url: result.url,
          price: data.price,
          seller: data.seller,
          availability: data.availability,
          rating: data.rating
        });
      }
    }

    return {
      supplementName,
      competitorCount: urls.length,
      successfulScrapes: prices.length,
      prices: prices.sort((a, b) => a.price - b.price),
      lowestPrice: prices.length > 0 ? Math.min(...prices.map(p => p.price)) : null,
      averagePrice: prices.length > 0
        ? prices.reduce((sum, p) => sum + p.price, 0) / prices.length
        : null
    };
  }

  /**
   * Monitor price changes
   * @param {string} productUrl
   * @param {string} previousPrice
   * @returns {Promise<Object>} Price change data
   */
  async monitorPrice(productUrl, previousPrice) {
    const result = await this.scrapeProductDetails(productUrl);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const currentPrice = result.data.price;
    const priceChange = currentPrice - previousPrice;
    const percentChange = (priceChange / previousPrice) * 100;

    return {
      success: true,
      url: productUrl,
      previousPrice,
      currentPrice,
      priceChange,
      percentChange,
      direction: priceChange > 0 ? 'up' : priceChange < 0 ? 'down' : 'stable',
      timestamp: Date.now(),
      alert: Math.abs(percentChange) > 10 // Alert if > 10% change
    };
  }

  /**
   * Validate API connection
   * @returns {Promise<boolean>} API is working
   */
  async validateConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          formats: ['markdown']
        }),
        signal: AbortSignal.timeout(10000)
      });

      return response.ok;
    } catch (error) {
      logger.error('Firecrawl connection validation failed', error);
      return false;
    }
  }

  /**
   * Get API usage/quota
   * @returns {Promise<Object>} API usage info
   */
  async getUsageInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/usage`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return await response.json();
    } catch (error) {
      logger.error('Failed to fetch Firecrawl usage info', error);
      return null;
    }
  }
}

export default new FirecrawlAdapter();
